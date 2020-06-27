import * as HttpErrors from 'http-errors';
import { Request as ExpressRequest } from 'express';
import * as _ from 'lodash';
import * as FileType from 'file-type';

import { GenericObject } from '../interfaces/common-front';
import { ApiResults, UploadParamsBase } from '../interfaces/common-front/index';
import { Core } from '../core';
import { getLogger, LogHelper } from '../utils/logger';
import { ApiImpl } from './impl';
import { makeCorrelationId } from '../utils/simple-correlation-id';

import { CoreApiImpl } from './core-impl';
import { PublicEventsApiImpl } from '../services/public-events/api-impl';
import { UsersApiImpl } from '../services/users/api-impl';

import { IUser } from '../services/users/models/user';
import { checkObjectOwnership, UploadedFileHandlerParams } from './impl-utils';

export interface IApiRequest {
  source: 'http' | 'ws' | 'other';

  target: string;
  action: string;

  params: GenericObject;

  user?: IUser;
  remoteAddress?: string;
  req?: ExpressRequest;

  skipDebugLog?: boolean;
}

export interface IApiContext {
  core: Core;
  user?: IUser;
  remoteAddress?: string;
  req?: ExpressRequest;
  cid: string;
  userInfo: string;
}

export const makeUserInfoStr = (
  user: IUser | null | undefined,
  remoteAddress: string | undefined,
): string => {
  return `User '${user ? user.email : 'anonymous'}' (${remoteAddress || 'unknown_ip'})`;
};

export class API {
  readonly logger = getLogger('API');

  private readonly core: Core;
  private readonly impls: { [key: string]: ApiImpl } = {
    core: new CoreApiImpl(),
    events: new PublicEventsApiImpl(),
    users: new UsersApiImpl(),
  };

  constructor(core: Core) {
    this.core = core;
  }

  static makeResults(src?: GenericObject | Error, cid?: string): ApiResults {
    let results: ApiResults = {
      success: false,
      cid,
    };

    if (src instanceof Error) {
      if (!cid && 'cid' in src) {
        results.cid = src['cid'];
      }
      results.errorMsg = src.message;
    } else if (!src) {
      results.success = true;
    } else {
      results = { ...src, success: true, cid };
    }

    return results;
  }

  private getImpl(target: string) {
    const impl = this.impls[target];
    if (!impl)
      throw new HttpErrors.BadRequest(
        `Некорректное значение параметра 'target' (требуемый сервис не найден)`,
      );

    return impl;
  }

  async execute(request: IApiRequest): Promise<ApiResults> {
    let results: ApiResults | undefined;
    let error: Error | undefined;

    const ctx: IApiContext = {
      core: this.core,
      cid: makeCorrelationId(),
      remoteAddress: request.remoteAddress,
      req: request.req,
      user: request.user,
      userInfo: makeUserInfoStr(request.user, request.remoteAddress),
    };

    const { target, action, source, params } = request;
    // target и action непустые строки (прошли базовую валидацию)

    const lh = new LogHelper(this, `${source}|exec|${target}|${action}|${ctx.cid}`);

    try {
      results = API.makeResults(await this.getImpl(target).execute(action, params, ctx), ctx.cid);
      if (!request.skipDebugLog) {
        lh.onSuccess();
      }
    } catch (err) {
      error = err;
    }

    if (error) {
      lh.onError(error);

      // @ts-ignore
      error.cid = ctx.cid;

      throw error;
    }

    return results!;
  }

  async processUploadedFile(
    params: UploadParamsBase & { user: IUser; remoteAddress?: string },
    filePath: string,
  ): Promise<{ publicUrl?: string }> {
    const { type, objectId, user, remoteAddress } = params;

    let publicUrl: string | undefined;
    const cid = makeCorrelationId();
    const userInfo = makeUserInfoStr(user, remoteAddress);

    const lh = new LogHelper(this, `processUploadedFile|${cid}`, 'info');
    lh.onStart(`${userInfo} is uploading '${type}' for '${objectId}'...`);

    try {
      const fileType = await FileType.fromFile(filePath);
      if (!fileType) {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error(`Не удалось определить тип файла`);
      }

      const handlerParams: UploadedFileHandlerParams = {
        user,
        remoteAddress,
        objectId,
        cid,
        filePath,
        fileExt: fileType.ext,
      };

      switch (type) {
        case 'user-avatar':
          publicUrl = await this.core.users.setAvatar(handlerParams);
          break;
        case 'public-event-image':
        case 'public-event-logo':
          {
            const event = await this.core.publicEvents.getEvent(objectId);
            checkObjectOwnership({ user }, event);
          }
          break;
        default:
          // noinspection ExceptionCaughtLocallyJS
          throw new Error('Unsupported object type');
      }

      lh.onSuccess(`publicUrl: ${publicUrl}`);
    } catch (err) {
      lh.onError(err);
      // @ts-ignore
      err.cid = cid;
      throw err;
    }

    return {
      publicUrl,
    };
  }
}

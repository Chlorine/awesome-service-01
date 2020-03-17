import { EventEmitter } from 'events';
import { Request as ExpressRequest } from 'express';
import { UAParser } from 'ua-parser-js';

import { GenericObject } from './interfaces/common-front';
import { ResultsPromise, Params } from './interfaces/common-api';
import { getLogger, LogHelper } from './utils/logger';
import { ILogger } from './interfaces/common';
import { JsonValidators } from './utils/json-validator';

import { DaData } from './dadata/dadata';

import { VisitorsDatabase } from './visitors/visitors-db';
import { UserAgentInfo } from './visitors/objects';

// TODO: correlationId
export interface IApiRequest {
  source: 'http' | 'ws' | 'other';
  // requestId?: string;
  currentUser?: any;
  remoteAddress?: string;
  action: string;
  params: GenericObject;
  skipDebugLog?: boolean;
  req?: ExpressRequest;
}

export interface IRequestContext {
  currentUser?: any;
  remoteAddress?: string;
  req?: ExpressRequest;
}

export interface IApiResponse {
  success: boolean;
  errorMsg?: string;
  status?: number;
  needLogin?: boolean;
  [key: string]: any;
}

export class API extends EventEmitter {
  readonly impl: ApiImpl;
  readonly logger = getLogger('API');

  private validators = new JsonValidators('./src/json-schemes/api');

  constructor(vdb: VisitorsDatabase, daData: DaData) {
    super();
    this.impl = new ApiImpl(vdb, daData, this.logger.createChild('Impl'));
  }

  static makeResponse(src?: GenericObject | Error): IApiResponse {
    let res: IApiResponse;
    if (src instanceof Error) {
      // @ts-ignore
      const status = src.status || 500;
      res = { success: false, errorMsg: src.message, status };
    } else {
      res = { success: true, ...src };
    }

    return res;
  }

  async execute(request: IApiRequest): Promise<IApiResponse> {
    const lh = new LogHelper(this, 'execute');

    let response: IApiResponse | undefined;
    let error: Error;
    let action: any = request.action;
    let handlers: any = this.impl;

    if (!action || typeof action !== 'string') {
      error = new Error('Отсутствует необходимый строковый параметр "action"');
      lh.onError(error, { noStack: true });
      response = API.makeResponse(error);
    } else if (typeof handlers[action] !== 'function') {
      error = new Error(`Неизвестный метод "${action}"`);
      lh.onError(error, { noStack: true });
      response = API.makeResponse(error);
    } else {
      try {
        if (this.validators.hasValidatorFor(action)) {
          this.validators.validate(action, request.params);
        } else {
          lh.write(`No validator found for '${action}'`, 'warn');
        }

        const ctx: IRequestContext = {
          currentUser: request.currentUser,
          remoteAddress: request.remoteAddress,
          req: request.req,
        };

        response = API.makeResponse(await handlers[action](request.params, ctx));
        if (!request.skipDebugLog) {
          lh.onSuccess(`[${request.source}|${action}]: OK`);
        }
      } catch (err) {
        lh.onError(err);
        response = API.makeResponse(err);
      }
    }

    // if (request.requestId) {
    //   response.requestId = request.requestId;
    // }

    return response;
  }
}

class ApiImpl {
  constructor(
    private readonly vdb: VisitorsDatabase,
    private readonly daData: DaData,
    public readonly logger: ILogger,
  ) {}

  async doSomething(params: Params<'doSomething'>): ResultsPromise<'doSomething'> {
    return {
      code: 420,
    };
  }

  async doSomethingElse(params: Params<'doSomethingElse'>): ResultsPromise<'doSomethingElse'> {
    const { incomingToken } = params;

    if (incomingToken === 'die') {
      let error = new Error('Self-destruct command received');

      setTimeout(() => {
        throw new Error('CHPOK!');
      }, 30);

      throw error;
    }

    return {
      code: 420,
    };
  }

  async registerVisitor(
    params: Params<'registerVisitor'>,
    ctx: IRequestContext,
  ): ResultsPromise<'registerVisitor'> {
    // TODO: дополнить json scheme по поводу паттернов мыла и телефона

    let uaInfo: UserAgentInfo | null = null;

    if (ctx.req) {
      try {
        uaInfo = new UAParser(ctx.req.headers['user-agent']).getResult();
      } catch (err) {
        this.logger.warn(`Error while retrieving user agent info (${err.message})`);
      }
    }

    const { visitor, phone, email } = params;

    const res = await this.vdb.register({
      visitor,
      phone,
      email,
      uaInfo,
      remoteAddress: ctx.remoteAddress,
    });

    return {
      visitorId: res.id,
    };
  }

  async getDaDataFioSuggestions(
    params: Params<'getDaDataFioSuggestions'>,
  ): ResultsPromise<'getDaDataFioSuggestions'> {
    const resp = await this.daData.fio.getSuggestions(params);

    resp.suggestions = resp.suggestions.slice(0, params.count || 10);

    return resp;
  }
}

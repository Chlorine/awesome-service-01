import { EventEmitter } from 'events';
import { MongoClient, Db as MongoDatabase } from 'mongodb';
import * as _ from 'lodash';

import { Database } from './db/db';
import { GenericObject } from './interfaces/common-front';
import { ResultsPromise, Results, Params } from './interfaces/common-api';
import { getLogger, LogHelper } from './utils/logger';
import { JsonValidators } from './utils/json-validator';
import { VisitorsDatabase } from './visitors/visitors-db';
import { DaData } from './dadata/dadata';

export interface IApiRequest {
  source: 'http' | 'ws' | 'other';
  // requestId?: string;
  currentUser?: any;
  remoteAddress?: string;
  action: string;
  params: GenericObject;
  skipDebugLog?: boolean;
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
    this.impl = new ApiImpl(vdb, daData);
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
        // this.validators.validate(action, request.params);
        this.validators.hasValidatorFor(action) && this.validators.validate(action, request.params);
        response = API.makeResponse(
          await handlers[action](request.params, request.currentUser, request.remoteAddress),
        );
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
  constructor(private readonly vdb: VisitorsDatabase, private readonly daData: DaData) {}

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

  async registerVisitor(params: Params<'registerVisitor'>): ResultsPromise<'registerVisitor'> {
    // TODO: дополнить json scheme по поводу паттернов мыла и телефона
    // TODO: собрать инфу о http-клиенте

    const { visitor, phone, email } = params;

    console.log(JSON.stringify(params, null, 2));

    return {
      visitorId: await this.vdb.registerVisitor(visitor, phone, email),
    };
  }

  async getDaDataFioSuggestions(
    params: Params<'getDaDataFioSuggestions'>,
  ): ResultsPromise<'getDaDataFioSuggestions'> {
    const resp = await this.daData.getFioSuggestions(params);

    resp.suggestions = resp.suggestions.slice(0, params.count || 10);

    return resp;
  }
}

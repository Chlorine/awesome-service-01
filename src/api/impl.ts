import * as HttpErrors from 'http-errors';

import { Dictionary } from '../interfaces/common-front/index';
import { ILogger } from '../interfaces/common';
import { IApiContext } from './index';

import { JsonValidators } from '../utils/json-validator';
import { getLogger } from '../utils/logger';

export class ApiImpl {
  readonly validators: JsonValidators;
  readonly logger: ILogger;

  handlers: any;

  constructor(jsonSchemesPath: string, loggerName: string) {
    this.validators = new JsonValidators('./src/json-schemes' + jsonSchemesPath);
    this.logger = getLogger(loggerName);
  }

  hasAction(action: string) {
    return typeof this.handlers[action] === 'function';
  }

  async execute(action: string, params: Dictionary<any>, ctx: IApiContext) {
    if (!this.hasAction(action)) {
      throw new HttpErrors.BadRequest(`Некорректное значение 'action' (метод отсутствует)`);
    }

    if (!this.validators.hasValidatorFor(action)) {
      this.logger.warn(`No validator found for '${action}'`);
    }

    let valErrText = this.validators.tryValidate(action, params);
    if (valErrText) {
      throw new HttpErrors.BadRequest(`Некорректные параметры метода (${valErrText})`);
    }

    return this.handlers[action](params, ctx);
  }
}

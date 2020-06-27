import { Params, ResultsPromise } from '../interfaces/common-front/api';

import { IApiContext } from './index';
import { ApiImpl } from './impl';

import { checkAuth } from './impl-utils';
import { Core } from '../core';

export class CoreApiImpl extends ApiImpl {
  constructor() {
    super('/api', 'API.Core');
  }

  handlers = {
    /**
     * Получить подсказку для ввода ФИО
     * @param params
     * @param ctx
     */
    getDaDataFioSuggestions: async (
      params: Params<'getDaDataFioSuggestions'>,
      ctx: IApiContext,
    ): ResultsPromise<'getDaDataFioSuggestions'> => {
      const resp = await ctx.core.daData.fio.getSuggestions(params);

      resp.suggestions = resp.suggestions.slice(0, params.count || 10);

      return resp;
    },

    /**
     * Тест #1
     * @param params
     * @param ctx
     */
    doSomething: async (
      params: Params<'doSomething'>,
      ctx: IApiContext,
    ): ResultsPromise<'doSomething'> => {
      checkAuth(ctx);

      return {
        code: 123,
      };
    },

    /**
     * Тест #2
     * @param params
     * @param ctx
     */
    doSomethingElse: async (
      params: Params<'doSomethingElse'>,
      ctx: IApiContext,
    ): ResultsPromise<'doSomethingElse'> => {
      const { mailer } = ctx.core;
      const { incomingToken } = params;

      // if (incomingToken === 'die') {
      //   let error = new Error('Self-destruct command received');
      //
      //   setTimeout(() => {
      //     throw new Error('Чпок!');
      //   }, 30);
      //
      //   throw error;
      // } else if (incomingToken === 'mail') {
      //   const user = checkAuth(ctx);
      //
      //   if (mailer) {
      //     await mailer.sendTemplateMail(
      //       {
      //         to: ['sergey.khlobystov@yandex.ru'],
      //       },
      //       'userRegistered',
      //       {
      //         user: user.asUserInfo(),
      //         emailConfirmLink: Core.urlBaseForLinks + `/service-link/confirm-email?token=123`,
      //       },
      //     );
      //   }
      // }

      return {
        code: 124,
      };
    },
  };
}

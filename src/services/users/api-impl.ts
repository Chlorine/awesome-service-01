import * as HttpErrors from 'http-errors';

import { ApiImpl } from '../../api/impl';
import { Params, ResultsPromise } from '../../interfaces/common-front/users/api';
import { IApiContext } from '../../api/index';

import User from './models/user';
import VerificationToken, { IVerificationToken } from './models/verification-token';

import { checkAuth } from '../../api/impl-utils';
import { getUser } from './utils';

import { LogHelper } from '../../utils/logger';
import { ElapsedTime } from '../../utils/elapsed-time';
import { Core } from '../../core';

export class UsersApiImpl extends ApiImpl {
  constructor() {
    super('/api/users', 'API.Users');
  }

  handlers = {
    /**
     * Создание нового пользователя
     * @param params
     * @param ctx
     */
    createUser: async (
      params: Params<'createUser'>,
      ctx: IApiContext,
    ): ResultsPromise<'createUser'> => {
      const lh = new LogHelper(this, `createUser|${ctx.cid}`);
      const et = new ElapsedTime();

      const { email, password, firstName, middleName, lastName } = params;

      let users = await User.find({ email: email.toLowerCase() });
      if (users.length > 0) throw new HttpErrors.Forbidden('Уже есть учетная запись с таким email');

      const u = new User();

      u.role = 'user';

      u.email = email;
      u.password = password;

      u.firstName = firstName;
      u.middleName = middleName;
      u.lastName = lastName;

      await u.save();
      lh.write(`user '${email}' created (${et.getDiffStr()})`, 'info');
      et.reset();

      const t = new VerificationToken({ user: u, type: 'email' });
      await t.save();

      lh.write(`email confirmation token created (${et.getDiffStr()})`);

      ctx.core.mailer!.sendTemplateMail({ to: email }, 'userRegistered', {
        user: u.asUserInfo(),
        emailConfirmLink: Core.urlBaseForLinks + `/service-link/confirm-email?token=${t.value}`,
      });

      return {
        userId: u._id.toHexString(),
      };
    },
    /**
     * Подтверждение email с помощью токена (обработка перехода по ссылке из письма)
     * @param params
     * @param ctx
     */
    confirmEmail: async (
      params: Params<'confirmEmail'>,
      ctx: IApiContext,
    ): ResultsPromise<'confirmEmail'> => {
      const lh = new LogHelper(this, `confirmEmail|${ctx.cid}`);
      const { token: tokenValue } = params;

      const userToken = await VerificationToken.findWithUser(tokenValue, 'email');
      if (!userToken) {
        throw new HttpErrors.NotFound(`Токен не найден`);
      }

      if (!userToken.user) {
        // скорее 500, чем не 500
        lh.write(`Cannot find user for verification token '${tokenValue}'`, 'error');
        throw new Error(`Внутренняя ошибка`);
      }

      userToken.user.active = true;
      await userToken.user.save();

      lh.write(`user '${userToken.user.email}' is now ACTIVE`);

      await userToken.remove();

      return {};
    },
    /**
     * Получить данные пользователя
     * @param params
     * @param ctx
     */
    getProfile: async (
      params: Params<'getProfile'>,
      ctx: IApiContext,
    ): ResultsPromise<'getProfile'> => {
      const user = await getUser(ctx, params.id);

      ///////////////////////////

      // const userToken = await VerificationToken.findWithUser('123123');
      //
      // if (userToken) console.log(JSON.stringify(userToken.user));

      // const token = new VerificationToken();
      // token.user = user;
      // token.type = 'email';
      // token.value = '123123';
      //
      // await token.save();

      ///////////////////////////

      return {
        userInfo: user.asUserInfo(),
      };
    },
    /**
     * Изменить данные пользователя
     * @param params
     * @param ctx
     */
    updateProfile: async (
      params: Params<'updateProfile'>,
      ctx: IApiContext,
    ): ResultsPromise<'updateProfile'> => {
      const { id, firstName, middleName, lastName } = params;
      const u = await getUser(ctx, id);

      u.firstName = firstName;
      u.middleName = middleName;
      u.lastName = lastName;

      await u.save();

      return {
        userInfo: u.asUserInfo(),
      };
    },
    /**
     * Сменить пароль текущего пользователя
     * @param params
     * @param ctx
     */
    changePassword: async (
      params: Params<'changePassword'>,
      ctx: IApiContext,
    ): ResultsPromise<'changePassword'> => {
      const u = checkAuth(ctx);
      const { oldPassword, newPassword } = params;

      const oldPasswordValid = await u.isValidPassword(oldPassword);
      if (!oldPasswordValid) throw new HttpErrors.Forbidden('Указан неверный старый пароль');

      u.password = newPassword;

      await u.save();

      return {};
    },
    /**
     * Отправить письмо со ссылкой на смену пароля
     * @param params
     * @param ctx
     */
    requestPasswordReset: async (
      params: Params<'requestPasswordReset'>,
      ctx: IApiContext,
    ): ResultsPromise<'requestPasswordReset'> => {
      const lh = new LogHelper(this, `requestPasswordReset|${ctx.cid}`);

      const { email } = params;

      // поиск юзера

      const u = await User.findOne({ email });
      if (!u) throw new HttpErrors.NotFound(`Учетная запись с таким email не найдена`);

      // на всякий случай подтереть все токены сброса пароля этого пользователя

      const delRes = await VerificationToken.deleteMany({ user: u, type: 'psw-reset' });
      lh.write('Remove other psw-reset tokens: ' + JSON.stringify(delRes));

      const t: IVerificationToken = new VerificationToken();
      t.type = 'psw-reset';
      t.user = u;

      await t.save();

      lh.write(`Password reset token created (${t.id})`);

      ctx.core.mailer!.sendTemplateMail({ to: u.email }, 'userPasswordReset', {
        user: u.asUserInfo(),
        passwordResetLink: Core.urlBaseForLinks + `/service-link/reset-password?token=${t.value}`,
      });

      return {};
    },
    /**
     * Установить новый пароль
     * @param params
     * @param ctx
     */
    resetPassword: async (
      params: Params<'resetPassword'>,
      ctx: IApiContext,
    ): ResultsPromise<'resetPassword'> => {
      const lh = new LogHelper(this, `resetPassword|${ctx.cid}`);

      const { token, password } = params;

      const userToken = await VerificationToken.findWithUser(token, 'psw-reset');
      if (!userToken) {
        throw new HttpErrors.NotFound(`Токен не найден`);
      }

      if (!userToken.user) {
        // скорее 500, чем не 500
        lh.write(`Cannot find user for verification token '${token}'`, 'error');
        throw new Error(`Внутренняя ошибка`);
      }

      const user = userToken.user;

      user.password = password;
      user.active = true;

      await user.save();

      lh.write(`Password for user '${userToken.user.email}' was CHANGED`);

      await userToken.remove();

      return {};
    },
    requestEmailConfirm: async (
      params: Params<'requestEmailConfirm'>,
      ctx: IApiContext,
    ): ResultsPromise<'requestEmailConfirm'> => {
      const lh = new LogHelper(this, 'requestEmailConfirm');
      const et = new ElapsedTime();

      const u = checkAuth(ctx);
      if (u.active) throw new HttpErrors.BadRequest('Email already confirmed');

      await VerificationToken.deleteMany({ user: u, type: 'email' });
      const t = new VerificationToken({ user: u, type: 'email' });
      await t.save();

      lh.write(`token created (${et.getDiffStr()})`);

      ctx.core.mailer!.sendTemplateMail({ to: u.email }, 'userRegistered', {
        user: u.asUserInfo(),
        emailConfirmLink: Core.urlBaseForLinks + `/service-link/confirm-email?token=${t.value}`,
      });

      return {};
    },
  };
}

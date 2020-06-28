import * as HttpErrors from 'http-errors';
import * as moment from 'moment';

import { ApiImpl } from '../../api/impl';
import { Params, ResultsPromise } from '../../interfaces/common-front/users/api';
import { IApiContext } from '../../api/index';

import User, { IUser } from './models/user';
import VerificationToken, { IVerificationToken } from './models/verification-token';

import { checkAuth } from '../../api/impl-utils';
import { getUser } from './utils';

import { LogHelper } from '../../utils/logger';
import { ElapsedTime } from '../../utils/elapsed-time';
import { Core } from '../../core';

import CONFIG from './../../../config';
import { Utils } from '../../utils/utils';

const signUserIn = async (user: IUser, ctx: IApiContext, lh: LogHelper) => {
  if (ctx.req) {
    await new Promise((resolve, reject) => {
      ctx.req!.login(user, err => {
        if (err) return reject(err);
        resolve();
      });
    });

    lh.write(`User '${user.email}' is now logged in`);
  }
};

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
      const lh = new LogHelper(this, `createUser|${ctx.cid}`, 'info');
      const et = new ElapsedTime();

      lh.onStart(`Remote address is '${ctx.remoteAddress}'`);

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

      u.avatar = await ctx.core.users.tryPrepareDefaultAvatarFor(u, ctx.cid);

      await u.save();

      lh.write(`User '${email}' created (${et.getDiffStr()})`);
      et.reset();

      const t = new VerificationToken({ user: u, type: 'email' });
      await t.save();

      lh.write(`email confirmation token created (${t.id}, ${et.getDiffStr()})`);

      const skipMailSending = CONFIG.debug && CONFIG.debug.skipSendingUserRegisteredMail;

      if (!skipMailSending) {
        await ctx.core.mailer.sendTemplateMail({ to: email }, 'userRegistered', {
          user: u.asUserInfo(),
          emailConfirmLink: Core.urlBaseForLinks + `/service-link/confirm-email?token=${t.value}`,
        });
      }

      await signUserIn(u, ctx, lh);

      return {
        user: u.asUserInfo(),
        uiSettings: {},
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
      const lh = new LogHelper(this, `confirmEmail|${ctx.cid}`, 'info');
      const { token: tokenValue } = params;

      lh.onStart(`Remote address is '${ctx.remoteAddress}'`);

      const userToken = await VerificationToken.findWithUser(tokenValue, 'email');
      if (!userToken) {
        throw new HttpErrors.NotFound(`Токен не найден (ссылка некорректна или устарела)`);
      }

      const { user } = userToken;

      if (!user) {
        // скорее 500, чем не 500
        lh.write(`Cannot find user for verification token '${tokenValue}'`, 'error');
        throw new Error(`Внутренняя ошибка`);
      }

      user.emailConfirmed = true;
      await user.save();
      await userToken.remove();

      lh.write(`User email '${user.email}' is now CONFIRMED`);

      await signUserIn(user, ctx, lh);

      return {
        user: user.asUserInfo(),
        uiSettings: {},
      };
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
      const lh = new LogHelper(this, `updateProfile|${ctx.cid}`, 'info');

      lh.onStart(`${ctx.userInfo} is updating profile (${Utils.stringifyApiParams(params)})`);

      const { id, firstName, middleName, lastName, birthday, gender } = params;
      const u = await getUser(ctx, id);

      Utils.setEntityProperty(u, 'firstName', firstName);
      Utils.setEntityProperty(u, 'middleName', middleName);
      Utils.setEntityProperty(u, 'lastName', lastName);

      if (birthday !== undefined) {
        if (birthday) {
          u.birthday = moment(birthday, 'YYYY-MM-DD').toDate();
        } else {
          u.birthday = null;
        }
      }

      Utils.setEntityProperty(u, 'gender', gender);

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
      const lh = new LogHelper(this, `changePassword|${ctx.cid}`, 'info');

      lh.write(`${ctx.userInfo} is trying to change password...`);

      const u = checkAuth(ctx);
      const { oldPassword, newPassword } = params;

      const oldPasswordValid = await u.isValidPassword(oldPassword);
      if (!oldPasswordValid) throw new HttpErrors.Forbidden('Указан неверный текущий пароль');

      u.password = newPassword;

      await u.save();

      lh.onSuccess(`${ctx.userInfo} has changed password`);

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
      const lh = new LogHelper(this, `requestPasswordReset|${ctx.cid}`, 'info');

      const { email } = params;

      lh.onStart(`${ctx.userInfo} is requesting password reset for '${email}'`);

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
      const lh = new LogHelper(this, `resetPassword|${ctx.cid}`, 'info');

      const { token, password } = params;

      lh.onStart(`${ctx.userInfo} is resetting password with token '${token}'`);

      const userToken = await VerificationToken.findWithUser(token, 'psw-reset');
      if (!userToken) {
        throw new HttpErrors.NotFound(`Токен не найден (ссылка некорректна или устарела)`);
      }

      if (!userToken.user) {
        // скорее 500, чем не 500
        lh.write(`Cannot find user for verification token '${token}'`, 'error');
        throw new Error(`Внутренняя ошибка`);
      }

      const user = userToken.user;

      user.password = password;

      await user.save();
      await userToken.remove();

      lh.write(`Password for user '${userToken.user.email}' was CHANGED`);

      await signUserIn(user, ctx, lh);

      return {
        user: user.asUserInfo(),
        uiSettings: {},
      };
    },
    requestEmailConfirm: async (
      params: Params<'requestEmailConfirm'>,
      ctx: IApiContext,
    ): ResultsPromise<'requestEmailConfirm'> => {
      const lh = new LogHelper(this, 'requestEmailConfirm', 'info');
      const et = new ElapsedTime();

      const u = checkAuth(ctx);
      if (u.emailConfirmed) throw new HttpErrors.BadRequest('Email already confirmed');

      lh.onStart(`${ctx.userInfo} is requesting email confirmation`);

      await VerificationToken.deleteMany({ user: u, type: 'email' });
      const t = new VerificationToken({ user: u, type: 'email' });
      await t.save();

      lh.write(`token created (${et.getDiffStr()})`);

      await ctx.core.mailer.sendTemplateMail({ to: u.email }, 'userRegistered', {
        user: u.asUserInfo(),
        emailConfirmLink: Core.urlBaseForLinks + `/service-link/confirm-email?token=${t.value}`,
      });

      return {};
    },
  };
}

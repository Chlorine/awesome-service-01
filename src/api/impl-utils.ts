import { IApiContext } from './index';
import * as HttpErrors from 'http-errors';

import { UserRole } from '../interfaces/common-front/users/index';
import { IUser } from '../services/users/models/user';

export const checkAuth = (ctx: IApiContext): IUser => {
  if (!ctx.user) {
    throw new HttpErrors.Unauthorized('Требуется вход в систему');
  }

  return ctx.user;
};

export const checkUserRole = (ctx: IApiContext, role: UserRole): IUser => {
  const user = checkAuth(ctx);
  if (user.role !== role) {
    throw new HttpErrors.Forbidden('Недостаточно прав');
  }

  return user;
};

export const checkUserIsAdmin = (ctx: IApiContext): IUser => {
  return checkUserRole(ctx, 'admin');
};

export const checkObjectOwnership = (ctx: IApiContext, object: { user: IUser['_id'] }): void => {
  const user = checkAuth(ctx);

  if (!object.user.equals(user.id)) {
    // чужой объект?
    // checkUserIsAdmin(ctx);
    throw new HttpErrors.Forbidden('Недостаточно прав');
  }
};

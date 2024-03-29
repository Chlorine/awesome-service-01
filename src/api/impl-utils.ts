import * as HttpErrors from 'http-errors';

import { UserRole } from '../interfaces/common-front/users/index';
import { IUser } from '../services/users/models/user';
import { UploadParamsBase } from '../interfaces/common-front/index';

export type UploadedFileHandlerParams = {
  user: IUser;
  remoteAddress?: string;
  cid: string;

  objectId: string;
  objectType: UploadParamsBase['type'];

  filePath: string;
  fileSize: number;
  fileExt: string; // не изначальное, а задетекченное
};

export const checkAuth = (ctx: { user?: IUser }): IUser => {
  if (!ctx.user) {
    throw new HttpErrors.Unauthorized('Требуется вход в систему');
  }

  return ctx.user;
};

export const checkUserRole = (ctx: { user?: IUser }, role: UserRole): IUser => {
  const user = checkAuth(ctx);
  if (user.role !== role) {
    throw new HttpErrors.Forbidden('Недостаточно прав');
  }

  return user;
};

export const checkUserIsAdmin = (ctx: { user?: IUser }): IUser => {
  return checkUserRole(ctx, 'admin');
};

export const checkObjectOwnership = (
  ctx: { user?: IUser },
  object: { user: IUser['_id'] },
): void => {
  const user = checkAuth(ctx);

  if (!object.user.equals(user.id)) {
    // чужой объект?
    // checkUserIsAdmin(ctx);
    throw new HttpErrors.Forbidden('Недостаточно прав');
  }
};

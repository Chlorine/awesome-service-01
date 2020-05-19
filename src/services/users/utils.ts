import User, { IUser } from './models/user';
import { IApiContext } from '../../api/index';
import { checkAuth, checkUserIsAdmin } from '../../api/impl-utils';
import * as HttpErrors from 'http-errors';

export const getUser = async (ctx: IApiContext, id?: string): Promise<IUser> => {
  let u: IUser | null = checkAuth(ctx);
  if (!id || id === u.id) return u;

  checkUserIsAdmin(ctx);
  u = await User.findById(id);

  if (!u) throw new HttpErrors.NotFound(`Пользователь не найден`);

  return u;
};

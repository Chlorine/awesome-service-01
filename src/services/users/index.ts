import { getLogger, LogHelper } from '../../utils/logger';
import { ElapsedTime } from '../../utils/elapsed-time';

import User, { IUser } from './models/user';

export class UsersService {
  logger = getLogger('Users');

  constructor() {}

  async init() {
    const lh = new LogHelper(this, 'init');

    lh.onSuccess();
  }

  async doAuth(
    email: string | null,
    password: string | null,
    userId: string | null,
  ): Promise<IUser> {
    const et = new ElapsedTime();
    let u: IUser | null = null;

    if (userId) {
      u = await User.findById(userId);
      if (u) {
        // this.logger.silly(`[doAuth]: id ${userId}: user found! (${et.getDiffStr()})`);
      } else {
        this.logger.error(`[doAuth]: id ${userId}: user  NOT found! (${et.getDiffStr()})`);

        throw new Error(`Cannot find user with id ${userId}`);
      }
    } else {
      u = await User.findByCredentials(email!, password!);
      if (u) {
        if (!u.active) {
          throw new Error(`Учетная запись деактивирована`);
        }
        this.logger.silly(`[doAuth]: email '${email}': user found! (${u._id}, ${et.getDiffStr()})`);
      } else {
        this.logger.error(`[doAuth]: email '${email}': user NOT found! (${et.getDiffStr()})`);

        throw new Error('Неверное имя пользователя или пароль');
      }
    }

    return u;
  }
}

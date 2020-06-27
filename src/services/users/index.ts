import * as HttpErrors from 'http-errors';
import { nj, readTemplateFile } from '../../utils/template-helpers';
import { join } from 'path';
import * as _ from 'lodash';

import { getLogger, LogHelper } from '../../utils/logger';
import { ElapsedTime } from '../../utils/elapsed-time';
import User, { IUser } from './models/user';
import { MinioHelper } from '../../utils/minio-helper';
import { Utils } from '../../utils/utils';
import { UploadedFileHandlerParams } from '../../api/impl-utils';

import CONFIG from '../../../config';

import { FilterQuery } from 'mongoose';

export class UsersService {
  logger = getLogger('Users');

  minio = new MinioHelper(this.logger.createChild('Minio'));
  static readonly AVATAR_FILE_PREFIX = 'public/user-avatars/';

  constructor() {}

  async init() {
    const lh = new LogHelper(this, 'init');
    await this.recreateDefaultAvatars();
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

  async setAvatar({
    user,
    objectId,
    cid,
    filePath,
    fileExt,
  }: UploadedFileHandlerParams): Promise<string> {
    if (objectId !== user.id) {
      throw new HttpErrors.Forbidden('Недостаточно прав');
    }

    const u = await User.findById(objectId);
    if (!u) {
      throw new HttpErrors.InternalServerError('Cannot find user (как так-то?)');
    }

    const fileName = MinioHelper.generateObjectName(fileExt);
    const minioFileName = UsersService.AVATAR_FILE_PREFIX + fileName;

    await Utils.wrappedCall(
      this.minio.uploadFile(filePath, minioFileName, cid),
      'Загрузка файла в хранилище',
    );

    if (u.avatar) {
      const fileToRemove = UsersService.AVATAR_FILE_PREFIX + u.avatar;
      const { error: removeErr } = await Utils.safeCall(this.minio.removeFile(fileToRemove, cid));
      if (removeErr) {
        this.logger.warn(`[setAvatar]: Removing existing file failed (${removeErr})`);
      }
    }

    u.avatar = fileName;
    await u.save();

    return MinioHelper.getPublicUrlFor(minioFileName);
  }

  async tryPrepareDefaultAvatarFor(user: IUser, cid?: string): Promise<string | null> {
    let avatar: string | null = null;

    const lh = new LogHelper(
      this,
      cid ? `tryPrepareDefaultAvatarFor|${cid}` : 'tryPrepareDefaultAvatarFor',
    );

    const AVATAR_FILL_COLORS = [
      '#bf7a29',
      '#A19C69',
      '#3C3741',
      '#25373D',
      '#60646D',
      '#a3528a',
      '#6a3520',
      '#236a40',
    ];

    try {
      const fileName = MinioHelper.generateObjectName('svg');
      const minioFileName = UsersService.AVATAR_FILE_PREFIX + fileName;

      await this.minio.uploadBuffer(
        Buffer.from(
          nj.renderString(await readTemplateFile(join(__dirname, `./default-avatar.svg`)), {
            fillColor: _.sample(AVATAR_FILL_COLORS),
            initials: makeDefaultAvatarNameAttribute(user.firstName || '', user.lastName || ''),
          }),
        ),
        minioFileName,
        { 'content-type': 'image/svg+xml' },
        cid,
      );

      avatar = fileName;

      lh.onSuccess();
    } catch (err) {
      lh.onError(err);
    }

    return avatar;
  }

  private async recreateDefaultAvatars() {
    const lh = new LogHelper(this, 'recreateDefaultAvatars');
    let avatar: string | null;

    try {
      const q: FilterQuery<IUser> = { avatar: { $eq: null } };
      const users = await User.find(q);

      lh.onStart(`Users without avatars: ${users.length}`);

      for (let u of users) {
        avatar = await this.tryPrepareDefaultAvatarFor(u);
        if (avatar) {
          u.avatar = avatar;
          await u.save();
        }
      }

      lh.onSuccess();
    } catch (err) {
      lh.onError(err);
    }
  }
}

export const makeAvatarPublicUrl = (avatar: string | null | undefined): string | null => {
  return avatar ? MinioHelper.getPublicUrlFor(UsersService.AVATAR_FILE_PREFIX + avatar) : null;
};

const makeDefaultAvatarNameAttribute = (
  firstName: string | null,
  lastName: string | null,
): string => {
  let res = 'NN';

  if (firstName && lastName) {
    // первые буквы от имени и фамилии
    res = `${firstName.charAt(0)}${lastName.charAt(0)}`;
  } else if (firstName) {
    // два раза первую букву имени
    res = `${firstName.charAt(0)}${firstName.charAt(0)}`;
  }

  return res.toUpperCase();
};

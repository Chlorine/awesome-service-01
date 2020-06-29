import { Db as MongoDatabase } from 'mongodb';
import { getLogger, LogHelper } from '../../utils/logger';
import PublicEvent, { IPublicEvent } from './models/event';
import { MinioHelper } from '../../utils/minio-helper';
import { checkObjectOwnership, UploadedFileHandlerParams } from '../../api/impl-utils';
import { ElapsedTime } from '../../utils/elapsed-time';
import * as sharp from 'sharp';
import { Utils } from '../../utils/utils';

const EVENT_LOGO_SIZE = 400;
const EVENT_BANNER_WIDTH = 1000;
const JPG_QUALITY = 77;

export class PublicEventsService {
  logger = getLogger('PubEvents');
  mdb: MongoDatabase;

  minio = new MinioHelper(this.logger.createChild('Minio'));
  static readonly MEDIA_FILE_PREFIX = 'public/event-medias/';

  constructor(mdb: MongoDatabase) {
    this.mdb = mdb;
  }

  async init() {
    const lh = new LogHelper(this, 'init');

    lh.onSuccess();
  }

  async tryGetEvent(id: string): Promise<IPublicEvent | null> {
    return PublicEvent.findById(id);
  }

  async getEvent(id: string): Promise<IPublicEvent> {
    const e = await this.tryGetEvent(id);
    if (!e) throw new Error(`Мероприятие не найдено`);

    return e;
  }

  async setEventMedia({
    user,
    objectId,
    objectType,
    cid,
    filePath,
    fileSize,
    fileExt,
  }: UploadedFileHandlerParams): Promise<string> {
    const event = await this.getEvent(objectId);
    checkObjectOwnership({ user }, event);

    const et = new ElapsedTime();

    let fileName: string;
    let imgContentType = 'image/jpeg';

    et.reset();
    let sh = sharp(filePath);
    const srcImageInfo = await sh.metadata();
    this.logger.debug(
      `[setEventMedia]: image loading time ${et.getDiffStr()} (${fileSize} byte(s))`,
      Utils.pickProps(srcImageInfo, ['format', 'width', 'height']),
    );

    et.reset();

    if (objectType === 'public-event-logo') {
      sh = sh.resize({
        withoutEnlargement: true,
        width: EVENT_LOGO_SIZE,
        height: EVENT_LOGO_SIZE,
        fit: 'cover',
      });
    } else if (objectType === 'public-event-banner') {
      sh = sh.resize({
        withoutEnlargement: true,
        width: EVENT_BANNER_WIDTH,
        fit: 'cover',
      });
    }

    if (fileExt === 'png') {
      sh = sh.png();
      imgContentType = 'image/png';
      fileName = MinioHelper.generateObjectName('png');
    } else {
      sh = sh.jpeg({ quality: JPG_QUALITY });
      fileName = MinioHelper.generateObjectName('jpg');
    }

    const img = await sh.toBuffer({ resolveWithObject: true });

    this.logger.debug(
      `[setEventMedia]: image processing time ${et.getDiffStr()} (${fileSize} --> ${
        img.info.size
      } (${img.info.width}x${img.info.height}))`,
    );

    const minioFileName = PublicEventsService.MEDIA_FILE_PREFIX + fileName;

    await Utils.wrappedCall(
      this.minio.uploadBuffer(img.data, minioFileName, { 'content-type': imgContentType }, cid),
      'Загрузка файла в хранилище',
    );

    let fileToRemove = '';

    if (objectType === 'public-event-logo') {
      if (event.logo) {
        fileToRemove = PublicEventsService.MEDIA_FILE_PREFIX + event.logo;
      }
      event.logo = fileName;
    } else if (objectType === 'public-event-banner') {
      if (event.banner) {
        fileToRemove = PublicEventsService.MEDIA_FILE_PREFIX + event.banner;
      }

      event.banner = fileName;
    }

    if (fileToRemove) {
      const { error: removeErr } = await Utils.safeCall(this.minio.removeFile(fileToRemove, cid));
      if (removeErr) {
        this.logger.warn(`[setEventMedia]: Removing existing file failed (${removeErr})`);
      }
    }

    await event.save();

    return MinioHelper.getPublicUrlFor(minioFileName);
  }
}

export const makeEventMediaPublicUrl = (media: string | null | undefined): string | null => {
  return media ? MinioHelper.getPublicUrlFor(PublicEventsService.MEDIA_FILE_PREFIX + media) : null;
};

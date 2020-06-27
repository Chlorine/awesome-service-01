import { Client } from 'minio';
import { nanoid } from 'nanoid';

import CONFIG from './../../config';

import { ILogger } from '../interfaces/common';
import { ElapsedTime } from './elapsed-time';
import { LogHelper } from './logger';
import { Dictionary } from '../interfaces/common-front/index';

export class MinioHelper {
  readonly client = new Client(CONFIG.s3.clientOptions);
  readonly bucket = CONFIG.s3.bucket;

  constructor(public logger: ILogger) {}

  static generateObjectName(ext?: string) {
    let name = nanoid(36);
    if (ext) {
      name += '.';
      name += ext;
    }

    return name;
  }

  static getPublicUrlFor(minioFileName: string) {
    const { publicUrlBase, bucket } = CONFIG.s3;

    return [publicUrlBase, '/', bucket, '/', minioFileName].join('');
  }

  async uploadFile(localFilePath: string, objectName: string, cid?: string) {
    const lh = new LogHelper(this, cid ? `uploadFile|${cid}` : 'uploadFile', 'info');
    await this.client.fPutObject(this.bucket, objectName, localFilePath, {});
    lh.onSuccess(`'${objectName}' IS UPLOADED`);
  }

  async uploadBuffer(buf: Buffer, objectName: string, metaData: Dictionary<any>, cid?: string) {
    const lh = new LogHelper(this, cid ? `uploadBuffer|${cid}` : 'uploadBuffer', 'info');
    await this.client.putObject(this.bucket, objectName, buf, buf.length, metaData);
    lh.onSuccess(`'${objectName}' IS UPLOADED`);
  }

  async removeFile(objectName: string, cid?: string) {
    const lh = new LogHelper(this, cid ? `removeFile|${cid}` : 'removeFile', 'info');

    let fileExists = false;

    try {
      await this.client.statObject(this.bucket, objectName);
      fileExists = true;
    } catch (err) {
      lh.write(`client.statObject failed for '${objectName}' (${err})`, 'warn');
    }

    if (fileExists) {
      await this.client.removeObject(this.bucket, objectName);
      lh.onSuccess(`'${objectName}' IS REMOVED`);
    } else {
      lh.write(`'${objectName}': looks like file is missing (${lh.et.getDiffStr()})`);
    }
  }
}

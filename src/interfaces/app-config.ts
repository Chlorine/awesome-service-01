import { RedisOptions } from 'ioredis';
import { Options as SMTPTransportOptions } from 'nodemailer/lib/smtp-transport';

import { GenericObject } from './common-front';
import { IWorkingFolderParams } from './common';

export interface IAppConfig {
  instance: {
    name: string;
  };

  common: {
    httpPort: number;
    urlBaseForLinks: string;
    fastTrackUrlBase: string;
    widgetLoadersUrlBase: string;
    visitorRegWidgetUrlBase: string;
  };

  logs: {
    level: string;
    colorize: boolean;
    httpLevel?: string;
  } & GenericObject;

  daData: {
    apiKey: string;
    redisDb: number;
    redisKeyTTL: number;
    mongoRecordTTL: number;
  };

  redis: RedisOptions;

  mongo: {
    host: string;
    port: number;
    db: string;
  };

  mail: {
    defaultFrom: string;
    defaultFromName: string;
    sendQueuePollInterval: number;
    smtp?: SMTPTransportOptions;
  };

  workingFolderParams: IWorkingFolderParams;

  debug?: GenericObject;
}

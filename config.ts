import { IAppConfig } from './src/interfaces/app-config';
import { Env } from './src/utils/env';

const loadConfig = (): IAppConfig => {
  return {
    instance: {
      name: 'default',
    },

    common: {
      httpPort: Env.getInt('PORT', 3301),
    },

    logs: {
      level: Env.getStr('LOG_LEVEL', 'debug'),
      colorize: Env.getBool('LOG_COLORIZE', false),
      httpLevel: Env.getStr('HTTP_LOG_LEVEL', ''), // TODO: подумать про http лог на сервере
    },

    workingFolderParams: {
      companyName: 'TicketSoft',
      subFolderName: 'awesome-01',
      fileNamePrefix: 'awesome-01',
    },

    daData: {
      apiKey: Env.getStr('DADATA_API_KEY', ''),
      redisDb: Env.getInt('DADATA_REDIS_DB', 6),
      redisKeyTTL: Env.getInt('DADATA_REDIS_KEY_TTL', 24 * 60 * 60),
      mongoRecordTTL: Env.getInt('DADATA_MONGO_RECORD_TTL', 0), // TODO: сколько хранить запись?
    },

    redis: {
      host: Env.getStr('REDIS_HOST', 'localhost'),
      port: Env.getInt('REDIS_PORT', 6379),
      db: Env.getInt('REDIS_DB', 0),
      lazyConnect: true,
    },

    mongo: {
      host: Env.getStr('MONGO_HOST', 'localhost'),
      port: Env.getInt('MONGO_PORT', 27017),
      db: Env.getStr('MONGO_DB', 'awesome-service'),
    },

    mail: {
      defaultFrom: 'no-reply@cloudtickets.io',
      defaultFromName: 'Awesome Service',
      sendQueuePollInterval: 3000,
      smtp: {
        host: Env.getStr('SMTP_HOST', 'invalid_smtp_host'),
        port: Env.getInt('SMTP_PORT', 465),
        secure: Env.getBool('SMTP_SECURE', true),
        auth: {
          user: Env.getStr('SMTP_USER', ''),
          pass: Env.getStr('SMTP_PASSWORD', ''),
        },
      },
    },

    debug: {
      someValue: false,
    },
  };
};

const theConfig = loadConfig();

export default theConfig;

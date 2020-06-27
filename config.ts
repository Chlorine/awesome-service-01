import { IAppConfig } from './src/interfaces/app-config';
import { Env } from './src/utils/env';

const loadConfig = (): IAppConfig => {
  return {
    instance: {
      name: 'default',
    },

    common: {
      httpPort: Env.getInt('PORT', 3301),
      urlBaseForLinks: Env.getStr('URL_BASE_FOR_LINKS', 'https://cloudtickets.io'),
      fastTrackUrlBase: Env.getStr('FAST_TRACK_URL_BASE', 'https://fast-track.cloudtickets.io'),
      widgetLoadersUrlBase: Env.getStr(
        'WIDGET_LOADERS_URL_BASE',
        'https://api.cloudtickets.io/widgets',
      ),
      visitorRegWidgetUrlBase: Env.getStr(
        'VISITOR_REG_WIDGET_URL_BASE',
        'https://visitor-reg-widget.cloudtickets.io',
      ),
      secureCookies: Env.getBool('SECURE_COOKIES', true),
    },

    uploads: {
      maxFileSizeInBytes: Env.getInt('UPLOAD_MAX_FILE_SIZE', 16 * 1024 * 1024),
      imageFileExtensions: ['jpg', 'png', 'gif'],
    },

    s3: {
      clientOptions: {
        endPoint: Env.getStr('S3_ENDPOINT', 'localhost'),
        accessKey: Env.getStr('S3_ACCESS_KEY', 'minio'),
        secretKey: Env.getStr('S3_SECRET_KEY', 'invalid_s3_secret_key'),
        useSSL: Env.getBool('S3_SSL', false),
        port: Env.getInt('S3_PORT', 9000),
      },
      bucket: Env.getStr('S3_BUCKET', 'awesome-service'),
      publicUrlBase: Env.getStr('S3_PUBLIC_URL_BASE', 'http://localhost:9000'),
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
      skipSendingUserRegisteredMail: Env.getBool('SKIP_SEND_USER_REG_MAIL', false),
    },
  };
};

const theConfig = loadConfig();

export default theConfig;

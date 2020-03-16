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

    daDataApiKey: Env.getStr('DADATA_API_KEY', ''),
    daDataRedisDb: Env.getInt('DADATA_REDIS_DB', 6),

    redis: {
      host: Env.getStr('REDIS_HOST', 'localhost'),
      port: Env.getInt('REDIS_PORT', 6379),
      db: Env.getInt('REDIS_DB', 0),
      lazyConnect: true,
    },

    debug: {
      someValue: false,
    },
  };
};

const theConfig = loadConfig();

export default theConfig;

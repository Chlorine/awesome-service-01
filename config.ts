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
      httpLevel: Env.getStr('HTTP_LOG_LEVEL', 'debug'), // TODO: подумать про http лог на сервере
    },

    workingFolderParams: {
      companyName: 'TicketSoft',
      subFolderName: 'awesome-01',
      fileNamePrefix: 'awesome-01',
    },

    debug: {
      someValue: false,
    },
  };
};

const theConfig = loadConfig();

export default theConfig;

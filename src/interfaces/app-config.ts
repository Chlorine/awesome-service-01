import { RedisOptions } from 'ioredis';

import { GenericObject } from './common-front';
import { IWorkingFolderParams } from './common';

export interface IAppConfig {
  instance: {
    name: string;
  };

  common: {
    httpPort: number;
  };

  logs: {
    level: string;
    colorize: boolean;
    httpLevel?: string;
  } & GenericObject;

  daDataApiKey: string;
  daDataRedisDb: number;

  redis: RedisOptions;

  workingFolderParams: IWorkingFolderParams;

  debug?: GenericObject;
}

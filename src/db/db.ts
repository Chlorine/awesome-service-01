import { getLogger, LogHelper } from '../utils/logger';
import { EventEmitter } from 'events';
import { Utils } from '../utils/utils';

// TODO: придумать зачем mySql и законнектиться
export class Database extends EventEmitter {
  logger = getLogger('DB');

  constructor() {
    super();
  }

  async init() {
    const lh = new LogHelper(this, 'init');
    await Utils.delay(33);

    lh.onSuccess();
  }
}

export const db = new Database();

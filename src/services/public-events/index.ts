import { Db as MongoDatabase } from 'mongodb';
import { getLogger, LogHelper } from '../../utils/logger';

export class PublicEventsService {
  logger = getLogger('PubEvents');
  mdb: MongoDatabase;

  constructor(mdb: MongoDatabase) {
    this.mdb = mdb;
  }

  async init() {
    const lh = new LogHelper(this, 'init');

    lh.onSuccess();
  }
}

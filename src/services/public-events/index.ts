import { Db as MongoDatabase } from 'mongodb';
import { getLogger, LogHelper } from '../../utils/logger';
import PublicEvent, { IPublicEvent } from './models/event';

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

  async tryGetEvent(id: string): Promise<IPublicEvent | null> {
    return PublicEvent.findById(id);
  }

  async getEvent(id: string): Promise<IPublicEvent> {
    const e = await this.tryGetEvent(id);
    if (!e) throw new Error(`Мероприятие не найдено`);

    return e;
  }
}

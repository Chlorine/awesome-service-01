import { EventEmitter } from 'events';
import { MongoClient, Db as MongoDatabase, Collection } from 'mongodb';

import { MinimalVisitorInfo } from '../interfaces/common-front';
import { getLogger } from '../utils/logger';
import { VisitorInformation } from './objects';

export class VisitorsDatabase extends EventEmitter {
  logger = getLogger('VisitorsDB');

  mongoClient: MongoClient;
  mdb: MongoDatabase;

  constructor(mongoClient: MongoClient) {
    super();

    this.mongoClient = mongoClient;
    this.mdb = this.mongoClient.db('visitors');
  }

  private get vColl(): Collection<VisitorInformation> {
    return this.mdb.collection('temp-visitors');
  }

  async init() {
    this.logger.info('Init complete');
  }

  async registerVisitor(
    visitor: MinimalVisitorInfo,
    phone: string,
    email: string,
  ): Promise<string> {
    const insertRes = await this.vColl.insertOne({
      baseInfo: visitor,
      phone,
      email,
    });

    return insertRes.insertedId.toHexString();
  }
}

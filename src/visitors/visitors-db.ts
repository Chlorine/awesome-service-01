import { EventEmitter } from 'events';
import { MongoClient, Db as MongoDatabase, Collection, ObjectID } from 'mongodb';

import { getLogger, LogHelper } from '../utils/logger';
import { Utils } from '../utils/utils';

import { MinimalVisitorInfo } from '../interfaces/common-front';
import { UserAgentInfo, VisitorInformationRecord } from './objects';

export type RegisterResult = {
  id: string;
  alreadyRegistered: boolean;
};

export type RegisterParams = {
  visitor: MinimalVisitorInfo;
  phone: string;
  email: string;
  uaInfo: UserAgentInfo | null;
  remoteAddress?: string;
};

export class VisitorsDatabase extends EventEmitter {
  logger = getLogger('VisitorsDB');

  mongoClient: MongoClient;
  mdb: MongoDatabase;

  constructor(mongoClient: MongoClient) {
    super();

    this.mongoClient = mongoClient;
    this.mdb = this.mongoClient.db('visitors');
  }

  private get vColl(): Collection<VisitorInformationRecord> {
    return this.mdb.collection('visitors-v1');
  }

  async init() {
    this.logger.info('Init complete');
  }

  async register(params: RegisterParams): Promise<RegisterResult> {
    const lh = new LogHelper(this, 'register', 'info');

    const { visitor, phone, email, uaInfo, remoteAddress } = params;

    const res: RegisterResult = {
      id: '',
      alreadyRegistered: false,
    };

    const { firstName, middleName, lastName, companyName, position } = visitor;

    const hashSrc = `${firstName}|${middleName}|${lastName}|${companyName}|${position}|${phone}|${email}`;
    const hash = Utils.md5(hashSrc);

    lh.write(`received: [${hashSrc}]`, 'info');

    const updRes = await this.vColl.findOneAndUpdate(
      {
        hash,
      },
      {
        $inc: { submits: 1 },
        $set: {
          uaInfo,
          ip: remoteAddress || null,
        },
      },
    );

    if (updRes.value) {
      // @ts-ignore
      res.id = updRes.value._id;
      res.alreadyRegistered = true;
    } else {
      const upsertRes = await this.vColl.updateOne(
        {
          hash,
        },
        {
          $set: {
            baseInfo: visitor,
            phone,
            email,
            submits: 1,
            uaInfo,
            ip: remoteAddress || null,
          },
        },
        { upsert: true },
      );

      res.id = upsertRes.upsertedId._id.toHexString();
    }

    lh.onSuccess(JSON.stringify(res));

    return res;
  }
}

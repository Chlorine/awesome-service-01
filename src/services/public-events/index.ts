import { Db as MongoDatabase } from 'mongodb';

import { getLogger, LogHelper } from '../../utils/logger';
import { BasicVisitorInfo } from '../../interfaces/common-front/public-events/index';
import { UserAgentInfo } from '../../utils/user-agent-info';
import { Utils } from '../../utils/utils';
import { FastTrackVisitorRecord } from './interfaces/fast-track-visitor';

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

  async registerFastTrackVisitor(params: {
    visitor: BasicVisitorInfo;
    uaInfo: UserAgentInfo | null;
    ip?: string;
  }): Promise<{ visitorId: string; alreadyRegistered: boolean }> {
    let visitorId: string;
    let alreadyRegistered: boolean = false;

    const lh = new LogHelper(this, 'registerFastTrackVisitor', 'info');
    const coll = this.mdb.collection<FastTrackVisitorRecord>('ft-visitors');

    const { firstName, middleName, lastName, companyName, position, phone, email } = params.visitor;

    const hashSrc = `${firstName}|${middleName}|${lastName}|${companyName}|${position}|${phone}|${email}`;
    const hash = Utils.md5(hashSrc);

    lh.write(`received: [${hashSrc}]`);

    const updRes = await coll.findOneAndUpdate(
      {
        hash,
      },
      {
        $inc: { submits: 1 },
        $set: {
          uaInfo: params.uaInfo,
          ip: params.ip || null,
        },
      },
    );

    if (updRes.value) {
      alreadyRegistered = true;
      // @ts-ignore
      visitorId = updRes.value._id.toHexString();
    } else {
      // нет записи с таким хешом

      const upsertRes = await coll.updateOne(
        {
          hash,
        },
        {
          $set: {
            info: params.visitor,
            submits: 1,
            uaInfo: params.uaInfo,
            ip: params.ip || null,
          },
        },
        { upsert: true },
      );

      visitorId = upsertRes.upsertedId._id.toHexString();
    }

    lh.onSuccess(`vId: ${visitorId} (isNew: ${!alreadyRegistered})`);

    return {
      visitorId,
      alreadyRegistered,
    };
  }
}

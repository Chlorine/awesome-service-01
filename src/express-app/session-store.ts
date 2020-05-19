import * as mongoose from 'mongoose';

import * as ConnectMongo from 'connect-mongo';
import * as session from 'express-session';

import { getLogger } from '../utils/logger';

export function createSessionStore() {
  const logger = getLogger('SessionStore');

  const MongoStore = ConnectMongo(session);

  const store = new MongoStore({
    mongooseConnection: mongoose.connection,
    collection: 'http-sessions',
  });

  store.on('create', (sid: string) => logger.silly(`Session CREATED ${sid}`));
  store.on('touch', (sid: string) => logger.silly(`Session TOUCHED ${sid}`));
  store.on('update', (sid: string) => logger.silly(`Session UPDATED ${sid}`));
  store.on('destroy', (sid: string) => logger.silly(`Session DESTROYED ${sid}`));

  return store;
}

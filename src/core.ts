import { EventEmitter } from 'events';
import * as SocketIO from 'socket.io';
import * as _ from 'lodash';
import * as moment from 'moment';
import { MongoClientOptions } from 'mongodb';
import * as IORedis from 'ioredis';
import * as mongoose from 'mongoose';

import { createExpressApp } from './express-app/app';
import { Database, db } from './db/db';

import { API } from './api/index';
import { routeApi } from './express-app/routes/route-api';
import { getLogger, LogHelper } from './utils/logger';

import CONFIG from './../config';

import { GenericObject } from './interfaces/common-front';
import { WSMessagePayload } from './interfaces/common-front/ws';
import { WebSocket, wsEmitTo } from './express-app/ws';
import { Env } from './utils/env';
import { DaData } from './services/dadata';
import { Utils } from './utils/utils';
import { endResponseWithJson } from './express-app/routes/_route-utils';

import { PublicEventsService } from './services/public-events';
import { UsersService } from './services/users';
import { Mailer } from './services/mailer';

const SocketNamespaces = {
  DEFAULT: '/default',
};

// tslint:disable-next-line:interface-name
export interface Core {
  on(event: string, listener: (...args: any[]) => void): this;
  on(event: 'textMsgEvent', listener: (info: GenericObject) => void): this;
}

// tslint:disable-next-line:interface-name
declare interface _StronglyTypedEmitter {
  emit(event: string | symbol, ...args: any[]): boolean;
  emit(event: 'textMsgEvent', info: GenericObject): boolean;
}

export class Core extends EventEmitter {
  logger = getLogger('Core');
  db: Database;
  api: API | undefined;
  wsServer: SocketIO.Server | undefined;
  redisClient: IORedis.Redis | undefined;

  private _daData: DaData | undefined;
  private _publicEvents: PublicEventsService | undefined;
  private _mailer: Mailer | undefined;
  private _users: UsersService | undefined;

  static get urlBaseForLinks(): string {
    return CONFIG.common.urlBaseForLinks;
  }

  constructor() {
    super();

    this.db = db;
  }

  async init() {
    moment.locale('ru');

    const lh = new LogHelper(this, 'init');

    try {
      // некоторая sql БД (пока пустышка)

      await this.db.init();
      lh.write('db connected');

      // mongo

      const mongoUri = `mongodb://${CONFIG.mongo.host}:${CONFIG.mongo.port}`;

      mongoose.set('useCreateIndex', true);
      mongoose.set('useFindAndModify', false);

      await Utils.wrappedCall(
        mongoose.connect(mongoUri, {
          ...Core.mongoClientOptions,
          dbName: CONFIG.mongo.db,
        }),
        'Connect to mongo',
      );
      lh.write('mongo connected');

      // redis

      this.redisClient = new IORedis(CONFIG.redis);
      this.redisClient.on('error', err => this.logger.error(`Redis error: ${err.message}`));
      await Utils.wrappedCall(this.redisClient.connect(), 'Connect to redis');
      lh.write('redis connected');

      // коннектор к dadata

      this._daData = new DaData(mongoose.connection.db);
      await this._daData.init();

      // СЕРВИСЫ:

      this._mailer = new Mailer();
      await this._mailer.init();

      // юзеры системы
      this._users = new UsersService();
      await this._users.init();

      // проведение публичных событий
      this._publicEvents = new PublicEventsService(mongoose.connection.db);
      await this._publicEvents.init();

      // api

      this.api = new API(this);

      // express

      const apiUrls = ['/api/execute'];

      const expressApp = createExpressApp({
        httpPort: CONFIG.common.httpPort,
        logger: this.logger,
        httpLogger: CONFIG.logs.httpLevel ? getLogger('HTTP', 'http') : undefined,
        passportAuthSource: {
          doAuth: this._users.doAuth.bind(this._users),
        },
        cookieSecret: 'Awesome01@$^!',
        cookieName: 'awesome-service-sid',
        cookieSecure: CONFIG.common.secureCookies,

        routes: [{ path: '/api', routeMatcher: routeApi(this.api) }],

        ws: {
          namespaces: _.values(SocketNamespaces),
          onConnection: this.onWebSocketConnected.bind(this),
        },
        on500: (err, reqMethod, reqUrl, res) => {
          let answered = false;

          if (reqMethod.toUpperCase() === 'POST' && apiUrls.includes(reqUrl)) {
            endResponseWithJson(res, API.makeResults(new Error(err.message)), 500);
            answered = true;
          }

          return answered;
        },
      });

      this.onWebSocketServerCreated(expressApp.socketServer);

      lh.onSuccess();
    } catch (err) {
      lh.onError(err);
      throw err;
    }
  }

  private onWebSocketServerCreated(wss: SocketIO.Server) {
    this.wsServer = wss;

    const io = this.wsServer;
    const allSockets = io.of(SocketNamespaces.DEFAULT).sockets;
  }

  private onWebSocketConnected(socket: WebSocket) {
    if (socket.nsp.name === SocketNamespaces.DEFAULT) {
      socket.currentMode = 'NONE';

      socket.on('setMode', (payload: WSMessagePayload<'setMode'>) => {
        this.logger.debug(`socket [${socket.id}] setMode('${payload.mode}')`);
        socket.currentMode = payload.mode;
      });
    }
  }

  private static get mongoClientOptions(): MongoClientOptions {
    let opts: MongoClientOptions = {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      appname: 'awesome-service',
    };

    if (Env.getBool('USE_HARDCODED_MONGO_AUTH', false)) {
      opts = {
        ...opts,
        ...{
          authSource: 'admin',
          authMechanism: 'SCRAM-SHA-1',
          auth: {
            user: 'admin',
            password: 'ticket1soft',
          },
        },
      };
    }

    return opts;
  }

  get daData(): DaData {
    if (!this._daData) {
      throw new Error('daData: module is not ready');
    }

    return this._daData;
  }

  get users(): UsersService {
    if (!this._users) {
      throw new Error('users: module is not ready');
    }

    return this._users;
  }

  get mailer(): Mailer {
    if (!this._mailer) {
      throw new Error('mailer: module is not ready');
    }

    return this._mailer;
  }

  get publicEvents(): PublicEventsService {
    if (!this._publicEvents) {
      throw new Error('publicEvents: module is not ready');
    }

    return this._publicEvents;
  }
}

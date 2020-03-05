import { EventEmitter } from 'events';
import * as SocketIO from 'socket.io';
import * as _ from 'lodash';
import * as moment from 'moment';

import { MongoClient, MongoClientOptions } from 'mongodb';

import { createExpressApp } from './express-app/app';
import { Database, db } from './db/db';

import { API } from './api';
import { routeApi } from './express-app/route-api';
import { getLogger, LogHelper } from './utils/logger';

import CONFIG from './../config';

import { GenericObject } from './interfaces/common-front';
import { IUser, WSMessagePayload } from './interfaces/common-front';
import { WebSocket, wsEmitTo } from './express-app/ws';
import { VisitorsDatabase } from './visitors/visitors-db';
import { Env } from './utils/env';

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
  mongoClient: MongoClient | undefined;
  vdb: VisitorsDatabase | undefined;

  constructor() {
    super();

    this.db = db;
  }

  private async tempDoAuth(
    username: string | null,
    password: string | null,
    userId: string | null,
  ): Promise<IUser> {
    this.logger.debug(`tempDoAuth ${username} | ${password} | ${userId}`);
    let res: IUser | null = null;

    const fakeUser: IUser & { password: string } = {
      id: '4321',
      role: 'admin',
      username: 'admin',
      password: '1234',
    };

    if (
      (username === fakeUser.username && password === fakeUser.password) ||
      userId === fakeUser.id
    ) {
      res = fakeUser;
    }

    if (!res) {
      throw new Error('User not found');
    }

    return res;
  }

  async init() {
    moment.locale('ru');

    const lh = new LogHelper(this, 'init');

    try {
      await this.db.init();
      lh.write('db connected');

      let mongoClientOpts: MongoClientOptions = {
        useUnifiedTopology: true,
        appname: 'awesome-service-01',
      };

      if (Env.getBool('USE_HARDCODED_MONGO_AUTH', false)) {
        mongoClientOpts = {
          ...mongoClientOpts,
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

      this.mongoClient = new MongoClient(`mongodb://localhost:27017`, mongoClientOpts);

      await this.mongoClient.connect();
      lh.write('mongo connected');

      this.vdb = new VisitorsDatabase(this.mongoClient);
      await this.vdb.init();

      this.api = new API(this.vdb);

      const apiUrls = ['/api'];

      const expressApp = createExpressApp({
        httpPort: CONFIG.common.httpPort,
        logger: this.logger,
        httpLogger: CONFIG.logs.httpLevel ? getLogger('HTTP', 'http') : undefined,
        passportAuthSource: {
          doAuth: this.tempDoAuth.bind(this),
        },
        cookieSecret: 'Awesome01@$^!',

        routes: [{ path: '/api', routeMatcher: routeApi(this.api) }],

        ws: {
          namespaces: _.values(SocketNamespaces),
          onConnection: this.onWebSocketConnected.bind(this),
        },
        on500: (err, reqMethod, reqUrl, res) => {
          let answered = false;

          if (reqMethod.toUpperCase() === 'POST' && apiUrls.includes(reqUrl)) {
            res.send(API.makeResponse(new Error(err.message)));
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
}

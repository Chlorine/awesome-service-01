import { Server as HttpServer } from 'http';

import * as cookieParser from 'cookie-parser';
import * as SocketIO from 'socket.io';
import { getLogger } from '../utils/logger';
import { WebSocketMode, WSMessages } from '../interfaces/common-front/ws';
const passportSocketIO = require('passport.socketio');

export type WebSocket = SocketIO.Socket & {
  currentMode?: WebSocketMode;
  [key: string]: any;
};

export type WSConnectionHandler = (socket: WebSocket) => void;

export type WebSocketParams = {
  httpServer: HttpServer;
  cookieSecret: string;
  sessionStore: any;
  namespaces: string[];
  onConnection: WSConnectionHandler;
};

declare type PassportAcceptFn = (err: Error | null, flag: boolean) => void;

export function createWS(params: WebSocketParams): SocketIO.Server {
  const { httpServer, cookieSecret, sessionStore } = params;

  // TODO: сшибать разлогинившихся в других вкладках (посмотреть passportSocketIO.filterSocketsByUser)

  const io = SocketIO(httpServer);
  const logger = getLogger('WS');

  // noinspection TypeScriptValidateJSTypes
  io.use(
    passportSocketIO.authorize({
      cookieParser,
      key: 'connect.sid',
      secret: cookieSecret,
      store: sessionStore,
      success: (data: any, accept: PassportAcceptFn) => {
        // logger.silly('psioSuccess', data.user);
        accept(null, true);
      },
      fail: (data: any, message: string, error: any, accept: PassportAcceptFn) => {
        // logger.silly('psioFail', message, error);
        accept(null, false);
      },
    }),
  );

  const nsIOs = params.namespaces.map(ns => io.of(ns));

  nsIOs.forEach(nsIo => {
    nsIo.on('connection', socket => {
      logger.debug(`+connect`, socket.id, nsIo.name);

      socket.on('error', err => {
        logger.error('Socket error', err.message);
      });

      socket.on('disconnect', () => {
        logger.debug('-disconnect', socket.id);
      });

      params.onConnection(socket);
    });
  });

  return io;
}

export function wsEmitTo<WSMsg extends keyof WSMessages>(
  sockets: { [id: string]: WebSocket },
  message: WSMsg,
  payload: WSMessages[WSMsg]['payload'],
  filterFn?: (sock: WebSocket) => boolean,
) {
  const keys = Object.keys(sockets);
  for (let sock: WebSocket, i = 0; i < keys.length; i++) {
    sock = sockets[keys[i]];

    if (filterFn) {
      filterFn(sock) && sock.emit(message, payload);
    } else {
      sock.emit(message, payload);
    }
  }
}

import * as SocketIO from 'socket.io';
import * as HttpErrors from 'http-errors';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';

import { createMainRouter } from './router';
import { STATUS_CODES as HTTP_STATUS_CODES } from 'http';
import { ILogger } from '../interfaces/common';
import { IPassportAuthSource } from './passport';
import { createWS, WSConnectionHandler } from './ws';
import { endResponseWithString } from './routes/_route-utils';
import { createSessionStore } from './session-store';

export type ExpressAppParams = {
  httpPort: number;
  logger: ILogger;
  httpLogger?: ILogger;
  passportAuthSource: IPassportAuthSource;
  cookieSecret: string;
  cookieName?: string;
  cookieSecure?: boolean;
  routes: { path: string; routeMatcher: express.Router }[];
  ws: {
    namespaces: string[];
    onConnection: WSConnectionHandler;
  };
  on500?: (err: Error, reqMethod: string, reqUrl: string, res: Response) => boolean;
};

export type ExpressApp = {
  socketServer: SocketIO.Server;
};

export function createExpressApp(params: ExpressAppParams): ExpressApp {
  const {
    cookieSecret,
    httpPort,
    routes,
    httpLogger,
    passportAuthSource,
    ws,
    logger,
    cookieName,
    cookieSecure,
  } = params;
  const app = express();

  const sessionStore = createSessionStore();

  if (cookieSecure) {
    // https://gist.github.com/nikmartin/5902176
    app.enable('trust proxy');
  }

  app
    .use((req: Request, res: Response, next: NextFunction) => {
      httpLogger && httpLogger.verbose(`${req.method} ${req.url}`);
      next();
    })
    .use(
      '/',
      createMainRouter({
        cookieSecret,
        routes,
        passportAuthSource,
        sessionStore,
        cookieName,
        cookieSecure,
      }),
    )
    // 404
    .use((req: Request, res: Response, next: NextFunction) => {
      // if (req.method === 'GET') {
      //   // на react-морду, если мы ее отдаем где-то рядом через serve-static
      //   return res.redirect(`/?redirectTo=${req.path}`);
      // }

      const err = new HttpErrors.NotFound(`Страница "${req.url}" не найдена`);
      next(err);
    })
    // 500
    .use((err: HttpErrors.HttpError, req: Request, res: Response, next: NextFunction) => {
      err.status = err.status || 500;
      err.statusDescription = HTTP_STATUS_CODES[err.status];
      if (!res.headersSent) {
        if (!params.on500 || !params.on500(err, req.method, req.url, res)) {
          res.status(err.status);
          endResponseWithString(res, `Server error (${err.message})`, 500);
        }
      }
    });

  const httpServer = app.listen(httpPort, () => {
    logger.info(`Main http server is listening on port ${httpPort}`);
  });

  const socketServer = createWS({
    httpServer,
    onConnection: ws.onConnection,
    namespaces: ws.namespaces,
    cookieSecret,
    sessionStore,
  });

  return {
    socketServer,
  };
}

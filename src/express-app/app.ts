import * as HttpErrors from 'http-errors';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';

import { createMainRouter } from './router';
import { STATUS_CODES as HTTP_STATUS_CODES } from 'http';

export type ExpressAppParams = {
  httpPort: number;
  cookieSecret: string;
  routes: { path: string; routeMatcher: express.Router }[];
};

export type ExpressApp = {
  // ws: SocketIO.Server;
};

export function createExpressApp(params: ExpressAppParams): ExpressApp {
  const res: ExpressApp = {};
  const { cookieSecret, httpPort, routes } = params;
  const app = express();

  app
    .use((req: Request, res: Response, next: NextFunction) => {
      // TODO: logger

      console.log(
        `expressApp: method=${req.method} hostname=${req.hostname} path=${
          req.path
        } headers=${JSON.stringify(req.headers)}`,
      );
      next();
    })
    .use('/', createMainRouter({ cookieSecret, routes }))
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
        res.writeHead(err.status, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.write(err.message);
        res.end();
        // if (!params.on500 || !params.on500(err, req.method, req.url, res)) {
        //   res.status(err.status);
        //   res.render('error', {
        //     message: err.message,
        //     error: err,
        //     ...defaultRenderOptions(req),
        //   });
        // }
      }
    });

  const httpServer = app.listen(httpPort, () => {
    // TODO: logger
    console.log(`Main http server is listening on port ${httpPort}`);
  });

  // TODO: create ws server

  return res;
}

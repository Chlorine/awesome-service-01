// import * as path from 'path';
import * as express from 'express';
import { Router } from 'express';
import * as session from 'express-session';

import { ServeStaticOptions } from 'serve-static';
import { MemoryStore } from 'express-session';
import { Request } from 'express';
import { Response } from 'express';

export type MainRouterParams = {
  cookieSecret: string;
  routes: { path: string; routeMatcher: Router }[];
};

export function createMainRouter(params: MainRouterParams): Router {
  const router = express.Router();
  // const { passportAuthSource, routes, cookieSecret, sessionStore } = params;
  const { cookieSecret, routes } = params;

  const staticOptions: ServeStaticOptions = {
    dotfiles: 'ignore',
    etag: true,
    extensions: ['html'],
    index: ['index.html'],
  };

  router
    // .use(express.static(path.join(__dirname, '../../public'), staticOptions))

    .use(
      session({
        secret: cookieSecret,
        resave: true,
        saveUninitialized: false,
        cookie: { maxAge: 48 * 60 * 60 * 1000 },
        store: new MemoryStore(),
      }),
    );

  routes.forEach(r => {
    router.use(r.path, r.routeMatcher);
  });

  router.use('*', (req: Request, res: Response) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.write('Hello! This is an API gateway. Nothing interesting here!');
    res.end();
  });

  return router;
}

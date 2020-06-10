import * as path from 'path';
import * as express from 'express';
import { Router } from 'express';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';

import { ServeStaticOptions } from 'serve-static';

import { Request } from 'express';
import { Response } from 'express';
import { configurePassport, IPassportAuthSource } from './passport';

export type MainRouterParams = {
  passportAuthSource: IPassportAuthSource;
  sessionStore: any;
  cookieSecret: string;
  routes: { path: string; routeMatcher: Router }[];
  cookieName?: string;
  cookieSecure?: boolean;
};

export function createMainRouter(params: MainRouterParams): Router {
  const router = express.Router();
  const {
    passportAuthSource,
    routes,
    cookieSecret,
    sessionStore,
    cookieName,
    cookieSecure,
  } = params;

  const staticOptions: ServeStaticOptions = {
    dotfiles: 'ignore',
    etag: true,
    extensions: ['html'],
    index: ['index.html'],
  };

  router
    .use(express.static(path.join(__dirname, '../../public'), staticOptions))
    .use(bodyParser.json({ limit: '17mb' }))
    .use(bodyParser.urlencoded({ extended: false }))
    .use(
      session({
        name: cookieName,
        secret: cookieSecret,
        resave: false,
        rolling: true,
        saveUninitialized: false,
        cookie: {
          maxAge: 48 * 60 * 60 * 1000,
          secure: cookieSecure,
          // sameSite: 'none',
        },
        store: sessionStore,
      }),
    );

  const passport = configurePassport(passportAuthSource);
  router.use(passport.initialize()).use(passport.session());

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

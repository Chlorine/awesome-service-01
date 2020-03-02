import { Request } from 'express';
import * as passport from 'passport';
import * as passportLocal from 'passport-local';
import { IVerifyOptions } from 'passport-local';

import { getLogger } from '../utils/logger';

export interface IPassportUser {
  id: string;
}

export interface IPassportAuthSource {
  doAuth: (
    username: string | null,
    password: string | null,
    userId: string | null,
  ) => Promise<IPassportUser>;
}

export function configurePassport(authSource: IPassportAuthSource) {
  const logger = getLogger('Passport');

  type VerifyCB = (error: any, user?: any, options?: IVerifyOptions) => void;

  passport.use(
    new passportLocal.Strategy(
      { passReqToCallback: true },
      (req: Request, username: string, password: string, done: VerifyCB) => {
        // logger.debug('----auth..... ', username, password);

        authSource
          .doAuth(username, password, null)
          .then((user: IPassportUser) => {
            done(null, user);
          })
          .catch(err => {
            done(null, undefined, { message: err.message });
          });
      },
    ),
  );

  passport.serializeUser<IPassportUser, string>((user, done) => {
    // logger.silly(`serializeUser`, user);
    done(null, user.id);
  });

  passport.deserializeUser<IPassportUser, string>((id, done) => {
    // logger.silly(`deserializeUser (1)`, id);
    authSource
      .doAuth(null, null, String(id))
      .then((user: IPassportUser) => {
        // logger.silly(`deserializeUser (2)`, user);
        done(null, user);
      })
      .catch(() => {
        // should be already logged

        // @ts-ignore --> "false" вместо IUser | undefined, а то паспорт клинит при смене базы
        done(null, false);
      });
  });

  return passport;
}

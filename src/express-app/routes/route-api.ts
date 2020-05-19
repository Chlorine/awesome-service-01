import { Router, Request, Response, NextFunction } from 'express';
import * as HttpErrors from 'http-errors';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import * as passport from 'passport';

import { API, IApiRequest } from '../../api/index';
import { GenericObject } from '../../interfaces/common-front';

import {
  CheckAuthResponse,
  LoginResponse,
  WebUISettings,
} from '../../interfaces/common-front/users';

import { endResponseWithJson, endResponseWithString } from './_route-utils';
import { JsonValidator } from '../../utils/json-validator';

import { IUser } from '../../services/users/models/user';

const _firstValidator = JsonValidator.createFromSchemeFile('./src/json-schemes/api-request.json');

const prepareApiRequest = (req: Request): IApiRequest => {
  const reqBody: GenericObject = req.body || {};

  const valErrText = _firstValidator.tryValidate(reqBody);
  if (valErrText) {
    throw new HttpErrors.BadRequest(`Некорректный запрос (${valErrText})`);
  }

  return {
    source: 'http',
    target: reqBody['target'],
    action: reqBody['action'],
    params: reqBody,
    user: req.user as IUser,
    remoteAddress: req.connection.remoteAddress,
    req,
  };
};

const statusCodeFromError = (err: Error): number => {
  if (err instanceof HttpErrors.HttpError) {
    return err.statusCode;
  }

  return 500;
};

function prepareUISettings(): WebUISettings {
  return {};
}

export const routeApi = (api: API): Router => {
  const logger = api.logger.createChild('Route');

  const _destroySession = (req: Request, cb: () => void) => {
    if (req.session) {
      req.session.destroy(err => {
        if (err) {
          logger.error(`req.session.destroy failed (${err})`);
        }
        cb();
      });
    } else {
      setTimeout(cb, 1);
    }
  };

  const r = Router()
    .use(cors({ origin: true, credentials: true }))
    .use(bodyParser.json({ limit: '1mb' }))

    .post('/login', (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate('local', (err: Error, user: IUser, info: any) => {
        if (err) return next(err);
        if (!user) {
          return endResponseWithJson(
            res,
            API.makeResults(
              new HttpErrors.Unauthorized(info && info.message ? info.message : 'Неверный пароль'),
            ),
            401,
          );
        }

        req.logIn(user, err => {
          if (err) return next(err);
          const response: LoginResponse = {
            user: user.asUserInfo(),
            uiSettings: prepareUISettings(),
          };

          return res.send(API.makeResults(response));
        });
      })(req, res, next);
    })

    .post('/check_auth', (req, res) => {
      if (!req.isAuthenticated()) {
        return endResponseWithJson(
          res,
          API.makeResults(new HttpErrors.Unauthorized('Требуется выполнить вход')),
          401,
        );
      }

      const results: CheckAuthResponse = {
        user: (req.user as IUser).asUserInfo(),
        uiSettings: prepareUISettings(),
      };

      res.send(API.makeResults(results));
    })

    .get('/logout', (req, res) => {
      req.logOut();
      _destroySession(req, () => {
        endResponseWithJson(res, { success: true });
      });
    })

    .post('/execute', (req: Request, res: Response) => {
      api
        .execute(prepareApiRequest(req))
        .then(results => endResponseWithJson(res, results))
        .catch(err => endResponseWithJson(res, API.makeResults(err), statusCodeFromError(err)));
    })

    .post('/suggestions/api/4_1/rs/suggest/fio', (req: Request, res: Response) => {
      api
        .execute({
          ...prepareApiRequest(req),
          action: 'getDaDataFioSuggestions',
          skipDebugLog: true,
        })
        .then(results => endResponseWithJson(res, results))
        .catch(err => endResponseWithJson(res, API.makeResults(err), statusCodeFromError(err)));
    });

  // 404
  r.use((req: Request, res: Response, next: NextFunction) => {
    endResponseWithJson(
      res,
      API.makeResults(new HttpErrors.NotFound(`Cannot ${req.method} '${req.url}'`)),
      404,
    );
    next();
  });

  // 500
  r.use((err: HttpErrors.HttpError, req: Request, res: Response, next: NextFunction) => {
    logger.error('Error500', err);
    endResponseWithJson(res, API.makeResults(err), statusCodeFromError(err));
  });

  return r;
};

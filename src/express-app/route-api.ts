import { Router, Request, Response, NextFunction } from 'express';
import * as HttpErrors from 'http-errors';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';

import { API, IApiResponse } from '../api';

function ensureAuth(req: Request, res: Response, next: NextFunction) {
  // if (req.isAuthenticated()) return next();
  // res.send({ ...API.makeResponse(new HttpErrors.Unauthorized('Login required')), needLogin: true });

  return next();
}

export const routeApi = (api: API): Router => {
  const logger = api.logger.createChild('Route');

  const r = Router()
    .use(cors({ origin: true, credentials: true }))
    .use(bodyParser.json({ limit: '17mb' }))

    .post('/execute', ensureAuth, (req: Request, res: Response) => {
      const { action } = req.body;

      api
        .execute({
          action,
          currentUser: null, // req.user,
          remoteAddress: req.connection.remoteAddress,
          params: req.body,
          source: 'http',
        })
        .then((response: IApiResponse) => {
          res.send(response);
        })
        .catch(err => {
          res.send(API.makeResponse(err));
        });
    })

    .post('/suggestions/api/4_1/rs/suggest/fio', (req: Request, res: Response) => {
      api
        .execute({
          action: 'getDaDataFioSuggestions',
          currentUser: null, // req.user,
          remoteAddress: req.connection.remoteAddress,
          params: req.body,
          source: 'http',
          skipDebugLog: true,
        })
        .then((response: IApiResponse) => {
          res.send(response);
        })
        .catch(err => {
          res.send(API.makeResponse(err));
        });
    });

  // 404
  r.use((req: Request, res: Response, next: NextFunction) => {
    next(new HttpErrors.NotFound(`Cannot ${req.method} '${req.url}'`));
  });

  // 500
  r.use((err: HttpErrors.HttpError, req: Request, res: Response, next: NextFunction) => {
    logger.error('Error500', err);
    res.status(err.status || 500);
    res.send(API.makeResponse(err));
  });

  return r;
};

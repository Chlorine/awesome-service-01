import * as _ from 'lodash';
import * as moment from 'moment';
import { NextFunction, Request, Response } from 'express';
import * as HttpErrors from 'http-errors';
import { format } from 'util';

import { GenericObject } from '../../interfaces/common-front';

import { DateRange, ILogger, Image } from '../../interfaces/common';
import { Utils } from '../../utils/utils';

import { ElapsedTime } from '../../utils/elapsed-time';
import { IUser } from '../../services/users/models/user';

export const ensureAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

export const endResponseWithString = (res: Response, text: string, status: number = 200) => {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.write(text);
  res.end();
};

export const endResponseWith404 = (res: Response, text: string = 'Not found') => {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.write(text);
  res.end();
};

export const endResponseWithImage = (res: Response, photo?: Image) => {
  if (!photo) return endResponseWith404(res, 'Cannot find requested image');

  res.writeHead(200, { 'Content-Type': photo.contentType });
  res.write(photo.buffer);
  res.end();
};

export const endResponseWithJson = (res: Response, json: GenericObject, status: number = 200) => {
  res.status(status).send(json);
};

const DATE_PARAM_FORMAT = 'DD.MM.YYYY HH:mm';

export const extractDateTimeRangeParams = (
  req: Request,
  logger: ILogger,
  methodName: string,
  defaultDiff: number,
): Required<DateRange> => {
  let dtFrom = moment(req.body.dateTimeFrom || req.query.dateTimeFrom, DATE_PARAM_FORMAT),
    dtTill = moment(req.body.dateTimeTill || req.query.dateTimeTill, DATE_PARAM_FORMAT);

  if (!dtFrom.isValid()) {
    logger.error(format('[%s]: invalid dateTimeFrom parameter, using defaults', methodName));
    dtFrom = moment().subtract(defaultDiff, 'milliseconds');
  }

  if (!dtTill.isValid()) {
    logger.error(format('[%s]: invalid dateTimeTill parameter, using defaults', methodName));
    dtTill = moment();
  }

  dtTill.seconds(59);

  logger.verbose(
    format(
      '[%s]: datetime range is "%s" - "%s"',
      methodName,
      dtFrom.format(DATE_PARAM_FORMAT),
      dtTill.format(DATE_PARAM_FORMAT),
    ),
  );

  return {
    from: dtFrom.toDate(),
    till: dtTill.toDate(),
  };
};

export function getParamByName(req: Request, name: string): string | undefined {
  return Array.isArray(req.params) ? undefined : req.params[name];
}

export const getRemoteAddress = (req: Request): string | undefined => {
  let remoteAddress = req.connection.remoteAddress;
  if (req.headers && req.headers['x-real-ip'] && _.isString(req.headers['x-real-ip'])) {
    remoteAddress = req.headers['x-real-ip'];
  }

  return remoteAddress;
};

export const tryGetUser = (req: Request): IUser | null => {
  return req.isAuthenticated() ? (req.user as IUser) : null;
};

export const getUser = (req: Request): IUser => {
  const u = tryGetUser(req);
  if (!u) throw new HttpErrors.Forbidden('Требуется вход в систему');

  return u;
};

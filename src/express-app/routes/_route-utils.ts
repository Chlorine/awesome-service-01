import { OutgoingHttpHeaders } from 'http';

import * as _ from 'lodash';
import * as moment from 'moment';

import { NextFunction, Request, Response } from 'express';
import { GenericObject } from '../../interfaces/common-front';

import { DateRange, ILogger, Image } from '../../interfaces/common';
import { Utils } from '../../utils/utils';
import { format } from 'util';
import { ElapsedTime } from '../../utils/elapsed-time';

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

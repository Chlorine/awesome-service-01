import { Router, Request, Response, NextFunction } from 'express';
import * as HttpErrors from 'http-errors';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import * as passport from 'passport';
import * as _ from 'lodash';
import * as Formidable from 'formidable';
import * as fs from 'fs';

import { API, IApiRequest, makeUserInfoStr } from '../../api/index';
import { GenericObject } from '../../interfaces/common-front';

import CONFIG from '../../../config';

import {
  CheckAuthResponse,
  LoginResponse,
  WebUISettings,
} from '../../interfaces/common-front/users';

import {
  endResponseWithJson,
  endResponseWithString,
  getRemoteAddress,
  getUser,
  tryGetUser,
} from './_route-utils';
import { JsonValidator } from '../../utils/json-validator';

import { IUser } from '../../services/users/models/user';
import { UploadParamsBase } from '../../interfaces/common-front/index';
import { LogHelper } from '../../utils/logger';

const _firstValidator = JsonValidator.createFromSchemeFile('./src/json-schemes/api-request.json');
const _uploadValidator = JsonValidator.createFromSchemeFile('./src/json-schemes/upload.json');

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
    remoteAddress: getRemoteAddress(req),
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

  const _removeFiles = (files: string[]) => {
    files.forEach(f =>
      fs.unlink(f, err => {
        if (err) logger.warn(`[_removeFiles]: Cannot remote file '${f}' (${err})`);
        // else logger.silly(`[_removeFiles]: file '${f}' removed`);
      }),
    );
  };

  const r = Router()
    .use(cors({ origin: true, credentials: true }))
    .use(bodyParser.json({ limit: '1mb' }))

    .post('/login', (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate('local', (err: Error, user: IUser, info: any) => {
        if (err) return next(err);
        if (!user) {
          return next(
            new HttpErrors.Unauthorized(info && info.message ? info.message : 'Неверный пароль'),
          );
        }

        req.logIn(user, err => {
          if (err) return next(err);

          logger.info(`[LOGIN]: User '${user.email}' (${getRemoteAddress(req)}) is logged in`);

          // как бы про "remember me" чекбокс
          // console.log(req.session);
          // @ts-ignore
          // req.session.cookie.maxAge = null; // какая-то в общем фигня, браузеру почти пофигу

          const response: LoginResponse = {
            user: user.asUserInfo(),
            uiSettings: prepareUISettings(),
          };

          return res.send(API.makeResults(response));
        });
      })(req, res, next);
    })

    .post('/check-auth', (req, res) => {
      if (!req.isAuthenticated()) {
        return endResponseWithJson(
          res,
          API.makeResults(new HttpErrors.Unauthorized('Требуется выполнить вход')),
          401,
        );
      }

      logger.info(
        `[CHECK-AUTH]: User '${getUser(req).email}' (${getRemoteAddress(req)}) is authenticated`,
      );

      const results: CheckAuthResponse = {
        user: (req.user as IUser).asUserInfo(),
        uiSettings: prepareUISettings(),
      };

      res.send(API.makeResults(results));
    })

    .get('/logout', (req, res) => {
      const u = tryGetUser(req);
      if (u) {
        logger.info(`[LOGOUT]: User '${u.email}' (${getRemoteAddress(req)}) is logging out`);
      }

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
    })

    // как бы центральный уплоад

    .post('/upload', (req: Request, res: Response, next: NextFunction) => {
      const lh = new LogHelper(logger, 'upload', 'info');
      const user = getUser(req);

      if (!req.is('multipart/*')) {
        throw new HttpErrors.BadRequest(`Expecting multipart/form-data content type`);
      }

      const userInfo = makeUserInfoStr(user, getRemoteAddress(req));
      lh.write(`${userInfo} is trying to upload data (${req.header('content-length')} byte(s))`);

      // парсим форму

      const f = new Formidable.IncomingForm();

      f.keepExtensions = true;
      f.maxFileSize = CONFIG.uploads.maxFileSizeInBytes;

      // после обработки неплохо было бы стереть временное файло из temp

      const tempFilesToRemove: string[] = [];

      // обнаружилось неприятное:
      // если херакнуть постманом запрос например с 2 файлами, не указав для них file-field-name
      // (или указав одинаковое)
      // то в коллбэке от f.parse у аргумента files будет только 1 key (как будто один файл всего пришел)
      // но в temp лягут 2 файла. Поэтому для зачистки имена зацепим раньше:

      f.on('fileBegin', (filename: string, file: Formidable.File) => {
        tempFilesToRemove.push(file.path);
        f.emit('data', { name: 'fileBegin', filename, value: file });
      });

      f.parse(req, (err: any, fields: Formidable.Fields, files: Formidable.Files) => {
        let error: Error | undefined;

        if (err) {
          error = new HttpErrors.BadRequest(err.message);
        } else {
          const valErrText = _uploadValidator.tryValidate(fields); // is UploadParamsBase
          if (valErrText) {
            error = new HttpErrors.BadRequest(`Некорректный запрос (${valErrText})`);
          } else if (!files || Object.keys(files).length === 0) {
            error = new HttpErrors.BadRequest(`Нет файлов`);
          }
        }

        if (error) {
          _removeFiles(tempFilesToRemove);
          next(error);
        } else {
          const firstFilePath = Object.values(files)[0].path;

          api
            .processUploadedFile(
              {
                objectId: fields.objectId.toString(),
                type: fields.type.toString() as UploadParamsBase['type'],
                user,
                remoteAddress: getRemoteAddress(req),
              },
              firstFilePath,
            )
            .then(results => {
              endResponseWithJson(res, API.makeResults(results));
            })
            .catch(next)
            .then(() => _removeFiles(tempFilesToRemove));
        }
      });
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
    const statusCode = statusCodeFromError(err);
    logger.error(`[OnError]: ${statusCode}`, err);
    endResponseWithJson(res, API.makeResults(err), statusCode);
  });

  return r;
};

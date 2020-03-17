import { EventEmitter } from 'events';
import { MongoClient, Db as MongoDatabase, Collection } from 'mongodb';
import * as IORedis from 'ioredis';
import * as https from 'https';

import { getLogger, LogHelper } from '../utils/logger';

import CONFIG from './../../config';

import { SuggestionsCacheRecord } from './objects';
import { Utils } from '../utils/utils';
import { ElapsedTime } from '../utils/elapsed-time';
import {
  DaDataApi,
  DaDataFio,
  DaDataFioRequest,
  DaDataFioSuggestion,
  DaDataGender,
  DaDataNamePart,
  DaDataRequestBase,
  DaDataSuggestion,
  DaDataSuggestionsSource,
  SuggestionsResponse,
} from '../interfaces/common-dadata';
import { FioSuggestions } from './fio-suggestions';

export class DaData extends EventEmitter {
  logger = getLogger('DaData');

  redisClient = new IORedis({ ...CONFIG.redis, db: CONFIG.daData.redisDb });
  mongoClient: MongoClient;
  mdb: MongoDatabase;

  fio: FioSuggestions;

  constructor(mongoClient: MongoClient) {
    super();

    this.mongoClient = mongoClient;
    this.mdb = this.mongoClient.db('dadata-cache');

    this.fio = new FioSuggestions(this, this.logger.createChild('Fio'));
  }

  async init() {
    const lh = new LogHelper(this, 'init');

    await this.redisClient.connect();
    lh.write('redis connected');

    lh.onSuccess();
  }

  async getFromDaData<P extends DaDataRequestBase, T>(
    api: DaDataApi,
    params: P,
  ): Promise<DaDataSuggestion<T>[]> {
    // TODO: collect stats

    const lh = new LogHelper(this, `getFromDaData('${api}')`);

    const options = {
      method: 'POST',
      hostname: 'suggestions.dadata.ru',
      path: `/suggestions/api/4_1/rs/suggest/${api}`,
      port: 443,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Token ${CONFIG.daData.apiKey}`,
      },
    };

    const { error, results } = await Utils.safeCall(
      new Promise<DaDataSuggestion<T>[]>((resolve, reject) => {
        const req = https.request(options, res => {
          let result = '';

          if (res.statusCode !== 200) {
            return reject(
              new Error(`Http error: status code ${res.statusCode} (${res.statusMessage})`),
            );
          }

          res.on('data', chunk => {
            result += chunk;
          });

          res.on('end', () => {
            let json: any;

            try {
              json = JSON.parse(result);
            } catch (err) {
              return reject(new Error(`Failed to parse response (${err.message})`));
            }

            if (!json.suggestions || !Array.isArray(json.suggestions)) {
              return reject(new Error('Cannot find suggestions array in response'));
            }

            resolve(json.suggestions);
          });
        });

        req.on('error', reject);
        req.write(JSON.stringify(params));
        req.end();
      }),
    );

    if (error) {
      lh.onError(new Error(error.message), { noStack: true });

      throw error;
    }

    return results!;
  }
}

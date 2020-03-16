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
  DaDataFio,
  DaDataFioRequest,
  DaDataFioSuggestion,
  DaDataGender,
  DaDataNamePart,
  DaDataSuggestionsSource,
  SuggestionsResponse,
} from '../interfaces/common-dadata';

export class DaData extends EventEmitter {
  logger = getLogger('DaData');

  redisClient = new IORedis({ ...CONFIG.redis, db: CONFIG.daDataRedisDb });
  mongoClient: MongoClient;
  mdb: MongoDatabase;

  constructor(mongoClient: MongoClient) {
    super();

    this.mongoClient = mongoClient;
    this.mdb = this.mongoClient.db('dadata-cache');
  }

  async init() {
    const lh = new LogHelper(this, 'init');

    await this.redisClient.connect();
    lh.write('redis connected');

    lh.onSuccess();
  }

  private async getFromDaData(params: DaDataFioRequest): Promise<DaDataFioSuggestion[]> {
    // TODO: collect stats

    const lh = new LogHelper(this, 'getFromDaData');
    const et = new ElapsedTime();

    // console.log(JSON.stringify(params));

    const options = {
      method: 'POST',
      hostname: 'suggestions.dadata.ru',
      path: `/suggestions/api/4_1/rs/suggest/fio`,
      port: 443,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Token ${CONFIG.daDataApiKey}`,
      },
    };

    const getRes = await Utils.safeCall(
      new Promise<DaDataFioSuggestion[]>((resolve, reject) => {
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

    if (getRes.error || !getRes.results) {
      lh.write(`Http request failed (${getRes.error}) in ${et.getDiffStr()}`, 'error');
    } else {
      // lh.write(`Received ${getRes.results.length} suggestion(s) in ${et.getDiffStr()}`);
      et.reset();

      try {
        const q = params.query.toLowerCase();

        await this.getCollection(params.parts[0], params.gender).updateOne(
          { q },
          {
            $set: {
              q,
              hitCount: 1,
              timestamp: new Date().getTime(),
              data: getRes.results,
            },
          },
          { upsert: true },
        );
        // lh.write(`Suggestion(s) saved in ${et.getDiffStr()}`);

        await this.redisClient.set(DaData.makeRedisKey(params), JSON.stringify(getRes.results));
      } catch (err) {
        lh.write(`Cannot save suggestions (${err})`, 'error');
      }
    }

    return getRes.results || [];
  }

  private getCollection(namePart: DaDataNamePart, gender: DaDataGender) {
    let collName = `${namePart}-${gender}`;
    collName = collName.toLowerCase();

    return this.mdb.collection<SuggestionsCacheRecord>(collName);
  }

  private static makeRedisKey(params: DaDataFioRequest): string {
    const { query, gender, parts } = params;

    let keyName = `${parts[0]}-${gender}-${query}`;

    return keyName.toLowerCase();
  }

  private async getFromRedis(params: DaDataFioRequest): Promise<DaDataFioSuggestion[] | null> {
    // TODO: collect stats
    const value = await this.redisClient.get(DaData.makeRedisKey(params));

    return value ? JSON.parse(value) : null;
  }

  private async getFromMongo(params: DaDataFioRequest): Promise<DaDataFioSuggestion[] | null> {
    // TODO: collect stats
    const query = params.query.toLowerCase();

    const findAndUpdRes = await this.getCollection(params.parts[0], params.gender).findOneAndUpdate(
      {
        q: query,
      },
      { $inc: { hitCount: 1 } },
    );

    const { value: record } = findAndUpdRes;

    if (!record) {
      return null;
    }

    await this.redisClient.set(DaData.makeRedisKey(params), JSON.stringify(record.data));

    return record.data;
  }

  async getFioSuggestions(params: DaDataFioRequest): Promise<SuggestionsResponse<DaDataFio>> {
    const et = new ElapsedTime();
    let source: DaDataSuggestionsSource | undefined;
    let suggestions: DaDataFioSuggestion[] | null = null;

    suggestions = await this.getFromRedis(params);
    if (suggestions) {
      source = 'backend-cache';
    } else {
      suggestions = await this.getFromMongo(params);
      if (suggestions) {
        source = 'backend-db';
      } else {
        suggestions = await this.getFromDaData({ ...params, count: 20 });
        source = 'dadata';
      }
    }

    const res: SuggestionsResponse<DaDataFio> = {
      stats: {
        et: et.getDiff(),
        src: source,
      },
      suggestions,
    };

    // this.logger.debug(
    //   `[getFioSuggestions]: ${res.suggestions.length} from '${
    //     res.stats!.src
    //   }' in ${et.getDiffStr()}`,
    // );

    return res;
  }
}

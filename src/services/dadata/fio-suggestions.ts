import { DaData } from './index';

import { ILogger } from '../../interfaces/common';

import {
  DaDataFio,
  DaDataFioRequest,
  DaDataFioSuggestion,
  DaDataSuggestionsSource,
  SuggestionsResponse,
} from '../../interfaces/common-front/dadata';

import CONFIG from './../../../config';

import { ElapsedTime } from '../../utils/elapsed-time';

export type SuggestionsCacheRecord = {
  q: string;
  timestamp: number;
  hitCount: number;
  data: DaDataFioSuggestion[];
};

export const makeFioRedisKey = (params: DaDataFioRequest): string => {
  const { query, gender, parts } = params;

  let keyName = `${parts[0]}-${gender}-${query}`;

  return keyName.toLowerCase();
};

export class FioSuggestions {
  constructor(private daData: DaData, public logger: ILogger) {}

  async getSuggestions(params: DaDataFioRequest): Promise<SuggestionsResponse<DaDataFio>> {
    const et = new ElapsedTime();
    let source: DaDataSuggestionsSource | undefined;
    let suggestions: DaDataFioSuggestion[] | null;

    suggestions = await this.loadFromRedis(params);
    if (suggestions) {
      source = 'backend-cache';
    } else {
      suggestions = await this.loadFromMongo(params);
      if (suggestions) {
        source = 'backend-db';
      } else {
        try {
          suggestions = await this.daData.getFromDaData('fio', { ...params, count: 20 });
          await this.saveToMongo(params, suggestions);
        } catch (err) {
          suggestions = [];
        }
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

    // const { query, gender, parts } = params;
    //
    // this.logger.debug(
    //   `[getSuggestions(${parts[0]}|${gender}|'${query}')]: ${res.suggestions.length} from '${
    //     res.stats!.src
    //   }' in ${et.getDiffStr()}`,
    // );

    return res;
  }

  private async loadFromRedis(params: DaDataFioRequest): Promise<DaDataFioSuggestion[] | null> {
    let suggestions: DaDataFioSuggestion[] | null = null;

    try {
      const value = await this.daData.redisClient.get(makeFioRedisKey(params));
      if (value) {
        suggestions = JSON.parse(value);
      }
    } catch (err) {
      this.logger.error(`[loadFromRedis]: ${err}`);
    }

    return suggestions;
  }

  private async saveToRedis(params: DaDataFioRequest, suggestions: DaDataFioSuggestion[]) {
    try {
      await this.daData.redisClient.setex(
        makeFioRedisKey(params),
        CONFIG.daData.redisKeyTTL,
        JSON.stringify(suggestions),
      );
    } catch (err) {
      this.logger.error(`[saveToRedis]: ${err}`);
    }
  }

  private getCollection(params: DaDataFioRequest) {
    const { parts, gender } = params;

    let collName = `dadata-cache-${parts[0]}-${gender}`;
    collName = collName.toLowerCase();

    return this.daData.mdb.collection<SuggestionsCacheRecord>(collName);
  }

  private async loadFromMongo(params: DaDataFioRequest): Promise<DaDataFioSuggestion[] | null> {
    let suggestions: DaDataFioSuggestion[] | null = null;

    const { query } = params;

    try {
      const findAndUpdRes = await this.getCollection(params).findOneAndUpdate(
        {
          q: query.toLowerCase(),
        },
        { $inc: { hitCount: 1 } },
      );

      const record: SuggestionsCacheRecord | undefined = findAndUpdRes.value;

      if (record) {
        // TODO: check record timestamp
        suggestions = record.data;
      }
    } catch (err) {
      this.logger.error(`[loadFromMongo]: ${err}`);
    }

    if (suggestions) {
      await this.saveToRedis(params, suggestions);
    }

    return suggestions;
  }

  private async saveToMongo(params: DaDataFioRequest, suggestions: DaDataFioSuggestion[]) {
    try {
      const q = params.query.toLowerCase();

      await this.getCollection(params).updateOne(
        {
          q,
        },
        {
          $set: {
            q,
            hitCount: 1,
            timestamp: new Date().getTime(),
            data: suggestions,
          },
        },
        { upsert: true },
      );

      await this.saveToRedis(params, suggestions);
    } catch (err) {
      this.logger.error(`[saveToMongo]: ${err}`);
    }
  }
}

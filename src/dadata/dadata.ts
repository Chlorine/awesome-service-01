import { EventEmitter } from 'events';
import { MongoClient, Db as MongoDatabase, Collection } from 'mongodb';
import * as https from 'https';

import { getLogger } from '../utils/logger';

import CONFIG from './../../config';
import { SuggestionsCacheRecord } from './objects';

export type DaDataNamePart = 'NAME' | 'PATRONYMIC' | 'SURNAME';
export type DaDataGender = 'MALE' | 'FEMALE' | 'UNKNOWN';

export type DaDataFioRequest = {
  query: string;
  count?: number;
  parts: DaDataNamePart[];
  gender: DaDataGender;
};

export type DaDataSuggestion<T> = {
  value: string;
  unrestricted_value: string;
  data: T;
};

export type DaDataFio = {
  /**
   * Имя
   */
  name: string | null;
  /**
   * Отчество
   */
  patronymic: string | null;
  /**
   * Фамилия
   */
  surname: string | null;
  /**
   * Пол
   *
   *   FEMALE;
   *   MALE;
   *   UNKNOWN  — не удалось однозначно определить.
   */
  gender: DaDataGender;
  /**
   * Код качества
   *
   *   0 - если все части ФИО найдены в справочниках.
   *   1 - если в ФИО есть часть не из справочника
   */
  qc: 1 | 0;
};

export type DaDataFioSuggestion = DaDataSuggestion<DaDataFio>;

export class DaData extends EventEmitter {
  logger = getLogger('DaData');

  mongoClient: MongoClient;
  mdb: MongoDatabase;

  constructor(mongoClient: MongoClient) {
    super();

    this.mongoClient = mongoClient;
    this.mdb = this.mongoClient.db('dadata-cache');
  }

  async init() {
    this.logger.info('Init complete');
  }

  private async getFromDaData(params: DaDataFioRequest): Promise<DaDataFioSuggestion[]> {
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

    return new Promise((resolve, reject) => {
      const req = https.request(options, res => {
        let result = '';

        if (res.statusCode !== 200) {
          return reject(new Error(`Http error: status code ${res.statusCode}`));
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
    });
  }

  async getSuggestions(params: DaDataFioRequest): Promise<DaDataFioSuggestion[]> {
    // console.log(JSON.stringify(params));

    let collName = `${params.parts[0]}-${params.gender}`;
    collName = collName.toLowerCase();

    const coll = this.mdb.collection<SuggestionsCacheRecord>(collName);

    return this.getFromDaData(params);
  }
}

import * as path from 'path';
import * as fs from 'fs';
import * as _ from 'lodash';
import { createHash } from 'crypto';

// tslint:disable:no-var-requires
const mkdirp = require('mkdirp');

import CONFIG from './../../config';
import { GenericObject } from '../interfaces/common-front/index';

/**
 * Общеупотребительное
 */

export const id2log = (id: number | null): string => {
  return id === null ? 'null' : `#${id}`;
};

export const str2log = (str: string | null): string => {
  return str === null ? 'null' : `'${str}'`;
};

export class Utils {
  /**
   * Обычный разбор json. В случае ошибки генерируется чуть более ясное сообщение
   * @param data
   * @param dataDescription
   */
  static parseJson(data: string, dataDescription: string): any {
    let json;
    try {
      json = JSON.parse(data);
    } catch (err) {
      throw new Error(`Cannot parse json in '${dataDescription}' (${err})`);
    }

    return json;
  }

  /**
   * Притормаживалка
   * @param ms
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  static pickProps<S, P extends keyof S, C extends Pick<S, Extract<keyof S, P>>>(
    source: S,
    props: P[],
  ): C {
    let clone: any = {};

    Object.keys(source).forEach(propName => {
      if (props.includes(<P>propName)) {
        let p = <P>propName;
        clone[p] = source[p];
      }
    });

    return clone;
  }

  // /**
  //  * experimental: создать объект типа E из некоторого объекта src
  //  * @param src
  //  * @param propNamesToPick
  //  */
  // static pickProps<E, EN extends keyof E>(src: any, propNamesToPick: EN[]): E {
  //   return _.pick(src, propNamesToPick) as E;
  // }

  /**
   * is nVal an integer value
   * @param nVal
   */
  static isInteger(nVal: any): boolean {
    return (
      typeof nVal === 'number' &&
      isFinite(nVal) &&
      nVal > -9007199254740992 &&
      nVal < 9007199254740992 &&
      Math.floor(nVal) === nVal
    );
  }

  /**
   * Похожа ли строка на баркод?
   * @param barcode
   */
  static stringLooksLikeBarcode(barcode: any): boolean {
    // 0...9, и A...F если мифаре, а длина ну скажем от 8 до 32
    return (
      typeof barcode === 'string' &&
      /^[a-f0-9]+$/i.test(barcode) &&
      barcode.length >= 8 &&
      barcode.length <= 32
    );
  }

  /**
   * Пустая строка?
   * @param str
   */
  static isStrBlank(str: string | null): boolean {
    if (str == null) str = '';

    return /^\s*$/.test(str);
  }

  /**
   * Возвращает путь по которому можно срать файлами
   * Если его нет, создается
   * @param subFolder
   */
  static getWorkingFolder(subFolder?: string) {
    const { companyName, subFolderName } = CONFIG.workingFolderParams;

    let workingFolder = `/var/log/${subFolderName}/${CONFIG.instance.name}`;
    if (subFolder) {
      workingFolder += '/';
      workingFolder += subFolder;
    }

    if (process.platform === 'win32') {
      workingFolder = path.join(
        process.env.ALLUSERSPROFILE!,
        companyName,
        subFolderName,
        CONFIG.instance.name,
      );

      if (subFolder) {
        workingFolder = path.join(workingFolder, subFolder);
      }
    }
    mkdirp.sync(workingFolder);

    return workingFolder;
  }

  /**
   * Почти path.join но с учетом нашего странного сборщика
   * @param __dirname__ (__dirname того места откуда вызывали)
   * @param _path
   */
  static getRelativeFolderPath(__dirname__: string, _path: string) {
    let res = path.join(__dirname__, _path);
    try {
      fs.lstatSync(res);
    } catch (err) {
      res = './' + _.last(_path.split('/'));
    }

    return res;
  }

  static isValidNameComponent(xName: string | null): boolean {
    return !!xName && _.isString(xName) && !Utils.isStrBlank(xName) && xName.length > 0;
  }

  static formatShortName(
    firstName: string | null,
    middleName: string | null,
    lastName: string | null,
  ): string {
    let res = Utils.isValidNameComponent(lastName) ? _.capitalize(lastName!) : '';
    if (Utils.isValidNameComponent(firstName)) {
      res += ' ' + firstName!.charAt(0).toUpperCase() + '.';

      if (Utils.isValidNameComponent(middleName)) {
        res += ' ' + middleName!.charAt(0).toUpperCase() + '.';
      }
    }

    return res;
  }

  static truncateStr(str: string | null, maxLength: number = 32, ellipsis: string = '...') {
    if (!str || !_.isString(str)) return '';

    return _.truncate(str, { length: maxLength, omission: ellipsis });
  }

  static decapitalize(str: string | null): string {
    if (!str || !_.isString(str) || str.length < 1) return str || '';

    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  static capitalize(str: string | null): string {
    if (!str || !_.isString(str) || str.length < 1) return str || '';

    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static Formatter = {
    wordCases: [2, 0, 1, 1, 1, 2],
    wordFrom: function(count: number, word: string[]) {
      return word[
        count % 100 > 4 && count % 100 < 20 ? 2 : this.wordCases[count % 10 < 5 ? count % 10 : 5]
      ];
    },
    checkCount: function(count: number) {
      count = Utils.isInteger(count) ? count : 0;
      if (count < 0) count *= -1;

      return count;
    },
    accessorCount: function(count: number) {
      count = this.checkCount(count);
      if (0 === count) return 'Контроллеров нет';

      return count + ' ' + this.wordFrom(count, [' контроллер', 'контроллера', 'контроллеров']);
    },
    triesCount: function(count: number) {
      count = this.checkCount(count);
      if (0 === count) return '';

      return count + ' ' + this.wordFrom(count, [' попытка', 'попытки', 'попыток']);
    },
    ticketCount: function(count: number) {
      count = this.checkCount(count);
      if (0 === count) return '';

      return count + ' ' + this.wordFrom(count, [' билет', 'билета', 'билетов']);
    },
    stCount: function(count: number) {
      count = this.checkCount(count);
      if (0 === count) return '';

      return count + ' ' + this.wordFrom(count, [' абонемент', 'абонемента', 'абонементов']);
    },
    perfCount: function(count: number) {
      count = this.checkCount(count);
      if (0 === count) return '';

      return count + ' ' + this.wordFrom(count, [' мероприятие', 'мероприятия', 'мероприятий']);
    },
    codesCount: function(count: number) {
      count = this.checkCount(count);
      if (0 === count) return '';

      return count + ' ' + this.wordFrom(count, [' код', 'кода', 'кодов']);
    },
  };

  static escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&'"\0]/g, (c: string) => {
      switch (c) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case "'":
          return '&apos;';
        case '"':
          return '&quot;';
      }

      return '';
    });
  }

  static async safeCall<T>(target: Promise<T>): Promise<{ error: Error | null; results?: T }> {
    try {
      return { error: null, results: await target };
    } catch (err) {
      return { error: err };
    }
  }

  static async wrappedCall<T>(target: Promise<T>, operationDescription: string): Promise<T> {
    const res = await Utils.safeCall(target);
    if (res.error) {
      throw new Error(`Ошибка выполнения операции '${operationDescription}' (${res.error})`);
    }

    return res.results!;
  }

  static isEqualSets<T>(s1: Set<T>, s2: Set<T>): boolean {
    if (s1.size !== s2.size) return false;
    for (let key of s1) {
      if (!s2.has(key)) return false;
    }

    return true;
  }

  static md5(str: string) {
    return createHash('md5')
      .update(str)
      .digest('hex');
  }

  /**
   * Установка значения свойства модели (например при обработке опциональных параметров методов API)
   * @param entity
   * @param {PN} propName
   * @param {E[P] | undefined} value значение, которого может и не быть
   */
  static setEntityProperty<E, PN extends keyof E>(entity: E, propName: PN, value?: E[PN]) {
    if (value !== undefined) {
      entity[propName] = value;
    }
  }

  static deleteProperties<S, P extends keyof S, C = Pick<S, Exclude<keyof S, P>>>(
    source: S,
    props: P[],
  ): C {
    let clone: any = {};

    Object.keys(source).forEach(propName => {
      if (props.indexOf(<P>propName) === -1) {
        let p = <P>propName;

        clone[p] = source[p];
      }
    });

    return clone as C;
  }

  static saveProperties<S, P extends keyof S, C extends Pick<S, Extract<keyof S, P>>>(
    source: S,
    props: P[],
  ): C {
    let clone: any = {};

    Object.keys(source).forEach(propName => {
      if (props.indexOf(<P>propName) !== -1) {
        let p = <P>propName;

        clone[p] = source[p];
      }
    });

    return clone;
  }

  static stringifyApiParams(params: GenericObject): string {
    return JSON.stringify(
      _.omit(params, [
        'target',
        'action',
        '__delay',
        '__genErr',
        'password',
        'newPassword',
        'oldPassword',
      ]),
    );
  }
}

// console.log('--------: ' + Utils.Formatter.performanceCount(0));
// throw new Error('stop');

import * as AJV from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

// tslint:disable-next-line:no-var-requires
const ajvLocalize = require('ajv-i18n');

import { Utils } from './utils';
import { Dictionary } from '../interfaces/common-front';

const _ajv = AJV({ useDefaults: true });

export class JsonValidator {
  private readonly vfn!: AJV.ValidateFunction;

  constructor(scheme: any) {
    this.vfn = _ajv.compile(scheme);
  }

  static createFromSchemeFile(path: string): JsonValidator {
    try {
      return new JsonValidator(Utils.parseJson(fs.readFileSync(path).toString(), path));
    } catch (err) {
      throw new Error(`Cannot create JsonValidator instance (${err})`);
    }
  }

  validate(json: any): void {
    if (!this.vfn(json)) {
      ajvLocalize.ru(this.vfn.errors);
      throw new Error(`Ошибка валидации (${_ajv.errorsText(this.vfn.errors)})`);
    }
  }
}

export class JsonValidators {
  validators: Dictionary<JsonValidator> = {};

  constructor(directory?: string) {
    if (directory) {
      this.loadAllSchemesFrom(directory);
    }
  }

  loadAllSchemesFrom(directory: string) {
    fs.readdir(directory, (err, files) => {
      if (err) throw err;

      files
        .filter(f => f.substr(-5).toUpperCase() === '.JSON')
        .forEach(f => {
          this.validators[f.substr(0, f.length - 5)] = JsonValidator.createFromSchemeFile(
            path.join(directory, f),
          );
        });
    });
  }

  hasValidatorFor(name: string) {
    return !!this.validators[name];
  }

  validate(validatorName: string, json: any) {
    this.validators[validatorName] && this.validators[validatorName].validate(json);
  }
}

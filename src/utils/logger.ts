import * as W from 'winston';
import { format, TransformableInfo } from 'logform';
import * as DailyRotateFile from 'winston-daily-rotate-file';

import CONFIG from '../../config';
import { ILogger, LogLevel } from '../interfaces/common';
import { ElapsedTime } from './elapsed-time';
import { Utils } from './utils';

const DEFAULT_WINSTON_LOGGER_CATEGORY = 'core';

/**
 * Создать каталог куда будем писать логи
 */
function makeFolderForLogs() {
  return Utils.getWorkingFolder('logs');
}

/**
 * Форматирование записи лога
 */
const _printf = format.printf((info: TransformableInfo): string => {
  const { level, label, message, timestamp, meta, magicValue, ...args } = info;

  // зачем magicValue:
  // а) не понравилось как работает format.padLevels
  // б) после colorize длина строки level совсем другая

  const xx = '##'.padStart(9 - magicValue);

  let res = `${timestamp} ## ${level} ${xx} [${label || '_from_somewhere'}] ${message}`;

  if (meta && Array.isArray(meta) && meta.length > 0) {
    res += ' ## ';
    res += meta.join(', ');
  }

  return res;
});

/**
 * Форматирование времени для консоли
 */
const _timestamp_full = format.timestamp({ format: 'YYYY.MM.DD HH:mm:ss.SSS' });

/**
 * Форматирование времени для файла (считается что файл ежедневный или даже чаще)
 */
const _timestamp_time_only = format.timestamp({ format: 'HH:mm:ss.SSS' });

/**
 * Транспорт: консоль
 */
function createConsoleTransport() {
  return new W.transports.Console({
    level: 'silly',
    stderrLevels: [],
    handleExceptions: true,
    format: CONFIG.logs.colorize
      ? format.combine(format.colorize(), _timestamp_full, _printf)
      : format.combine(_timestamp_full, _printf),
    // format: format.combine(_timestamp_full, _printf),
  });
}

/**
 * Транспорт: ротируемый файлик
 * @param fileNameSuffix
 */
function createFileTransport(fileNameSuffix: string) {
  // https://github.com/winstonjs/winston-daily-rotate-file

  return new DailyRotateFile({
    level: CONFIG.logs.level,
    dirname: makeFolderForLogs(),
    filename: `${CONFIG.workingFolderParams.fileNamePrefix}.%DATE%.${fileNameSuffix}.log`,
    datePattern: `YYYY-MM-DD`,
    format: format.combine(_timestamp_time_only, _printf),
    handleExceptions: true,
    zippedArchive: true,
    // maxSize: '10m',
    // maxFiles: '30d',
  });
}

/**
 * Создает экземпляр объекта options для winston logger
 * @param fileNameSuffix
 */
function createLoggerOptions(fileNameSuffix: string): W.LoggerOptions {
  return {
    level: 'silly',
    exitOnError: true,
    defaultMeta: {
      // service: 'some-service',
    },
    transports: [createConsoleTransport(), createFileTransport(fileNameSuffix)],
  };
}

/**
 * Именованный логгер, перенаправляет записи в winston, выставляя label соответственно своему имени
 */
class NamedLogger implements ILogger {
  readonly name!: string;
  private readonly wLogger!: W.Logger;

  constructor(name: string, wLogger: W.Logger) {
    this.name = name;
    this.wLogger = wLogger;
  }

  log(level: LogLevel, msg: string, ...meta: any[]): void {
    const logEntry: W.LogEntry = {
      level,
      message: msg,
      label: this.name,
      magicValue: level.length, // см. _printf
    };

    if (meta[0] && meta[0].length > 0) {
      logEntry.meta = meta[0].map((entry: any) => {
        if (entry && entry instanceof Error) {
          return entry.stack;
        }

        return JSON.stringify(entry);
      });
    }

    this.wLogger.log(logEntry);
  }

  silly(msg: string, ...meta: any[]): void {
    this.log('silly', msg, meta);
  }
  debug(msg: string, ...meta: any[]): void {
    this.log('debug', msg, meta);
  }
  verbose(msg: string, ...meta: any[]): void {
    this.log('verbose', msg, meta);
  }
  info(msg: string, ...meta: any[]): void {
    this.log('info', msg, meta);
  }
  warn(msg: string, ...meta: any[]): void {
    this.log('warn', msg, meta);
  }
  error(msg: string, ...meta: any[]): void {
    this.log('error', msg, meta);
  }

  /**
   * Не является child в смысле winston'а
   * Нужен для более внятного логирования происходящего в некоторых внутренних объектах
   * @param name
   */
  createChild(name: string): ILogger {
    return new NamedLogger(`${this.name}.${name}`, this.wLogger);
  }
}

const _loggerContainer = new W.Container();

function getWinstonLogger(category: string = DEFAULT_WINSTON_LOGGER_CATEGORY) {
  if (!_loggerContainer.has(category)) {
    _loggerContainer.add(category, createLoggerOptions(category));
  }

  return _loggerContainer.get(category);
}

/**
 * Получить экземпляр именованного логгера
 * При недефолтном значении category этот экземпляр будет писать в недефолтный файл
 * @param name
 * @param category
 */
export const getLogger = (name: string, category = DEFAULT_WINSTON_LOGGER_CATEGORY): ILogger => {
  return new NamedLogger(name, getWinstonLogger(category));
};

declare type ObjectWithLogger = {
  logger: ILogger;
};

function isObjectWithLogger(obj: any): obj is ObjectWithLogger {
  return obj.logger && typeof obj.logger.silly === 'function';
}

/**
 * Вспомогательный класс-обертка для быстрого логирования (success/failure/executionTime)
 */
export class LogHelper {
  private readonly logger!: ILogger;
  private readonly level!: LogLevel;
  private methodName!: string;
  public readonly et = new ElapsedTime();

  constructor(lgr: ILogger | ObjectWithLogger, methodName: string, level: LogLevel = 'debug') {
    if (isObjectWithLogger(lgr)) {
      this.logger = lgr.logger;
    } else {
      this.logger = lgr;
    }

    this.level = level;
    this.methodName = methodName;
  }

  onStart(text?: string) {
    if (text) {
      this.logger[this.level](`[${this.methodName}]: ${text}`);
    } else {
      this.logger[this.level](`[${this.methodName}]...`);
    }
  }

  write(text: string, level?: LogLevel) {
    this.logger[level || this.level](`[${this.methodName}]: ${text}`);
  }

  onError(err: Error, params?: { noStack?: boolean }) {
    if (params && params.noStack) {
      this.logger.error(`[${this.methodName}]: FAILURE (${this.et.getDiffStr()})`, err.message);
    } else {
      this.logger.error(`[${this.methodName}]: FAILURE (${this.et.getDiffStr()})`, err);
    }
  }

  onSuccess(text?: string, ...args: any[]) {
    this.logger[this.level](
      `[${this.methodName}]: ${text || 'OK'} (${this.et.getDiffStr()})`,
      ...args,
    );
  }

  setMethodName(name: string) {
    this.methodName = name;
  }
}

export function isValidLogLevel(level: string): boolean {
  return ['silly', 'debug', 'verbose', 'info', 'warn', 'error'].includes(level);
}

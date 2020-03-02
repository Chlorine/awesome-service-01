import * as schedule from 'node-schedule';
import { EventEmitter } from 'events';

import { getLogger } from './logger';
import { ILogger } from '../interfaces/common';
import { GenericInfoEvent } from '../interfaces/common-front';

export type ScheduledJobType = 'interval' | 'cron';

/**
 * Описание "фоновой" задачи, выполняющейся по некоторому расписанию
 */
export interface IScheduledJob {
  /**
   * Название
   */
  readonly name: string;
  /**
   * Тип (интервалы или cron)
   */
  readonly type: ScheduledJobType;
  /**
   * Параметры запуска cron
   */
  readonly cronJobParamString: string;
  /**
   * Значение интервала
   */
  readonly intervalValue: number;
  /**
   * Активна ли задача
   */
  readonly isActive: boolean;
  /**
   * Выполняется ли задача в данный момент
   */
  readonly isWorking: boolean;
  /**
   * Кол-во сбоев за все время
   */
  readonly failureCount: number;
  /**
   * Кол-во выполнений задачи (всего)
   */
  readonly totalIterations: number;
  /**
   * Кол-во пропущенных
   * Будет больше нуля если cron-расписание задано так что задача не успевает выполнится
   */
  readonly skippedCount: number;
  /**
   * Время последнего вызова start
   */
  readonly startDate: Date | null;
  /**
   * Запустить на выполнение (active будет true)
   */
  start(): void;

  /**
   * Остановить (active станет false)
   * Выполняющаяся задача в момент вызова stop все-таки будет выполнена до конца
   */
  stop(): void;

  /**
   * кусочек интерфейса EventEmitter
   * @param event
   * @param listener
   */
  on(event: 'error', listener: (err: Error) => void): this;
}

/**
 * Обработчик (получает экземпляр именованного логгера от ScheduledJob)
 */
export type ScheduledJobHandler = (logger: ILogger) => Promise<any>;

/**
 * Создать выполнялку фоновых задач (раз в Икс миллисекунд)
 * Очередная итерация запускается через interval после выполнения предыдущей
 *
 * @param name название (в том числе имя для логгера)
 * @param interval интервал запуска в миллисекундах
 * @param handler обработчик
 * @param startNow запустить сразу (по умолчанию true)
 * @param runHandlerAtStart сразу же выполнить handler
 */
export function createIntervalScheduledJob(
  name: string,
  interval: number,
  handler: ScheduledJobHandler,
  startNow: boolean = true,
  runHandlerAtStart: boolean = true,
) {
  const job = new IntervalScheduledJob(name, handler, interval, runHandlerAtStart);
  if (startNow) {
    job.start();
  } else {
    job.logger.info(`Scheduled job created (PAUSED; interval ${interval} ms)`);
  }

  return job;
}

/**
 * Создать выполнялку фоновых задач (по cron-type расписанию)
 * @param name название (в том числе имя для логгера)
 * @param cronParamString параметры расписания
 * @param handler обработчик
 * @param startNow запустить сразу (по умолчанию true)
 */
export function createCronScheduledJob(
  name: string,
  cronParamString: string,
  handler: ScheduledJobHandler,
  startNow: boolean = true,
) {
  const job = new CronScheduledJob(name, handler, cronParamString);
  if (startNow) {
    job.start();
  } else {
    job.logger.info(`Scheduled job created (PAUSED; paramString: '${this.cronParam}'`);
  }

  return job;
}

/**
 * Базовый класс для фоновой задачки
 */
class ScheduledJob extends EventEmitter implements IScheduledJob {
  readonly name: string;
  readonly type: ScheduledJobType;
  protected readonly handler!: ScheduledJobHandler;
  readonly logger: ILogger;

  protected _startDate: Date | null = null;
  protected _isActive: boolean = false;
  protected _isWorking: boolean = false;
  protected _failureCount: number = 0;
  protected _totalIterations: number = 0;
  protected _skipped: number = 0;

  constructor(name: string, type: ScheduledJobType, handler: ScheduledJobHandler) {
    super();

    this.name = name;
    this.type = type;

    this.logger = getLogger(name);
    this.handler = handler;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get isWorking(): boolean {
    return this._isWorking;
  }

  get failureCount(): number {
    return this._failureCount;
  }

  get totalIterations(): number {
    return this._totalIterations;
  }

  get skippedCount(): number {
    return this._skipped;
  }

  get startDate() {
    return this._startDate;
  }

  get cronJobParamString() {
    return '';
  }

  get intervalValue() {
    return -1;
  }

  start() {
    throw new Error(`start requires overriding`);
  }

  stop() {
    throw new Error(`stop requires overriding`);
  }

  protected scheduleNextIteration() {
    // тут по умолчанию ничего
    // в реализации у IntervalScheduledJob делается новый setTimeout
  }

  /**
   * Метод вызывается по заданному расписанию и дергает предоставленный handler
   */
  protected performScheduledJob() {
    if (this._isActive) {
      if (this._isWorking) {
        this._skipped++;
        this.logger.warn(`performScheduledJob: skipping iteration (job in progress)`, {
          totalSkipped: this.skippedCount,
        });
      } else {
        this._isWorking = true;
        this._totalIterations++;
        this.handler(this.logger)
          .catch(err => {
            this._failureCount++;
            this.logger.error(`performScheduledJob: iteration failed`, err, {
              totalFailures: this.failureCount,
            });
            // и сообщаем о сбое:
            this.emit('error', err);
          })
          .then(() => {
            this._isWorking = false;
            this.scheduleNextIteration();
          });
      }
    } else {
      this.logger.warn(`performScheduledJob: ignore call (inactive state)`);
    }
  }
}

/**
 * Реализация для запуска через опред. интервалы
 */
class IntervalScheduledJob extends ScheduledJob {
  protected interval!: number;
  protected timeoutId: any = null;
  protected runHandlerAtStart: boolean;

  constructor(
    name: string,
    handler: ScheduledJobHandler,
    interval: number,
    runHandlerAtStart: boolean,
  ) {
    super(name, 'interval', handler);
    this.interval = interval;
    this.runHandlerAtStart = runHandlerAtStart;
  }

  start() {
    if (!this._isActive) {
      this._startDate = new Date();
      this.logger.info(`Scheduled job started (interval ${this.interval} ms)`);
      this._isActive = true;

      if (this.runHandlerAtStart) {
        this.performScheduledJob();
      } else {
        this.scheduleNextIteration();
      }
    }
  }

  get intervalValue() {
    return this.interval;
  }

  stop() {
    if (this._isActive) {
      this._isActive = false;

      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      this.logger.info(`Scheduled job stopped`);
    }
  }

  protected scheduleNextIteration() {
    if (this._isActive) {
      this.timeoutId = setTimeout(this.performScheduledJob.bind(this), this.interval);
    }
  }
}

/**
 * Реализация для запуска через node-schedule (cron)
 */
class CronScheduledJob extends ScheduledJob {
  readonly cronParam!: string;
  protected job: schedule.Job | undefined;

  constructor(name: string, handler: ScheduledJobHandler, param: string) {
    super(name, 'cron', handler);
    this.cronParam = param;
  }

  get cronJobParamString() {
    return this.cronParam;
  }

  start() {
    if (!this._isActive) {
      this._startDate = new Date();
      this.logger.info(`Scheduled job started (paramString: '${this.cronParam}'`);
      this.job = schedule.scheduleJob(this.cronParam, this.performScheduledJob.bind(this));
      this._isActive = true;
    }
  }

  stop() {
    if (this._isActive) {
      this._isActive = false;
      if (this.job) {
        this.job.cancel();
      }

      this.logger.info(`Scheduled job stopped`);
    }
  }
}

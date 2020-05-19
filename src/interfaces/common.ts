import 'ua-parser-js';

export interface IWorkingFolderParams {
  companyName: string;
  subFolderName: string;
  fileNamePrefix: string;
}

// алярм! посматривать в isValidLogLevel
export type LogLevel = 'silly' | 'debug' | 'verbose' | 'info' | 'warn' | 'error';
export type LogMethod = (message: string, ...meta: any[]) => void;

export interface ILogger {
  log(level: LogLevel, msg: string, ...meta: any[]): void;

  silly: LogMethod;
  debug: LogMethod;
  verbose: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;

  createChild(name: string): ILogger;
}

export type Image = {
  id?: number;
  buffer: Buffer;
  contentType: 'image/jpeg' | 'image/png';
};

export type DateRange = {
  from?: Date | null;
  till?: Date | null;
};

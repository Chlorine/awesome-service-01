import * as fs from 'fs';
import * as path from 'path';
import * as NM from 'nodemailer';
import * as NJ from 'nunjucks';
import { ObjectID } from 'mongodb';
import * as htmlToText from 'html-to-text';

import { getLogger, LogHelper } from '../../utils/logger';
import { Utils } from '../../utils/utils';

import { MailOptions, MailTemplates, MailTemplateType } from './interfaces';
import TemplateMail, { ITemplateMail } from './models/template-mail';

import { GenericObject } from '../../interfaces/common-front/index';

import CONFIG from '../../../config';
import { createIntervalScheduledJob, IScheduledJob } from '../../utils/scheduled-job';
import { ILogger } from '../../interfaces/common';

declare type NodemailerSendResult = {
  messageId?: string;
};

export class Mailer {
  config = CONFIG.mail;
  logger = getLogger('Mail');
  private readonly transport = NM.createTransport(this.config.smtp!);
  nj = new NJ.Environment(null, { autoescape: true });
  sendingJob: IScheduledJob | undefined;

  htmlToTextOpts: htmlToText.HtmlToTextOptions = {
    wordwrap: 80,
    uppercaseHeadings: true,
    format: {
      heading: (elem: any, fn: any, options: any) => {
        const h = fn(elem.children, options);

        return '### ' + h.toUpperCase() + ' ###';
      },
    },
  };

  constructor() {}

  async init() {
    const lh = new LogHelper(this, 'init');

    const verifyRes = await Utils.wrappedCall(this.transport.verify(), 'Check SMTP transport');

    if (!verifyRes) throw new Error('Negative transport verify results');

    this.sendingJob = createIntervalScheduledJob(
      'Mail.PerformSending',
      this.config.sendQueuePollInterval,
      async logger => {
        for (let tm of await TemplateMail.findPending()) {
          await this.processMailRecord(tm, logger);
        }
      },
    );

    lh.onSuccess();
  }

  private async processMailRecord(tmr: ITemplateMail, logger: ILogger) {
    const lh = new LogHelper(logger, `processMailRecord(${tmr.id})`);

    tmr.attempts++;

    const mOpts: MailOptions = {
      messageId: tmr.id,
      to: tmr.to,
    };

    // слепить

    try {
      mOpts.html = await this.getPreparedTemplate(tmr.templateName, 'html', tmr.data);
      mOpts.subject = await this.getPreparedTemplate(tmr.templateName, 'subject', tmr.data);
      mOpts.text = await this.getPreparedTemplate(tmr.templateName, 'text', tmr.data);
    } catch (err) {
      lh.write(`Failed to load or render template: ${err}`, 'error');

      tmr.status = 'failed';
      tmr.statusInfo = {
        errMsg: err.message,
      };

      try {
        await tmr.save();
      } catch (err) {
        lh.write(`Cannot save as 'failed': ${err}`, 'error');
      }

      return;
    }

    // отослать

    const { error, results } = await Utils.safeCall(this.sendMail(mOpts));

    if (error) {
      tmr.statusInfo = {
        errMsg: error.message,
      };
    } else {
      tmr.statusInfo = results!;
      tmr.status = 'sent';
    }

    try {
      await tmr.save();
    } catch (err) {
      lh.write(`Cannot save tmr: ${err}`, 'error');
    }
  }

  private async getTemplate(name: string, type: MailTemplateType): Promise<string> {
    let file: string;

    switch (type) {
      case 'html':
        file = `./templates/prepared/${name}.html`;
        break;
      case 'subject':
        file = `./templates/${name}.subject.txt`;
        break;
      case 'text':
        file = `./templates/${name}.text.txt`;
        break;
      default:
        throw new Error(`Unexpected template type '${type}'`);
    }

    const { error, results } = await Utils.safeCall(
      new Promise<string>((resolve, reject) => {
        fs.readFile(path.join(__dirname, file), (err, data) => {
          if (err) return reject(err);
          resolve(data.toString());
        });
      }),
    );

    if (error) {
      if ('text' === type) {
        return '';
      }

      throw error;
    }

    return results!;
  }

  private async getPreparedTemplate(
    name: string,
    type: MailTemplateType,
    data: GenericObject,
  ): Promise<string> {
    let res: string;

    const lh = new LogHelper(this, `renderTemplate('${name}', '${type}')`);

    // TODO: compile templates!

    try {
      res = this.nj.renderString(await this.getTemplate(name, type), data);
    } catch (err) {
      lh.onError(err);
      throw new Error('Failed to render template');
    }

    return res;
  }

  async sendTemplateMail<TN extends keyof MailTemplates>(
    options: MailOptions,
    template: TN,
    data: MailTemplates[TN],
  ): Promise<void> {
    // просто кладем в монго (какбэ в очередь)
    const lh = new LogHelper(this, `sendTemplateMail('${template}')`);

    try {
      const mail = new TemplateMail({
        templateName: template,
        to: options.to,
        data,
      });

      await mail.save();
      lh.onSuccess(`saved with messageId = ${mail.id}`);
    } catch (err) {
      lh.onError(err);
    }
  }

  async sendMail(options: MailOptions): Promise<NodemailerSendResult> {
    const lh = new LogHelper(this, 'sendMail');

    const msgId = options.messageId || 'none';
    lh.onStart(`Sending email to ${JSON.stringify(options.to)} (msgId: ${msgId})...`);

    if (!options.from) {
      options.from = {
        address: CONFIG.mail.defaultFrom,
        name: CONFIG.mail.defaultFromName,
      };
    }

    if (!options.html || !options.subject) {
      throw new Error('HTML or subject is missing');
    }

    if (!options.text) {
      try {
        options.text = htmlToText.fromString(options.html, this.htmlToTextOpts);
      } catch (err) {
        lh.write(`Error while generating plain-text body (${err})`, 'error');
      }
    }

    let sendRes: NodemailerSendResult;

    try {
      sendRes = await this.transport.sendMail(options);
      lh.write(`sendRes for msgId ${msgId}: ${JSON.stringify(sendRes)}`);
      lh.onSuccess();
    } catch (err) {
      lh.onError(err);
      throw new Error(err.message);
    }

    return sendRes;
  }

  async testSend() {
    const opts: NM.SendMailOptions = {
      from: {
        address: CONFIG.mail.defaultFrom,
        name: CONFIG.mail.defaultFromName,
      },
      to: 'sergey.khlobystov@gmail.com',
      subject: 'тест-test',
      text: 'ТЕКСТОВОЕ!',
      html: '<body><h3>БОДИ!</h3> квик браун фокс</body>',
    };

    const sendRes = await this.transport.sendMail(opts);

    this.logger.debug('sent!', sendRes);
  }
}

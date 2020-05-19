import { SendMailOptions as SMO } from 'nodemailer';

import { IUserInfo } from '../../../interfaces/common-front/users/index';
import { GenericObject } from '../../../interfaces/common-front/index';

// https://github.com/leemunroe/responsive-html-email-template

export type MailTemplates = {
  userRegistered: {
    user: IUserInfo;
    emailConfirmLink: string;
  };
  userPasswordReset: {
    user: IUserInfo;
    passwordResetLink: string;
  };
};

export type MailTemplateType = 'html' | 'subject' | 'text';

export type MailOptions = {
  from?: SMO['from'];
  to: SMO['to'];
  cc?: SMO['cc'];
  bcc?: SMO['bcc'];

  subject?: string;

  html?: string;
  text?: string;

  messageId?: SMO['messageId'];
};

import { Document, Schema, model, Model } from 'mongoose';
import { SendMailOptions as SMO } from 'nodemailer';

import { GenericObject } from '../../../interfaces/common-front/index';

import { MailTemplates } from '../interfaces/index';

export interface ITemplateMail extends Document {
  status: 'pending' | 'sent' | 'failed';
  statusInfo: GenericObject;
  templateName: keyof MailTemplates;
  to: SMO['to'];
  data: GenericObject;

  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateMailSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      required: true,
      default: 'pending',
    },
    statusInfo: {
      type: {},
      default: {},
    },
    templateName: {
      type: String,
      required: true,
    },
    to: {
      type: {},
      required: true,
    },
    data: {
      type: {},
      default: {},
    },
    attempts: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  { timestamps: true },
);

TemplateMailSchema.statics.findPending = async function(): Promise<ITemplateMail[]> {
  return this.find({ status: 'pending' });
};

export interface ITemplateMailModel extends Model<ITemplateMail> {
  findPending(): Promise<ITemplateMail[]>;
}

export default model<ITemplateMail, ITemplateMailModel>(
  'TemplateMail',
  TemplateMailSchema,
  'sent-mails',
);

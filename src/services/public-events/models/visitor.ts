import * as moment from 'moment';
import { Document, Schema, model, Model } from 'mongoose';

import {
  EventVisitorBase,
  EventVisitorInfo,
  EventVisitorSourceData,
  EventVisitorSourceType,
} from '../../../interfaces/common-front/public-events/visitor';

import { UserAgentInfo } from '../../../utils/user-agent-info';
import { IPublicEvent } from './event';

declare type IEventVisitorBase = Pick<
  EventVisitorBase,
  Exclude<keyof EventVisitorBase, 'birthday'>
>;

export interface IEventVisitor extends IEventVisitorBase, Document {
  event: IPublicEvent['_id'];
  birthday?: Date | null;

  hash: string;

  sourceType: EventVisitorSourceType;
  sourceData?: EventVisitorSourceData;

  uaInfo: UserAgentInfo | null;
  regRemoteAddress?: string;
  regSubmits: number;

  createdAt: Date;
  updatedAt: Date;

  asVisitorInfo(): EventVisitorInfo;
}

const VisitorSchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: 'PublicEvent',
      index: true,
    },

    hash: {
      type: String,
      required: true,
      unique: false, // не надо unique (один и тот же человек может сунуться на разные мероприятия)
    },

    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    middleName: { type: String, required: true },

    companyName: { type: String, required: true },
    position: { type: String, required: true },

    phone: { type: String },
    email: { type: String, index: true },

    gender: { type: String, enum: ['male', 'female'] },
    birthday: { type: Date },

    sourceType: { type: String, enum: ['fast-track', 'widget', 'external'] },
    sourceData: { type: {} },

    uaInfo: { type: {} },
    regRemoteAddress: { type: String },
    regSubmits: { type: Number, default: 1 },
  },
  { timestamps: true },
);

VisitorSchema.methods.asVisitorInfo = function(): EventVisitorInfo {
  return {
    id: this._id.toHexString(),
    eventId: this.populated('event') ? this.event.id : this.event,

    lastName: this.lastName,
    firstName: this.firstName,
    middleName: this.middleName,

    companyName: this.companyName,
    position: this.position,

    phone: this.phone,
    email: this.email,

    gender: this.gender,
    birthday: this.birthday ? moment.utc(this.birthday).format('YYYY-MM-DD') : null,
  };
};

export interface IEventVisitorModel extends Model<IEventVisitor> {}

export default model<IEventVisitor, IEventVisitorModel>(
  'EventVisitor',
  VisitorSchema,
  'public-event-visitors',
);

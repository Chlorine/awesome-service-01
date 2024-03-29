import { Document, Schema, model } from 'mongoose';
import * as moment from 'moment';
import { PaginateModel } from 'mongoose';
const mongoosePaginate = require('mongoose-paginate-v2');

import { IUser } from '../../users/models/user';
import { PublicEventInfo } from '../../../interfaces/common-front/public-events/event';
import { EventPlaceSchema, IEventPlace } from './place';
import Survey, { ISurvey, ISurveyWithQuestions } from './survey';
import { PublicEventFullInfo } from '../../../interfaces/common-front/public-events/index';
import { makeEventMediaPublicUrl } from '../index';

export interface IPublicEvent extends Document {
  user: IUser['_id'];

  name: string;
  description: string;
  place: IEventPlace;

  start: Date;
  end: Date;

  survey: ISurvey['_id'];

  createdAt: Date;
  updatedAt: Date;

  logo?: string | null;
  banner?: string | null;

  asPublicEventInfo(): PublicEventInfo;
}

const PublicEventSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    place: EventPlaceSchema,

    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },

    survey: {
      type: Schema.Types.ObjectId,
      ref: 'Survey',
      default: null,
    },

    logo: {
      type: String,
      default: null,
    },

    banner: {
      type: String,
      default: null,
    },
  },

  { timestamps: true },
);

PublicEventSchema.plugin(mongoosePaginate);

PublicEventSchema.methods.asPublicEventInfo = function(): PublicEventInfo {
  return {
    id: this._id.toHexString(),
    userId: this.populated('user') ? this.user.id : this.user,

    name: this.name,
    description: this.description,
    place: this.place.asPlaceInfo(),

    start: moment.utc(this.start).toISOString(),
    end: moment.utc(this.end).toISOString(),

    surveyId: this.survey ? (this.populated('survey') ? this.survey.id : this.survey) : null,

    logo: makeEventMediaPublicUrl(this.logo),
    banner: makeEventMediaPublicUrl(this.banner),
  };
};

PublicEventSchema.methods.asPublicEventFullInfo = function(): PublicEventFullInfo {
  const res: PublicEventFullInfo = {
    id: this._id.toHexString(),
    name: this.name,
    description: this.description,
    place: this.place.asPlaceInfo(),

    start: moment.utc(this.start).toISOString(),
    end: moment.utc(this.end).toISOString(),

    logo: makeEventMediaPublicUrl(this.logo),
    banner: makeEventMediaPublicUrl(this.banner),
  };

  if (this.survey) {
    if (typeof this.survey.asSurveyInfo !== 'function') {
      throw new Error('Внутренняя ошибка (survey not loaded)');
    }

    res.survey = this.survey.asSurveyInfo();
  }

  return res;
};

PublicEventSchema.statics.findUserEvents = async function(userId: string): Promise<IPublicEvent[]> {
  return this.find({ user: userId }, null, { sort: { start: 'asc' } });
};

PublicEventSchema.statics.findWithSurvey = async function(
  id: string,
): Promise<IPublicEventWithSurvey | null> {
  const e = await this.findById(id);
  if (!e) return null;

  if (e.survey) {
    e.survey = await Survey.findWithQuestions(e.survey);
  }

  return e;
};

/*
* Pick<
  PublicEventInfo,
  Exclude<keyof PublicEventInfo, 'userId' | 'surveyId'>
* */

export interface IPublicEventWithSurvey
  extends Pick<IPublicEvent, Exclude<keyof IPublicEvent, 'survey'>> {
  survey: ISurveyWithQuestions | null;
  asPublicEventFullInfo(): PublicEventFullInfo;
}

export interface IPublicEventModel extends PaginateModel<IPublicEvent> {
  findUserEvents(userId: string): Promise<IPublicEvent[]>;
  findWithSurvey(id: string): Promise<IPublicEventWithSurvey | null>;
}

export default model<IPublicEvent, IPublicEventModel>(
  'PublicEvent',
  PublicEventSchema,
  'public-events',
);

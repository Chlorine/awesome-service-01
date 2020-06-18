import { Document, Schema, model } from 'mongoose';
import * as moment from 'moment';
import { PaginateModel } from 'mongoose';
const mongoosePaginate = require('mongoose-paginate-v2');

import { SurveyInfo } from '../../../interfaces/common-front/public-events/survey';
import { IUser } from '../../users/models/user';
import SurveyQuestion, { ISurveyQuestion } from './survey-question';

export interface ISurvey extends Document {
  user: IUser['_id'];

  name: string;
  description?: string;

  createdAt: Date;
  updatedAt: Date;

  asSurveyInfo(): SurveyInfo;
}

const SurveySchema = new Schema(
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
    },

    qChanges: { type: Number, default: 0 }, // но не в ISurvey
  },
  { timestamps: true },
);

SurveySchema.plugin(mongoosePaginate);

SurveySchema.virtual('questions', {
  ref: 'SurveyQuestion',
  localField: '_id',
  foreignField: 'survey',
});

SurveySchema.methods.asSurveyInfo = function(): SurveyInfo {
  const res: SurveyInfo = {
    id: this._id.toHexString(),
    userId: this.populated('user') ? this.user.id : this.user,
    name: this.name,
    description: this.description,
    updatedAt: moment.utc(this.updatedAt).toISOString(),
  };

  if (this.populated('questions')) {
    res.questions = (this.questions as ISurveyQuestion[]).map(q => q.asSurveyQuestionInfo());
  }

  return res;
};

SurveySchema.statics.findUserSurveys = async function(userId: string): Promise<ISurvey[]> {
  return this.find({ user: userId }).sort({ updatedAt: -1 });
};

export interface ISurveyWithQuestions extends ISurvey {
  questions: Array<ISurveyQuestion>;
}

SurveySchema.statics.findWithQuestions = async function(
  id: string,
): Promise<ISurveyWithQuestions | null> {
  const survey = await this.findById(id);
  if (!survey) {
    return null;
  }

  await survey
    .populate({
      path: 'questions',
      options: {
        sort: {
          displayOrder: 1,
        },
      },
    })
    .execPopulate();

  return survey;
};

SurveySchema.statics.onQuestionsChange = async function(surveyId: string): Promise<void> {
  await this.findOneAndUpdate({ _id: surveyId }, { $inc: { qChanges: 1 } });
};

export interface ISurveyModel extends PaginateModel<ISurvey> {
  findUserSurveys(userId: string): Promise<ISurvey[]>;
  findWithQuestions(id: string): Promise<ISurveyWithQuestions | null>;
  onQuestionsChange(surveyId: string): Promise<void>;
}

export default model<ISurvey, ISurveyModel>('Survey', SurveySchema, 'surveys');

import { Document, Schema, model, Model } from 'mongoose';
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
  },
  { timestamps: true },
);

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
  };

  if (this.populated('questions')) {
    res.questions = (this.questions as ISurveyQuestion[]).map(q => q.asSurveyQuestionInfo());
  }

  return res;
};

SurveySchema.statics.findUserSurveys = async function(userId: string): Promise<ISurvey[]> {
  return this.find({ user: userId });
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

export interface ISurveyModel extends Model<ISurvey> {
  findUserSurveys(userId: string): Promise<ISurvey[]>;
  findWithQuestions(id: string): Promise<ISurveyWithQuestions | null>;
}

export default model<ISurvey, ISurveyModel>('Survey', SurveySchema, 'surveys');

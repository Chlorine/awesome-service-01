import { Document, Schema, model, Model } from 'mongoose';
import { ISurvey } from './survey';
import { SurveyQuestionInfo } from '../../../interfaces/common-front/public-events/survey-question';

export interface ISurveyQuestion extends Document {
  survey: ISurvey['_id'];

  text: string;
  description?: string;

  answerType: SurveyQuestionInfo['answerType'];
  answerVariants: SurveyQuestionInfo['answerVariants'];

  displayOrder: number;

  createdAt: Date;
  updatedAt: Date;

  asSurveyQuestionInfo(): SurveyQuestionInfo;
}

const SurveyQuestionSchema = new Schema(
  {
    survey: {
      type: Schema.Types.ObjectId,
      ref: 'Survey',
      required: true,
      index: true,
    },

    text: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },

    answerType: {
      type: String,
      enum: ['YesNo', 'OneOf', 'SomeOf'],
    },
    answerVariants: {
      type: [String],
    },

    displayOrder: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
  },
  { timestamps: true },
);

SurveyQuestionSchema.methods.asSurveyQuestionInfo = function(): SurveyQuestionInfo {
  const res: SurveyQuestionInfo = {
    id: this._id.toHexString(),
    surveyId: this.populated('survey') ? this.survey.id : this.survey,

    text: this.text,
    description: this.description,

    answerType: this.answerType,
    answerVariants: this.answerVariants,

    displayOrder: this.displayOrder,
  };

  return res;
};

SurveyQuestionSchema.statics.findSurveyQuestions = async function(
  surveyId: string,
): Promise<ISurveyQuestion[]> {
  return this.find({ survey: surveyId });
};

export interface ISurveyQuestion_Populated extends ISurveyQuestion {
  survey: ISurvey;
}

SurveyQuestionSchema.statics.findWithSurvey = async function(
  id: string,
): Promise<ISurveyQuestion_Populated | null> {
  return this.findById(id)
    .populate('survey')
    .exec();
};

export interface ISurveyQuestionModel extends Model<ISurveyQuestion> {
  findSurveyQuestions(surveyId: string): Promise<ISurveyQuestion[]>;
  findWithSurvey(id: string): Promise<ISurveyQuestion_Populated | null>;
}

export default model<ISurveyQuestion, ISurveyQuestionModel>(
  'SurveyQuestion',
  SurveyQuestionSchema,
  'survey-questions',
);

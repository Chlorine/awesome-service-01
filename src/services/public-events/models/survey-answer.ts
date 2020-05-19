import { Document, Schema, model, Model } from 'mongoose';

import { IEventVisitor } from './visitor';
import { ISurveyQuestion } from './survey-question';
import { ISurvey } from './survey';

import { SurveyAnswerInfo } from '../../../interfaces/common-front/public-events';

export interface ISurveyAnswer extends Document {
  survey: ISurvey['_id'];
  question: ISurveyQuestion['_id'];
  visitor: IEventVisitor['_id'];

  value: boolean | string;

  asSurveyAnswerInfo(): SurveyAnswerInfo;
}

const AnswerSchema = new Schema<ISurveyAnswer>({
  survey: {
    type: Schema.Types.ObjectId,
    ref: 'Survey',
    index: true,
  },
  question: {
    type: Schema.Types.ObjectId,
    ref: 'SurveyQuestion',
    index: true,
  },
  visitor: {
    type: Schema.Types.ObjectId,
    ref: 'EventVisitor',
    index: true,
  },
  value: {
    type: Schema.Types.Mixed,
  },
});

AnswerSchema.methods.asSurveyAnswerInfo = function(): SurveyAnswerInfo {
  return {
    questionId: this.populated('question') ? this.question.id : this.question,
    value: this.value,
  };
};

export interface ISurveyAnswerModel extends Model<ISurveyAnswer> {
  findVisitorAnswers(visitorId: string, surveyId: string): Promise<ISurveyAnswer[]>;
}

AnswerSchema.statics.findVisitorAnswers = function(
  visitorId: string,
  surveyId: string,
): Promise<ISurveyAnswer[]> {
  return this.find({ visitor: visitorId, survey: surveyId });
};

export default model<ISurveyAnswer, ISurveyAnswerModel>(
  'SurveyAnswer',
  AnswerSchema,
  'survey-answers',
);

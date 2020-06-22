import { GeoPoint } from '../index';
import { PublicEventInfo } from './event';
import { SurveyInfo } from './survey';

/**
 * Место проведения мероприятия
 */
export type EventPlaceInfo = {
  /**
   * Название
   */
  name: string;
  /**
   * Адрес
   */
  address: string;
  /**
   * Координаты
   */
  location?: GeoPoint;
};

/**
 * Ответ на вопрос анкеты
 */
export type SurveyAnswerInfo = {
  questionId: string;
  value: boolean | string | string[];
};

export const ANSWER_YES = 'Да';
export const ANSWER_NO = 'Нет';

/**
 * Суммарная инфа по вариантам ответа на вопрос
 */
export type SurveyQuestionAnswersInfo = {
  questionId: string;
  chosenVariants: { [answerVariantAsKey: string]: number };
};

/**
 * Мероприятие с анкетой
 */
export type PublicEventFullInfo = Pick<
  PublicEventInfo,
  Exclude<keyof PublicEventInfo, 'userId' | 'surveyId'>
> & {
  survey?: SurveyInfo;
};

/**
 * Иллюстративная сводка по публичным мероприятиям пользователя (для Dashboard)
 */
export type SummaryEventsInfo = {
  eventCount: number;
  actualEventCount: number;
  totalVisitors: number;
};

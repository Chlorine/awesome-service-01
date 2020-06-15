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

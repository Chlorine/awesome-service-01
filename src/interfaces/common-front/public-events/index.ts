import { GeoPoint } from '../index';
import { EventVisitorBase } from './visitor';
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

export type BasicVisitorInfo = {
  lastName: string;
  firstName: string;
  middleName: string;
  companyName: string;
  position: string;
  phone: string;
  email: string;
};

/**
 * Ответ на вопрос анкеты
 */
export type SurveyAnswerInfo = {
  questionId: string;
  value: boolean | string;
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

/**
 * Посетители публичных мероприятий
 */
import { SurveyAnswerInfo } from './index';

export type EventVisitorBase = {
  lastName: string;
  firstName: string;
  middleName?: string;

  companyName: string;
  position: string;

  phone: string;
  email: string;

  // extra
  gender?: 'male' | 'female' | null;
  birthday?: string | null;
};

export type EventVisitorSourceType = 'fast-track' | 'widget' | 'external';
export type EventVisitorSourceData = any;

export type EventVisitorInfo = {
  id: string;
  eventId: string;

  sourceType?: EventVisitorSourceType;
  sourceData?: EventVisitorSourceData;
} & EventVisitorBase;

export type RegisterEventVisitorParams = {
  eventId: string;
  visitor: EventVisitorBase;

  surveyAnswers?: SurveyAnswerInfo[];

  sourceType: EventVisitorSourceType;
  sourceData?: EventVisitorSourceData;
};

export type ModifyEventVisitorParams = { id: string } & Partial<EventVisitorBase>;

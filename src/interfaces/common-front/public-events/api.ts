import { CreateEventParams, PublicEventInfo, UpdateEventParams } from './event';
import { CreateSurveyParams, SurveyInfo, UpdateSurveyParams } from './survey';

import {
  CreateSurveyQuestionParams,
  SurveyQuestionInfo,
  UpdateSurveyQuestionParams,
} from './survey-question';

import { RegisterEventVisitorParams, EventVisitorInfo, EventVisitorFullInfo } from './visitor';
import {
  PublicEventFullInfo,
  SummaryEventsInfo,
  SurveyAnswerInfo,
  SurveyQuestionAnswersInfo,
} from './index';
import { PaginationOptionsBase, PaginationResults } from '../index';

export type ApiActions = {
  /**
   * Создание нового публичного мероприятия
   * Auth: user
   */
  createEvent: {
    params: CreateEventParams;
    results: {
      event: PublicEventInfo;
    };
  };
  /**
   * Изменение публичного мероприятия
   * Auth: user
   */
  updateEvent: {
    params: UpdateEventParams;
    results: {
      event: PublicEventInfo;
    };
  };
  /**
   * Получить мероприятия пользователя
   * Auth: user
   */
  getEvents: {
    params: {
      userId?: string;
      fromArchive?: boolean;
    } & PaginationOptionsBase;
    results: {
      events: PublicEventInfo[];
    } & PaginationResults;
  };
  /**
   * Получить мероприятие по ID
   * Auth: user
   */
  getEvent: {
    params: {
      id: string;
    };
    results: {
      event: PublicEventInfo;
    };
  };
  /**
   * Получить полную инфу по мероприятию (с анкетой) по ID
   * (для виджета или fast-track SPA)
   *
   * Auth: not required
   */
  getEventFullInfo: {
    params: {
      id: string;
    };
    results: {
      event: PublicEventFullInfo;
    };
  };

  /**
   * Создать анкету для посетителей события
   * Auth: user
   */
  createSurvey: {
    params: CreateSurveyParams;
    results: {
      survey: SurveyInfo;
    };
  };
  /**
   * Изменить анкету
   * Auth: user
   */
  updateSurvey: {
    params: UpdateSurveyParams;
    results: {
      survey: SurveyInfo;
    };
  };
  /**
   * Получить все анкеты
   * Auth: user
   */
  getSurveys: {
    params: {
      userId?: string;
    } & PaginationOptionsBase;
    results: {
      surveys: SurveyInfo[];
    } & PaginationResults;
  };
  /**
   * Получить анкету по ID
   * Auth: user
   */
  getSurvey: {
    params: {
      id: string;
    };
    results: {
      survey: SurveyInfo;
    };
  };
  /**
   * Создать вопрос анкеты
   * Auth: user
   */
  createSurveyQuestion: {
    params: CreateSurveyQuestionParams;
    results: {
      question: SurveyQuestionInfo;
    };
  };
  /**
   * Получить вопрос анкеты по ID
   * Auth: user
   */
  getSurveyQuestion: {
    params: {
      id: string;
    };
    results: {
      question: SurveyQuestionInfo;
    };
  };
  /**
   * Изменить вопрос анкеты
   * Auth: user
   */
  updateSurveyQuestion: {
    params: UpdateSurveyQuestionParams;
    results: {
      question: SurveyQuestionInfo;
    };
  };
  /**
   * Установить порядок сортировки вопросов в анкете
   * Auth: user
   */
  setSurveyQuestionsSortOrder: {
    params: {
      surveyId: string;
      questionIDs: string[];
    };
    results: {};
  };
  /**
   * Удаление вопроса анкеты
   * Auth: user
   */
  removeSurveyQuestion: {
    params: {
      id: string;
    };
    results: {};
  };
  /**
   * Регистрация посетителя публичного мероприятия
   * (для виджета или fast-track SPA)
   *
   * Auth: not required
   */
  registerEventVisitor: {
    params: RegisterEventVisitorParams;
    results: {
      visitor: EventVisitorInfo;
    };
  };
  /**
   * Получение иллюстративной сводки по публичным мероприятиям пользователя
   * Скорее для Dashboard чем не для Dashboard
   * Auth: user
   */
  getSummary: {
    params: {};
    results: {
      summary: SummaryEventsInfo;
    };
  };
  /**
   * Получение ссылки для fast-track регистрации
   * Auth: user
   */
  getEventFastTrackLink: {
    params: { id: string };
    results: { link: string };
  };
  /**
   * Получение html-фрагмента с кодом виджета для конкр. мероприятия
   * Auth: user
   */
  getEventWidgetFragment: {
    params: { id: string };
    results: {
      fragments: string[];
      widgetUrlBase: string;
    };
  };
  /**
   * Получить кол-во зарегистрированных посетителей
   * Auth: user
   */
  getEventVisitorCount: {
    params: { id: string };
    results: {
      count: number;
    };
  };
  /**
   * Получить зарегистрированных посетителей мероприятия
   * Auth: user
   */
  getEventVisitors: {
    params: {
      eventId: string;
      substring?: string;
      sortOrder?: 'reg-timestamp-asc' | 'reg-timestamp-desc' | 'last-name-asc' | 'last-name-desc';
    } & PaginationOptionsBase;
    results: {
      visitors: EventVisitorInfo[];
    } & PaginationResults;
  };
  /**
   * Получение данных посетителя мероприятия
   * Auth: user
   */
  getEventVisitor: {
    params: {
      id: string;
    };
    results: {
      visitor: EventVisitorFullInfo;
    };
  };
  /**
   * Получение ответов на вопрос анкеты
   * Auth: user
   */
  getSurveyQuestionAnswers: {
    params: {
      surveyId: string;
      questionId: string;
      eventId?: string;
    };
    results: {
      answersInfo: SurveyQuestionAnswersInfo;
    };
  };
  /**
   * Получение информации о мероприятиях с некоторой анкетой
   * Auth: user
   */
  getEventsBySurvey: {
    params: {
      surveyId: string;
    };
    results: {
      events: Array<Pick<PublicEventInfo, 'id' | 'name' | 'start' | 'end'>>;
    };
  };
  /**
   * Удаление картинки мероприятия (логотип, баннер)
   * Auth: user
   */
  removeEventMedia: {
    params: {
      eventId: string;
      mediaType: 'banner' | 'logo';
    };
    results: {
      event: PublicEventInfo;
    };
  };
};

export type Results<AN extends keyof ApiActions> = ApiActions[AN]['results'];
export type ResultsPromise<AN extends keyof ApiActions> = Promise<Results<AN>>;
export type Params<AN extends keyof ApiActions> = ApiActions[AN]['params'];

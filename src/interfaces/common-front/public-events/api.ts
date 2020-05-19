import { CreateEventParams, PublicEventInfo, UpdateEventParams } from './event';
import { CreateSurveyParams, SurveyInfo, UpdateSurveyParams } from './survey';

import {
  CreateSurveyQuestionParams,
  SurveyQuestionInfo,
  UpdateSurveyQuestionParams,
} from './survey-question';

import { RegisterEventVisitorParams, EventVisitorInfo } from './visitor';
import { PublicEventFullInfo } from './index';

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
    };
    results: {
      events: PublicEventInfo[];
    };
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
    };
    results: {
      surveys: SurveyInfo[];
    };
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
};

export type Results<AN extends keyof ApiActions> = ApiActions[AN]['results'];
export type ResultsPromise<AN extends keyof ApiActions> = Promise<Results<AN>>;
export type Params<AN extends keyof ApiActions> = ApiActions[AN]['params'];

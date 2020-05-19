/**
 * Всё про анкету для посетителя публичного мероприятия
 * TODO: сделать что-то типа surveys.yandex.ru
 */

import { SurveyQuestionInfo } from './survey-question';

/**
 * Анкета
 */
export type SurveyInfo = {
  /**
   * Идентификатор
   */
  id: string;
  /**
   * ID пользователя
   */
  userId: string;
  /**
   * Название
   */
  name: string;
  /**
   * Описание
   */
  description?: string;

  /**
   * Вопросы анкеты
   */
  questions?: SurveyQuestionInfo[];
};

/**
 * Параметры создания новой анкеты
 */
export type CreateSurveyParams = {
  /**
   * Название
   */
  name: string;
  /**
   * Описание
   */
  description?: string;
};

/**
 * Параметры изменения анкеты
 */
export type UpdateSurveyParams = {
  /**
   * ID анкеты
   */
  id: string;
  /**
   * Название
   */
  name?: string;
  /**
   * Описание
   */
  description?: string;
};

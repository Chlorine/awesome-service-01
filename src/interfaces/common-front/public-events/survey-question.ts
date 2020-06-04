/**
 * Вопрос анкеты
 */
export type SurveyQuestionInfo = {
  /**
   * ID
   */
  id: string;
  /**
   * ID анкеты
   */
  surveyId: string;

  /**
   * Текст вопроса
   */
  text: string;
  /**
   * Опц. пояснение
   */
  description?: string;

  /**
   * Тип ответа на вопрос
   *
   * !!! АЛЯРМ !!!
   * 1) QuestionSchema.answerType.enum
   * 2) json-schemes enum
   */
  answerType: 'YesNo' | 'OneOf' | 'SomeOf'; // !!! QuestionSchema.answerType.enum

  /**
   * Варианты ответов, когда тип отличается от 'Boolean'
   */
  answerVariants: string[];

  /**
   * Порядковый номер при выводе в виде списка (0...)
   */
  displayOrder: number;
};

/**
 * Параметры создания вопроса анкеты
 */
export type CreateSurveyQuestionParams = {
  /**
   * ID анкеты
   */
  surveyId: string;

  text: string;
  description?: string;

  answerType: SurveyQuestionInfo['answerType'];
  answerVariants?: string[];

  // displayOrder?: SurveyQuestionInfo['displayOrder'];
};

/**
 * Параметры изменения вопроса анкеты
 */
export type UpdateSurveyQuestionParams = {
  /**
   * ID вопроса
   */
  id: string;

  text?: string;
  description?: string;

  answerType?: SurveyQuestionInfo['answerType'];
  answerVariants?: string[];

  // displayOrder?: SurveyQuestionInfo['displayOrder'];
};

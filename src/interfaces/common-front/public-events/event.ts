import { EventPlaceInfo } from './index';

/**
 * Описание некоторого публичного мероприятия (выставка, конференция, etc.)
 */
export type PublicEventInfo = {
  /**
   * Идентификатор
   */
  id: string;
  /**
   * ID пользователя
   */
  userId?: string;

  /**
   * Название
   */
  name: string;
  /**
   * Описание
   */
  description: string;
  /**
   * Место проведения
   */
  place: EventPlaceInfo;

  /**
   * Дата и время начала в формате ISO 8601 (UTC)
   */
  start: string;
  /**
   * Дата и время окончания в формате ISO 8601 (UTC)
   */
  end: string;

  /**
   * ID анкеты при регистрации посетителя
   */
  surveyId?: string | null;

  /**
   * URL картинки-логотипа
   */
  logo: string | null;

  /**
   * URL картинки-баннера
   */
  banner: string | null;
};

/**
 * Создание нового публичного мероприятия
 */
export type CreateEventParams = {
  /**
   * Название
   */
  name: PublicEventInfo['name'];
  /**
   * Описание
   */
  description: PublicEventInfo['description'];
  /**
   * Место проведения
   */
  place: PublicEventInfo['place'];

  /**
   * Дата и время начала в формате ISO 8601 (UTC)
   */
  start: PublicEventInfo['start'];
  /**
   * Дата и время окончания в формате ISO 8601 (UTC)
   */
  end: PublicEventInfo['end'];

  /**
   * ID анкеты при регистрации посетителя
   */
  surveyId?: PublicEventInfo['surveyId'];
};

/**
 * Изменение публичного мероприятия
 */
export type UpdateEventParams = {
  /**
   * ID мероприятия
   */
  id: string;
  /**
   * Название
   */
  name?: PublicEventInfo['name'];
  /**
   * Описание
   */
  description?: PublicEventInfo['description'];
  /**
   * Место проведения
   */
  place?: Partial<PublicEventInfo['place']>;

  /**
   * Дата и время начала в формате ISO 8601 (UTC)
   */
  start?: PublicEventInfo['start'];
  /**
   * Дата и время окончания в формате ISO 8601 (UTC)
   */
  end?: PublicEventInfo['end'];

  /**
   * ID анкеты при регистрации посетителя
   */
  surveyId?: PublicEventInfo['surveyId'];
};

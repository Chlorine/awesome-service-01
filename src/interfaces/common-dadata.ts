export type DaDataNamePart = 'NAME' | 'PATRONYMIC' | 'SURNAME';
export type DaDataGender = 'MALE' | 'FEMALE' | 'UNKNOWN';

export type DaDataRequestBase = {
  query: string;
};

export type DaDataApi = 'fio' | 'address';

export type DaDataFioRequest = DaDataRequestBase & {
  count?: number;
  parts: DaDataNamePart[];
  gender: DaDataGender;
};

export type DaDataSuggestion<T> = {
  value: string;
  unrestricted_value: string;
  data: T;
};

export type DaDataFio = {
  /**
   * Имя
   */
  name: string | null;
  /**
   * Отчество
   */
  patronymic: string | null;
  /**
   * Фамилия
   */
  surname: string | null;
  /**
   * Пол
   *
   *   FEMALE;
   *   MALE;
   *   UNKNOWN  — не удалось однозначно определить.
   */
  gender: DaDataGender;
  /**
   * Код качества
   *
   *   0 - если все части ФИО найдены в справочниках.
   *   1 - если в ФИО есть часть не из справочника
   */
  qc: 1 | 0;
};

export type DaDataFioSuggestion = DaDataSuggestion<DaDataFio>;

export type DaDataSuggestionsSource = 'backend-cache' | 'backend-db' | 'dadata';

export type SuggestionsResponse<T> = {
  suggestions: Array<DaDataSuggestion<T>>;
  stats?: {
    et: number;
    src: DaDataSuggestionsSource;
  };
};

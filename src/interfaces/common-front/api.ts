import { DaDataFio, DaDataFioRequest, SuggestionsResponse } from './dadata';

/**
 * "Общие" методы API системы (target === 'core')
 */
export type ApiActions = {
  /**
   * Тест #1
   */
  doSomething: {
    params: {};
    results: {
      code: number;
    };
  };
  /**
   * Тест #2
   */
  doSomethingElse: {
    params: {
      incomingToken: string;
    };
    results: {};
  };
  /**
   * Получить подсказку для ввода ФИО
   */
  getDaDataFioSuggestions: {
    params: DaDataFioRequest;
    results: SuggestionsResponse<DaDataFio>;
  };
};

export type Results<AN extends keyof ApiActions> = ApiActions[AN]['results'];
export type ResultsPromise<AN extends keyof ApiActions> = Promise<Results<AN>>;
export type Params<AN extends keyof ApiActions> = ApiActions[AN]['params'];

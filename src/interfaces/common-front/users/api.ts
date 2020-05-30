import { CheckAuthResponse, CreateUserParams, UpdateUserParams, UserInfo } from './index';

export type ApiActions = {
  /**
   * Создание нового пользователя + автологин
   * Auth: not required
   *
   */
  createUser: {
    params: CreateUserParams;
    results: CheckAuthResponse;
  };
  /**
   * Подтверждение email с помощью токена (обработка перехода по ссылке из письма) + автологин
   * Auth: not required
   */
  confirmEmail: {
    params: {
      token: string;
    };
    results: CheckAuthResponse;
  };
  /**
   * Получить данные пользователя
   * Auth: user
   */
  getProfile: {
    params: {
      id?: string;
    };
    results: {
      userInfo: UserInfo;
    };
  };
  /**
   * Обновить данные пользователя
   * Auth: user
   */
  updateProfile: {
    params: { id?: string } & UpdateUserParams;
    results: {
      userInfo: UserInfo;
    };
  };
  /**
   * Сменить пароль текущего пользователя
   * Auth: user
   */
  changePassword: {
    params: {
      oldPassword: string;
      newPassword: string;
    };
    results: {};
  };
  /**
   * Отправить письмо со ссылкой на смену пароля
   * Auth: not required
   */
  requestPasswordReset: {
    params: {
      email: string;
    };
    results: {};
  };
  /**
   * Установить новый пароль + автологин
   * Auth: not required
   */
  resetPassword: {
    params: {
      token: string;
      password: string;
    };
    results: CheckAuthResponse;
  };
  /**
   * (Пере)послать письмо со ссылкой для подтверждения email
   * Auth: user
   */
  requestEmailConfirm: {
    params: {};
    results: {};
  };
};

export type Results<AN extends keyof ApiActions> = ApiActions[AN]['results'];
export type ResultsPromise<AN extends keyof ApiActions> = Promise<Results<AN>>;
export type Params<AN extends keyof ApiActions> = ApiActions[AN]['params'];

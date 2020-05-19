import { ICreateUserParams, IUpdateUserParams, IUserInfo } from './index';

export type ApiActions = {
  /**
   * Создание нового пользователя
   */
  createUser: {
    params: ICreateUserParams;
    results: {
      userId: string;
    };
  };
  /**
   * Подтверждение email с помощью токена (обработка перехода по ссылке из письма)
   */
  confirmEmail: {
    params: {
      token: string;
    };
    results: {};
  };
  /**
   * Получить данные пользователя
   */
  getProfile: {
    params: {
      id?: string;
    };
    results: {
      userInfo: IUserInfo;
    };
  };
  /**
   * Обновить данные пользователя
   */
  updateProfile: {
    params: { id?: string } & IUpdateUserParams;
    results: {
      userInfo: IUserInfo;
    };
  };
  /**
   * Сменить пароль текущего пользователя
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
   */
  requestPasswordReset: {
    params: {
      email: string;
    };
    results: {};
  };
  /**
   * Установить новый пароль
   */
  resetPassword: {
    params: {
      token: string;
      password: string;
    };
    results: {};
  };
  /**
   * (Пере)послать письмо со ссылкой для подтверждения email
   */
  requestEmailConfirm: {
    params: {};
    results: {};
  };
};

export type Results<AN extends keyof ApiActions> = ApiActions[AN]['results'];
export type ResultsPromise<AN extends keyof ApiActions> = Promise<Results<AN>>;
export type Params<AN extends keyof ApiActions> = ApiActions[AN]['params'];

export type UserRole = 'user' | 'admin';

export interface IUserInfo {
  id: string;
  role: UserRole;
  active: boolean;

  email: string;

  firstName: string;
  middleName: string;
  lastName: string;
}

export type WebUISettings = {
  someFlag?: boolean;
};

export type LoginResponse = { user: IUserInfo; uiSettings: WebUISettings };
export type CheckAuthResponse = LoginResponse;

export interface ICreateUserParams {
  email: string;
  password: string;

  firstName: string;
  middleName: string;
  lastName: string;
}

export interface IUpdateUserParams {
  firstName: string;
  middleName: string;
  lastName: string;
}

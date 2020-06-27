export type UserRole = 'user' | 'admin';

export type UserInfo = {
  id: string;
  role: UserRole;
  active: boolean;

  email: string;

  firstName: string;
  middleName: string;
  lastName: string;

  emailConfirmed: boolean;
  birthday: string | null;
  gender: 'male' | 'female' | null;

  avatar: string | null;
};

export type WebUISettings = {
  someFlag?: boolean;
};

export type LoginResponse = { user: UserInfo; uiSettings: WebUISettings };
export type CheckAuthResponse = LoginResponse;

export type CreateUserParams = {
  email: string;
  password: string;

  firstName: string;
  middleName: string;
  lastName: string;
};

export type UpdateUserParams = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  birthday?: string | null;
  gender?: 'male' | 'female' | null;
};

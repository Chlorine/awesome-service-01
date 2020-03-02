// Общие объявления (в том числе для фронта)

export type Dictionary<T> = {
  [id: string]: T;
};

export type GenericObject = Dictionary<any>;

export type GenericDbObject = {
  id: number;
  name: string;
  [id: string]: any;
};

export type AccessTokenType = 'unknown' | 'ticket' | 'st' | 'emp_card' | 'lc';

export type UserRole = 'visitor' | 'admin';

export interface IUser {
  username: string;
  id: string;
  role: UserRole;
}

export type WebUISettings = {
  someFlag?: boolean;
};

export type LoginResponse = { user: IUser; uiSettings: WebUISettings };
export type CheckAuthResponse = LoginResponse;

export type InfoEventType = 'info' | 'error' | 'default' | 'warning' | 'success';
export type ServerModuleName = 'core';

export type GenericInfoEvent = {
  type?: InfoEventType;
  source?: string;
  module?: ServerModuleName;
  message: string;
};

export type ServerStatsItem = {
  title?: string;
  type: string;
  value: any;
};

export type ServerStats = { [key in ServerModuleName]: ServerStatsItem[] };

export type ServerSettingsItem = {
  title: string;
  value: any;
};

export type ServerSettings = { [key in ServerModuleName]: ServerSettingsItem[] };

export type VisitorInfo = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  companyName: string;
  position: string;
};

export type WebSocketMode = 'NONE' | 'ADMIN';

export type WSMessages = {
  // from server:

  infoEvent: {
    payload: { event: GenericInfoEvent };
  };
  updateStats: {
    payload: { stats: ServerStats };
  };

  // from client:
  setMode: {
    payload: {
      mode: WebSocketMode;
    };
  };
};

export type WSMessagePayload<MN extends keyof WSMessages> = WSMessages[MN]['payload'];

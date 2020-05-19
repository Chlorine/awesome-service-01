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

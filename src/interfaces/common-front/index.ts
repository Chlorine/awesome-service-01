export type Dictionary<T> = {
  [id: string]: T;
};

export type GenericObject = Dictionary<any>;

export type ApiResults = {
  success: boolean;
  errorMsg?: string;
  cid?: string;
  [key: string]: any;
};

// todo: geoJSON
export type GeoPoint = {
  type: 'Point';
  coordinates: number[];
};

export type PaginationOptionsBase = {
  limit: number;
  offset?: number;
};

export type PaginationResults = {
  totalDocs: number;
  limit: number;
  page?: number;
  totalPages: number;
  nextPage?: number | null;
  prevPage?: number | null;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
};

export type UploadParamsBase = {
  type: 'user-avatar' | 'public-event-logo' | 'public-event-image';
  objectId: string;
};

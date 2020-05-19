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

// Общие объявления (в том числе для фронта)

export type Dictionary<T> = {
  [id: string]: T;
};

export type GenericObject = Dictionary<any>;

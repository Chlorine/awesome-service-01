import { DaDataFioRequest } from '../interfaces/common-dadata';

export const makeFioRedisKey = (params: DaDataFioRequest): string => {
  const { query, gender, parts } = params;

  let keyName = `${parts[0]}-${gender}-${query}`;

  return keyName.toLowerCase();
};

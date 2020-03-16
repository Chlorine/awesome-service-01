import { DaDataFioSuggestion } from '../interfaces/common-dadata';

export type SuggestionsCacheRecord = {
  q: string;
  timestamp: number;
  hitCount: number;
  data: DaDataFioSuggestion[];
};

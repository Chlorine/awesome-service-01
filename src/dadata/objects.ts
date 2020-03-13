import { DaDataFioSuggestion } from './dadata';

export type SuggestionsCacheRecord = {
  q: string;
  timestamp: number;
  hitCount: number;
  data: DaDataFioSuggestion[];
};

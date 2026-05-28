import { HistoryMessage } from "./history";

export interface SearchResult {
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  messages: HistoryMessage[];
}

export interface SearchQueryParams {
  keyword: string;
  limit?: number;
  offset?: number;
  chat?: string;
  timeStart?: string;
  timeEnd?: string;
  type?: string;
}

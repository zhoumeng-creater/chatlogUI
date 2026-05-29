import { HistoryMessage } from "./history";

export type SearchFilterType = "all" | "text" | "image" | "video" | "file";

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

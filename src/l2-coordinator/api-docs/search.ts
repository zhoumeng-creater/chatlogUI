import { HistoryMessage } from "./history";

export type SearchFilterType = "all" | "text" | "image" | "video" | "file";

export interface SearchResult {
  query: string;
  chats: string[];
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  querySince?: number;
  queryUntil?: number;
  queryRangeLabel?: string;
  messages: HistoryMessage[];
}

export interface SearchQueryParams {
  keyword: string;
  limit?: number;
  offset?: number;
  chat?: string;
  chats?: string[];
  time?: string;
  since?: number;
  until?: number;
  msgType?: string;
}

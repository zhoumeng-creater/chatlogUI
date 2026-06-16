export interface StatsCountByType {
  type: string;
  count: number;
}

export interface StatsCountBySender {
  sender: string;
  count: number;
  display?: string;
}

export interface StatsCountByHour {
  hour: number;
  count: number;
}

export interface StatsResponse {
  chat: string;
  username: string;
  isGroup: boolean;
  chatType: string;
  total: number;
  sentCount: number;
  receivedCount: number;
  activeSenders: number;
  activeDays: number;
  firstMessageTime: number;
  lastMessageTime: number;
  querySince?: number;
  queryUntil?: number;
  queryRangeLabel: string;
  byType: StatsCountByType[];
  topSenders: StatsCountBySender[];
  byHour: StatsCountByHour[];
}

export interface StatsQueryParams {
  chat: string;
  time?: string;
  since?: number;
  until?: number;
}

export interface TrendDataPoint {
  date: string;
  count: number;
  sentCount: number;
  receivedCount: number;
}

export interface TrendResponse {
  chat: string;
  window: string;
  windowLabel: string;
  from: number;
  to: number;
  count: number;
  truncated: boolean;
  summary: string;
  summaryError?: string;
  source: string;
  daily: Array<{ date: string; count: number }>;
  points?: TrendDataPoint[];
}

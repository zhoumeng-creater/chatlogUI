export interface StatsCountByType {
  type: string;
  count: number;
}

export interface StatsCountBySender {
  sender: string;
  count: number;
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
  firstMessageTime: string;
  lastMessageTime: string;
  querySince: string;
  queryUntil: string;
  queryRangeLabel: string;
  byType: StatsCountByType[];
  topSenders: StatsCountBySender[];
  byHour: StatsCountByHour[];
}

export interface StatsQueryParams {
  chat: string;
  timeStart?: string;
  timeEnd?: string;
}

export interface TrendDataPoint {
  date: string;
  count: number;
  sentCount: number;
  receivedCount: number;
}

export interface TrendResponse {
  chat: string;
  username: string;
  points: TrendDataPoint[];
}

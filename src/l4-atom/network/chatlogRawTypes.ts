export interface RawDbResponse {
  groups?: unknown[];
  databases?: unknown[];
  message?: string;
}

export interface RawContact {
  username: string;
  alias?: string;
  remark?: string;
  nickname?: string;
  display?: string;
  is_friend?: boolean;
}

export interface RawContactsResponse {
  count: number;
  contacts: RawContact[];
}

export interface RawSession {
  username: string;
  chat?: string;
  is_group?: boolean;
  chat_type?: string;
  summary?: string;
  timestamp?: number;
  time?: string;
}

export interface RawSessionsResponse {
  sessions: RawSession[];
}

export interface RawHealthResponse {
  status?: string;
  ok?: boolean;
}

export interface RawChatRoom {
  name: string;
  remark?: string;
  nickname?: string;
  display?: string;
  owner?: string;
  user_count?: number;
}

export interface RawChatRoomsResponse {
  count: number;
  chatrooms: RawChatRoom[];
}

export interface RawHistoryMessage {
  timestamp?: number;
  time?: string;
  sender?: string;
  type?: string;
  content?: string;
  local_id?: number;
  media_type?: string;
  media_key?: string;
  media_keys?: string[];
  media_path?: string;
  media_url?: string;
  image_key?: string;
  image_keys?: string[];
  image_path?: string;
  image_url?: string;
  chat?: string;
  username?: string;
  is_group?: boolean;
  chat_type?: string;
}

export interface RawHistoryResponse {
  chat: string;
  username?: string;
  is_group?: boolean;
  chat_type?: string;
  total_count: number;
  count: number;
  limit: number;
  offset: number;
  messages: RawHistoryMessage[];
}

export interface RawSearchResponse {
  total_count: number;
  count: number;
  limit: number;
  offset: number;
  messages: RawHistoryMessage[];
}

export interface RawStatsTopSender {
  sender: string;
  count: number;
  display?: string;
}

export interface RawStatsResponse {
  chat: string;
  username?: string;
  is_group?: boolean;
  chat_type?: string;
  total?: number;
  sent_count?: number;
  received_count?: number;
  active_senders?: number;
  active_days?: number;
  first_message_time?: number;
  last_message_time?: number;
  query_since?: number;
  query_until?: number;
  query_range_label?: string;
  by_type?: { type: string; count: number }[];
  top_senders?: RawStatsTopSender[];
  by_hour?: { hour: number; count: number }[];
}

export interface RawDashboardTrendDaily {
  date?: string;
  count?: number;
}

export interface RawDashboardTrendResponse {
  chat?: string;
  window?: string;
  window_label?: string;
  from?: number;
  to?: number;
  count?: number;
  truncated?: boolean;
  topics?: unknown[];
  topics_source?: string;
  topics_error?: string;
  mentions?: unknown[];
  daily?: RawDashboardTrendDaily[];
  summary?: string;
  summary_error?: string;
  source?: string;
}

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

export interface RawFavoriteMessage extends RawHistoryMessage {
  id?: string;
}

export interface RawFavoritesResponse {
  count?: number;
  total?: number;
  favorites?: RawFavoriteMessage[];
  messages?: RawFavoriteMessage[];
}

export interface RawMember {
  username: string;
  display?: string;
  remark?: string;
  nickname?: string;
  alias?: string;
}

export interface RawMembersResponse {
  count?: number;
  members?: RawMember[];
}

export interface RawUnreadChat {
  chat: string;
  count?: number;
  unread?: number;
}

export interface RawUnreadResponse {
  total?: number;
  count?: number;
  unread?: number;
  chats?: RawUnreadChat[];
}

export interface RawNewMessage extends RawHistoryMessage {
  id?: string;
}

export interface RawNewMessagesResponse {
  count?: number;
  total?: number;
  messages?: RawNewMessage[];
}

export interface RawSnsLocation {
  city?: string;
  latitude?: number;
  longitude?: number;
  poi_name?: string;
  poi_address?: string;
}

export interface RawSnsMediaResource {
  url?: string;
  thumb?: string;
  thumb_url?: string;
  proxy_url?: string;
  proxy_thumb_url?: string;
  resolved_url?: string;
  resolved_thumb_url?: string;
  raw_url?: string;
  raw_thumb?: string;
  token?: string;
  key?: string;
  enc_idx?: string;
}

export interface RawSnsMediaItem extends RawSnsMediaResource {
  type?: string;
  md5?: string;
  width?: number;
  height?: number;
  duration?: string;
  live_photo?: RawSnsMediaResource | null;
}

export interface RawSnsArticle {
  title?: string;
  description?: string;
  url?: string;
  cover_url?: string;
}

export interface RawSnsFinderFeed {
  nickname?: string;
  avatar?: string;
  desc?: string;
  media_count?: number;
  video_url?: string;
  cover_url?: string;
  thumb_url?: string;
  width?: number;
  height?: number;
  duration?: string;
}

export interface RawSnsPostRow {
  id?: string | number | null;
  tid?: string | number | null;
  timestamp?: number | null;
  create_time?: number | null;
  time?: string | null;
  create_time_str?: string | null;
  username?: string | null;
  user_name?: string | null;
  display?: string | null;
  nickname?: string | null;
  content?: string | null;
  content_desc?: string | null;
  raw_content?: string | null;
  xml_content?: string | null;
  content_type?: string | null;
  location?: RawSnsLocation | null;
  media_list?: RawSnsMediaItem[] | null;
  article?: RawSnsArticle | null;
  finder_feed?: RawSnsFinderFeed | null;
}

export interface RawSnsFeedResponse {
  count?: number;
  items?: RawSnsPostRow[];
}

export interface RawSnsSearchResponse {
  count?: number;
  items?: RawSnsPostRow[];
}

export interface RawSnsNotificationRow {
  type?: string | null;
  time?: string | null;
  timestamp?: number | null;
  from_username?: string | null;
  from_nickname?: string | null;
  content?: string | null;
  feed_id?: string | number | null;
  feed_author?: string | null;
  feed_author_username?: string | null;
  feed_preview?: string | null;
}

export interface RawSnsNotificationResponse {
  notifications?: RawSnsNotificationRow[];
  total?: number;
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

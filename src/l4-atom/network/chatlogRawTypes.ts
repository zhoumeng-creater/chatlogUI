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
  chat_type?: string;
  account_kind?: string;
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
  account_kind?: string;
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
  seq?: number;
  timestamp?: number;
  time?: string;
  talker?: string;
  talker_name?: string;
  sender?: string;
  sender_name?: string;
  direction?: string | number;
  is_self?: boolean | number;
  from_me?: boolean | number;
  is_from_me?: boolean | number;
  type?: string;
  sub_type?: string;
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
  file_name?: string;
  chat?: string;
  username?: string;
  is_group?: boolean;
  chat_type?: string;
  hour?: number;
  has_media?: boolean | number;
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
  query_since?: number;
  query_until?: number;
  query_range_label?: string;
  messages: RawHistoryMessage[];
}

export interface RawSearchResponse {
  query?: string;
  chats?: string[];
  total_count: number;
  count: number;
  limit: number;
  offset: number;
  query_since?: number;
  query_until?: number;
  query_range_label?: string;
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

export interface RawSemanticConfigResponse {
  enabled?: boolean;
  base_url?: string;
  ollama_base_url?: string;
  deepseek_base_url?: string;
  embedding_provider?: string;
  embedding_model?: string;
  embedding_dimension?: number;
  rerank_provider?: string;
  rerank_model?: string;
  chat_provider?: string;
  chat_model?: string;
  chat_thinking?: boolean;
  chat_max_tokens?: number;
  chat_temperature?: number;
  has_api_key?: boolean;
  has_deepseek_api_key?: boolean;
  api_key?: string;
  deepseek_api_key?: string;
  recall_k?: number;
  top_n?: number;
  similarity_threshold?: number;
  enable_rerank?: boolean;
  enable_qa?: boolean;
  enable_topics?: boolean;
  enable_profiles?: boolean;
  enable_llm_chunk?: boolean;
  realtime_index?: boolean;
  index_workers?: number;
}

export interface RawSemanticConnectionTestResponse {
  ok?: boolean;
  error?: string;
  message?: string;
  latency_ms?: number;
}

export interface RawSemanticIndexStatusResponse {
  ready?: boolean;
  running?: boolean;
  paused?: boolean;
  processed?: number;
  pending?: number;
  failed?: number;
  progress_pct?: number;
  indexed_count?: number;
  entity_count?: number;
  chunk_count?: number;
  started_at?: string;
  processing_rate_per_minute?: number;
  estimated_seconds_left?: number;
  last_incremental_at?: string;
  last_incremental_added?: number;
  last_incremental_error?: string;
  last_rerank_at?: string;
  last_rerank_applied?: boolean;
  last_rerank_error?: string;
  last_error?: string;
}

export interface RawSemanticIndexActionResponse {
  ok?: boolean;
  accepted?: boolean;
  status?: string;
  error?: string;
}

export interface RawSemanticSearchResult {
  talker?: string;
  talker_name?: string;
  chat?: string;
  chat_name?: string;
  sender?: string;
  sender_name?: string;
  time?: string | number;
  content?: string;
  snippet?: string;
  text?: string;
  score?: number;
  relevance_score?: number;
  similarity?: number;
  rerank_score?: number;
  seq?: number;
  local_id?: number;
}

export interface RawSemanticSearchResponse {
  query?: string;
  chat?: string;
  source_count?: number;
  window?: string;
  depth?: string;
  count?: number;
  total_count?: number;
  rerank?: boolean;
  rerank_enabled?: boolean;
  rerank_provider?: string;
  rerank_tried?: boolean;
  rerank_applied?: boolean;
  rerank_error?: string;
  results: RawSemanticSearchResult[];
}

export interface RawSemanticTopicRow {
  topic?: string;
  name?: string;
  count?: number;
  keywords?: string[];
}

export interface RawSemanticDailyRow {
  date?: string;
  count?: number;
}

export interface RawSemanticTopicsResponse {
  window?: string;
  window_label?: string;
  from?: number;
  to?: number;
  count?: number;
  truncated?: boolean;
  topics?: RawSemanticTopicRow[];
  daily?: RawSemanticDailyRow[];
  summary?: string;
  summary_error?: string;
}

export interface RawSemanticProfileRow {
  sender?: string;
  sender_name?: string;
  name?: string;
  messages?: number;
  top_keywords?: RawSemanticTopicRow[];
}

export interface RawSemanticTypeDistributionRow {
  type?: string;
  count?: number;
}

export interface RawSemanticProfilesResponse {
  window?: string;
  window_label?: string;
  from?: number;
  to?: number;
  count?: number;
  truncated?: boolean;
  profiles?: RawSemanticProfileRow[];
  type_distribution?: RawSemanticTypeDistributionRow[];
  summary?: string;
  summary_error?: string;
}

export interface RawSemanticIndexPreviewItem {
  kind?: string;
  id?: string;
  talker?: string;
  seq?: number;
  sender?: string;
  username?: string;
  display?: string;
  content?: string;
  model?: string;
  dim?: number;
  vector_norm?: number;
  vector_sample?: number[];
  x?: number;
  y?: number;
  z?: number;
  outlier_score?: number;
  is_outlier?: boolean;
  updated_at?: number;
}

export interface RawSemanticIndexPreviewResponse {
  model?: string;
  dim?: number;
  kind?: string;
  limit?: number;
  offset?: number;
  total?: number;
  groups?: Array<{ name?: string; count?: number }>;
  items?: RawSemanticIndexPreviewItem[];
  store_path?: string;
  sample_dims?: number;
  outliers?: RawSemanticIndexPreviewItem[];
}

export interface RawSemanticQAEvent {
  event?: "delta" | "done" | "error" | string;
  data?: {
    text?: string;
    answer?: string;
    content?: string;
    error?: string;
    evidence?: Array<Record<string, unknown>>;
    reason?: string;
    metadata?: Record<string, unknown>;
    debug?: Record<string, unknown>;
    source_count?: number;
    window?: string;
    depth?: string;
    count?: number;
    rerank_tried?: boolean;
    rerank_applied?: boolean;
    rerank_error?: string;
  };
}

export interface RawSemanticQAResponse {
  events: RawSemanticQAEvent[];
  abandoned?: boolean;
}

export interface RawGraphConfigResponse {
  workers?: number;
  enqueue_workers?: number;
  status?: {
    workers?: number;
    enqueue_workers?: number;
  };
}

export interface RawGraphStatusResponse {
  enabled?: boolean;
  paused?: boolean;
  running?: boolean;
  history_queued?: boolean;
  enqueue_running?: boolean;
  workers?: number;
  enqueue_workers?: number;
  store_path?: string;
  entity_count?: number;
  relation_count?: number;
  event_count?: number;
  fact_count?: number;
  source_count?: number;
  pending?: number;
  processing?: number;
  processed?: number;
  failed?: number;
  progress_pct?: number;
  started_at?: string;
  processing_rate_per_minute?: number;
  estimated_seconds_left?: number;
  last_updated_at?: string;
  last_error?: string;
}

export interface RawGraphNode {
  id?: string | number;
  name?: string;
  label?: string;
  kind?: string;
  type?: string;
  value?: number;
  mentions?: number;
  last_seen?: number;
}

export interface RawGraphEdge {
  id?: string | number;
  source?: string;
  target?: string;
  label?: string;
  predicate?: string;
  status?: string;
  confidence?: number;
  last_seen?: number;
  evidence_count?: number;
}

export interface RawGraphTimelineRow {
  time?: number;
  type?: string;
  title?: string;
  description?: string;
  source?: string;
  source_label?: string;
}

export interface RawGraphVisualizeResponse {
  nodes?: RawGraphNode[];
  edges?: RawGraphEdge[];
  timeline?: RawGraphTimelineRow[];
  generated_at?: number;
}

export interface RawGraphEntityRow {
  id?: string | number;
  entity_id?: string | number;
  name?: string;
  canonical_name?: string;
  type?: string;
  kind?: string;
  mentions?: number;
}

export interface RawGraphRelationRow {
  id?: string | number;
  subject?: string;
  source?: string;
  predicate?: string;
  relation?: string;
  object?: string;
  target?: string;
  status?: string;
  confidence?: number;
  support_score?: number;
  verified?: string;
  conflict_group?: string;
  valid_from?: number;
  valid_to?: number;
  evidence_count?: number;
  evidence?: string;
  evidence_text?: string;
}

export interface RawGraphEventRow {
  id?: string | number;
  title?: string;
  event_type?: string;
  type?: string;
  time?: number;
  event_time?: number;
  actors?: string[];
  targets?: string[];
  source?: string;
  source_label?: string;
  evidence_count?: number;
  evidence?: string;
}

export interface RawGraphFactRow {
  id?: string | number;
  statement?: string;
  canonical_statement?: string;
  change_type?: string;
  status?: string;
  support_score?: number;
  verified?: string;
  conflict_group?: string;
  valid_from?: number;
  valid_to?: number;
  evidence_count?: number;
  evidence?: string;
}

export interface RawGraphQueryResponse {
  entities?: RawGraphEntityRow[];
  relations?: RawGraphRelationRow[];
  events?: RawGraphEventRow[];
  facts?: RawGraphFactRow[];
}

export interface RawGraphTimelineResponse {
  count?: number;
  items?: RawGraphTimelineRow[];
}

export interface RawGraphActionResponse {
  ok?: boolean;
  accepted?: boolean;
  status?: string;
  error?: string;
  count?: number;
  ids?: Array<string | number>;
}

export interface RawGraphQAResponse {
  answer?: string;
  evidence?: Record<string, unknown>;
}

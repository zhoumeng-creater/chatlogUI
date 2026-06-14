export type ChatlogEndpointMethod = "GET" | "POST";

export interface ChatlogEndpointContract {
  path: string;
  method: ChatlogEndpointMethod;
  family: string;
  rawDto: string;
  uiModel: string;
  rawFields: string[];
  uiFields: string[];
  emptyShape: string[];
  errorShape: string[];
  paginationFields: string[];
  privacySensitiveFields: string[];
  diagnosticFamily: string;
  l4Responsibility: string;
  l2Responsibility: string;
}

export const REQUIRED_CHATLOG_ENDPOINTS = [
  ["GET", "/api/v1/sessions"],
  ["GET", "/api/v1/contacts"],
  ["GET", "/api/v1/chatrooms"],
  ["GET", "/api/v1/history"],
  ["GET", "/api/v1/search"],
  ["GET", "/api/v1/stats"],
  ["GET", "/api/v1/dashboard/trend"],
  ["GET", "/api/v1/sns_feed"],
  ["GET", "/api/v1/sns_search"],
  ["GET", "/api/v1/sns_notifications"],
  ["GET", "/api/v1/semantic/config"],
  ["POST", "/api/v1/semantic/config"],
  ["POST", "/api/v1/semantic/test"],
  ["GET", "/api/v1/semantic/index/status"],
  ["POST", "/api/v1/semantic/index/rebuild"],
  ["POST", "/api/v1/semantic/index/pause"],
  ["POST", "/api/v1/semantic/index/resume"],
  ["POST", "/api/v1/semantic/index/clear"],
  ["GET", "/api/v1/semantic/search"],
  ["GET", "/api/v1/semantic/topics"],
  ["GET", "/api/v1/semantic/profiles"],
  ["GET", "/api/v1/semantic/index/preview"],
  ["POST", "/api/v1/semantic/qa/stream"],
  ["GET", "/api/v1/graph/config"],
  ["POST", "/api/v1/graph/config"],
  ["GET", "/api/v1/graph/status"],
  ["POST", "/api/v1/graph/rebuild"],
  ["POST", "/api/v1/graph/pause"],
  ["POST", "/api/v1/graph/resume"],
  ["GET", "/api/v1/graph/query"],
  ["GET", "/api/v1/graph/visualize"],
  ["GET", "/api/v1/graph/timeline"],
  ["POST", "/api/v1/graph/ingest/business"],
  ["POST", "/api/v1/graph/ingest/event"],
  ["POST", "/api/v1/graph/qa"],
  ["GET", "/api/v1/favorites"],
  ["GET", "/api/v1/members"],
  ["GET", "/api/v1/unread"],
  ["GET", "/api/v1/new_messages"],
] as const satisfies ReadonlyArray<readonly [ChatlogEndpointMethod, string]>;

export const REQUIRED_CHATLOG_ENDPOINT_PATHS = [
  ...new Set(REQUIRED_CHATLOG_ENDPOINTS.map(([, path]) => path)),
] as ReadonlyArray<string>;

const COMMON_PRIVACY_FIELDS = [
  "dataKey",
  "api_key",
  "token",
  "content",
  "local_path",
];

export const CHATLOG_ENDPOINT_CONTRACTS: ChatlogEndpointContract[] = [
  endpoint("/api/v1/sessions", "GET", "sessions", "RawSessionsResponse", "ConversationSummary[]", {
    rawFields: ["sessions", "username", "chat", "chat_type", "summary", "timestamp", "time"],
    uiFields: ["id", "displayName", "chatType", "summary", "timestamp", "timeLabel"],
    emptyShape: ["sessions: []"],
    paginationFields: ["limit", "query"],
    privacySensitiveFields: ["summary", "username"],
  }),
  endpoint("/api/v1/contacts", "GET", "contacts", "RawContactsResponse", "Contact[]", {
    rawFields: ["count", "contacts", "username", "alias", "remark", "nickname", "is_friend"],
    uiFields: ["userName", "alias", "remark", "nickName", "isFriend"],
    emptyShape: ["count: 0", "contacts: []"],
    paginationFields: ["limit", "offset", "query", "is_friend"],
    privacySensitiveFields: ["alias", "remark", "nickname", "username"],
  }),
  endpoint("/api/v1/chatrooms", "GET", "chatrooms", "RawChatRoomsResponse", "ChatRoom[]", {
    rawFields: ["count", "chatrooms", "name", "display", "owner", "user_count"],
    uiFields: ["name", "nickName", "owner", "userCount"],
    emptyShape: ["count: 0", "chatrooms: []"],
    paginationFields: ["limit", "offset", "query"],
    privacySensitiveFields: ["name", "owner", "display"],
  }),
  endpoint("/api/v1/history", "GET", "history", "RawHistoryResponse", "HistoryResponse", {
    rawFields: ["chat", "total_count", "limit", "offset", "messages", "is_self", "sender", "media_key"],
    uiFields: ["chat", "totalCount", "messages", "isSelf", "sender", "attachments"],
    emptyShape: ["total_count: 0", "messages: []"],
    paginationFields: ["limit", "offset", "since", "until", "time", "msg_type"],
    privacySensitiveFields: ["chat", "sender", "content", "media_path", "media_key", "image_key"],
  }),
  endpoint("/api/v1/search", "GET", "search", "RawSearchResponse", "SearchResult", {
    rawFields: ["total_count", "count", "limit", "offset", "messages", "is_self", "sender"],
    uiFields: ["totalCount", "count", "messages", "isSelf", "sender"],
    emptyShape: ["total_count: 0", "messages: []"],
    paginationFields: ["limit", "offset", "chats", "since", "until", "msg_type"],
    privacySensitiveFields: ["keyword", "chat", "sender", "content"],
  }),
  endpoint("/api/v1/stats", "GET", "stats", "RawStatsResponse", "StatsResponse", {
    rawFields: ["chat", "total", "sent_count", "received_count", "active_senders", "by_type"],
    uiFields: ["chat", "total", "sentCount", "receivedCount", "activeSenders", "byType"],
    emptyShape: ["total: 0", "by_type: []", "top_senders: []"],
    paginationFields: ["time", "since", "until"],
    privacySensitiveFields: ["chat", "top_senders.sender", "top_senders.display"],
  }),
  endpoint("/api/v1/dashboard/trend", "GET", "stats", "RawDashboardTrendResponse", "TrendResponse", {
    rawFields: ["window", "from", "to", "daily", "summary", "summary_error"],
    uiFields: ["window", "from", "to", "daily", "summary", "summaryError"],
    emptyShape: ["count: 0", "daily: []"],
    paginationFields: ["window", "summary"],
    privacySensitiveFields: ["chat", "summary", "summary_error"],
  }),
  endpoint("/api/v1/sns_feed", "GET", "sns", "RawSnsFeedResponse", "SnsFeedView", snsFields()),
  endpoint("/api/v1/sns_search", "GET", "sns", "RawSnsSearchResponse", "SnsFeedView", snsFields(["keyword", "since", "until"])),
  endpoint("/api/v1/sns_notifications", "GET", "sns", "RawSnsNotificationResponse", "SnsNotificationView", {
    rawFields: ["notifications", "total", "from_username", "content", "feed_preview"],
    uiFields: ["total", "items", "actor", "content", "feedPreview"],
    emptyShape: ["total: 0", "notifications: []"],
    paginationFields: ["limit", "offset"],
    privacySensitiveFields: ["from_username", "content", "feed_preview"],
  }),
  endpoint("/api/v1/semantic/config", "GET", "semantic", "RawSemanticConfigResponse", "SemanticConfigView", semanticConfigFields()),
  endpoint("/api/v1/semantic/config", "POST", "semantic", "RawSemanticConfigResponse", "SemanticConfigView", semanticConfigFields()),
  endpoint("/api/v1/semantic/test", "POST", "semantic", "RawSemanticConnectionTestResponse", "ConnectionTestResult", semanticActionFields()),
  endpoint("/api/v1/semantic/index/status", "GET", "semantic", "RawSemanticIndexStatusResponse", "SemanticIndexStatus", semanticIndexFields()),
  endpoint("/api/v1/semantic/index/rebuild", "POST", "semantic", "RawSemanticIndexActionResponse", "SemanticIndexActionResult", semanticActionFields()),
  endpoint("/api/v1/semantic/index/pause", "POST", "semantic", "RawSemanticIndexActionResponse", "SemanticIndexActionResult", semanticActionFields()),
  endpoint("/api/v1/semantic/index/resume", "POST", "semantic", "RawSemanticIndexActionResponse", "SemanticIndexActionResult", semanticActionFields()),
  endpoint("/api/v1/semantic/index/clear", "POST", "semantic", "RawSemanticIndexActionResponse", "SemanticIndexActionResult", semanticActionFields()),
  endpoint("/api/v1/semantic/search", "GET", "semantic", "RawSemanticSearchResponse", "SemanticSearchResponse", {
    rawFields: ["query", "results", "talker", "sender", "content", "score", "rerank_error"],
    uiFields: ["query", "results", "chat", "sender", "content", "relevanceScore", "rerank"],
    emptyShape: ["count: 0", "results: []"],
    paginationFields: ["limit", "chat", "chats", "window", "source_limit", "top_n"],
    privacySensitiveFields: ["query", "talker", "sender", "content"],
  }),
  endpoint("/api/v1/semantic/topics", "GET", "semantic", "RawSemanticTopicsResponse", "TopicsResponse", semanticDiscoveryFields("topics")),
  endpoint("/api/v1/semantic/profiles", "GET", "semantic", "RawSemanticProfilesResponse", "ContactProfileData", semanticDiscoveryFields("profiles")),
  endpoint("/api/v1/semantic/index/preview", "GET", "semantic", "RawSemanticIndexPreviewResponse", "SemanticIndexPreview", {
    rawFields: ["model", "dim", "kind", "limit", "offset", "total", "items", "store_path"],
    uiFields: ["model", "dim", "kind", "limit", "offset", "total", "items"],
    emptyShape: ["total: 0", "items: []"],
    paginationFields: ["limit", "offset", "kind"],
    privacySensitiveFields: ["content", "sender", "talker", "store_path"],
  }),
  endpoint("/api/v1/semantic/qa/stream", "POST", "semantic", "RawSemanticQAResponse", "QAMessage", {
    rawFields: ["events", "answer", "evidence", "debug", "rerank_error"],
    uiFields: ["content", "evidence", "reason", "metadata", "completionStatus"],
    emptyShape: ["events: []", "answer: ''", "evidence: []"],
    paginationFields: ["source_limit", "top_n", "window"],
    privacySensitiveFields: ["query", "history", "answer", "evidence.content", "debug.prompt"],
  }),
  endpoint("/api/v1/graph/config", "GET", "graph", "RawGraphConfigResponse", "GraphConfig", graphConfigFields()),
  endpoint("/api/v1/graph/config", "POST", "graph", "RawGraphConfigResponse", "GraphConfig", graphConfigFields()),
  endpoint("/api/v1/graph/status", "GET", "graph", "RawGraphStatusResponse", "GraphStatusView", graphStatusFields()),
  endpoint("/api/v1/graph/rebuild", "POST", "graph", "RawGraphActionResponse", "GraphActionResult", graphActionFields()),
  endpoint("/api/v1/graph/pause", "POST", "graph", "RawGraphActionResponse", "GraphActionResult", graphActionFields()),
  endpoint("/api/v1/graph/resume", "POST", "graph", "RawGraphActionResponse", "GraphActionResult", graphActionFields()),
  endpoint("/api/v1/graph/query", "GET", "graph", "RawGraphQueryResponse", "GraphQueryView", graphQueryFields()),
  endpoint("/api/v1/graph/visualize", "GET", "graph", "RawGraphVisualizeResponse", "GraphVisualizeView", {
    rawFields: ["nodes", "edges", "timeline", "generated_at"],
    uiFields: ["state", "nodes", "edges", "timelineRows", "summary"],
    emptyShape: ["nodes: []", "edges: []", "timeline: []"],
    paginationFields: ["keyword", "window", "limit", "start", "end"],
    privacySensitiveFields: ["name", "label", "description", "source"],
  }),
  endpoint("/api/v1/graph/timeline", "GET", "graph", "RawGraphTimelineResponse", "GraphTimelineView", {
    rawFields: ["count", "items", "time", "type", "title", "description", "source"],
    uiFields: ["count", "rows", "time", "title", "description", "source"],
    emptyShape: ["count: 0", "items: []"],
    paginationFields: ["start", "end", "limit"],
    privacySensitiveFields: ["title", "description", "source"],
  }),
  endpoint("/api/v1/graph/ingest/business", "POST", "graph", "RawGraphActionResponse", "GraphActionResult", graphActionFields()),
  endpoint("/api/v1/graph/ingest/event", "POST", "graph", "RawGraphActionResponse", "GraphActionResult", graphActionFields()),
  endpoint("/api/v1/graph/qa", "POST", "graph", "RawGraphQAResponse", "GraphQAView", {
    rawFields: ["answer", "evidence", "entities", "events"],
    uiFields: ["answer", "evidence", "metadata"],
    emptyShape: ["answer: ''", "evidence: {}"],
    paginationFields: ["window", "limit"],
    privacySensitiveFields: ["question", "answer", "evidence", "content"],
  }),
  endpoint("/api/v1/favorites", "GET", "chat_extensions", "RawFavoritesResponse", "FavoritesView", {
    rawFields: ["count", "favorites", "messages", "media_key"],
    uiFields: ["count", "items", "attachments"],
    emptyShape: ["count: 0", "favorites: []"],
    paginationFields: ["chat", "limit", "offset", "type"],
    privacySensitiveFields: ["chat", "sender", "content", "media_path", "media_key"],
  }),
  endpoint("/api/v1/members", "GET", "chat_extensions", "RawMembersResponse", "MembersView", {
    rawFields: ["count", "members", "username", "display", "remark", "nickname"],
    uiFields: ["count", "members", "username", "displayName"],
    emptyShape: ["count: 0", "members: []"],
    paginationFields: ["chat"],
    privacySensitiveFields: ["chat", "username", "display", "remark", "nickname"],
  }),
  endpoint("/api/v1/unread", "GET", "chat_extensions", "RawUnreadResponse", "UnreadView", {
    rawFields: ["total", "count", "unread", "chats"],
    uiFields: ["total", "chats", "count"],
    emptyShape: ["total: 0", "chats: []"],
    paginationFields: [],
    privacySensitiveFields: ["chat"],
  }),
  endpoint("/api/v1/new_messages", "GET", "chat_extensions", "RawNewMessagesResponse", "NewMessagesView", {
    rawFields: ["count", "total", "messages", "since", "media_key"],
    uiFields: ["count", "messages", "attachments"],
    emptyShape: ["count: 0", "messages: []"],
    paginationFields: ["chat", "since", "limit"],
    privacySensitiveFields: ["chat", "sender", "content", "media_path", "media_key"],
  }),
];

function endpoint(
  path: string,
  method: ChatlogEndpointMethod,
  family: string,
  rawDto: string,
  uiModel: string,
  details: Pick<
    ChatlogEndpointContract,
    "rawFields" | "uiFields" | "emptyShape" | "paginationFields" | "privacySensitiveFields"
  > & { errorShape?: string[] },
): ChatlogEndpointContract {
  return {
    path,
    method,
    family,
    rawDto,
    uiModel,
    rawFields: details.rawFields,
    uiFields: details.uiFields,
    emptyShape: details.emptyShape,
    errorShape: details.errorShape ?? ["error", "message", "status"],
    paginationFields: details.paginationFields,
    privacySensitiveFields: [...COMMON_PRIVACY_FIELDS, ...details.privacySensitiveFields],
    diagnosticFamily: family,
    l4Responsibility: "L4 raw HTTP/SSE call, raw DTO typing, adapter defaults, AbortSignal forwarding.",
    l2Responsibility: "L2 UI model normalization, stale/cancel state handling, error translation, recovery actions.",
  };
}

function snsFields(paginationFields: string[] = ["limit", "offset", "user", "since", "until"]): Pick<
  ChatlogEndpointContract,
  "rawFields" | "uiFields" | "emptyShape" | "paginationFields" | "privacySensitiveFields"
> {
  return {
    rawFields: ["count", "items", "raw_content", "media_list", "article", "finder_feed"],
    uiFields: ["count", "posts", "contentType", "media", "article", "finder"],
    emptyShape: ["count: 0", "items: []"],
    paginationFields,
    privacySensitiveFields: ["username", "content", "raw_content", "xml_content", "url", "token", "key"],
  };
}

function semanticConfigFields(): Pick<
  ChatlogEndpointContract,
  "rawFields" | "uiFields" | "emptyShape" | "paginationFields" | "privacySensitiveFields"
> {
  return {
    rawFields: ["enabled", "base_url", "embedding_provider", "chat_provider", "has_api_key"],
    uiFields: ["enabled", "baseUrl", "providers", "credentials", "readiness"],
    emptyShape: ["enabled: false", "providers: unconfigured"],
    paginationFields: [],
    privacySensitiveFields: ["base_url", "api_key", "deepseek_api_key"],
  };
}

function semanticIndexFields(): Pick<
  ChatlogEndpointContract,
  "rawFields" | "uiFields" | "emptyShape" | "paginationFields" | "privacySensitiveFields"
> {
  return {
    rawFields: ["ready", "running", "paused", "processed", "pending", "failed", "last_error"],
    uiFields: ["state", "ready", "running", "progressPct", "lastError"],
    emptyShape: ["ready: false", "processed: 0", "pending: 0"],
    paginationFields: [],
    privacySensitiveFields: ["last_error", "store_path"],
  };
}

function semanticActionFields(): Pick<
  ChatlogEndpointContract,
  "rawFields" | "uiFields" | "emptyShape" | "paginationFields" | "privacySensitiveFields"
> {
  return {
    rawFields: ["ok", "accepted", "status", "error"],
    uiFields: ["ok", "accepted", "status", "error"],
    emptyShape: ["ok: false", "error: ''"],
    paginationFields: [],
    privacySensitiveFields: ["error", "api_key", "token"],
  };
}

function semanticDiscoveryFields(key: "topics" | "profiles"): Pick<
  ChatlogEndpointContract,
  "rawFields" | "uiFields" | "emptyShape" | "paginationFields" | "privacySensitiveFields"
> {
  return {
    rawFields: ["window", "from", "to", "count", key, "summary", "summary_error"],
    uiFields: ["window", "from", "to", "count", key, "summary", "summaryError"],
    emptyShape: [`${key}: []`, "count: 0"],
    paginationFields: ["chat", "window"],
    privacySensitiveFields: ["sender", "sender_name", "summary", "summary_error"],
  };
}

function graphStatusFields(): Pick<
  ChatlogEndpointContract,
  "rawFields" | "uiFields" | "emptyShape" | "paginationFields" | "privacySensitiveFields"
> {
  return {
    rawFields: ["enabled", "paused", "running", "entity_count", "relation_count", "history_queued"],
    uiFields: ["state", "counts", "queueLabel", "workerLabel", "etaLabel"],
    emptyShape: ["enabled: false", "entity_count: 0", "relation_count: 0"],
    paginationFields: [],
    privacySensitiveFields: ["last_error", "store_path"],
  };
}

function graphConfigFields(): Pick<
  ChatlogEndpointContract,
  "rawFields" | "uiFields" | "emptyShape" | "paginationFields" | "privacySensitiveFields"
> {
  return {
    rawFields: ["workers", "enqueue_workers", "status"],
    uiFields: ["workers", "enqueueWorkers"],
    emptyShape: ["workers: 1", "enqueue_workers: 1"],
    paginationFields: [],
    privacySensitiveFields: [],
  };
}

function graphQueryFields(): Pick<
  ChatlogEndpointContract,
  "rawFields" | "uiFields" | "emptyShape" | "paginationFields" | "privacySensitiveFields"
> {
  return {
    rawFields: ["entities", "relations", "events", "facts", "evidence_count", "valid_from", "valid_to"],
    uiFields: ["entities", "relations", "events", "facts", "detailRows"],
    emptyShape: ["entities: []", "relations: []", "events: []", "facts: []"],
    paginationFields: ["keyword", "entity", "relation", "start", "end", "limit"],
    privacySensitiveFields: ["name", "statement", "summary", "evidence", "source_label"],
  };
}

function graphActionFields(): Pick<
  ChatlogEndpointContract,
  "rawFields" | "uiFields" | "emptyShape" | "paginationFields" | "privacySensitiveFields"
> {
  return {
    rawFields: ["ok", "accepted", "status", "error", "ids"],
    uiFields: ["ok", "accepted", "status", "error"],
    emptyShape: ["ok: false", "error: ''"],
    paginationFields: [],
    privacySensitiveFields: ["error", "content", "message"],
  };
}

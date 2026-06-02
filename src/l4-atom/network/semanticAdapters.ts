type RawRecord = Record<string, unknown>;

export interface SemanticProviderView {
  provider: string;
  model: string;
  configured: boolean;
}

export interface SemanticConfigView {
  enabled: boolean;
  baseUrl: string;
  providers: {
    embedding: SemanticProviderView & { dimension: number };
    rerank: SemanticProviderView & { enabled: boolean };
    chat: SemanticProviderView & {
      enabled: boolean;
      thinking: boolean;
      maxTokens: number;
      temperature: number;
    };
  };
  credentials: {
    apiKeySaved: boolean;
    deepseekApiKeySaved: boolean;
  };
  retrieval: {
    recallK: number;
    topN: number;
    similarityThreshold: number;
  };
  features: {
    enableRerank: boolean;
    enableQa: boolean;
    enableTopics: boolean;
    enableProfiles: boolean;
    enableLlmChunk: boolean;
    realtimeIndex: boolean;
    indexWorkers: number;
  };
  readiness: {
    embeddingConfigured: boolean;
    rerankConfigured: boolean;
    chatConfigured: boolean;
    hasAnySavedCredential: boolean;
    readyForSearch: boolean;
    readyForQa: boolean;
  };
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

export type SemanticIndexState =
  | "idle"
  | "building"
  | "running"
  | "paused"
  | "ready"
  | "error"
  | "unavailable";

export interface SemanticIndexStatus {
  state: SemanticIndexState;
  status: SemanticIndexState;
  ready: boolean;
  running: boolean;
  paused: boolean;
  processed: number;
  pending: number;
  failed: number;
  total: number;
  completed: number;
  progressPct: number;
  lastError: string;
  error?: string;
}

export interface SemanticIndexActionResult {
  ok: boolean;
  accepted: boolean;
  status: string;
  error: string;
}

export interface SemanticSearchResultSet {
  query: string;
  chat: string;
  sourceCount: number;
  window: string;
  depth: string;
  count: number;
  totalCount: number;
  rerank: {
    enabled: boolean;
    provider: string;
    tried: boolean;
    applied: boolean;
    error: string;
  };
  results: SemanticSearchResultItem[];
}

export interface SemanticSearchResultItem {
  chat: string;
  chatName: string;
  sender: string;
  senderId: string;
  time: string;
  content: string;
  relevanceScore: number;
  localId: number;
}

export interface SemanticTopicsView {
  window: string;
  windowLabel: string;
  from: number;
  to: number;
  count: number;
  truncated: boolean;
  topics: Array<{ topic: string; count: number; keywords: string[] }>;
  daily: Array<{ date: string; count: number }>;
  summary: string;
  summaryError: string;
}

export interface SemanticProfilesView {
  window: string;
  windowLabel: string;
  from: number;
  to: number;
  count: number;
  truncated: boolean;
  profiles: SemanticProfileRow[];
  typeDistribution: SemanticTypeDistributionRow[];
  summary: string;
  summaryError: string;
}

export interface SemanticProfileRow {
  sender: string;
  senderName: string;
  messages: number;
  topKeywords: Array<{ topic: string; count: number }>;
}

export interface SemanticTypeDistributionRow {
  type: string;
  count: number;
}

export interface SemanticQAHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface SemanticQARequestInput {
  query: string;
  chat?: string;
  chats?: string[];
  window?: string;
  entityOverride?: string;
  retrievalDepth?: string;
  sourceLimit?: number;
  topN?: number;
  history?: SemanticQAHistoryItem[];
  scope?: "contact" | "all";
}

export interface SemanticQARequestPayload {
  query: string;
  chat?: string;
  chats?: string[];
  window?: string;
  entity_override?: string;
  retrieval_depth?: string;
  source_limit?: number;
  top_n?: number;
  history?: SemanticQAHistoryItem[];
}

export interface SemanticQADonePayload {
  answer: string;
  evidence: Array<Record<string, unknown>>;
  reason: string;
  metadata: Record<string, unknown>;
}

export function adaptSemanticConfig(raw: unknown): SemanticConfigView {
  const data = asRecord(raw);
  const enableRerank = boolValue(data.enable_rerank);
  const enableQa = boolValue(data.enable_qa, true);
  const embedding = providerView(
    stringValue(data.embedding_provider),
    stringValue(data.embedding_model),
  );
  const rerank = providerView(
    stringValue(data.rerank_provider),
    stringValue(data.rerank_model),
  );
  const chat = providerView(
    stringValue(data.chat_provider),
    stringValue(data.chat_model),
  );
  const apiKeySaved = boolValue(data.has_api_key);
  const deepseekApiKeySaved = boolValue(data.has_deepseek_api_key);
  const rerankConfigured = rerank.configured;
  const readyForSearch = embedding.configured && (!enableRerank || rerankConfigured);

  return {
    enabled: boolValue(data.enabled),
    baseUrl: stringValue(data.base_url),
    providers: {
      embedding: {
        ...embedding,
        dimension: numberValue(data.embedding_dimension),
      },
      rerank: {
        ...rerank,
        enabled: enableRerank,
      },
      chat: {
        ...chat,
        enabled: enableQa,
        thinking: boolValue(data.chat_thinking),
        maxTokens: numberValue(data.chat_max_tokens),
        temperature: numberValue(data.chat_temperature),
      },
    },
    credentials: {
      apiKeySaved,
      deepseekApiKeySaved,
    },
    retrieval: {
      recallK: numberValue(data.recall_k),
      topN: numberValue(data.top_n),
      similarityThreshold: numberValue(data.similarity_threshold),
    },
    features: {
      enableRerank,
      enableQa,
      enableTopics: boolValue(data.enable_topics),
      enableProfiles: boolValue(data.enable_profiles),
      enableLlmChunk: boolValue(data.enable_llm_chunk),
      realtimeIndex: boolValue(data.realtime_index),
      indexWorkers: numberValue(data.index_workers),
    },
    readiness: {
      embeddingConfigured: embedding.configured,
      rerankConfigured,
      chatConfigured: chat.configured,
      hasAnySavedCredential: apiKeySaved || deepseekApiKeySaved,
      readyForSearch,
      readyForQa: enableQa && chat.configured,
    },
  };
}

export function adaptConnectionTestResult(raw: unknown): ConnectionTestResult {
  const data = asRecord(raw);
  const ok = boolValue(data.ok);
  return {
    ok,
    message: stringValue(data.error) || (ok ? "Connection succeeded" : "Connection failed"),
  };
}

export function adaptSemanticIndexStatus(raw: unknown): SemanticIndexStatus {
  const data = asRecord(raw);
  const ready = boolValue(data.ready);
  const running = boolValue(data.running);
  const paused = boolValue(data.paused);
  const processed = numberValue(data.processed);
  const pending = numberValue(data.pending);
  const failed = numberValue(data.failed);
  const total = processed + pending + failed;
  const lastError = stringValue(data.last_error);

  const state = deriveIndexState({ ready, running, paused, lastError });

  return {
    state,
    status: state,
    ready,
    running,
    paused,
    processed,
    pending,
    failed,
    total,
    completed: processed,
    progressPct: numberValue(data.progress_pct, total > 0 ? (processed / total) * 100 : 0),
    lastError,
    error: lastError || undefined,
  };
}

export function adaptSemanticIndexActionResult(raw: unknown): SemanticIndexActionResult {
  const data = asRecord(raw);
  return {
    ok: boolValue(data.ok),
    accepted: boolValue(data.accepted),
    status: stringValue(data.status),
    error: stringValue(data.error),
  };
}

export function adaptSemanticSearch(raw: unknown): SemanticSearchResultSet {
  const data = asRecord(raw);
  const results = arrayValue(data.results).map((item) => {
    const result = asRecord(item);
    const chat = stringValue(result.talker) || stringValue(result.chat);
    const senderId = stringValue(result.sender);
    return {
      chat,
      chatName: stringValue(result.talker_name) || stringValue(result.chat_name) || chat,
      sender: stringValue(result.sender_name) || senderId,
      senderId,
      time: semanticTimeString(result.time),
      content: stringValue(result.content) || stringValue(result.snippet) || stringValue(result.text),
      relevanceScore: numberValue(result.score, numberValue(result.relevance_score, numberValue(result.similarity))),
      localId: numberValue(result.seq, numberValue(result.local_id)),
    };
  });
  const count = numberValue(data.count, results.length);

  return {
    query: stringValue(data.query),
    chat: stringValue(data.chat),
    sourceCount: numberValue(data.source_count),
    window: stringValue(data.window),
    depth: stringValue(data.depth),
    count,
    totalCount: count,
    rerank: {
      enabled: boolValue(data.rerank, boolValue(data.rerank_enabled)),
      provider: stringValue(data.rerank_provider),
      tried: boolValue(data.rerank_tried),
      applied: boolValue(data.rerank_applied),
      error: stringValue(data.rerank_error),
    },
    results,
  };
}

export function adaptSemanticTopics(raw: unknown): SemanticTopicsView {
  const data = asRecord(raw);
  return {
    window: stringValue(data.window),
    windowLabel: stringValue(data.window_label),
    from: numberValue(data.from),
    to: numberValue(data.to),
    count: numberValue(data.count),
    truncated: boolValue(data.truncated),
    topics: arrayValue(data.topics).map((item) => {
      const topic = asRecord(item);
      return {
        topic: stringValue(topic.topic) || stringValue(topic.name),
        count: numberValue(topic.count),
        keywords: arrayValue(topic.keywords).map((keyword) => stringValue(keyword)).filter(Boolean),
      };
    }),
    daily: arrayValue(data.daily).map((item) => {
      const daily = asRecord(item);
      return {
        date: stringValue(daily.date),
        count: numberValue(daily.count),
      };
    }),
    summary: stringValue(data.summary),
    summaryError: stringValue(data.summary_error),
  };
}

export function adaptSemanticProfiles(raw: unknown): SemanticProfilesView {
  const data = asRecord(raw);
  return {
    window: stringValue(data.window),
    windowLabel: stringValue(data.window_label),
    from: numberValue(data.from),
    to: numberValue(data.to),
    count: numberValue(data.count),
    truncated: boolValue(data.truncated),
    profiles: arrayValue(data.profiles).map((profile) => {
      const row = asRecord(profile);
      return {
        sender: stringValue(row.sender),
        senderName: stringValue(row.sender_name) || stringValue(row.name) || stringValue(row.sender),
        messages: numberValue(row.messages),
        topKeywords: arrayValue(row.top_keywords).map((keyword) => {
          const item = asRecord(keyword);
          return {
            topic: stringValue(item.topic) || stringValue(item.name),
            count: numberValue(item.count),
          };
        }).filter((keyword) => keyword.topic),
      };
    }),
    typeDistribution: arrayValue(data.type_distribution).map((entry) => {
      const item = asRecord(entry);
      return {
        type: stringValue(item.type),
        count: numberValue(item.count),
      };
    }).filter((entry) => entry.type),
    summary: stringValue(data.summary),
    summaryError: stringValue(data.summary_error),
  };
}

export function buildSemanticQARequestPayload(
  input: SemanticQARequestInput,
): SemanticQARequestPayload {
  return omitUndefined({
    query: input.query,
    chat: input.chat,
    chats: input.chats,
    window: input.window,
    entity_override: input.entityOverride,
    retrieval_depth: input.retrievalDepth,
    source_limit: input.sourceLimit,
    top_n: input.topN,
    history: input.history,
  });
}

export function adaptSemanticQAResponse(raw: unknown): SemanticQADonePayload {
  const data = asRecord(raw);
  return {
    answer: stringValue(data.answer) || stringValue(data.content) || stringValue(data.text),
    evidence: arrayValue(data.evidence).map((entry) => ({ ...asRecord(entry) })),
    reason: stringValue(data.reason),
    metadata: { ...asRecord(data.metadata) },
  };
}

function providerView(provider: string, model: string): SemanticProviderView {
  return {
    provider,
    model,
    configured: Boolean(provider && model),
  };
}

function deriveIndexState(input: {
  ready: boolean;
  running: boolean;
  paused: boolean;
  lastError: string;
}): SemanticIndexState {
  if (input.lastError) return "error";
  if (input.paused) return "paused";
  if (input.running) return "running";
  if (input.ready) return "ready";
  return "idle";
}

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function semanticTimeString(value: unknown): string {
  const rawString = stringValue(value);
  if (rawString) return rawString;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";

  const millis = value > 100000000000 ? value : value * 1000;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

import { maskDiagnosticText } from "@/utils/maskSecrets";

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
  indexedCount: number;
  entityCount: number;
  chunkCount: number;
  startedAt: string;
  processingRatePerMinute: number;
  estimatedSecondsLeft: number;
  lastIncrementalAt: string;
  lastIncrementalAdded: number;
  lastIncrementalError: string;
  lastRerankAt: string;
  lastRerankApplied: boolean;
  lastRerankError: string;
  progressLabel: string;
  etaLabel: string;
  rateLabel: string;
  coverageLabel: string;
  lastActivityLabel: string;
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
  scope?: "contact" | "selected" | "all";
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

export interface SemanticQAEntityCandidate {
  display: string;
  username: string;
  kind: string;
  source: string;
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
  const error = stringValue(data.error);
  return {
    ok,
    message: error ? safeSemanticDiagnosticText(error) : (ok ? "Connection succeeded" : "Connection failed"),
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
  const lastError = safeSemanticDiagnosticText(stringValue(data.last_error));
  const indexedCount = numberValue(data.indexed_count);
  const entityCount = numberValue(data.entity_count);
  const chunkCount = numberValue(data.chunk_count);
  const processingRatePerMinute = numberValue(data.processing_rate_per_minute);
  const estimatedSecondsLeft = numberValue(data.estimated_seconds_left);
  const lastIncrementalAdded = numberValue(data.last_incremental_added);
  const lastIncrementalError = safeSemanticDiagnosticText(stringValue(data.last_incremental_error));
  const lastRerankApplied = boolValue(data.last_rerank_applied);
  const lastRerankError = safeSemanticDiagnosticText(stringValue(data.last_rerank_error));

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
    indexedCount,
    entityCount,
    chunkCount,
    startedAt: stringValue(data.started_at),
    processingRatePerMinute,
    estimatedSecondsLeft,
    lastIncrementalAt: stringValue(data.last_incremental_at),
    lastIncrementalAdded,
    lastIncrementalError,
    lastRerankAt: stringValue(data.last_rerank_at),
    lastRerankApplied,
    lastRerankError,
    progressLabel: progressLabel(processed, total),
    etaLabel: etaLabel(estimatedSecondsLeft),
    rateLabel: rateLabel(processingRatePerMinute),
    coverageLabel: coverageLabel(indexedCount, entityCount, chunkCount),
    lastActivityLabel: lastActivityLabel({
      lastIncrementalAdded,
      lastIncrementalError,
      lastRerankApplied,
      lastRerankError,
    }),
  };
}

export function adaptSemanticIndexActionResult(raw: unknown): SemanticIndexActionResult {
  const data = asRecord(raw);
  return {
    ok: boolValue(data.ok),
    accepted: boolValue(data.accepted),
    status: stringValue(data.status),
    error: safeSemanticDiagnosticText(stringValue(data.error)),
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
      error: safeSemanticDiagnosticText(stringValue(data.rerank_error)),
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
    summaryError: safeSemanticDiagnosticText(stringValue(data.summary_error)),
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
    summaryError: safeSemanticDiagnosticText(stringValue(data.summary_error)),
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
  const evidence = arrayValue(data.evidence).map((entry) => ({ ...asRecord(entry) }));
  return {
    answer: stringValue(data.answer) || stringValue(data.content) || stringValue(data.text),
    evidence,
    reason: stringValue(data.reason),
    metadata: normalizeSemanticQAMetadata(data),
  };
}

function normalizeSemanticQAMetadata(data: RawRecord): Record<string, unknown> {
  const metadata: Record<string, unknown> = sanitizeMetadataRecord(asRecord(data.metadata));
  const debug = asRecord(data.debug);

  setNumberMetadata(metadata, "sourceCount", data.source_count);
  setStringMetadata(metadata, "window", data.window);
  setStringMetadata(metadata, "depth", data.depth);
  setNumberMetadata(metadata, "evidenceCount", data.count);
  setBooleanMetadata(metadata, "direct", data.direct);
  setBooleanMetadata(metadata, "rerankTried", data.rerank_tried);
  setBooleanMetadata(metadata, "rerankApplied", data.rerank_applied);
  setStringMetadata(metadata, "rerankError", data.rerank_error);

  setStringMetadata(metadata, "intent", debug.intent);
  setStringMetadata(metadata, "answerMode", debug.answer_mode);
  setStringMetadata(metadata, "routeSource", debug.source);
  setStringMetadata(metadata, "retrieval", debug.retrieval);
  setStringMetadata(metadata, "emptyReason", debug.empty_reason);
  setNumberMetadata(metadata, "entityCandidateCount", debug.entity_candidate_count);
  setBooleanMetadata(metadata, "entityAmbiguous", debug.entity_ambiguous);

  const entityCandidates = arrayValue(debug.entity_candidates)
    .map(toEntityCandidate)
    .filter((candidate) => candidate.display || candidate.username)
    .slice(0, 8);
  if (entityCandidates.length > 0) {
    metadata.entityCandidates = entityCandidates;
    if (!("entityCandidateCount" in metadata)) {
      metadata.entityCandidateCount = entityCandidates.length;
    }
  }

  return metadata;
}

function sanitizeMetadataRecord(record: RawRecord): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([key, value]) =>
      !isDeniedSemanticMetadataKey(key) && isSafeSemanticMetadataValue(value),
    ),
  );
}

function isDeniedSemanticMetadataKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [
    "answer",
    "apikey",
    "chat",
    "chats",
    "content",
    "datakey",
    "debug",
    "deepseekapikey",
    "evidence",
    "history",
    "message",
    "messages",
    "prompt",
    "query",
    "raw",
    "secret",
    "text",
    "token",
  ].some((blocked) => normalized.includes(blocked));
}

function isSafeSemanticMetadataValue(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) {
    return value.every((entry) => ["string", "number", "boolean"].includes(typeof entry));
  }
  return false;
}

function toEntityCandidate(value: unknown): SemanticQAEntityCandidate {
  const data = asRecord(value);
  return {
    display: stringValue(data.display) || stringValue(data.name) || stringValue(data.username),
    username: stringValue(data.username),
    kind: stringValue(data.kind) || stringValue(data.type),
    source: stringValue(data.source),
  };
}

function setNumberMetadata(
  metadata: Record<string, unknown>,
  key: string,
  value: unknown,
  fallback?: number,
): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    metadata[key] = value;
    return;
  }
  if (fallback !== undefined) {
    metadata[key] = fallback;
  }
}

function setStringMetadata(metadata: Record<string, unknown>, key: string, value: unknown): void {
  const text = stringValue(value);
  if (text) metadata[key] = text;
}

function setBooleanMetadata(metadata: Record<string, unknown>, key: string, value: unknown): void {
  if (typeof value === "boolean") metadata[key] = value;
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

function progressLabel(processed: number, total: number): string {
  return total > 0 ? `${processed} / ${total} processed` : "No items processed";
}

function etaLabel(seconds: number): string {
  if (seconds <= 0) return "";
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "1 min remaining" : `${minutes} min remaining`;
}

function rateLabel(rate: number): string {
  return rate > 0 ? `${Math.round(rate)}/min` : "";
}

function coverageLabel(indexed: number, entities: number, chunks: number): string {
  const parts = [
    `${indexed} indexed`,
    `${entities} entities`,
    `${chunks} chunks`,
  ];
  return parts.join(" / ");
}

function lastActivityLabel(input: {
  lastIncrementalAdded: number;
  lastIncrementalError: string;
  lastRerankApplied: boolean;
  lastRerankError: string;
}): string {
  const parts: string[] = [];
  if (input.lastIncrementalError) {
    parts.push(`Incremental error: ${input.lastIncrementalError}`);
  } else if (input.lastIncrementalAdded > 0) {
    parts.push(`Incremental +${input.lastIncrementalAdded}`);
  }
  if (input.lastRerankError) {
    parts.push(`rerank error: ${input.lastRerankError}`);
  } else if (input.lastRerankApplied) {
    parts.push("rerank applied");
  }
  return parts.join("; ");
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

function safeSemanticDiagnosticText(value: string): string {
  return value ? maskDiagnosticText(value, { privacyMode: true }) : "";
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

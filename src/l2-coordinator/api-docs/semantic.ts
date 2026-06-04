// ========== 配置相关 ==========

export type LLMProvider = "ollama" | "glm" | "deepseek" | string;

export interface SemanticConfig {
  provider?: LLMProvider;
  ollamaBaseUrl?: string;
  ollamaEmbeddingModel?: string;
  ollamaChatModel?: string;
  ollamaRerankModel?: string;
  glmApiKey?: string;
  glmBaseUrl?: string;
  glmChatModel?: string;
  deepseekApiKey?: string;
  deepseekBaseUrl?: string;
  deepseekChatModel?: string;
  enabled?: boolean;
  baseUrl?: string;
  providers?: {
    embedding: { provider: string; model: string; configured: boolean; dimension?: number };
    rerank: { provider: string; model: string; configured: boolean; enabled?: boolean };
    chat: {
      provider: string;
      model: string;
      configured: boolean;
      enabled?: boolean;
      thinking?: boolean;
      maxTokens?: number;
      temperature?: number;
    };
  };
  credentials?: {
    apiKeySaved: boolean;
    deepseekApiKeySaved: boolean;
  };
  retrieval?: {
    recallK: number;
    topN: number;
    similarityThreshold: number;
  };
  readiness?: {
    embeddingConfigured: boolean;
    rerankConfigured: boolean;
    chatConfigured: boolean;
    hasAnySavedCredential: boolean;
    readyForSearch: boolean;
    readyForQa: boolean;
  };
}

export interface SemanticConfigResponse {
  config: SemanticConfig;
}

export interface ConnectionTestResult {
  ok?: boolean;
  message: string;
  success?: boolean;
  latencyMs?: number;
}

// ========== 索引相关 ==========

export type IndexStatus =
  | "idle"
  | "building"
  | "running"
  | "paused"
  | "ready"
  | "error"
  | "unavailable";

export interface IndexStatusResponse {
  status: IndexStatus;
  state?: IndexStatus;
  total: number;
  completed: number;
  ready?: boolean;
  running?: boolean;
  paused?: boolean;
  processed?: number;
  pending?: number;
  failed?: number;
  progressPct?: number;
  lastError?: string;
  error?: string;
  startedAt?: string;
  indexedCount?: number;
  entityCount?: number;
  chunkCount?: number;
  processingRatePerMinute?: number;
  estimatedSecondsLeft?: number;
  lastIncrementalAt?: string;
  lastIncrementalAdded?: number;
  lastIncrementalError?: string;
  lastRerankAt?: string;
  lastRerankApplied?: boolean;
  lastRerankError?: string;
  progressLabel?: string;
  etaLabel?: string;
  rateLabel?: string;
  coverageSummary?: string;
  lastActivityLabel?: string;
}

// ========== QA 相关 ==========

export interface QARequest {
  query: string;
  chat?: string;
  chats?: string[];
  window?: string;
  entityOverride?: string;
  retrievalDepth?: string;
  sourceLimit?: number;
  topN?: number;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  scope?: 'contact' | 'all';
}

export interface QADonePayload {
  answer: string;
  evidence: Array<Record<string, unknown>>;
  reason: string;
  metadata: Record<string, unknown>;
  sourceCount?: number;
  window?: string;
  depth?: string;
  rerankTried?: boolean;
  rerankApplied?: boolean;
  rerankError?: string;
}

export interface QAEvidenceSummary {
  label: string;
  kind?: string;
  score?: number;
}

export interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  streamId?: string;
  completionStatus?: 'streaming' | 'completed' | 'stopped' | 'failed' | 'empty';
  evidence?: QAEvidenceSummary[];
  evidenceCount?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  sourceCount?: number;
  window?: string;
  depth?: string;
  rerankTried?: boolean;
  rerankApplied?: boolean;
  rerankError?: string;
}

export interface SSEChunk {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
}

// ========== 语义搜索相关 ==========

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  chat?: string;
  scope?: 'contact' | 'all';
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

export interface SemanticSearchResponse {
  query: string;
  totalCount?: number;
  sourceCount?: number;
  count?: number;
  window?: string;
  depth?: string;
  rerank?: {
    enabled: boolean;
    provider: string;
    tried?: boolean;
    applied?: boolean;
    error?: string;
  };
  results: SemanticSearchResultItem[];
}

// ========== 话题相关 ==========

export interface TopicItem {
  topic: string;
  count: number;
  percentage?: number;
  keywords?: string[];
}

export interface TopicsResponse {
  chat?: string;
  username?: string;
  window?: string;
  windowLabel?: string;
  from?: number;
  to?: number;
  count?: number;
  truncated?: boolean;
  topics: TopicItem[];
  daily?: Array<{ date: string; count: number }>;
  summary?: string;
  summaryError?: string;
  timeRange?: string;
}

// ========== 联系人画像相关 ==========

export interface ContactProfileData {
  chat?: string;
  username?: string;
  window?: string;
  windowLabel?: string;
  from?: number;
  to?: number;
  count?: number;
  truncated?: boolean;
  profiles?: Array<{
    sender: string;
    senderName: string;
    messages: number;
    topKeywords: Array<{ topic: string; count: number }>;
  }>;
  typeDistribution?: Array<{ type: string; count: number }>;
  role?: string;
  activeHours?: string;
  dailyFrequency?: number;
  mainTopics?: string[];
  sentiment?: string;
  summary?: string;
}

// ========== AI 模块状态 ==========

export type AiPhase =
  | 'idle'
  | 'checking_config'
  | 'not_configured'
  | 'configuring'
  | 'configured'
  | 'index_checking'
  | 'index_not_built'
  | 'index_building'
  | 'index_ready'
  | 'index_error'
  | 'error';

export interface AiState {
  phase: AiPhase;
  config: SemanticConfig | null;
  indexStatus: IndexStatusResponse | null;
  qaMessages: QAMessage[];
  qaLoading: boolean;
  qaStreaming: boolean;
  qaStatus: 'idle' | 'connecting' | 'streaming' | 'completed' | 'stopped' | 'failed' | 'empty';
  qaError: string | null;
  activeQAStreamId: string | null;
  searchQuery: string;
  searchResults: SemanticSearchResponse | null;
  searchLoading: boolean;
  searchError: string | null;
  topics: TopicsResponse | null;
  topicsLoading: boolean;
  topicsError: string | null;
  profile: ContactProfileData | null;
  profileLoading: boolean;
  profileError: string | null;
  error: string | null;
}

export interface AiActions {
  setPhase: (phase: AiPhase) => void;
  setConfig: (config: SemanticConfig) => void;
  setIndexStatus: (status: IndexStatusResponse) => void;
  addQAMessage: (msg: QAMessage) => void;
  startQAStream: (streamId: string) => void;
  appendQAToken: (streamId: string, msgId: string, token: string) => void;
  completeQAStream: (streamId: string, msgId: string, payload: QADonePayload) => boolean;
  failQAStream: (streamId: string, error: string) => boolean;
  stopQAStream: (streamId: string) => boolean;
  setQALoading: (loading: boolean) => void;
  setQAStreaming: (streaming: boolean) => void;
  setQAStatus: (status: AiState['qaStatus']) => void;
  setQAError: (error: string | null) => void;
  clearQAMessages: () => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SemanticSearchResponse | null) => void;
  setSearchLoading: (loading: boolean) => void;
  setSearchError: (error: string | null) => void;
  setTopics: (topics: TopicsResponse | null) => void;
  setTopicsLoading: (loading: boolean) => void;
  setTopicsError: (error: string | null) => void;
  setProfile: (profile: ContactProfileData | null) => void;
  setProfileLoading: (loading: boolean) => void;
  setProfileError: (error: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// ========== 配置相关 ==========

export type LLMProvider = 'ollama' | 'glm' | 'deepseek';

export interface SemanticConfig {
  provider: LLMProvider;
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
}

export interface SemanticConfigResponse {
  config: SemanticConfig;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

// ========== 索引相关 ==========

export type IndexStatus = 'idle' | 'building' | 'paused' | 'ready' | 'error';

export interface IndexStatusResponse {
  status: IndexStatus;
  total: number;
  completed: number;
  error?: string;
  startedAt?: string;
}

// ========== QA 相关 ==========

export interface QARequest {
  query: string;
  chat?: string;
  scope?: 'contact' | 'all';
}

export interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
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
  sender: string;
  time: string;
  content: string;
  relevanceScore: number;
  localId: number;
}

export interface SemanticSearchResponse {
  query: string;
  totalCount: number;
  results: SemanticSearchResultItem[];
}

// ========== 话题相关 ==========

export interface TopicItem {
  topic: string;
  count: number;
  percentage: number;
}

export interface TopicsResponse {
  chat: string;
  username: string;
  topics: TopicItem[];
  timeRange?: string;
}

// ========== 联系人画像相关 ==========

export interface ContactProfileData {
  chat: string;
  username: string;
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
  searchQuery: string;
  searchResults: SemanticSearchResponse | null;
  searchLoading: boolean;
  topics: TopicsResponse | null;
  topicsLoading: boolean;
  profile: ContactProfileData | null;
  profileLoading: boolean;
  error: string | null;
}

export interface AiActions {
  setPhase: (phase: AiPhase) => void;
  setConfig: (config: SemanticConfig) => void;
  setIndexStatus: (status: IndexStatusResponse) => void;
  addQAMessage: (msg: QAMessage) => void;
  appendQAToken: (msgId: string, token: string) => void;
  setQALoading: (loading: boolean) => void;
  setQAStreaming: (streaming: boolean) => void;
  clearQAMessages: () => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SemanticSearchResponse | null) => void;
  setSearchLoading: (loading: boolean) => void;
  setTopics: (topics: TopicsResponse | null) => void;
  setTopicsLoading: (loading: boolean) => void;
  setProfile: (profile: ContactProfileData | null) => void;
  setProfileLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

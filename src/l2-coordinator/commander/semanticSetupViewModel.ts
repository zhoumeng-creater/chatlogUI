import type { IndexStatusResponse, SemanticConfig } from "@/l2-coordinator/api-docs/semantic";
import { maskDiagnosticText } from "@/utils/maskSecrets";

export type SemanticProviderRole = "embedding" | "rerank" | "chat";
export type SemanticCredentialProvider = "ollama" | "glm" | "deepseek" | string;
export type SemanticCredentialStateKind = "not_required" | "missing" | "retain_saved" | "will_update";
export type SemanticIndexCommand = "build" | "resume" | "pause" | "rebuildFromScratch" | "clearIndex";
export type SemanticSidecarIndexAction = "rebuild" | "pause" | "resume" | "clear";

export interface SemanticSetupDraft {
  enabled: boolean;
  baseUrl: string;
  ollamaBaseUrl: string;
  deepseekBaseUrl: string;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimension: number;
  rerankProvider: string;
  rerankModel: string;
  chatProvider: string;
  chatModel: string;
  chatThinking: boolean;
  chatMaxTokens: number;
  chatTemperature: number;
  apiKeyInput: string;
  deepseekApiKeyInput: string;
  recallK: number;
  topN: number;
  similarityThreshold: number;
  enableRerank: boolean;
  enableQa: boolean;
  enableTopics: boolean;
  enableProfiles: boolean;
  enableLlmChunk: boolean;
  realtimeIndex: boolean;
  indexWorkers: number;
}

export interface SemanticConfigPayload {
  enabled: boolean;
  api_key: string;
  base_url: string;
  ollama_base_url: string;
  deepseek_api_key: string;
  deepseek_base_url: string;
  embedding_provider: string;
  rerank_provider: string;
  chat_provider: string;
  embedding_model: string;
  rerank_model: string;
  chat_model: string;
  chat_thinking: boolean;
  chat_max_tokens: number;
  chat_temperature: number;
  embedding_dimension: number;
  enable_rerank: boolean;
  enable_qa: boolean;
  enable_topics: boolean;
  enable_profiles: boolean;
  enable_llm_chunk: boolean;
  realtime_index: boolean;
  index_workers: number;
  recall_k: number;
  top_n: number;
  similarity_threshold: number;
}

export interface SemanticCredentialState {
  state: SemanticCredentialStateKind;
  label: string;
  tone: "neutral" | "success" | "warning" | "info";
}

export interface SemanticSetupReadinessItem {
  id: "embedding" | "rerank" | "chat" | "credential" | "index";
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning" | "danger" | "info";
}

export interface SemanticSetupValidation {
  valid: boolean;
  fieldErrors: Record<string, string>;
  sectionErrors: Record<SemanticProviderRole | "advanced", string>;
  confirmations: string[];
}

export interface SemanticSetupView {
  readiness: SemanticSetupReadinessItem[];
  credentials: {
    apiKey: SemanticCredentialState;
    deepseek: SemanticCredentialState;
  };
  validation: SemanticSetupValidation;
}

export interface SemanticConnectionTestPayload {
  provider: string;
  config: SemanticConfigPayload;
}

export interface SemanticIndexActionIntent {
  command: SemanticIndexCommand;
  sidecarAction: SemanticSidecarIndexAction;
  label: string;
  requiresConfirmation: boolean;
  confirmationTitle: string;
  confirmationBody: string;
}

export type SemanticIndexCenterKind =
  | "unavailable"
  | "not_built"
  | "running"
  | "paused"
  | "failed"
  | "ready";

export interface SemanticIndexMetric {
  id: "progress" | "eta" | "rate" | "processed" | "coverage" | "lastActivity";
  label: string;
  value: string;
}

export interface SemanticIndexCenterView {
  kind: SemanticIndexCenterKind;
  title: string;
  message: string;
  metrics: SemanticIndexMetric[];
  primaryAction: SemanticIndexActionIntent | null;
  secondaryActions: SemanticIndexActionIntent[];
  destructiveActions: SemanticIndexActionIntent[];
  progressPct: number;
}

const DEFAULTS = {
  baseUrl: "https://open.bigmodel.cn/api/paas/v4",
  ollamaBaseUrl: "http://127.0.0.1:11434",
  deepseekBaseUrl: "https://api.deepseek.com",
  embeddingProvider: "ollama",
  embeddingModel: "qwen3-embedding:8b",
  embeddingDimension: 4096,
  rerankProvider: "ollama",
  rerankModel: "dengcao/Qwen3-Reranker-8B:Q5_K_M",
  chatProvider: "glm",
  chatModel: "glm-5.1",
  chatMaxTokens: 4096,
  chatTemperature: 0.2,
  recallK: 30,
  topN: 8,
  similarityThreshold: 0.61,
  indexWorkers: 1,
};

export function createSemanticSetupDraft(config: SemanticConfig | null = null): SemanticSetupDraft {
  const features = config?.features;
  return {
    enabled: config?.enabled ?? true,
    baseUrl: config?.baseUrl || DEFAULTS.baseUrl,
    ollamaBaseUrl: config?.ollamaBaseUrl || DEFAULTS.ollamaBaseUrl,
    deepseekBaseUrl: config?.deepseekBaseUrl || DEFAULTS.deepseekBaseUrl,
    embeddingProvider: config?.providers?.embedding.provider || DEFAULTS.embeddingProvider,
    embeddingModel: config?.providers?.embedding.model || DEFAULTS.embeddingModel,
    embeddingDimension: config?.providers?.embedding.dimension || DEFAULTS.embeddingDimension,
    rerankProvider: config?.providers?.rerank.provider || DEFAULTS.rerankProvider,
    rerankModel: config?.providers?.rerank.model || DEFAULTS.rerankModel,
    chatProvider: config?.providers?.chat.provider || DEFAULTS.chatProvider,
    chatModel: config?.providers?.chat.model || DEFAULTS.chatModel,
    chatThinking: config?.providers?.chat.thinking ?? false,
    chatMaxTokens: config?.providers?.chat.maxTokens || DEFAULTS.chatMaxTokens,
    chatTemperature: config?.providers?.chat.temperature ?? DEFAULTS.chatTemperature,
    apiKeyInput: "",
    deepseekApiKeyInput: "",
    recallK: config?.retrieval?.recallK || DEFAULTS.recallK,
    topN: config?.retrieval?.topN || DEFAULTS.topN,
    similarityThreshold: config?.retrieval?.similarityThreshold ?? DEFAULTS.similarityThreshold,
    enableRerank: features?.enableRerank ?? config?.providers?.rerank.enabled ?? true,
    enableQa: features?.enableQa ?? config?.providers?.chat.enabled ?? true,
    enableTopics: features?.enableTopics ?? true,
    enableProfiles: features?.enableProfiles ?? true,
    enableLlmChunk: features?.enableLlmChunk ?? false,
    realtimeIndex: features?.realtimeIndex ?? true,
    indexWorkers: features?.indexWorkers || DEFAULTS.indexWorkers,
  };
}

export function deriveCredentialState(input: {
  provider: SemanticCredentialProvider;
  saved: boolean;
  input: string;
}): SemanticCredentialState {
  if (!providerNeedsCredential(input.provider)) {
    return { state: "not_required", label: "无需远程密钥", tone: "neutral" };
  }
  if (input.input.trim()) {
    return { state: "will_update", label: "本次将更新", tone: "info" };
  }
  if (input.saved) {
    return { state: "retain_saved", label: "留空将保留已保存 key", tone: "success" };
  }
  return { state: "missing", label: "未保存", tone: "warning" };
}

export function deriveSemanticSetupView(
  draft: SemanticSetupDraft,
  config: SemanticConfig | null,
  privacyOn: boolean,
  indexStatus?: IndexStatusResponse | null,
): SemanticSetupView {
  const validation = validateSemanticSetupDraft(draft, config?.credentials);
  const apiKey = deriveCredentialState({
    provider: draftUsesProvider(draft, "glm") ? "glm" : "ollama",
    saved: Boolean(config?.credentials?.apiKeySaved),
    input: draft.apiKeyInput,
  });
  const deepseek = deriveCredentialState({
    provider: draftUsesProvider(draft, "deepseek") ? "deepseek" : "ollama",
    saved: Boolean(config?.credentials?.deepseekApiKeySaved),
    input: draft.deepseekApiKeyInput,
  });

  return {
    readiness: [
      providerReadiness("embedding", "Embedding", draft.embeddingProvider, draft.embeddingModel),
      providerReadiness("rerank", "Rerank", draft.rerankProvider, draft.rerankModel),
      providerReadiness("chat", "Chat", draft.chatProvider, draft.chatModel),
      {
        id: "credential",
        label: "Credential",
        value: credentialSummary(apiKey, deepseek),
        tone: apiKey.state === "missing" || deepseek.state === "missing" ? "warning" : "success",
      },
      {
        id: "index",
        label: "Index",
        value: indexStatus ? maskedValue(indexStatus.status, privacyOn) : "未检查",
        tone: indexStatus?.status === "ready" ? "success" : "neutral",
      },
    ],
    credentials: { apiKey, deepseek },
    validation,
  };
}

export function validateSemanticSetupDraft(
  draft: SemanticSetupDraft,
  savedCredentials: SemanticConfig["credentials"] = { apiKeySaved: false, deepseekApiKeySaved: false },
): SemanticSetupValidation {
  const fieldErrors: Record<string, string> = {};
  const sectionErrors: SemanticSetupValidation["sectionErrors"] = {
    embedding: "",
    rerank: "",
    chat: "",
    advanced: "",
  };
  const confirmations: string[] = [];

  requireText(draft.embeddingProvider, "embeddingProvider", "Embedding provider", fieldErrors);
  requireText(draft.embeddingModel, "embeddingModel", "Embedding model", fieldErrors);
  requireText(draft.rerankProvider, "rerankProvider", "Rerank provider", fieldErrors);
  requireText(draft.rerankModel, "rerankModel", "Rerank model", fieldErrors);
  requireText(draft.chatProvider, "chatProvider", "Chat provider", fieldErrors);
  requireText(draft.chatModel, "chatModel", "Chat model", fieldErrors);

  const missingGlmCredential =
    draftUsesProvider(draft, "glm") && !savedCredentials?.apiKeySaved && !draft.apiKeyInput.trim();
  const missingDeepseekCredential =
    draftUsesProvider(draft, "deepseek") && !savedCredentials?.deepseekApiKeySaved && !draft.deepseekApiKeyInput.trim();

  if (missingGlmCredential) {
    fieldErrors.apiKeyInput = "需要 GLM API Key 或已保存 key。";
  }
  if (missingDeepseekCredential) {
    fieldErrors.deepseekApiKeyInput = "需要 DeepSeek API Key 或已保存 key。";
  }

  validateNumber(draft.indexWorkers, "indexWorkers", "Index workers", 1, 32, fieldErrors);
  validateNumber(draft.recallK, "recallK", "Recall K", 1, 200, fieldErrors);
  validateNumber(draft.topN, "topN", "Top N", 1, 100, fieldErrors);
  validateNumber(draft.similarityThreshold, "similarityThreshold", "Similarity threshold", 0, 1, fieldErrors);
  validateNumber(draft.embeddingDimension, "embeddingDimension", "Embedding dimension", 1, 8192, fieldErrors);
  validateNumber(draft.chatMaxTokens, "chatMaxTokens", "Chat max tokens", 128, 32768, fieldErrors);
  validateNumber(draft.chatTemperature, "chatTemperature", "Chat temperature", 0, 2, fieldErrors);

  if (!fieldErrors.indexWorkers && draft.indexWorkers > 4) {
    confirmations.push("high_index_workers");
  }

  if (
    fieldErrors.embeddingProvider ||
    fieldErrors.embeddingModel ||
    (providerNeedsCredential(draft.embeddingProvider) && (fieldErrors.apiKeyInput || fieldErrors.deepseekApiKeyInput))
  ) {
    sectionErrors.embedding = "Embedding 配置不完整。";
  }
  if (
    fieldErrors.rerankProvider ||
    fieldErrors.rerankModel ||
    (providerNeedsCredential(draft.rerankProvider) && (fieldErrors.apiKeyInput || fieldErrors.deepseekApiKeyInput))
  ) {
    sectionErrors.rerank = "Rerank 配置不完整。";
  }
  if (
    fieldErrors.chatProvider ||
    fieldErrors.chatModel ||
    (providerNeedsCredential(draft.chatProvider) && (fieldErrors.apiKeyInput || fieldErrors.deepseekApiKeyInput))
  ) {
    sectionErrors.chat = "Chat 配置不完整。";
  }
  if (
    fieldErrors.indexWorkers ||
    fieldErrors.recallK ||
    fieldErrors.topN ||
    fieldErrors.similarityThreshold ||
    fieldErrors.embeddingDimension ||
    fieldErrors.chatMaxTokens ||
    fieldErrors.chatTemperature
  ) {
    sectionErrors.advanced = "高级参数超出安全范围。";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    sectionErrors,
    confirmations,
  };
}

export function buildSemanticConfigPayload(draft: SemanticSetupDraft): SemanticConfigPayload {
  return {
    enabled: draft.enabled,
    api_key: draft.apiKeyInput.trim(),
    base_url: draft.baseUrl.trim(),
    ollama_base_url: draft.ollamaBaseUrl.trim(),
    deepseek_api_key: draft.deepseekApiKeyInput.trim(),
    deepseek_base_url: draft.deepseekBaseUrl.trim(),
    embedding_provider: draft.embeddingProvider.trim(),
    rerank_provider: draft.rerankProvider.trim(),
    chat_provider: draft.chatProvider.trim(),
    embedding_model: draft.embeddingModel.trim(),
    rerank_model: draft.rerankModel.trim(),
    chat_model: draft.chatModel.trim(),
    chat_thinking: draft.chatThinking,
    chat_max_tokens: boundedInteger(draft.chatMaxTokens),
    chat_temperature: roundNumber(draft.chatTemperature),
    embedding_dimension: boundedInteger(draft.embeddingDimension),
    enable_rerank: draft.enableRerank,
    enable_qa: draft.enableQa,
    enable_topics: draft.enableTopics,
    enable_profiles: draft.enableProfiles,
    enable_llm_chunk: draft.enableLlmChunk,
    realtime_index: draft.realtimeIndex,
    index_workers: boundedInteger(draft.indexWorkers),
    recall_k: boundedInteger(draft.recallK),
    top_n: boundedInteger(draft.topN),
    similarity_threshold: roundNumber(draft.similarityThreshold),
  };
}

export function buildConnectionTestPayload(draft: SemanticSetupDraft): SemanticConnectionTestPayload {
  return {
    provider: draft.chatProvider || draft.embeddingProvider,
    config: buildSemanticConfigPayload(draft),
  };
}

export function deriveIndexActionIntent(
  command: SemanticIndexCommand,
  _status: IndexStatusResponse | null,
): SemanticIndexActionIntent {
  switch (command) {
    case "pause":
      return indexIntent(command, "pause", "暂停", false);
    case "resume":
      return indexIntent(command, "resume", "继续索引", false);
    case "rebuildFromScratch":
      return indexIntent(
        command,
        "rebuild",
        "从头重建",
        true,
        "确认从头重建索引？",
        "这会让当前语义索引重新构建。聊天原始数据不会被删除。",
      );
    case "clearIndex":
      return indexIntent(
        command,
        "clear",
        "删除索引",
        true,
        "确认删除语义索引？",
        "删除后 AI 搜索和问答会暂时不可用，需要重新构建索引。",
      );
    case "build":
    default:
      return indexIntent(command, "rebuild", "开始构建", false);
  }
}

export function deriveSemanticIndexCenterView(status: IndexStatusResponse | null): SemanticIndexCenterView {
  if (!status) {
    return {
      kind: "unavailable",
      title: "索引状态未检查",
      message: "保存语义配置后检查索引状态。",
      metrics: [],
      primaryAction: null,
      secondaryActions: [],
      destructiveActions: [],
      progressPct: 0,
    };
  }

  const normalizedStatus = status.state ?? status.status;
  const metrics = indexMetrics(status);
  if (normalizedStatus === "running" || normalizedStatus === "building") {
    return indexCenter("running", "索引构建中", "语义索引正在处理本地聊天数据。", metrics, status, "pause", []);
  }
  if (normalizedStatus === "paused") {
    return indexCenter("paused", "索引已暂停", "继续索引后才能使用完整语义搜索和问答。", metrics, status, "resume", [
      "rebuildFromScratch",
      "clearIndex",
    ]);
  }
  if (normalizedStatus === "error") {
    return indexCenter(
      "failed",
      "索引异常",
      maskDiagnosticText(status.lastError || status.error || "语义索引失败。"),
      metrics,
      status,
      "rebuildFromScratch",
      ["clearIndex"],
    );
  }
  if (normalizedStatus === "ready") {
    return indexCenter("ready", "索引已就绪", "语义搜索和问答可以使用。", metrics, status, "rebuildFromScratch", [
      "clearIndex",
    ]);
  }
  return indexCenter("not_built", "索引未构建", "构建索引后可启用语义搜索和问答。", metrics, status, "build", []);
}

function providerNeedsCredential(provider: string): boolean {
  return provider === "glm" || provider === "deepseek";
}

function draftUsesProvider(draft: SemanticSetupDraft, provider: string): boolean {
  return [draft.embeddingProvider, draft.rerankProvider, draft.chatProvider].includes(provider);
}

function providerReadiness(
  id: SemanticSetupReadinessItem["id"],
  label: string,
  provider: string,
  model: string,
): SemanticSetupReadinessItem {
  const configured = Boolean(provider.trim() && model.trim());
  return {
    id,
    label,
    value: configured ? `${provider} / ${model}` : "未配置",
    tone: configured ? "success" : "warning",
  };
}

function credentialSummary(apiKey: SemanticCredentialState, deepseek: SemanticCredentialState): string {
  if (apiKey.state === "missing" || deepseek.state === "missing") return "需要密钥";
  if (apiKey.state === "will_update" || deepseek.state === "will_update") return "本次将更新";
  if (apiKey.state === "retain_saved" || deepseek.state === "retain_saved") return "已保存";
  return "本地 provider";
}

function maskedValue(value: string, privacyOn: boolean): string {
  return privacyOn ? maskDiagnosticText(value) : value;
}

function requireText(value: string, field: string, label: string, fieldErrors: Record<string, string>): void {
  if (!value.trim()) fieldErrors[field] = `${label} 必填。`;
}

function validateNumber(
  value: number,
  field: string,
  label: string,
  min: number,
  max: number,
  fieldErrors: Record<string, string>,
): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    fieldErrors[field] = `${label} 必须在 ${min} 到 ${max} 之间。`;
  }
}

function boundedInteger(value: number): number {
  return Math.max(0, Math.round(value));
}

function roundNumber(value: number): number {
  return Number(value.toFixed(3));
}

function indexIntent(
  command: SemanticIndexCommand,
  sidecarAction: SemanticSidecarIndexAction,
  label: string,
  requiresConfirmation: boolean,
  confirmationTitle = "",
  confirmationBody = "",
): SemanticIndexActionIntent {
  return {
    command,
    sidecarAction,
    label,
    requiresConfirmation,
    confirmationTitle,
    confirmationBody,
  };
}

function indexMetrics(status: IndexStatusResponse): SemanticIndexMetric[] {
  return [
    { id: "progress", label: "进度", value: status.progressLabel || `${progressPercent(status)}%` },
    { id: "eta", label: "预计剩余", value: status.etaLabel || "无" },
    { id: "rate", label: "速率", value: status.rateLabel || "无" },
    {
      id: "processed",
      label: "处理",
      value: `${status.processed ?? status.completed ?? 0} 已处理 / ${status.pending ?? 0} 待处理 / ${status.failed ?? 0} 失败`,
    },
    { id: "coverage", label: "覆盖", value: status.coverageLabel || "无" },
    { id: "lastActivity", label: "最近活动", value: status.lastActivityLabel || "无" },
  ];
}

function progressPercent(status: IndexStatusResponse): number {
  if (typeof status.progressPct === "number") return Math.round(status.progressPct);
  if (status.total > 0) return Math.round((status.completed / status.total) * 100);
  return 0;
}

function indexCenter(
  kind: SemanticIndexCenterKind,
  title: string,
  message: string,
  metrics: SemanticIndexMetric[],
  status: IndexStatusResponse,
  primary: SemanticIndexCommand,
  secondary: SemanticIndexCommand[],
): SemanticIndexCenterView {
  const primaryAction = deriveIndexActionIntent(primary, status);
  const secondaryActions = secondary
    .filter((command) => !deriveIndexActionIntent(command, status).requiresConfirmation)
    .map((command) => deriveIndexActionIntent(command, status));
  const destructiveActions = secondary
    .filter((command) => deriveIndexActionIntent(command, status).requiresConfirmation)
    .map((command) => deriveIndexActionIntent(command, status));

  return {
    kind,
    title,
    message,
    metrics,
    primaryAction,
    secondaryActions,
    destructiveActions,
    progressPct: progressPercent(status),
  };
}

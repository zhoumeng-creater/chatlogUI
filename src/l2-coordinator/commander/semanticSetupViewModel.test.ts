import { describe, expect, it } from "vitest";
import type { IndexStatusResponse, SemanticConfig } from "@/l2-coordinator/api-docs/semantic";
import {
  buildConnectionTestPayload,
  buildSemanticConfigPayload,
  createSemanticSetupDraft,
  deriveCredentialState,
  deriveIndexActionIntent,
  deriveSemanticIndexCenterView,
  deriveSemanticSetupView,
  validateSemanticSetupDraft,
} from "./semanticSetupViewModel";

describe("semantic setup draft view model", () => {
  it("builds an editable draft from saved multi-provider config without exposing saved keys", () => {
    const draft = createSemanticSetupDraft(savedDeepSeekConfig());
    const view = deriveSemanticSetupView(draft, savedDeepSeekConfig(), false);

    expect(draft.embeddingProvider).toBe("ollama");
    expect(draft.rerankProvider).toBe("ollama");
    expect(draft.chatProvider).toBe("deepseek");
    expect(draft.apiKeyInput).toBe("");
    expect(draft.deepseekApiKeyInput).toBe("");
    expect(view.readiness.map((item) => item.id)).toEqual([
      "embedding",
      "rerank",
      "chat",
      "credential",
      "index",
    ]);
    expect(view.credentials.deepseek.state).toBe("retain_saved");
    expect(JSON.stringify(view)).not.toContain("sk-");
  });

  it("distinguishes credential saved, missing, update, and retain states", () => {
    expect(deriveCredentialState({ provider: "glm", saved: true, input: "" }).state).toBe("retain_saved");
    expect(deriveCredentialState({ provider: "glm", saved: false, input: "" }).state).toBe("missing");
    expect(deriveCredentialState({ provider: "glm", saved: true, input: "sk-new" }).state).toBe("will_update");
    expect(deriveCredentialState({ provider: "ollama", saved: false, input: "" }).state).toBe("not_required");
  });

  it("validates remote credentials and high-risk numeric settings before save or indexing", () => {
    const missingCredential = createSemanticSetupDraft(savedDeepSeekConfig());
    missingCredential.chatProvider = "glm";

    const missingCredentialResult = validateSemanticSetupDraft(missingCredential, {
      apiKeySaved: false,
      deepseekApiKeySaved: false,
    });

    expect(missingCredentialResult.valid).toBe(false);
    expect(missingCredentialResult.fieldErrors.apiKeyInput).toContain("API Key");

    const highWorkerDraft = createSemanticSetupDraft(savedDeepSeekConfig());
    highWorkerDraft.indexWorkers = 8;

    const highWorkerResult = validateSemanticSetupDraft(highWorkerDraft, savedDeepSeekConfig().credentials);
    expect(highWorkerResult.valid).toBe(true);
    expect(highWorkerResult.confirmations).toContain("high_index_workers");

    highWorkerDraft.indexWorkers = 33;
    const invalidWorkerResult = validateSemanticSetupDraft(highWorkerDraft, savedDeepSeekConfig().credentials);
    expect(invalidWorkerResult.valid).toBe(false);
    expect(invalidWorkerResult.fieldErrors.indexWorkers).toContain("32");
  });

  it("builds full backend-shaped config and connection-test payloads from draft values", () => {
    const draft = createSemanticSetupDraft(savedDeepSeekConfig());
    draft.deepseekApiKeyInput = "sk-new-deepseek";
    draft.chatTemperature = 0.4;
    draft.indexWorkers = 2;

    const configPayload = buildSemanticConfigPayload(draft);
    const testPayload = buildConnectionTestPayload(draft);

    expect(configPayload).toMatchObject({
      enabled: true,
      embedding_provider: "ollama",
      rerank_provider: "ollama",
      chat_provider: "deepseek",
      deepseek_api_key: "sk-new-deepseek",
      chat_temperature: 0.4,
      index_workers: 2,
    });
    expect(testPayload.provider).toBe("deepseek");
    expect(testPayload.config).toMatchObject({
      embedding_provider: "ollama",
      rerank_provider: "ollama",
      chat_provider: "deepseek",
      deepseek_api_key: "sk-new-deepseek",
    });
  });

  it("preserves saved semantic feature flags when saving model configuration", () => {
    const draft = createSemanticSetupDraft({
      ...savedDeepSeekConfig(),
      enabled: false,
      features: {
        enableRerank: false,
        enableQa: false,
        enableTopics: false,
        enableProfiles: false,
        enableLlmChunk: true,
        realtimeIndex: false,
        indexWorkers: 3,
      },
    } as SemanticConfig);

    const payload = buildSemanticConfigPayload(draft);

    expect(payload).toMatchObject({
      enabled: false,
      enable_rerank: false,
      enable_qa: false,
      enable_topics: false,
      enable_profiles: false,
      enable_llm_chunk: true,
      realtime_index: false,
      index_workers: 3,
    });
  });

  it("requires credentials for every remote provider role, not only chat", () => {
    const glmRerankDraft = createSemanticSetupDraft(savedDeepSeekConfig());
    glmRerankDraft.embeddingProvider = "ollama";
    glmRerankDraft.rerankProvider = "glm";
    glmRerankDraft.chatProvider = "ollama";

    const glmResult = validateSemanticSetupDraft(glmRerankDraft, {
      apiKeySaved: false,
      deepseekApiKeySaved: false,
    });
    const glmView = deriveSemanticSetupView(glmRerankDraft, {
      ...savedDeepSeekConfig(),
      credentials: { apiKeySaved: false, deepseekApiKeySaved: false },
    }, false);

    expect(glmResult.valid).toBe(false);
    expect(glmResult.fieldErrors.apiKeyInput).toContain("GLM");
    expect(glmView.credentials.apiKey.state).toBe("missing");

    const deepseekEmbeddingDraft = createSemanticSetupDraft(savedDeepSeekConfig());
    deepseekEmbeddingDraft.embeddingProvider = "deepseek";
    deepseekEmbeddingDraft.chatProvider = "ollama";

    const deepseekResult = validateSemanticSetupDraft(deepseekEmbeddingDraft, {
      apiKeySaved: true,
      deepseekApiKeySaved: false,
    });

    expect(deepseekResult.valid).toBe(false);
    expect(deepseekResult.fieldErrors.deepseekApiKeyInput).toContain("DeepSeek");
  });
});

describe("semantic index center view model", () => {
  it("maps index actions to sidecar actions and marks destructive operations for confirmation", () => {
    expect(deriveIndexActionIntent("build", readyIndex("idle"))).toMatchObject({
      command: "build",
      sidecarAction: "rebuild",
      requiresConfirmation: false,
    });
    expect(deriveIndexActionIntent("pause", readyIndex("running"))).toMatchObject({
      command: "pause",
      sidecarAction: "pause",
      requiresConfirmation: false,
    });
    expect(deriveIndexActionIntent("rebuildFromScratch", readyIndex("ready"))).toMatchObject({
      command: "rebuildFromScratch",
      sidecarAction: "rebuild",
      requiresConfirmation: true,
    });
    expect(deriveIndexActionIntent("clearIndex", readyIndex("ready"))).toMatchObject({
      command: "clearIndex",
      sidecarAction: "clear",
      requiresConfirmation: true,
    });
  });

  it("shows running, paused, failed, ready, and unavailable index states with next actions", () => {
    expect(deriveSemanticIndexCenterView(null).kind).toBe("unavailable");
    expect(deriveSemanticIndexCenterView(readyIndex("running")).primaryAction?.command).toBe("pause");
    expect(deriveSemanticIndexCenterView(readyIndex("paused")).primaryAction?.command).toBe("resume");
    expect(deriveSemanticIndexCenterView(readyIndex("error")).primaryAction?.command).toBe("rebuildFromScratch");
    expect(deriveSemanticIndexCenterView(readyIndex("ready")).metrics.map((metric) => metric.id)).toEqual([
      "progress",
      "eta",
      "rate",
      "processed",
      "coverage",
      "lastActivity",
    ]);
  });
});

function savedDeepSeekConfig(): SemanticConfig {
  return {
    enabled: true,
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    providers: {
      embedding: { provider: "ollama", model: "qwen3-embedding:8b", configured: true, dimension: 4096 },
      rerank: { provider: "ollama", model: "dengcao/Qwen3-Reranker-8B:Q5_K_M", configured: true, enabled: true },
      chat: { provider: "deepseek", model: "deepseek-chat", configured: true, enabled: true, thinking: false, maxTokens: 4096, temperature: 0.2 },
    },
    credentials: { apiKeySaved: false, deepseekApiKeySaved: true },
    retrieval: { recallK: 30, topN: 8, similarityThreshold: 0.61 },
    readiness: {
      embeddingConfigured: true,
      rerankConfigured: true,
      chatConfigured: true,
      hasAnySavedCredential: true,
      readyForSearch: true,
      readyForQa: true,
    },
  };
}

function readyIndex(status: IndexStatusResponse["status"]): IndexStatusResponse {
  return {
    status,
    state: status,
    total: 120,
    completed: status === "ready" ? 120 : 80,
    ready: status === "ready",
    running: status === "running",
    paused: status === "paused",
    processed: status === "ready" ? 120 : 80,
    pending: status === "ready" ? 0 : 40,
    failed: status === "error" ? 2 : 0,
    progressPct: status === "ready" ? 100 : 66,
    lastError: status === "error" ? "synthetic semantic index unavailable" : "",
    progressLabel: status === "ready" ? "120 / 120 processed" : "80 / 120 processed",
    etaLabel: status === "running" ? "1 min remaining" : "",
    rateLabel: status === "running" ? "90/min" : "",
    coverageLabel: "118 indexed / 32 entities / 512 chunks",
    lastActivityLabel: "Incremental +4; rerank applied",
  };
}

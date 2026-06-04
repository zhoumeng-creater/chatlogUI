import { describe, expect, it } from "vitest";
import type { IndexStatusResponse, SemanticConfig } from "@/l2-coordinator/api-docs/semantic";
import { createSemanticSetupDraft, deriveIndexActionIntent } from "./semanticSetupViewModel";
import {
  runSemanticIndexActionWithRefetch,
  saveSemanticConfigWithRefetch,
} from "./semanticSetupActions";

describe("saveSemanticConfigWithRefetch", () => {
  it("saves draft payload then updates callers from refetched backend config", async () => {
    const savedPayloads: unknown[] = [];
    const refetched = semanticConfig({ apiKeySaved: true, deepseekApiKeySaved: true });
    const draft = createSemanticSetupDraft(semanticConfig({ apiKeySaved: false, deepseekApiKeySaved: true }));
    draft.apiKeyInput = "sk-new-glm";
    draft.chatProvider = "glm";
    draft.chatModel = "glm-5.1";

    const result = await saveSemanticConfigWithRefetch(draft, {
      saveConfig: async (payload) => {
        savedPayloads.push(payload);
      },
      fetchConfig: async () => refetched,
    });

    expect(savedPayloads).toHaveLength(1);
    expect(savedPayloads[0]).toMatchObject({
      chat_provider: "glm",
      chat_model: "glm-5.1",
      api_key: "sk-new-glm",
    });
    expect(result.config.credentials?.apiKeySaved).toBe(true);
    expect(result.config).toBe(refetched);
  });

  it("does not overwrite saved config when save fails", async () => {
    const draft = createSemanticSetupDraft(semanticConfig({ apiKeySaved: true, deepseekApiKeySaved: false }));

    await expect(
      saveSemanticConfigWithRefetch(draft, {
        saveConfig: async () => {
          throw new Error("synthetic save failed");
        },
        fetchConfig: async () => semanticConfig({ apiKeySaved: false, deepseekApiKeySaved: false }),
      }),
    ).rejects.toThrow("synthetic save failed");
  });
});

describe("runSemanticIndexActionWithRefetch", () => {
  it("runs the mapped sidecar action, then returns the refetched status and polling mode", async () => {
    const sidecarActions: string[] = [];
    const intent = deriveIndexActionIntent("resume", indexStatus("paused"));

    const result = await runSemanticIndexActionWithRefetch(intent, {
      manageIndex: async (action) => {
        sidecarActions.push(action);
      },
      fetchIndexStatus: async () => indexStatus("running"),
    });

    expect(sidecarActions).toEqual(["resume"]);
    expect(result.status.status).toBe("running");
    expect(result.polling).toBe("start");
  });

  it("refetches status for clear instead of fabricating a local idle status", async () => {
    const intent = deriveIndexActionIntent("clearIndex", indexStatus("ready"));

    const result = await runSemanticIndexActionWithRefetch(intent, {
      manageIndex: async () => undefined,
      fetchIndexStatus: async () => indexStatus("idle"),
    });

    expect(result.status.status).toBe("idle");
    expect(result.polling).toBe("stop");
  });
});

function semanticConfig(credentials: { apiKeySaved: boolean; deepseekApiKeySaved: boolean }): SemanticConfig {
  return {
    enabled: true,
    providers: {
      embedding: { provider: "ollama", model: "qwen3-embedding:8b", configured: true, dimension: 4096 },
      rerank: { provider: "ollama", model: "dengcao/Qwen3-Reranker-8B:Q5_K_M", configured: true, enabled: true },
      chat: { provider: "deepseek", model: "deepseek-chat", configured: true, enabled: true, thinking: false, maxTokens: 4096, temperature: 0.2 },
    },
    credentials,
    retrieval: { recallK: 30, topN: 8, similarityThreshold: 0.61 },
    readiness: {
      embeddingConfigured: true,
      rerankConfigured: true,
      chatConfigured: true,
      hasAnySavedCredential: credentials.apiKeySaved || credentials.deepseekApiKeySaved,
      readyForSearch: true,
      readyForQa: credentials.apiKeySaved || credentials.deepseekApiKeySaved,
    },
  };
}

function indexStatus(status: IndexStatusResponse["status"]): IndexStatusResponse {
  return {
    status,
    state: status,
    total: 100,
    completed: status === "ready" ? 100 : 0,
    ready: status === "ready",
    running: status === "running",
    paused: status === "paused",
    processed: status === "ready" ? 100 : 0,
    pending: status === "ready" ? 0 : 100,
    failed: 0,
    progressPct: status === "ready" ? 100 : 0,
  };
}

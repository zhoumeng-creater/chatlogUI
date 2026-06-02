import { describe, expect, it } from "vitest";
import {
  deriveCompactSemanticStatus,
  deriveSemanticModuleView,
  deriveSemanticQaView,
} from "./semanticViewModel";
import type { IndexStatusResponse, SemanticConfig } from "@/l2-coordinator/api-docs/semantic";

describe("deriveSemanticModuleView", () => {
  it("keeps missing provider scoped to semantic setup and does not block core workbench", () => {
    const view = deriveSemanticModuleView({
      config: missingConfig(),
      indexStatus: null,
      qaStatus: "idle",
    });

    expect(view.kind).toBe("setup_required");
    expect(view.blocksCoreWorkbench).toBe(false);
    expect(view.searchEnabled).toBe(false);
    expect(view.qaEnabled).toBe(false);
    expect(view.message).toContain("provider");
  });

  it("keeps config checking as a module view state instead of requiring L3 to read phase", () => {
    const view = deriveSemanticModuleView({
      phase: "checking_config",
      config: null,
      indexStatus: null,
      qaStatus: "idle",
    });

    expect(view.kind).toBe("checking_config");
    expect(view.statusLabel).toBe("Checking config");
    expect(view.searchEnabled).toBe(false);
    expect(view.qaEnabled).toBe(false);
  });

  it("maps running index progress to non-blocking indexing state", () => {
    const view = deriveSemanticModuleView({
      config: readyConfig(),
      indexStatus: indexStatus("running", { progressPct: 42, processed: 42, pending: 58 }),
      qaStatus: "idle",
    });

    expect(view.kind).toBe("index_running");
    expect(view.statusLabel).toBe("Indexing 42%");
    expect(view.searchEnabled).toBe(false);
    expect(view.qaEnabled).toBe(false);
  });

  it("enables semantic search and QA only when config and index are ready", () => {
    const view = deriveSemanticModuleView({
      config: readyConfig(),
      indexStatus: indexStatus("ready"),
      qaStatus: "completed",
    });

    expect(view.kind).toBe("ready");
    expect(view.searchEnabled).toBe(true);
    expect(view.qaEnabled).toBe(true);
  });

  it("keeps backend errors recoverable inside the semantic module", () => {
    const view = deriveSemanticModuleView({
      config: readyConfig(),
      indexStatus: indexStatus("error", { lastError: "embedding unavailable" }),
      qaStatus: "idle",
    });

    expect(view.kind).toBe("failed");
    expect(view.blocksCoreWorkbench).toBe(false);
    expect(view.message).toBe("embedding unavailable");
  });
});

describe("deriveSemanticQaView", () => {
  it("distinguishes connecting, streaming, stopped, failed, empty, and completed states", () => {
    expect(deriveSemanticQaView({ status: "connecting", answer: "" }).label).toBe("Connecting");
    expect(deriveSemanticQaView({ status: "streaming", answer: "partial" }).canStop).toBe(true);
    expect(deriveSemanticQaView({ status: "stopped", answer: "partial" }).label).toBe("Stopped");
    expect(deriveSemanticQaView({ status: "failed", answer: "", error: "provider failed" }).message).toBe("provider failed");
    expect(deriveSemanticQaView({ status: "empty", answer: "" }).label).toBe("No Answer");
    expect(deriveSemanticQaView({ status: "completed", answer: "done" }).label).toBe("Completed");
  });
});

describe("deriveCompactSemanticStatus", () => {
  it("maps compact StatusBar state from semantic config and index status", () => {
    expect(deriveCompactSemanticStatus({ config: missingConfig(), indexStatus: null, qaStatus: "idle" })).toEqual({
      label: "AI not configured",
      tone: "warning",
      busy: false,
    });
    expect(deriveCompactSemanticStatus({ config: readyConfig(), indexStatus: indexStatus("running", { progressPct: 50 }), qaStatus: "idle" })).toEqual({
      label: "Indexing 50%",
      tone: "info",
      busy: true,
    });
    expect(deriveCompactSemanticStatus({ config: readyConfig(), indexStatus: indexStatus("ready"), qaStatus: "idle" })).toEqual({
      label: "AI ready",
      tone: "ai",
      busy: false,
    });
    expect(deriveCompactSemanticStatus({ config: readyConfig(), indexStatus: indexStatus("ready"), qaStatus: "stopped" })).toEqual({
      label: "AI stopped",
      tone: "warning",
      busy: false,
    });
  });
});

function readyConfig(): SemanticConfig {
  return {
    enabled: true,
    providers: {
      embedding: { provider: "ollama", model: "nomic", configured: true, dimension: 768 },
      rerank: { provider: "ollama", model: "rerank", configured: true, enabled: true },
      chat: { provider: "deepseek", model: "deepseek-chat", configured: true, enabled: true },
    },
    credentials: { apiKeySaved: false, deepseekApiKeySaved: true },
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

function missingConfig(): SemanticConfig {
  return {
    enabled: true,
    providers: {
      embedding: { provider: "", model: "", configured: false, dimension: 0 },
      rerank: { provider: "", model: "", configured: false, enabled: false },
      chat: { provider: "", model: "", configured: false, enabled: true },
    },
    credentials: { apiKeySaved: false, deepseekApiKeySaved: false },
    readiness: {
      embeddingConfigured: false,
      rerankConfigured: false,
      chatConfigured: false,
      hasAnySavedCredential: false,
      readyForSearch: false,
      readyForQa: false,
    },
  };
}

function indexStatus(
  status: IndexStatusResponse["status"],
  overrides: Partial<IndexStatusResponse> = {},
): IndexStatusResponse {
  return {
    status,
    state: status,
    total: 100,
    completed: 100,
    ready: status === "ready",
    running: status === "running",
    paused: status === "paused",
    processed: 100,
    pending: 0,
    failed: 0,
    progressPct: 100,
    ...overrides,
  };
}

import { describe, expect, it } from "vitest";
import {
  adaptConnectionTestResult,
  adaptSemanticConfig,
  adaptSemanticIndexActionResult,
  adaptSemanticIndexStatus,
  adaptSemanticProfiles,
  adaptSemanticQAResponse,
  adaptSemanticSearch,
  adaptSemanticTopics,
  buildSemanticQARequestPayload,
} from "./semanticAdapters";

describe("adaptSemanticConfig", () => {
  it("maps flat snake_case config and saved credential flags without exposing raw keys", () => {
    const view = adaptSemanticConfig({
      enabled: true,
      base_url: "http://127.0.0.1:11434",
      ollama_base_url: "http://127.0.0.1:11434",
      deepseek_base_url: "https://api.deepseek.com",
      embedding_provider: "ollama",
      rerank_provider: "ollama",
      chat_provider: "deepseek",
      embedding_model: "nomic-embed-text",
      rerank_model: "bge-reranker",
      chat_model: "deepseek-chat",
      chat_thinking: false,
      chat_max_tokens: 4096,
      chat_temperature: 0.2,
      embedding_dimension: 768,
      enable_rerank: true,
      enable_qa: true,
      enable_topics: true,
      enable_profiles: true,
      enable_llm_chunk: false,
      realtime_index: true,
      index_workers: 2,
      recall_k: 30,
      top_n: 8,
      similarity_threshold: 0.61,
      has_api_key: true,
      has_deepseek_api_key: true,
      api_key: "",
      deepseek_api_key: "",
    });

    expect(view.enabled).toBe(true);
    expect(view.providers.embedding.provider).toBe("ollama");
    expect(view.providers.rerank.provider).toBe("ollama");
    expect(view.providers.chat.provider).toBe("deepseek");
    expect(view.providers.embedding.model).toBe("nomic-embed-text");
    expect(view.providers.rerank.model).toBe("bge-reranker");
    expect(view.providers.chat.model).toBe("deepseek-chat");
    expect(view.credentials.apiKeySaved).toBe(true);
    expect(view.credentials.deepseekApiKeySaved).toBe(true);
    expect(view.retrieval).toEqual({
      recallK: 30,
      topN: 8,
      similarityThreshold: 0.61,
    });
    expect(JSON.stringify(view)).not.toContain("sk-real-secret");
    expect(JSON.stringify(view)).not.toContain("api_key");
  });

  it("keeps embedding, rerank, and chat providers independent", () => {
    const view = adaptSemanticConfig({
      enabled: true,
      embedding_provider: "ollama",
      rerank_provider: "jina",
      chat_provider: "deepseek",
      embedding_model: "embed-model",
      rerank_model: "rerank-model",
      chat_model: "chat-model",
    });

    expect(view.providers.embedding.provider).toBe("ollama");
    expect(view.providers.rerank.provider).toBe("jina");
    expect(view.providers.chat.provider).toBe("deepseek");
    expect("provider" in view).toBe(false);
  });

  it("marks missing providers and credentials as semantic-only setup state", () => {
    const view = adaptSemanticConfig({
      enabled: true,
      embedding_provider: "",
      rerank_provider: "",
      chat_provider: "",
      has_api_key: false,
      has_deepseek_api_key: false,
    });

    expect(view.readiness.embeddingConfigured).toBe(false);
    expect(view.readiness.rerankConfigured).toBe(false);
    expect(view.readiness.chatConfigured).toBe(false);
    expect(view.readiness.hasAnySavedCredential).toBe(false);
    expect(view.readiness.readyForSearch).toBe(false);
    expect(view.readiness.readyForQa).toBe(false);
  });
});

describe("adaptConnectionTestResult", () => {
  it("maps ok test responses", () => {
    expect(adaptConnectionTestResult({ ok: true })).toEqual({
      ok: true,
      message: "Connection succeeded",
    });
  });

  it("maps failed test responses with backend error", () => {
    expect(adaptConnectionTestResult({ ok: false, error: "missing api key" })).toEqual({
      ok: false,
      message: "missing api key",
    });
  });
});

describe("adaptSemanticIndexStatus", () => {
  it("maps running progress from backend flags", () => {
    const status = adaptSemanticIndexStatus({
      ready: false,
      running: true,
      paused: false,
      processed: 41,
      pending: 59,
      failed: 1,
      progress_pct: 41.5,
    });

    expect(status.state).toBe("running");
    expect(status.progressPct).toBe(41.5);
    expect(status.processed).toBe(41);
    expect(status.pending).toBe(59);
    expect(status.failed).toBe(1);
  });

  it("maps ready and error details", () => {
    const ready = adaptSemanticIndexStatus({
      ready: true,
      running: false,
      paused: false,
      processed: 100,
      pending: 0,
      failed: 0,
      last_error: "",
    });
    const failed = adaptSemanticIndexStatus({
      ready: false,
      running: false,
      paused: false,
      processed: 12,
      pending: 0,
      failed: 2,
      last_error: "embedding unavailable",
    });

    expect(ready.state).toBe("ready");
    expect(ready.total).toBe(100);
    expect(failed.state).toBe("error");
    expect(failed.lastError).toBe("embedding unavailable");
  });

  it("maps extended index status fields and derived labels", () => {
    const status = adaptSemanticIndexStatus({
      ready: false,
      running: true,
      paused: false,
      processed: 42,
      pending: 58,
      failed: 0,
      indexed_count: 80,
      entity_count: 9,
      chunk_count: 120,
      started_at: "2026-06-04T00:00:00Z",
      processing_rate_per_minute: 12,
      estimated_seconds_left: 125,
      last_incremental_at: "2026-06-04T00:10:00Z",
      last_incremental_added: 3,
      last_incremental_error: "",
      last_rerank_at: "2026-06-04T00:12:00Z",
      last_rerank_applied: true,
      last_rerank_error: "",
    });

    expect(status).toMatchObject({
      indexedCount: 80,
      entityCount: 9,
      chunkCount: 120,
      startedAt: "2026-06-04T00:00:00Z",
      processingRatePerMinute: 12,
      estimatedSecondsLeft: 125,
      lastIncrementalAt: "2026-06-04T00:10:00Z",
      lastIncrementalAdded: 3,
      lastIncrementalError: "",
      lastRerankAt: "2026-06-04T00:12:00Z",
      lastRerankApplied: true,
      lastRerankError: "",
      progressLabel: "42/100 processed",
      etaLabel: "2m 5s left",
      rateLabel: "12/min",
      coverageSummary: "80 indexed · 9 entities · 120 chunks",
      lastActivityLabel: "Incremental +3 · rerank applied",
    });
  });
});

describe("semantic response adapters", () => {
  it("maps backend-shaped semantic search metadata and result rows", () => {
    const search = adaptSemanticSearch({
      query: "release",
      chat: "wxid_filter",
      source_count: 25,
      window: "all",
      depth: "standard",
      count: 1,
      rerank: true,
      rerank_tried: true,
      rerank_applied: false,
      rerank_error: "rerank unavailable",
      results: [
        {
          talker: "wxid_a",
          talker_name: "Project room",
          sender: "wxid_sender",
          sender_name: "Alice",
          seq: 123,
          time: 1717044000,
          content: "Release checklist",
          score: 0.91,
          rerank_score: 0.42,
        },
      ],
    });

    expect(search.chat).toBe("wxid_filter");
    expect(search.count).toBe(1);
    expect(search.totalCount).toBe(1);
    expect(search.rerank.enabled).toBe(true);
    expect(search.rerank.tried).toBe(true);
    expect(search.rerank.applied).toBe(false);
    expect(search.rerank.error).toBe("rerank unavailable");
    expect(search.results[0].chat).toBe("wxid_a");
    expect(search.results[0].chatName).toBe("Project room");
    expect(search.results[0].sender).toBe("Alice");
    expect(search.results[0].senderId).toBe("wxid_sender");
    expect(search.results[0].localId).toBe(123);
    expect(search.results[0].time).not.toBe("");
    expect(search.results[0].content).toBe("Release checklist");
    expect(search.results[0].relevanceScore).toBe(0.91);
  });

  it("maps topics window, daily rows, summary, and summary errors", () => {
    const topics = adaptSemanticTopics({
      window: "30d",
      window_label: "Last 30 days",
      from: 1717000000,
      to: 1719600000,
      count: 2,
      truncated: false,
      topics: [{ topic: "shipping", count: 3, keywords: ["release"] }],
      daily: [{ date: "2026-05-30", count: 3 }],
      summary: "Shipping dominated the conversation.",
      summary_error: "partial summary unavailable",
    });

    expect(topics.windowLabel).toBe("Last 30 days");
    expect(topics.count).toBe(2);
    expect(topics.truncated).toBe(false);
    expect(topics.topics[0].keywords).toEqual(["release"]);
    expect(topics.daily).toEqual([{ date: "2026-05-30", count: 3 }]);
    expect(topics.summaryError).toBe("partial summary unavailable");
  });

  it("maps backend-shaped profiles and type distribution rows", () => {
    const profiles = adaptSemanticProfiles({
      window: "all",
      window_label: "All time",
      count: 1,
      profiles: [
        {
          sender: "wxid_sender",
          sender_name: "Alice",
          messages: 42,
          top_keywords: [
            { topic: "release", count: 7 },
            { topic: "design", count: 3 },
          ],
        },
      ],
      type_distribution: [
        { type: "person", count: 1 },
        { type: "room", count: 2 },
      ],
      summary: "Profile summary",
      summary_error: "",
    });

    expect(profiles.windowLabel).toBe("All time");
    expect(profiles.profiles[0].sender).toBe("wxid_sender");
    expect(profiles.profiles[0].senderName).toBe("Alice");
    expect(profiles.profiles[0].messages).toBe(42);
    expect(profiles.profiles[0].topKeywords[0]).toEqual({ topic: "release", count: 7 });
    expect(profiles.typeDistribution).toEqual([
      { type: "person", count: 1 },
      { type: "room", count: 2 },
    ]);
    expect(profiles.summary).toBe("Profile summary");
  });

  it("maps index action responses", () => {
    expect(adaptSemanticIndexActionResult({ ok: true, accepted: true, status: "running" })).toEqual({
      ok: true,
      accepted: true,
      status: "running",
      error: "",
    });
  });
});

describe("buildSemanticQARequestPayload", () => {
  it("builds the backend QA body and omits UI-only scope", () => {
    const payload = buildSemanticQARequestPayload({
      query: "What changed?",
      chat: "wxid_a",
      chats: ["wxid_a", "room@chatroom"],
      window: "30d",
      entityOverride: "Alice",
      retrievalDepth: "deep",
      sourceLimit: 6,
      topN: 4,
      history: [{ role: "user", content: "Previous question" }],
      scope: "contact",
    });

    expect(payload).toEqual({
      query: "What changed?",
      chat: "wxid_a",
      chats: ["wxid_a", "room@chatroom"],
      window: "30d",
      entity_override: "Alice",
      retrieval_depth: "deep",
      source_limit: 6,
      top_n: 4,
      history: [{ role: "user", content: "Previous question" }],
    });
    expect("scope" in payload).toBe(false);
  });
});

describe("adaptSemanticQAResponse", () => {
  it("maps done payload metadata needed by QA completion state", () => {
    const qa = adaptSemanticQAResponse({
      answer: "Final answer",
      evidence: [{ content: "Synthetic private message body", score: 0.8, type: "message" }],
      reason: "complete",
      source_count: 1,
      window: "30d",
      depth: "deep",
      rerank_tried: true,
      rerank_applied: true,
      rerank_error: "",
      metadata: {
        source_count: 2,
        window: "7d",
      },
    });

    expect(qa).toMatchObject({
      answer: "Final answer",
      reason: "complete",
      sourceCount: 1,
      window: "30d",
      depth: "deep",
      rerankTried: true,
      rerankApplied: true,
      rerankError: "",
    });
    expect(qa.evidence).toHaveLength(1);
    expect(qa.metadata).toMatchObject({ source_count: 2, window: "7d" });
  });
});

import { describe, expect, it } from "vitest";
import {
  adaptConnectionTestResult,
  adaptSemanticQAResponse,
  adaptSemanticConfig,
  adaptSemanticIndexActionResult,
  adaptSemanticIndexStatus,
  adaptSemanticProfiles,
  adaptSemanticSearch,
  adaptSemanticTopics,
  buildSemanticQARequestPayload,
} from "./semanticAdapters";
import { containsSensitiveDiagnosticText } from "@/utils/maskSecrets";

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

  it("redacts sensitive backend connection errors before they reach setup UI", () => {
    const result = adaptConnectionTestResult({
      ok: false,
      error: [
        "api_key=sk-real-secret",
        "token=raw-token",
        "message: synthetic-private-message",
        "C:\\Users\\Alice\\WeChat Files\\wxid_real",
      ].join(" "),
    });

    expect(result.message).not.toContain("sk-real-secret");
    expect(result.message).not.toContain("raw-token");
    expect(result.message).not.toContain("synthetic-private-message");
    expect(result.message).not.toContain("Alice");
    expect(result.message).not.toContain("wxid_real");
    expect(containsSensitiveDiagnosticText(result.message)).toBe(false);
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

  it("maps extended index coverage, timing, incremental, rerank, and derived labels", () => {
    const status = adaptSemanticIndexStatus({
      ready: false,
      running: true,
      paused: false,
      processed: 250,
      pending: 50,
      failed: 5,
      progress_pct: 82,
      indexed_count: 240,
      entity_count: 48,
      chunk_count: 1024,
      started_at: "2026-06-04T01:00:00Z",
      processing_rate_per_minute: 120,
      estimated_seconds_left: 95,
      last_incremental_at: "2026-06-04T01:15:00Z",
      last_incremental_added: 12,
      last_incremental_error: "",
      last_rerank_at: "2026-06-04T01:16:00Z",
      last_rerank_applied: true,
      last_rerank_error: "",
    });

    expect(status.indexedCount).toBe(240);
    expect(status.entityCount).toBe(48);
    expect(status.chunkCount).toBe(1024);
    expect(status.startedAt).toBe("2026-06-04T01:00:00Z");
    expect(status.processingRatePerMinute).toBe(120);
    expect(status.estimatedSecondsLeft).toBe(95);
    expect(status.lastIncrementalAt).toBe("2026-06-04T01:15:00Z");
    expect(status.lastIncrementalAdded).toBe(12);
    expect(status.lastIncrementalError).toBe("");
    expect(status.lastRerankAt).toBe("2026-06-04T01:16:00Z");
    expect(status.lastRerankApplied).toBe(true);
    expect(status.lastRerankError).toBe("");
    expect(status.progressLabel).toBe("250 / 305 processed");
    expect(status.etaLabel).toBe("2 min remaining");
    expect(status.rateLabel).toBe("120/min");
    expect(status.coverageLabel).toBe("240 indexed / 48 entities / 1024 chunks");
    expect(status.lastActivityLabel).toBe("Incremental +12; rerank applied");
  });

  it("redacts incremental and rerank backend errors before deriving index labels", () => {
    const status = adaptSemanticIndexStatus({
      ready: false,
      running: false,
      paused: false,
      processed: 12,
      pending: 0,
      failed: 2,
      last_error: "",
      last_incremental_error: "api_key=sk-real-secret message: synthetic-private-message",
      last_rerank_error: "C:\\Users\\Alice\\WeChat Files\\wxid_real token=raw-token",
    });

    expect(status.lastIncrementalError).not.toContain("sk-real-secret");
    expect(status.lastRerankError).not.toContain("raw-token");
    expect(status.lastActivityLabel).not.toContain("synthetic-private-message");
    expect(status.lastActivityLabel).not.toContain("Alice");
    expect(status.lastActivityLabel).not.toContain("wxid_real");
    expect(containsSensitiveDiagnosticText(status.lastActivityLabel)).toBe(false);
  });
});

describe("semantic response adapters", () => {
  it("maps sidecar QA done top-level metadata without copying raw debug payloads", () => {
    const done = adaptSemanticQAResponse({
      query: "private synthetic question",
      chat: "wxid_should_not_copy",
      source_count: 3,
      window: "30d",
      depth: "deep",
      count: 2,
      answer: "Synthetic answer",
      evidence: [
        {
          source: "message",
          chunk_type: "message",
          score: 0.91,
          rerank_score: 0.72,
          content: "Synthetic evidence body",
        },
      ],
      direct: false,
      debug: {
        intent: "person_lookup",
        answer_mode: "rag",
        source: "planner",
        retrieval: "vector/rag",
        entity_query: "Alice real name",
        entity_candidates: [
          {
            display: "Alice",
            username: "wxid_alice",
            kind: "person",
            source: "contacts",
            raw_note: "should not copy",
          },
        ],
        entity_candidate_count: 1,
        entity_ambiguous: true,
        prompt: "private prompt should not copy",
      },
      reason: "completed",
      rerank_tried: true,
      rerank_applied: false,
      rerank_error: "synthetic rerank unavailable",
      metadata: {
        existing: "kept",
        query: "nested private query should not copy",
      },
    });

    expect(done.metadata).toMatchObject({
      existing: "kept",
      sourceCount: 3,
      window: "30d",
      depth: "deep",
      evidenceCount: 2,
      direct: false,
      rerankTried: true,
      rerankApplied: false,
      rerankError: "synthetic rerank unavailable",
      intent: "person_lookup",
      answerMode: "rag",
      routeSource: "planner",
      retrieval: "vector/rag",
      entityCandidateCount: 1,
      entityAmbiguous: true,
      entityCandidates: [
        {
          display: "Alice",
          username: "wxid_alice",
          kind: "person",
          source: "contacts",
        },
      ],
    });
    expect(done.metadata).not.toHaveProperty("debug");
    expect(done.metadata).not.toHaveProperty("query");
    expect(done.metadata).not.toHaveProperty("chat");
    expect(JSON.stringify(done.metadata)).not.toContain("private synthetic question");
    expect(JSON.stringify(done.metadata)).not.toContain("private prompt");
    expect(JSON.stringify(done.metadata)).not.toContain("raw_note");
  });

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

  it("redacts index action backend errors before callers render them", () => {
    const result = adaptSemanticIndexActionResult({
      ok: false,
      accepted: false,
      status: "error",
      error: "token=raw-token query=synthetic-private-message C:\\Users\\Alice\\WeChat Files\\wxid_real",
    });

    expect(result.error).not.toContain("raw-token");
    expect(result.error).not.toContain("synthetic-private-message");
    expect(result.error).not.toContain("Alice");
    expect(result.error).not.toContain("wxid_real");
    expect(containsSensitiveDiagnosticText(result.error)).toBe(false);
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

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchIndexStatus } from "./fetchIndexStatus";
import { fetchSemanticConfig, setSemanticConfig } from "./fetchSemanticConfig";
import { fetchSemanticProfiles } from "./fetchSemanticProfiles";
import { fetchSemanticQA } from "./fetchSemanticQA";
import { fetchSemanticSearch } from "./fetchSemanticSearch";
import { fetchSemanticTopics } from "./fetchSemanticTopics";
import { manageIndex } from "./manageIndex";
import { testLLMConnection } from "./testLLMConnection";
import type { DiagnosticEvent } from "./diagnosticEvents";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("semantic REST atoms", () => {
  it("uses JSON-format REST calls and adapts semantic responses", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        calls.push({ url, init });
        const path = new URL(url).pathname;

        if (path.endsWith("/api/v1/semantic/config") && init?.method === "POST") {
          return json({ ok: true });
        }
        if (path.endsWith("/api/v1/semantic/config")) {
          return json({
            enabled: true,
            embedding_provider: "ollama",
            embedding_model: "nomic-embed-text",
            rerank_provider: "ollama",
            rerank_model: "bge-reranker",
            chat_provider: "deepseek",
            chat_model: "deepseek-chat",
            has_api_key: false,
            has_deepseek_api_key: true,
          });
        }
        if (path.endsWith("/api/v1/semantic/index/status")) {
          return json({
            ready: false,
            running: true,
            paused: false,
            processed: 5,
            pending: 5,
            failed: 0,
            progress_pct: 50,
          });
        }
        if (path.endsWith("/api/v1/semantic/search")) {
          return json({
            query: "alpha",
            source_count: 1,
            count: 1,
            rerank: true,
            rerank_tried: true,
            rerank_applied: true,
            results: [
              {
                talker: "wxid_a",
                talker_name: "Project room",
                sender: "wxid_sender",
                sender_name: "Alice",
                content: "alpha",
                score: 0.8,
                seq: 7,
              },
            ],
          });
        }
        if (path.endsWith("/api/v1/semantic/topics")) {
          return json({
            window_label: "Last 7 days",
            count: 1,
            topics: [{ topic: "release", count: 2 }],
            daily: [],
          });
        }
        if (path.endsWith("/api/v1/semantic/profiles")) {
          return json({
            window_label: "All time",
            count: 1,
            profiles: [
              {
                sender: "wxid_sender",
                sender_name: "Alice",
                messages: 42,
                top_keywords: [{ topic: "release", count: 7 }],
              },
            ],
            type_distribution: [{ type: "person", count: 1 }],
          });
        }
        if (path.endsWith("/api/v1/semantic/test")) {
          return json({ ok: false, error: "missing api key" });
        }
        if (path.endsWith("/api/v1/semantic/index/rebuild")) {
          return json({ ok: true, accepted: true, status: "running" });
        }
        if (path.endsWith("/api/v1/semantic/qa")) {
          return json({ answer: "Final answer", evidence: [{ chat: "wxid_a" }], reason: "done" });
        }

        return json({});
      }),
    );

    const config = await fetchSemanticConfig();
    await setSemanticConfig({ embedding_provider: "ollama", api_key: "" });
    const indexStatus = await fetchIndexStatus();
    const search = await fetchSemanticSearch({ query: "alpha", chat: "wxid_a", scope: "contact" });
    const topics = await fetchSemanticTopics("wxid_a");
    const profiles = await fetchSemanticProfiles("wxid_a");
    const connection = await testLLMConnection("deepseek", { chat_model: "deepseek-chat" });
    const action = await manageIndex("rebuild");
    const qa = await fetchSemanticQA({ query: "alpha", chat: "wxid_a", scope: "contact" });

    expect(config?.providers?.chat.provider).toBe("deepseek");
    expect(indexStatus.state).toBe("running");
    expect(search.sourceCount).toBe(1);
    expect(search.totalCount).toBe(1);
    expect(search.results[0].chatName).toBe("Project room");
    expect(topics.windowLabel).toBe("Last 7 days");
    expect(profiles.typeDistribution).toEqual([{ type: "person", count: 1 }]);
    expect(profiles.profiles?.[0]?.senderName).toBe("Alice");
    expect(connection).toMatchObject({ ok: false, message: "missing api key" });
    expect(action).toEqual({ ok: true, accepted: true, status: "running", error: "" });
    expect(qa.answer).toBe("Final answer");

    expect(calls.map((call) => call.url)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("format=json"),
      ]),
    );
    expect(calls.every((call) => call.url.includes("format=json"))).toBe(true);

    const qaBody = JSON.parse(String(calls.find((call) => call.url.includes("/semantic/qa?"))?.init?.body));
    expect(qaBody).toEqual({ query: "alpha", chat: "wxid_a" });
  });

  it("emits safe diagnostic events for semantic REST fetchers and actions", async () => {
    const diagnosticEvents: DiagnosticEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const path = new URL(String(input)).pathname;

        if (path.endsWith("/api/v1/semantic/config") && init?.method === "POST") {
          return json({ ok: true });
        }
        if (path.endsWith("/api/v1/semantic/config")) {
          return json({ enabled: false });
        }
        if (path.endsWith("/api/v1/semantic/index/status")) {
          return json({ ready: false, running: false, paused: true, processed: 0, pending: 1 });
        }
        if (path.endsWith("/api/v1/semantic/search")) {
          return json({ query: "private query", source_count: 0, count: 0, results: [] });
        }
        if (path.endsWith("/api/v1/semantic/topics")) {
          return json({ count: 0, topics: [], daily: [] });
        }
        if (path.endsWith("/api/v1/semantic/profiles")) {
          return json({ count: 0, profiles: [], type_distribution: [] });
        }
        if (path.endsWith("/api/v1/semantic/test")) {
          return json({ ok: true });
        }
        if (path.includes("/api/v1/semantic/index/")) {
          return json({ ok: true, accepted: true, status: "running" });
        }
        if (path.endsWith("/api/v1/semantic/qa")) {
          return json({ answer: "synthetic answer", evidence: [], reason: "done" });
        }

        return json({});
      }),
    );

    const diagnostics = {
      diagnostics: { correlationId: "semantic-smoke", recoveryHint: "retry" as const },
      onDiagnosticEvent: (event: DiagnosticEvent) => diagnosticEvents.push(event),
    };

    await fetchSemanticConfig(diagnostics);
    await setSemanticConfig({ api_key: "synthetic-secret" }, diagnostics);
    await fetchIndexStatus(diagnostics);
    await fetchSemanticSearch({ query: "private semantic query", chat: "wxid_private" }, diagnostics);
    await fetchSemanticTopics("wxid_private", diagnostics);
    await fetchSemanticProfiles("wxid_private", diagnostics);
    await testLLMConnection("deepseek", { api_key: "synthetic-secret" }, diagnostics);
    await manageIndex("rebuild", diagnostics);
    await fetchSemanticQA({ query: "private question", chat: "wxid_private" }, diagnostics);

    expect(diagnosticEvents.map((event) => event.attributes?.endpointFamily)).toEqual(
      expect.arrayContaining([
        "semantic-config",
        "semantic-index-status",
        "semantic-search",
        "semantic-topics",
        "semantic-profiles",
        "semantic-test",
        "semantic-index-action",
        "semantic-qa",
      ]),
    );
    expect(diagnosticEvents.every((event) => event.correlationId === "semantic-smoke")).toBe(true);
    expect(JSON.stringify(diagnosticEvents)).not.toContain("private semantic query");
    expect(JSON.stringify(diagnosticEvents)).not.toContain("synthetic-secret");
    expect(JSON.stringify(diagnosticEvents)).not.toContain("wxid_private");
  });
});

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

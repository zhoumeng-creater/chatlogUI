import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import { fetchIndexStatus } from "./fetchIndexStatus";
import { fetchSemanticConfig, setSemanticConfig } from "./fetchSemanticConfig";
import { fetchSemanticProfiles } from "./fetchSemanticProfiles";
import { fetchSemanticQA } from "./fetchSemanticQA";
import { fetchSemanticSearch } from "./fetchSemanticSearch";
import { fetchSemanticTopics } from "./fetchSemanticTopics";
import { manageIndex } from "./manageIndex";
import { testLLMConnection } from "./testLLMConnection";

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
                talker: "wxid_synthetic_a",
                talker_name: "Project room",
                sender: "wxid_synthetic_sender",
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
                sender: "wxid_synthetic_sender",
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
          return json({ answer: "Final answer", evidence: [{ chat: "wxid_synthetic_a" }], reason: "done" });
        }

        return json({});
      }),
    );

    const config = await fetchSemanticConfig();
    await setSemanticConfig({ embedding_provider: "ollama", api_key: "" });
    const indexStatus = await fetchIndexStatus();
    const search = await fetchSemanticSearch({ query: "alpha", chat: "wxid_synthetic_a", scope: "contact" });
    const topics = await fetchSemanticTopics("wxid_synthetic_a");
    const profiles = await fetchSemanticProfiles("wxid_synthetic_a");
    const connection = await testLLMConnection("deepseek", { chat_model: "deepseek-chat" });
    const action = await manageIndex("rebuild");
    const qa = await fetchSemanticQA({ query: "alpha", chat: "wxid_synthetic_a", scope: "contact" });

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
    expect(qaBody).toEqual({ query: "alpha", chat: "wxid_synthetic_a" });
  });

  it("emits redacted semantic diagnostic events when diagnostics are supplied", async () => {
    const events: DiagnosticEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json({
          query: "alpha",
          source_count: 0,
          count: 0,
          rerank: false,
          results: [],
        }),
      ),
    );

    await fetchSemanticSearch(
      { query: "Synthetic private message for redaction test only", chat: "wxid_synthetic_redaction_case" },
      {
        diagnostics: { endpointFamily: "semantic", recoveryHint: "retry" },
        onDiagnosticEvent: (event) => events.push(event),
      },
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "http",
      category: "http.request",
      attributes: { endpointFamily: "semantic" },
    });
    expect(JSON.stringify(events[0])).not.toContain("Synthetic private message");
    expect(JSON.stringify(events[0])).not.toContain("wxid_synthetic");
  });

  it("uses the supplied active service base URL for semantic requests", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        urls.push(String(input));
        return json({ query: "alpha", source_count: 0, count: 0, rerank: false, results: [] });
      }),
    );

    await fetchSemanticSearch(
      { query: "alpha" },
      { serviceBaseUrl: "http://127.0.0.1:6041" },
    );

    expect(new URL(urls[0]).origin).toBe("http://127.0.0.1:6041");
  });

  it("sends semantic discovery request parameters without UI-only labels", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        urls.push(String(input));
        const path = new URL(String(input)).pathname;
        if (path.endsWith("/api/v1/semantic/search")) {
          return json({ query: "alpha", source_count: 0, count: 0, rerank: false, results: [] });
        }
        if (path.endsWith("/api/v1/semantic/topics")) {
          return json({ window: "30d", window_label: "Last 30 days", topics: [], daily: [] });
        }
        if (path.endsWith("/api/v1/semantic/profiles")) {
          return json({ window: "30d", window_label: "Last 30 days", profiles: [], type_distribution: [] });
        }
        return json({});
      }),
    );

    await fetchSemanticSearch({
      query: "alpha",
      limit: 12,
      chat: "wxid_synthetic_backend_chat",
      chats: ["room_a@chatroom", "wxid_synthetic_b"],
      window: "30d",
      depth: "deep",
      sourceLimit: 25,
      rerank: false,
      scope: "all",
      chatName: "Project room",
    } as never);
    await fetchSemanticTopics({ chat: "wxid_synthetic_backend_chat", window: "30d" } as never);
    await fetchSemanticProfiles({ chat: "wxid_synthetic_backend_chat", window: "30d" } as never);

    const searchUrl = new URL(urls.find((url) => url.includes("/semantic/search")) ?? "");
    expect(searchUrl.searchParams.get("query")).toBe("alpha");
    expect(searchUrl.searchParams.get("limit")).toBe("12");
    expect(searchUrl.searchParams.get("chat")).toBe("wxid_synthetic_backend_chat");
    expect(searchUrl.searchParams.get("chats")).toBe("room_a@chatroom,wxid_synthetic_b");
    expect(searchUrl.searchParams.get("window")).toBe("30d");
    expect(searchUrl.searchParams.get("depth")).toBe("deep");
    expect(searchUrl.searchParams.get("source_limit")).toBe("25");
    expect(searchUrl.searchParams.get("rerank")).toBe("false");
    expect(searchUrl.searchParams.has("scope")).toBe(false);
    expect(searchUrl.searchParams.has("chatName")).toBe(false);
    expect(searchUrl.searchParams.has("chat_name")).toBe(false);

    const topicsUrl = new URL(urls.find((url) => url.includes("/semantic/topics")) ?? "");
    expect(topicsUrl.searchParams.get("chat")).toBe("wxid_synthetic_backend_chat");
    expect(topicsUrl.searchParams.get("window")).toBe("30d");

    const profilesUrl = new URL(urls.find((url) => url.includes("/semantic/profiles")) ?? "");
    expect(profilesUrl.searchParams.get("chat")).toBe("wxid_synthetic_backend_chat");
    expect(profilesUrl.searchParams.get("window")).toBe("30d");
  });
});

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

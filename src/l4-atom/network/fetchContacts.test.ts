import { describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import { fetchConversations } from "./fetchContacts";
import { fetchSearch } from "./fetchSearch";
import { withJsonFormat } from "./httpClient";

describe("fetchContacts url construction", () => {
  it("builds sessions URL with format=json and query params", () => {
    const url = withJsonFormat("http://127.0.0.1:5030/api/v1/sessions?limit=50&query=test");
    const u = new URL(url);
    expect(u.searchParams.get("format")).toBe("json");
    expect(u.searchParams.get("limit")).toBe("50");
    expect(u.searchParams.get("query")).toBe("test");
  });

  it("builds history URL with chat and offset", () => {
    const url = withJsonFormat("http://127.0.0.1:5030/api/v1/history?chat=wxid_synthetic_test&limit=50&offset=0");
    const u = new URL(url);
    expect(u.searchParams.get("format")).toBe("json");
    expect(u.searchParams.get("chat")).toBe("wxid_synthetic_test");
    expect(u.searchParams.get("limit")).toBe("50");
  });

  it("builds search URL with correct param names", () => {
    const url = withJsonFormat("http://127.0.0.1:5030/api/v1/search?keyword=hello&chats=wxid_synthetic_a,room&msg_type=3&limit=20");
    const u = new URL(url);
    expect(u.searchParams.get("keyword")).toBe("hello");
    expect(u.searchParams.get("chats")).toBe("wxid_synthetic_a,room");
    expect(u.searchParams.get("msg_type")).toBe("3");
  });

  it("builds stats URL with time param", () => {
    const url = withJsonFormat("http://127.0.0.1:5030/api/v1/stats?chat=wxid_synthetic_test&time=last-7d");
    const u = new URL(url);
    expect(u.searchParams.get("chat")).toBe("wxid_synthetic_test");
    expect(u.searchParams.get("time")).toBe("last-7d");
  });

  it("builds dashboard trend URL", () => {
    const url = withJsonFormat("http://127.0.0.1:5030/api/v1/dashboard/trend?window=7d&summary=0");
    const u = new URL(url);
    expect(u.searchParams.get("window")).toBe("7d");
    expect(u.searchParams.get("summary")).toBe("0");
  });

  it("does not double-add format=json", () => {
    const url = withJsonFormat("http://127.0.0.1:5030/api/v1/db?format=json");
    expect(url).toBe("http://127.0.0.1:5030/api/v1/db?format=json");
  });

  it("emits a redacted search diagnostic event when diagnostics are supplied", async () => {
    const events: DiagnosticEvent[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ count: 0, messages: [] }), { status: 200 });

    try {
      await fetchSearch(
        { keyword: "Synthetic private message for redaction test only", chats: ["wxid_synthetic_redaction_case"] },
        {
          diagnostics: { endpointFamily: "search", recoveryHint: "retry" },
          onDiagnosticEvent: (event) => events.push(event),
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "http",
      category: "http.request",
      attributes: { endpointFamily: "search" },
    });
    expect(JSON.stringify(events[0])).not.toContain("Synthetic private message");
    expect(JSON.stringify(events[0])).not.toContain("wxid_synthetic");
  });

  it("keeps concrete endpoint families when conversation diagnostics are shared", async () => {
    const events: DiagnosticEvent[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);

      if (url.includes("/api/v1/sessions")) {
        return new Response(JSON.stringify({ sessions: [] }), { status: 200 });
      }

      if (url.includes("/api/v1/contacts")) {
        return new Response(JSON.stringify({ count: 0, contacts: [] }), { status: 200 });
      }

      if (url.includes("/api/v1/chatrooms")) {
        return new Response(JSON.stringify({ count: 0, chatrooms: [] }), { status: 200 });
      }

      return new Response("not found", { status: 404 });
    };

    try {
      await fetchConversations(
        { limit: 1 },
        {
          diagnostics: {
            endpointFamily: "conversations",
            correlationId: "conversation-refresh",
            recoveryHint: "retry",
          },
          onDiagnosticEvent: (event) => events.push(event),
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(events).toHaveLength(3);
    expect(events.map((event) => event.attributes?.endpointFamily).sort()).toEqual([
      "chatrooms",
      "contacts",
      "sessions",
    ]);
    expect(new Set(events.map((event) => event.correlationId))).toEqual(
      new Set(["conversation-refresh"]),
    );
  });

  it("passes caller abort signals through search diagnostics options", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const originalFetch = globalThis.fetch;
    type Outcome =
      | { status: "pending" }
      | { status: "rejected"; error: unknown }
      | { status: "resolved" };
    let outcomePromise: Promise<Outcome> | undefined;

    globalThis.fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });

    try {
      outcomePromise = fetchSearch(
        { keyword: "Synthetic abort query", limit: 1 },
        {
          signal: controller.signal,
          diagnostics: { endpointFamily: "search", recoveryHint: "retry" },
        },
      ).then(
        () => ({ status: "resolved" }),
        (error: unknown) => ({ status: "rejected", error }),
      );
      const pendingMarker = new Promise<Outcome>((resolve) => {
        setTimeout(() => resolve({ status: "pending" }), 1);
      });

      controller.abort();
      await vi.advanceTimersByTimeAsync(1);

      await expect(Promise.race([outcomePromise, pendingMarker])).resolves.toMatchObject({
        status: "rejected",
        error: {
          name: "ChatlogHttpError",
          message: "请求已取消",
        },
      });
    } finally {
      await vi.advanceTimersByTimeAsync(20000);
      await outcomePromise;
      vi.useRealTimers();
      globalThis.fetch = originalFetch;
    }
  });

  it("uses the active service base URL for conversation requests", async () => {
    const urls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      urls.push(url);

      if (url.includes("/api/v1/sessions")) {
        return new Response(JSON.stringify({ sessions: [] }), { status: 200 });
      }

      if (url.includes("/api/v1/contacts")) {
        return new Response(JSON.stringify({ count: 0, contacts: [] }), { status: 200 });
      }

      if (url.includes("/api/v1/chatrooms")) {
        return new Response(JSON.stringify({ count: 0, chatrooms: [] }), { status: 200 });
      }

      return new Response("not found", { status: 404 });
    };

    try {
      await fetchConversations(
        { limit: 1 },
        {
          serviceBaseUrl: "http://127.0.0.1:6041",
          diagnostics: {
            endpointFamily: "conversations",
            recoveryHint: "retry",
          },
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(urls.map((url) => new URL(url).origin)).toEqual([
      "http://127.0.0.1:6041",
      "http://127.0.0.1:6041",
      "http://127.0.0.1:6041",
    ]);
  });
});

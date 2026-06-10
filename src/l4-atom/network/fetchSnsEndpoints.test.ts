import { describe, expect, it } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import { fetchSnsFeed } from "./fetchSnsFeed";
import { fetchSnsNotifications } from "./fetchSnsNotifications";
import { fetchSnsSearch } from "./fetchSnsSearch";

describe("P4-C SNS fetchers", () => {
  it("calls feed, search, and notifications with JSON format and typed SNS params", async () => {
    const urls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      urls.push(url);

      if (url.includes("/api/v1/sns_notifications")) {
        return new Response(JSON.stringify({ total: 0, notifications: [] }), { status: 200 });
      }

      return new Response(JSON.stringify({ count: 0, items: [] }), { status: 200 });
    };

    try {
      await fetchSnsFeed({
        limit: 40,
        user: "sns-author",
        since: "2026-01-01",
        until: "2026-01-31",
        media: true,
        replace: true,
      });
      await fetchSnsSearch({
        keyword: "synthetic query",
        limit: 10,
        user: "sns-author",
        media: true,
        replace: true,
      });
      await fetchSnsNotifications({ limit: 5, includeRead: true, time: "2026-01" });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(urls.map((url) => new URL(url).pathname)).toEqual([
      "/api/v1/sns_feed",
      "/api/v1/sns_search",
      "/api/v1/sns_notifications",
    ]);
    expect(urls.every((url) => new URL(url).searchParams.get("format") === "json")).toBe(true);
    expect(new URL(urls[0]).searchParams.get("limit")).toBe("40");
    expect(new URL(urls[0]).searchParams.get("media")).toBe("1");
    expect(new URL(urls[0]).searchParams.get("replace")).toBe("1");
    expect(new URL(urls[1]).searchParams.get("keyword")).toBe("synthetic query");
    expect(new URL(urls[2]).searchParams.get("include_read")).toBe("true");
  });

  it("does not call the backend for blank search keywords", async () => {
    let calls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ count: 0, items: [] }), { status: 200 });
    };

    try {
      await expect(fetchSnsSearch({ keyword: "   " })).rejects.toThrow("SNS search keyword is required");
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toBe(0);
  });

  it("emits redacted diagnostic events without keyword, user, proxy URL, or media key", async () => {
    const events: DiagnosticEvent[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ count: 0, items: [] }), { status: 200 });

    try {
      await fetchSnsSearch(
        {
          keyword: "sns-private-keyword",
          user: "sns-private-user",
          limit: 1,
          media: true,
          replace: true,
        },
        {
          diagnostics: {
            endpointFamily: "sns_search",
            correlationId: "p4c-sns",
            recoveryHint: "retry",
          },
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
      correlationId: "p4c-sns",
      attributes: { endpointFamily: "sns_search" },
    });
    expect(JSON.stringify(events[0])).not.toContain("sns-private-keyword");
    expect(JSON.stringify(events[0])).not.toContain("sns-private-user");
    expect(JSON.stringify(events[0])).not.toContain("sns/media/proxy");
    expect(JSON.stringify(events[0])).not.toContain("key=");
  });

  it("uses the supplied active service base URL for SNS requests", async () => {
    const urls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify({ count: 0, items: [] }), { status: 200 });
    };

    try {
      await fetchSnsFeed(
        { limit: 10 },
        { serviceBaseUrl: "http://127.0.0.1:6041" },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(new URL(urls[0]).origin).toBe("http://127.0.0.1:6041");
  });
});

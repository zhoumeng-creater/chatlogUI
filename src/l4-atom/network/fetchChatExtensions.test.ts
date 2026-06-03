import { describe, expect, it } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import { fetchFavorites } from "./fetchFavorites";
import { fetchMembers } from "./fetchMembers";
import { fetchNewMessages } from "./fetchNewMessages";
import { fetchUnread } from "./fetchUnread";

describe("P4-B chat extension fetchers", () => {
  it("calls favorites, members, unread, and new_messages with JSON format", async () => {
    const urls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      urls.push(url);

      if (url.includes("/api/v1/favorites")) {
        return new Response(JSON.stringify({ count: 0, favorites: [] }), { status: 200 });
      }
      if (url.includes("/api/v1/members")) {
        return new Response(JSON.stringify({ count: 0, members: [] }), { status: 200 });
      }
      if (url.includes("/api/v1/unread")) {
        return new Response(JSON.stringify({ total: 0, chats: [] }), { status: 200 });
      }
      if (url.includes("/api/v1/new_messages")) {
        return new Response(JSON.stringify({ count: 0, messages: [] }), { status: 200 });
      }

      return new Response("not found", { status: 404 });
    };

    try {
      await fetchFavorites({ chat: "room@chatroom", limit: 20 });
      await fetchMembers({ chat: "room@chatroom" });
      await fetchUnread();
      await fetchNewMessages({ chat: "room@chatroom", since: 123 });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(urls.map((url) => new URL(url).pathname)).toEqual([
      "/api/v1/favorites",
      "/api/v1/members",
      "/api/v1/unread",
      "/api/v1/new_messages",
    ]);
    expect(urls.every((url) => new URL(url).searchParams.get("format") === "json")).toBe(true);
    expect(new URL(urls[0]).searchParams.get("chat")).toBe("room@chatroom");
    expect(new URL(urls[3]).searchParams.get("since")).toBe("123");
  });

  it("emits redacted diagnostic events for extension endpoints", async () => {
    const events: DiagnosticEvent[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ count: 0, favorites: [] }), { status: 200 });

    try {
      await fetchFavorites(
        { chat: "wxid_synthetic_private", limit: 1 },
        {
          diagnostics: {
            endpointFamily: "favorites",
            correlationId: "p4b-media",
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
      correlationId: "p4b-media",
      attributes: { endpointFamily: "favorites" },
    });
    expect(JSON.stringify(events[0])).not.toContain("wxid_synthetic_private");
  });
});

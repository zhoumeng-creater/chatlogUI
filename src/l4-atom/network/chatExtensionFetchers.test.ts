import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import {
  fetchFavorites,
  fetchMembers,
  fetchNewMessages,
  fetchUnread,
} from "./chatExtensionFetchers";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("chat extension fetchers", () => {
  it("fetches unread sessions with safe diagnostics", async () => {
    const events: DiagnosticEvent[] = [];
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({
        total: 1,
        sessions: [
          {
            chat: "Synthetic Group",
            username: "group_synthetic_001@chatroom",
            is_group: true,
            chat_type: "group",
            unread: 2,
            last_msg_type: "text",
            last_sender: "member_synthetic_001",
            summary: "Synthetic unread summary",
            timestamp: 1800000000,
            time: "2026-06-02 12:00",
          },
        ],
      }), { status: 200 }),
    );

    const result = await fetchUnread(
      { limit: 20 },
      { diagnostics: { endpointFamily: "chat-extensions" }, onDiagnosticEvent: (event) => events.push(event) },
    );

    expect(result.sessions[0].unread).toBe(2);
    expect(events[0].attributes?.endpointFamily).toBe("unread");
    expect(JSON.stringify(events[0])).not.toContain("Synthetic unread summary");
  });

  it("fetches members with chat query omitted from diagnostic payload", async () => {
    const events: DiagnosticEvent[] = [];
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({
        chat: "Synthetic Group",
        username: "group_synthetic_001@chatroom",
        count: 1,
        members: [
          { username: "member_synthetic_owner", display: "Synthetic Owner", is_owner: true },
        ],
      }), { status: 200 }),
    );

    const result = await fetchMembers(
      { chat: "group_synthetic_001@chatroom" },
      { diagnostics: { endpointFamily: "members" }, onDiagnosticEvent: (event) => events.push(event) },
    );

    expect(result.members[0].display).toBe("Synthetic Owner");
    expect(events[0].attributes?.endpointFamily).toBe("members");
    expect(JSON.stringify(events[0])).not.toContain("group_synthetic");
    expect(String((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain("chat=group_synthetic_001%40chatroom");
  });

  it("fetches new messages with state query omitted from diagnostics", async () => {
    const events: DiagnosticEvent[] = [];
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({
        count: 0,
        messages: [],
        new_state: { "group_synthetic_001@chatroom": 1800000001 },
      }), { status: 200 }),
    );

    const result = await fetchNewMessages(
      { state: { "group_synthetic_001@chatroom": 1800000000 } },
      { diagnostics: { endpointFamily: "new_messages" }, onDiagnosticEvent: (event) => events.push(event) },
    );

    expect(result.newState).toEqual({ "group_synthetic_001@chatroom": 1800000001 });
    expect(events[0].attributes?.endpointFamily).toBe("new_messages");
    expect(JSON.stringify(events[0])).not.toContain("1800000000");
    expect(JSON.stringify(events[0])).not.toContain("group_synthetic");
  });

  it("fetches favorites and does not put query text in diagnostics", async () => {
    const events: DiagnosticEvent[] = [];
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({
        count: 1,
        items: [
          {
            id: "favorite_synthetic_001",
            type: "text",
            type_num: 1,
            time: "2026-06-02 12:02",
            timestamp: 1800000002,
            preview: "Synthetic favorite preview",
            from: "member_synthetic_guest",
            chat: "Synthetic Group",
          },
        ],
      }), { status: 200 }),
    );

    const result = await fetchFavorites(
      { query: "Synthetic favorite preview" },
      { diagnostics: { endpointFamily: "favorites" }, onDiagnosticEvent: (event) => events.push(event) },
    );

    expect(result.items[0].kindLabel).toBe("文本");
    expect(events[0].attributes?.endpointFamily).toBe("favorites");
    expect(JSON.stringify(events[0])).not.toContain("Synthetic favorite preview");
  });
});

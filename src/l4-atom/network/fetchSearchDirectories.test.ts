import { describe, expect, it, vi } from "vitest";
import {
  fetchSearchConversationDirectory,
  fetchSearchSenderDirectory,
  SearchDirectoryProtocolError,
  SearchDirectoryRequestError,
} from "./fetchSearchDirectories";

describe("fetchSearchConversationDirectory", () => {
  it("posts private query data in JSON and adapts a complete conversation page", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(
        JSON.stringify({
          data_revision: "revision-1",
          exact_total: true,
          complete: true,
          total_count: 2,
          count: 2,
          has_more: false,
          next_cursor: "",
          items: [
            {
              conversation_id: "private-chat-a",
              display_name: "Synthetic Project",
              kind: "group",
              disambiguator: "群聊 · 同名 1/2",
            },
            {
              conversation_id: "private-chat-b",
              display_name: "Synthetic Project",
              kind: "direct",
              disambiguator: "私聊 · 同名 2/2",
            },
          ],
        }),
        { status: 200 },
      );
    };

    try {
      await expect(
        fetchSearchConversationDirectory(
          { query: "PRIVATE conversation canary", limit: 100 },
          { serviceBaseUrl: "http://127.0.0.1:6041" },
        ),
      ).resolves.toEqual({
        dataRevision: "revision-1",
        exactTotal: true,
        complete: true,
        totalCount: 2,
        count: 2,
        hasMore: false,
        nextCursor: "",
        items: [
          {
            conversationId: "private-chat-a",
            displayName: "Synthetic Project",
            kind: "group",
            disambiguator: "群聊 · 同名 1/2",
          },
          {
            conversationId: "private-chat-b",
            displayName: "Synthetic Project",
            kind: "direct",
            disambiguator: "私聊 · 同名 2/2",
          },
        ],
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.origin).toBe("http://127.0.0.1:6041");
    expect(url.pathname).toBe("/api/v1/search/conversations/query");
    expect(url.searchParams.get("format")).toBe("json");
    expect(calls[0].url).not.toContain("PRIVATE");
    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].init?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      query: "PRIVATE conversation canary",
      limit: 100,
      cursor: "",
      data_revision: "",
    });
  });

  it("fails closed for fields outside the stable response contract", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          data_revision: "revision-1",
          exact_total: true,
          complete: true,
          total_count: 1,
          count: 1,
          has_more: false,
          next_cursor: "",
          items: [
            {
              conversation_id: "private-chat-a",
              display_name: "Synthetic Project",
              kind: "group",
              disambiguator: "",
            },
          ],
          private_extra: "PRIVATE RESPONSE CANARY",
        }),
        { status: 200 },
      );

    try {
      const failure = await fetchSearchConversationDirectory({
        query: "PRIVATE REQUEST CANARY",
      }).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(SearchDirectoryProtocolError);
      expect(failure).toMatchObject({ code: "invalid_directory_response" });
      expect(String(failure)).not.toContain("PRIVATE");
      expect(JSON.stringify(failure)).not.toContain("PRIVATE");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects an initial page that claims no continuation before its exact total", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          data_revision: "revision-1",
          exact_total: true,
          complete: true,
          total_count: 2,
          count: 1,
          has_more: false,
          next_cursor: "",
          items: [
            {
              conversation_id: "private-chat-a",
              display_name: "Synthetic Project",
              kind: "direct",
              disambiguator: "",
            },
          ],
        }),
        { status: 200 },
      );

    try {
      await expect(fetchSearchConversationDirectory({ query: "synthetic" })).rejects.toMatchObject({
        code: "invalid_directory_response",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it.each([
    ["inexact total", { exact_total: false }],
    ["incomplete catalog", { complete: false }],
    ["blank revision", { data_revision: "" }],
    ["missing cursor", { has_more: true, next_cursor: "" }],
    ["unexpected cursor", { has_more: false, next_cursor: "opaque" }],
    ["mismatched item count", { count: 0 }],
  ])("rejects a %s response", async (_name, override) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ...validConversationPage(), ...override }), { status: 200 });
    try {
      await expect(fetchSearchConversationDirectory({ query: "synthetic" })).rejects.toMatchObject({
        code: "invalid_directory_response",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects a continuation response from a different data revision", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ...validConversationPage(), data_revision: "revision-2" }), {
        status: 200,
      });
    try {
      await expect(
        fetchSearchConversationDirectory({
          query: "synthetic",
          cursor: "cursor-1",
          dataRevision: "revision-1",
        }),
      ).rejects.toMatchObject({ code: "invalid_directory_response" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects a page larger than the limit bound into its request", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          ...validConversationPage(),
          total_count: 2,
          count: 2,
          items: [
            ...validConversationPage().items,
            {
              conversation_id: "private-chat-b",
              display_name: "Synthetic B",
              kind: "group",
              disambiguator: "",
            },
          ],
        }),
        { status: 200 },
      );
    try {
      await expect(
        fetchSearchConversationDirectory({ query: "synthetic", limit: 1 }),
      ).rejects.toMatchObject({ code: "invalid_directory_response" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("fetchSearchSenderDirectory", () => {
  it("posts the selected scope and preserves the opaque continuation pair", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(
        JSON.stringify({
          data_revision: "revision-private",
          exact_total: true,
          complete: true,
          total_count: 5,
          count: 2,
          has_more: true,
          next_cursor: "next-opaque",
          items: [
            {
              sender_id: "chatlog:sender:self:v1",
              display_name: "我",
              is_self: true,
              conversation_count: 2,
              context_label: "Synthetic A、Synthetic B",
              disambiguator: "",
            },
            {
              sender_id: "private-sender-a",
              display_name: "Synthetic Sender",
              is_self: false,
              conversation_count: 1,
              context_label: "Synthetic A",
              disambiguator: "Synthetic A · 1/2",
            },
          ],
        }),
        { status: 200 },
      );
    };

    try {
      await expect(
        fetchSearchSenderDirectory({
          query: "PRIVATE sender canary",
          scope: "selected",
          chats: ["private-chat-b", "private-chat-a"],
          limit: 2,
          cursor: "cursor-opaque",
          dataRevision: "revision-private",
        }),
      ).resolves.toMatchObject({
        dataRevision: "revision-private",
        totalCount: 5,
        count: 2,
        hasMore: true,
        nextCursor: "next-opaque",
        items: [
          {
            senderId: "chatlog:sender:self:v1",
            displayName: "我",
            isSelf: true,
            conversationCount: 2,
          },
          {
            senderId: "private-sender-a",
            displayName: "Synthetic Sender",
            isSelf: false,
            conversationCount: 1,
            disambiguator: "Synthetic A · 1/2",
          },
        ],
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const call = calls[0];
    const url = new URL(call.url);
    expect(url.pathname).toBe("/api/v1/search/senders/query");
    expect(call.url).not.toContain("PRIVATE");
    expect(call.url).not.toContain("private-chat");
    expect(JSON.parse(String(call.init?.body))).toEqual({
      query: "PRIVATE sender canary",
      scope: "selected",
      chats: ["private-chat-b", "private-chat-a"],
      limit: 2,
      cursor: "cursor-opaque",
      data_revision: "revision-private",
    });
  });

  it("maps stale failures to a safe error without retaining private response text", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          code: "directory_stale",
          message: "PRIVATE sender canary and private-chat-a",
        }),
        { status: 409 },
      );

    try {
      const failure = await fetchSearchSenderDirectory({
        query: "PRIVATE sender canary",
        scope: "current",
        chats: ["private-chat-a"],
      }).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(SearchDirectoryRequestError);
      expect(failure).toMatchObject({ code: "directory_stale", status: 409 });
      expect(String(failure)).not.toContain("PRIVATE");
      expect(JSON.stringify(failure)).not.toContain("PRIVATE");
      expect(JSON.stringify(failure)).not.toContain("private-chat-a");
      expect(failure).not.toHaveProperty("body");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects a directory query above the negotiated grapheme limit before fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      fetchSearchSenderDirectory({
        query: "😀".repeat(201),
        scope: "all",
        chats: [],
      }),
    ).rejects.toMatchObject({ code: "invalid_directory_request" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it.each([
    [{ query: "", scope: "all", chats: ["private-chat-a"] }, "all scope with an ID"],
    [{ query: "", scope: "current", chats: [] }, "current scope without one ID"],
    [{ query: "", scope: "selected", chats: [] }, "selected scope without IDs"],
    [
      { query: "", scope: "selected", chats: ["private-chat-a", "private-chat-a"] },
      "duplicate selected IDs",
    ],
    [{ query: "", scope: "all", chats: [], cursor: "cursor-only" }, "cursor without revision"],
    [
      { query: "", scope: "all", chats: [], dataRevision: "revision-only" },
      "revision without cursor",
    ],
    [{ query: "", scope: "all", chats: [], limit: 101 }, "oversized page"],
  ])("rejects invalid request %#j (%s) before fetch", async (request, _label) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(fetchSearchSenderDirectory(request as never)).rejects.toMatchObject({
      code: "invalid_directory_request",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("honors cancellation without putting private query state in diagnostics or errors", async () => {
    const controller = new AbortController();
    const events: unknown[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    try {
      const outcome = fetchSearchSenderDirectory(
        {
          query: "PRIVATE sender canary",
          scope: "current",
          chats: ["private-chat-a"],
        },
        { signal: controller.signal, onDiagnosticEvent: (event) => events.push(event) },
      );
      controller.abort();
      await expect(outcome).rejects.toMatchObject({ code: "request_cancelled", status: null });
      expect(JSON.stringify(events)).not.toContain("PRIVATE");
      expect(JSON.stringify(events)).not.toContain("private-chat-a");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

function validConversationPage() {
  return {
    data_revision: "revision-1",
    exact_total: true,
    complete: true,
    total_count: 1,
    count: 1,
    has_more: false,
    next_cursor: "",
    items: [
      {
        conversation_id: "private-chat-a",
        display_name: "Synthetic Project",
        kind: "direct",
        disambiguator: "",
      },
    ],
  };
}

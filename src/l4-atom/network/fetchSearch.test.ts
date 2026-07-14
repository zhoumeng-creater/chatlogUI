import { describe, expect, it, vi } from "vitest";
import { fetchSearch, fetchSearchV2, SearchProtocolError } from "./fetchSearch";

describe("fetchSearch", () => {
  it("serializes search filters without duplicating format=json", async () => {
    const urls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      urls.push(String(input));
      return new Response(
        JSON.stringify({
          total_count: 0,
          count: 0,
          limit: 25,
          offset: 10,
          messages: [],
        }),
        { status: 200 },
      );
    };

    try {
      await fetchSearch({
        keyword: "synthetic keyword",
        limit: 25,
        offset: 10,
        chats: ["session_synthetic_001", "chatroom_synthetic_001@chatroom"],
        since: 1767254400,
        until: 1767340800,
        msgType: 3,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const url = new URL(urls[0]);
    expect(url.pathname).toBe("/api/v1/search");
    expect(url.searchParams.get("keyword")).toBe("synthetic keyword");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("offset")).toBe("10");
    expect(url.searchParams.get("chats")).toBe(
      "session_synthetic_001,chatroom_synthetic_001@chatroom",
    );
    expect(url.searchParams.get("since")).toBe("1767254400");
    expect(url.searchParams.get("until")).toBe("1767340800");
    expect(url.searchParams.get("msg_type")).toBe("3");
    expect(url.searchParams.getAll("format")).toEqual(["json"]);
  });

  it("posts the complete v2 contract without putting private terms in the URL", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      requests.push({ url: String(input), init });
      return new Response(
        JSON.stringify({
          snapshot_id: "snapshot-safe",
          data_revision: "revision-safe",
          exact_total: true,
          complete_scope: true,
          total_count: 1,
          count: 1,
          window_start: 0,
          previous_cursor: "",
          next_cursor: "cursor-safe",
          has_previous: false,
          has_next: true,
          query_since: 1767254400,
          query_until: 1767340800,
          messages: [
            {
              message_id: "message-safe",
              seq: 42,
              source_index: 0,
              conversation_id: "chat-private",
              conversation_name: "Synthetic Chat",
              sender_id: "sender-private",
              sender_name: "Synthetic Sender",
              timestamp: 1767254401,
              type: 1,
              sub_type: 0,
              category: "text",
              match_field: "content",
              snippet: "Synthetic needle",
              match_segments: [
                { text: "Synthetic ", matched: false },
                { text: "needle", matched: true },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    };

    try {
      const result = await fetchSearchV2(
        {
          keyword: "Synthetic private needle",
          chats: ["chat-private"],
          categories: ["text", "file"],
          senderIds: ["sender-private"],
          since: 1767254400,
          until: 1767340800,
          limit: 50,
          cursor: "cursor-input",
        },
        { serviceBaseUrl: "http://127.0.0.1:6041" },
      );

      expect(result).toMatchObject({
        snapshotId: "snapshot-safe",
        dataRevision: "revision-safe",
        exactTotal: true,
        completeScope: true,
        totalCount: 1,
        count: 1,
        windowStart: 0,
        nextCursor: "cursor-safe",
        hasNext: true,
        querySince: 1767254400,
        messages: [
          {
            messageId: "message-safe",
            sourceIndex: 0,
            conversationId: "chat-private",
            senderId: "sender-private",
            subType: 0,
            category: "text",
            snippet: "Synthetic needle",
            matchSegments: [{ text: "Synthetic ", matched: false }, { text: "needle", matched: true }],
          },
        ],
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(requests).toHaveLength(1);
    const request = requests[0];
    const url = new URL(request.url);
    expect(url.origin).toBe("http://127.0.0.1:6041");
    expect(url.pathname).toBe("/api/v1/search");
    expect(url.searchParams.get("format")).toBe("json");
    expect(request.url).not.toContain("Synthetic");
    expect(request.url).not.toContain("chat-private");
    expect(request.init?.method).toBe("POST");
    expect(request.init?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(String(request.init?.body))).toEqual({
      keyword: "Synthetic private needle",
      chats: ["chat-private"],
      categories: ["text", "file"],
      sender_ids: ["sender-private"],
      since: 1767254400,
      until: 1767340800,
      limit: 50,
      cursor: "cursor-input",
    });
  });

  it("fails safely for a malformed v2 response without echoing response content", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ messages: [{ snippet: "PRIVATE RESPONSE CANARY" }] }), {
        status: 200,
      });

    try {
      await expect(fetchSearchV2({ keyword: "PRIVATE REQUEST CANARY" })).rejects.toEqual(
        expect.objectContaining({
          name: "SearchProtocolError",
          code: "invalid_search_response",
        }),
      );
      await fetchSearchV2({ keyword: "PRIVATE REQUEST CANARY" }).catch((error: unknown) => {
        expect(error).toBeInstanceOf(SearchProtocolError);
        expect(String(error)).not.toContain("PRIVATE");
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("honors caller cancellation for v2 POST without leaking its body into diagnostics", async () => {
    const controller = new AbortController();
    const events: unknown[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    try {
      const outcome = fetchSearchV2(
        {
          keyword: "PRIVATE V2 REQUEST CANARY",
          chats: ["private-chat-canary"],
        },
        { signal: controller.signal, onDiagnosticEvent: (event) => events.push(event) },
      );
      controller.abort();
      await expect(outcome).rejects.toMatchObject({ message: "请求已取消" });
      expect(events).toHaveLength(1);
      expect(JSON.stringify(events)).not.toContain("PRIVATE");
      expect(JSON.stringify(events)).not.toContain("private-chat-canary");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it.each([
    [{ keyword: "   " }, "invalid_search_request"],
    [{ keyword: "needle", limit: 51 }, "invalid_search_request"],
    [{ keyword: "needle", chats: [""] }, "invalid_search_request"],
    [{ keyword: "needle", senderIds: [""] }, "invalid_search_request"],
    [{ keyword: "needle", since: 2, until: 1 }, "invalid_search_request"],
    [{ keyword: "needle", categories: ["unknown"] }, "invalid_search_request"],
  ])("rejects invalid v2 request shape %#j", async (request, code) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(fetchSearchV2(request as never)).rejects.toMatchObject({ code });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("honors caller abort signals", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const originalFetch = globalThis.fetch;
    let outcomePromise: Promise<{ status: "resolved" | "rejected"; error?: unknown }> | undefined;

    globalThis.fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });

    try {
      outcomePromise = fetchSearch(
        { keyword: "synthetic abort", limit: 1 },
        { signal: controller.signal },
      ).then(
        () => ({ status: "resolved" }),
        (error: unknown) => ({ status: "rejected", error }),
      );

      controller.abort();
      await vi.advanceTimersByTimeAsync(1);

      await expect(outcomePromise).resolves.toMatchObject({
        status: "rejected",
        error: { name: "ChatlogHttpError", message: "请求已取消" },
      });
    } finally {
      await vi.advanceTimersByTimeAsync(20000);
      await outcomePromise;
      vi.useRealTimers();
      globalThis.fetch = originalFetch;
    }
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  fetchHistoryContext,
  HistoryContextProtocolError,
  HistoryContextRequestError,
} from "./fetchHistoryContext";

describe("fetchHistoryContext", () => {
  it("posts private identity only in strict JSON and adapts an exact revision-bound window", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify(validPage()), { status: 200 });
    };

    try {
      await expect(
        fetchHistoryContext(
          {
            conversationId: "private-room@chatroom",
            seq: 101,
            limit: 51,
            dataRevision: "revision-private",
          },
          { serviceBaseUrl: "http://127.0.0.1:6041" },
        ),
      ).resolves.toEqual({
        contractVersion: "history.context.v1",
        dataRevision: "revision-private",
        exact: true,
        complete: true,
        conversationId: "private-room@chatroom",
        anchorSeq: 101,
        anchorIndex: 1,
        limit: 51,
        count: 3,
        hasBefore: true,
        hasAfter: true,
        messages: [
          {
            seq: 100,
            timestamp: 1_700_000_000,
            conversationId: "private-room@chatroom",
            conversationName: "Synthetic Room",
            senderId: "sender-a",
            senderName: "Synthetic A",
            isSelf: false,
            type: 1,
            subType: 0,
            content: "before",
          },
          {
            seq: 101,
            timestamp: 1_700_000_001,
            conversationId: "private-room@chatroom",
            conversationName: "Synthetic Room",
            senderId: "chatlog:sender:self:v1",
            senderName: "我",
            isSelf: true,
            type: 1,
            subType: 0,
            content: "anchor",
          },
          {
            seq: 102,
            timestamp: 1_700_000_002,
            conversationId: "private-room@chatroom",
            conversationName: "Synthetic Room",
            senderId: "sender-b",
            senderName: "Synthetic B",
            isSelf: false,
            type: 49,
            subType: 5,
            content: "after",
          },
        ],
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.url).toBe("http://127.0.0.1:6041/api/v1/history/context/query");
    expect(new URL(call.url).search).toBe("");
    expect(call.url).not.toContain("private-room");
    expect(call.url).not.toContain("revision-private");
    expect(call.init?.method).toBe("POST");
    expect(call.init?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(String(call.init?.body))).toEqual({
      conversation_id: "private-room@chatroom",
      seq: 101,
      limit: 51,
      data_revision: "revision-private",
    });
  });

  it("omits optional fields and accepts zero as the negotiated default-limit request", async () => {
    const bodies: unknown[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify(validPage({ limit: 51 })), { status: 200 });
    };

    try {
      await fetchHistoryContext({ conversationId: "private-room@chatroom", seq: 101 });
      await fetchHistoryContext({
        conversationId: "private-room@chatroom",
        seq: 101,
        limit: 0,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(bodies).toEqual([
      { conversation_id: "private-room@chatroom", seq: 101 },
      { conversation_id: "private-room@chatroom", seq: 101, limit: 0 },
    ]);
  });

  it.each([
    [{ conversationId: "", seq: 1 }, "empty conversation"],
    [{ conversationId: " padded ", seq: 1 }, "padded conversation"],
    [{ conversationId: "x".repeat(4_097), seq: 1 }, "oversized conversation"],
    [{ conversationId: "chat", seq: 0 }, "zero sequence"],
    [{ conversationId: "chat", seq: Number.MAX_SAFE_INTEGER + 1 }, "unsafe sequence"],
    [{ conversationId: "chat", seq: 1, limit: -1 }, "negative limit"],
    [{ conversationId: "chat", seq: 1, limit: 102 }, "oversized limit"],
    [{ conversationId: "chat", seq: 1, dataRevision: "r".repeat(4_097) }, "oversized revision"],
  ])("rejects an invalid request before fetch (%s)", async (request, _label) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(fetchHistoryContext(request as never)).rejects.toMatchObject({
      code: "invalid_history_context_request",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it.each([
    ["extra response field", { private_extra: "PRIVATE RESPONSE CANARY" }],
    ["wrong contract", { contract_version: "history.context.v2" }],
    ["inexact", { exact: false }],
    ["incomplete", { complete: false }],
    ["wrong revision", { data_revision: "revision-other" }],
    ["wrong conversation", { conversation_id: "private-other" }],
    ["wrong anchor", { anchor_seq: 102 }],
    ["wrong limit", { limit: 50 }],
    ["wrong count", { count: 2 }],
    ["wrong anchor index", { anchor_index: 2 }],
    ["oversized window", { limit: 2 }],
    [
      "unsorted messages",
      { messages: [validPage().messages[1], validPage().messages[0], validPage().messages[2]] },
    ],
    [
      "wrong message conversation",
      {
        messages: [
          { ...validPage().messages[0], conversation_id: "private-other" },
          validPage().messages[1],
          validPage().messages[2],
        ],
      },
    ],
    [
      "inconsistent conversation name",
      {
        messages: [
          validPage().messages[0],
          { ...validPage().messages[1], conversation_name: "Synthetic Other" },
          validPage().messages[2],
        ],
      },
    ],
    [
      "spoofed self identity",
      {
        messages: [
          validPage().messages[0],
          { ...validPage().messages[1], sender_id: "private-self-id" },
          validPage().messages[2],
        ],
      },
    ],
    [
      "unexpected message field",
      {
        messages: [
          validPage().messages[0],
          { ...validPage().messages[1], private_extra: "PRIVATE MESSAGE CANARY" },
          validPage().messages[2],
        ],
      },
    ],
  ])("fails closed for %s", async (_name, override) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ...validPage(), ...override }), { status: 200 });

    try {
      const failure = await fetchHistoryContext({
        conversationId: "private-room@chatroom",
        seq: 101,
        limit: 51,
        dataRevision: "revision-private",
      }).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(HistoryContextProtocolError);
      expect(failure).toMatchObject({ code: "invalid_history_context_response" });
      expect(String(failure)).not.toContain("PRIVATE");
      expect(JSON.stringify(failure)).not.toContain("PRIVATE");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it.each([
    [400, "history_context_invalid_request"],
    [400, "history_context_invalid_conversation"],
    [400, "history_context_invalid_seq"],
    [400, "history_context_invalid_limit"],
    [404, "history_context_conversation_not_found"],
    [404, "history_context_message_not_found"],
    [409, "history_context_stale"],
    [409, "history_context_identity_conflict"],
    [413, "history_context_request_too_large"],
    [499, "history_context_cancelled"],
    [500, "history_context_internal"],
    [503, "history_context_capacity"],
    [503, "history_context_unavailable"],
    [503, "database_not_ready"],
    [503, "database_decrypting"],
    [503, "database_error"],
    [504, "history_context_timeout"],
  ])("maps %i/%s to a safe closed error", async (status, code) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          code,
          message: "PRIVATE request data, local path, and message content",
        }),
        { status },
      );

    try {
      const failure = await fetchHistoryContext({
        conversationId: "private-room@chatroom",
        seq: 101,
        dataRevision: "revision-private",
      }).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(HistoryContextRequestError);
      expect(failure).toMatchObject({ code, status });
      expect(String(failure)).not.toContain("PRIVATE");
      expect(JSON.stringify(failure)).not.toContain("PRIVATE");
      expect(JSON.stringify(failure)).not.toContain("private-room");
      expect(failure).not.toHaveProperty("body");
      expect(failure).not.toHaveProperty("url");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps unknown status/code pairs and non-HTTP failures without retaining source data", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ code: "history_context_message_not_found", message: "PRIVATE" }),
        { status: 503 },
      );
    try {
      await expect(
        fetchHistoryContext({ conversationId: "private-room", seq: 101 }),
      ).rejects.toMatchObject({ code: "request_failed", status: 503 });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("honors cancellation without exposing private request values in diagnostics or errors", async () => {
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
      const outcome = fetchHistoryContext(
        {
          conversationId: "private-room@chatroom",
          seq: 101,
          dataRevision: "revision-private",
        },
        { signal: controller.signal, onDiagnosticEvent: (event) => events.push(event) },
      );
      controller.abort();
      await expect(outcome).rejects.toMatchObject({
        code: "history_context_cancelled",
        status: null,
      });
      expect(JSON.stringify(events)).not.toContain("private-room");
      expect(JSON.stringify(events)).not.toContain("revision-private");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

function validPage(overrides: Record<string, unknown> = {}) {
  return {
    contract_version: "history.context.v1",
    data_revision: "revision-private",
    exact: true,
    complete: true,
    conversation_id: "private-room@chatroom",
    anchor_seq: 101,
    anchor_index: 1,
    limit: 51,
    count: 3,
    has_before: true,
    has_after: true,
    messages: [
      {
        seq: 100,
        timestamp: 1_700_000_000,
        conversation_id: "private-room@chatroom",
        conversation_name: "Synthetic Room",
        sender_id: "sender-a",
        sender_name: "Synthetic A",
        is_self: false,
        type: 1,
        sub_type: 0,
        content: "before",
      },
      {
        seq: 101,
        timestamp: 1_700_000_001,
        conversation_id: "private-room@chatroom",
        conversation_name: "Synthetic Room",
        sender_id: "chatlog:sender:self:v1",
        sender_name: "我",
        is_self: true,
        type: 1,
        sub_type: 0,
        content: "anchor",
      },
      {
        seq: 102,
        timestamp: 1_700_000_002,
        conversation_id: "private-room@chatroom",
        conversation_name: "Synthetic Room",
        sender_id: "sender-b",
        sender_name: "Synthetic B",
        is_self: false,
        type: 49,
        sub_type: 5,
        content: "after",
      },
    ],
    ...overrides,
  };
}

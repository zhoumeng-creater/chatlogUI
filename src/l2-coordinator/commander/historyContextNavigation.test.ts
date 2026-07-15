import { describe, expect, it } from "vitest";
import {
  classifyExactHistoryContextError,
  executeAnchorLoad,
  resolveAnchorLoadStrategy,
  toChatHistoryContext,
  toExactHistoryContextRequest,
} from "./historyContextNavigation";
import {
  HistoryContextProtocolError,
  HistoryContextRequestError,
} from "@/l4-atom/network/fetchHistoryContext";

describe("historyContextNavigation", () => {
  it("requires exact revision-bound context for a normal search hit", () => {
    const target = searchTarget();

    expect(resolveAnchorLoadStrategy(target, { allowNearbyFallback: false })).toBe("exact");
    expect(toExactHistoryContextRequest(target)).toEqual({
      conversationId: "private-room@chatroom",
      seq: 101,
      limit: 51,
      dataRevision: "revision-private",
    });
  });

  it("fails a search hit closed when stable seq or revision is missing", () => {
    expect(
      resolveAnchorLoadStrategy(
        { ...searchTarget(), dataRevision: undefined },
        { allowNearbyFallback: false },
      ),
    ).toBe("unavailable");
    expect(
      resolveAnchorLoadStrategy(
        { ...searchTarget(), anchor: { ...searchTarget().anchor, seq: null } },
        { allowNearbyFallback: false },
      ),
    ).toBe("unavailable");
  });

  it("uses legacy only for an explicitly unavailable capability and fails unknown closed", () => {
    expect(
      resolveAnchorLoadStrategy(
        { ...searchTarget(), historyContextAvailable: false },
        { allowNearbyFallback: false },
      ),
    ).toBe("legacy-exact");
    expect(
      resolveAnchorLoadStrategy(
        { ...searchTarget(), historyContextAvailable: undefined },
        { allowNearbyFallback: false },
      ),
    ).toBe("unavailable");
  });

  it("uses legacy time context only for an explicit nearby action or a non-search source", () => {
    expect(resolveAnchorLoadStrategy(searchTarget(), { allowNearbyFallback: true })).toBe(
      "legacy-nearby",
    );
    expect(
      resolveAnchorLoadStrategy(
        { ...searchTarget(), anchor: { ...searchTarget().anchor, source: "media" } },
        { allowNearbyFallback: false },
      ),
    ).toBe("legacy-exact");
    expect(
      resolveAnchorLoadStrategy(
        { ...searchTarget(), anchor: { ...searchTarget().anchor, source: "media" } },
        { allowNearbyFallback: true },
      ),
    ).toBe("legacy-nearby");
  });

  it("executes exact search context without invoking either legacy transport", async () => {
    const signal = new AbortController().signal;
    const calls: string[] = [];
    const result = await executeAnchorLoad({
      target: searchTarget(),
      options: { allowNearbyFallback: false },
      signal,
      fetchExact: async (request, receivedSignal) => {
        calls.push("exact");
        expect(request).toEqual({
          conversationId: "private-room@chatroom",
          seq: 101,
          limit: 51,
          dataRevision: "revision-private",
        });
        expect(receivedSignal).toBe(signal);
        return page();
      },
      fetchLegacyExact: async () => {
        calls.push("legacy-exact");
        return { kind: "legacy-exact" };
      },
      fetchLegacyNearby: async () => {
        calls.push("legacy-nearby");
        return { kind: "legacy-nearby" };
      },
    });

    expect(calls).toEqual(["exact"]);
    expect(result).toEqual({ kind: "exact", page: page() });
  });

  it("propagates an exact stale failure without invoking a legacy transport", async () => {
    const calls: string[] = [];
    const stale = new HistoryContextRequestError("history_context_stale", 409);

    await expect(
      executeAnchorLoad({
        target: searchTarget(),
        options: { allowNearbyFallback: false },
        signal: new AbortController().signal,
        fetchExact: async () => {
          calls.push("exact");
          throw stale;
        },
        fetchLegacyExact: async () => {
          calls.push("legacy-exact");
          return null;
        },
        fetchLegacyNearby: async () => {
          calls.push("legacy-nearby");
          return null;
        },
      }),
    ).rejects.toBe(stale);
    expect(calls).toEqual(["exact"]);
  });

  it("maps the finite exact page into chronological chat rows and the exact anchor id", () => {
    expect(toChatHistoryContext(page(), true)).toEqual({
      messages: [
        expect.objectContaining({
          id: "history-context:100",
          seq: 100,
          localId: 100,
          username: "private-room@chatroom",
          chat: "Synthetic Room",
          sender: "sender-a",
          senderName: "Synthetic A",
          direction: "other",
          type: "1",
          subType: "0",
          content: "before",
          isGroup: true,
        }),
        expect.objectContaining({
          id: "history-context:101",
          seq: 101,
          sender: "chatlog:sender:self:v1",
          isSelf: true,
          direction: "self",
          content: "anchor",
        }),
        expect.objectContaining({
          id: "history-context:102",
          seq: 102,
          type: "49",
          subType: "5",
          content: "after",
        }),
      ],
      anchorMessageId: "history-context:101",
      totalCount: 3,
      offset: 0,
      hasMore: true,
      hasNewer: true,
    });
  });

  it.each([
    [
      new HistoryContextRequestError("history_context_message_not_found", 404),
      {
        reason: "missing",
        message: "原消息已不存在；可选择打开其时间附近的记录。",
        nearbyFallbackAvailable: true,
      },
    ],
    [
      new HistoryContextRequestError("history_context_conversation_not_found", 404),
      {
        reason: "missing",
        message: "来源会话已不存在，请刷新搜索。",
        nearbyFallbackAvailable: false,
      },
    ],
    [
      new HistoryContextRequestError("history_context_stale", 409),
      {
        reason: "load-failed",
        message: "搜索快照已过期，请刷新搜索后重试。",
        nearbyFallbackAvailable: false,
      },
    ],
    [
      new HistoryContextRequestError("history_context_cancelled", null),
      {
        reason: "cancelled",
        message: "定位请求已取消。",
        nearbyFallbackAvailable: false,
      },
    ],
    [
      new HistoryContextProtocolError("invalid_history_context_response"),
      {
        reason: "load-failed",
        message: "精确消息上下文响应无效，请更新本机服务后重试。",
        nearbyFallbackAvailable: false,
      },
    ],
    [
      new HistoryContextProtocolError("invalid_history_context_request"),
      {
        reason: "load-failed",
        message: "搜索结果缺少精确定位信息，请刷新搜索后重试。",
        nearbyFallbackAvailable: false,
      },
    ],
  ])("translates exact errors without silently enabling a time fallback", (error, expected) => {
    expect(classifyExactHistoryContextError(error, searchTarget())).toEqual(expected);
    expect(JSON.stringify(classifyExactHistoryContextError(error, searchTarget()))).not.toContain(
      "private-room",
    );
    expect(JSON.stringify(classifyExactHistoryContextError(error, searchTarget()))).not.toContain(
      "revision-private",
    );
  });
});

function searchTarget() {
  return {
    conversationId: "private-room@chatroom",
    dataRevision: "revision-private",
    historyContextAvailable: true,
    anchor: {
      source: "search" as const,
      seq: 101,
      timestamp: 1_700_000_001,
    },
  };
}

function page() {
  return {
    contractVersion: "history.context.v1" as const,
    dataRevision: "revision-private",
    exact: true as const,
    complete: true as const,
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
  };
}

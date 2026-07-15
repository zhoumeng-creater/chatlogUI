import { describe, expect, it } from "vitest";
import type { SearchHit } from "@/l2-coordinator/api-docs/search";
import type { Conversation } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import type { SearchReturnSnapshot } from "./searchReturnSnapshot";
import { resolveSearchHitNavigation } from "./searchNavigation";

const baseConversation: Conversation = {
  id: "conversation-1",
  username: "wxid_synthetic_user",
  displayName: "Synthetic User",
  chatType: "friend",
  isGroup: false,
  summary: "",
  timestamp: 0,
  timeLabel: "",
  unread: 0,
  lastSender: "",
  source: "session",
};

function searchMessage(
  overrides: Partial<SearchHit> = {},
): SearchHit {
  return {
    messageId: "opaque-message-42",
    seq: 42,
    sourceIndex: 0,
    conversationId: "wxid_synthetic_user",
    conversationName: "Synthetic User",
    senderId: "synthetic-sender",
    senderName: "Synthetic Sender",
    timestamp: 1_714_288_000,
    type: 1,
    subType: 0,
    category: "text",
    matchField: "content",
    snippet: "Synthetic private result content",
    matchSegments: [{ text: "Synthetic", matched: true }],
    ...overrides,
  };
}

describe("resolveSearchHitNavigation", () => {
  it("uses the canonical conversation id rather than its display label", () => {
    const result = resolveSearchHitNavigation({
      message: searchMessage({
        conversationId: "wxid_synthetic_backend_target",
        conversationName: "Display label only",
      }),
      conversations: [
        { ...baseConversation, id: "display-conversation", username: "Display label only" },
        {
          ...baseConversation,
          id: "backend-conversation",
          username: "wxid_synthetic_backend_target",
        },
      ],
      returnRoute: "/search",
      querySnapshot: {
        query: "Synthetic private query",
        filter: "text",
        scope: "all",
        scopeChat: null,
      },
    });

    expect(result).toMatchObject({
      ok: true,
      conversationId: "backend-conversation",
      chat: "wxid_synthetic_backend_target",
      anchor: {
        source: "search",
        messageId: "opaque-message-42",
        seq: 42,
        localId: null,
        timestamp: 1_714_288_000,
        time: null,
      },
      returnToSearch: {
        returnRoute: "/search",
      },
    });
    expect(result.ok && result.returnToSearch.activeResultId).toMatch(
      /^search-hit-[a-f0-9]{32}$/,
    );
  });

  it("resolves a canonical group conversation id", () => {
    const result = resolveSearchHitNavigation({
      message: searchMessage({
        conversationId: "room_synthetic@chatroom",
        conversationName: "Synthetic Room",
      }),
      conversations: [
        { ...baseConversation, id: "room-conversation", username: "room_synthetic@chatroom" },
      ],
      returnRoute: "/search",
      querySnapshot: {
        query: "Synthetic private query",
        filter: "all",
        scope: "current",
        scopeChat: "room_synthetic@chatroom",
      },
    });

    expect(result).toMatchObject({
      ok: true,
      conversationId: "room-conversation",
      chat: "room_synthetic@chatroom",
      returnToSearch: {
        querySnapshot: {
          filter: "all",
          scope: "current",
          scopeChat: "room_synthetic@chatroom",
        },
      },
    });
  });

  it("opens by backend chat identity even when the conversation list has not loaded", () => {
    const result = resolveSearchHitNavigation({
      message: searchMessage({
        conversationId: "wxid_synthetic_private_missing",
        conversationName: "Private Missing Display",
      }),
      conversations: [],
      returnRoute: "/search",
      querySnapshot: {
        query: "Synthetic private query",
        filter: "all",
        scope: "all",
        scopeChat: null,
      },
    });

    expect(result).toMatchObject({
      ok: true,
      conversationId: "wxid_synthetic_private_missing",
      chat: "wxid_synthetic_private_missing",
      requiresConversationLoad: true,
      anchor: { messageId: "opaque-message-42" },
    });
  });

  it("uses canonical v2 conversation and message identities for exact navigation", () => {
    const result = resolveSearchHitNavigation({
      message: searchMessage({
        messageId: "opaque-message-id",
        seq: 987,
        sourceIndex: 12,
        conversationId: "room_synthetic@chatroom",
      }),
      conversations: [],
      returnRoute: "/search",
      dataRevision: "revision-private",
      historyContextAvailable: true,
      querySnapshot: {
        query: "Synthetic private query",
        filter: "all",
        scope: "all",
        scopeChat: null,
      },
    });
    expect(result).toMatchObject({
      ok: true,
      conversationId: "room_synthetic@chatroom",
      chat: "room_synthetic@chatroom",
      requiresConversationLoad: true,
      anchor: {
        source: "search",
        messageId: "opaque-message-id",
        seq: 987,
        localId: null,
        timestamp: 1_714_288_000,
      },
      dataRevision: "revision-private",
      historyContextAvailable: true,
      returnToSearch: { activeResultId: expect.stringMatching(/^search-hit-[a-f0-9]{32}$/) },
    });
    expect(result.ok && result.returnToSearch.activeResultId).not.toContain("opaque-message-id");
    expect(result.ok && result.returnToSearch.returnRoute).not.toContain("revision-private");
  });

  it("carries the privacy-safe in-memory return snapshot without serializing it into the route", () => {
    const returnSnapshot = Object.freeze({ capturedAt: 123 }) as SearchReturnSnapshot;
    const result = resolveSearchHitNavigation({
      message: searchMessage(),
      conversations: [baseConversation],
      returnRoute: "/search?scope=currentChat&chat=wxid_synthetic_user",
      querySnapshot: {
        query: "Synthetic private query",
        filter: "all",
        scope: "current",
        scopeChat: "wxid_synthetic_user",
      },
      returnSnapshot,
    });

    expect(result).toMatchObject({
      ok: true,
      returnToSearch: {
        searchSnapshot: returnSnapshot,
      },
    });
    expect(result.ok && result.returnToSearch.returnRoute).not.toContain("Synthetic private query");
    expect(result.ok && result.returnToSearch.returnRoute).not.toContain("capturedAt");
  });

  it("does not write the private query into the return route", () => {
    const result = resolveSearchHitNavigation({
      message: searchMessage(),
      conversations: [baseConversation],
      returnRoute: "/search?scope=currentChat",
      querySnapshot: {
        query: "Synthetic private query",
        filter: "file",
        scope: "current",
        scopeChat: "wxid_synthetic_user",
      },
    });

    expect(result).toMatchObject({
      ok: true,
      returnToSearch: {
        returnRoute: "/search?scope=currentChat",
        querySnapshot: {
          query: "Synthetic private query",
        },
      },
    });
    expect(result.ok && result.returnToSearch.returnRoute).not.toContain("Synthetic private query");
  });
});

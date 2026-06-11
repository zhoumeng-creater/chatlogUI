import { beforeEach, describe, expect, it } from "vitest";
import { useChatStore, type ChatMessage } from "./useChatStore";

function message(id: number): ChatMessage {
  return {
    id: String(id),
    localId: id,
    timestamp: id,
    time: "2024-03-10 12:00",
    sender: "Alice",
    type: "text",
    content: `message ${id}`,
    chat: "Work Group",
    username: "room123@chatroom",
    isGroup: true,
    chatType: "group",
    direction: "unknown",
  };
}

describe("useChatStore history pagination state", () => {
  beforeEach(() => {
    useChatStore.getState().resetChat();
  });

  it("tracks whether more history pages are available independently of backend total_count", () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => message(index));

    useChatStore.getState().setMessages(firstPage, 50, 0, true);

    expect(useChatStore.getState().messagesHasMore).toBe(true);

    useChatStore.getState().setMessagesLoading(true);
    useChatStore.getState().appendMessages([], 50, false);

    expect(useChatStore.getState().messages).toHaveLength(50);
    expect(useChatStore.getState().messagesHasMore).toBe(false);
    expect(useChatStore.getState().messagesStatus).toBe("ready");
  });

  it("tracks search anchor loading, hit, and missing states", () => {
    const anchor = {
      source: "search" as const,
      chat: "room_synthetic@chatroom",
      messageId: "message-42",
      localId: 42,
      timestamp: 1_714_288_000,
      time: "2024-04-28 09:20",
    };
    const returnToSearch = {
      returnRoute: "/search",
      activeResultId: "message-42",
      querySnapshot: {
        query: "Synthetic private query",
        filter: "all" as const,
        scope: "all" as const,
        scopeChat: null,
      },
      sourceConversationId: "room_synthetic@chatroom",
    };

    useChatStore.getState().setAnchorLoading(anchor, returnToSearch);
    expect(useChatStore.getState()).toMatchObject({
      anchorStatus: "loading",
      activeAnchor: anchor,
      returnToSearch,
      highlightedMessageId: null,
    });

    useChatStore.getState().setAnchorHit("message-42");
    expect(useChatStore.getState()).toMatchObject({
      anchorStatus: "hit",
      highlightedMessageId: "message-42",
    });

    useChatStore.getState().setAnchorMissing();
    expect(useChatStore.getState()).toMatchObject({
      anchorStatus: "missing",
      highlightedMessageId: null,
    });
  });

  it("clears stale anchor state when selecting a normal conversation", () => {
    useChatStore.getState().setAnchorLoading({
      source: "search",
      chat: "room_synthetic@chatroom",
      messageId: "message-42",
      localId: 42,
      timestamp: 1_714_288_000,
      time: "2024-04-28 09:20",
    }, {
      returnRoute: "/search",
      activeResultId: "message-42",
      querySnapshot: {
        query: "Synthetic private query",
        filter: "all",
        scope: "all",
        scopeChat: null,
      },
      sourceConversationId: "room_synthetic@chatroom",
    });

    useChatStore.getState().selectConversation("conversation-2");

    expect(useChatStore.getState()).toMatchObject({
      selectedConversationId: "conversation-2",
      anchorStatus: "idle",
      activeAnchor: null,
      highlightedMessageId: null,
      returnToSearch: null,
    });
  });
});

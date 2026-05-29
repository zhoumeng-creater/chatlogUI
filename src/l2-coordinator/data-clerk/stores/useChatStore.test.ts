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
});

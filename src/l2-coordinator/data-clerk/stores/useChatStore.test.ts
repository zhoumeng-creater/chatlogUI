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

  it("merges unread sessions into existing conversations without replacing metadata", () => {
    useChatStore.getState().setConversations(
      [
        {
          id: "group_synthetic_001@chatroom",
          username: "group_synthetic_001@chatroom",
          displayName: "Synthetic Product Group",
          chatType: "group",
          isGroup: true,
          summary: "old summary",
          timestamp: 10,
          timeLabel: "old time",
          unread: 0,
          lastSender: "",
          source: "session",
        },
      ],
      {},
      {},
    );

    useChatStore.getState().mergeUnreadSessions([
      {
        id: "group_synthetic_001@chatroom",
        username: "group_synthetic_001@chatroom",
        displayName: "Synthetic Product Group",
        chatType: "group",
        isGroup: true,
        summary: "Synthetic unread summary",
        timestamp: 1800000000,
        timeLabel: "2026-06-02 12:00",
        unread: 2,
        lastSender: "member_synthetic_001",
        source: "session",
      },
    ]);

    expect(useChatStore.getState().conversations[0]).toMatchObject({
      displayName: "Synthetic Product Group",
      unread: 2,
      lastSender: "member_synthetic_001",
      summary: "Synthetic unread summary",
    });
  });

  it("stores group members by selected chat with explicit status", () => {
    useChatStore.getState().setMembersLoading("group_synthetic_001@chatroom");
    useChatStore.getState().setMembers({
      chat: "Synthetic Product Group",
      username: "group_synthetic_001@chatroom",
      count: 1,
      members: [
        {
          id: "member_synthetic_owner",
          username: "member_synthetic_owner",
          display: "Synthetic Owner",
          isOwner: true,
        },
      ],
    });

    expect(useChatStore.getState().membersStatus).toBe("ready");
    expect(useChatStore.getState().membersByChat["group_synthetic_001@chatroom"].members[0].isOwner).toBe(true);
  });

  it("merges incremental messages by id and preserves new_state", () => {
    useChatStore.getState().setMessages([message(1)], 1, 0, false);

    useChatStore.getState().mergeNewMessages(
      [
        message(1),
        {
          ...message(2),
          timestamp: 2,
          time: "2026-06-02 12:01",
          content: "new",
        },
      ],
      { "room123@chatroom": 1800000001 },
    );

    expect(useChatStore.getState().messages.map((item) => item.id)).toEqual(["1", "2"]);
    expect(useChatStore.getState().newMessagesCount).toBe(1);
    expect(useChatStore.getState().newMessagesState).toEqual({
      "room123@chatroom": 1800000001,
    });
  });

  it("resets P4-B extension state with the active transcript state", () => {
    useChatStore.getState().setUnreadLoading();
    useChatStore.getState().setMembersLoading("group_synthetic_001@chatroom");
    useChatStore.getState().setMembers({
      chat: "Synthetic Product Group",
      username: "group_synthetic_001@chatroom",
      count: 1,
      members: [
        {
          id: "member_synthetic_owner",
          username: "member_synthetic_owner",
          display: "Synthetic Owner",
          isOwner: true,
        },
      ],
    });
    useChatStore.getState().mergeNewMessages([message(2)], {
      "room123@chatroom": 1800000001,
    });

    useChatStore.getState().resetChat();

    expect(useChatStore.getState()).toMatchObject({
      unreadStatus: "idle",
      unreadError: null,
      membersStatus: "idle",
      membersError: null,
      activeMembersChat: null,
      membersByChat: {},
      newMessagesStatus: "idle",
      newMessagesError: null,
      newMessagesState: {},
      newMessagesCount: 0,
    });
  });
});

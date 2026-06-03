import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDiagnosticEventStore } from "@/l2-coordinator/data-clerk/stores/useDiagnosticEventStore";
import { useChatStore, type ChatMessage } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import {
  loadMembersIntoStore,
  refreshNewMessagesIntoStore,
  refreshUnreadIntoStore,
} from "./useChatExtensionsCommander";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  useChatStore.setState({
    conversations: [],
    contactsByUsername: {},
    chatRoomsByName: {},
    conversationsStatus: "idle",
    conversationsError: null,
    selectedConversationId: null,
    messages: [],
    messagesLoading: false,
    messagesHasMore: false,
    messagesTotalCount: 0,
    messagesOffset: 0,
    messagesStatus: "idle",
    messagesError: null,
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
  useDiagnosticEventStore.setState({
    items: [],
    filters: {
      source: "all",
      level: "all",
      privacy: "all",
      endpointFamily: "all",
      failedOnly: false,
      timeRange: "all",
    },
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("useChatExtensionsCommander actions", () => {
  it("refreshes unread, members, and incremental messages into chat state", async () => {
    useChatStore.getState().setConversations(
      [
        {
          id: "group_synthetic_001@chatroom",
          username: "group_synthetic_001@chatroom",
          displayName: "Synthetic Product Group",
          chatType: "group",
          isGroup: true,
          summary: "",
          timestamp: 1,
          timeLabel: "",
          unread: 0,
          lastSender: "",
          source: "session",
        },
      ],
      {},
      {},
    );
    useChatStore.getState().setMessages([message(1)], 1, 0, false);

    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);

      if (url.includes("/api/v1/unread")) {
        return new Response(JSON.stringify({
          total: 1,
          sessions: [
            {
              chat: "Synthetic Product Group",
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
        }), { status: 200 });
      }

      if (url.includes("/api/v1/members")) {
        return new Response(JSON.stringify({
          chat: "Synthetic Product Group",
          username: "group_synthetic_001@chatroom",
          count: 1,
          members: [
            { username: "member_synthetic_owner", display: "Synthetic Owner", is_owner: true },
          ],
        }), { status: 200 });
      }

      return new Response(JSON.stringify({
        count: 1,
        new_state: { "group_synthetic_001@chatroom": 1800000001 },
        messages: [
          {
            chat: "Synthetic Product Group",
            username: "group_synthetic_001@chatroom",
            is_group: true,
            chat_type: "group",
            local_id: 2,
            timestamp: 1800000001,
            time: "2026-06-02 12:01",
            sender: "member_synthetic_guest",
            type: "text",
            content: "Synthetic incremental message",
          },
        ],
      }), { status: 200 });
    });

    await refreshUnreadIntoStore();
    await loadMembersIntoStore("group_synthetic_001@chatroom");
    await refreshNewMessagesIntoStore();

    expect(useChatStore.getState().conversations[0].unread).toBe(2);
    expect(useChatStore.getState().membersStatus).toBe("ready");
    expect(useChatStore.getState().newMessagesCount).toBe(1);
    expect(useDiagnosticEventStore.getState().items.map((event) => event.attributes?.endpointFamily)).toEqual([
      "unread",
      "members",
      "new_messages",
    ]);
    expect(JSON.stringify(useDiagnosticEventStore.getState().items)).not.toContain(
      "Synthetic incremental message",
    );
  });
});

function message(id: number): ChatMessage {
  return {
    id: String(id),
    localId: id,
    timestamp: id,
    time: "2026-06-02 12:00",
    sender: "member_synthetic_guest",
    type: "text",
    content: `message ${id}`,
    chat: "Synthetic Product Group",
    username: "group_synthetic_001@chatroom",
    isGroup: true,
    chatType: "group",
    direction: "unknown",
  };
}

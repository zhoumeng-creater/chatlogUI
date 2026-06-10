import { describe, expect, it } from "vitest";
import type { Conversation } from "@/l2-coordinator/data-clerk/stores/useChatStore";
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

function searchMessage(overrides: Partial<Parameters<typeof resolveSearchHitNavigation>[0]["message"]> = {}) {
  return {
    id: "wxid_synthetic_user-42",
    localId: 42,
    timestamp: 1_714_288_000,
    time: "2024-04-28 09:20",
    content: "Synthetic private result content",
    sender: "Synthetic Sender",
    username: "wxid_synthetic_user",
    chat: "Synthetic User",
    ...overrides,
  };
}

describe("resolveSearchHitNavigation", () => {
  it("uses backend username before display chat text when resolving the target conversation", () => {
    const result = resolveSearchHitNavigation({
      message: searchMessage({
        username: "wxid_backend_target",
        chat: "Display label only",
      }),
      conversations: [
        { ...baseConversation, id: "display-conversation", username: "Display label only" },
        { ...baseConversation, id: "backend-conversation", username: "wxid_backend_target" },
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
      chat: "wxid_backend_target",
      anchor: {
        source: "search",
        messageId: "wxid_synthetic_user-42",
        localId: 42,
        timestamp: 1_714_288_000,
        time: "2024-04-28 09:20",
      },
      returnToSearch: {
        returnRoute: "/search",
        activeResultId: "wxid_synthetic_user-42",
      },
    });
  });

  it("falls back to backend chat id when username is missing", () => {
    const result = resolveSearchHitNavigation({
      message: searchMessage({
        username: "",
        chat: "room_synthetic@chatroom",
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

  it("returns a privacy-safe error when the conversation cannot be resolved", () => {
    const result = resolveSearchHitNavigation({
      message: searchMessage({
        username: "wxid_private_missing",
        chat: "Private Missing Display",
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
      ok: false,
      reason: "missing-conversation",
      message: "无法打开搜索结果对应的会话，请刷新会话列表后重试。",
    });
    expect(JSON.stringify(result)).not.toContain("wxid_private_missing");
    expect(JSON.stringify(result)).not.toContain("Private Missing Display");
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

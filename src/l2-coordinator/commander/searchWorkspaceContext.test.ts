import { describe, expect, it } from "vitest";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import { resolveSearchScopeChat } from "./searchWorkspaceContext";

const conversations: Conversation[] = [
  {
    id: "conversation-1",
    username: "session_synthetic_001",
    displayName: "Synthetic Session",
    chatType: "private",
    isGroup: false,
    summary: "",
    timestamp: 0,
    timeLabel: "",
    unread: 0,
    lastSender: "",
    source: "session",
  },
];

describe("resolveSearchScopeChat", () => {
  it("uses the scoped route chat before selected conversation state", () => {
    expect(resolveSearchScopeChat({
      scope: "current",
      scopedChat: "route_synthetic_chat",
      conversations,
      selectedConversationId: "conversation-1",
    })).toBe("route_synthetic_chat");
  });

  it("falls back to the selected conversation for current scope", () => {
    expect(resolveSearchScopeChat({
      scope: "current",
      scopedChat: null,
      conversations,
      selectedConversationId: "conversation-1",
    })).toBe("session_synthetic_001");
  });

  it("does not constrain all-session searches", () => {
    expect(resolveSearchScopeChat({
      scope: "all",
      scopedChat: "route_synthetic_chat",
      conversations,
      selectedConversationId: "conversation-1",
    })).toBeNull();
  });
});

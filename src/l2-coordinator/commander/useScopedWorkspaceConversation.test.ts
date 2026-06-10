import { describe, expect, it } from "vitest";
import { findConversationForScopedChat } from "./useScopedWorkspaceConversation";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";

describe("findConversationForScopedChat", () => {
  it("resolves scoped workspace chat params by username or conversation id", () => {
    const conversations = [
      conversation({ id: "session-id-1", username: "session_synthetic_001" }),
      conversation({ id: "session-id-2", username: "chatroom_synthetic_002" }),
    ];

    expect(findConversationForScopedChat(conversations, "session_synthetic_001")?.id).toBe("session-id-1");
    expect(findConversationForScopedChat(conversations, "session-id-2")?.username).toBe("chatroom_synthetic_002");
  });

  it("ignores empty or unknown scoped chat params", () => {
    const conversations = [conversation({ id: "session-id-1", username: "session_synthetic_001" })];

    expect(findConversationForScopedChat(conversations, "")).toBeNull();
    expect(findConversationForScopedChat(conversations, "missing")).toBeNull();
  });
});

function conversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: "session-id",
    username: "session",
    displayName: "Synthetic Session",
    chatType: "private",
    isGroup: false,
    summary: "",
    timestamp: 0,
    timeLabel: "",
    unread: 0,
    lastSender: "",
    source: "session",
    ...overrides,
  };
}

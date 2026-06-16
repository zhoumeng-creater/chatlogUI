import { describe, expect, it } from "vitest";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import { buildWorkspaceRouteScopeView } from "./workspaceRouteScope";

describe("buildWorkspaceRouteScopeView", () => {
  it("resolves current-chat deep links while keeping visible labels privacy-safe", () => {
    const view = buildWorkspaceRouteScopeView({
      scope: "currentChat",
      scopedChat: "room_secret_001",
      focus: "private launch topic",
      source: "search",
      conversations: [
        conversation({
          id: "c1",
          username: "room_secret_001",
          displayName: "Private Launch Room",
        }),
      ],
      selectedConversation: null,
      privacyOn: true,
    });

    expect(view.state).toBe("current-chat");
    expect(view.scopeKind).toBe("currentConversation");
    expect(view.contextChips).toEqual([
      expect.objectContaining({ id: "sourceRoute", label: "来源", value: "来自搜索结果" }),
      expect.objectContaining({ id: "focusMessage", label: "定位", value: "上下文定位" }),
    ]);
    expect(view.currentChat).toBe("room_secret_001");
    expect(view.scopeLabel).toBe("当前会话（已隐藏）");
    expect(view.sourceLabel).toBe("来自搜索结果");
    expect(view.focusLabel).toBe("已从上下文进入，可在本页筛选定位对象。");

    const visibleCopy = [view.scopeLabel, view.scopeDescription, view.sourceLabel, view.focusLabel].join(" ");
    expect(visibleCopy).not.toContain("room_secret_001");
    expect(visibleCopy).not.toContain("Private Launch Room");
    expect(visibleCopy).not.toContain("private launch topic");
  });

  it("uses the selected conversation as current scope when no scoped chat is present", () => {
    const view = buildWorkspaceRouteScopeView({
      conversations: [conversation({ id: "c1", username: "room_001", displayName: "Design Room" })],
      selectedConversation: conversation({ id: "c1", username: "room_001", displayName: "Design Room" }),
      privacyOn: false,
    });

    expect(view.state).toBe("current-chat");
    expect(view.hasScopedChat).toBe(false);
    expect(view.scopeLabel).toBe("当前会话：Design Room");
    expect(view.scopeDescription).toContain("当前选中的会话");
  });

  it("reports missing scoped chats without echoing the raw query value", () => {
    const view = buildWorkspaceRouteScopeView({
      scope: "currentChat",
      scopedChat: "missing_private_room",
      source: "https://example.test/private-source",
      conversations: [],
      selectedConversation: null,
      privacyOn: false,
    });

    expect(view.state).toBe("missing-chat");
    expect(view.missingChat).toBe(true);
    expect(view.scopeLabel).toBe("来源会话未找到");
    expect(view.sourceLabel).toBe("来自上下文入口");
    expect(view.scopeDescription).not.toContain("missing_private_room");
    expect(view.sourceLabel).not.toContain("example.test");
  });

  it("uses product labels for cross-module source context", () => {
    expect(buildWorkspaceRouteScopeView({
      scope: "all",
      source: "ai",
      conversations: [],
      selectedConversation: null,
      privacyOn: false,
    }).sourceLabel).toBe("来自 AI 证据");
    expect(buildWorkspaceRouteScopeView({
      scope: "all",
      source: "graph",
      conversations: [],
      selectedConversation: null,
      privacyOn: false,
    }).sourceLabel).toBe("来自图谱");
  });

  it("supports an explicit all-conversations scope without inventing a chat", () => {
    const view = buildWorkspaceRouteScopeView({
      scope: "all",
      scopedChat: "",
      conversations: [conversation({ id: "c1", username: "room_001" })],
      selectedConversation: conversation({ id: "c1", username: "room_001" }),
      privacyOn: false,
    });

    expect(view.state).toBe("all");
    expect(view.scopeKind).toBe("allConversations");
    expect(view.currentConversation).toBeNull();
    expect(view.currentChat).toBe("");
    expect(view.scopeLabel).toBe("全部会话");
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

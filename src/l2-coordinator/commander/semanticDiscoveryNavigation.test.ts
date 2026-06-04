import { describe, expect, it } from "vitest";
import type { SemanticSearchResultItem } from "@/l2-coordinator/api-docs/semantic";
import type { Conversation } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { resolveSemanticSearchTarget } from "./semanticDiscoveryNavigation";

describe("semanticDiscoveryNavigation", () => {
  it("resolves semantic results by backend username, not display name", () => {
    const result = semanticResult({
      chat: "wxid_alpha",
      chatName: "Synthetic Session Alpha",
      localId: 77,
    });

    expect(resolveSemanticSearchTarget(result, conversations(), false)).toEqual({
      kind: "ready",
      conversationId: "conv-alpha",
      chat: "wxid_alpha",
      localId: 77,
      message: "已定位到 Synthetic Session Alpha 的第 77 条附近。",
    });
  });

  it("does not treat a display name as a loadable chat identifier", () => {
    const result = semanticResult({
      chat: "Synthetic Session Alpha",
      chatName: "Synthetic Session Alpha",
      localId: 12,
    });

    expect(resolveSemanticSearchTarget(result, conversations(), true)).toEqual({
      kind: "missing",
      message: "未找到可打开的会话。请先在左侧会话列表中刷新数据。",
    });
  });
});

function semanticResult(overrides: Partial<SemanticSearchResultItem>): SemanticSearchResultItem {
  return {
    chat: "wxid_alpha",
    chatName: "Synthetic Session Alpha",
    sender: "Alice",
    senderId: "wxid_sender",
    time: "2026-06-05 10:00",
    content: "release risk",
    relevanceScore: 0.91,
    localId: 1,
    ...overrides,
  };
}

function conversations(): Conversation[] {
  return [
    {
      id: "conv-alpha",
      username: "wxid_alpha",
      displayName: "Synthetic Session Alpha",
      chatType: "friend",
      isGroup: false,
      summary: "",
      timestamp: 0,
      timeLabel: "",
      unread: 0,
      lastSender: "",
      source: "fixture",
    },
  ];
}

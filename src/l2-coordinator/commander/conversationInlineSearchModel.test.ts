import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import {
  buildConversationInlineSearchModel,
  getNextConversationSearchIndex,
} from "./conversationInlineSearchModel";

const messages: ChatMessage[] = [
  message("m1", "Alice", "第一条普通消息", "2026-07-05 13:00"),
  message("m2", "Bob", "需要定位的关键词", "2026-07-05 13:01"),
  message("m3", "Alice", "第二条关键词", "2026-07-05 13:02"),
];

describe("conversationInlineSearchModel", () => {
  it("finds loaded-message matches without exposing snippets in the status label", () => {
    const model = buildConversationInlineSearchModel({
      query: "关键词",
      messages,
      activeIndex: 0,
    });

    expect(model.matchIds).toEqual(["m2", "m3"]);
    expect(model.activeMessageId).toBe("m2");
    expect(model.statusText).toBe("第 1 / 2 条 · 当前已加载 3 条消息");
    expect(model.statusText).not.toContain("需要定位的关键词");
  });

  it("wraps previous and next navigation across matches", () => {
    expect(getNextConversationSearchIndex({ currentIndex: 1, matchCount: 2, direction: "next" })).toBe(0);
    expect(getNextConversationSearchIndex({ currentIndex: 0, matchCount: 2, direction: "previous" })).toBe(1);
  });
});

function message(id: string, senderName: string, content: string, time: string): ChatMessage {
  return {
    id,
    localId: Number(id.slice(1)),
    timestamp: 1,
    time,
    sender: senderName,
    senderName,
    type: "text",
    content,
    chat: "synthetic-room",
    username: "synthetic-room",
    isGroup: true,
    chatType: "group",
    direction: "other",
  };
}

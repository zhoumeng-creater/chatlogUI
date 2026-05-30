import { describe, expect, it } from "vitest";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import {
  filterConversations,
  formatConversationA11yLabel,
  getConversationBadge,
  getConversationEmptyMessage,
  maskDisplayText,
} from "./conversationDisplay";

function conversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: overrides.id ?? "wxid_a",
    username: overrides.username ?? "wxid_a",
    displayName: overrides.displayName ?? "张三",
    chatType: overrides.chatType ?? "private",
    isGroup: overrides.isGroup ?? false,
    summary: overrides.summary ?? "最近一条消息",
    timestamp: overrides.timestamp ?? 100,
    timeLabel: overrides.timeLabel ?? "12:00",
    unread: overrides.unread ?? 0,
    lastSender: overrides.lastSender ?? "",
    source: overrides.source ?? "session",
    contact: overrides.contact,
    chatroom: overrides.chatroom,
  };
}

describe("conversationDisplay", () => {
  it("filters by name, username, summary, and last sender", () => {
    const list = [
      conversation({
        id: "a",
        displayName: "项目群",
        username: "room@chatroom",
        summary: "验收计划",
        lastSender: "王五",
        isGroup: true,
        chatType: "group",
      }),
      conversation({ id: "b", displayName: "李四", username: "wxid_b", summary: "晚饭" }),
    ];

    expect(filterConversations(list, "验收", "recent").map((item) => item.id)).toEqual(["a"]);
    expect(filterConversations(list, "wxid_b", "recent").map((item) => item.id)).toEqual(["b"]);
    expect(filterConversations(list, "王五", "recent").map((item) => item.id)).toEqual(["a"]);
  });

  it("filters private and group conversations without reordering", () => {
    const list = [
      conversation({ id: "group", isGroup: true, chatType: "group" }),
      conversation({ id: "private", isGroup: false, chatType: "private" }),
    ];

    expect(filterConversations(list, "", "group").map((item) => item.id)).toEqual(["group"]);
    expect(filterConversations(list, "", "private").map((item) => item.id)).toEqual(["private"]);
  });

  it("returns stable badges for source and kind", () => {
    expect(getConversationBadge(conversation({ source: "session", isGroup: false }))).toEqual({
      label: "最近",
      tone: "accent",
    });
    expect(getConversationBadge(conversation({ source: "contact", isGroup: false }))).toEqual({
      label: "联系人",
      tone: "neutral",
    });
    expect(getConversationBadge(conversation({ source: "chatroom", isGroup: true }))).toEqual({
      label: "群聊",
      tone: "success",
    });
  });

  it("builds an aria label with unread and time context", () => {
    expect(formatConversationA11yLabel(conversation({
      displayName: "项目群",
      unread: 3,
      timeLabel: "昨天",
    }))).toBe("项目群，昨天，3 条未读");
    expect(formatConversationA11yLabel(conversation({
      displayName: "李四",
      unread: 0,
      timeLabel: "",
    }))).toBe("李四");
  });

  it("masks private names in aria labels when privacy is enabled", () => {
    expect(formatConversationA11yLabel(conversation({
      displayName: "Alice Private",
      unread: 2,
      timeLabel: "10:30",
    }), true)).toBe("***** *******，10:30，2 条未读");
  });

  it("keeps spaces while masking private text", () => {
    expect(maskDisplayText("A B")).toBe("* *");
  });

  it("uses distinct empty messages for list, filter, and error states", () => {
    expect(getConversationEmptyMessage("ready", "", "recent")).toBe("数据库已连接，但没有返回最近会话。");
    expect(getConversationEmptyMessage("ready", "abc", "recent")).toBe("没有匹配的会话。");
    expect(getConversationEmptyMessage("ready", "", "private")).toBe("没有私聊会话。");
    expect(getConversationEmptyMessage("error", "", "group")).toBe("会话列表加载失败。");
  });
});

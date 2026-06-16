import { describe, expect, it } from "vitest";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import {
  filterConversationItems,
  formatConversationListA11yLabel,
  getConversationFilterCounts,
  getConversationListSortState,
  moveConversationListFocus,
  resolveConversationListActiveId,
  type ConversationListFilter,
} from "./conversationListInteractionModel";

function conversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: overrides.id ?? "session-alpha",
    username: overrides.username ?? overrides.id ?? "session-alpha",
    displayName: overrides.displayName ?? "Synthetic Alpha",
    chatType: overrides.chatType ?? "private",
    isGroup: overrides.isGroup ?? false,
    summary: overrides.summary ?? "Synthetic private summary",
    timestamp: overrides.timestamp ?? 1_714_288_000,
    timeLabel: overrides.timeLabel ?? "09:20",
    unread: overrides.unread ?? 0,
    lastSender: overrides.lastSender ?? "Synthetic Sender",
    source: overrides.source ?? "session",
  };
}

const conversations = [
  conversation({ id: "private", chatType: "private", displayName: "Private Friend" }),
  conversation({ id: "group", chatType: "group", isGroup: true, displayName: "Group Room" }),
  conversation({ id: "service", chatType: "service_account", displayName: "Service Account" }),
  conversation({ id: "enterprise", chatType: "enterprise_contact", displayName: "Enterprise User" }),
  conversation({ id: "folded", chatType: "folded", displayName: "Folded Chat" }),
];

describe("conversationListInteractionModel", () => {
  it("derives filter counts from loaded conversations without extra data", () => {
    expect(getConversationFilterCounts(conversations)).toEqual({
      all: 5,
      recent: 5,
      private: 1,
      group: 1,
      official_service: 1,
      enterprise_system: 1,
      folded_unknown: 1,
    });
  });

  it("filters by query and conversation category", () => {
    expect(filterConversationItems(conversations, "room", "group").map((item) => item.id)).toEqual(["group"]);
    expect(filterConversationItems(conversations, "account", "official_service").map((item) => item.id)).toEqual(["service"]);
  });

  it("returns sort copy and disabled reason when timestamps are not meaningful", () => {
    expect(getConversationListSortState(conversations)).toEqual({
      label: "按最近消息排序",
      disabledReason: null,
    });

    expect(getConversationListSortState([
      conversation({ id: "a", timestamp: 0 }),
      conversation({ id: "b", timestamp: 0 }),
    ])).toEqual({
      label: "排序不可用",
      disabledReason: "当前会话缺少最近消息时间，暂时无法说明排序。",
    });
  });

  it("keeps or repairs the active row after filtering", () => {
    expect(resolveConversationListActiveId({
      visibleConversations: conversations,
      activeId: "group",
      selectedConversationId: null,
    })).toBe("group");

    expect(resolveConversationListActiveId({
      visibleConversations: filterConversationItems(conversations, "", "private"),
      activeId: "group",
      selectedConversationId: "service",
    })).toBe("private");
  });

  it("supports roving focus and enter activation", () => {
    const ids = ["private", "group", "service"];

    expect(moveConversationListFocus({ ids, activeId: "private", key: "ArrowDown" })).toEqual({
      activeId: "group",
      openId: null,
    });
    expect(moveConversationListFocus({ ids, activeId: "group", key: "Home" })).toEqual({
      activeId: "private",
      openId: null,
    });
    expect(moveConversationListFocus({ ids, activeId: "group", key: "End" })).toEqual({
      activeId: "service",
      openId: null,
    });
    expect(moveConversationListFocus({ ids, activeId: "group", key: "Enter" })).toEqual({
      activeId: "group",
      openId: "group",
    });
  });

  it("keeps privacy-mode accessible labels free of raw names and summaries", () => {
    const label = formatConversationListA11yLabel(
      conversation({
        displayName: "Synthetic Private Name",
        summary: "Synthetic private message body",
        unread: 4,
      }),
      { privacyOn: true, unreadStatus: "ready" },
    );

    expect(label).toContain("已隐藏会话");
    expect(label).toContain("4 条未读");
    expect(label).not.toContain("Synthetic Private Name");
    expect(label).not.toContain("Synthetic private message body");
  });

  it("accepts every planned filter value", () => {
    const values: ConversationListFilter[] = [
      "all",
      "recent",
      "private",
      "group",
      "official_service",
      "enterprise_system",
      "folded_unknown",
    ];

    expect(values).toHaveLength(7);
  });
});

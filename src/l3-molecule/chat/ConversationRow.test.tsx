import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import { ConversationRow } from "./ConversationRow";

describe("ConversationRow", () => {
  it("uses a compact type dot in the row instead of visible type text", () => {
    const html = renderToStaticMarkup(
      <ConversationRow
        conversation={conversation({
          displayName: "Very Long Group Name With Many Characters",
          summary: "这是一条很长的最新消息摘要，会和右侧类型标签竞争横向空间。",
          chatType: "service_account",
          isGroup: false,
        })}
        selected={false}
        active={false}
        tabIndex={0}
        privacyOn={false}
        unreadStatus="ready"
        onOpen={vi.fn()}
        onFocus={vi.fn()}
        onKeyDown={vi.fn()}
      />,
    );

    expect(html).toContain("conversation-row__status");
    expect(html).toContain("conversation-row__type-dot");
    expect(html).toContain('data-tone="official"');
    expect(html).not.toContain("ui-status-indicator");
    expect(html).not.toContain(">服务号</span>");
  });
});

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: overrides.id ?? "wxid_synthetic_a",
    username: overrides.username ?? "wxid_synthetic_a",
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

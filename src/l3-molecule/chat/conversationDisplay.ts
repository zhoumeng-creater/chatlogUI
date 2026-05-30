import type { Conversation, LoadStatus } from "@l2/data-clerk/stores/useChatStore";

export type ConversationFilter = "recent" | "private" | "group";
export type ConversationBadgeTone = "neutral" | "accent" | "success";

export interface ConversationBadge {
  label: string;
  tone: ConversationBadgeTone;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function maskDisplayText(value: string): string {
  return value.replace(/[^\s]/g, "*");
}

export function filterConversations(
  conversations: Conversation[],
  query: string,
  filter: ConversationFilter,
): Conversation[] {
  const normalizedQuery = normalize(query);

  return conversations.filter((conversation) => {
    if (filter === "private" && conversation.isGroup) return false;
    if (filter === "group" && !conversation.isGroup) return false;
    if (!normalizedQuery) return true;

    const searchable = [
      conversation.displayName,
      conversation.username,
      conversation.summary,
      conversation.lastSender,
    ].join(" ").toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

export function getConversationBadge(conversation: Conversation): ConversationBadge {
  if (conversation.source === "session") {
    return { label: "最近", tone: "accent" };
  }

  if (conversation.isGroup || conversation.source === "chatroom") {
    return { label: "群聊", tone: "success" };
  }

  return { label: "联系人", tone: "neutral" };
}

export function formatConversationA11yLabel(conversation: Conversation): string {
  const parts = [conversation.displayName];
  if (conversation.timeLabel) parts.push(conversation.timeLabel);
  if (conversation.unread > 0) parts.push(`${conversation.unread} 条未读`);
  return parts.join("，");
}

export function getConversationEmptyMessage(
  status: LoadStatus,
  query: string,
  filter: ConversationFilter,
): string {
  if (status === "error") return "会话列表加载失败。";
  if (query.trim()) return "没有匹配的会话。";
  if (filter === "private") return "没有私聊会话。";
  if (filter === "group") return "没有群聊会话。";
  return "数据库已连接，但没有返回最近会话。";
}

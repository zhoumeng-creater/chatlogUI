import type { Conversation, LoadStatus, UnreadStatus } from "@l2/data-clerk/stores/useChatStore";

export type ConversationFilter =
  | "all"
  | "recent"
  | "private"
  | "group"
  | "official_service"
  | "enterprise_system"
  | "folded_unknown";
export type ConversationBadgeTone = "neutral" | "info" | "success";

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
    const chatType = conversation.chatType;
    const isOfficialService = [
      "official_account",
      "subscription_account",
      "service_account",
    ].includes(chatType);
    const isEnterpriseSystem = [
      "enterprise_contact",
      "enterprise_account",
      "system",
    ].includes(chatType);
    const isFoldedUnknown = ["folded", "unknown"].includes(chatType);

    if (filter === "private" && (conversation.isGroup || chatType !== "private")) return false;
    if (filter === "group" && !conversation.isGroup) return false;
    if (filter === "official_service" && !isOfficialService) return false;
    if (filter === "enterprise_system" && !isEnterpriseSystem) return false;
    if (filter === "folded_unknown" && !isFoldedUnknown) return false;
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
  if (conversation.chatType === "group" || conversation.isGroup || conversation.source === "chatroom") {
    return { label: "群聊", tone: "success" };
  }

  if (conversation.chatType === "subscription_account") {
    return { label: "订阅号", tone: "info" };
  }

  if (conversation.chatType === "service_account") {
    return { label: "服务号", tone: "info" };
  }

  if (conversation.chatType === "official_account") {
    return { label: "公众号", tone: "info" };
  }

  if (conversation.chatType === "enterprise_contact" || conversation.chatType === "enterprise_account") {
    return { label: "企业微信", tone: "success" };
  }

  if (conversation.chatType === "system") {
    return { label: "系统", tone: "neutral" };
  }

  if (conversation.chatType === "folded") {
    return { label: "折叠", tone: "neutral" };
  }

  if (conversation.chatType === "unknown") {
    return { label: "未知", tone: "neutral" };
  }

  if (conversation.source === "session") {
    return { label: "最近", tone: "info" };
  }

  return { label: "联系人", tone: "neutral" };
}

export function shouldShowUnreadBadge(
  conversation: Pick<Conversation, "unread">,
  unreadStatus: UnreadStatus,
): boolean {
  return unreadStatus === "ready" && conversation.unread > 0;
}

export function formatConversationA11yLabel(
  conversation: Conversation,
  privacyOn = false,
  unreadStatus: UnreadStatus = "ready",
): string {
  const parts = [privacyOn ? maskDisplayText(conversation.displayName) : conversation.displayName];
  if (conversation.timeLabel) parts.push(conversation.timeLabel);
  if (shouldShowUnreadBadge(conversation, unreadStatus)) parts.push(`${conversation.unread} 条未读`);
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
  if (filter === "official_service") return "没有公众号或服务号会话。";
  if (filter === "enterprise_system") return "没有企业微信或系统会话。";
  if (filter === "folded_unknown") return "没有折叠或未知类型会话。";
  return "数据库已连接，但没有返回最近会话。";
}

import type { Conversation, UnreadStatus } from "@l2/data-clerk/stores/useChatStore";

export type ConversationListFilter =
  | "all"
  | "recent"
  | "private"
  | "group"
  | "official_service"
  | "enterprise_system"
  | "folded_unknown";

export type ConversationFilterCounts = Record<ConversationListFilter, number>;

export interface ConversationListSortState {
  label: string;
  disabledReason: string | null;
}

export interface ConversationListFocusResult {
  activeId: string | null;
  openId: string | null;
}

export interface ConversationFilterOptionView {
  value: ConversationListFilter;
  label: string;
  count: number;
}

export const CONVERSATION_LIST_FILTER_OPTIONS: Array<{
  value: ConversationListFilter;
  label: string;
}> = [
  { value: "all", label: "全部" },
  { value: "recent", label: "最近" },
  { value: "private", label: "私聊" },
  { value: "group", label: "群聊" },
  { value: "official_service", label: "公众号/服务号" },
  { value: "enterprise_system", label: "企业/系统" },
  { value: "folded_unknown", label: "折叠/未知" },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function maskDisplayText(value: string): string {
  return value.replace(/[^\s]/g, "*");
}

function belongsToFilter(conversation: Conversation, filter: ConversationListFilter): boolean {
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

  if (filter === "all" || filter === "recent") return true;
  if (filter === "private") return !conversation.isGroup && chatType === "private";
  if (filter === "group") return conversation.isGroup || chatType === "group";
  if (filter === "official_service") return isOfficialService;
  if (filter === "enterprise_system") return isEnterpriseSystem;
  return isFoldedUnknown;
}

export function getConversationFilterCounts(conversations: Conversation[]): ConversationFilterCounts {
  const counts: ConversationFilterCounts = {
    all: conversations.length,
    recent: conversations.length,
    private: 0,
    group: 0,
    official_service: 0,
    enterprise_system: 0,
    folded_unknown: 0,
  };

  for (const conversation of conversations) {
    if (belongsToFilter(conversation, "private")) counts.private += 1;
    if (belongsToFilter(conversation, "group")) counts.group += 1;
    if (belongsToFilter(conversation, "official_service")) counts.official_service += 1;
    if (belongsToFilter(conversation, "enterprise_system")) counts.enterprise_system += 1;
    if (belongsToFilter(conversation, "folded_unknown")) counts.folded_unknown += 1;
  }

  return counts;
}

export function getConversationFilterOptions(
  conversations: Conversation[],
): ConversationFilterOptionView[] {
  const counts = getConversationFilterCounts(conversations);
  return CONVERSATION_LIST_FILTER_OPTIONS.map((option) => ({
    ...option,
    count: counts[option.value],
  }));
}

export function filterConversationItems(
  conversations: Conversation[],
  query: string,
  filter: ConversationListFilter,
): Conversation[] {
  const normalizedQuery = normalize(query);

  return conversations.filter((conversation) => {
    if (!belongsToFilter(conversation, filter)) return false;
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

export function getConversationListSortState(
  conversations: Array<Pick<Conversation, "timestamp">>,
): ConversationListSortState {
  if (conversations.length === 0 || conversations.some((conversation) => conversation.timestamp > 0)) {
    return {
      label: "按最近消息排序",
      disabledReason: null,
    };
  }

  return {
    label: "排序不可用",
    disabledReason: "当前会话缺少最近消息时间，暂时无法说明排序。",
  };
}

export function resolveConversationListActiveId({
  visibleConversations,
  activeId,
  selectedConversationId,
}: {
  visibleConversations: Conversation[];
  activeId: string | null;
  selectedConversationId: string | null;
}): string | null {
  if (visibleConversations.length === 0) return null;
  if (activeId && visibleConversations.some((conversation) => conversation.id === activeId)) {
    return activeId;
  }
  if (
    selectedConversationId &&
    visibleConversations.some((conversation) => conversation.id === selectedConversationId)
  ) {
    return selectedConversationId;
  }
  return visibleConversations[0]?.id ?? null;
}

export function moveConversationListFocus({
  ids,
  activeId,
  key,
}: {
  ids: string[];
  activeId: string | null;
  key: string;
}): ConversationListFocusResult {
  if (ids.length === 0) return { activeId: null, openId: null };
  const currentIndex = Math.max(0, activeId ? ids.indexOf(activeId) : 0);
  let nextIndex = currentIndex >= 0 ? currentIndex : 0;

  if (key === "ArrowDown") nextIndex = Math.min(ids.length - 1, nextIndex + 1);
  if (key === "ArrowUp") nextIndex = Math.max(0, nextIndex - 1);
  if (key === "Home") nextIndex = 0;
  if (key === "End") nextIndex = ids.length - 1;

  const nextId = ids[nextIndex] ?? null;
  return {
    activeId: nextId,
    openId: key === "Enter" && nextId ? nextId : null,
  };
}

export function formatConversationListA11yLabel(
  conversation: Conversation,
  {
    privacyOn,
    unreadStatus = "ready",
  }: {
    privacyOn: boolean;
    unreadStatus?: UnreadStatus;
  },
): string {
  const parts = [
    privacyOn ? "已隐藏会话" : conversation.displayName,
    conversation.timeLabel,
  ].filter(Boolean);

  if (unreadStatus === "ready" && conversation.unread > 0) {
    parts.push(`${conversation.unread} 条未读`);
  }
  if (!privacyOn && conversation.summary) {
    parts.push(conversation.summary);
  }

  return parts.join("，");
}

export function getConversationListStatusMessage({
  visibleCount,
  query,
  filter,
}: {
  visibleCount: number;
  query: string;
  filter: ConversationListFilter;
}): string {
  if (visibleCount > 0) return `已显示 ${visibleCount.toLocaleString()} 个会话`;
  if (query.trim()) return "没有匹配会话";
  if (filter !== "all") return "当前筛选没有会话";
  return "没有最近会话";
}

export function maskConversationDisplayText(value: string): string {
  return maskDisplayText(value);
}

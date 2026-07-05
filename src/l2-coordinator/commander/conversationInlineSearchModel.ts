import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";

export type ConversationSearchDirection = "previous" | "next";

export interface ConversationInlineSearchModel {
  query: string;
  matchIds: string[];
  matchCount: number;
  activeIndex: number;
  activeMessageId: string | null;
  statusText: string;
}

interface BuildConversationInlineSearchModelInput {
  query: string;
  messages: ChatMessage[];
  activeIndex: number;
}

export function buildConversationInlineSearchModel({
  query,
  messages,
  activeIndex,
}: BuildConversationInlineSearchModelInput): ConversationInlineSearchModel {
  const normalizedQuery = normalizeSearchText(query);
  const matchIds = normalizedQuery
    ? messages
        .filter((message) => getSearchableMessageText(message).includes(normalizedQuery))
        .map((message) => message.id)
    : [];
  const matchCount = matchIds.length;
  const safeActiveIndex = matchCount === 0 ? -1 : clamp(activeIndex, 0, matchCount - 1);
  const loadedText = `当前已加载 ${messages.length.toLocaleString()} 条消息`;
  const statusText = !normalizedQuery
    ? `输入关键词查找${loadedText.replace("当前", "")}`
    : matchCount === 0
      ? `${loadedText}中没有匹配项`
      : `第 ${(safeActiveIndex + 1).toLocaleString()} / ${matchCount.toLocaleString()} 条 · ${loadedText}`;

  return {
    query,
    matchIds,
    matchCount,
    activeIndex: safeActiveIndex,
    activeMessageId: safeActiveIndex >= 0 ? matchIds[safeActiveIndex] ?? null : null,
    statusText,
  };
}

export function getNextConversationSearchIndex({
  currentIndex,
  matchCount,
  direction,
}: {
  currentIndex: number;
  matchCount: number;
  direction: ConversationSearchDirection;
}): number {
  if (matchCount <= 0) return -1;
  const current = currentIndex < 0 ? 0 : currentIndex;
  return direction === "next"
    ? (current + 1) % matchCount
    : (current - 1 + matchCount) % matchCount;
}

function getSearchableMessageText(message: ChatMessage): string {
  return normalizeSearchText([
    message.content,
    message.senderName,
    message.sender,
    message.talkerName,
    message.talker,
    message.time,
    message.type,
    message.mediaType,
  ].filter(Boolean).join(" "));
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

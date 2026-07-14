import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import type {
  ChatMessageAnchor,
  ChatReturnToSearch,
  Conversation,
} from "@/l2-coordinator/data-clerk/stores/useChatStore";
import type { SearchScope } from "@/l2-coordinator/data-clerk/stores/useSearchStore";

export interface SearchHitMessage {
  id?: string;
  messageId?: string;
  seq?: number;
  sourceIndex?: number;
  localId?: number;
  timestamp: number;
  time?: string;
  content?: string;
  sender?: string;
  username?: string;
  chat?: string;
  conversationId?: string;
}

export interface SearchQuerySnapshot {
  query: string;
  filter: SearchFilterType;
  scope: SearchScope;
  scopeChat: string | null;
}

export type SearchReturnContext = ChatReturnToSearch;

export interface SearchHitAnchor extends ChatMessageAnchor {
  source: "search";
}

export type SearchHitNavigationResult =
  | {
      ok: true;
      conversationId: string;
      chat: string;
      anchor: SearchHitAnchor;
      returnToSearch: SearchReturnContext;
      requiresConversationLoad: boolean;
    }
  | {
      ok: false;
      reason: "missing-chat" | "missing-message";
      message: string;
    };

interface ResolveSearchHitNavigationInput {
  message: SearchHitMessage;
  conversations: Conversation[];
  returnRoute: string;
  querySnapshot: SearchQuerySnapshot;
}

function normalizeIdentifier(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function resolveTargetChat(message: SearchHitMessage): string {
  return normalizeIdentifier(message.conversationId) ||
    normalizeIdentifier(message.username) ||
    normalizeIdentifier(message.chat);
}

function findConversation(conversations: Conversation[], targetChat: string): Conversation | null {
  return conversations.find((conversation) =>
    conversation.username === targetChat || conversation.id === targetChat,
  ) ?? null;
}

export function resolveSearchHitNavigation({
  message,
  conversations,
  returnRoute,
  querySnapshot,
}: ResolveSearchHitNavigationInput): SearchHitNavigationResult {
  const chat = resolveTargetChat(message);
  if (!chat) {
    return {
      ok: false,
      reason: "missing-chat",
      message: "无法打开搜索结果对应的会话，请刷新搜索后重试。",
    };
  }

  const messageId = normalizeIdentifier(message.messageId) || normalizeIdentifier(message.id);
  if (!messageId) {
    return {
      ok: false,
      reason: "missing-message",
      message: "无法定位这条搜索结果，请刷新搜索后重试。",
    };
  }

  const conversation = findConversation(conversations, chat);

  return {
    ok: true,
    conversationId: conversation?.id ?? chat,
    chat,
    requiresConversationLoad: !conversation,
    anchor: {
      source: "search",
      chat,
      messageId,
      localId: typeof message.localId === "number" ? message.localId : null,
      timestamp: typeof message.timestamp === "number" ? message.timestamp : null,
      time: message.time ?? null,
    },
    returnToSearch: {
      returnRoute,
      activeResultId: messageId,
      querySnapshot,
      sourceConversationId: conversation?.id ?? chat,
    },
  };
}

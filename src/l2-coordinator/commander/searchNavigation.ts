import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import type {
  ChatMessageAnchor,
  ChatReturnToSearch,
  Conversation,
} from "@/l2-coordinator/data-clerk/stores/useChatStore";
import type { SearchScope } from "@/l2-coordinator/data-clerk/stores/useSearchStore";

export interface SearchHitMessage {
  id: string;
  localId?: number;
  timestamp: number;
  time?: string;
  content: string;
  sender: string;
  username: string;
  chat: string;
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
    }
  | {
      ok: false;
      reason: "missing-chat" | "missing-conversation";
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
  return normalizeIdentifier(message.username) || normalizeIdentifier(message.chat);
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

  const conversation = findConversation(conversations, chat);
  if (!conversation) {
    return {
      ok: false,
      reason: "missing-conversation",
      message: "无法打开搜索结果对应的会话，请刷新会话列表后重试。",
    };
  }

  return {
    ok: true,
    conversationId: conversation.id,
    chat,
    anchor: {
      source: "search",
      chat,
      messageId: message.id,
      localId: typeof message.localId === "number" ? message.localId : null,
      timestamp: typeof message.timestamp === "number" ? message.timestamp : null,
      time: message.time ?? null,
    },
    returnToSearch: {
      returnRoute,
      activeResultId: message.id,
      querySnapshot,
      sourceConversationId: conversation.id,
    },
  };
}

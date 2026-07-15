import type { SearchFilterType, SearchHit } from "@/l2-coordinator/api-docs/search";
import type {
  ChatMessageAnchor,
  ChatReturnToSearch,
  Conversation,
} from "@/l2-coordinator/data-clerk/stores/useChatStore";
import type { SearchScope } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { createSearchHitIdentity } from "./searchHitIdentity";
import type { SearchReturnSnapshot } from "./searchReturnSnapshot";

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
      conversationLabel: string;
      isGroup: boolean;
      anchor: SearchHitAnchor;
      returnToSearch: SearchReturnContext;
      requiresConversationLoad: boolean;
      dataRevision?: string;
      historyContextAvailable?: boolean;
    }
  | {
      ok: false;
      reason: "missing-chat" | "missing-message";
      message: string;
    };

interface ResolveSearchHitNavigationInput {
  message: SearchHit;
  conversations: Conversation[];
  returnRoute: string;
  dataRevision?: string;
  historyContextAvailable?: boolean;
  querySnapshot: SearchQuerySnapshot;
  returnSnapshot?: Readonly<SearchReturnSnapshot>;
}

function normalizeIdentifier(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function resolveTargetChat(message: SearchHit): string {
  return normalizeIdentifier(message.conversationId);
}

function findConversation(conversations: Conversation[], targetChat: string): Conversation | null {
  return (
    conversations.find(
      (conversation) => conversation.username === targetChat || conversation.id === targetChat,
    ) ?? null
  );
}

export function resolveSearchHitNavigation({
  message,
  conversations,
  returnRoute,
  dataRevision,
  historyContextAvailable,
  querySnapshot,
  returnSnapshot,
}: ResolveSearchHitNavigationInput): SearchHitNavigationResult {
  const chat = resolveTargetChat(message);
  if (!chat) {
    return {
      ok: false,
      reason: "missing-chat",
      message: "无法打开搜索结果对应的会话，请刷新搜索后重试。",
    };
  }

  const messageId = normalizeIdentifier(message.messageId);
  const seq =
    Number.isSafeInteger(message.seq) && (message.seq ?? 0) > 0 ? (message.seq ?? null) : null;
  const localId = null;
  if (!messageId && seq === null && localId === null) {
    return {
      ok: false,
      reason: "missing-message",
      message: "无法定位这条搜索结果，请刷新搜索后重试。",
    };
  }

  const conversation = findConversation(conversations, chat);
  const activeResultId = createSearchHitIdentity(message);

  return {
    ok: true,
    conversationId: conversation?.id ?? chat,
    chat,
    conversationLabel:
      conversation?.displayName || normalizeIdentifier(message.conversationName) || chat,
    isGroup: conversation?.isGroup ?? chat.endsWith("@chatroom"),
    requiresConversationLoad: !conversation,
    ...(dataRevision ? { dataRevision } : {}),
    ...(typeof historyContextAvailable === "boolean" ? { historyContextAvailable } : {}),
    anchor: {
      source: "search",
      chat,
      messageId,
      seq,
      localId,
      timestamp: typeof message.timestamp === "number" ? message.timestamp : null,
      time: null,
    },
    returnToSearch: {
      returnRoute,
      activeResultId,
      querySnapshot,
      sourceConversationId: conversation?.id ?? chat,
      ...(returnSnapshot ? { searchSnapshot: returnSnapshot } : {}),
    },
  };
}

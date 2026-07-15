import { create } from "zustand";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import type { ConversationListFilter } from "@/l2-coordinator/commander/conversationListInteractionModel";
import type { ApiErrorModel } from "@/l2-coordinator/diplomat/errorTranslator";
import type { SearchReturnSnapshot } from "@/l2-coordinator/commander/searchReturnSnapshot";
import type { MediaAttachment } from "./useMediaStore";

export type ConversationChatType =
  | "private"
  | "group"
  | "official_account"
  | "subscription_account"
  | "service_account"
  | "enterprise_contact"
  | "enterprise_account"
  | "system"
  | "folded"
  | "unknown";

export interface Conversation {
  id: string;
  username: string;
  displayName: string;
  chatType: ConversationChatType | string;
  isGroup: boolean;
  summary: string;
  timestamp: number;
  timeLabel: string;
  unread: number;
  lastSender: string;
  source: string;
  contact?: unknown;
  chatroom?: unknown;
}

export interface ChatMessage {
  id: string;
  seq?: number;
  localId: number;
  timestamp: number;
  time: string;
  talker?: string;
  talkerName?: string;
  sender: string;
  senderName?: string;
  isSelf?: boolean;
  type: string;
  subType?: string;
  content: string;
  chat: string;
  username: string;
  isGroup: boolean;
  chatType: string;
  mediaType?: string;
  mediaUrl?: string;
  imageUrl?: string;
  fileName?: string;
  hour?: number;
  hasMedia?: boolean;
  attachments?: MediaAttachment[];
  direction: "self" | "other" | "unknown";
}

export type LoadStatus = "idle" | "loading" | "ready" | "empty" | "error";
export type UnreadStatus = "idle" | "loading" | "ready" | "unavailable" | "error";
export type TranscriptScrollIntent = "none" | "latest" | "anchor" | "preserve";
export type ChatAnchorStatus =
  | "idle"
  | "loading"
  | "hit"
  | "nearby"
  | "missing"
  | "error"
  | "cancelled";
export type ChatAnchorSource = "search" | "media" | "ai" | "graph" | "sns";

export interface ChatMessageAnchor {
  source: ChatAnchorSource;
  chat: string;
  messageId: string;
  seq?: number | null;
  localId: number | null;
  timestamp: number | null;
  time: string | null;
}

export interface ChatReturnToSearch {
  returnRoute: string;
  activeResultId: string;
  querySnapshot: {
    query: string;
    filter: SearchFilterType;
    scope: "all" | "current";
    scopeChat: string | null;
  };
  sourceConversationId: string | null;
  searchSnapshot?: Readonly<SearchReturnSnapshot>;
}

export interface NavigationConversationIdentity {
  id: string;
  username: string;
  displayName: string;
  isGroup: boolean;
}

interface ChatState {
  conversations: Conversation[];
  contactsByUsername: Record<string, unknown>;
  chatRoomsByName: Record<string, unknown>;
  conversationsStatus: LoadStatus;
  conversationsError: string | null;
  conversationListQuery: string;
  conversationListFilter: ConversationListFilter;
  conversationListActiveId: string | null;
  unreadStatus: UnreadStatus;
  unreadError: string | null;
  selectedConversationId: string | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesHasMore: boolean;
  messagesHasNewer: boolean;
  messagesTotalCount: number;
  messagesOffset: number;
  messagesStatus: LoadStatus;
  messagesError: string | ApiErrorModel | null;
  scrollIntent: TranscriptScrollIntent;
  scrollAnchorMessageId: string | null;
  scrollAnchorLocalId: number | null;
  anchorStatus: ChatAnchorStatus;
  activeAnchor: ChatMessageAnchor | null;
  highlightedMessageId: string | null;
  returnToSearch: ChatReturnToSearch | null;
  anchorError: string | null;
  selectionMode: boolean;
  selectedMessageIds: string[];
  lastSelectedMessageId: string | null;
  selectionStatus: string | null;
}

interface ChatActions {
  setConversations: (
    conversations: Conversation[],
    contactsByUsername: Record<string, unknown>,
    chatRoomsByName: Record<string, unknown>,
  ) => void;
  setConversationsLoading: () => void;
  setConversationsError: (error: string) => void;
  ensureNavigationConversation: (identity: NavigationConversationIdentity) => void;
  setConversationListQuery: (query: string) => void;
  setConversationListFilter: (filter: ConversationListFilter) => void;
  setConversationListActiveId: (id: string | null) => void;
  clearConversationListFilters: () => void;
  setUnreadLoading: () => void;
  mergeConversationUnread: (unreadByChat: Record<string, number>) => void;
  setUnreadUnavailable: () => void;
  setUnreadError: (error: string) => void;
  selectConversation: (id: string) => void;
  setMessages: (
    messages: ChatMessage[],
    totalCount: number,
    offset: number,
    hasMore?: boolean,
    scrollIntent?: TranscriptScrollIntent,
    hasNewer?: boolean,
  ) => void;
  appendMessages: (messages: ChatMessage[], offset: number, hasMore?: boolean) => void;
  setMessagesLoading: (loading: boolean) => void;
  setMessagesError: (error: string | ApiErrorModel) => void;
  clearScrollIntent: () => void;
  setAnchorLoading: (anchor: ChatMessageAnchor, returnToSearch: ChatReturnToSearch) => void;
  setAnchorHit: (messageId: string) => void;
  setAnchorNearby: (messageId: string) => void;
  setAnchorMissing: () => void;
  setAnchorError: (error: string) => void;
  setAnchorCancelled: () => void;
  clearHighlightedMessage: () => void;
  clearAnchor: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleMessageSelection: (messageId: string, range?: boolean) => void;
  selectVisibleMessages: (messageIds: string[]) => void;
  clearMessageSelection: () => void;
  setSelectionStatus: (status: string | null) => void;
  resetChat: () => void;
}

type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  conversations: [],
  contactsByUsername: {},
  chatRoomsByName: {},
  conversationsStatus: "idle",
  conversationsError: null,
  conversationListQuery: "",
  conversationListFilter: "all",
  conversationListActiveId: null,
  unreadStatus: "idle",
  unreadError: null,
  selectedConversationId: null,
  messages: [],
  messagesLoading: false,
  messagesHasMore: false,
  messagesHasNewer: false,
  messagesTotalCount: 0,
  messagesOffset: 0,
  messagesStatus: "idle",
  messagesError: null,
  scrollIntent: "none",
  scrollAnchorMessageId: null,
  scrollAnchorLocalId: null,
  anchorStatus: "idle",
  activeAnchor: null,
  highlightedMessageId: null,
  returnToSearch: null,
  anchorError: null,
  selectionMode: false,
  selectedMessageIds: [],
  lastSelectedMessageId: null,
  selectionStatus: null,
};

const clearedAnchorState = {
  anchorStatus: "idle" as const,
  activeAnchor: null,
  highlightedMessageId: null,
  returnToSearch: null,
  anchorError: null,
};

const clearedSelectionState = {
  selectionMode: false,
  selectedMessageIds: [] as string[],
  lastSelectedMessageId: null,
  selectionStatus: null,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,
  setConversations: (conversations, contactsByUsername, chatRoomsByName) =>
    set((state) => {
      const loadedIdentities = new Set(
        conversations.flatMap((conversation) => [conversation.id, conversation.username]),
      );
      const retainedNavigationConversation = state.conversations.filter(
        (conversation) =>
          conversation.source === "navigation" &&
          conversation.id === state.selectedConversationId &&
          !loadedIdentities.has(conversation.id) &&
          !loadedIdentities.has(conversation.username),
      );
      const mergedConversations = [...conversations, ...retainedNavigationConversation];
      return {
        conversations: mergedConversations,
        contactsByUsername,
        chatRoomsByName,
        conversationsStatus: mergedConversations.length === 0 ? "empty" : "ready",
        conversationsError: null,
        unreadStatus: "idle",
        unreadError: null,
      };
    }),
  setConversationsLoading: () => set({ conversationsStatus: "loading", conversationsError: null }),
  setConversationsError: (error) =>
    set({ conversationsStatus: "error", conversationsError: error }),
  ensureNavigationConversation: (identity) =>
    set((state) => {
      const exists = state.conversations.some(
        (conversation) =>
          conversation.id === identity.id || conversation.username === identity.username,
      );
      if (exists) return {};
      return {
        conversations: [
          ...state.conversations,
          {
            id: identity.id,
            username: identity.username,
            displayName: identity.displayName || identity.username,
            chatType: identity.isGroup ? "group" : "private",
            isGroup: identity.isGroup,
            summary: "",
            timestamp: 0,
            timeLabel: "",
            unread: 0,
            lastSender: "",
            source: "navigation",
          },
        ],
      };
    }),
  setConversationListQuery: (conversationListQuery) =>
    set({ conversationListQuery, conversationListActiveId: null }),
  setConversationListFilter: (conversationListFilter) =>
    set({ conversationListFilter, conversationListActiveId: null }),
  setConversationListActiveId: (conversationListActiveId) => set({ conversationListActiveId }),
  clearConversationListFilters: () =>
    set({
      conversationListQuery: "",
      conversationListFilter: "all",
      conversationListActiveId: null,
    }),
  setUnreadLoading: () => set({ unreadStatus: "loading", unreadError: null }),
  mergeConversationUnread: (unreadByChat) =>
    set((state) => ({
      conversations: state.conversations.map((conversation) => ({
        ...conversation,
        unread: unreadByChat[conversation.username] ?? unreadByChat[conversation.id] ?? 0,
      })),
      unreadStatus: "ready",
      unreadError: null,
    })),
  setUnreadUnavailable: () => set({ unreadStatus: "unavailable", unreadError: null }),
  setUnreadError: (unreadError) => set({ unreadStatus: "error", unreadError }),
  selectConversation: (id) =>
    set({
      selectedConversationId: id,
      messages: [],
      messagesHasMore: false,
      messagesHasNewer: false,
      messagesOffset: 0,
      messagesStatus: "idle",
      messagesError: null,
      scrollIntent: "none",
      scrollAnchorMessageId: null,
      scrollAnchorLocalId: null,
      ...clearedSelectionState,
      ...clearedAnchorState,
    }),
  setMessages: (
    messages,
    totalCount,
    offset,
    hasMore = false,
    scrollIntent = "latest",
    hasNewer = false,
  ) =>
    set(() => {
      const anchorMessage = scrollIntent === "latest" ? messages[messages.length - 1] : null;
      return {
        messages,
        messagesTotalCount: totalCount,
        messagesOffset: offset,
        messagesHasMore: hasMore,
        messagesHasNewer: hasNewer,
        messagesLoading: false,
        messagesStatus: messages.length === 0 ? "empty" : "ready",
        messagesError: null,
        scrollIntent,
        scrollAnchorMessageId: anchorMessage?.id ?? null,
        scrollAnchorLocalId: anchorMessage?.localId ?? null,
      };
    }),
  appendMessages: (newMessages, offset, hasMore = false) =>
    set((state) => {
      const previousFirstMessage = state.messages[0] ?? null;
      const messages = [...newMessages, ...state.messages];
      return {
        messages,
        messagesOffset: offset,
        messagesHasMore: hasMore,
        messagesLoading: false,
        messagesStatus: messages.length === 0 ? "empty" : "ready",
        messagesError: null,
        scrollIntent: previousFirstMessage ? "preserve" : "latest",
        scrollAnchorMessageId:
          previousFirstMessage?.id ?? messages[messages.length - 1]?.id ?? null,
        scrollAnchorLocalId:
          previousFirstMessage?.localId ?? messages[messages.length - 1]?.localId ?? null,
      };
    }),
  setMessagesLoading: (loading) =>
    set((state) => ({
      messagesLoading: loading,
      messagesStatus: loading && state.messages.length === 0 ? "loading" : state.messagesStatus,
    })),
  setMessagesError: (error) =>
    set((state) => ({
      messagesLoading: false,
      messagesStatus: state.messages.length > 0 ? "ready" : "error",
      messagesError: error,
    })),
  clearScrollIntent: () =>
    set({
      scrollIntent: "none",
      scrollAnchorMessageId: null,
      scrollAnchorLocalId: null,
    }),
  setAnchorLoading: (activeAnchor, returnToSearch) =>
    set({
      anchorStatus: "loading",
      activeAnchor,
      highlightedMessageId: null,
      returnToSearch,
      anchorError: null,
    }),
  setAnchorHit: (highlightedMessageId) =>
    set({
      anchorStatus: "hit",
      highlightedMessageId,
      anchorError: null,
    }),
  setAnchorNearby: (highlightedMessageId) =>
    set({
      anchorStatus: "nearby",
      highlightedMessageId,
      anchorError: null,
    }),
  setAnchorMissing: () =>
    set({
      anchorStatus: "missing",
      highlightedMessageId: null,
      anchorError: null,
    }),
  setAnchorError: (anchorError) =>
    set({
      anchorStatus: "error",
      highlightedMessageId: null,
      anchorError,
    }),
  setAnchorCancelled: () =>
    set({
      anchorStatus: "cancelled",
      highlightedMessageId: null,
      anchorError: null,
    }),
  clearHighlightedMessage: () => set({ highlightedMessageId: null }),
  clearAnchor: () => set(clearedAnchorState),
  enterSelectionMode: () => set({ selectionMode: true, selectionStatus: null }),
  exitSelectionMode: () => set(clearedSelectionState),
  toggleMessageSelection: (messageId, range = false) =>
    set((state) => {
      const selected = new Set(state.selectedMessageIds);
      if (range && state.lastSelectedMessageId) {
        for (const id of getMessageIdRange(
          state.messages,
          state.lastSelectedMessageId,
          messageId,
        )) {
          selected.add(id);
        }
      } else if (selected.has(messageId)) {
        selected.delete(messageId);
      } else {
        selected.add(messageId);
      }

      return {
        selectionMode: true,
        selectedMessageIds: orderMessageIds([...selected], state.messages),
        lastSelectedMessageId: messageId,
        selectionStatus: null,
      };
    }),
  selectVisibleMessages: (messageIds) =>
    set((state) => ({
      selectionMode: messageIds.length > 0,
      selectedMessageIds: orderMessageIds(messageIds, state.messages),
      lastSelectedMessageId:
        messageIds.length > 0
          ? (messageIds[messageIds.length - 1] ?? null)
          : state.lastSelectedMessageId,
      selectionStatus: null,
    })),
  clearMessageSelection: () => set(clearedSelectionState),
  setSelectionStatus: (selectionStatus) => set({ selectionStatus }),
  resetChat: () =>
    set({
      selectedConversationId: null,
      messages: [],
      messagesHasMore: false,
      messagesHasNewer: false,
      messagesTotalCount: 0,
      messagesOffset: 0,
      messagesStatus: "idle",
      messagesError: null,
      scrollIntent: "none",
      scrollAnchorMessageId: null,
      scrollAnchorLocalId: null,
      ...clearedSelectionState,
      ...clearedAnchorState,
    }),
}));

function getMessageIdRange(messages: ChatMessage[], startId: string, endId: string): string[] {
  const start = messages.findIndex((message) => message.id === startId);
  const end = messages.findIndex((message) => message.id === endId);
  if (start < 0 || end < 0) return [endId];
  const [from, to] = start <= end ? [start, end] : [end, start];
  return messages.slice(from, to + 1).map((message) => message.id);
}

function orderMessageIds(messageIds: string[], messages: ChatMessage[]): string[] {
  const selected = new Set(messageIds);
  const ordered = messages
    .filter((message) => selected.has(message.id))
    .map((message) => message.id);
  for (const id of messageIds) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

import { create } from "zustand";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import type { ApiErrorModel } from "@/l2-coordinator/diplomat/errorTranslator";
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
export type ChatAnchorStatus = "idle" | "loading" | "hit" | "missing" | "error" | "cancelled";
export type ChatAnchorSource = "search" | "media" | "ai" | "graph" | "sns";

export interface ChatMessageAnchor {
  source: ChatAnchorSource;
  chat: string;
  messageId: string;
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
}

interface ChatState {
  conversations: Conversation[];
  contactsByUsername: Record<string, unknown>;
  chatRoomsByName: Record<string, unknown>;
  conversationsStatus: LoadStatus;
  conversationsError: string | null;
  unreadStatus: UnreadStatus;
  unreadError: string | null;
  selectedConversationId: string | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesHasMore: boolean;
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
}

interface ChatActions {
  setConversations: (
    conversations: Conversation[],
    contactsByUsername: Record<string, unknown>,
    chatRoomsByName: Record<string, unknown>,
  ) => void;
  setConversationsLoading: () => void;
  setConversationsError: (error: string) => void;
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
  ) => void;
  appendMessages: (messages: ChatMessage[], offset: number, hasMore?: boolean) => void;
  setMessagesLoading: (loading: boolean) => void;
  setMessagesError: (error: string | ApiErrorModel) => void;
  clearScrollIntent: () => void;
  setAnchorLoading: (anchor: ChatMessageAnchor, returnToSearch: ChatReturnToSearch) => void;
  setAnchorHit: (messageId: string) => void;
  setAnchorMissing: () => void;
  setAnchorError: (error: string) => void;
  setAnchorCancelled: () => void;
  clearHighlightedMessage: () => void;
  clearAnchor: () => void;
  resetChat: () => void;
}

type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  conversations: [],
  contactsByUsername: {},
  chatRoomsByName: {},
  conversationsStatus: "idle",
  conversationsError: null,
  unreadStatus: "idle",
  unreadError: null,
  selectedConversationId: null,
  messages: [],
  messagesLoading: false,
  messagesHasMore: false,
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
};

const clearedAnchorState = {
  anchorStatus: "idle" as const,
  activeAnchor: null,
  highlightedMessageId: null,
  returnToSearch: null,
  anchorError: null,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,
  setConversations: (conversations, contactsByUsername, chatRoomsByName) =>
    set({
      conversations,
      contactsByUsername,
      chatRoomsByName,
      conversationsStatus: conversations.length === 0 ? "empty" : "ready",
      conversationsError: null,
      unreadStatus: "idle",
      unreadError: null,
    }),
  setConversationsLoading: () =>
    set({ conversationsStatus: "loading", conversationsError: null }),
  setConversationsError: (error) =>
    set({ conversationsStatus: "error", conversationsError: error }),
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
      messagesOffset: 0,
      messagesStatus: "idle",
      messagesError: null,
      scrollIntent: "none",
      scrollAnchorMessageId: null,
      scrollAnchorLocalId: null,
      ...clearedAnchorState,
    }),
  setMessages: (messages, totalCount, offset, hasMore = false, scrollIntent = "latest") =>
    set(() => {
      const anchorMessage = scrollIntent === "latest" ? messages[messages.length - 1] : null;
      return {
        messages,
        messagesTotalCount: totalCount,
        messagesOffset: offset,
        messagesHasMore: hasMore,
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
        scrollAnchorMessageId: previousFirstMessage?.id ?? messages[messages.length - 1]?.id ?? null,
        scrollAnchorLocalId: previousFirstMessage?.localId ?? messages[messages.length - 1]?.localId ?? null,
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
  resetChat: () =>
    set({
      selectedConversationId: null,
      messages: [],
      messagesHasMore: false,
      messagesTotalCount: 0,
      messagesOffset: 0,
      messagesStatus: "idle",
      messagesError: null,
      scrollIntent: "none",
      scrollAnchorMessageId: null,
      scrollAnchorLocalId: null,
      ...clearedAnchorState,
    }),
}));

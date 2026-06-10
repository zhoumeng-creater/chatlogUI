import { create } from "zustand";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import type { MediaAttachment } from "./useMediaStore";

export interface Conversation {
  id: string;
  username: string;
  displayName: string;
  chatType: string;
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
  localId: number;
  timestamp: number;
  time: string;
  sender: string;
  type: string;
  content: string;
  chat: string;
  username: string;
  isGroup: boolean;
  chatType: string;
  mediaType?: string;
  mediaUrl?: string;
  imageUrl?: string;
  attachments?: MediaAttachment[];
  direction: "self" | "other" | "unknown";
}

export type LoadStatus = "idle" | "loading" | "ready" | "empty" | "error";
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
  selectedConversationId: string | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesHasMore: boolean;
  messagesTotalCount: number;
  messagesOffset: number;
  messagesStatus: LoadStatus;
  messagesError: string | null;
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
  selectConversation: (id: string) => void;
  setMessages: (messages: ChatMessage[], totalCount: number, offset: number, hasMore?: boolean) => void;
  appendMessages: (messages: ChatMessage[], offset: number, hasMore?: boolean) => void;
  setMessagesLoading: (loading: boolean) => void;
  setMessagesError: (error: string) => void;
  setAnchorLoading: (anchor: ChatMessageAnchor, returnToSearch: ChatReturnToSearch) => void;
  setAnchorHit: (messageId: string) => void;
  setAnchorMissing: () => void;
  setAnchorError: (error: string) => void;
  setAnchorCancelled: () => void;
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
  selectedConversationId: null,
  messages: [],
  messagesLoading: false,
  messagesHasMore: false,
  messagesTotalCount: 0,
  messagesOffset: 0,
  messagesStatus: "idle",
  messagesError: null,
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
    }),
  setConversationsLoading: () =>
    set({ conversationsStatus: "loading", conversationsError: null }),
  setConversationsError: (error) =>
    set({ conversationsStatus: "error", conversationsError: error }),
  selectConversation: (id) =>
    set({
      selectedConversationId: id,
      messages: [],
      messagesHasMore: false,
      messagesOffset: 0,
      messagesStatus: "idle",
      messagesError: null,
      ...clearedAnchorState,
    }),
  setMessages: (messages, totalCount, offset, hasMore = false) =>
    set({
      messages,
      messagesTotalCount: totalCount,
      messagesOffset: offset,
      messagesHasMore: hasMore,
      messagesLoading: false,
      messagesStatus: messages.length === 0 ? "empty" : "ready",
      messagesError: null,
    }),
  appendMessages: (newMessages, offset, hasMore = false) =>
    set((state) => {
      const messages = [...newMessages, ...state.messages];
      return {
        messages,
        messagesOffset: offset,
        messagesHasMore: hasMore,
        messagesLoading: false,
        messagesStatus: messages.length === 0 ? "empty" : "ready",
        messagesError: null,
      };
    }),
  setMessagesLoading: (loading) => set({ messagesLoading: loading, messagesStatus: "loading" }),
  setMessagesError: (error) =>
    set({ messagesLoading: false, messagesStatus: "error", messagesError: error }),
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
      ...clearedAnchorState,
    }),
}));

import { create } from "zustand";

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
  direction: "self" | "other" | "unknown";
}

export type LoadStatus = "idle" | "loading" | "ready" | "empty" | "error";

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
  resetChat: () =>
    set({
      selectedConversationId: null,
      messages: [],
      messagesHasMore: false,
      messagesTotalCount: 0,
      messagesOffset: 0,
      messagesStatus: "idle",
      messagesError: null,
    }),
}));

import { create } from "zustand";
import type { MediaAttachment } from "@l4/network/mediaAdapters";

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
  mediaAttachments?: MediaAttachment[];
  direction: "self" | "other" | "unknown";
}

export type LoadStatus = "idle" | "loading" | "ready" | "empty" | "error";

export interface ChatMember {
  id: string;
  username: string;
  display: string;
  isOwner: boolean;
}

export interface ChatMembersResult {
  chat: string;
  username: string;
  count: number;
  members: ChatMember[];
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
  unreadStatus: LoadStatus;
  unreadError: string | null;
  membersStatus: LoadStatus;
  membersError: string | null;
  activeMembersChat: string | null;
  membersByChat: Record<string, ChatMembersResult>;
  newMessagesStatus: LoadStatus;
  newMessagesError: string | null;
  newMessagesState: Record<string, number>;
  newMessagesCount: number;
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
  setUnreadLoading: () => void;
  mergeUnreadSessions: (sessions: Conversation[]) => void;
  setUnreadError: (error: string) => void;
  setMembersLoading: (chat: string) => void;
  setMembers: (members: ChatMembersResult) => void;
  setMembersError: (error: string) => void;
  setNewMessagesLoading: () => void;
  mergeNewMessages: (messages: ChatMessage[], newState: Record<string, number>) => void;
  setNewMessagesError: (error: string) => void;
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
  unreadStatus: "idle",
  unreadError: null,
  membersStatus: "idle",
  membersError: null,
  activeMembersChat: null,
  membersByChat: {},
  newMessagesStatus: "idle",
  newMessagesError: null,
  newMessagesState: {},
  newMessagesCount: 0,
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
  setUnreadLoading: () => set({ unreadStatus: "loading", unreadError: null }),
  mergeUnreadSessions: (sessions) =>
    set((state) => {
      const unreadById = new Map(sessions.map((session) => [session.id, session]));
      const merged = state.conversations.map((conversation) => {
        const unread = unreadById.get(conversation.id) ?? unreadById.get(conversation.username);
        if (!unread) return conversation;

        return {
          ...conversation,
          unread: unread.unread,
          lastSender: unread.lastSender,
          summary: unread.summary || conversation.summary,
          timestamp: Math.max(conversation.timestamp, unread.timestamp),
          timeLabel: unread.timeLabel || conversation.timeLabel,
        };
      });

      const knownIds = new Set(merged.map((conversation) => conversation.id));
      for (const unread of sessions) {
        if (!knownIds.has(unread.id)) merged.push(unread);
      }

      return {
        conversations: merged.sort((a, b) => b.timestamp - a.timestamp),
        unreadStatus: sessions.length === 0 ? "empty" : "ready",
        unreadError: null,
      };
    }),
  setUnreadError: (error) => set({ unreadStatus: "error", unreadError: error }),
  setMembersLoading: (chat) =>
    set({ activeMembersChat: chat, membersStatus: "loading", membersError: null }),
  setMembers: (members) =>
    set((state) => ({
      membersByChat: {
        ...state.membersByChat,
        [members.username]: members,
      },
      activeMembersChat: members.username,
      membersStatus: members.members.length === 0 ? "empty" : "ready",
      membersError: null,
    })),
  setMembersError: (error) => set({ membersStatus: "error", membersError: error }),
  setNewMessagesLoading: () =>
    set({ newMessagesStatus: "loading", newMessagesError: null, newMessagesCount: 0 }),
  mergeNewMessages: (newMessages, newState) =>
    set((state) => {
      const existingIds = new Set(state.messages.map((message) => message.id));
      const uniqueMessages = newMessages.filter((message) => !existingIds.has(message.id));
      const messages = [...state.messages, ...uniqueMessages]
        .sort((a, b) => a.timestamp - b.timestamp);

      return {
        messages,
        messagesTotalCount: state.messagesTotalCount + uniqueMessages.length,
        messagesStatus: messages.length === 0 ? "empty" : "ready",
        newMessagesStatus: newMessages.length === 0 ? "empty" : "ready",
        newMessagesError: null,
        newMessagesState: newState,
        newMessagesCount: uniqueMessages.length,
      };
    }),
  setNewMessagesError: (error) =>
    set({ newMessagesStatus: "error", newMessagesError: error, newMessagesCount: 0 }),
  resetChat: () =>
    set({
      selectedConversationId: null,
      messages: [],
      messagesHasMore: false,
      messagesTotalCount: 0,
      messagesOffset: 0,
      messagesStatus: "idle",
      messagesError: null,
      unreadStatus: "idle",
      unreadError: null,
      membersStatus: "idle",
      membersError: null,
      activeMembersChat: null,
      membersByChat: {},
      newMessagesStatus: "idle",
      newMessagesError: null,
      newMessagesState: {},
      newMessagesCount: 0,
    }),
}));

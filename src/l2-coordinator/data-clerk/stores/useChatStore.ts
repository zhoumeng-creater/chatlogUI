import { create } from "zustand";
import type { Contact, Session, ChatRoom } from "@/l2-coordinator/api-docs/contacts";
import type { HistoryMessage } from "@/l2-coordinator/api-docs/history";

interface ChatState {
  contacts: Contact[];
  sessions: Session[];
  chatRooms: ChatRoom[];
  contactsLoading: boolean;
  selectedContact: Contact | null;
  selectedChatRoom: ChatRoom | null;
  messages: HistoryMessage[];
  messagesLoading: boolean;
  messagesTotalCount: number;
  messagesOffset: number;
}

interface ChatActions {
  setContacts: (contacts: Contact[], sessions: Session[], chatRooms: ChatRoom[]) => void;
  setContactsLoading: (loading: boolean) => void;
  selectContact: (contact: Contact | null) => void;
  selectChatRoom: (chatRoom: ChatRoom | null) => void;
  setMessages: (messages: HistoryMessage[], totalCount: number, offset: number) => void;
  appendMessages: (messages: HistoryMessage[], offset: number) => void;
  setMessagesLoading: (loading: boolean) => void;
  resetChat: () => void;
}

type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  contacts: [],
  sessions: [],
  chatRooms: [],
  contactsLoading: false,
  selectedContact: null,
  selectedChatRoom: null,
  messages: [],
  messagesLoading: false,
  messagesTotalCount: 0,
  messagesOffset: 0,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,
  setContacts: (contacts, sessions, chatRooms) =>
    set({ contacts, sessions, chatRooms, contactsLoading: false }),
  setContactsLoading: (loading) => set({ contactsLoading: loading }),
  selectContact: (contact) =>
    set({ selectedContact: contact, selectedChatRoom: null, messages: [], messagesOffset: 0 }),
  selectChatRoom: (chatRoom) =>
    set({ selectedChatRoom: chatRoom, selectedContact: null, messages: [], messagesOffset: 0 }),
  setMessages: (messages, totalCount, offset) =>
    set({ messages, messagesTotalCount: totalCount, messagesOffset: offset, messagesLoading: false }),
  appendMessages: (newMessages, offset) =>
    set((state) => ({
      messages: [...newMessages, ...state.messages],
      messagesOffset: offset,
      messagesLoading: false,
    })),
  setMessagesLoading: (loading) => set({ messagesLoading: loading }),
  resetChat: () =>
    set({
      selectedContact: null,
      selectedChatRoom: null,
      messages: [],
      messagesTotalCount: 0,
      messagesOffset: 0,
    }),
}));

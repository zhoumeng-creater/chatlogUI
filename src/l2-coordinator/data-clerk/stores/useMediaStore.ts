import { create } from "zustand";
import type {
  AdaptedFavoriteItem,
  AdaptedMediaAttachment,
  AdaptedMediaMember,
  AdaptedNewMessage,
  AdaptedUnreadResponse,
} from "@l4/network";

export type MediaAttachment = AdaptedMediaAttachment;
export type MediaFavoriteItem = AdaptedFavoriteItem;
export type MediaMember = AdaptedMediaMember;
export type MediaNewMessage = AdaptedNewMessage;
export type MediaUnreadResponse = AdaptedUnreadResponse;
export type MediaLoadStatus = "idle" | "loading" | "ready" | "empty" | "error";

interface MediaState {
  favorites: MediaFavoriteItem[];
  members: MediaMember[];
  unread: AdaptedUnreadResponse;
  newMessages: MediaNewMessage[];
  status: MediaLoadStatus;
  error: string | null;
  selectedAttachment: MediaAttachment | null;
}

interface MediaActions {
  setLoading: () => void;
  setData: (data: {
    favorites: MediaFavoriteItem[];
    members: MediaMember[];
    unread: AdaptedUnreadResponse;
    newMessages: MediaNewMessage[];
  }) => void;
  setError: (error: string) => void;
  selectAttachment: (attachment: MediaAttachment | null) => void;
  clear: () => void;
}

type MediaStore = MediaState & MediaActions;

const emptyUnread: AdaptedUnreadResponse = {
  total: 0,
  chats: [],
};

const initialState: MediaState = {
  favorites: [],
  members: [],
  unread: emptyUnread,
  newMessages: [],
  status: "idle",
  error: null,
  selectedAttachment: null,
};

export const useMediaStore = create<MediaStore>((set) => ({
  ...initialState,
  setLoading: () => set({ status: "loading", error: null }),
  setData: ({ favorites, members, unread, newMessages }) =>
    set({
      favorites,
      members,
      unread,
      newMessages,
      status: favorites.length || members.length || unread.total || newMessages.length ? "ready" : "empty",
      error: null,
    }),
  setError: (error) => set({ status: "error", error }),
  selectAttachment: (attachment) => set({ selectedAttachment: attachment }),
  clear: () => set(initialState),
}));

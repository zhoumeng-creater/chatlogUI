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
export type MediaLoadStatus = "idle" | "loading" | "ready" | "empty" | "partial" | "error" | "cancelled";
export type MediaEndpointKey = "favorites" | "members" | "unread" | "newMessages";

export interface MediaLoadScope {
  chat: string;
  isGroup: boolean;
}

export interface MediaEndpointState {
  status: MediaLoadStatus;
  error: string | null;
}

export type MediaEndpointStatus = Record<MediaEndpointKey, MediaEndpointState>;

interface MediaState {
  favorites: MediaFavoriteItem[];
  members: MediaMember[];
  unread: AdaptedUnreadResponse;
  newMessages: MediaNewMessage[];
  status: MediaLoadStatus;
  error: string | null;
  endpointStatus: MediaEndpointStatus;
  selectedAttachment: MediaAttachment | null;
  activeLoadRequestId: string | null;
  activeLoadScope: MediaLoadScope | null;
}

interface MediaActions {
  startMediaLoadRequest: (requestId: string, scope: MediaLoadScope) => void;
  completeMediaLoadRequest: (requestId: string, data: {
    favorites: MediaFavoriteItem[];
    members: MediaMember[];
    unread: AdaptedUnreadResponse;
    newMessages: MediaNewMessage[];
  }, endpointStatus?: MediaEndpointStatus) => boolean;
  failMediaLoadRequest: (requestId: string, error: string) => boolean;
  cancelMediaLoadRequest: () => void;
  setLoading: () => void;
  setData: (data: {
    favorites: MediaFavoriteItem[];
    members: MediaMember[];
    unread: AdaptedUnreadResponse;
    newMessages: MediaNewMessage[];
  }, endpointStatus?: MediaEndpointStatus) => void;
  setError: (error: string) => void;
  selectAttachment: (attachment: MediaAttachment | null) => void;
  clear: () => void;
}

type MediaStore = MediaState & MediaActions;

const emptyUnread: AdaptedUnreadResponse = {
  total: 0,
  chats: [],
};

const endpointKeys: MediaEndpointKey[] = ["favorites", "members", "unread", "newMessages"];

function endpointStatus(status: MediaLoadStatus, error: string | null = null): MediaEndpointState {
  return { status, error };
}

function createEndpointStatus(status: MediaLoadStatus, error: string | null = null): MediaEndpointStatus {
  return {
    favorites: endpointStatus(status, error),
    members: endpointStatus(status, error),
    unread: endpointStatus(status, error),
    newMessages: endpointStatus(status, error),
  };
}

function createInitialState(): MediaState {
  return {
    favorites: [],
    members: [],
    unread: emptyUnread,
    newMessages: [],
    status: "idle",
    error: null,
    endpointStatus: createEndpointStatus("idle"),
    selectedAttachment: null,
    activeLoadRequestId: null,
    activeLoadScope: null,
  };
}

export const useMediaStore = create<MediaStore>((set) => ({
  ...createInitialState(),

  startMediaLoadRequest: (activeLoadRequestId, activeLoadScope) =>
    set({
      activeLoadRequestId,
      activeLoadScope,
      status: "loading",
      error: null,
      endpointStatus: createEndpointStatus("loading"),
      selectedAttachment: null,
    }),

  completeMediaLoadRequest: (requestId, data, endpointStatusMap) => {
    let applied = false;
    set((state) => {
      if (state.activeLoadRequestId !== requestId) return state;
      applied = true;
      return {
        favorites: data.favorites,
        members: data.members,
        unread: data.unread,
        newMessages: data.newMessages,
        endpointStatus: endpointStatusMap ?? deriveEndpointStatus(data),
        ...deriveMediaStatus(data, endpointStatusMap),
        activeLoadRequestId: null,
        activeLoadScope: null,
      };
    });
    return applied;
  },

  failMediaLoadRequest: (requestId, error) => {
    let applied = false;
    set((state) => {
      if (state.activeLoadRequestId !== requestId) return state;
      applied = true;
      return {
        status: "error",
        error,
        endpointStatus: createEndpointStatus("error", error),
        activeLoadRequestId: null,
        activeLoadScope: null,
      };
    });
    return applied;
  },

  cancelMediaLoadRequest: () =>
    set({ status: "cancelled", activeLoadRequestId: null, activeLoadScope: null }),

  setLoading: () =>
    set({
      status: "loading",
      error: null,
      endpointStatus: createEndpointStatus("loading"),
      activeLoadRequestId: null,
      activeLoadScope: null,
      selectedAttachment: null,
    }),
  setData: ({ favorites, members, unread, newMessages }, endpointStatusMap) =>
    set({
      favorites,
      members,
      unread,
      newMessages,
      endpointStatus: endpointStatusMap ?? deriveEndpointStatus({ favorites, members, unread, newMessages }),
      ...deriveMediaStatus({ favorites, members, unread, newMessages }, endpointStatusMap),
      activeLoadRequestId: null,
      activeLoadScope: null,
    }),
  setError: (error) =>
    set({
      status: "error",
      error,
      endpointStatus: createEndpointStatus("error", error),
      activeLoadRequestId: null,
      activeLoadScope: null,
    }),
  selectAttachment: (attachment) => set({ selectedAttachment: attachment }),
  clear: () => set(createInitialState()),
}));

function deriveEndpointStatus(data: {
  favorites: MediaFavoriteItem[];
  members: MediaMember[];
  unread: AdaptedUnreadResponse;
  newMessages: MediaNewMessage[];
}): MediaEndpointStatus {
  return {
    favorites: endpointStatus(data.favorites.length ? "ready" : "empty"),
    members: endpointStatus(data.members.length ? "ready" : "empty"),
    unread: endpointStatus(data.unread.total ? "ready" : "empty"),
    newMessages: endpointStatus(data.newMessages.length ? "ready" : "empty"),
  };
}

function deriveMediaStatus(
  data: {
    favorites: MediaFavoriteItem[];
    members: MediaMember[];
    unread: AdaptedUnreadResponse;
    newMessages: MediaNewMessage[];
  },
  endpointStatusMap?: MediaEndpointStatus,
): Pick<MediaState, "status" | "error"> {
  const statusMap = endpointStatusMap ?? deriveEndpointStatus(data);
  const failedCount = endpointKeys.filter((key) => statusMap[key].status === "error").length;
  const totalItems = data.favorites.length + data.members.length + data.unread.total + data.newMessages.length;

  if (failedCount === endpointKeys.length) {
    return { status: "error", error: "加载媒体与扩展信息失败" };
  }
  if (failedCount > 0) {
    return { status: "partial", error: "部分媒体扩展加载失败" };
  }
  return { status: totalItems > 0 ? "ready" : "empty", error: null };
}

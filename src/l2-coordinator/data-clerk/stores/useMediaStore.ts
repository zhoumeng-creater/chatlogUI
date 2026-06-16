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
export type MediaTypeFilter = "all" | "image" | "video" | "voice" | "file";
export type MediaSourceFilter = "all" | "history" | "favorite" | "new_message";
export type MediaAvailabilityFilter = "all" | "available" | "missing";
export type MediaFilterField = "type" | "source" | "availability" | "dateRange";
export type MediaResourceLoadStatus = "idle" | "loading" | "ready" | "error" | "missing";

export interface MediaFilters {
  type: MediaTypeFilter;
  source: MediaSourceFilter;
  availability: MediaAvailabilityFilter;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface MediaActionPrompt {
  attachmentId: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  url: string;
  redactedUrlLabel: string;
}

export interface MediaActionResult {
  status: "idle" | "success" | "error";
  message: string;
}

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
  memberTotal: number;
  unread: AdaptedUnreadResponse;
  newMessages: MediaNewMessage[];
  status: MediaLoadStatus;
  error: string | null;
  endpointStatus: MediaEndpointStatus;
  selectedAttachment: MediaAttachment | null;
  selectedAttachmentIds: string[];
  filters: MediaFilters;
  actionPrompt: MediaActionPrompt | null;
  lastActionResult: MediaActionResult;
  resourceStatusByAttachmentId: Record<string, MediaResourceLoadStatus>;
  activeLoadRequestId: string | null;
  activeLoadScope: MediaLoadScope | null;
}

interface MediaActions {
  startMediaLoadRequest: (requestId: string, scope: MediaLoadScope) => void;
  completeMediaLoadRequest: (requestId: string, data: {
    favorites: MediaFavoriteItem[];
    members: MediaMember[];
    memberTotal?: number;
    unread: AdaptedUnreadResponse;
    newMessages: MediaNewMessage[];
  }, endpointStatus?: MediaEndpointStatus) => boolean;
  failMediaLoadRequest: (requestId: string, error: string) => boolean;
  cancelMediaLoadRequest: () => void;
  setLoading: () => void;
  setData: (data: {
    favorites: MediaFavoriteItem[];
    members: MediaMember[];
    memberTotal?: number;
    unread: AdaptedUnreadResponse;
    newMessages: MediaNewMessage[];
  }, endpointStatus?: MediaEndpointStatus) => void;
  setError: (error: string) => void;
  selectAttachment: (attachment: MediaAttachment | null) => void;
  setFilters: (filters: MediaFilters) => void;
  clearFilter: (field: MediaFilterField) => void;
  resetFilters: () => void;
  toggleSelectedAttachment: (attachmentId: string) => void;
  clearSelectedAttachments: () => void;
  reconcileVisibleAttachments: (visibleAttachmentIds: string[]) => void;
  setActionPrompt: (prompt: MediaActionPrompt | null) => void;
  setLastActionResult: (result: MediaActionResult) => void;
  setResourceStatus: (attachmentId: string, status: MediaResourceLoadStatus) => void;
  clear: () => void;
}

type MediaStore = MediaState & MediaActions;

const emptyUnread: AdaptedUnreadResponse = {
  total: 0,
  chats: [],
};

const endpointKeys: MediaEndpointKey[] = ["favorites", "members", "unread", "newMessages"];

const defaultMediaFilters: MediaFilters = {
  type: "all",
  source: "all",
  availability: "all",
  dateRange: { start: "", end: "" },
};

const defaultActionResult: MediaActionResult = {
  status: "idle",
  message: "",
};

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
    memberTotal: 0,
    unread: emptyUnread,
    newMessages: [],
    status: "idle",
    error: null,
    endpointStatus: createEndpointStatus("idle"),
    selectedAttachment: null,
    selectedAttachmentIds: [],
    filters: defaultMediaFilters,
    actionPrompt: null,
    lastActionResult: defaultActionResult,
    resourceStatusByAttachmentId: {},
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
      selectedAttachmentIds: [],
      actionPrompt: null,
      lastActionResult: defaultActionResult,
      resourceStatusByAttachmentId: {},
      memberTotal: 0,
    }),

  completeMediaLoadRequest: (requestId, data, endpointStatusMap) => {
    let applied = false;
    set((state) => {
      if (state.activeLoadRequestId !== requestId) return state;
      applied = true;
      return {
        favorites: data.favorites,
        members: data.members,
        memberTotal: data.memberTotal ?? data.members.length,
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
      selectedAttachmentIds: [],
      actionPrompt: null,
      lastActionResult: defaultActionResult,
      resourceStatusByAttachmentId: {},
      memberTotal: 0,
    }),
  setData: ({ favorites, members, memberTotal, unread, newMessages }, endpointStatusMap) =>
    set({
      favorites,
      members,
      memberTotal: memberTotal ?? members.length,
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
  setFilters: (filters) => set({ filters }),
  clearFilter: (field) =>
    set((state) => {
      if (field === "dateRange") {
        return { filters: { ...state.filters, dateRange: defaultMediaFilters.dateRange } };
      }
      return { filters: { ...state.filters, [field]: defaultMediaFilters[field] } };
    }),
  resetFilters: () => set({ filters: defaultMediaFilters }),
  toggleSelectedAttachment: (attachmentId) =>
    set((state) => {
      const selected = new Set(state.selectedAttachmentIds);
      if (selected.has(attachmentId)) {
        selected.delete(attachmentId);
      } else {
        selected.add(attachmentId);
      }
      return { selectedAttachmentIds: Array.from(selected) };
    }),
  clearSelectedAttachments: () => set({ selectedAttachmentIds: [] }),
  reconcileVisibleAttachments: (visibleAttachmentIds) =>
    set((state) => {
      const visible = new Set(visibleAttachmentIds);
      const selectedAttachmentIds = state.selectedAttachmentIds.filter((id) => visible.has(id));
      const selectedAttachment = state.selectedAttachment && visible.has(state.selectedAttachment.id)
        ? state.selectedAttachment
        : null;
      const selectionUnchanged = selectedAttachmentIds.length === state.selectedAttachmentIds.length &&
        selectedAttachmentIds.every((id, index) => id === state.selectedAttachmentIds[index]);
      if (selectionUnchanged && selectedAttachment === state.selectedAttachment) {
        return state;
      }
      return { selectedAttachmentIds, selectedAttachment };
    }),
  setActionPrompt: (actionPrompt) => set({ actionPrompt }),
  setLastActionResult: (lastActionResult) => set({ lastActionResult }),
  setResourceStatus: (attachmentId, status) =>
    set((state) => ({
      resourceStatusByAttachmentId: {
        ...state.resourceStatusByAttachmentId,
        [attachmentId]: status,
      },
    })),
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

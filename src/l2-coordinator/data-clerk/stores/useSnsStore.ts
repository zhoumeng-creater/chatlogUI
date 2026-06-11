import { create } from "zustand";
import type {
  AdaptedSnsNotification,
  AdaptedSnsPost,
  SnsPostContentType,
} from "@l4/network";

export type SnsLoadStatus = "idle" | "loading" | "ready" | "empty" | "partial" | "error";
export type SnsActiveTab = "timeline" | "search" | "notifications";
export type SnsContentTypeFilter = "all" | SnsPostContentType;
export type SnsEndpointKey = "feed" | "notifications";

export interface SnsEndpointState {
  status: SnsLoadStatus;
  error: string | null;
}

export type SnsEndpointStatus = Record<SnsEndpointKey, SnsEndpointState>;

export interface SnsFilters {
  user: string;
  since: string;
  until: string;
  contentType: SnsContentTypeFilter;
  mediaOnly: boolean;
  includeRead: boolean;
  limit: number;
}

interface SnsState {
  status: SnsLoadStatus;
  searchStatus: SnsLoadStatus;
  activeTab: SnsActiveTab;
  feed: AdaptedSnsPost[];
  notifications: AdaptedSnsNotification[];
  searchResults: AdaptedSnsPost[];
  selectedPostId: string | null;
  searchQuery: string;
  error: string | null;
  searchError: string | null;
  filters: SnsFilters;
  activeFeedRequestId: string | null;
  activeSearchRequestId: string | null;
  endpointStatus: SnsEndpointStatus;
}

interface SnsActions {
  setLoading: (requestId?: string | null) => void;
  setData: (
    data: { feed: AdaptedSnsPost[]; notifications: AdaptedSnsNotification[] },
    requestId?: string,
    endpointStatus?: SnsEndpointStatus,
  ) => void;
  setError: (error: string, requestId?: string) => void;
  setSearchLoading: (requestId?: string | null) => void;
  setSearchResults: (results: AdaptedSnsPost[], requestId?: string) => void;
  setSearchError: (error: string, requestId?: string) => void;
  setSearchQuery: (searchQuery: string) => void;
  setActiveTab: (activeTab: SnsActiveTab) => void;
  updateFilters: (filters: Partial<SnsFilters>) => void;
  selectPost: (selectedPostId: string | null) => void;
  isFeedRequestActive: (requestId: string) => boolean;
  isSearchRequestActive: (requestId: string) => boolean;
  reset: () => void;
}

export type SnsStore = SnsState & SnsActions;

export const defaultSnsFilters: SnsFilters = {
  user: "",
  since: "",
  until: "",
  contentType: "all",
  mediaOnly: false,
  includeRead: false,
  limit: 50,
};

const initialState: SnsState = {
  status: "idle",
  searchStatus: "idle",
  activeTab: "timeline",
  feed: [],
  notifications: [],
  searchResults: [],
  selectedPostId: null,
  searchQuery: "",
  error: null,
  searchError: null,
  filters: defaultSnsFilters,
  activeFeedRequestId: null,
  activeSearchRequestId: null,
  endpointStatus: createEndpointStatus("idle"),
};

export const useSnsStore = create<SnsStore>((set, get) => ({
  ...initialState,
  setLoading: (requestId = null) =>
    set({
      status: "loading",
      error: null,
      activeFeedRequestId: requestId,
      endpointStatus: createEndpointStatus("loading"),
    }),
  setData: ({ feed, notifications }, requestId, endpointStatus) =>
    set((state) => {
      if (requestId && state.activeFeedRequestId !== requestId) return state;
      const nextEndpointStatus = endpointStatus ?? deriveEndpointStatus({ feed, notifications });
      return {
        feed,
        notifications,
        endpointStatus: nextEndpointStatus,
        ...deriveSnsStatus({ feed, notifications }, nextEndpointStatus),
        activeFeedRequestId: null,
      };
    }),
  setError: (error, requestId) =>
    set((state) => {
      if (requestId && state.activeFeedRequestId !== requestId) return state;
      return { status: "error", error, endpointStatus: createEndpointStatus("error", error), activeFeedRequestId: null };
    }),
  setSearchLoading: (requestId = null) =>
    set({ searchStatus: "loading", searchError: null, activeSearchRequestId: requestId }),
  setSearchResults: (searchResults, requestId) =>
    set((state) => {
      if (requestId && state.activeSearchRequestId !== requestId) return state;
      return {
      searchResults,
      searchStatus: searchResults.length ? "ready" : "empty",
      searchError: null,
      activeSearchRequestId: null,
      };
    }),
  setSearchError: (searchError, requestId) =>
    set((state) => {
      if (requestId && state.activeSearchRequestId !== requestId) return state;
      return { searchStatus: "error", searchError, searchResults: [], selectedPostId: null, activeSearchRequestId: null };
    }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveTab: (activeTab) => set({ activeTab }),
  updateFilters: (filters) =>
    set((state) => {
      const nextFilters = {
        ...state.filters,
        ...filters,
      };
      const changed = hasFilterChange(state.filters, nextFilters);
      return {
        filters: nextFilters,
        activeFeedRequestId: changed ? null : state.activeFeedRequestId,
        activeSearchRequestId: changed ? null : state.activeSearchRequestId,
      };
    }),
  selectPost: (selectedPostId) => set({ selectedPostId }),
  isFeedRequestActive: (requestId) => get().activeFeedRequestId === requestId,
  isSearchRequestActive: (requestId) => get().activeSearchRequestId === requestId,
  reset: () =>
    set({
      ...initialState,
      filters: { ...defaultSnsFilters },
      endpointStatus: createEndpointStatus("idle"),
    }),
}));

function endpointState(status: SnsLoadStatus, error: string | null = null): SnsEndpointState {
  return { status, error };
}

function createEndpointStatus(status: SnsLoadStatus, error: string | null = null): SnsEndpointStatus {
  return {
    feed: endpointState(status, error),
    notifications: endpointState(status, error),
  };
}

function deriveEndpointStatus(data: {
  feed: AdaptedSnsPost[];
  notifications: AdaptedSnsNotification[];
}): SnsEndpointStatus {
  return {
    feed: endpointState(data.feed.length ? "ready" : "empty"),
    notifications: endpointState(data.notifications.length ? "ready" : "empty"),
  };
}

function deriveSnsStatus(
  data: {
    feed: AdaptedSnsPost[];
    notifications: AdaptedSnsNotification[];
  },
  endpointStatus: SnsEndpointStatus,
): Pick<SnsState, "status" | "error"> {
  const failedCount = Object.values(endpointStatus).filter((item) => item.status === "error").length;
  if (failedCount === Object.keys(endpointStatus).length) {
    return { status: "error", error: "加载朋友圈失败" };
  }
  if (failedCount > 0) {
    return { status: "partial", error: "部分朋友圈数据加载失败" };
  }
  return {
    status: data.feed.length || data.notifications.length ? "ready" : "empty",
    error: null,
  };
}

function hasFilterChange(current: SnsFilters, next: SnsFilters): boolean {
  return (
    current.user !== next.user ||
    current.since !== next.since ||
    current.until !== next.until ||
    current.contentType !== next.contentType ||
    current.mediaOnly !== next.mediaOnly ||
    current.includeRead !== next.includeRead ||
    current.limit !== next.limit
  );
}

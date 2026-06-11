import { create } from "zustand";
import type {
  AdaptedSnsNotification,
  AdaptedSnsPost,
  SnsPostContentType,
} from "@l4/network";

export type SnsLoadStatus = "idle" | "loading" | "ready" | "empty" | "error";
export type SnsActiveTab = "timeline" | "search" | "notifications";
export type SnsContentTypeFilter = "all" | SnsPostContentType;

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
}

interface SnsActions {
  setLoading: (requestId?: string | null) => void;
  setData: (data: { feed: AdaptedSnsPost[]; notifications: AdaptedSnsNotification[] }, requestId?: string) => void;
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
};

export const useSnsStore = create<SnsStore>((set, get) => ({
  ...initialState,
  setLoading: (requestId = null) => set({ status: "loading", error: null, activeFeedRequestId: requestId }),
  setData: ({ feed, notifications }, requestId) =>
    set((state) => {
      if (requestId && state.activeFeedRequestId !== requestId) return state;
      return {
      feed,
      notifications,
      status: feed.length || notifications.length ? "ready" : "empty",
      error: null,
      activeFeedRequestId: null,
      };
    }),
  setError: (error, requestId) =>
    set((state) => {
      if (requestId && state.activeFeedRequestId !== requestId) return state;
      return { status: "error", error, activeFeedRequestId: null };
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
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
    })),
  selectPost: (selectedPostId) => set({ selectedPostId }),
  isFeedRequestActive: (requestId) => get().activeFeedRequestId === requestId,
  isSearchRequestActive: (requestId) => get().activeSearchRequestId === requestId,
  reset: () =>
    set({
      ...initialState,
      filters: { ...defaultSnsFilters },
    }),
}));

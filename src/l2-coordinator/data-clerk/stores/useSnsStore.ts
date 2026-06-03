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
}

interface SnsActions {
  setLoading: () => void;
  setData: (data: { feed: AdaptedSnsPost[]; notifications: AdaptedSnsNotification[] }) => void;
  setError: (error: string) => void;
  setSearchLoading: () => void;
  setSearchResults: (results: AdaptedSnsPost[]) => void;
  setSearchError: (error: string) => void;
  setSearchQuery: (searchQuery: string) => void;
  setActiveTab: (activeTab: SnsActiveTab) => void;
  updateFilters: (filters: Partial<SnsFilters>) => void;
  selectPost: (selectedPostId: string | null) => void;
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
};

export const useSnsStore = create<SnsStore>((set) => ({
  ...initialState,
  setLoading: () => set({ status: "loading", error: null }),
  setData: ({ feed, notifications }) =>
    set({
      feed,
      notifications,
      status: feed.length || notifications.length ? "ready" : "empty",
      error: null,
    }),
  setError: (error) => set({ status: "error", error }),
  setSearchLoading: () => set({ searchStatus: "loading", searchError: null }),
  setSearchResults: (searchResults) =>
    set({
      searchResults,
      searchStatus: searchResults.length ? "ready" : "empty",
      searchError: null,
    }),
  setSearchError: (searchError) =>
    set({ searchStatus: "error", searchError, searchResults: [], selectedPostId: null }),
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
  reset: () =>
    set({
      ...initialState,
      filters: { ...defaultSnsFilters },
    }),
}));

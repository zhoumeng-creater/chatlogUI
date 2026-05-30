import { create } from "zustand";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";

export type SearchScope = "all" | "current";
export type SearchStatus = "idle" | "invalid" | "loading" | "ready" | "empty" | "error" | "cancelled";

export interface SearchResults {
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  messages: {
    id: string;
    timestamp: number;
    time?: string;
    content: string;
    sender: string;
    username: string;
    chat: string;
    isGroup?: boolean;
    type?: string;
  }[];
}

interface SearchState {
  query: string;
  activeFilter: SearchFilterType;
  scope: SearchScope;
  status: SearchStatus;
  activeResultId: string | null;
  results: SearchResults | null;
  loading: boolean;
  error: string | null;
  navigationNotice: string | null;
  setQuery: (query: string) => void;
  setFilter: (filter: SearchFilterType) => void;
  setScope: (scope: SearchScope) => void;
  setActiveResultId: (id: string | null) => void;
  setResults: (results: SearchResults | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInvalidQuery: (query?: string) => void;
  setCancelled: () => void;
  setNavigationNotice: (notice: string | null) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  activeFilter: "all",
  scope: "all",
  status: "idle",
  activeResultId: null,
  results: null,
  loading: false,
  error: null,
  navigationNotice: null,
  setQuery: (query) => set({ query }),
  setFilter: (activeFilter) => set({ activeFilter }),
  setScope: (scope) => set({ scope }),
  setActiveResultId: (activeResultId) => set({ activeResultId, navigationNotice: null }),
  setResults: (results) => set({
    results,
    status: results
      ? results.messages.length === 0 ? "empty" : "ready"
      : "idle",
    activeResultId: null,
    loading: false,
    error: null,
    navigationNotice: null,
  }),
  setLoading: (loading) => set({ loading, status: loading ? "loading" : "idle", error: null }),
  setError: (error) => set({ error, status: error ? "error" : "idle", loading: false }),
  setInvalidQuery: (query = "") => set({
    query,
    status: "invalid",
    results: null,
    activeResultId: null,
    loading: false,
    error: null,
    navigationNotice: null,
  }),
  setCancelled: () => set({
    query: "",
    status: "cancelled",
    results: null,
    activeResultId: null,
    loading: false,
    error: null,
    navigationNotice: null,
  }),
  setNavigationNotice: (navigationNotice) => set({ navigationNotice }),
  clear: () => set({
    query: "",
    status: "cancelled",
    results: null,
    activeResultId: null,
    loading: false,
    error: null,
    navigationNotice: null,
  }),
}));

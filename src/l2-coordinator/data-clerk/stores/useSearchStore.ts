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
  activeResultId: string | null;
  results: SearchResults | null;
  status: SearchStatus;
  loading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  setFilter: (filter: SearchFilterType) => void;
  setScope: (scope: SearchScope) => void;
  setActiveResultId: (id: string | null) => void;
  setResults: (results: SearchResults | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInvalid: () => void;
  setCancelled: () => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  activeFilter: "all",
  scope: "all",
  activeResultId: null,
  results: null,
  status: "idle",
  loading: false,
  error: null,
  setQuery: (query) => set({ query }),
  setFilter: (activeFilter) => set({ activeFilter }),
  setScope: (scope) => set({ scope }),
  setActiveResultId: (activeResultId) => set({ activeResultId }),
  setResults: (results) => set({
    results,
    activeResultId: null,
    status: results ? (results.messages.length > 0 ? "ready" : "empty") : "idle",
    loading: false,
    error: null,
  }),
  setLoading: (loading) => set({ loading, status: loading ? "loading" : "idle" }),
  setError: (error) => set({ error, loading: false, status: "error" }),
  setInvalid: () => set({
    results: null,
    activeResultId: null,
    loading: false,
    error: null,
    status: "invalid",
  }),
  setCancelled: () => set({
    results: null,
    activeResultId: null,
    loading: false,
    error: null,
    status: "cancelled",
  }),
  clear: () => set({
    query: "",
    results: null,
    activeResultId: null,
    status: "idle",
    loading: false,
    error: null,
  }),
}));

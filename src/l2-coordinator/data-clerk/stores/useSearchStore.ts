import { create } from "zustand";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";

export type SearchScope = "all" | "current";
export type SearchStatus = "idle" | "invalid" | "loading" | "ready" | "empty" | "error" | "cancelled";
export type SearchActiveRequestKind = "search" | "loadMore" | "retry";

export interface SearchActiveRequest {
  requestId: string;
  kind: SearchActiveRequestKind;
  query: string;
  filter: SearchFilterType;
  scope: SearchScope;
  scopeChat: string | null;
  offset: number;
  limit: number;
}

export interface SearchResults {
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  messages: {
    id: string;
    localId?: number;
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
  activeRequest: SearchActiveRequest | null;
  results: SearchResults | null;
  status: SearchStatus;
  loading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  setFilter: (filter: SearchFilterType) => void;
  setScope: (scope: SearchScope) => void;
  setActiveResultId: (id: string | null) => void;
  setActiveRequest: (request: SearchActiveRequest) => void;
  clearActiveRequest: (requestId?: string | null) => void;
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
  activeRequest: null,
  results: null,
  status: "idle",
  loading: false,
  error: null,
  setQuery: (query) => set({ query }),
  setFilter: (activeFilter) => set({ activeFilter }),
  setScope: (scope) => set({ scope }),
  setActiveResultId: (activeResultId) => set({ activeResultId }),
  setActiveRequest: (activeRequest) => set({ activeRequest }),
  clearActiveRequest: (requestId) => set((state) => {
    if (requestId && state.activeRequest?.requestId !== requestId) {
      return {};
    }
    return { activeRequest: null };
  }),
  setResults: (results) => set({
    results,
    activeResultId: null,
    activeRequest: null,
    status: results ? (results.messages.length > 0 ? "ready" : "empty") : "idle",
    loading: false,
    error: null,
  }),
  setLoading: (loading) => set({ loading, status: loading ? "loading" : "idle" }),
  setError: (error) => set({ error, activeRequest: null, loading: false, status: "error" }),
  setInvalid: () => set({
    results: null,
    activeResultId: null,
    activeRequest: null,
    loading: false,
    error: null,
    status: "invalid",
  }),
  setCancelled: () => set({
    results: null,
    activeResultId: null,
    activeRequest: null,
    loading: false,
    error: null,
    status: "cancelled",
  }),
  clear: () => set({
    query: "",
    results: null,
    activeResultId: null,
    activeRequest: null,
    status: "idle",
    loading: false,
    error: null,
  }),
}));

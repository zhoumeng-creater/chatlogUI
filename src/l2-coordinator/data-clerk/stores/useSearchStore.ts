import { create } from "zustand";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";

export type SearchScope = "all" | "current";

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
  loading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  setFilter: (filter: SearchFilterType) => void;
  setScope: (scope: SearchScope) => void;
  setActiveResultId: (id: string | null) => void;
  setResults: (results: SearchResults | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  activeFilter: "all",
  scope: "all",
  activeResultId: null,
  results: null,
  loading: false,
  error: null,
  setQuery: (query) => set({ query }),
  setFilter: (activeFilter) => set({ activeFilter }),
  setScope: (scope) => set({ scope }),
  setActiveResultId: (activeResultId) => set({ activeResultId }),
  setResults: (results) => set({ results, activeResultId: null, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clear: () => set({ query: "", results: null, activeResultId: null, loading: false, error: null }),
}));

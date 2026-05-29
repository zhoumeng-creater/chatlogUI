import { create } from "zustand";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";

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
  results: SearchResults | null;
  loading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  setFilter: (filter: SearchFilterType) => void;
  setResults: (results: SearchResults | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  activeFilter: "all",
  results: null,
  loading: false,
  error: null,
  setQuery: (query) => set({ query }),
  setFilter: (activeFilter) => set({ activeFilter }),
  setResults: (results) => set({ results, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clear: () => set({ query: "", results: null, loading: false, error: null }),
}));

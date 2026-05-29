import { create } from "zustand";
import type { SearchFilterType, SearchResult } from "@/l2-coordinator/api-docs/search";

interface SearchState {
  query: string;
  activeFilter: SearchFilterType;
  results: SearchResult | null;
  loading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  setFilter: (filter: SearchFilterType) => void;
  setResults: (results: SearchResult | null) => void;
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

import { create } from "zustand";
import type { SearchResult } from "@/l2-coordinator/api-docs/search";

interface SearchState {
  query: string;
  results: SearchResult | null;
  loading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  setResults: (results: SearchResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  results: null,
  loading: false,
  error: null,
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clear: () => set({ query: "", results: null, loading: false, error: null }),
}));

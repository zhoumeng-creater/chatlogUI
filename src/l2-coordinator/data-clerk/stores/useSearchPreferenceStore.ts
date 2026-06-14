import { create } from "zustand";
import {
  addSearchHistoryTerm,
  clearSearchHistory,
  removeSearchHistoryTerm,
  sanitizeSearchHistory,
} from "@l2/commander/searchHistoryPreference";

export const SEARCH_HISTORY_STORAGE_KEY = "chatlogui.search.recentQueries";

interface SearchPreferenceState {
  recentQueries: string[];
  loaded: boolean;
  loadFromStorage: (privacyOn: boolean) => void;
  addRecentQuery: (query: string, privacyOn: boolean) => void;
  deleteRecentQuery: (query: string) => void;
  clearRecentQueries: () => void;
  reset: () => void;
}

export const useSearchPreferenceStore = create<SearchPreferenceState>((set, get) => ({
  recentQueries: [],
  loaded: false,

  loadFromStorage: (privacyOn) => {
    if (privacyOn) {
      removeStoredHistory();
      set({ recentQueries: [], loaded: true });
      return;
    }

    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
      set({
        recentQueries: sanitizeSearchHistory(raw ? JSON.parse(raw) : []),
        loaded: true,
      });
    } catch {
      set({ recentQueries: [], loaded: true });
    }
  },

  addRecentQuery: (query, privacyOn) => {
    const recentQueries = addSearchHistoryTerm(get().recentQueries, query, privacyOn);
    set({ recentQueries, loaded: true });
    persistHistory(recentQueries, privacyOn);
  },

  deleteRecentQuery: (query) => {
    const recentQueries = removeSearchHistoryTerm(get().recentQueries, query);
    set({ recentQueries, loaded: true });
    persistHistory(recentQueries, false);
  },

  clearRecentQueries: () => {
    const recentQueries = clearSearchHistory();
    set({ recentQueries, loaded: true });
    persistHistory(recentQueries, false);
  },

  reset: () => set({ recentQueries: [], loaded: false }),
}));

function persistHistory(recentQueries: string[], privacyOn: boolean): void {
  if (privacyOn || recentQueries.length === 0) {
    removeStoredHistory();
    return;
  }

  try {
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(recentQueries));
  } catch {
    // Best-effort local preference; search remains usable if storage is full.
  }
}

function removeStoredHistory(): void {
  try {
    localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
  } catch {
    // Best-effort local preference cleanup.
  }
}

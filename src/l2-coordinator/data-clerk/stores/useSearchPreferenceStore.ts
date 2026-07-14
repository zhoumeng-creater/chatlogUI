import { create } from "zustand";
import {
  addSearchHistoryEntry,
  clearSearchHistory,
  removeSearchHistoryEntry,
  sanitizeSearchHistory,
  visibleSearchHistory,
  type SearchHistoryEntry,
} from "@l2/commander/searchHistoryPreference";

export const SEARCH_HISTORY_STORAGE_KEY = "chatlogui.search.recentQueries";
export const SEARCH_VIEW_PREFERENCES_STORAGE_KEY = "chatlogui.search.viewPreferences";

export type SearchBrowseMode = "manual" | "infinite" | "paged";
export type SearchSortMode = "baseline" | "oldest" | "newest";
export type SearchGroupingMode = "none" | "conversation" | "date";

interface SearchViewPreferences {
  browseMode: SearchBrowseMode;
  sortMode: SearchSortMode;
  groupingMode: SearchGroupingMode;
}

interface SearchPreferenceState extends SearchViewPreferences {
  recentEntries: SearchHistoryEntry[];
  recentQueries: string[];
  loaded: boolean;
  loadFromStorage: (privacyOn: boolean, now?: number) => void;
  recordSuccessfulQuery: (query: string, succeededAt: number, privacyOn: boolean) => void;
  deleteRecentQuery: (query: string, now?: number) => void;
  clearRecentQueries: () => void;
  setBrowseMode: (mode: SearchBrowseMode) => void;
  setSortMode: (mode: SearchSortMode) => void;
  setGroupingMode: (mode: SearchGroupingMode) => void;
  reset: () => void;
}

const defaultViewPreferences: SearchViewPreferences = {
  browseMode: "manual",
  sortMode: "baseline",
  groupingMode: "none",
};

export const useSearchPreferenceStore = create<SearchPreferenceState>((set, get) => ({
  ...defaultViewPreferences,
  recentEntries: [],
  recentQueries: [],
  loaded: false,

  loadFromStorage: (privacyOn, now = Date.now()) => {
    const viewPreferences = readViewPreferences();
    if (privacyOn) {
      set({
        ...viewPreferences,
        recentEntries: [],
        recentQueries: [],
        loaded: true,
      });
      return;
    }
    const recentEntries = readHistory(now);
    set({
      ...viewPreferences,
      recentEntries,
      recentQueries: visibleSearchHistory(recentEntries, false, now),
      loaded: true,
    });
  },

  recordSuccessfulQuery: (query, succeededAt, privacyOn) => {
    if (privacyOn) return;
    const recentEntries = addSearchHistoryEntry(get().recentEntries, query, succeededAt, false);
    set({
      recentEntries,
      recentQueries: visibleSearchHistory(recentEntries, false, succeededAt),
      loaded: true,
    });
    persistHistory(recentEntries);
  },

  deleteRecentQuery: (query, now = Date.now()) => {
    const recentEntries = removeSearchHistoryEntry(get().recentEntries, query, now);
    set({
      recentEntries,
      recentQueries: visibleSearchHistory(recentEntries, false, now),
      loaded: true,
    });
    persistHistory(recentEntries);
  },

  clearRecentQueries: () => {
    const recentEntries = clearSearchHistory();
    set({ recentEntries, recentQueries: [], loaded: true });
    persistHistory(recentEntries);
  },

  setBrowseMode: (browseMode) => {
    set({ browseMode });
    persistViewPreferences(get());
  },

  setSortMode: (sortMode) => {
    set({ sortMode });
    persistViewPreferences(get());
  },

  setGroupingMode: (groupingMode) => {
    set({ groupingMode });
    persistViewPreferences(get());
  },

  reset: () => set({
    ...defaultViewPreferences,
    recentEntries: [],
    recentQueries: [],
    loaded: false,
  }),
}));

function readHistory(now: number): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
    return sanitizeSearchHistory(raw ? JSON.parse(raw) : [], now);
  } catch {
    return [];
  }
}

function persistHistory(recentEntries: SearchHistoryEntry[]): void {
  try {
    if (recentEntries.length === 0) {
      localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(recentEntries));
  } catch {
    // Best-effort local preference; search remains usable if storage is full.
  }
}

function readViewPreferences(): SearchViewPreferences {
  try {
    const raw = localStorage.getItem(SEARCH_VIEW_PREFERENCES_STORAGE_KEY);
    return sanitizeViewPreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...defaultViewPreferences };
  }
}

function sanitizeViewPreferences(value: unknown): SearchViewPreferences {
  if (!isRecord(value)) return { ...defaultViewPreferences };
  return {
    browseMode: isOneOf(value.browseMode, ["manual", "infinite", "paged"])
      ? value.browseMode
      : defaultViewPreferences.browseMode,
    sortMode: isOneOf(value.sortMode, ["baseline", "oldest", "newest"])
      ? value.sortMode
      : defaultViewPreferences.sortMode,
    groupingMode: isOneOf(value.groupingMode, ["none", "conversation", "date"])
      ? value.groupingMode
      : defaultViewPreferences.groupingMode,
  };
}

function persistViewPreferences(value: SearchViewPreferences): void {
  try {
    localStorage.setItem(SEARCH_VIEW_PREFERENCES_STORAGE_KEY, JSON.stringify({
      browseMode: value.browseMode,
      sortMode: value.sortMode,
      groupingMode: value.groupingMode,
    }));
  } catch {
    // Best-effort non-private view preference.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

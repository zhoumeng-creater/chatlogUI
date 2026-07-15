import { create } from "zustand";
import {
  addSearchHistoryEntry,
  clearSearchHistory,
  createSearchHistoryStorageValue,
  decodeSearchHistoryStorage,
  removeSearchHistoryEntry,
  visibleSearchHistory,
  type SearchHistoryEntry,
  type SearchHistoryStorageValue,
} from "@l2/commander/searchHistoryPreference";

export const SEARCH_HISTORY_STORAGE_KEY = "chatlogui.search.recentQueries";
export const SEARCH_VIEW_PREFERENCES_STORAGE_KEY = "chatlogui.search.viewPreferences";

export type SearchBrowseMode = "manual" | "infinite" | "paged";
export type SearchSortMode = "oldest" | "newest";
export type SearchGroupingMode = "none" | "conversation" | "date";

interface SearchViewPreferences {
  browseMode: SearchBrowseMode;
  sortMode: SearchSortMode;
  groupingMode: SearchGroupingMode;
}

interface SearchPreferenceState extends SearchViewPreferences {
  rememberRecentSearches: boolean;
  recentEntries: SearchHistoryEntry[];
  recentQueries: string[];
  loaded: boolean;
  loadFromStorage: (privacyOn: boolean, now?: number) => void;
  recordSuccessfulQuery: (query: string, succeededAt: number, privacyOn: boolean) => void;
  deleteRecentQuery: (query: string, now?: number) => void;
  clearRecentQueries: () => void;
  setRememberRecentSearches: (enabled: boolean) => void;
  setBrowseMode: (mode: SearchBrowseMode) => void;
  setSortMode: (mode: SearchSortMode) => void;
  setGroupingMode: (mode: SearchGroupingMode) => void;
  reset: () => void;
}

const defaultViewPreferences: SearchViewPreferences = {
  browseMode: "manual",
  sortMode: "newest",
  groupingMode: "none",
};

export const useSearchPreferenceStore = create<SearchPreferenceState>((set, get) => ({
  ...defaultViewPreferences,
  rememberRecentSearches: true,
  recentEntries: [],
  recentQueries: [],
  loaded: false,

  loadFromStorage: (privacyOn, now = Date.now()) => {
    const viewPreferences = readViewPreferences();
    const history = readHistoryStorage(now);
    const recentEntries = history.entries;
    set({
      ...viewPreferences,
      rememberRecentSearches: history.rememberRecentSearches,
      recentEntries,
      recentQueries: history.rememberRecentSearches
        ? visibleSearchHistory(recentEntries, privacyOn, now)
        : [],
      loaded: true,
    });
  },

  recordSuccessfulQuery: (query, succeededAt, privacyOn) => {
    if (privacyOn || !get().rememberRecentSearches) return;
    const recentEntries = addSearchHistoryEntry(get().recentEntries, query, succeededAt, false);
    set({
      recentEntries,
      recentQueries: visibleSearchHistory(recentEntries, false, succeededAt),
      loaded: true,
    });
    persistHistory(recentEntries, true, succeededAt);
  },

  deleteRecentQuery: (query, now = Date.now()) => {
    const recentEntries = removeSearchHistoryEntry(get().recentEntries, query, now);
    set({
      recentEntries,
      recentQueries: visibleSearchHistory(recentEntries, false, now),
      loaded: true,
    });
    persistHistory(recentEntries, get().rememberRecentSearches, now);
  },

  clearRecentQueries: () => {
    const recentEntries = clearSearchHistory();
    set({ recentEntries, recentQueries: [], loaded: true });
    persistHistory(recentEntries, get().rememberRecentSearches);
  },

  setRememberRecentSearches: (enabled) => {
    const recentEntries = enabled ? get().recentEntries : clearSearchHistory();
    set({
      rememberRecentSearches: enabled,
      recentEntries,
      recentQueries: enabled ? get().recentQueries : [],
      loaded: true,
    });
    persistHistory(recentEntries, enabled);
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
    rememberRecentSearches: true,
    recentEntries: [],
    recentQueries: [],
    loaded: false,
  }),
}));

function readHistoryStorage(now: number): SearchHistoryStorageValue {
  const fallback = createSearchHistoryStorageValue(true, [], now);
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
    if (raw === null) return fallback;
    const decoded = decodeSearchHistoryStorage(JSON.parse(raw), now);
    if (decoded.requiresWriteback) persistHistoryValue(decoded.value);
    return decoded.value;
  } catch {
    persistHistoryValue(fallback);
    return fallback;
  }
}

function persistHistory(
  recentEntries: SearchHistoryEntry[],
  rememberRecentSearches: boolean,
  now: number = Date.now(),
): void {
  persistHistoryValue(createSearchHistoryStorageValue(rememberRecentSearches, recentEntries, now));
}

function persistHistoryValue(value: SearchHistoryStorageValue): void {
  try {
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(value));
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
    sortMode: isOneOf(value.sortMode, ["oldest", "newest"])
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

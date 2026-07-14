import { afterEach, describe, expect, it, vi } from "vitest";
import { SEARCH_HISTORY_TTL_MS } from "@l2/commander/searchHistoryPreference";
import {
  SEARCH_HISTORY_STORAGE_KEY,
  SEARCH_VIEW_PREFERENCES_STORAGE_KEY,
  useSearchPreferenceStore,
} from "./useSearchPreferenceStore";

const now = Date.UTC(2026, 6, 14, 12);

describe("useSearchPreferenceStore", () => {
  afterEach(() => {
    useSearchPreferenceStore.getState().reset();
    vi.unstubAllGlobals();
  });

  it("loads legacy history, records only an explicit successful snapshot, and persists structured entries", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => key === SEARCH_HISTORY_STORAGE_KEY
        ? JSON.stringify(["alpha", "bravo", "", "alpha"])
        : null),
      setItem,
      removeItem: vi.fn(),
    });

    useSearchPreferenceStore.getState().loadFromStorage(false, now);
    expect(useSearchPreferenceStore.getState().recentQueries).toEqual(["alpha", "bravo"]);

    useSearchPreferenceStore.getState().recordSuccessfulQuery("charlie", now + 1, false);
    const stored = JSON.parse(lastStoredValue(setItem.mock.calls, SEARCH_HISTORY_STORAGE_KEY));
    expect(stored[0]).toEqual({
      normalizedQuery: "charlie",
      displayQuery: "charlie",
      succeededAt: now + 1,
      expiresAt: now + 1 + SEARCH_HISTORY_TTL_MS,
    });
    expect(useSearchPreferenceStore.getState().recentQueries).toEqual(["charlie", "alpha", "bravo"]);
  });

  it("hides and pauses history in privacy mode without deleting persisted entries", () => {
    const getItem = vi.fn(() => JSON.stringify(["private query"]));
    const setItem = vi.fn();
    const removeItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem, setItem, removeItem });

    useSearchPreferenceStore.getState().loadFromStorage(true, now);
    useSearchPreferenceStore.getState().recordSuccessfulQuery("new private query", now, true);

    expect(useSearchPreferenceStore.getState().recentQueries).toEqual([]);
    expect(getItem).not.toHaveBeenCalledWith(SEARCH_HISTORY_STORAGE_KEY);
    expect(setItem).not.toHaveBeenCalledWith(SEARCH_HISTORY_STORAGE_KEY, expect.anything());
    expect(removeItem).not.toHaveBeenCalledWith(SEARCH_HISTORY_STORAGE_KEY);
  });

  it("prunes expired entries on load", () => {
    const expired = {
      normalizedQuery: "expired",
      displayQuery: "expired",
      succeededAt: now - SEARCH_HISTORY_TTL_MS - 1,
      expiresAt: now - 1,
    };
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => key === SEARCH_HISTORY_STORAGE_KEY ? JSON.stringify([expired]) : null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    useSearchPreferenceStore.getState().loadFromStorage(false, now);
    expect(useSearchPreferenceStore.getState().recentEntries).toEqual([]);
    expect(useSearchPreferenceStore.getState().recentQueries).toEqual([]);
  });

  it("persists only browse, sort, and grouping preferences without private search facts", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => key === SEARCH_VIEW_PREFERENCES_STORAGE_KEY
        ? JSON.stringify({ browseMode: "paged", sortMode: "oldest", groupingMode: "conversation", ignored: "PRIVATE" })
        : null),
      setItem,
      removeItem: vi.fn(),
    });

    useSearchPreferenceStore.getState().loadFromStorage(false, now);
    expect(useSearchPreferenceStore.getState()).toMatchObject({
      browseMode: "paged",
      sortMode: "oldest",
      groupingMode: "conversation",
    });
    useSearchPreferenceStore.getState().setBrowseMode("infinite");
    useSearchPreferenceStore.getState().setSortMode("newest");
    useSearchPreferenceStore.getState().setGroupingMode("date");

    const raw = lastStoredValue(setItem.mock.calls, SEARCH_VIEW_PREFERENCES_STORAGE_KEY);
    expect(JSON.parse(raw)).toEqual({
      browseMode: "infinite",
      sortMode: "newest",
      groupingMode: "date",
    });
    expect(raw).not.toContain("PRIVATE");
    expect(raw).not.toContain("query");
    expect(raw).not.toContain("sender");
    expect(raw).not.toContain("chat");
  });
});

function lastStoredValue(calls: unknown[][], storageKey: string): string {
  for (let index = calls.length - 1; index >= 0; index -= 1) {
    if (calls[index][0] === storageKey) return String(calls[index][1]);
  }
  throw new Error(`No storage call for ${storageKey}`);
}

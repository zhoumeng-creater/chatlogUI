import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SEARCH_HISTORY_STORAGE_VERSION,
  SEARCH_HISTORY_TTL_MS,
} from "@l2/commander/searchHistoryPreference";
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

  it("migrates legacy history once, records only an explicit successful snapshot, and persists a versioned payload", () => {
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

    const migrated = JSON.parse(lastStoredValue(setItem.mock.calls, SEARCH_HISTORY_STORAGE_KEY));
    expect(migrated).toMatchObject({
      version: SEARCH_HISTORY_STORAGE_VERSION,
      rememberRecentSearches: true,
    });
    expect(migrated.entries[0].succeededAt).toBe(now);

    useSearchPreferenceStore.getState().recordSuccessfulQuery("charlie", now + 1, false);
    const stored = JSON.parse(lastStoredValue(setItem.mock.calls, SEARCH_HISTORY_STORAGE_KEY));
    expect(stored.entries[0]).toEqual({
      normalizedQuery: "charlie",
      displayQuery: "charlie",
      succeededAt: now + 1,
      expiresAt: now + 1 + SEARCH_HISTORY_TTL_MS,
    });
    expect(useSearchPreferenceStore.getState().recentQueries).toEqual(["charlie", "alpha", "bravo"]);
  });

  it("hides and pauses history in privacy mode without deleting persisted entries", () => {
    const persisted = {
      version: SEARCH_HISTORY_STORAGE_VERSION,
      rememberRecentSearches: true,
      entries: [{
        normalizedQuery: "private\u0000query",
        displayQuery: "private query",
        succeededAt: now - 1,
        expiresAt: now - 1 + SEARCH_HISTORY_TTL_MS,
      }],
    };
    const getItem = vi.fn(() => JSON.stringify(persisted));
    const setItem = vi.fn();
    const removeItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem, setItem, removeItem });

    useSearchPreferenceStore.getState().loadFromStorage(true, now);
    useSearchPreferenceStore.getState().recordSuccessfulQuery("new private query", now, true);

    expect(useSearchPreferenceStore.getState().recentQueries).toEqual([]);
    expect(useSearchPreferenceStore.getState().recentEntries).toHaveLength(1);
    expect(getItem).toHaveBeenCalledWith(SEARCH_HISTORY_STORAGE_KEY);
    expect(setItem).not.toHaveBeenCalledWith(SEARCH_HISTORY_STORAGE_KEY, expect.anything());
    expect(removeItem).not.toHaveBeenCalledWith(SEARCH_HISTORY_STORAGE_KEY);

    useSearchPreferenceStore.getState().loadFromStorage(false, now);
    expect(useSearchPreferenceStore.getState().recentQueries).toEqual(["private query"]);
  });

  it("prunes expired entries on load", () => {
    const setItem = vi.fn();
    const expired = {
      normalizedQuery: "expired",
      displayQuery: "expired",
      succeededAt: now - SEARCH_HISTORY_TTL_MS - 1,
      expiresAt: now - 1,
    };
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => key === SEARCH_HISTORY_STORAGE_KEY
        ? JSON.stringify({
          version: SEARCH_HISTORY_STORAGE_VERSION,
          rememberRecentSearches: true,
          entries: [expired],
        })
        : null),
      setItem,
      removeItem: vi.fn(),
    });
    useSearchPreferenceStore.getState().loadFromStorage(false, now);
    expect(useSearchPreferenceStore.getState().recentEntries).toEqual([]);
    expect(useSearchPreferenceStore.getState().recentQueries).toEqual([]);
    expect(JSON.parse(lastStoredValue(setItem.mock.calls, SEARCH_HISTORY_STORAGE_KEY))).toEqual({
      version: SEARCH_HISTORY_STORAGE_VERSION,
      rememberRecentSearches: true,
      entries: [],
    });
  });

  it("disables history by deleting it immediately, persists the choice, and stops new recording", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => key === SEARCH_HISTORY_STORAGE_KEY
        ? JSON.stringify(["alpha"])
        : null),
      setItem,
      removeItem: vi.fn(),
    });

    useSearchPreferenceStore.getState().loadFromStorage(false, now);
    useSearchPreferenceStore.getState().setRememberRecentSearches(false);
    useSearchPreferenceStore.getState().recordSuccessfulQuery("must not persist", now + 1, false);

    expect(useSearchPreferenceStore.getState()).toMatchObject({
      rememberRecentSearches: false,
      recentEntries: [],
      recentQueries: [],
    });
    expect(JSON.parse(lastStoredValue(setItem.mock.calls, SEARCH_HISTORY_STORAGE_KEY))).toEqual({
      version: SEARCH_HISTORY_STORAGE_VERSION,
      rememberRecentSearches: false,
      entries: [],
    });

    useSearchPreferenceStore.getState().setRememberRecentSearches(true);
    useSearchPreferenceStore.getState().recordSuccessfulQuery("resumed", now + 2, false);
    expect(useSearchPreferenceStore.getState().recentQueries).toEqual(["resumed"]);
  });

  it("does not renew migrated legacy timestamps after the migrated payload is reloaded", () => {
    let stored = JSON.stringify(["legacy"]);
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => key === SEARCH_HISTORY_STORAGE_KEY ? stored : null),
      setItem: vi.fn((key: string, value: string) => {
        if (key === SEARCH_HISTORY_STORAGE_KEY) stored = value;
      }),
      removeItem: vi.fn(),
    });

    useSearchPreferenceStore.getState().loadFromStorage(false, now);
    const migratedAt = useSearchPreferenceStore.getState().recentEntries[0]?.succeededAt;
    useSearchPreferenceStore.getState().reset();
    useSearchPreferenceStore.getState().loadFromStorage(false, now + 24 * 60 * 60 * 1000);

    expect(useSearchPreferenceStore.getState().recentEntries[0]?.succeededAt).toBe(migratedAt);
    expect(useSearchPreferenceStore.getState().recentEntries[0]?.expiresAt).toBe(
      now + SEARCH_HISTORY_TTL_MS,
    );
  });

  it("keeps search usable when localStorage reads or writes fail", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => { throw new Error("read denied"); }),
      setItem: vi.fn(() => { throw new Error("quota"); }),
      removeItem: vi.fn(() => { throw new Error("denied"); }),
    });

    expect(() => useSearchPreferenceStore.getState().loadFromStorage(false, now)).not.toThrow();
    expect(() => useSearchPreferenceStore.getState().recordSuccessfulQuery("usable", now, false))
      .not.toThrow();
    expect(() => useSearchPreferenceStore.getState().setRememberRecentSearches(false)).not.toThrow();
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

  it("falls back from obsolete or damaged view preferences to the final defaults", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) =>
        key === SEARCH_VIEW_PREFERENCES_STORAGE_KEY
          ? JSON.stringify({ browseMode: "broken", sortMode: "baseline", groupingMode: "broken" })
          : null,
      ),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    useSearchPreferenceStore.getState().loadFromStorage(false, now);
    expect(useSearchPreferenceStore.getState()).toMatchObject({
      browseMode: "manual",
      sortMode: "newest",
      groupingMode: "none",
    });
  });
});

function lastStoredValue(calls: unknown[][], storageKey: string): string {
  for (let index = calls.length - 1; index >= 0; index -= 1) {
    if (calls[index][0] === storageKey) return String(calls[index][1]);
  }
  throw new Error(`No storage call for ${storageKey}`);
}

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SEARCH_HISTORY_STORAGE_KEY,
  useSearchPreferenceStore,
} from "./useSearchPreferenceStore";

describe("useSearchPreferenceStore", () => {
  afterEach(() => {
    useSearchPreferenceStore.getState().reset();
    vi.unstubAllGlobals();
  });

  it("loads and saves sanitized recent queries", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => JSON.stringify(["alpha", "bravo", "", "alpha"])),
      setItem,
      removeItem: vi.fn(),
    });

    useSearchPreferenceStore.getState().loadFromStorage(false);
    expect(useSearchPreferenceStore.getState().recentQueries).toEqual(["alpha", "bravo"]);

    useSearchPreferenceStore.getState().addRecentQuery("charlie", false);
    expect(setItem).toHaveBeenLastCalledWith(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(["charlie", "alpha", "bravo"]),
    );
  });

  it("clears persisted query history when privacy mode is active", () => {
    const removeItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => JSON.stringify(["private query"])),
      setItem: vi.fn(),
      removeItem,
    });

    useSearchPreferenceStore.getState().loadFromStorage(true);
    useSearchPreferenceStore.getState().addRecentQuery("private query", true);

    expect(useSearchPreferenceStore.getState().recentQueries).toEqual([]);
    expect(removeItem).toHaveBeenCalledWith(SEARCH_HISTORY_STORAGE_KEY);
  });
});

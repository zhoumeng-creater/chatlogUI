import { describe, expect, it } from "vitest";
import {
  SEARCH_HISTORY_TTL_MS,
  addSearchHistoryEntry,
  clearSearchHistory,
  removeSearchHistoryEntry,
  sanitizeSearchHistory,
  visibleSearchHistory,
  type SearchHistoryEntry,
} from "./searchHistoryPreference";

const now = Date.UTC(2026, 6, 14, 12);

function entry(displayQuery: string, ageDays: number): SearchHistoryEntry {
  const succeededAt = now - ageDays * 24 * 60 * 60 * 1000;
  return {
    normalizedQuery: displayQuery.toUpperCase().toLowerCase(),
    displayQuery,
    succeededAt,
    expiresAt: succeededAt + SEARCH_HISTORY_TTL_MS,
  };
}

describe("searchHistoryPreference", () => {
  it("records only successful snapshots, promotes folded duplicates, and caps at five", () => {
    const existing = ["alpha", "bravo", "charlie", "delta", "echo"].map((value, index) => entry(value, index + 1));
    const promoted = addSearchHistoryEntry(existing, "  ＢＲＡＶＯ  ", now, false);
    expect(promoted).toHaveLength(5);
    expect(promoted[0]).toEqual({
      normalizedQuery: "bravo",
      displayQuery: "BRAVO",
      succeededAt: now,
      expiresAt: now + SEARCH_HISTORY_TTL_MS,
    });
    expect(promoted.map((item) => item.normalizedQuery)).toEqual([
      "bravo",
      "alpha",
      "charlie",
      "delta",
      "echo",
    ]);

    expect(addSearchHistoryEntry(existing, "foxtrot", now, false).map((item) => item.normalizedQuery)).toEqual([
      "foxtrot",
      "alpha",
      "bravo",
      "charlie",
      "delta",
    ]);
  });

  it("prunes entries after 30 days and sanitizes malformed or duplicate storage", () => {
    const sanitized = sanitizeSearchHistory([
      entry("valid", 1),
      entry("expired", 31),
      { ...entry("VALID", 2), normalizedQuery: "spoofed" },
      { displayQuery: "missing fields" },
      "legacy query",
    ], now);
    expect(sanitized.map((item) => item.normalizedQuery)).toEqual(["legacy query", "valid"]);
    expect(sanitized.every((item) => item.expiresAt > now)).toBe(true);
  });

  it("hides and pauses history in privacy mode without deleting saved entries", () => {
    const existing = [entry("private query", 1)];
    expect(addSearchHistoryEntry(existing, "new private query", now, true)).toEqual(existing);
    expect(visibleSearchHistory(existing, true, now)).toEqual([]);
    expect(visibleSearchHistory(existing, false, now)).toEqual(["private query"]);
  });

  it("supports deleting one normalized entry and explicitly clearing all", () => {
    const existing = [entry("alpha", 1), entry("bravo", 2), entry("charlie", 3)];
    expect(removeSearchHistoryEntry(existing, " ＢＲＡＶＯ ", now).map((item) => item.displayQuery)).toEqual([
      "alpha",
      "charlie",
    ]);
    expect(clearSearchHistory()).toEqual([]);
  });
});

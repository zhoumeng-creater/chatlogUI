import { describe, expect, it } from "vitest";
import {
  SEARCH_HISTORY_STORAGE_VERSION,
  SEARCH_HISTORY_TTL_MS,
  addSearchHistoryEntry,
  clearSearchHistory,
  decodeSearchHistoryStorage,
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

  it("deduplicates AND queries by canonical terms regardless of order or repeated words", () => {
    const existing = [entry("alpha beta", 1), entry("other", 2)];
    const promoted = addSearchHistoryEntry(existing, "  BETA alpha alpha  ", now, false);

    expect(promoted).toHaveLength(2);
    expect(promoted[0]).toEqual({
      normalizedQuery: "alpha\u0000beta",
      displayQuery: "BETA alpha alpha",
      succeededAt: now,
      expiresAt: now + SEARCH_HISTORY_TTL_MS,
    });
    expect(promoted[1]?.displayQuery).toBe("other");
  });

  it("prunes entries at the exact 30-day boundary and sanitizes malformed, future, or duplicate storage", () => {
    const sanitized = sanitizeSearchHistory([
      entry("valid", 1),
      entry("expired", 31),
      entry("exact boundary", 30),
      { ...entry("VALID", 2), normalizedQuery: "spoofed" },
      {
        normalizedQuery: "future",
        displayQuery: "future",
        succeededAt: now + 1,
        expiresAt: now + SEARCH_HISTORY_TTL_MS,
      },
      { displayQuery: "missing fields" },
    ], now);
    expect(sanitized.map((item) => item.normalizedQuery)).toEqual(["valid"]);
    expect(sanitized.every((item) => item.expiresAt > now)).toBe(true);
  });

  it("migrates legacy strings once and preserves the first migration timestamp on later reads", () => {
    const firstRead = decodeSearchHistoryStorage(["  Ｉｎｖｏｉｃｅ  ", "meeting"], now);

    expect(firstRead.requiresWriteback).toBe(true);
    expect(firstRead.value).toEqual({
      version: SEARCH_HISTORY_STORAGE_VERSION,
      rememberRecentSearches: true,
      entries: [
        {
          normalizedQuery: "invoice",
          displayQuery: "Invoice",
          succeededAt: now,
          expiresAt: now + SEARCH_HISTORY_TTL_MS,
        },
        {
          normalizedQuery: "meeting",
          displayQuery: "meeting",
          succeededAt: now,
          expiresAt: now + SEARCH_HISTORY_TTL_MS,
        },
      ],
    });

    const laterRead = decodeSearchHistoryStorage(firstRead.value, now + 24 * 60 * 60 * 1000);
    expect(laterRead.requiresWriteback).toBe(false);
    expect(laterRead.value.entries[0]?.succeededAt).toBe(now);
    expect(laterRead.value.entries[0]?.expiresAt).toBe(now + SEARCH_HISTORY_TTL_MS);
  });

  it("cleans damaged, over-limit, expired, and invalid-length versioned entries for writeback", () => {
    const tooLong = "x".repeat(201);
    const tooManyTerms = Array.from({ length: 21 }, (_, index) => `term-${index}`).join(" ");
    const value = {
      version: SEARCH_HISTORY_STORAGE_VERSION,
      rememberRecentSearches: true,
      entries: [
        entry("one", 1),
        entry("two", 2),
        entry("three", 3),
        entry("four", 4),
        entry("five", 5),
        entry("six", 6),
        entry("expired", 31),
        { ...entry("ONE", 7), normalizedQuery: "spoofed" },
        { displayQuery: tooLong, succeededAt: now - 1, expiresAt: now + 1 },
        { displayQuery: tooManyTerms, succeededAt: now - 1, expiresAt: now + 1 },
        "versioned strings are damaged data",
      ],
    };

    const decoded = decodeSearchHistoryStorage(value, now);
    expect(decoded.requiresWriteback).toBe(true);
    expect(decoded.value.entries.map((item) => item.displayQuery)).toEqual([
      "one",
      "two",
      "three",
      "four",
      "five",
    ]);
  });

  it("defaults the versioned preference to enabled and forces disabled payloads to contain no history", () => {
    const missing = decodeSearchHistoryStorage(null, now);
    const disabled = decodeSearchHistoryStorage({
      version: SEARCH_HISTORY_STORAGE_VERSION,
      rememberRecentSearches: false,
      entries: [entry("must be deleted", 1)],
    }, now);

    expect(missing.value).toEqual({
      version: SEARCH_HISTORY_STORAGE_VERSION,
      rememberRecentSearches: true,
      entries: [],
    });
    expect(disabled.requiresWriteback).toBe(true);
    expect(disabled.value).toEqual({
      version: SEARCH_HISTORY_STORAGE_VERSION,
      rememberRecentSearches: false,
      entries: [],
    });
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

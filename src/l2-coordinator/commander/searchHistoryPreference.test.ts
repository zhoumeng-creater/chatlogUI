import { describe, expect, it } from "vitest";
import {
  addSearchHistoryTerm,
  clearSearchHistory,
  removeSearchHistoryTerm,
} from "./searchHistoryPreference";

describe("searchHistoryPreference", () => {
  it("keeps at most five newest trimmed search terms and promotes duplicates", () => {
    const terms = ["alpha", "bravo", "charlie", "delta", "echo"];

    expect(addSearchHistoryTerm(terms, "  bravo  ", false)).toEqual([
      "bravo",
      "alpha",
      "charlie",
      "delta",
      "echo",
    ]);

    expect(addSearchHistoryTerm(terms, "foxtrot", false)).toEqual([
      "foxtrot",
      "alpha",
      "bravo",
      "charlie",
      "delta",
    ]);
  });

  it("does not retain raw terms when privacy mode is active or the term is blank", () => {
    expect(addSearchHistoryTerm(["alpha"], "private query", true)).toEqual([]);
    expect(addSearchHistoryTerm(["alpha"], "   ", false)).toEqual(["alpha"]);
  });

  it("supports deleting one term and clearing all terms", () => {
    expect(removeSearchHistoryTerm(["alpha", "bravo", "charlie"], "bravo")).toEqual([
      "alpha",
      "charlie",
    ]);
    expect(clearSearchHistory()).toEqual([]);
  });
});

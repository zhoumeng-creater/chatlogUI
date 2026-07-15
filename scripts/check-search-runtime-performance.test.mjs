import { describe, expect, it } from "vitest";
import { checkRuntimePerformanceBudgets } from "./check-runtime-performance-budgets.mjs";
import { createSearchRuntimePerformanceBudgetDefinitions } from "./check-search-runtime-performance.mjs";

describe("check-search-runtime-performance", () => {
  it("requires only the measured search first-result metric", () => {
    const definitions = createSearchRuntimePerformanceBudgetDefinitions({
      PERF_SEARCH_FIRST_RESULT_VISIBLE_MS: "900",
    });

    expect(definitions).toEqual([
      expect.objectContaining({
        key: "searchFirstResultVisibleMs",
        budgetMs: 900,
      }),
    ]);
    expect(
      checkRuntimePerformanceBudgets({
        metrics: { searchFirstResultVisibleMs: 320 },
        definitions,
      }).ok,
    ).toBe(true);
  });

  it("fails closed when the browser did not record first-result visibility", () => {
    const result = checkRuntimePerformanceBudgets({
      metrics: {},
      definitions: createSearchRuntimePerformanceBudgetDefinitions(),
    });

    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain(
      "search first result visible was not recorded",
    );
  });
});

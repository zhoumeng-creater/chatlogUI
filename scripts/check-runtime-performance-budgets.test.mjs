import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkRuntimePerformanceBudgets,
  createRuntimePerformanceBudgetDefinitions,
  loadRuntimePerformanceMetrics,
} from "./check-runtime-performance-budgets.mjs";

describe("check-runtime-performance-budgets", () => {
  it("passes executable synthetic checks for all required Task 15 runtime metrics", () => {
    const result = checkRuntimePerformanceBudgets({
      metrics: {
        searchFirstResultVisibleMs: 420,
        largeMessageListInitialRenderMs: 760,
        graphCanvasFirstVisibleFrameMs: 1100,
      },
      definitions: createFixtureBudgets(2_000),
    });

    expect(result.ok).toBe(true);
    expect(result.entries.map((entry) => entry.key)).toEqual([
      "searchFirstResultVisibleMs",
      "largeMessageListInitialRenderMs",
      "graphCanvasFirstVisibleFrameMs",
    ]);
  });

  it("fails closed when a required runtime metric is missing", () => {
    const result = checkRuntimePerformanceBudgets({
      metrics: {
        searchFirstResultVisibleMs: 420,
        graphCanvasFirstVisibleFrameMs: 1100,
      },
      definitions: createFixtureBudgets(2_000),
    });

    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain("large message list initial render was not recorded");
  });

  it("reports threshold failures with metric labels and durations", () => {
    const result = checkRuntimePerformanceBudgets({
      metrics: {
        searchFirstResultVisibleMs: 2_500,
        largeMessageListInitialRenderMs: 760,
        graphCanvasFirstVisibleFrameMs: 1100,
      },
      definitions: createFixtureBudgets(2_000),
    });

    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain("search first result visible 2500 ms exceeds budget 2000 ms");
  });

  it("loads metrics from a JSON fixture file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "chatlogui-runtime-perf-"));
    const file = join(dir, "metrics.json");
    await writeFile(
      file,
      JSON.stringify({
        searchFirstResultVisibleMs: 100,
        largeMessageListInitialRenderMs: 200,
        graphCanvasFirstVisibleFrameMs: 300,
      }),
      "utf8",
    );

    try {
      await expect(loadRuntimePerformanceMetrics(file)).resolves.toEqual({
        searchFirstResultVisibleMs: 100,
        largeMessageListInitialRenderMs: 200,
        graphCanvasFirstVisibleFrameMs: 300,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("fails closed when no measured runtime metrics artifact is provided", async () => {
    await expect(loadRuntimePerformanceMetrics()).rejects.toThrow(
      "RUNTIME_PERF_METRICS_FILE",
    );
    expect(checkRuntimePerformanceBudgets().ok).toBe(false);
  });
});

function createFixtureBudgets(maxDurationMs) {
  return createRuntimePerformanceBudgetDefinitions().map((definition) => ({
    ...definition,
    budgetMs: maxDurationMs,
  }));
}

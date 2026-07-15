import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRuntimePerformanceBudgetDefinitions,
  runRuntimePerformanceBudgetCli,
} from "./check-runtime-performance-budgets.mjs";

export const DEFAULT_SEARCH_RUNTIME_METRICS_FILE =
  "output/playwright/search-runtime-metrics.json";

export function createSearchRuntimePerformanceBudgetDefinitions(env = process.env) {
  const definition = createRuntimePerformanceBudgetDefinitions(env).find(
    (candidate) => candidate.key === "searchFirstResultVisibleMs",
  );
  if (!definition) {
    throw new Error("Search runtime performance budget definition is unavailable.");
  }
  return [definition];
}

export async function runSearchRuntimePerformanceBudgetCli(options = {}) {
  return runRuntimePerformanceBudgetCli({
    metrics: options.metrics,
    metricsFile:
      options.metricsFile ??
      process.env.RUNTIME_PERF_METRICS_FILE ??
      process.argv[2] ??
      DEFAULT_SEARCH_RUNTIME_METRICS_FILE,
    definitions:
      options.definitions ?? createSearchRuntimePerformanceBudgetDefinitions(options.env),
  });
}

function isCliEntrypoint() {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

if (isCliEntrypoint()) {
  await runSearchRuntimePerformanceBudgetCli();
}

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SYNTHETIC_RUNTIME_METRICS = Object.freeze({
  searchFirstResultVisibleMs: 420,
  largeMessageListInitialRenderMs: 760,
  graphCanvasFirstVisibleFrameMs: 1100,
});

export function createRuntimePerformanceBudgetDefinitions(env = process.env) {
  return [
    {
      key: "searchFirstResultVisibleMs",
      label: "search first result visible",
      budgetMs: readBudget(env, "PERF_SEARCH_FIRST_RESULT_VISIBLE_MS", 1_200),
    },
    {
      key: "largeMessageListInitialRenderMs",
      label: "large message list initial render",
      budgetMs: readBudget(env, "PERF_LARGE_MESSAGE_LIST_INITIAL_RENDER_MS", 1_600),
    },
    {
      key: "graphCanvasFirstVisibleFrameMs",
      label: "graph canvas first visible frame",
      budgetMs: readBudget(env, "PERF_GRAPH_CANVAS_FIRST_VISIBLE_FRAME_MS", 2_500),
    },
  ];
}

export async function loadRuntimePerformanceMetrics(filePath) {
  if (!filePath) return { ...DEFAULT_SYNTHETIC_RUNTIME_METRICS };

  const text = await readFile(filePath, "utf8");
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Runtime performance metrics must be a JSON object: ${filePath}`);
  }
  return parsed;
}

export function checkRuntimePerformanceBudgets({
  metrics = DEFAULT_SYNTHETIC_RUNTIME_METRICS,
  definitions = createRuntimePerformanceBudgetDefinitions(),
} = {}) {
  const entries = [];
  const failures = [];

  for (const definition of definitions) {
    const value = metrics[definition.key];
    if (!Number.isFinite(value)) {
      failures.push(`${definition.label} was not recorded.`);
      continue;
    }

    entries.push({
      key: definition.key,
      label: definition.label,
      durationMs: Math.max(0, Math.round(value)),
      budgetMs: definition.budgetMs,
    });

    if (value > definition.budgetMs) {
      failures.push(
        `${definition.label} ${Math.round(value)} ms exceeds budget ${definition.budgetMs} ms.`,
      );
    }
  }

  return {
    ok: failures.length === 0,
    entries,
    failures,
    summary: formatRuntimePerformanceBudgetReport(entries),
  };
}

export async function runRuntimePerformanceBudgetCli(options = {}) {
  try {
    const metrics = options.metrics ?? await loadRuntimePerformanceMetrics(
      options.metricsFile ?? process.env.RUNTIME_PERF_METRICS_FILE ?? process.argv[2],
    );
    const result = checkRuntimePerformanceBudgets({
      metrics,
      definitions: options.definitions ?? createRuntimePerformanceBudgetDefinitions(),
    });

    if (!result.ok) {
      for (const failure of result.failures) {
        console.error(`Runtime performance budget failed: ${failure}`);
      }
      process.exitCode = 1;
      return result;
    }

    console.log(`Runtime performance budget passed (${result.summary}).`);
    return result;
  } catch (error) {
    console.error(`Runtime performance budget failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return {
      ok: false,
      entries: [],
      failures: [error instanceof Error ? error.message : String(error)],
      summary: "",
    };
  }
}

function formatRuntimePerformanceBudgetReport(entries) {
  if (entries.length === 0) return "No runtime performance metrics.";
  return entries
    .map((entry) => `${entry.label}: ${entry.durationMs} ms / ${entry.budgetMs} ms`)
    .join("; ");
}

function readBudget(env, name, fallback) {
  const value = env[name];
  if (value === undefined) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isCliEntrypoint() {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

if (isCliEntrypoint()) {
  await runRuntimePerformanceBudgetCli();
}

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const DEFAULT_ASSET_DIR = join(process.cwd(), "dist", "assets");

export function createPerformanceBudgetDefinitions(env = process.env) {
  return [
    {
      key: "mainAppJs",
      label: "main app JS",
      required: true,
      pattern: /^index[-.].*\.js$/,
      // Baseline 2026-06-15: index JS raw 717.75 kB / gzip 210.31 kB.
      rawBudgetBytes: readBudget(env, "PERF_MAIN_APP_RAW_BUDGET_BYTES", 900_000),
      gzipBudgetBytes: readBudget(env, "PERF_MAIN_APP_GZIP_BUDGET_BYTES", 280_000),
    },
    {
      key: "mainCss",
      label: "main app CSS",
      required: true,
      pattern: /^index[-.].*\.css$/,
      // Baseline 2026-06-15: index CSS raw 143.86 kB / gzip 22.15 kB.
      rawBudgetBytes: readBudget(env, "PERF_MAIN_CSS_RAW_BUDGET_BYTES", 200_000),
      gzipBudgetBytes: readBudget(env, "PERF_MAIN_CSS_GZIP_BUDGET_BYTES", 60_000),
    },
    {
      key: "searchJs",
      label: "search page lazy JS",
      required: true,
      pattern: /^SearchView[-.].*\.js$/i,
      // Baseline 2026-07-15: SearchView JS raw 144.70 kB / gzip 43.00 kB.
      rawBudgetBytes: readBudget(env, "PERF_SEARCH_JS_RAW_BUDGET_BYTES", 180_000),
      gzipBudgetBytes: readBudget(env, "PERF_SEARCH_JS_GZIP_BUDGET_BYTES", 55_000),
    },
    {
      key: "searchCss",
      label: "search page lazy CSS",
      required: true,
      pattern: /^SearchView[-.].*\.css$/i,
      // Baseline 2026-07-15: SearchView CSS raw 45.69 kB / gzip 5.82 kB.
      rawBudgetBytes: readBudget(env, "PERF_SEARCH_CSS_RAW_BUDGET_BYTES", 60_000),
      gzipBudgetBytes: readBudget(env, "PERF_SEARCH_CSS_GZIP_BUDGET_BYTES", 8_000),
    },
    {
      key: "graph3d",
      label: "graph 3D vendor chunk",
      required: true,
      pattern: /^vendor-graph-3d[-.].*\.js$/,
      rawBudgetBytes: readBudget(env, "PERF_GRAPH_3D_RAW_BUDGET_BYTES", 1_350_000, "GRAPH_3D_RAW_BUDGET_BYTES"),
      gzipBudgetBytes: readBudget(env, "PERF_GRAPH_3D_GZIP_BUDGET_BYTES", 420_000, "GRAPH_3D_GZIP_BUDGET_BYTES"),
    },
    {
      key: "semantic",
      label: "AI/semantic lazy chunk",
      required: true,
      pattern: /^(?:AiPanel|Semantic|semantic|ai)[-.].*\.js$/i,
      // Baseline 2026-06-15: AiPanel raw 55.02 kB / gzip 15.51 kB.
      rawBudgetBytes: readBudget(env, "PERF_SEMANTIC_RAW_BUDGET_BYTES", 550_000),
      gzipBudgetBytes: readBudget(env, "PERF_SEMANTIC_GZIP_BUDGET_BYTES", 180_000),
    },
    {
      key: "media",
      label: "media lazy chunk",
      required: true,
      pattern: /^(?:MediaLibrary|Media|media)[-.].*\.js$/i,
      rawBudgetBytes: readBudget(env, "PERF_MEDIA_RAW_BUDGET_BYTES", 350_000),
      gzipBudgetBytes: readBudget(env, "PERF_MEDIA_GZIP_BUDGET_BYTES", 120_000),
    },
  ];
}

export function classifyPerformanceAssets(
  assetDir = DEFAULT_ASSET_DIR,
  definitions = createPerformanceBudgetDefinitions(),
) {
  if (!existsSync(assetDir)) {
    throw new Error(`Missing build assets directory: ${assetDir}. Run pnpm build first.`);
  }

  const assets = readdirSync(assetDir)
    .filter((fileName) => /\.(?:js|css)$/.test(fileName))
    .map((fileName) => {
      const path = join(assetDir, fileName);
      const rawBytes = statSync(path).size;
      const gzipBytes = gzipSync(readFileSync(path)).byteLength;
      return { fileName, path, rawBytes, gzipBytes };
    });

  return definitions.reduce((acc, definition) => {
    acc[definition.key] = assets
      .filter((asset) => definition.pattern.test(asset.fileName))
      .sort((a, b) => a.fileName.localeCompare(b.fileName));
    return acc;
  }, {});
}

export function checkPerformanceBudgets({
  assetDir = DEFAULT_ASSET_DIR,
  definitions = createPerformanceBudgetDefinitions(),
  only = null,
} = {}) {
  const selectedDefinitions = only
    ? definitions.filter((definition) => only.includes(definition.key))
    : definitions;
  const categories = classifyPerformanceAssets(assetDir, selectedDefinitions);
  const entries = [];
  const failures = [];

  for (const definition of selectedDefinitions) {
    const assets = categories[definition.key] ?? [];

    if (definition.required && assets.length === 0) {
      failures.push(`${definition.label} was not emitted.`);
      continue;
    }

    for (const asset of assets) {
      entries.push({
        key: definition.key,
        label: definition.label,
        fileName: asset.fileName,
        rawBytes: asset.rawBytes,
        gzipBytes: asset.gzipBytes,
        rawBudgetBytes: definition.rawBudgetBytes,
        gzipBudgetBytes: definition.gzipBudgetBytes,
      });

      if (asset.rawBytes > definition.rawBudgetBytes) {
        failures.push(
          `${asset.fileName} raw size ${asset.rawBytes} exceeds budget ${definition.rawBudgetBytes} (${definition.label}).`,
        );
      }
      if (asset.gzipBytes > definition.gzipBudgetBytes) {
        failures.push(
          `${definition.label} gzip size ${asset.gzipBytes} exceeds budget ${definition.gzipBudgetBytes} (${asset.fileName}).`,
        );
      }
    }
  }

  return {
    ok: failures.length === 0,
    entries,
    failures,
    summary: formatPerformanceBudgetReport(entries, selectedDefinitions),
  };
}

export function formatPerformanceBudgetReport(entries, definitions = createPerformanceBudgetDefinitions()) {
  if (entries.length === 0) return "No matching performance budget assets.";

  const byKey = new Map(definitions.map((definition) => [definition.key, definition]));
  return entries
    .map((entry) => {
      const definition = byKey.get(entry.key);
      return `${entry.label} ${entry.fileName}: raw ${entry.rawBytes} B / ${entry.rawBudgetBytes} B, gzip ${entry.gzipBytes} B / ${entry.gzipBudgetBytes} B${definition?.required ? "" : " optional"}`;
    })
    .join("; ");
}

export function runPerformanceBudgetCli(options = {}) {
  try {
    const result = checkPerformanceBudgets(options);
    if (!result.ok) {
      for (const failure of result.failures) {
        console.error(`Performance budget failed: ${failure}`);
      }
      process.exitCode = 1;
      return result;
    }

    console.log(`Performance budget passed (${result.summary}).`);
    return result;
  } catch (error) {
    console.error(`Performance budget failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return {
      ok: false,
      entries: [],
      failures: [error instanceof Error ? error.message : String(error)],
      summary: "",
    };
  }
}

function readBudget(env, primaryName, fallback, compatibilityName) {
  const value = env[primaryName] ?? (compatibilityName ? env[compatibilityName] : undefined);
  if (value === undefined) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isCliEntrypoint() {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

if (isCliEntrypoint()) {
  runPerformanceBudgetCli();
}

import { gzipSync } from "node:zlib";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ASSET_DIR = join(process.cwd(), "dist", "assets");
const RAW_BUDGET_BYTES = Number(process.env.GRAPH_3D_RAW_BUDGET_BYTES ?? 1_350_000);
const GZIP_BUDGET_BYTES = Number(process.env.GRAPH_3D_GZIP_BUDGET_BYTES ?? 420_000);

if (!existsSync(ASSET_DIR)) {
  fail(`Missing build assets directory: ${ASSET_DIR}. Run pnpm build first.`);
}

const chunks = readdirSync(ASSET_DIR)
  .filter((fileName) => /^vendor-graph-3d[-.].*\.js$/.test(fileName))
  .map((fileName) => {
    const path = join(ASSET_DIR, fileName);
    const rawBytes = statSync(path).size;
    const gzipBytes = gzipSync(readFileSync(path)).byteLength;
    return { fileName, rawBytes, gzipBytes };
  });

if (chunks.length === 0) {
  fail("Graph 3D vendor chunk was not emitted. Three/R3F/d3-force-3d must stay outside the main bundle.");
}

for (const chunk of chunks) {
  if (chunk.rawBytes > RAW_BUDGET_BYTES) {
    fail(`${chunk.fileName} raw size ${chunk.rawBytes} exceeds budget ${RAW_BUDGET_BYTES}.`);
  }
  if (chunk.gzipBytes > GZIP_BUDGET_BYTES) {
    fail(`${chunk.fileName} gzip size ${chunk.gzipBytes} exceeds budget ${GZIP_BUDGET_BYTES}.`);
  }
}

const summary = chunks
  .map((chunk) => `${chunk.fileName}: raw ${chunk.rawBytes} B, gzip ${chunk.gzipBytes} B`)
  .join("; ");
console.log(`Graph performance budget passed (${summary}). Budgets: raw <= ${RAW_BUDGET_BYTES} B, gzip <= ${GZIP_BUDGET_BYTES} B.`);

function fail(message) {
  console.error(`Graph performance budget failed: ${message}`);
  process.exit(1);
}

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkPerformanceBudgets,
  classifyPerformanceAssets,
  createPerformanceBudgetDefinitions,
} from "./check-performance-budgets.mjs";

describe("check-performance-budgets", () => {
  it("classifies the app, search, graph, semantic, and media chunks from Vite assets", async () => {
    const dir = await createFixtureAssets({
      "index-app.js": "a".repeat(90),
      "index-app.css": "b".repeat(30),
      "SearchView-test.js": "s".repeat(70),
      "SearchView-test.css": "t".repeat(35),
      "vendor-graph-3d-test.js": "c".repeat(80),
      "AiPanel-test.js": "d".repeat(40),
      "MediaLibrary-test.js": "e".repeat(25),
    });

    try {
      const categories = classifyPerformanceAssets(dir, createPerformanceBudgetDefinitions());

      expect(categories.mainAppJs.map((asset) => asset.fileName)).toEqual(["index-app.js"]);
      expect(categories.mainCss.map((asset) => asset.fileName)).toEqual(["index-app.css"]);
      expect(categories.searchJs.map((asset) => asset.fileName)).toEqual(["SearchView-test.js"]);
      expect(categories.searchCss.map((asset) => asset.fileName)).toEqual(["SearchView-test.css"]);
      expect(categories.graph3d.map((asset) => asset.fileName)).toEqual(["vendor-graph-3d-test.js"]);
      expect(categories.semantic.map((asset) => asset.fileName)).toEqual(["AiPanel-test.js"]);
      expect(categories.media.map((asset) => asset.fileName)).toEqual(["MediaLibrary-test.js"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("passes when every required chunk is present and below budget", async () => {
    const dir = await createFixtureAssets({
      "index-app.js": "a".repeat(90),
      "index-app.css": "b".repeat(30),
      "SearchView-test.js": "s".repeat(70),
      "SearchView-test.css": "t".repeat(35),
      "vendor-graph-3d-test.js": "c".repeat(80),
      "AiPanel-test.js": "d".repeat(40),
      "MediaLibrary-test.js": "e".repeat(25),
    });

    try {
      const result = checkPerformanceBudgets({
        assetDir: dir,
        definitions: createFixtureBudgets(1_000),
      });

      expect(result.ok).toBe(true);
      expect(result.entries).toHaveLength(7);
      expect(result.summary).toContain("main app JS");
      expect(result.summary).toContain("search page lazy JS");
      expect(result.summary).toContain("search page lazy CSS");
      expect(result.summary).toContain("media lazy chunk");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("fails closed when a required chunk is missing", async () => {
    const dir = await createFixtureAssets({
      "index-app.js": "a".repeat(90),
      "index-app.css": "b".repeat(30),
      "SearchView-test.js": "s".repeat(70),
      "SearchView-test.css": "t".repeat(35),
      "vendor-graph-3d-test.js": "c".repeat(80),
      "AiPanel-test.js": "d".repeat(40),
    });

    try {
      const result = checkPerformanceBudgets({
        assetDir: dir,
        definitions: createFixtureBudgets(1_000),
      });

      expect(result.ok).toBe(false);
      expect(result.failures.join("\n")).toContain("media lazy chunk was not emitted");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("fails closed when either required search page asset is missing", async () => {
    const dir = await createFixtureAssets({
      "index-app.js": "a".repeat(90),
      "index-app.css": "b".repeat(30),
      "vendor-graph-3d-test.js": "c".repeat(80),
      "AiPanel-test.js": "d".repeat(40),
      "MediaLibrary-test.js": "e".repeat(25),
    });

    try {
      const result = checkPerformanceBudgets({
        assetDir: dir,
        definitions: createFixtureBudgets(1_000),
      });

      expect(result.ok).toBe(false);
      expect(result.failures).toContain("search page lazy JS was not emitted.");
      expect(result.failures).toContain("search page lazy CSS was not emitted.");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports raw and gzip budget failures with file names and byte counts", async () => {
    const dir = await createFixtureAssets({
      "index-app.js": "a".repeat(90),
      "index-app.css": "b".repeat(30),
      "SearchView-test.js": "s".repeat(70),
      "SearchView-test.css": "t".repeat(35),
      "vendor-graph-3d-test.js": "c".repeat(80),
      "AiPanel-test.js": "d".repeat(40),
      "MediaLibrary-test.js": "e".repeat(1_500),
    });

    try {
      const result = checkPerformanceBudgets({
        assetDir: dir,
        definitions: createPerformanceBudgetDefinitions().map((definition) => ({
          ...definition,
          rawBudgetBytes: 100,
          gzipBudgetBytes: 10,
        })),
      });

      expect(result.ok).toBe(false);
      expect(result.failures.join("\n")).toContain("MediaLibrary-test.js raw size 1500 exceeds budget 100");
      expect(result.failures.join("\n")).toContain("media lazy chunk gzip size");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

function createFixtureBudgets(maxBytes) {
  return createPerformanceBudgetDefinitions().map((definition) => ({
    ...definition,
    rawBudgetBytes: maxBytes,
    gzipBudgetBytes: maxBytes,
  }));
}

async function createFixtureAssets(files) {
  const dir = await mkdtemp(join(tmpdir(), "chatlogui-perf-budget-"));
  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      writeFile(join(dir, name), content, "utf8"),
    ),
  );
  return dir;
}

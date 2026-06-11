import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const runtimeAllowed = new Set();

async function collectSourceFiles(dir) {
  const files = [];
  const items = await readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...await collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(item.name)) {
      files.push(fullPath.replaceAll("\\", "/"));
    }
  }
  return files;
}

function hasRuntimeL2Import(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => /^\s*import\s/.test(line))
    .some((line) => {
      if (/^\s*import\s+type\s/.test(line)) return false;
      if (!/(["'])(?:@l2|@\/l2-coordinator|.*l2-coordinator)/.test(line)) return false;
      return true;
    });
}

function hasRuntimeStoreImport(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => /^\s*import\s/.test(line))
    .some((line) => {
      if (/^\s*import\s+type\s/.test(line)) return false;
      if (!/(["']).*(?:data-clerk\/stores|use[A-Za-z]+Store)/.test(line)) return false;
      return true;
    });
}

describe("architecture boundary", () => {
  it("keeps runtime L3 orchestration exceptions explicit", async () => {
    const files = await collectSourceFiles("src/l3-molecule");
    const offenders = [];

    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (hasRuntimeL2Import(source) && !runtimeAllowed.has(file)) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps L1 route pages free of persistent store imports", async () => {
    const files = await collectSourceFiles("src/l1-entry/pages");
    const offenders = [];

    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (hasRuntimeStoreImport(source)) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });
});

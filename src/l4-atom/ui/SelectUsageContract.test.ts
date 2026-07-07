import { describe, expect, it } from "vitest";

const sourceFiles = import.meta.glob("/src/**/*.tsx", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

describe("Select usage contract", () => {
  it("keeps business UI from adding raw native select dropdowns", () => {
    const offenders = sourceEntries()
      .filter(({ file }) => file !== "l4-atom/ui/Select.tsx")
      .filter(({ source }) => /<\/?select(?:\s|>)/.test(source))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("keeps selection listboxes behind the shared menu components", () => {
    const allowedSelectionMenus = new Set([
      "l4-atom/ui/Select.tsx",
      "l3-molecule/common/MessageOptionSelect.tsx",
    ]);

    const offenders = sourceEntries()
      .filter(({ file }) => !allowedSelectionMenus.has(file))
      .filter(({ source }) => selectionMenuAttributePattern.test(source))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});

const selectionMenuAttributePattern =
  /(?:role|aria-haspopup)\s*=\s*(?:"(?:listbox|option)"|'(?:listbox|option)'|\{\s*["'](?:listbox|option)["']\s*\})/;

function sourceEntries(): Array<{ file: string; source: string }> {
  return Object.entries(sourceFiles)
    .map(([file, source]) => ({
      file: toSrcRelativePath(file),
      source,
    }))
    .filter(({ file }) => !file.endsWith(".test.tsx"));
}

function toSrcRelativePath(file: string): string {
  return file.replace(/\\/g, "/").replace(/^\/src\//, "");
}

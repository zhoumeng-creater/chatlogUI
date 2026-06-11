import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function collectSourceFiles(dir) {
  const files = [];
  if (!await exists(dir)) return files;

  const items = await readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...await collectSourceFiles(fullPath));
    } else if (/\.(json|md|mjs|rs|ts|tsx)$/.test(item.name)) {
      files.push(fullPath.replaceAll("\\", "/"));
    }
  }

  return files;
}

describe("P3-E browser evidence governance", () => {
  it("keeps P3-C and P3-E privacy diagnostics in the default e2e gate", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    const e2eScript = packageJson.scripts.e2e;

    expect(e2eScript).toContain("e2e/specs/p3c-semantic-discovery.spec.ts");
    expect(e2eScript).toContain("e2e/specs/p3e-privacy-diagnostics.spec.ts");
    expect(await exists("e2e/specs/p3e-privacy-diagnostics.spec.ts")).toBe(true);
  });

  it("keeps semantic and graph redaction markers in the diagnostics fixture", async () => {
    const diagnosticsFixture = JSON.parse(
      await readFile("e2e/fixtures/diagnostics-redaction.json", "utf8"),
    );
    const serialized = JSON.stringify(diagnosticsFixture);

    for (const marker of [
      "Synthetic semantic question for redaction tests only",
      "Synthetic semantic answer for redaction tests only",
      "Synthetic semantic evidence for redaction tests only",
      "Synthetic graph question for redaction tests only",
      "Synthetic graph answer for redaction tests only",
      "Synthetic graph entity for redaction tests only",
      "Synthetic graph ingest content for redaction tests only",
    ]) {
      expect(serialized).toContain(marker);
      expect(diagnosticsFixture.expectedExport.mustNotContain).toContain(marker);
    }
  });

  it("keeps source, docs, and specs on explicit synthetic privacy markers", async () => {
    const forbiddenPatterns = [
      /sk-(?:secret|real|new-glm|new-deepseek)[A-Za-z0-9_-]*/i,
      /wxid_(?!synthetic)(?:[A-Za-z0-9_-]+|\*)/i,
      /C:[\\/]+Users[\\/]+(?!Synthetic\b)[^\s`"')]+/i,
      /WeChat Files[\\/]+(?!wxid_synthetic|Synthetic\b)[^\s`"')]+/i,
      /E:[\\/]+WeChat(?: Files)?[\\/]+(?!wxid_synthetic|Synthetic\b)[^\s`"')]+/i,
    ];

    const offenders = [];
    for (const root of ["src", "src-tauri/src", "scripts", "e2e", "specs", "docs"]) {
      for (const file of await collectSourceFiles(root)) {
        if (file === "scripts/p3e-governance.test.mjs") continue;
        const source = await readFile(file, "utf8");
        const lines = source.split(/\r?\n/);
        lines.forEach((line, index) => {
          if (isAllowedPrivacyPatternReference(file, line)) return;
          const normalizedLine = line.replace(/\\\\/g, "\\");
          for (const pattern of forbiddenPatterns) {
            if (pattern.test(normalizedLine)) {
              offenders.push(`${file}:${index + 1}: ${pattern}`);
            }
          }
        });
      }
    }

    expect(offenders).toEqual([]);
  });
});

function isAllowedPrivacyPatternReference(file, line) {
  if (file === "src/utils/maskSecrets.ts" || file === "src/utils/privacyDisplay.ts") {
    return /wxid_|sk-|Users|wechat files|WeChat Files/i.test(line);
  }

  if (file === "scripts/validate-e2e-fixtures.mjs") {
    return /C:\\\\Users|WeChat Files/.test(line);
  }

  if (file === "scripts/validate-e2e-fixtures.test.mjs") {
    return /SyntheticLeak/.test(line);
  }

  if (file.includes("test-data-policy.md")) {
    return /WeChat ID|wxid_synthetic|C:\\\\Users\\\\Synthetic/.test(line);
  }

  if (file.includes("next-repair-baseline-step-02-privacy-developer-entry-repair-plan.md")) {
    return /rg --pcre2|wxid_\(\?!synthetic\)|wxid_synthetic|\bwxid\b|WeChat ID/.test(line);
  }

  return false;
}

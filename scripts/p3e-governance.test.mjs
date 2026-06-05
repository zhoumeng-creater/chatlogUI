import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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
});

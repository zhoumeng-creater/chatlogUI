import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function readWorkflow(path) {
  return readFile(path, "utf8");
}

describe("release workflow governance", () => {
  it("runs build checks on the repository default branch", async () => {
    const workflow = await readWorkflow(".github/workflows/build-check.yml");

    expect(workflow).toMatch(/push:\s*\n\s*branches:\s*\[[^\]]*\bmaster\b[^\]]*\]/);
    expect(workflow).toMatch(/pull_request:\s*\n\s*branches:\s*\[[^\]]*\bmaster\b[^\]]*\]/);
  });

  it("verifies updater manifests with target-specific platform evidence", async () => {
    const workflow = await readWorkflow(".github/workflows/release.yml");

    for (const platform of ["windows-x86_64", "darwin-x86_64", "darwin-aarch64", "linux-x86_64"]) {
      expect(workflow).toContain(`platform: ${platform}`);
    }
    expect(workflow).toContain("node scripts/verify-updater-manifest.mjs");
    expect(workflow).toContain("--bundle-root src-tauri/target");
    expect(workflow).toContain('--required-platforms "${{ matrix.platform }}"');
  });

  it("pins the Tauri release action to an immutable version tag", async () => {
    const workflow = await readWorkflow(".github/workflows/release.yml");

    expect(workflow).toContain("uses: tauri-apps/tauri-action@action-v0.6.2");
    expect(workflow).not.toContain("uses: tauri-apps/tauri-action@v0\n");
  });
});

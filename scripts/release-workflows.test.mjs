import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function readWorkflow(path) {
  return readFile(path, "utf8");
}

describe("release workflow governance", () => {
  it("declares the pnpm version required by GitHub Actions", async () => {
    const packageJson = JSON.parse(await readWorkflow("package.json"));

    expect(packageJson.packageManager).toBe("pnpm@11.4.0");
  });

  it("uses a Node version compatible with pnpm 11 in CI", async () => {
    const buildCheck = await readWorkflow(".github/workflows/build-check.yml");
    const release = await readWorkflow(".github/workflows/release.yml");

    for (const workflow of [buildCheck, release]) {
      expect(workflow).toContain('node-version: "22.13.0"');
      expect(workflow).not.toContain('node-version: "20"');
    }
  });

  it("keeps local release checks scoped to the Windows x64 first release", async () => {
    const packageJson = JSON.parse(await readWorkflow("package.json"));

    expect(packageJson.scripts["release:check:sidecar:release"]).toContain(
      "--target x86_64-pc-windows-msvc",
    );
    expect(packageJson.scripts["release:check:updater"]).toContain(
      "--required-platforms windows-x86_64",
    );
    expect(packageJson.scripts["release:check:updater"]).not.toContain("darwin-x86_64");
    expect(packageJson.scripts["release:check:updater:all-platforms"]).toContain("darwin-x86_64");
  });

  it("runs build checks on the repository default branch", async () => {
    const workflow = await readWorkflow(".github/workflows/build-check.yml");

    expect(workflow).toMatch(/push:\s*\n\s*branches:\s*\[[^\]]*\bmaster\b[^\]]*\]/);
    expect(workflow).toMatch(/pull_request:\s*\n\s*branches:\s*\[[^\]]*\bmaster\b[^\]]*\]/);
  });

  it("keeps build-check Tauri config JSON quoted across runner shells", async () => {
    const workflow = await readWorkflow(".github/workflows/build-check.yml");

    expect(workflow).toMatch(
      /- name: Tauri Build\s+shell: bash\s+run: pnpm tauri build --target "\$\{\{ matrix\.target \}\}" --config '\{"bundle":\{"createUpdaterArtifacts":false\}\}'/,
    );
  });

  it("verifies updater manifests with target-specific platform evidence", async () => {
    const workflow = await readWorkflow(".github/workflows/release.yml");

    expect(workflow).toContain("target: x86_64-pc-windows-msvc");
    expect(workflow).toContain("platform: windows-x86_64");
    expect(workflow).not.toContain("target: x86_64-apple-darwin");
    expect(workflow).not.toContain("target: aarch64-apple-darwin");
    expect(workflow).not.toContain("target: x86_64-unknown-linux-gnu");
    expect(workflow).toContain("node scripts/verify-updater-manifest.mjs");
    expect(workflow).toContain("gh release download");
    expect(workflow).toContain('output/release-assets/${{ matrix.platform }}/latest.json');
    expect(workflow).toContain('--manifest "output/release-assets/${{ matrix.platform }}/latest.json"');
    expect(workflow).toContain('--artifact-dir "src-tauri/target/${{ matrix.target }}/release/bundle"');
    expect(workflow).toContain('--required-platforms "${{ matrix.platform }}"');
    expect(workflow).toContain("output/release-assets/**");
  });

  it("checks out the owner fork sidecar source at the pinned commit", async () => {
    const workflow = await readWorkflow(".github/workflows/release.yml");

    expect(workflow).toContain("repository: zhoumeng-creater/chatlog_alpha");
    expect(workflow).toContain("ref: 5b979cc666418c41467b1f9959cfdc6b3abbb86b");
    expect(workflow).toContain("path: output/sidecar-source/chatlog_alpha");
    expect(workflow).toContain("SIDECAR_SOURCE_DIR: output/sidecar-source/chatlog_alpha");
  });

  it("pins the Tauri release action to an immutable version tag", async () => {
    const workflow = await readWorkflow(".github/workflows/release.yml");

    expect(workflow).toContain("uses: tauri-apps/tauri-action@action-v0.6.2");
    expect(workflow).not.toContain("uses: tauri-apps/tauri-action@v0\n");
  });
});

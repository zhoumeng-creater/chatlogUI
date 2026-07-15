import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { verifySidecarArtifacts } from "./verify-sidecar-artifacts.mjs";

const cliPath = fileURLToPath(new URL("./verify-sidecar-artifacts.mjs", import.meta.url));
const TEST_SOURCE_PATH = "output/sidecar-source/chatlog_alpha";
const TEST_REPOSITORY = "https://github.com/example/chatlog_alpha";

async function writeJson(path, value) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function createWorkspace(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "sidecar-artifacts-"));
  const manifestPath = join(root, "scripts", "release", "sidecar-artifacts.json");
  const target = "x86_64-pc-windows-msvc";
  const binaryName = "chatlog_alpha-x86_64-pc-windows-msvc.exe";
  const manifest = {
    schemaVersion: 1,
    sidecarName: "chatlog_alpha",
    targets: [
      {
        target,
        platformKey: "windows-x86_64",
        binaryName,
        version: "0.0.0-test",
        releaseAllowed: false,
        checkModeAllowed: true,
        source: { type: "repo", path: "cmd/chatlog", releaseAllowed: false },
        artifact: { path: `src-tauri/binaries/${binaryName}`, sha256: "" },
        ...overrides.entry,
      },
    ],
    ...overrides.manifest,
  };
  await writeJson(manifestPath, manifest);
  return { root, target, binaryName };
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout.trim();
}

async function setManifestSource(root, source) {
  const manifestPath = join(root, "scripts", "release", "sidecar-artifacts.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.targets[0].releaseAllowed = true;
  manifest.targets[0].source = source;
  await writeJson(manifestPath, manifest);
}

async function createApprovedSourceWorkspace({
  sourceOverrides = {},
  rootPackage = true,
  dirty = false,
} = {}) {
  const workspace = await createWorkspace();
  const sourceRoot = join(workspace.root, ...TEST_SOURCE_PATH.split("/"));
  await mkdir(sourceRoot, { recursive: true });
  if (rootPackage) {
    await writeFile(join(sourceRoot, "go.mod"), "module example.invalid/chatlog_alpha\n", "utf8");
    await writeFile(join(sourceRoot, "main.go"), "package main\nfunc main() {}\n", "utf8");
  } else {
    await writeFile(join(sourceRoot, "README.md"), "fixture without a Go root package\n", "utf8");
  }
  runGit(sourceRoot, ["init", "--quiet"]);
  runGit(sourceRoot, ["config", "user.name", "Sidecar Fixture"]);
  runGit(sourceRoot, ["config", "user.email", "sidecar-fixture@example.invalid"]);
  runGit(sourceRoot, ["config", "core.autocrlf", "false"]);
  runGit(sourceRoot, ["add", "."]);
  runGit(sourceRoot, ["commit", "--quiet", "-m", "fixture"]);
  runGit(sourceRoot, ["remote", "add", "origin", TEST_REPOSITORY]);
  const head = runGit(sourceRoot, ["rev-parse", "HEAD"]);
  await setManifestSource(workspace.root, {
    type: "repo",
    repository: TEST_REPOSITORY,
    ref: head,
    path: TEST_SOURCE_PATH,
    root: TEST_SOURCE_PATH,
    releaseAllowed: true,
    ...sourceOverrides,
  });
  if (dirty) {
    await writeFile(join(sourceRoot, "main.go"), "package main\nfunc main() { println(\"dirty\") }\n", "utf8");
  }
  return { ...workspace, sourceRoot, head };
}

describe("verifySidecarArtifacts", () => {
  it("allows check mode to use an explicitly check-only target without release provenance", async () => {
    const { root, target } = await createWorkspace();

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "check", target });

    expect(result.ok).toBe(true);
    expect(result.entries[0]).toMatchObject({
      target,
      sourceKind: "check-placeholder",
      releaseAllowed: false,
    });
    expect(result.warnings.join("\n")).toContain("check-mode placeholder");
  });

  it("fails release mode when a target is check-only", async () => {
    const { root, target } = await createWorkspace();

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "release", target });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("is not allowed for release");
  });

  it("returns a failing process status when JSON output reports verification errors", async () => {
    const { root, target } = await createWorkspace();

    const result = spawnSync(
      process.execPath,
      [cliPath, "--mode", "release", "--target", target, "--json"],
      { cwd: root, encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: false });
  });

  it("accepts release mode only for the exact clean pinned source checkout", async () => {
    const { root, target, head } = await createApprovedSourceWorkspace();

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "release", target });

    expect(result.ok).toBe(true);
    expect(result.entries[0]).toMatchObject({
      sourceKind: "source",
      sourcePath: TEST_SOURCE_PATH,
      sourceRoot: TEST_SOURCE_PATH,
      sourceRepository: TEST_REPOSITORY,
      sourceRef: head,
      sourceHead: head,
      sourceRemote: TEST_REPOSITORY,
      sourceClean: true,
    });
  });

  it("rejects an empty directory presented as approved release source", async () => {
    const { root, target } = await createWorkspace({
      entry: {
        releaseAllowed: true,
        source: {
          type: "repo",
          repository: TEST_REPOSITORY,
          ref: "0".repeat(40),
          path: TEST_SOURCE_PATH,
          root: TEST_SOURCE_PATH,
          releaseAllowed: true,
        },
      },
    });
    await mkdir(join(root, ...TEST_SOURCE_PATH.split("/")), { recursive: true });

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "release", target });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("not a Git checkout");
    expect(result.errors.join("\n")).toContain("go.mod");
    expect(result.errors.join("\n")).toContain("main.go");
  });

  it("rejects a checkout whose HEAD does not equal source.ref", async () => {
    const { root, target } = await createApprovedSourceWorkspace({
      sourceOverrides: { ref: "0".repeat(40) },
    });

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "release", target });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("HEAD does not match source.ref");
  });

  it("rejects a checkout whose origin does not equal source.repository", async () => {
    const { root, target } = await createApprovedSourceWorkspace({
      sourceOverrides: { repository: "https://github.com/other/chatlog_alpha" },
    });

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "release", target });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("origin does not match source.repository");
  });

  it("rejects a dirty pinned checkout", async () => {
    const { root, target } = await createApprovedSourceWorkspace({ dirty: true });

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "release", target });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("working tree is not clean");
  });

  it("rejects a clean checkout without the root Go package", async () => {
    const { root, target } = await createApprovedSourceWorkspace({ rootPackage: false });

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "release", target });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("go.mod");
    expect(result.errors.join("\n")).toContain("main.go");
  });

  it("rejects a manifest source.root that is not the checkout root", async () => {
    const { root, target } = await createApprovedSourceWorkspace({
      sourceOverrides: { root: "output/sidecar-source" },
    });

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "release", target });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("source.root is not the Git checkout root");
  });

  for (const field of ["repository", "ref", "root"]) {
    it(`requires source.${field} for release source provenance`, async () => {
      const { root, target } = await createApprovedSourceWorkspace({
        sourceOverrides: { [field]: "" },
      });

      const result = await verifySidecarArtifacts({ rootDir: root, mode: "release", target });

      expect(result.ok).toBe(false);
      expect(result.errors.join("\n")).toContain(`source.${field} is required`);
    });
  }

  it("fails release mode when an artifact checksum does not match", async () => {
    const expectedBinaryName = "chatlog_alpha-x86_64-pc-windows-msvc.exe";
    const { root, target, binaryName } = await createWorkspace({
      entry: {
        releaseAllowed: true,
        source: { type: "none", path: "", releaseAllowed: false },
        artifact: {
          path: `src-tauri/binaries/${expectedBinaryName}`,
          sha256: sha256("expected artifact"),
        },
      },
    });
    await mkdir(join(root, "src-tauri", "binaries"), { recursive: true });
    await writeFile(join(root, "src-tauri", "binaries", binaryName), "actual artifact", "utf8");

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "release", target });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("checksum mismatch");
  });

  it("allows check-mode placeholders even when they sit at a release artifact path", async () => {
    const expectedBinaryName = "chatlog_alpha-x86_64-pc-windows-msvc.exe";
    const { root, target, binaryName } = await createWorkspace({
      entry: {
        releaseAllowed: true,
        checkModeAllowed: true,
        source: { type: "none", path: "", releaseAllowed: false },
        artifact: {
          path: `src-tauri/binaries/${expectedBinaryName}`,
          sha256: sha256("release artifact"),
        },
      },
    });
    await mkdir(join(root, "src-tauri", "binaries"), { recursive: true });
    await writeFile(join(root, "src-tauri", "binaries", binaryName), "CI placeholder", "utf8");

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "check", target });

    expect(result.ok).toBe(true);
    expect(result.entries[0]).toMatchObject({
      sourceKind: "check-placeholder",
      sha256: sha256("CI placeholder"),
    });
    expect(result.warnings.join("\n")).toContain("check-mode placeholder");
  });

  it("records checksum evidence for a verified release artifact", async () => {
    const artifact = "verified artifact";
    const expectedBinaryName = "chatlog_alpha-x86_64-pc-windows-msvc.exe";
    const { root, target, binaryName } = await createWorkspace({
      entry: {
        releaseAllowed: true,
        source: { type: "none", path: "", releaseAllowed: false },
        artifact: {
          path: `src-tauri/binaries/${expectedBinaryName}`,
          sha256: sha256(artifact),
        },
      },
    });
    await mkdir(join(root, "src-tauri", "binaries"), { recursive: true });
    await writeFile(join(root, "src-tauri", "binaries", binaryName), artifact, "utf8");

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "release", target });

    expect(result.ok).toBe(true);
    expect(result.entries[0]).toMatchObject({
      sourceKind: "artifact",
      sha256: sha256(artifact),
    });
  });

  it("stages a pinned URL artifact when release mode has checksum provenance", async () => {
    const artifact = "downloaded release artifact";
    const target = "x86_64-pc-windows-msvc";
    const binaryName = "chatlog_alpha-x86_64-pc-windows-msvc.exe";
    const { root } = await createWorkspace({
      entry: {
        releaseAllowed: true,
        source: { type: "none", path: "", releaseAllowed: false },
        artifact: {
          path: `src-tauri/binaries/${binaryName}`,
          sha256: sha256(artifact),
          url: `https://example.invalid/releases/${binaryName}`,
        },
      },
    });

    const result = await verifySidecarArtifacts({
      rootDir: root,
      mode: "release",
      target,
      stageDir: "src-tauri/binaries",
      fetchBinary: async () => Buffer.from(artifact),
    });

    expect(result.ok).toBe(true);
    expect(result.entries[0]).toMatchObject({
      sourceKind: "artifact-url",
      artifactPath: `src-tauri/binaries/${binaryName}`,
      sha256: sha256(artifact),
    });
    await expect(readFile(join(root, "src-tauri", "binaries", binaryName), "utf8")).resolves.toBe(artifact);
  });

  it("rejects a downloaded URL artifact when the checksum does not match", async () => {
    const target = "x86_64-pc-windows-msvc";
    const binaryName = "chatlog_alpha-x86_64-pc-windows-msvc.exe";
    const { root } = await createWorkspace({
      entry: {
        releaseAllowed: true,
        source: { type: "none", path: "", releaseAllowed: false },
        artifact: {
          path: `src-tauri/binaries/${binaryName}`,
          sha256: sha256("expected artifact"),
          url: `https://example.invalid/releases/${binaryName}`,
        },
      },
    });

    const result = await verifySidecarArtifacts({
      rootDir: root,
      mode: "release",
      target,
      stageDir: "src-tauri/binaries",
      fetchBinary: async () => Buffer.from("actual artifact"),
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("downloaded artifact checksum mismatch");
  });
});

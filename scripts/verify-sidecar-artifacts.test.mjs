import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { verifySidecarArtifacts } from "./verify-sidecar-artifacts.mjs";

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

  it("accepts release mode when an approved source path exists", async () => {
    const { root, target } = await createWorkspace({
      entry: {
        releaseAllowed: true,
        source: { type: "repo", path: "cmd/chatlog", releaseAllowed: true },
      },
    });
    await mkdir(join(root, "cmd", "chatlog"), { recursive: true });

    const result = await verifySidecarArtifacts({ rootDir: root, mode: "release", target });

    expect(result.ok).toBe(true);
    expect(result.entries[0]).toMatchObject({
      sourceKind: "source",
      sourcePath: "cmd/chatlog",
    });
  });

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

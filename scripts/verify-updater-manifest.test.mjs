import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { verifyUpdaterManifest } from "./verify-updater-manifest.mjs";

async function writeJson(path, value) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createWorkspace(manifest) {
  const root = await mkdtemp(join(tmpdir(), "updater-manifest-"));
  const artifactDir = join(root, "artifacts");
  await mkdir(artifactDir, { recursive: true });
  await writeFile(join(artifactDir, "chatlog_alpha_x64-setup.exe"), "installer", "utf8");
  const manifestPath = join(root, "latest.json");
  await writeJson(manifestPath, manifest);
  return { root, artifactDir, manifestPath };
}

function validManifest(overrides = {}) {
  return {
    version: "0.1.0",
    notes: "Synthetic release notes",
    pub_date: "2026-06-03T00:00:00Z",
    platforms: {
      "windows-x86_64": {
        signature: "signed-update-artifact-content",
        url: "https://github.com/zhoumeng-creater/chatlogUI/releases/download/v0.1.0/chatlog_alpha_x64-setup.exe",
      },
    },
    ...overrides,
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

describe("verifyUpdaterManifest", () => {
  it("accepts a signed Tauri static update manifest with matching local artifact evidence", async () => {
    const { artifactDir, manifestPath } = await createWorkspace(validManifest());

    const result = await verifyUpdaterManifest({
      manifestPath,
      artifactDir,
      requiredPlatforms: ["windows-x86_64"],
    });

    expect(result.ok).toBe(true);
    expect(result.platforms[0]).toMatchObject({
      platform: "windows-x86_64",
      artifactName: "chatlog_alpha_x64-setup.exe",
      signaturePresent: true,
      artifactSha256: sha256("installer"),
    });
    expect(result.manifest.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("discovers a generated latest.json below a Tauri target bundle root", async () => {
    const root = await mkdtemp(join(tmpdir(), "updater-bundle-root-"));
    const bundleDir = join(root, "x86_64-pc-windows-msvc", "release", "bundle");
    const manifestPath = join(bundleDir, "latest.json");
    await mkdir(bundleDir, { recursive: true });
    await writeFile(join(bundleDir, "chatlog_alpha_x64-setup.exe"), "installer", "utf8");
    await writeJson(manifestPath, validManifest());

    const result = await verifyUpdaterManifest({
      bundleRoot: root,
      requiredPlatforms: ["windows-x86_64"],
    });

    expect(result.ok).toBe(true);
    expect(result.manifest.path).toBe(manifestPath);
    expect(result.platforms[0]).toMatchObject({
      platform: "windows-x86_64",
      artifactName: "chatlog_alpha_x64-setup.exe",
      artifactSha256: sha256("installer"),
    });
  });

  it("targeted verification only requires local artifact evidence for requested platforms", async () => {
    const { artifactDir, manifestPath } = await createWorkspace(
      validManifest({
        platforms: {
          "windows-x86_64": {
            signature: "signed-update-artifact-content",
            url: "https://github.com/zhoumeng-creater/chatlogUI/releases/download/v0.1.0/chatlog_alpha_x64-setup.exe",
          },
          "darwin-aarch64": {
            signature: "signed-darwin-update-artifact-content",
            url: "https://github.com/zhoumeng-creater/chatlogUI/releases/download/v0.1.0/chatlog_alpha_aarch64.dmg",
          },
        },
      }),
    );

    const result = await verifyUpdaterManifest({
      manifestPath,
      artifactDir,
      requiredPlatforms: ["windows-x86_64"],
    });

    expect(result.ok).toBe(true);
    expect(result.platforms).toHaveLength(2);
    expect(result.platforms.find((entry) => entry.platform === "darwin-aarch64")).toMatchObject({
      artifactName: "chatlog_alpha_aarch64.dmg",
      artifactPresent: false,
    });
  });

  it("fails when a required platform is missing", async () => {
    const { artifactDir, manifestPath } = await createWorkspace(validManifest());

    const result = await verifyUpdaterManifest({
      manifestPath,
      artifactDir,
      requiredPlatforms: ["windows-x86_64", "darwin-aarch64"],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("missing required platform darwin-aarch64");
  });

  it("fails clearly when a bundle root has no generated latest.json", async () => {
    const root = await mkdtemp(join(tmpdir(), "updater-empty-bundle-root-"));

    const result = await verifyUpdaterManifest({
      bundleRoot: root,
      requiredPlatforms: ["windows-x86_64"],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("no latest.json was found");
    expect(result.errors.join("\n")).not.toContain("manifestPath or bundleRoot is required");
  });

  it("fails when a platform entry has no signature content", async () => {
    const { artifactDir, manifestPath } = await createWorkspace(
      validManifest({
        platforms: {
          "windows-x86_64": {
            signature: "",
            url: "https://github.com/zhoumeng-creater/chatlogUI/releases/download/v0.1.0/chatlog_alpha_x64-setup.exe",
          },
        },
      }),
    );

    const result = await verifyUpdaterManifest({
      manifestPath,
      artifactDir,
      requiredPlatforms: ["windows-x86_64"],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("signature must be non-empty content");
  });

  it("fails when signature points to a .sig file instead of embedding signature content", async () => {
    const { artifactDir, manifestPath } = await createWorkspace(
      validManifest({
        platforms: {
          "windows-x86_64": {
            signature: "chatlog_alpha_x64-setup.exe.sig",
            url: "https://github.com/zhoumeng-creater/chatlogUI/releases/download/v0.1.0/chatlog_alpha_x64-setup.exe",
          },
        },
      }),
    );

    const result = await verifyUpdaterManifest({
      manifestPath,
      artifactDir,
      requiredPlatforms: ["windows-x86_64"],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("signature must be embedded content");
  });

  it("fails when the manifest URL does not match an artifact in the evidence directory", async () => {
    const { artifactDir, manifestPath } = await createWorkspace(
      validManifest({
        platforms: {
          "windows-x86_64": {
            signature: "signed-update-artifact-content",
            url: "https://github.com/zhoumeng-creater/chatlogUI/releases/download/v0.1.0/missing.exe",
          },
        },
      }),
    );

    const result = await verifyUpdaterManifest({
      manifestPath,
      artifactDir,
      requiredPlatforms: ["windows-x86_64"],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("artifact missing.exe was not found");
  });
});

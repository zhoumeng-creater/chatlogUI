import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  collectInstallerArtifacts,
  scanForbiddenSmokeText,
  scanSmokeFile,
} from "./collect-tauri-smoke-evidence.mjs";

async function withTempWorkspace(run) {
  const rootDir = await mkdtemp(join(tmpdir(), "chatlogui-smoke-evidence-"));
  try {
    return await run(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

describe("Step 11 Tauri smoke evidence helper", () => {
  it("collects MSI and NSIS artifacts with safe relative paths and checksums", async () => {
    await withTempWorkspace(async (rootDir) => {
      const msiPayload = Buffer.from("synthetic-msi");
      const nsisPayload = Buffer.from("synthetic-nsis");
      await mkdir(join(rootDir, "bundle", "msi"), { recursive: true });
      await mkdir(join(rootDir, "bundle", "nsis"), { recursive: true });
      await writeFile(join(rootDir, "bundle", "msi", "chatlog_alpha_0.1.0_x64_zh-CN.msi"), msiPayload);
      await writeFile(join(rootDir, "bundle", "nsis", "chatlog_alpha_0.1.0_x64-setup.exe"), nsisPayload);

      const result = await collectInstallerArtifacts({
        rootDir,
        bundleRoot: "bundle",
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.artifacts).toEqual([
        expect.objectContaining({
          kind: "msi",
          path: "bundle/msi/chatlog_alpha_0.1.0_x64_zh-CN.msi",
          name: "chatlog_alpha_0.1.0_x64_zh-CN.msi",
          bytes: msiPayload.length,
          sha256: sha256(msiPayload),
        }),
        expect.objectContaining({
          kind: "nsis",
          path: "bundle/nsis/chatlog_alpha_0.1.0_x64-setup.exe",
          name: "chatlog_alpha_0.1.0_x64-setup.exe",
          bytes: nsisPayload.length,
          sha256: sha256(nsisPayload),
        }),
      ]);
      expect(JSON.stringify(result.artifacts)).not.toContain(rootDir.replaceAll("\\", "\\\\"));
    });
  });

  it("fails explicitly when no Windows installer artifacts are present", async () => {
    await withTempWorkspace(async (rootDir) => {
      await mkdir(join(rootDir, "bundle"), { recursive: true });

      const result = await collectInstallerArtifacts({
        rootDir,
        bundleRoot: "bundle",
      });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain("bundle: no Windows MSI or NSIS installer artifacts found");
      expect(result.artifacts).toEqual([]);
    });
  });

  it("flags packaged diagnostics text that still contains private markers", () => {
    const findings = scanForbiddenSmokeText(
      [
        "dataKey=synthetic-raw-value",
        "apiKey=sk-synthetic-raw-value",
        "token=synthetic-token",
        "C:\\Users\\Synthetic\\Documents\\chatlog",
        "wxid_synthetic_raw",
        "private message: Synthetic raw body",
      ].join("\n"),
    );

    expect(findings.map((finding) => finding.label)).toEqual([
      "raw data key",
      "raw api key",
      "raw token",
      "Windows user path",
      "WeChat profile id",
      "private message marker",
    ]);
    expect(findings[0]).toEqual(expect.objectContaining({ line: 1 }));
  });

  it("accepts redacted packaged diagnostics summaries", () => {
    const findings = scanForbiddenSmokeText(
      [
        "Redaction status: passed",
        "Data key: [redacted]",
        "Artifact: chatlog_alpha_diagnostics.log",
        "Path summary: diagnostics directory",
      ].join("\n"),
    );

    expect(findings).toEqual([]);
  });

  it("does not echo full local paths when a diagnostics scan file is missing", async () => {
    await withTempWorkspace(async (rootDir) => {
      const missingPath = join(rootDir, "missing-diagnostics.log");

      const result = await scanSmokeFile({ scanFile: missingPath });

      expect(result.ok).toBe(false);
      expect(result.file).toBe("missing-diagnostics.log");
      expect(result.errors.join("\n")).not.toContain(rootDir);
      expect(result.errors).toContain("scan file was not found");
    });
  });

  it("exposes Step 11 smoke evidence scripts through package.json", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));

    expect(packageJson.scripts["release:collect:tauri-smoke"]).toContain(
      "scripts/collect-tauri-smoke-evidence.mjs",
    );
    expect(packageJson.scripts["release:scan:diagnostics"]).toContain("--scan-file");
  });
});

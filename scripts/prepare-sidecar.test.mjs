import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const prepareSidecarPath = fileURLToPath(
  new URL("../.github/scripts/prepare-sidecar.sh", import.meta.url),
);

async function writeExecutable(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
  await chmod(path, 0o755);
}

describe("prepare-sidecar release helper", () => {
  it("builds the checked-out backend root package into the target binary", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "prepare-sidecar-"));
    try {
      const scriptPath = join(rootDir, ".github", "scripts", "prepare-sidecar.sh");
      await mkdir(dirname(scriptPath), { recursive: true });
      await writeFile(scriptPath, await readFile(prepareSidecarPath, "utf8"), "utf8");
      await writeFile(join(rootDir, "go.mod"), "module example.invalid/chatlog\n", "utf8");
      await writeFile(join(rootDir, "main.go"), "package main\nfunc main() {}\n", "utf8");
      await writeExecutable(
        join(rootDir, "fake-node.sh"),
        "#!/usr/bin/env bash\nexit 0\n",
      );
      await writeExecutable(
        join(rootDir, "fake-go.sh"),
        [
          "#!/usr/bin/env bash",
          "set -euo pipefail",
          'printf \'%s\\n\' "$@" > go-args.txt',
          'while [[ "$#" -gt 0 ]]; do',
          '  if [[ "$1" == "-o" ]]; then shift; output="$1"; fi',
          "  shift",
          "done",
          'printf \'root-package-sidecar\\n\' > "$output"',
          "",
        ].join("\n"),
      );

      const result = spawnSync(
        "bash",
        [
          "-lc",
          "NODE_BIN=./fake-node.sh GO_BIN=./fake-go.sh bash .github/scripts/prepare-sidecar.sh x86_64-pc-windows-msvc check",
        ],
        {
          cwd: rootDir,
          encoding: "utf8",
          env: process.env,
        },
      );

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      await expect(
        readFile(
          join(
            rootDir,
            "src-tauri",
            "binaries",
            "chatlog_alpha-x86_64-pc-windows-msvc.exe",
          ),
          "utf8",
        ),
      ).resolves.toBe("root-package-sidecar\n");
      expect((await readFile(join(rootDir, "go-args.txt"), "utf8")).trimEnd()).toMatch(
        /(?:^|\n)\.$/,
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    }
  }, 30_000);

  it("builds the root package from the source path authenticated by the release verifier", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "prepare-sidecar-release-"));
    try {
      const scriptPath = join(rootDir, ".github", "scripts", "prepare-sidecar.sh");
      await mkdir(dirname(scriptPath), { recursive: true });
      await writeFile(scriptPath, await readFile(prepareSidecarPath, "utf8"), "utf8");
      const approvedSource = join(rootDir, "approved-source");
      await mkdir(approvedSource, { recursive: true });
      await writeFile(join(approvedSource, "go.mod"), "module example.invalid/chatlog\n", "utf8");
      await writeFile(join(approvedSource, "main.go"), "package main\nfunc main() {}\n", "utf8");
      await writeExecutable(
        join(rootDir, "fake-node.sh"),
        [
          "#!/usr/bin/env bash",
          'if [[ "${1:-}" == "-e" ]]; then cat >/dev/null; if [[ "$2" == *sourceKind* ]]; then printf source; else printf approved-source; fi; exit 0; fi',
          "cat <<'JSON'",
          '{"ok":true,"errors":[],"warnings":[],"entries":[{"target":"x86_64-pc-windows-msvc","sourceKind":"source","sourcePath":"approved-source"}]}',
          "JSON",
          "",
        ].join("\n"),
      );
      await writeExecutable(
        join(rootDir, "fake-go.sh"),
        [
          "#!/usr/bin/env bash",
          "set -euo pipefail",
          'printf \'%s\\n\' "$@" > "$REPO_ROOT/go-args.txt"',
          'while [[ "$#" -gt 0 ]]; do',
          '  if [[ "$1" == "-o" ]]; then shift; output="$1"; fi',
          "  shift",
          "done",
          'basename "$PWD" > "$output"',
          "",
        ].join("\n"),
      );

      const result = spawnSync(
        "bash",
        [
          "-lc",
          'REPO_ROOT="$PWD" NODE_BIN="$PWD/fake-node.sh" GO_BIN="$PWD/fake-go.sh" bash .github/scripts/prepare-sidecar.sh x86_64-pc-windows-msvc release',
        ],
        { cwd: rootDir, encoding: "utf8", env: process.env },
      );

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      await expect(
        readFile(
          join(rootDir, "src-tauri", "binaries", "chatlog_alpha-x86_64-pc-windows-msvc.exe"),
          "utf8",
        ),
      ).resolves.toBe("approved-source\n");
      expect((await readFile(join(rootDir, "go-args.txt"), "utf8")).trimEnd()).toMatch(
        /(?:^|\n)\.$/,
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    }
  }, 30_000);

  it("refuses a release source override that differs from the verifier evidence", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "prepare-sidecar-override-"));
    try {
      const scriptPath = join(rootDir, ".github", "scripts", "prepare-sidecar.sh");
      await mkdir(dirname(scriptPath), { recursive: true });
      await writeFile(scriptPath, await readFile(prepareSidecarPath, "utf8"), "utf8");
      for (const source of ["approved-source", "unapproved-source"]) {
        const sourceRoot = join(rootDir, source);
        await mkdir(sourceRoot, { recursive: true });
        await writeFile(join(sourceRoot, "go.mod"), "module example.invalid/chatlog\n", "utf8");
        await writeFile(join(sourceRoot, "main.go"), "package main\nfunc main() {}\n", "utf8");
      }
      await writeExecutable(
        join(rootDir, "fake-node.sh"),
        [
          "#!/usr/bin/env bash",
          'if [[ "${1:-}" == "-e" ]]; then cat >/dev/null; if [[ "$2" == *sourceKind* ]]; then printf source; else printf approved-source; fi; exit 0; fi',
          "cat <<'JSON'",
          '{"ok":true,"errors":[],"warnings":[],"entries":[{"target":"x86_64-pc-windows-msvc","sourceKind":"source","sourcePath":"approved-source"}]}',
          "JSON",
          "",
        ].join("\n"),
      );
      await writeExecutable(
        join(rootDir, "fake-go.sh"),
        [
          "#!/usr/bin/env bash",
          "set -euo pipefail",
          'touch "$REPO_ROOT/go-called"',
          'while [[ "$#" -gt 0 ]]; do',
          '  if [[ "$1" == "-o" ]]; then shift; output="$1"; fi',
          "  shift",
          "done",
          'printf \'unapproved-sidecar\\n\' > "$output"',
          "",
        ].join("\n"),
      );

      const result = spawnSync(
        "bash",
        [
          "-lc",
          'REPO_ROOT="$PWD" SIDECAR_SOURCE_DIR=unapproved-source NODE_BIN="$PWD/fake-node.sh" GO_BIN="$PWD/fake-go.sh" bash .github/scripts/prepare-sidecar.sh x86_64-pc-windows-msvc release',
        ],
        { cwd: rootDir, encoding: "utf8", env: process.env },
      );

      expect(result.status).toBe(1);
      expect(`${result.stdout}\n${result.stderr}`).toContain(
        "SIDECAR_SOURCE_DIR does not match the verified release source",
      );
      await expect(readFile(join(rootDir, "go-called"), "utf8")).rejects.toThrow();
    } finally {
      await rm(rootDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    }
  }, 30_000);
});

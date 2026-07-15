# Sidecar Artifact Provenance

This document is the human-readable companion for `scripts/release/sidecar-artifacts.json`.

## Current Policy

Release packaging must not rely on ignored local files by default. A sidecar target is release-eligible only when the structured manifest marks it `releaseAllowed: true` and one of these is true:

- `source.releaseAllowed` is true and `source.path` is the root package of the exact clean Git checkout declared by `source.root`: `go.mod` and `main.go` exist, `HEAD` equals the full `source.ref`, the configured `origin` matches `source.repository`, and `git status --porcelain --untracked-files=all` is empty.
- `artifact.path` exists, is non-empty, and its SHA-256 matches the manifest.
- `artifact.url` is an HTTPS URL whose basename matches `binaryName`, the manifest supplies SHA-256, and release preparation stages the downloaded artifact into `src-tauri/binaries` after checksum verification.

Check-mode placeholders are allowed only for packaging compile checks. They are not release evidence.
An ignored local binary whose manifest `artifact.sha256` is empty is also not release evidence, even when check mode can inspect it.

## Release Candidate Provenance Strategy

- Strategy: `pinned-clean-ci-source-or-checksum-artifact`
- Owner: release operator and project owner
- Status date: 2026-07-15
- Declared Windows x64 source pin: `https://github.com/zhoumeng-creater/chatlog_alpha` at `be771738055a3cd65f62f167bd4534f5c843444c`
- Declared checkout/root package path: `output/sidecar-source/chatlog_alpha`
- Targets currently covered by release evidence: none
- Targets excluded: macOS Intel, macOS Apple Silicon, Linux x64
- Rationale: the manifest and release workflow now agree on the `be771...` pin and root-package build, but the required checkout is not present and the current environment cannot obtain and independently confirm that remote checkout. The local Windows binary is ignored and has no manifest SHA-256. Therefore neither the declared remote source nor the local binary has passed release provenance here.

## Current Release Blocker

`pnpm release:check:sidecar:release` is intentionally **BLOCKED** in the current checkout. On 2026-07-15 it failed because:

- `source.path` does not exist;
- `source.root` is not an available Git checkout;
- the local artifact has no SHA-256 in the manifest; and
- no approved source checkout or checksum-verified artifact is available.

The configured remote/ref must not be described as verified until a release runner has a clean checkout at the declared path and the verifier confirms its checkout root, `origin`, `HEAD`, clean state, `go.mod`, and `main.go`. Remote retrieval is unavailable in the current environment, so this remains an explicit release blocker. Do not substitute another local checkout or `SIDECAR_SOURCE_DIR`; release preparation binds its build input to the verifier evidence.

## Current Inventory

| Target | Binary | Current state | Release state |
| --- | --- | --- | --- |
| `x86_64-pc-windows-msvc` | `chatlog_alpha-x86_64-pc-windows-msvc.exe` | Manifest pins `be771...`; required checkout absent; ignored local binary detected but `artifact.sha256` is empty | **Blocked**: no authenticated checkout and no checksum artifact |
| `x86_64-apple-darwin` | `chatlog_alpha-x86_64-apple-darwin` | Missing locally; check-mode placeholder allowed | Blocked |
| `aarch64-apple-darwin` | `chatlog_alpha-aarch64-apple-darwin` | Missing locally; check-mode placeholder allowed | Blocked |
| `x86_64-unknown-linux-gnu` | `chatlog_alpha-x86_64-unknown-linux-gnu` | Missing locally; check-mode placeholder allowed | Blocked |

## Commands

```powershell
pnpm release:check:sidecar
pnpm release:check:sidecar:release
node scripts/verify-sidecar-artifacts.mjs --target x86_64-pc-windows-msvc --mode release --stage-dir src-tauri/binaries
```

`release:check:sidecar` passed on 2026-07-15 because check mode may inspect the unpinned Windows binary and allows placeholders for the other targets; it emitted warnings and is not release evidence. `release:check:sidecar:release` is scoped to Windows x64 in `package.json` and currently fails for the blocker above. `release:check:sidecar:release:all-targets` is also blocked.

## Updating Provenance

When `chatlog_alpha` changes:

1. Decide whether CI builds it from source or consumes a pinned artifact.
2. For a source build, update and verify `repository`, full commit `ref`, checkout `root`, root-package `path`, and `releaseAllowed`; for an artifact, record its path/HTTPS URL and SHA-256.
3. Run `pnpm release:check:sidecar:release`.
4. Record the accepted checksums in `docs/release/release-evidence.md`.
5. Keep updater, installer, and sidecar checksums in the same release evidence bundle.

URL-based release artifacts must be pinned with SHA-256 before `releaseAllowed` is set. The verifier refuses non-HTTPS URLs, basename mismatches, empty downloads, and checksum mismatches. Check-only targets are not downloaded.

Do not paste private local paths, signing keys, updater private keys, tokens, or real chat data into provenance records.

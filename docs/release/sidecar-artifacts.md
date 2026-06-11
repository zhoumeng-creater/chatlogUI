# Sidecar Artifact Provenance

This document is the human-readable companion for `scripts/release/sidecar-artifacts.json`.

## Current Policy

Release packaging must not rely on ignored local files by default. A sidecar target is release-eligible only when the structured manifest marks it `releaseAllowed: true` and one of these is true:

- `source.path` exists in CI and `source.releaseAllowed` is true.
- `artifact.path` exists, is non-empty, and its SHA-256 matches the manifest.
- `artifact.url` is an HTTPS URL whose basename matches `binaryName`, the manifest supplies SHA-256, and release preparation stages the downloaded artifact into `src-tauri/binaries` after checksum verification.

Check-mode placeholders are allowed only for packaging compile checks. They are not release evidence.

## Release Candidate Provenance Strategy

- Strategy: `windows-checksum-artifact-plus-pinned-ci-source`
- Owner: release operator and project owner
- Date: 2026-06-11
- Sidecar source/release: Windows x64 uses `github.com/zhoumeng-creater/chatlog_alpha@5b979cc666418c41467b1f9959cfdc6b3abbb86b`
- Targets covered: Windows x64 release mode
- Targets excluded: macOS Intel, macOS Apple Silicon, Linux x64
- Rationale: the current manifest marks the Windows x64 target `releaseAllowed: true`, pins the owner fork source ref for CI, and records a local checksum-verified Windows artifact. Non-Windows targets remain check-mode placeholders only and are not release evidence.

## Current Inventory

| Target | Binary | Current state | Release state |
| --- | --- | --- | --- |
| `x86_64-pc-windows-msvc` | `chatlog_alpha-x86_64-pc-windows-msvc.exe` | Local ignored binary present; SHA-256 `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af`; CI source ref pinned | Release-mode check passed for Windows x64 on 2026-06-11 |
| `x86_64-apple-darwin` | `chatlog_alpha-x86_64-apple-darwin` | Missing locally; check-mode placeholder allowed | Blocked |
| `aarch64-apple-darwin` | `chatlog_alpha-aarch64-apple-darwin` | Missing locally; check-mode placeholder allowed | Blocked |
| `x86_64-unknown-linux-gnu` | `chatlog_alpha-x86_64-unknown-linux-gnu` | Missing locally; check-mode placeholder allowed | Blocked |

## Commands

```powershell
pnpm release:check:sidecar
pnpm release:check:sidecar:release
node scripts/verify-sidecar-artifacts.mjs --target x86_64-pc-windows-msvc --mode release --stage-dir src-tauri/binaries
```

`release:check:sidecar` is expected to pass in the current repository because check-mode placeholders are allowed for non-release targets. `release:check:sidecar:release` is scoped to Windows x64 in `package.json` and passed on 2026-06-11. `release:check:sidecar:release:all-targets` remains blocked until non-Windows provenance exists.

## Updating Provenance

When `chatlog_alpha` changes:

1. Decide whether CI builds it from source or consumes a pinned artifact.
2. Update `scripts/release/sidecar-artifacts.json` with version, target, source path or artifact path/URL, checksum, and `releaseAllowed`.
3. Run `pnpm release:check:sidecar:release`.
4. Record the accepted checksums in `specs/001-ready-desktop-app/release-evidence.md`.
5. Keep updater, installer, and sidecar checksums in the same release evidence bundle.

URL-based release artifacts must be pinned with SHA-256 before `releaseAllowed` is set. The verifier refuses non-HTTPS URLs, basename mismatches, empty downloads, and checksum mismatches. Check-only targets are not downloaded.

Do not paste private local paths, signing keys, updater private keys, tokens, or real chat data into provenance records.

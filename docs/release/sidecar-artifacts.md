# Sidecar Artifact Provenance

This document is the human-readable companion for `scripts/release/sidecar-artifacts.json`.

## Current Policy

Release packaging must not rely on ignored local files by default. A sidecar target is release-eligible only when the structured manifest marks it `releaseAllowed: true` and one of these is true:

- `source.path` exists in CI and `source.releaseAllowed` is true.
- `artifact.path` exists, is non-empty, and its SHA-256 matches the manifest.
- `artifact.url` is an HTTPS URL whose basename matches `binaryName`, the manifest supplies SHA-256, and release preparation stages the downloaded artifact into `src-tauri/binaries` after checksum verification.

Check-mode placeholders are allowed only for packaging compile checks. They are not release evidence.

## Release Candidate Provenance Strategy

- Strategy: `pending-owner-decision`
- Owner: release operator and project owner
- Date: 2026-06-03
- Sidecar source/release: not yet approved for a concrete release candidate
- Targets covered: none for release mode
- Targets excluded: Windows x64, macOS Intel, macOS Apple Silicon, Linux x64
- Rationale: the repository still has no auditable `cmd/chatlog` source path and no approved pinned HTTPS/private CI artifacts. The existing Windows binary remains local inventory only; `releaseAllowed` must stay `false` until the project owner approves source or checksum artifact provenance.

## Current Inventory

| Target | Binary | Current state | Release state |
| --- | --- | --- | --- |
| `x86_64-pc-windows-msvc` | `chatlog_alpha-x86_64-pc-windows-msvc.exe` | Local ignored binary present; SHA-256 `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af` | Blocked until provenance is approved |
| `x86_64-apple-darwin` | `chatlog_alpha-x86_64-apple-darwin` | Missing locally; check-mode placeholder allowed | Blocked |
| `aarch64-apple-darwin` | `chatlog_alpha-aarch64-apple-darwin` | Missing locally; check-mode placeholder allowed | Blocked |
| `x86_64-unknown-linux-gnu` | `chatlog_alpha-x86_64-unknown-linux-gnu` | Missing locally; check-mode placeholder allowed | Blocked |

## Commands

```powershell
pnpm release:check:sidecar
pnpm release:check:sidecar:release
node scripts/verify-sidecar-artifacts.mjs --target x86_64-pc-windows-msvc --mode release --stage-dir src-tauri/binaries
```

`release:check:sidecar` is expected to pass in the current repository because check-mode placeholders are allowed. `release:check:sidecar:release` is expected to fail until the project owner chooses a sidecar source or artifact provenance strategy.

## Updating Provenance

When `chatlog_alpha` changes:

1. Decide whether CI builds it from source or consumes a pinned artifact.
2. Update `scripts/release/sidecar-artifacts.json` with version, target, source path or artifact path/URL, checksum, and `releaseAllowed`.
3. Run `pnpm release:check:sidecar:release`.
4. Record the accepted checksums in `specs/001-ready-desktop-app/release-evidence.md`.
5. Keep updater, installer, and sidecar checksums in the same release evidence bundle.

URL-based release artifacts must be pinned with SHA-256 before `releaseAllowed` is set. The verifier refuses non-HTTPS URLs, basename mismatches, empty downloads, and checksum mismatches. Check-only targets are not downloaded.

Do not paste private local paths, signing keys, updater private keys, tokens, or real chat data into provenance records.

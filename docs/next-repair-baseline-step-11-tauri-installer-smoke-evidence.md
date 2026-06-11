# Step 11 Tauri / Installer Smoke Evidence

This file records the current Step 11 execution for
`codex/next-repair-baseline`. It is evidence for commands that actually ran in
this session. It does not claim installer UI, packaged unknown-port UI, packaged
diagnostics export, updater signing, or owner signoff passed unless the row says
so explicitly.

## Candidate

| Field | Value |
| --- | --- |
| Date | 2026-06-12 Asia/Shanghai |
| Branch | `codex/next-repair-baseline` |
| Runtime baseline commit | `8343ac28f3577dca38a5fbdd3f00aa06a26323c9`; follow-up changes after this point are release docs/tooling only and do not alter `src/` or `src-tauri/` runtime code. |
| Final release freeze | Required before manual installer smoke: record `git rev-parse HEAD` and fresh artifact hashes after the last build. |
| App version | `0.1.0` |
| Tauri product/version | `chatlog_alpha` / `0.1.0` |
| Windows environment | Microsoft Windows 11 Pro, version `10.0.26200`, x64 |
| Operator | Codex |
| Signing environment | `TAURI_SIGNING_PRIVATE_KEY` unset; `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` unset |

## Evidence Tooling Added

| Tool | Status | Purpose |
| --- | --- | --- |
| `scripts/collect-tauri-smoke-evidence.mjs` | Added | Collects Windows MSI/NSIS artifact basenames, safe relative paths, sizes, SHA-256 hashes, and modification times without recording full local user paths. |
| `pnpm release:collect:tauri-smoke` | Added | Runs the artifact inventory helper against `src-tauri/target/release/bundle`. |
| `pnpm release:scan:diagnostics -- <file>` | Hardened | Scans a packaged diagnostics text artifact for forbidden raw markers such as raw data keys, API keys, tokens, `Authorization: Bearer ...`, JSON-shaped private fields, absolute Windows paths, WeChat profile identifiers, and private-message labels. |
| `scripts/collect-tauri-smoke-evidence.test.mjs` | Passed | Focused TDD coverage for artifact inventory, no-artifact failure, diagnostics forbidden-marker scanning, JSON-shaped leakage, absolute-path leakage, redacted diagnostics acceptance, missing scan-file path privacy, and package script exposure. |

## Command Evidence

| Command or check | Result | Evidence |
| --- | --- | --- |
| `pnpm exec vitest run scripts/collect-tauri-smoke-evidence.test.mjs` | Passed | 1 file / 8 tests passed after red/green TDD. |
| `pnpm verify` | Passed | Lint, typecheck, 169 Vitest files / 710 tests, and production build passed. |
| `cargo test` in `src-tauri` | Passed | 22 Rust tests passed, including sidecar ownership, unknown process classification, config redaction, and diagnostics redaction. |
| `pnpm tauri build` | Passed | Current Windows x64 MSI and NSIS bundles were rebuilt. |
| `pnpm release:collect:tauri-smoke -- --json` | Passed | Current MSI/NSIS bundle inventory and SHA-256 hashes collected after the build. |
| `pnpm release:check:sidecar:release -- --json` | Passed | Windows x64 sidecar artifact verified with SHA-256 `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af`. |
| `pnpm release:check:updater -- --json` | Failed as release blocker | No `latest.json` was found under `src-tauri/target`. Signing env vars are unset, so signed updater metadata cannot be generated locally in this run. |

## Artifact Inventory

| Artifact | Kind | Size | SHA-256 |
| --- | --- | ---: | --- |
| `src-tauri/target/release/bundle/msi/chatlog_alpha_0.1.0_x64_zh-CN.msi` | MSI | 31,510,528 bytes | `7b681a56c0fc0c148226a9eda81c43f8a5212a1fac94a3e3d7aaf34df26bdab9` |
| `src-tauri/target/release/bundle/nsis/chatlog_alpha_0.1.0_x64-setup.exe` | NSIS | 22,518,868 bytes | `27561afc14541a0b09e4a01f96ae79d54c77bd83948c4ba150fd2ec9d863deff` |
| `src-tauri/binaries/chatlog_alpha-x86_64-pc-windows-msvc.exe` | Sidecar | release artifact | `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af` |

## Step 11 Smoke Matrix

| Smoke item | Current status | Evidence or blocker |
| --- | --- | --- |
| Candidate identity | Partial | Branch, runtime baseline, app version, platform, operator, current artifact hashes, and sidecar checksum are recorded above. A final release freeze still needs exact HEAD and fresh hashes after the last build/manual smoke. |
| Source/UI gate | Passed | `pnpm verify` passed in this Step 11 run. |
| Rust/Tauri unit gate | Passed | `cargo test` passed in this Step 11 run. |
| Package build | Passed | `pnpm tauri build` rebuilt Windows x64 MSI and NSIS bundles. |
| Sidecar provenance | Passed for Windows x64 | `release:check:sidecar:release` passed for the scoped target. |
| Updater metadata | `release-blocked` | No generated signed `latest.json` exists under `src-tauri/target`; local signing environment is absent. |
| Installer install/open/quit/reopen/uninstall | `needs-manual-smoke` | This session did not complete a controlled installed-app UI smoke. No install/uninstall pass is claimed. |
| Packaged unknown-port UI smoke | `needs-manual-smoke` | Rust/source tests cover unknown-process classification, but this run did not operate the installed packaged UI while a smoke-owned unknown listener occupied `127.0.0.1:5030`. |
| Packaged diagnostics export review | `needs-manual-smoke` | Source/Rust/UI redaction and the new diagnostics scanner are available, but no current installed-app diagnostics export file was produced and scanned in this run. |
| Owner signoff | `release-blocked` | No release owner signoff was recorded. |

## Decision

| Scope | Decision | Reason |
| --- | --- | --- |
| Source, Rust, package build, and sidecar provenance | `PASS` | Fresh Step 11 commands passed and current artifacts are inventoried with SHA-256 evidence. |
| Windows x64 release candidate | `BLOCKED` | Updater metadata, installer-level smoke, packaged unknown-port UI smoke, packaged diagnostics export review, and owner signoff remain incomplete. |
| macOS/Linux release readiness | `platform-caveat` | No platform-specific sidecar provenance, signing/notarization, package build, or runtime smoke evidence was supplied in this run. |

## Privacy Notes

- The new artifact inventory records safe relative paths, basenames, sizes, and
  hashes, not full local user paths.
- The new diagnostics scanner reports marker labels and line numbers only; it
  does not echo the sensitive matched text.
- The diagnostics scanner now catches JSON-shaped secret/private-content fields,
  `Authorization: Bearer ...`, and absolute Windows paths, not only simple
  `key=value` lines.
- No Tauri CSP, capabilities, sidecar launch arguments, or backend API contracts
  were changed for this Step 11 execution.
- No `.env`, logs, local chat data, screenshots, sidecar binaries, `dist/`, or
  `src-tauri/target/` files are intended for commit.

## Remaining Closure Work

1. Run the current NSIS or MSI installer in a controlled Windows smoke account:
   install, launch without terminal, quit, reopen, and uninstall or document
   cleanup policy.
2. Before that manual smoke, freeze the final candidate again with
   `git rev-parse HEAD`, rerun `pnpm tauri build`, rerun
   `pnpm release:collect:tauri-smoke -- --json`, and update this file with the
   final artifact hashes.
3. In the installed app, trigger managed service start and confirm `/health`,
   close cleanup, and no residual app-managed `5030` listener.
4. Occupy `127.0.0.1:5030` with a smoke-owned unknown listener, start the
   installed app, verify recoverable conflict UI, verify listener survival, then
   stop the listener and retry.
5. Export diagnostics from the installed app, run
   `pnpm release:scan:diagnostics -- <diagnostics-file>`, and record the safe
   result without pasting private paths or contents.
6. Generate signed updater artifacts through the release workflow or a local
   signer environment, then rerun `pnpm release:check:updater -- --json`; if the
   candidate intentionally disables updater, record an owner-approved
   updater-disabled policy instead.
7. Obtain release owner signoff after the required smoke items close.

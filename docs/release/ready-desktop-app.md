# Ready Desktop App Release Runbook

Canonical evidence lives in `specs/001-ready-desktop-app/release-evidence.md`.

Related P5-C/D governance:

- `docs/release/sidecar-artifacts.md`
- `docs/release/release-governance.md`
- `docs/release/privacy-audit.md`
- `specs/002-advanced-capabilities/acceptance-checklist.md`

## Required Commands

```powershell
pnpm verify
Push-Location src-tauri; cargo test; Pop-Location
pnpm tauri build
pnpm release:check:sidecar:release
pnpm release:check:updater
```

## Manual Smoke

- Install or open the Windows x64 app artifact.
- Launch without a terminal and confirm setup or workbench is reachable.
- Confirm `chatlog_alpha` health at `http://127.0.0.1:5030/health`.
- Quit the app and verify the app-managed sidecar is cleaned up.
- Reopen the app and confirm state restoration.
- Test an unknown process already occupying `5030`.
- Capture only redacted screenshots and logs.

## Current Status

- `pnpm verify`, `cargo test`, and `pnpm tauri build` passed again on 2026-06-01 after P2-E visual QA/accessibility work.
- Windows x64 MSI and NSIS bundles were produced under `src-tauri/target/release/bundle/`.
- P2-C added user-triggered redacted diagnostics, fail-closed log export protection, and Settings validation/privacy updates.
- P2-D semantic/graph containment and comprehensive remediation passed on 2026-05-31: target P2-D tests (13 files / 57 tests), `pnpm verify` (56 files / 318 tests), `cargo test` (17 tests), `pnpm tauri build`, and mocked Playwright semantic/graph desktop + 390px acceptance.
- P2-E passed targeted privacy/a11y tests, `pnpm verify` (59 files / 334 tests), `cargo test` (17 tests), `pnpm tauri build`, and Playwright CLI smoke for setup/settings/dashboard alias/workbench privacy/update notification/390px drawer/graph explicit visualization.
- P2-E comprehensive remediation additionally hardens sidecar PID ownership, reconciles the local-only bind-address contract, moves workbench layout derivation into L2, splits common shell/update notification orchestration into L2 commanders, and adds synthetic diagnostics report/export redaction tests.
- Current post-remediation verification passed on 2026-06-01: `pnpm verify` (62 files / 338 tests), `cargo fmt --check`, `cargo test` (20 tests), `pnpm tauri build`, and `git diff --check` (no whitespace errors; CRLF normalization warnings only). The latest packaging rerun produced MSI/NSIS bundles without the previous GraphCanvas chunk warning or Rust crate-name warning.
- Architecture audit is recorded: no L4-to-L2 imports, no L1/L3 raw network calls, no L2/L4-to-L3 imports, and only explicitly recorded staged L3 commander/store exceptions remain.
- Graph 3D dependencies are isolated to the explicit-click `vendor-graph-3d` lazy chunk. `GraphCanvas` is now a small business chunk and Vite no longer reports a chunk-size warning; the 3D vendor budget remains documented as a performance caveat.
- The release contract uses `http://127.0.0.1:5030`; `AGENTS.md`, productization contracts, and `sidecar_args.rs` now agree on the local-only default bind address.
- Windows x64 packaged-app smoke passed on 2026-06-01 with synthetic local data: install/open, clean profile, saved config reopen, app-managed sidecar health, diagnostics export review, quit cleanup, and unknown `5030` conflict.
- P4-A source/UI work on 2026-06-02 upgrades developer diagnostics and privacy mode with production-safe event wiring, DevConsole 2.0 filters/detail, manifest 2.0 diagnostics export lines, expanded redaction helpers, and settings/about diagnostics reuse. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm verify` passed for this slice. This source/UI evidence did not change Tauri CSP/capabilities, sidecar startup, Rust export payload shape, or the packaged Windows x64 artifact.
- P5-C/D release guardrails are implemented and hardened: sidecar manifest/checker including HTTPS URL + SHA-256 staging, updater manifest checker with bundle-root discovery and target-specific platform evidence, CI branch trigger correction, pinned release action, draft release behavior, release governance, privacy audit, and advanced acceptance checklist. Release publish remains blocked until concrete sidecar provenance, generated updater metadata, packaged smoke refresh, and privacy audit evidence are supplied.

## Release Dashboard

| Area | Status | Last evidence | Caveat |
| --- | --- | --- | --- |
| Ready desktop baseline | `packaged-smoke-verified` | `specs/001-ready-desktop-app/release-evidence.md` on 2026-06-01 | Windows x64 synthetic data only |
| P4 diagnostics/privacy | `source-ui-verified` | P4-A evidence on 2026-06-02 | Not packaged smoke |
| P4 media/chat extensions | `source-ui-verified` | P4-B implementation notes | Not packaged smoke |
| P4 SNS | `source-ui-verified` | P4-C evidence on 2026-06-02 | Not packaged smoke |
| P4 DB/API runner | `source-ui-verified` | P4-D evidence on 2026-06-02 | Not packaged smoke |
| P4 Hook/MCP/semantic/graph residuals | `source-ui-verified` | P4-E evidence on 2026-06-03 | Not packaged smoke |
| P5-A/B fixtures/E2E/visual/a11y | `source-ui-verified` | P5-A/B evidence on 2026-06-03 | Mock backend only |
| P5-C sidecar provenance | `release-blocked` | `scripts/verify-sidecar-artifacts.mjs` URL/source/artifact verifier | No approved release provenance yet |
| P5-C updater signing | `release-blocked` | `scripts/verify-updater-manifest.mjs` target-specific checker | Needs generated release metadata |
| P5-C platform smoke | `release-blocked` | Historical P2-E Windows smoke | Needs P4/P5 packaged smoke refresh |
| P5-D privacy audit | `release-blocked` | `docs/release/privacy-audit.md` template | Needs candidate-specific review |
| Windows x64 release candidate | `release-blocked` | buildable package evidence only | Needs approved sidecar provenance, updater metadata, P4/P5 packaged smoke, and privacy audit |
| macOS Intel | `platform-caveat` | no smoke | not included in first release until sidecar provenance, signing/notarization, and smoke evidence exist |
| macOS Apple Silicon | `platform-caveat` | no smoke | not included in first release until sidecar provenance, signing/notarization, and smoke evidence exist |
| Linux x64 | `platform-caveat` | no smoke | not included in first release until sidecar provenance and runtime smoke evidence exist |

## P2-E Manual Gate

The Windows x64 manual gate has been executed locally against the latest NSIS artifact. Evidence is recorded in `specs/001-ready-desktop-app/release-evidence.md`.

Completed smoke coverage:

- Installed `src-tauri/target/release/bundle/nsis/chatlog_alpha_0.1.0_x64-setup.exe`.
- Launched the installed app without a terminal.
- Confirmed app-managed sidecar health at `http://127.0.0.1:5030/health`.
- Quit the app and verified the app-managed sidecar was cleaned up.
- Reopened and confirmed persisted synthetic settings restored to service controls.
- Occupied `5030` with an unknown PowerShell listener and confirmed the app reported a recoverable conflict without stopping it.
- Exported and manually reviewed the packaged diagnostics artifact with redaction-safe checks.

Remaining release note:

- The smoke used synthetic local data and did not exercise real private WeChat message content. macOS packaging remains outside the Windows x64 gate.

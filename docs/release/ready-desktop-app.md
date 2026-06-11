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
pnpm release:collect:tauri-smoke -- --json
pnpm release:check:updater
```

## 2026-06-12 Step 11 Current Status

Current Step 11 evidence is recorded in
`docs/next-repair-baseline-step-11-tauri-installer-smoke-evidence.md`.

- Source/Rust/package gates passed: `pnpm verify` passed with 169 Vitest files /
  707 tests plus production build; `cargo test` passed 22 Rust tests; `pnpm
  tauri build` rebuilt the Windows x64 MSI and NSIS bundles.
- Step 11 added `pnpm release:collect:tauri-smoke` for safe installer artifact
  inventory and `pnpm release:scan:diagnostics -- <file>` for packaged
  diagnostics forbidden-marker scanning.
- Current Windows artifact inventory after the Step 11 build:
  - MSI `chatlog_alpha_0.1.0_x64_zh-CN.msi`, SHA-256
    `a101579a012164a85f929274571d7399a0094f690eb41a37c825ff6576716177`.
  - NSIS `chatlog_alpha_0.1.0_x64-setup.exe`, SHA-256
    `09518986ae77a0ee9742f38bfdf477a3c5b481a63cc044e69d1bf4ce5684d8cd`.
- Windows sidecar release provenance passed again for
  `x86_64-pc-windows-msvc`, SHA-256
  `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af`.
- Release publish remains blocked: generated signed updater `latest.json` is
  missing, local signing env vars are unset, installer-level smoke was not
  completed in this run, packaged unknown-port UI smoke was not rerun, packaged
  diagnostics export was not rerun, and release owner signoff is absent.

## 2026-06-11 Step 10 Current Status

Current canonical evidence is recorded in `docs/next-repair-baseline-step-10-global-acceptance-evidence.md`. Historical entries below remain audit context and must not be treated as current proof unless repeated in the Step 10 evidence file.

- Source/UI gates passed: `pnpm fixtures:check` (71 route entries), governance Vitest (7 files / 57 tests), `pnpm e2e` (29 tests), `pnpm e2e:visual` (4 tests), `pnpm e2e:a11y` (10 tests), and `pnpm verify` (168 files / 702 tests plus production build).
- Native gates passed: `cargo test` passed with 22 Rust tests; Tauri dev smoke passed using a temporary `127.0.0.1:5174` dev server because an existing Vite process occupied the default `5173`.
- Package build passed: `pnpm tauri build` produced current Windows x64 MSI and NSIS artifacts.
- Windows sidecar release provenance passed for the current target: `pnpm release:check:sidecar:release -- --json` verified `src-tauri/binaries/chatlog_alpha-x86_64-pc-windows-msvc.exe` with SHA-256 `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af`.
- Release publish remains blocked: signed updater `latest.json` is missing, local `createUpdaterArtifacts:true` failed without `TAURI_SIGNING_PRIVATE_KEY`, installer-level smoke was not completed, packaged unknown-port UI smoke was not rerun, packaged diagnostics export was not rerun, and release owner signoff is absent.

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
- P5-C/D release guardrails are implemented and hardened: sidecar manifest/checker including HTTPS URL + SHA-256 staging, updater manifest checker with bundle-root discovery and target-specific platform evidence, CI branch trigger correction, pinned release action, draft release behavior, release governance, privacy audit, and advanced acceptance checklist. Step 10 supplied current Windows sidecar provenance evidence; release publish remains blocked until generated updater metadata, installer-level packaged smoke, packaged diagnostics review, and owner signoff are supplied.

## Release Dashboard

| Area | Status | Last evidence | Caveat |
| --- | --- | --- | --- |
| Ready desktop baseline | `packaged-smoke-verified` | `specs/001-ready-desktop-app/release-evidence.md` on 2026-06-01 | Windows x64 synthetic data only |
| P4 diagnostics/privacy | `source-ui-verified` | P4-A evidence on 2026-06-02 | Not packaged smoke |
| P4 media/chat extensions | `source-ui-verified` | P4-B implementation notes | Not packaged smoke |
| P4 SNS | `source-ui-verified` | P4-C evidence on 2026-06-02 | Not packaged smoke |
| P4 DB/API runner | `source-ui-verified` | P4-D evidence on 2026-06-02 | Not packaged smoke |
| P4 Hook/MCP/semantic/graph residuals | `source-ui-verified` | P4-E evidence on 2026-06-03 | Not packaged smoke |
| P5-A/B fixtures/E2E/visual/a11y | `source-ui-verified-current` | Step 10 evidence on 2026-06-11 | Mock backend only |
| P5-C sidecar provenance | `windows-release-artifact-verified` | Step 10 `release:check:sidecar:release` | Windows x64 only; non-Windows remain caveats |
| P5-C updater signing | `release-blocked` | Step 10 updater check | Needs signed generated `latest.json` and artifact checksum evidence |
| P5-C installer inventory | `installer-artifacts-inventoried-current` | Step 11 artifact inventory on 2026-06-12 | Needs installed-app UI smoke |
| P5-C platform smoke | `needs-manual-smoke` | Step 11 confirms current artifacts only | Needs installer-level smoke and packaged unknown-port UI rerun |
| P5-D privacy audit | `source-browser-rust-audit-current` | Step 11 source/Rust gates and diagnostics scanner | Needs current packaged diagnostics artifact review |
| Windows x64 release candidate | `release-blocked` | Step 11 evidence bundle | Needs updater metadata, installer-level smoke, packaged conflict/diagnostics smoke, packaged diagnostics review, and owner signoff |
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

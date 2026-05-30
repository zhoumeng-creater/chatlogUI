# Ready Desktop App Release Evidence

This file is the redaction-safe evidence template for release readiness. Do not paste raw `dataKey`, API keys, tokens, private chat text, real contact names, or full private local paths.

## Build Under Test

- Date: 2026-05-30
- Branch: `001-ready-desktop-app`
- Commit: `0c9ccf9` plus current working tree changes
- Package:
  - `src-tauri/target/release/bundle/msi/chatlog_alpha_0.1.0_x64_zh-CN.msi`
  - `src-tauri/target/release/bundle/nsis/chatlog_alpha_0.1.0_x64-setup.exe`
- Windows x64 environment: local Windows development machine
- Operator: Codex

## Verification Summary

| Area | Status | Evidence |
| --- | --- | --- |
| Frontend verification | Passed | `pnpm verify`; 41 test files and 262 tests passed; production build completed |
| Rust tests | Passed | `cargo test` in `src-tauri`; 16 tests passed |
| Tauri package build | Passed | `pnpm tauri build`; MSI and NSIS x64 bundles produced |
| Browser responsive smoke | Passed | `http://127.0.0.1:5173/`, `/workbench`, and `/settings` checked at 1440px and 390px widths |
| Install | Not run | Windows x64 installer or unpacked app path pending |
| Launch | Not run | App opens without terminal pending |
| Quit | Not run | App-managed sidecar shutdown pending |
| Reopen | Not run | Settings/state restore pending |
| Port conflict | Not run | Unknown occupant on `5030` pending |
| Privacy redaction | Partial | Privacy aria label masking and password form semantics covered by tests/code review; full log audit pending |
| Caveats | Pending | See unresolved warnings below |

## No-Terminal Launch Cases

| Case | Expected Result | Evidence |
| --- | --- | --- |
| Clean profile | App reaches setup without terminal commands | Pending |
| Valid data | App enters workspace and shows readiness | Pending |
| Missing data | App asks for directory selection | Pending |
| Unknown port conflict | App shows recoverable conflict state for `5030` | Pending |
| Backend failure | App shows retryable error without private details | Pending |
| Retry | Retry action updates readiness state | Pending |
| Workspace entry | User can enter workbench after readiness succeeds | Pending |

## Sidecar Ownership

- App-managed sidecar PID:
- Health endpoint `/health` result:
- Backend base URL: `http://127.0.0.1:5030`
- Shutdown evidence:
- Unknown process conflict evidence:

## Privacy Review

- Logs checked:
- Screenshots checked:
- Raw secrets observed: No / Yes, describe redacted remediation
- Private chat content observed: No / Yes, describe redacted remediation

## Current Caveats

- Legacy semantic and graph screens still contain pre-P2 UI primitives and should remain assigned to their own follow-up phases.
- Graph visualization chunk-size warning is currently accepted as a warning until graph route splitting is implemented.
- Rust build still emits the existing non-snake-case crate warning for `chatlogUI_lib`.

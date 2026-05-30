# Ready Desktop App Release Evidence

Date: 2026-05-30
Scope: P2-B comprehensive remediation evidence template and running log.

This file is evidence, not a release-ready claim. Mark an item complete only after the command or manual smoke step has actually run in the current branch/worktree.

## Verification Commands

| Check | Command | Result | Notes |
| --- | --- | --- | --- |
| Lint | `pnpm lint` | PASS via `pnpm verify` | Required `.eslintrc.cjs root: true` because nested worktree otherwise loaded the parent config too |
| TypeScript | `pnpm typecheck` | PASS via `pnpm verify` | Fresh run after all changes |
| Unit tests | `pnpm test` | PASS via `pnpm verify`: 133 tests / 21 files | Includes new search-store and transcript-row tests |
| Frontend build | `pnpm build` | PASS via `pnpm verify` | Known warning: lazy `GraphModule-B_jQbZhS.js` 1,034.78 kB, gzip 292.66 kB |
| Full frontend verify | `pnpm verify` | PASS | Runs lint/typecheck/test/build |
| Rust tests | `cd src-tauri && cargo test` | PASS: 16 tests | Initial run failed because the ignored sidecar binary was absent in the new worktree; copied local ignored binary for verification, then reran successfully |
| Tauri build | `pnpm tauri build` | PASS | Produced MSI and NSIS bundles |

## Manual Smoke Matrix

| Area | Required Evidence | Result |
| --- | --- | --- |
| Launch/setup | App opens without terminal, shows setup/ready state, no destructive port cleanup | PASS in browser dev smoke; sidecar was intentionally not running, health checks showed recoverable connection refused state |
| Workbench | Chat/search/stats visible with loading/empty/error/success states | PASS for route load and responsive shell; API-backed ready data still requires sidecar/fixture smoke |
| Long history | Synthetic 10,000-message transcript keeps bounded DOM via virtualization | PASS: 10,000 messages rendered with 18 virtual rows / 17 message rows in a constrained transcript container |
| Search | Invalid, loading, empty, error, cancelled, success, and honest navigation notice visible | PASS for invalid/cancelled/empty/error/ready-notice component smoke and store tests |
| Privacy | Visible text, `aria-label`, `alt`, diagnostics, and screenshots do not expose raw private content | PASS for changed conversation/stats helper tests; full diagnostics package audit remains P2-C |
| Settings/setup forms | Password/API key/data key fields are inside forms and do not trigger browser warnings | PASS: `/`, `/settings` smoke showed `passwordNotForm=0` at all tested widths |
| Assets | Favicon and core assets do not produce avoidable 404s | PASS: `/favicon.svg` returned 200 in browser request log |
| Responsive UI | No horizontal overflow at 1440, 1180, 900, 768, and 390 px widths | PASS for `/`, `/workbench`, `/settings`; `overflow=false`, `controlsOverflow=0` |

## Current P2-B Remediation Notes

- Core workbench architecture boundary scan is recorded in `architecture-boundary-check.md`.
- Frontend dev server port changed to `http://localhost:5173`; HMR websocket port changed to `5174`.
- Backend sidecar contract remains `http://127.0.0.1:5030` with `/health`.
- `GraphModule` chunk size warning remains a P2-D/P2-E follow-up unless final build evidence shows it has changed.
- No real WeChat messages, raw data keys, provider credentials, tokens, or private paths are used as committed fixtures.
- Tauri bundles generated:
  - `src-tauri/target/release/bundle/msi/chatlog_alpha_0.1.0_x64_zh-CN.msi`
  - `src-tauri/target/release/bundle/nsis/chatlog_alpha_0.1.0_x64-setup.exe`

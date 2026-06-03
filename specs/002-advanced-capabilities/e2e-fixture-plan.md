# E2E Fixture Plan

## Goal

Create a repeatable testing foundation for P5 browser E2E, visual, accessibility, and contract tests without depending on a user's local WeChat data.

The executable route/state/viewport/privacy coverage is tracked in `e2e-matrix.md`. This file owns the fixture and mock-server input strategy.

P5-A/B implementation planning is documented in `docs/superpowers/plans/2026-06-03-p5-a-b-contract-fixtures-e2e-visual-a11y.md`. As of 2026-06-03, the fixture validator, mock route map, local-only mock server, Playwright E2E specs, visual regression targets, and accessibility checks are implemented as source/UI gates. This does not imply packaged release readiness; P5-C remains responsible for packaged sidecar smoke and release reproducibility.

## Fixture Set

- `e2e/fixtures/core-ready.json`: healthy sidecar, DB ready, sessions, contacts, chatrooms, history, search, and stats.
- `e2e/fixtures/advanced-capabilities.json`: endpoint shapes for P4 advanced modules with synthetic rows only.
- `e2e/fixtures/diagnostics-redaction.json`: synthetic redaction cases used to prove diagnostics do not leak secrets or private content.

## Mock Server Direction

The mock server maps fixture sections to local `chatlog_alpha` endpoint families. It is opt-in for tests and must not replace packaged sidecar smoke tests.

Current mock server expectations:

- Bind to a local-only test port.
- Support JSON and SSE responses matching `e2e/mock-chatlog-server/route-map.json`.
- Return deterministic errors for diagnostic and recovery-state tests.
- Never read from local WeChat paths.
- Never proxy remote URLs.
- Never write real diagnostics or logs outside test output directories.
- Fail clearly if `127.0.0.1:5030` is occupied by another process; never kill unknown listeners.

## Security Boundary

P5-A/B does not change `src-tauri/tauri.conf.json`, Tauri capabilities, shell permissions, sidecar launch arguments, or the `chatlog_alpha` API contract. The existing `media-src 'self' data: blob: http://127.0.0.1:5030` allowance belongs to the prior local media-preview work and remains constrained to local sidecar/media placeholder traffic; P5-A/B adds no remote media, telemetry, proxy, or generic HTTP client capability.

## Runnable P5-A/B Commands

Run from the repository root:

```powershell
pnpm fixtures:check
pnpm e2e
pnpm e2e:visual
pnpm e2e:update-snapshots
pnpm e2e:a11y
```

`pnpm e2e:update-snapshots` is the only intended way to update visual baselines. `output/` contains transient Playwright reports and is git-ignored.

## E2E Coverage Targets

P5-A/B now adds persistent checks for a subset of the rows in `e2e-matrix.md`, including:

- setup center and settings/about diagnostics smoke states
- workbench ready state
- privacy mode visible masking
- advanced module placeholder entry states
- narrow and desktop viewport layout checks
- mock server contract mapping for REST JSON, SSE, media placeholders, deterministic errors, and latency
- visual regression for stable synthetic desktop/narrow states
- axe plus keyboard/focus accessibility checks, including drawer focus trap/restore
- visible, accessible-name, console, and page-error privacy leak scanning

Rows for DB unavailable setup, diagnostics export success/fail-closed, packaged install/open/quit/reopen, and unknown-port packaged smoke remain P5-C or later release-gate work unless a future plan moves them earlier.

## Dependency Decision

P5-A/B adds a persistent project-owned Playwright runner and keeps transient reports under `output/`. The runner is separate from `pnpm verify` for now, so developers can run P5 gates explicitly while the release pipeline is staged.

## P5-A/B Implemented Scope

The implemented scope includes:

- Fixture manifest and local-only route map for P4-B/C/D/E endpoint families.
- Fixture validator that parses synthetic JSON, validates route references, requires each advanced fixture family to include success plus edge/failure states, validates `/api/v1/db/tables` contract shape, and scans for private data, real paths, real tokens, raw `dataKey`, and SNS proxy query leakage.
- Local-only mock backend serving `/health`, core REST, advanced REST, deterministic SSE, and generated media placeholders.
- Browser E2E rows for setup center, workbench ready, dashboard alias, settings/about diagnostics and disabled updater smoke, media/SNS, Developer DB/API/Hook/MCP, AI preview, Graph visualization, privacy mode, and narrow overflow.
- Visual baselines for desktop workbench, Developer Hook, Graph visualization, and narrow privacy state.
- A11y gate with axe serious/critical checks, keyboard reachability, drawer focus trap/restore, and privacy accessible-text/console scanning.
- Packaged app smoke, real sidecar artifact acquisition, updater signing, and release reproducibility stay in P5-C.

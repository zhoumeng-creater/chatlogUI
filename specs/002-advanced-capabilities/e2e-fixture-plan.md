# E2E Fixture Plan

## Goal

Create a repeatable testing foundation for P5 browser E2E, visual, accessibility, and contract tests without depending on a user's local WeChat data.

The executable route/state/viewport/privacy coverage is tracked in `e2e-matrix.md`. This file owns the fixture and mock-server input strategy.

## Fixture Set

- `e2e/fixtures/core-ready.json`: healthy sidecar, DB ready, sessions, contacts, chatrooms, history, search, and stats.
- `e2e/fixtures/advanced-capabilities.json`: endpoint shapes for P4 advanced modules with synthetic rows only. As of P4-B, unread, members, new messages, and favorites use backend-shaped response fields for contract tests and future mock-server mapping.
- `e2e/fixtures/diagnostics-redaction.json`: synthetic redaction cases used to prove diagnostics do not leak secrets or private content.

## Mock Server Direction

The mock server should map fixture sections to local `chatlog_alpha` endpoint families. It should be opt-in for tests and must not replace packaged sidecar smoke tests.

Initial mock server expectations:

- Bind to a local-only test port.
- Support JSON responses matching the fixture route map.
- Return deterministic errors for diagnostic and recovery-state tests.
- Never read from local WeChat paths.
- Never proxy remote URLs.
- Never write real diagnostics or logs outside test output directories.

## E2E Coverage Targets

P4/P5-0 creates fixtures and the coverage matrix only. Later P5 phases should add tests for the rows in `e2e-matrix.md`, including:

- first-run setup states
- service healthy but DB unavailable
- workbench empty state
- workbench ready state
- privacy mode visible masking
- diagnostics export blocked and successful paths
- advanced module placeholder entry states
- narrow and desktop viewport layout checks
- packaged install/open/quit/reopen/unknown-port-conflict smoke
- mock server contract mapping for REST JSON, SSE, media placeholders, deterministic errors, and latency

## Dependency Decision

Do not add `@playwright/test` in P4/P5-0 unless implementation requires a runnable harness. The foundation should be consumable by future Playwright, browser-plugin, or contract-test runners.

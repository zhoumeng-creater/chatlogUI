# Advanced Capabilities Specification

## Purpose

This directory tracks P4/P5 advanced capability productization for `chatlogUI`. It extends the ready desktop app scope without replacing `specs/001-ready-desktop-app/`.

The goal is to cover raw `chatlog_alpha` capability families safely: media, chat extensions, SNS, DB explorer/query/cache, hook/Hermes/SSE, MCP, semantic residuals, graph residuals, diagnostics, and repeatable release-quality fixtures.

## Foundation Status

P4/P5-0 is a foundation stage. It does not implement complete media, SNS, DB, hook, MCP, or API runner UI. It creates the matrix, privacy contract, diagnostic event baseline, and synthetic fixture strategy required before those higher-risk modules are built.

P4-A has now implemented the developer diagnostics and privacy-mode upgrade on top of that foundation: production-safe diagnostic event wiring, DevConsole 2.0 filters/detail, manifest 2.0 diagnostics export lines, expanded redaction helpers, settings/about diagnostics reuse, and browser evidence for the diagnostics surfaces. This does not implement P4-B media, P4-C SNS, P4-D DB/API runner, P4-E hook/MCP/residual modules, or the persistent P5 E2E/release-quality suites.

## Files

- `capability-matrix.md`: endpoint family ownership, privacy level, product batch, diagnostic needs, fixture strategy, and verification status.
- `privacy-diagnostics-contract.md`: local-only diagnostics, redaction rules, forbidden payloads, event retention, and export behavior.
- `test-data-policy.md`: synthetic-only fixture policy for advanced features.
- `e2e-matrix.md`: route, state, viewport, privacy, fixture, and phase ownership matrix for later P5 gates.
- `e2e-fixture-plan.md`: mock backend and E2E fixture structure for future P5 gates.

## Non-Negotiables

- Preserve the `chatlog_alpha` sidecar contract unless a later spec explicitly approves a contract change.
- Do not commit real local chat data, media, database files, logs, paths, tokens, keys, or private messages.
- Do not broaden Tauri CSP or capabilities in this foundation phase.
- Do not add automatic telemetry or diagnostic upload.
- Keep L4 independent, L2 responsible for orchestration, L3 props-driven, and L1 layout-only.

# Advanced Capabilities Specification

## Purpose

This directory tracks P4/P5 advanced capability productization for `chatlogUI`. It extends the ready desktop app scope without replacing `specs/001-ready-desktop-app/`.

The goal is to cover raw `chatlog_alpha` capability families safely: media, chat extensions, SNS, DB explorer/query/cache, hook/Hermes/SSE, MCP, semantic residuals, graph residuals, diagnostics, and repeatable release-quality fixtures.

## Foundation Status

P4/P5-0 is a foundation stage. It does not implement complete media, SNS, DB, hook, MCP, or API runner UI. It creates the matrix, privacy contract, diagnostic event baseline, and synthetic fixture strategy required before those higher-risk modules are built.

P4-A has implemented the developer diagnostics and privacy-mode upgrade on top of that foundation: production-safe diagnostic event wiring, DevConsole 2.0 filters/detail, manifest 2.0 diagnostics export lines, expanded redaction helpers, settings/about diagnostics reuse, and browser evidence for the diagnostics surfaces.

P4-B and P4-C now add source/UI evidence for media/chat extensions and SNS/朋友圈 browsing on the current development branch. They do not replace the persistent P5 E2E/release-quality suites, and they do not imply a packaged release rerun.

P4-D DB Explorer and wx-cli/API Debugger now has source/UI evidence from 2026-06-02. The implementation adds a Developer Tools workbench module with DB Explorer, read-only SQL guard, cache clear confirmation, and a local allowlisted API runner. DB query stays read-only by frontend guard, cache clear requires confirmation, and the API runner is a local catalog rather than a generic remote HTTP client.

P4-E Hook/MCP/Semantic Preview/Graph Residuals now has source/UI evidence from 2026-06-03. The implementation extends Developer Tools with Hook and MCP tabs, adds AI semantic index preview, and adds Graph Advanced config/ingest/QA summaries. Targeted tests and mocked browser acceptance passed against synthetic fixtures. P5-B persistent E2E and P5-C packaged release gates remain separate future work.

P5-A/B is implemented as source/UI gates from 2026-06-03. It upgrades the current P4-B/C/D/E evidence into contract fixture validation, a local-only mock backend, persistent browser E2E, visual regression, and accessibility gates. P5-C packaged release gates remain separate future work.

P5-C/D release guardrails are implemented from 2026-06-03 and were hardened after review: sidecar artifact provenance manifest/checker with HTTPS URL + SHA-256 staging, updater manifest checker with bundle-root discovery and target-specific platform verification, CI/CD gate ordering on the repository default branch, pinned Tauri release action, draft release governance, release runbook, privacy audit template, advanced acceptance checklist, and changelog baseline. Release readiness remains blocked until a concrete release candidate supplies approved sidecar provenance, generated updater metadata/signatures, packaged smoke refresh, and privacy audit evidence.

## Files

- `capability-matrix.md`: endpoint family ownership, privacy level, product batch, diagnostic needs, fixture strategy, and verification status.
- `privacy-diagnostics-contract.md`: local-only diagnostics, redaction rules, forbidden payloads, event retention, and export behavior.
- `test-data-policy.md`: synthetic-only fixture policy for advanced features.
- `e2e-matrix.md`: route, state, viewport, privacy, fixture, and phase ownership matrix for P5 gates.
- `e2e-fixture-plan.md`: mock backend and E2E fixture structure for P5 gates.
- `acceptance-checklist.md`: source/UI and release-gate checklist for P4/P5.
- `../../docs/superpowers/plans/2026-06-03-p5-a-b-contract-fixtures-e2e-visual-a11y.md`: dedicated P5-A/B implementation plan.
- `../../docs/superpowers/plans/2026-06-03-p5-c-d-sidecar-artifact-updater-ci-release-governance.md`: dedicated P5-C/D release pipeline and governance plan.

## Non-Negotiables

- Preserve the `chatlog_alpha` sidecar contract unless a later spec explicitly approves a contract change.
- Do not commit real local chat data, media, database files, logs, paths, tokens, keys, or private messages.
- Do not broaden Tauri CSP or capabilities in this foundation phase.
- Do not add automatic telemetry or diagnostic upload.
- Keep L4 independent, L2 responsible for orchestration, L3 props-driven, and L1 layout-only.

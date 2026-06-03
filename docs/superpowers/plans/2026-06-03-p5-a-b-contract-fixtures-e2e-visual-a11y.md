# P5-A/B Contract Fixtures, E2E, Visual Regression, And A11y Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: `planning-with-files`, `writing-plans`, `brainstorming`, `app-productization`, `release-gate`, `ui-acceptance`, `sidecar-integration`, `verification-before-completion`. Use `test-driven-development` before implementing any contract runner, adapter test, mock server, or E2E spec. Use `chatlog-debug` or `systematic-debugging` for failing tests, browser failures, mock-server drift, accessibility regressions, or fixture contract mismatches. Do not use subagents unless the user explicitly asks for them.

**Goal:** Turn the current P4-B/C/D/E source/UI evidence into repeatable P5-A contract fixture gates and P5-B browser E2E, visual regression, and accessibility gates. This phase does not add new user-facing advanced capability features. It proves the existing advanced modules stay compatible with synthetic backend-shaped `chatlog_alpha` responses and remain usable, private, visually stable, and keyboard-accessible.

**Status on 2026-06-03:** Implemented as source/UI P5-A/B gates. The contract runner, local mock server, Playwright config, E2E scripts, visual baselines, and a11y dependencies are now present. P5-C packaged release readiness remains out of scope.

**Non-goals:**

- Do not change the `chatlog_alpha` sidecar contract.
- Do not rerun or claim P5-C packaged release readiness.
- Do not commit real chat data, real media, real local paths, real API keys, real tokens, or real diagnostics logs.
- Do not put full implementation code in this planning document.
- Do not use the P5 mock server as a replacement for packaged sidecar smoke tests.
- Do not broaden Tauri CSP, capabilities, shell permissions, or sidecar startup behavior for this phase.

---

## Source Context Read

This plan is based on the current development branch and the existing productization documents:

- `AGENTS.md` instructions supplied for this workspace.
- `task_plan.md`, `findings.md`, and `progress.md`.
- `docs/总体开发规划.md` and `开发指南.md`.
- `.specify/memory/constitution.md`.
- `docs/ui-functional-audit-and-redesign-plan.md`.
- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`.
- `docs/superpowers/plans/2026-06-01-p4-p5-0-capability-diagnostics-e2e-foundation.md`.
- P4-A through P4-E dedicated plans, implementation evidence, and current source/UI progress notes.
- `specs/001-ready-desktop-app/` contracts, release evidence, test-data policy, and P2-E visual QA matrix.
- `specs/002-advanced-capabilities/` README, capability matrix, privacy diagnostics contract, E2E matrix, fixture plan, and test-data policy.
- Current frontend code for Workbench modules, L4 network atoms, L2 commanders/stores/view models, L3 modules, Vite config, package scripts, and existing fixtures.
- Local `chatlog_alpha` endpoint context already recorded in earlier P4 planning and implementation findings.

---

## Current Baseline

The current branch is `codex/p4b-media-chat-extensions`, not `master`. The working tree contains continuous P4-B/C/D/E source and documentation changes. P5-A/B should preserve that context and should not revert existing phase work.

Current relevant code and tooling state:

- `package.json` has `dev`, `build`, `preview`, `tauri`, `lint`, `typecheck`, `test`, and `verify`.
- There is no `playwright.config.ts`.
- There are no `pnpm e2e`, `pnpm e2e:visual`, `pnpm e2e:a11y`, or fixture-validation scripts.
- `e2e/` currently contains synthetic fixtures and mock-server documentation, not a runnable mock server or runnable specs.
- Vite dev server is canonical at `http://localhost:5173` with strict port.
- The local backend contract remains `http://127.0.0.1:5030`.
- `src/l2-coordinator/commander/useWorkbenchShellCommander.ts` has the DEV-only `/workbench?codex-smoke=workbench-ready` bypass that previous source/UI evidence used.
- Workbench modules now include `chat`, `stats`, `media`, `sns`, `developer`, `ai`, `graph`, and `settings`.
- P4-B/C/D/E have targeted tests and mocked source/UI evidence, but no persistent P5-B suite.

Current fixture state:

- `e2e/fixtures/core-ready.json` covers ready desktop core data.
- `e2e/fixtures/advanced-capabilities.json` covers P4 advanced endpoint families with synthetic data.
- `e2e/fixtures/diagnostics-redaction.json` covers synthetic redaction markers.
- `e2e/mock-chatlog-server/README.md` describes direction only.

---

## Architecture Rules For P5-A/B

The P5 harness must respect the same product architecture as the app:

- L4 owns raw HTTP/SSE/Tauri/system calls and adapter contract tests.
- L2 owns orchestration, error translation, privacy state, diagnostic normalization, and view models.
- L3 receives props and callbacks only.
- L1 delegates route/layout placement.
- Test fixtures may model backend responses, but they must not become a second frontend data model.
- Browser tests must drive the app through user-visible routes and controls, not by importing stores or mutating internal state.
- E2E mocks must be local-only and synthetic-only.

---

## P5-A Scope: Contract Fixtures And Adapter Hardening

P5-A upgrades fixture files from "planning inputs" into executable contract checks.

### P5-A Deliverables

Add or update these assets during implementation:

- `e2e/fixtures/core-ready.json`
- `e2e/fixtures/advanced-capabilities.json`
- `e2e/fixtures/diagnostics-redaction.json`
- `e2e/fixtures/fixture-manifest.json`
- `e2e/fixtures/states/*.json` or `e2e/fixtures/route-overrides/*.json`
- `e2e/mock-chatlog-server/route-map.mjs`
- `e2e/mock-chatlog-server/fixture-loader.mjs`
- `scripts/validate-e2e-fixtures.mjs`
- L4 adapter and fetcher tests for core, media, chat extensions, SNS, DB/API runner, Hook/Hermes, MCP summaries, semantic preview, graph residuals, diagnostics, and update/release mock states where relevant.
- Package scripts such as `pnpm fixtures:check` and targeted contract-test scripts.

Exact file names can shift if implementation proves a simpler structure, but the ownership must remain clear: fixtures and route maps live under `e2e/`, reusable validation lives under `scripts/`, and adapter contract assertions live near L4 tests.

### P5-A Contract Requirements

- Fixtures must be backend-shaped, not frontend-view-shaped.
- Every advanced endpoint family from `specs/002-advanced-capabilities/capability-matrix.md` needs at least one success fixture and one deterministic failure or edge-state fixture.
- REST fixtures must cover JSON shapes. Where `chatlog_alpha` supports default non-JSON formatting, P5-A should test default-format drift at fixture/contract level while app fetchers continue to request `format=json`.
- Fetcher tests must prove `format=json` is appended where required.
- Adapter tests must prove unknown fields are tolerated and malformed required fields fail predictably.
- SSE fixtures must be deterministic and cancellable. Hook stream and semantic QA stream coverage should remain separate.
- Media fixtures must use generated placeholders or metadata-only entries. They must not contain real binaries, private media, or real media keys.
- Diagnostics fixture checks must fail if synthetic private markers appear in exported, visible, accessible, or diagnostic-safe fields.
- Fixture validation must scan for real-looking secrets, tokens, raw Windows user paths, unmasked `dataKey`, local WeChat paths, private message markers, and remote proxy URLs.
- Fixture validation should parse all JSON and confirm route-map references resolve to fixture sections.

### P5-A Task Plan

#### A0. Baseline Inventory

- Confirm current branch and dirty worktree context.
- Inventory all existing fixture sections and endpoint families.
- Compare fixture families against `specs/002-advanced-capabilities/capability-matrix.md`.
- Record missing route/state coverage before editing fixtures.

Acceptance:

- Every P4-B/C/D/E endpoint family has an owner row and a fixture status.
- Gaps are listed before implementation starts.

#### A1. Fixture Policy Validator

- Add a fixture validation script that parses JSON fixtures, validates manifest references, and scans synthetic privacy policy markers.
- Keep validation independent from app runtime imports.
- Make validation fail closed on unresolved fixture references or high-risk strings.

Acceptance:

- `pnpm fixtures:check` fails on malformed JSON, unknown route references, real-looking secret tokens, real local paths, and unmasked private marker strings.
- The validator allows documented synthetic sentinel strings only when they exist inside redaction test inputs.

#### A2. Fixture Manifest And Route Map

- Add a manifest describing fixture files, route families, states, and privacy sensitivity.
- Add a mock route map that binds endpoint paths to fixture sections without reading local data.
- Cover `/health`, `/api/v1/db`, core REST, media resources, chat extensions, SNS, DB/query/cache, Hook/Hermes, Hook SSE, MCP route summaries, semantic preview/QA where relevant, graph residuals, diagnostics, and update/release mock states.

Acceptance:

- The route map can explain which fixture section serves every P5-B route row.
- Unsupported or intentionally deferred backend behavior is explicitly documented.

#### A3. Adapter Contract Tests

- Add contract tests that feed raw fixture sections into L4 adapters and verify normalized safe outputs.
- Cover core, media/chat extensions, SNS, Developer DB/API, Hook/Hermes, semantic preview, graph residuals, diagnostics, and release/update mock state adapters.
- Add unknown-field tolerance checks.
- Add malformed or missing required-field checks for each high-risk adapter family.

Acceptance:

- Adapter tests fail if backend-shaped response fields drift away from accepted contracts.
- Safe outputs do not contain forbidden raw values.

#### A4. Fetcher Contract Tests

- Verify each L4 fetcher constructs local sidecar URLs with the right path, query parameters, method, and `format=json` behavior.
- Verify read-only guards and destructive confirmation guards remain before network dispatch.
- Verify endpoint runner catalog does not expose raw host/path/header/body controls.
- Verify SSE parsers handle snapshot, event, keepalive, error, abort, and unknown event records predictably.

Acceptance:

- Fetcher tests prove app code requests JSON where needed and does not rely on default backend formatting.
- Default-format behavior is tested only as fixture drift coverage, not as normal UI fetch behavior.

#### A5. Privacy Fixture Scanner

- Scan fixtures, adapter outputs, diagnostic events, accessible-label test data, and screenshot-state fixtures for leakage.
- Keep scans narrow enough to avoid false positives from intentional redaction helper tests, but strict enough to block real data.

Acceptance:

- No fixture or contract output contains real-looking `sk-`/Bearer secrets, raw `dataKey`, unmasked local user paths, real WeChat paths, raw SNS proxy query strings, raw SQL result bodies, raw Hook payloads, semantic raw content, or graph QA evidence text.

#### A6. Documentation Sync

- Update `specs/002-advanced-capabilities/e2e-fixture-plan.md`.
- Update `specs/002-advanced-capabilities/e2e-matrix.md`.
- Update release evidence boundaries without claiming P5-C.
- Update `task_plan.md`, `findings.md`, and `progress.md`.

Acceptance:

- Docs distinguish P5-A contract fixture completion from P5-B browser completion and P5-C packaged release completion.

### P5-A Verification

Expected commands after implementation:

```powershell
pnpm fixtures:check
pnpm test src\l4-atom\network
pnpm test src\l2-coordinator\commander
pnpm typecheck
git diff --check
```

---

## P5-B Scope: Browser E2E, Visual Regression, And Accessibility Gate

P5-B adds a persistent browser suite against synthetic local data. It should be deterministic enough for local use first and CI integration second.

### P5-B Deliverables

Add or update these assets during implementation:

- `playwright.config.ts`
- `e2e/specs/setup.spec.ts`
- `e2e/specs/workbench.spec.ts`
- `e2e/specs/privacy.spec.ts`
- `e2e/specs/advanced-media.spec.ts`
- `e2e/specs/advanced-sns.spec.ts`
- `e2e/specs/developer-tools.spec.ts`
- `e2e/specs/semantic-graph.spec.ts`
- `e2e/specs/diagnostics.spec.ts`
- `e2e/specs/visual.spec.ts`
- `e2e/specs/a11y.spec.ts`
- `e2e/utils/mock-server.ts` or equivalent runner wrapper.
- `e2e/utils/privacy-scan.ts`.
- `e2e/utils/viewport.ts`.
- `e2e/utils/a11y.ts`.
- Package scripts such as `pnpm e2e`, `pnpm e2e:visual`, `pnpm e2e:a11y`, and `pnpm e2e:update-snapshots`.
- Optional CI job/artifact upload after local stability is proven.

Likely dev dependencies:

- `@playwright/test`
- `@axe-core/playwright`
- `axe-core`

The dependency choice should be made during implementation and recorded in the final implementation notes.

### P5-B Mock Backend Requirements

The browser suite must not depend on a user's real local sidecar or WeChat data. It should use either a local-only mock server or Playwright route interception. A mock server is preferred because it also validates the route map and SSE behavior.

Mock backend rules:

- Bind to `127.0.0.1` only.
- Prefer `127.0.0.1:5030` when the app cannot be configured to another sidecar URL.
- If port `5030` is occupied, fail with a clear message unless implementation adds a documented test-only app config for a different local port.
- Never kill unknown listeners.
- Never read local WeChat directories.
- Never proxy remote URLs.
- Never write outside `output/playwright` or equivalent ignored test-output directories.
- Serve deterministic REST JSON, SSE streams, media placeholders, error states, unavailable states, and latency states.
- Keep request logging redacted and bounded.

### P5-B Route And State Coverage

Minimum route coverage:

- `/` setup center: clean profile, healthy service with DB unavailable, ready state, privacy on/off.
- `/workbench?codex-smoke=workbench-ready`: rail, toolbar, chat, stats, media, SNS, Developer, AI, Graph, settings entry states.
- `/dashboard?codex-smoke=workbench-ready`: alias reaches the same workbench shell.
- `/settings`: data, appearance, AI, diagnostics/about, updater mock states.

Minimum module coverage:

- Chat transcript loading, empty, ready, error, retry, long content, privacy-on masking.
- Stats ready, empty, error, long labels, privacy-on masking.
- Media image/video/file/voice/data placeholders, preview/error/retry, privacy-on media masking.
- Chat extensions: unread, members, new messages, favorites.
- SNS feed, search, notifications, media placeholder, privacy-on masking.
- Developer DB Explorer, read-only SQL guard, cache clear confirmation, endpoint runner redacted preview.
- Hook config/status/events/stream start-stop/cancel, Hermes summaries, clear confirmation.
- MCP local inventory and route smoke summary without raw tool invocation controls.
- Semantic config/status/search/QA stream and semantic index preview.
- Graph explicit visualization nonblank canvas, Advanced config/ingest/QA summaries.
- Diagnostics filters, event detail, redacted export success, redaction failure.
- Settings update mock states and focus restore.

### Visual Regression Requirements

Use a small, stable set of synthetic screenshots first. Do not attempt to screenshot every state.

Required viewports:

- Desktop: `1440x900`.
- Narrow: `390x820`.

Required visual states:

- Workbench ready shell.
- Privacy-on workbench shell.
- Media module ready/error.
- SNS module ready/search.
- Developer Tools DB/API and Hook/MCP.
- AI semantic preview.
- Graph explicit visualization after user action with nonblank canvas.
- Settings/update mock state.
- Diagnostics export state.

Visual assertions:

- No page-level horizontal overflow.
- No incoherent text overlap.
- Toolbar, rail, drawer, dialogs, tables, and inspector layout remain stable.
- Privacy-on screenshots do not expose identities, message bodies, media keys, SQL values, SNS URLs, Hook payloads, semantic raw content, graph QA evidence, credentials, or local paths.
- Snapshots or baselines must be synthetic-only and stored or generated according to an explicit policy.
- `pnpm e2e:update-snapshots` must be explicit and never part of the default verification path.

### Accessibility Requirements

Automated axe checks should be combined with keyboard-specific checks. Axe alone is not sufficient for this app because many risks are interaction and privacy related.

Required a11y checks:

- No critical or serious axe violations unless a documented project exception exists.
- Rail and module switching are keyboard reachable.
- Tables, lists, segmented controls, toggles, dialogs, drawers, and confirmation sheets expose useful names and focus states.
- Stream cancel controls are reachable and have stable labels.
- Dialog and drawer focus is trapped when open and restored when closed.
- Live/status regions do not expose private text.
- Accessible names, titles, tooltips, alt text, and aria labels obey privacy mode masking.
- Graph explicit-load controls are reachable before canvas mount.
- Media controls do not expose raw filenames, media keys, or local paths in labels.

### P5-B Task Plan

#### B0. Dependency And Runner Decision

- Decide whether to use `@playwright/test` directly or a project wrapper around it.
- Decide mock-server process lifecycle and port strategy.
- Add scripts with explicit names and no private-data defaults.

Acceptance:

- A fresh checkout can install dependencies and see clear E2E commands.
- The test runner does not depend on global Playwright installs or ad hoc `output/` runtime installs.

#### B1. Local Mock Server

- Implement the synthetic local mock backend from the P5-A route map.
- Add deterministic REST, SSE, media placeholder, error, unavailable, latency, and redaction-failure states.
- Add startup checks for occupied ports and safe shutdown.

Acceptance:

- The mock server can serve all P5-B route rows without real sidecar data.
- It refuses unsafe local/remote/proxy behavior.

#### B2. Playwright Config And Smoke Entry

- Add `playwright.config.ts`.
- Launch Vite on `5173` or connect to a provided local dev server.
- Launch or attach the mock backend.
- Add a minimal readiness smoke for `/workbench?codex-smoke=workbench-ready`.

Acceptance:

- `pnpm e2e` can open the app from a fresh checkout and produce a redacted trace on failure.

#### B3. Core Route E2E

- Implement setup, workbench, dashboard alias, settings, chat, stats, diagnostics, and privacy specs.
- Assert no page-level overflow at desktop and narrow widths.
- Assert visible text and accessible names do not leak forbidden markers.

Acceptance:

- Core routes are stable with synthetic data and privacy-on variants.

#### B4. Advanced Module E2E

- Implement media, SNS, Developer, Hook/MCP, semantic preview, and graph residual specs.
- Cover loading, ready, empty, error, retry, confirmation, and stream cancel states where relevant.

Acceptance:

- Every P4-B/C/D/E source/UI module has at least one persistent browser route flow.

#### B5. Privacy And Diagnostics Leak Checks

- Add shared DOM text, accessible-name, console, trace, screenshot-state, and diagnostic-export leak checks.
- Keep leak checks based on synthetic sentinel values and high-risk patterns.

Acceptance:

- E2E fails if sentinel private strings reach visible UI, accessibility text, console output, diagnostic export text, or screenshot-safe states.

#### B6. Visual Regression

- Add screenshot comparison for the limited stable state set.
- Store baselines only if they are synthetic, redacted, deterministic, and approved by project policy.
- Otherwise produce review artifacts and mark visual regression as artifact-gated until baselines are accepted.

Acceptance:

- `pnpm e2e:visual` is deterministic enough to use for local review.
- Updating baselines requires an explicit command.

#### B7. Accessibility And Keyboard

- Add axe scans for representative routes and modules.
- Add keyboard navigation checks for rail, tabs, tables, drawers, dialogs, stream cancel, and graph explicit-load.
- Add privacy-on accessible-name leak checks.

Acceptance:

- `pnpm e2e:a11y` catches critical/serious accessibility regressions and privacy leaks in accessibility metadata.

#### B8. CI And Artifact Policy

- Decide whether P5-B local stability is enough before adding CI.
- If CI is added, upload only redacted traces/screenshots and keep them out of commits.
- Do not mix real sidecar artifact acquisition or packaged release evidence into P5-B.

Acceptance:

- CI E2E artifacts are synthetic-only and useful for debugging.
- P5-C remains the owner for real release reproducibility and packaged app smoke.

#### B9. Documentation And Evidence Closeout

- Update `specs/002-advanced-capabilities/e2e-matrix.md` row statuses.
- Update `specs/002-advanced-capabilities/e2e-fixture-plan.md`.
- Update `specs/001-ready-desktop-app/release-evidence.md` with source/E2E evidence boundaries only.
- Update `task_plan.md`, `findings.md`, and `progress.md`.

Acceptance:

- Readers can distinguish P5-A fixtures, P5-B browser gates, and P5-C release gates.

### P5-B Verification

Expected commands after implementation:

```powershell
pnpm fixtures:check
pnpm e2e
pnpm e2e:visual
pnpm e2e:a11y
pnpm verify
git diff --check
```

If Rust/Tauri files change during implementation, also run:

```powershell
cd src-tauri
cargo test
```

---

## Acceptance Matrix

| Area | P5-A acceptance | P5-B acceptance |
| --- | --- | --- |
| Fixture policy | Synthetic-only fixtures parse and pass privacy scanner. | Browser tests use only synthetic fixture states. |
| Contract drift | Adapter/fetcher tests fail on backend shape drift. | Browser flows fail if route-map responses no longer drive UI. |
| Privacy | Contract outputs and diagnostic-safe fields do not contain forbidden raw values. | DOM, accessible names, screenshots, console, traces, and diagnostic exports do not leak sentinel values. |
| E2E coverage | Route map covers every P4 endpoint family. | Setup, workbench, settings, media, SNS, Developer, AI, Graph, diagnostics, and privacy routes run persistently. |
| Visual | State fixtures identify screenshot targets. | Desktop and narrow screenshot checks are stable and synthetic-only. |
| A11y | Fixture states include accessibility-sensitive private labels. | Axe plus keyboard checks pass for representative routes and modules. |
| Release boundary | No packaged-release claims. | No real sidecar release claims; P5-C remains separate. |

---

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Mock server diverges from `chatlog_alpha`. | E2E can pass while real sidecar behavior drifts. | P5-A backend-shaped fixtures, route map, adapter tests, and documented unsupported states. |
| Visual baselines become noisy. | Review fatigue and false failures. | Start with few stable synthetic states, fixed viewports, no animations where avoidable, explicit update command. |
| Port `5030` conflict. | Tests kill or mask a real sidecar/user process. | Fail clearly if occupied by unknown process; never kill unknown listeners. |
| Fixtures accidentally include private data. | Privacy breach in repo or CI artifacts. | Fixture scanner, synthetic test-data policy, no real media/logs/paths. |
| A11y checks miss keyboard regressions. | App looks valid but is not operable. | Pair axe with explicit keyboard/focus assertions. |
| E2E dependency churn slows normal verification. | Developers skip gates. | Keep P5-B scripts separate from `pnpm verify` until stable; add CI gradually. |
| P5-B gets mixed with P5-C release gates. | False release confidence. | Keep packaged sidecar smoke, real sidecar binaries, updater signing, and release reproducibility in P5-C. |

---

## Reviewer Checklist

Before marking P5-A/B complete, review:

- Fixtures are synthetic-only and route-map owned.
- No full code snippets were added to planning docs as a substitute for implementation.
- L4 contract tests cover every P4 advanced endpoint family.
- Fetchers still request `format=json` where required.
- Default-format behavior is only contract-drift coverage, not app runtime behavior.
- Mock server is local-only and does not kill unknown `5030` listeners.
- E2E covers desktop and narrow viewports.
- Visual screenshots are redacted and deterministic.
- A11y includes axe and keyboard/focus/privacy-label checks.
- Diagnostics exports remain redaction-first.
- `pnpm verify` and P5-specific scripts pass after implementation.
- P5-C release pipeline hardening remains explicitly separate.

# P4/P5 E2E Matrix

## Purpose

This matrix turns the P4/P5 fixture foundation into testable route, state, viewport, privacy, and fixture coverage. P5-A/B now includes a persistent local-only mock server plus Playwright E2E, visual, and accessibility gates for the implemented rows below.

P5-A/B planning and implementation evidence are documented in `docs/superpowers/plans/2026-06-03-p5-a-b-contract-fixtures-e2e-visual-a11y.md`. Current status is `p5-a-b-runnable-source-ui`: fixture validation, mock route mapping, browser E2E, visual regression, and a11y gates exist. P5-C packaged app smoke and release reproducibility remain separate. P5-C/D release guardrails are now implemented, but release readiness remains blocked until concrete sidecar provenance, generated updater metadata, packaged smoke refresh, and privacy audit evidence are recorded.

## UI Acceptance Baseline

Every runnable row in later P5 phases must keep these checks:

- Desktop viewport: `1440x900`.
- Narrow viewport: `390x820`.
- No page-level horizontal overflow.
- Loading, empty, error, success, retry/recovery, and disabled states render without text overlap.
- Privacy mode masks identities, message text, file/media keys, local paths, query values, and provider credentials in visible text, alt text, tooltips, live regions, console rows, screenshots, and exported diagnostics.
- UI uses the existing Tailwind v4 variables and current component language; no marketing hero, nested cards, decorative gradient-orb backgrounds, or one-off palette drift inside operational screens.
- Icon buttons, segmented filters, toggles, table rows, forms, progress indicators, dialogs, and drawers must match the existing workbench/settings/dev-console interaction patterns.

## Route And State Matrix

| Route or surface | State or scenario | Viewports | Privacy mode | Fixture source | Required assertions | Phase owner | P4/P5-0 status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` setup center | clean profile, missing config | 1440, 390 | off/on | `core-ready.json` plus synthetic empty setup state | setup shell visible, diagnostics summary visible, no private path text, primary actions reachable | P5-B browser E2E | P5-B runnable: `pnpm e2e` |
| `/` setup center | sidecar HTTP healthy, DB unavailable | 1440, 390 | off/on | `core-ready.json` with DB error override | service and DB states are distinct, retry action visible | P5-A contract + P5-B browser | foundation-ready |
| `/` setup center | unknown `5030` port conflict | 1440, 390 | off/on | packaged smoke synthetic config | conflict owner is summarized safely; app does not kill unknown listener | P5-C release gate | foundation-ready |
| `/workbench?codex-smoke=workbench-ready` | workbench ready shell | 1440, 390 | off/on | `core-ready.json` | rail, toolbar, chat, stats, AI, graph, settings entry render without overflow | P5-B browser E2E | P5-B runnable: `pnpm e2e` |
| `/workbench?codex-smoke=workbench-ready` | chat transcript loading/empty/ready/error | 1440, 390 | off/on | `core-ready.json` route overrides | status copy, retry action, masked title/message in privacy mode | P5-B browser E2E | foundation-ready |
| `/workbench?codex-smoke=workbench-ready` | stats ready/empty/error | 1440, 390 | off/on | `core-ready.json` route overrides | cards/charts fit, top sender masked, no raw identity in alt text | P5-B visual/a11y | foundation-ready |
| `/workbench?codex-smoke=workbench-ready` | semantic config/index/search/topics/profile/QA | 1440, 390 | off/on | `core-ready.json` | provider states, index actions, stream cancel, empty/results/error states | P5-B browser E2E | foundation-ready |
| `/workbench?codex-smoke=workbench-ready` | graph explicit visualization | 1440, 390 | off/on | `core-ready.json` | canvas absent before click, nonblank after click, drawer/dialog fits narrow viewport | P5-B visual/a11y | P5-B runnable: `pnpm e2e`, `pnpm e2e:visual`, `pnpm e2e:a11y` |
| `/dashboard?codex-smoke=workbench-ready` | dashboard alias | 1440, 390 | off/on | `core-ready.json` | alias reaches same workbench shell and does not regress navigation | P5-B browser E2E | P5-B runnable: `pnpm e2e` |
| `/settings` | data, appearance, AI, about sections | 1440, 390 | off/on | `core-ready.json` | tab/section navigation, diagnostics/about panel visible, disabled-updater smoke text safe, forms fit, privacy controls are visible and persistent | P5-B browser E2E | P5-B runnable: `pnpm e2e`, `pnpm e2e:a11y` |
| `/settings` | update notification available/downloading/ready/error | 1440, 390 | off/on | synthetic update state | dialog semantics, focus restore, progressbar aria, safe error text | P5-B a11y | foundation-ready |
| Workbench Dev Console | sidecar logs plus HTTP/UI/Tauri/update/release events | 1440, 390 | off/on | `diagnostics-redaction.json` | source/level/privacy/endpoint/time/failed-only filters work, no raw secret markers, counts match events, safe detail panel visible | P5-B browser E2E | P4-A source/UI evidence passed 2026-06-02; persistent P5-B suite not yet added |
| Diagnostics export | explicit export success and redaction failure | 1440, 390 | off/on | `diagnostics-redaction.json` | export is user-triggered, blocked values are redacted or export fails closed; manifest 2.0 lines explain app/sidecar/readiness/update/event state | P5-A contract + P5-C release | P4-A manifest/source/UI evidence passed 2026-06-02; packaged P5-C export rerun not yet added |
| Advanced media entry | image/video/file/voice/data placeholders | 1440, 390 | off/on | `advanced-capabilities.json` | media keys and paths never render raw; load/error/retry states fit | P4-B + P5-B | P5-B runnable: `pnpm e2e` |
| Chat extension entry | unread, members, new messages, favorites | 1440, 390 | off/on | `advanced-capabilities.json` | count/list/empty/error states; identities masked in privacy mode | P4-B + P5-B | documented |
| SNS entry | notifications, feed, search, media proxy placeholder | 1440, 390 | off/on | `advanced-capabilities.json` | feed/search states; proxy `url` and `key` never visible or logged | P4-C + P5-B | P5-B runnable: `pnpm e2e` |
| DB/developer entry | Developer module, table list, data page, search, read-only query, cache clear | 1440, 390 | off/on | `advanced-capabilities.json` | Developer rail entry opens after SNS, read-only SQL default, unsafe SQL blocked before fetch, destructive cache confirmation, no raw SQL/result diagnostics | P4-D + P5-B | P5-B runnable: `pnpm e2e`, `pnpm e2e:a11y` |
| API runner entry | local allowlisted endpoint catalog | 1440, 390 | off/on | `advanced-capabilities.json` | local-only alias catalog, no arbitrary remote URL/path/header/body input, safe request summaries and redacted response preview | P4-D + P5-B | P5-B runnable: `pnpm e2e` |
| Hook console entry | config, status, events, stream, Hermes bridge | 1440, 390 | off/on | `advanced-capabilities.json` | Developer Hook tab opens; stream lifecycle/cancellation controls render; clear confirmation works; no event content, credential, post URL, channel, or path leakage | P4-E + P5-B | P5-B runnable: `pnpm e2e`, `pnpm e2e:visual`, `pnpm e2e:a11y` |
| MCP entry | tool list, `/mcp`, `/sse`, `/message` summaries | 1440, 390 | off/on | `advanced-capabilities.json` | MCP tab opens; route status and tool/prompt inventory render; no private arguments, raw bodies, remote host, raw path, or arbitrary tool invocation controls | P4-E + P5-B | P5-B runnable: `pnpm e2e` |
| Semantic residual entry | index preview | 1440, 390 | off/on | `advanced-capabilities.json` | AI preview tab/panel opens; groups/outliers/preview rows render; no `store_path`, identity, or message content leakage | P4-E + P5-B | P5-B runnable: `pnpm e2e`, `pnpm e2e:a11y` |
| Graph residual entry | graph config, guarded ingest, and graph QA | 1440, 390 | off/on | `advanced-capabilities.json` | Graph Advanced opens; worker config form renders; business/event ingest controls are explicit and privacy-disabled; graph QA summary renders with no raw query/answer/evidence or raw event content | P4-E + P5-B | P5-B runnable: `pnpm e2e`, `pnpm e2e:visual`, `pnpm e2e:a11y` |
| Packaged app smoke | install, launch, quit, reopen, unknown port conflict | Windows desktop | off/on where reachable | packaged synthetic config | no terminal required, app-managed sidecar only, cleanup leaves no listener | P5-C release gate | foundation-ready |
| Mock backend contract | JSON REST, SSE, media placeholders, deterministic errors | n/a | n/a | all fixtures | local-only mock server can map every fixture section to route families | P5-A contract | P5-A runnable: `pnpm fixtures:check`, mock server targeted tests |

## Fixture Ownership

- `core-ready.json` owns current ready-desktop routes and existing core/semantic/graph flows.
- `advanced-capabilities.json` owns future P4 endpoint shapes and synthetic rows only.
- `diagnostics-redaction.json` owns synthetic secret/private markers used only to prove redaction and fail-closed behavior.
- Packaged smoke uses synthetic local config and temporary directories, not committed fixture data.

## Current Runner Requirements

The P5-A/B runnable suite should continue to:

- Prefer the local mock server for deterministic browser/visual/a11y checks.
- Keep packaged-app smoke against the real Tauri sidecar path and app lifecycle.
- Run privacy-on and privacy-off variants for every route that can display identity, message, path, media, or credential-like text.
- Capture screenshots only from synthetic fixtures or masked UI states.
- Scan visible text, accessible names, console messages, and page errors for forbidden synthetic private markers.
- Record skipped rows with a documented blocker and owner phase, not by deleting the row.
- Use `docs/superpowers/plans/2026-06-03-p5-a-b-contract-fixtures-e2e-visual-a11y.md` as the P5-A/B implementation source for fixture validators, mock backend lifecycle, Playwright specs, visual baselines/artifacts, and a11y/keyboard checks.

## P5-A/B Security Boundary 2026-06-03

The P5-A/B runnable suite and fixture updates did not edit Tauri CSP, capabilities, shell permissions, sidecar startup, updater endpoints, or packaged bundle settings. Existing local `media-src`/`img-src` allowances for `http://127.0.0.1:5030` are treated as prior local media-preview scope and are exercised only through synthetic local mock media placeholders in P5-B.

## P4-A Evidence 2026-06-02

P4-A upgraded the existing foundation rows for Workbench Dev Console and Diagnostics export without starting the persistent P5-B browser suite or P5-C packaged release rerun.

- Workbench route checked with Vite plus cached Chromium DevTools Protocol at `/workbench?codex-smoke=workbench-ready` for `1440x900` and `390x820`.
- DevConsole evidence: no page-level horizontal overflow, five filter selects visible, failed-only checkbox visible, event rows visible, safe detail panel visible, and no visible synthetic/private marker strings.
- Settings/About diagnostics checked at `/settings` for `1440x900` and `390x820`.
- Diagnostics evidence: shared DiagnosticsPanel visible, `Export manifest version 2.0` visible, redaction state visible, no page-level horizontal overflow, and no visible synthetic/private marker strings.
- Hit target check: event row buttons and visible UI buttons were at least 28px high after the DevConsole row min-height fix.
- Tooling caveat: headless Chromium user-data-dir must stay outside the Vite project tree; a worktree-local profile caused Vite watcher reload churn and was replaced by a system temp profile.

## P4-C SNS Evidence 2026-06-02

P4-C upgraded the SNS row from documented planning to source/UI evidence. This is not a packaged release rerun and does not replace P5-B persistent E2E.

- Workbench route checked with Vite at `/workbench?codex-smoke=workbench-ready` using mocked local `127.0.0.1:5030` responses for sessions, history, stats, SNS feed, SNS search, SNS notifications, and SNS media proxy.
- Desktop evidence: SNS rail/toolbar entry opened the `朋友圈` module, feed rows rendered synthetic authors/content/media/article/finder/location summaries, and the inspector used a single-column layout after fixing an initial compressed two-column issue.
- Narrow evidence: `390x780` drawer rendered SNS filters, segmented tabs, and notification rows without page-level horizontal overflow.
- Search evidence: SNS in-module search loaded synthetic results and uses plain text `<mark>` segments rather than raw HTML.
- Privacy/leak evidence: visible text did not include `/api/v1/sns/media/proxy`, `sns-secret-key`, raw URL/key/token labels, raw XML, or local paths.
- Tooling caveat: Playwright was installed temporarily under `output/playwright` for route interception and removed after screenshots were inspected.

## P4-D Developer Tools Evidence 2026-06-02

P4-D upgraded the DB/developer and API runner rows from documented planning to source/UI evidence. This is not a packaged release rerun and does not replace P5-B persistent E2E.

- Workbench route checked with Vite at `/workbench?codex-smoke=workbench-ready` using a temporary mock `127.0.0.1:5030` sidecar for sessions, history, stats, DB files, DB tables, DB data, DB query, DB search, cache clear, semantic status, and graph status.
- Desktop and narrow evidence: `1440x900` and `390x820` passed with privacy off and privacy on.
- DB evidence: Developer rail entry opened after SNS, DB files/tables rendered, table data loaded, privacy mode masked DB file names and table values, and unsafe SQL displayed the blocked mutation guard before dispatch.
- API runner evidence: local-sidecar allowlist rendered, redacted response preview rendered, and visible text did not include raw path/header/body controls such as `raw_path`, `body_file`, `remote_host`, `headers`, or `dataKey=`.
- Layout evidence: no page-level horizontal overflow in any checked viewport/privacy combination.
- Tooling caveat: Playwright was installed temporarily under `output/playwright-runtime` for browser automation and removed after the checks.

## P4-E Hook/MCP/Semantic Preview/Graph Evidence 2026-06-03

P4-E upgraded the Hook/MCP, semantic residual, and graph residual rows from documented planning to source/UI evidence. This is not a packaged release rerun and does not replace P5-B persistent E2E.

- Workbench route checked with Vite at `/workbench?codex-smoke=workbench-ready` using Playwright route interception for synthetic local `127.0.0.1:5030` responses.
- Desktop and narrow evidence: `1440x900` privacy off and `390x820` privacy on passed.
- Hook evidence: Developer Tools Hook tab rendered config/status/events, SSE listen/stop controls consumed synthetic snapshot/hook_event events, and event rows stayed content/identity masked.
- MCP evidence: Developer Tools MCP tab rendered local route/tool/prompt inventory and did not expose remote host, raw path, raw headers, raw body, or arbitrary tool invocation controls.
- Semantic evidence: AI Preview tab rendered vector counts, model/dimension metadata, groups, coordinates, and outlier labels without `store_path`, raw identity, or message content.
- Graph evidence: Graph Advanced rendered worker config and structured business/event ingest/QA controls; text drafts are disabled in privacy mode and QA output is summary-only.
- Browser assertions: no page-level horizontal overflow, no console/page errors after fixing duplicate diagnostics keys, and no visible synthetic secret/private marker strings.
- Tooling caveat: Playwright was installed temporarily under `output/playwright-p4e` and removed after the checks.

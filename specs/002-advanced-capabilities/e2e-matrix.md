# P4/P5 E2E Matrix

## Purpose

This matrix turns the P4/P5-0 fixture foundation into testable route, state, viewport, privacy, and fixture coverage. P4/P5-0 records the matrix and synthetic fixture inputs only; runnable Playwright/browser suites are introduced in later P5 phases.

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
| `/` setup center | clean profile, missing config | 1440, 390 | off/on | `core-ready.json` plus synthetic empty setup state | setup shell visible, no private path text, primary actions reachable | P5-B browser E2E | foundation-ready |
| `/` setup center | sidecar HTTP healthy, DB unavailable | 1440, 390 | off/on | `core-ready.json` with DB error override | service and DB states are distinct, retry action visible | P5-A contract + P5-B browser | foundation-ready |
| `/` setup center | unknown `5030` port conflict | 1440, 390 | off/on | packaged smoke synthetic config | conflict owner is summarized safely; app does not kill unknown listener | P5-C release gate | foundation-ready |
| `/workbench?codex-smoke=workbench-ready` | workbench ready shell | 1440, 390 | off/on | `core-ready.json` | rail, toolbar, chat, stats, AI, graph, settings entry render without overflow | P5-B browser E2E | foundation-ready |
| `/workbench?codex-smoke=workbench-ready` | chat transcript loading/empty/ready/error | 1440, 390 | off/on | `core-ready.json` route overrides | status copy, retry action, masked title/message in privacy mode | P5-B browser E2E | foundation-ready |
| `/workbench?codex-smoke=workbench-ready` | stats ready/empty/error | 1440, 390 | off/on | `core-ready.json` route overrides | cards/charts fit, top sender masked, no raw identity in alt text | P5-B visual/a11y | foundation-ready |
| `/workbench?codex-smoke=workbench-ready` | semantic config/index/search/topics/profile/QA | 1440, 390 | off/on | `core-ready.json` | provider states, index actions, stream cancel, empty/results/error states | P5-B browser E2E | foundation-ready |
| `/workbench?codex-smoke=workbench-ready` | graph explicit visualization | 1440, 390 | off/on | `core-ready.json` | canvas absent before click, nonblank after click, drawer/dialog fits narrow viewport | P5-B visual/a11y | foundation-ready |
| `/dashboard?codex-smoke=workbench-ready` | dashboard alias | 1440, 390 | off/on | `core-ready.json` | alias reaches same workbench shell and does not regress navigation | P5-B browser E2E | foundation-ready |
| `/settings` | data, appearance, AI, about sections | 1440, 390 | off/on | `core-ready.json` | tab/section navigation, forms fit, privacy controls are visible and persistent | P5-B browser E2E | foundation-ready |
| `/settings` | update notification available/downloading/ready/error | 1440, 390 | off/on | synthetic update state | dialog semantics, focus restore, progressbar aria, safe error text | P5-B a11y | foundation-ready |
| Workbench Dev Console | sidecar logs plus HTTP/UI/Tauri/update/release events | 1440, 390 | off/on | `diagnostics-redaction.json` | source/level/privacy/endpoint/time/failed-only filters work, no raw secret markers, counts match events, safe detail panel visible | P5-B browser E2E | P4-A source/UI evidence passed 2026-06-02; persistent P5-B suite not yet added |
| Diagnostics export | explicit export success and redaction failure | 1440, 390 | off/on | `diagnostics-redaction.json` | export is user-triggered, blocked values are redacted or export fails closed; manifest 2.0 lines explain app/sidecar/readiness/update/event state | P5-A contract + P5-C release | P4-A manifest/source/UI evidence passed 2026-06-02; packaged P5-C export rerun not yet added |
| Advanced media entry | image/video/file/voice/data placeholders | 1440, 390 | off/on | `advanced-capabilities.json` | media keys and paths never render raw; load/error/retry states fit | P4-B + P5-B | documented |
| Chat extension entry | unread, members, new messages, favorites | 1440, 390 | off/on | `advanced-capabilities.json` | count/list/empty/error states; identities masked in privacy mode | P4-B + P5-B | documented |
| SNS entry | notifications, feed, search, media proxy placeholder | 1440, 390 | off/on | `advanced-capabilities.json` | feed/search states; proxy `url` and `key` never visible or logged | P4-C + P5-B | documented |
| DB/developer entry | table list, data page, search, query, cache clear | 1440, 390 | off/on | `advanced-capabilities.json` | read-only default, destructive confirmation, no raw SQL/result diagnostics | P4-D + P5-B | documented |
| API runner entry | local allowlisted endpoint catalog | 1440, 390 | off/on | `advanced-capabilities.json` | local-only allowlist, no arbitrary remote URL input, safe request summaries | P4-D + P5-B | documented |
| Hook console entry | config, status, events, stream, Hermes bridge | 1440, 390 | off/on | `advanced-capabilities.json` | stream lifecycle, cancellation, reconnect, event redaction | P4-E + P5-B | documented |
| MCP entry | tool list, `/mcp`, `/sse`, `/message` summaries | 1440, 390 | off/on | `advanced-capabilities.json` | tool names/status only, no private arguments or raw bodies | P4-E + P5-B | documented |
| Semantic residual entry | index preview | 1440, 390 | off/on | `advanced-capabilities.json` | preview rows, empty state, no message content leakage | P4-E + P5-B | documented |
| Graph residual entry | ingest message/business/event and graph QA | 1440, 390 | off/on | `advanced-capabilities.json` | explicit action gates, count summaries only, no raw event content | P4-E + P5-B | documented |
| Packaged app smoke | install, launch, quit, reopen, unknown port conflict | Windows desktop | off/on where reachable | packaged synthetic config | no terminal required, app-managed sidecar only, cleanup leaves no listener | P5-C release gate | foundation-ready |
| Mock backend contract | JSON REST, SSE, media placeholders, deterministic errors | n/a | n/a | all fixtures | local-only mock server can map every fixture section to route families | P5-A contract | foundation-ready |

## Fixture Ownership

- `core-ready.json` owns current ready-desktop routes and existing core/semantic/graph flows.
- `advanced-capabilities.json` owns future P4 endpoint shapes and synthetic rows only.
- `diagnostics-redaction.json` owns synthetic secret/private markers used only to prove redaction and fail-closed behavior.
- Packaged smoke uses synthetic local config and temporary directories, not committed fixture data.

## Later Runner Requirements

When P5 introduces a runnable E2E suite, it should:

- Prefer a local mock server for deterministic browser/visual/a11y checks.
- Keep packaged-app smoke against the real Tauri sidecar path and app lifecycle.
- Run privacy-on and privacy-off variants for every route that can display identity, message, path, media, or credential-like text.
- Capture screenshots only from synthetic fixtures or masked UI states.
- Record skipped rows with a documented blocker and owner phase, not by deleting the row.

## P4-A Evidence 2026-06-02

P4-A upgraded the existing foundation rows for Workbench Dev Console and Diagnostics export without starting the persistent P5-B browser suite or P5-C packaged release rerun.

- Workbench route checked with Vite plus cached Chromium DevTools Protocol at `/workbench?codex-smoke=workbench-ready` for `1440x900` and `390x820`.
- DevConsole evidence: no page-level horizontal overflow, five filter selects visible, failed-only checkbox visible, event rows visible, safe detail panel visible, and no visible synthetic/private marker strings.
- Settings/About diagnostics checked at `/settings` for `1440x900` and `390x820`.
- Diagnostics evidence: shared DiagnosticsPanel visible, `Export manifest version 2.0` visible, redaction state visible, no page-level horizontal overflow, and no visible synthetic/private marker strings.
- Hit target check: event row buttons and visible UI buttons were at least 28px high after the DevConsole row min-height fix.
- Tooling caveat: headless Chromium user-data-dir must stay outside the Vite project tree; a worktree-local profile caused Vite watcher reload churn and was replaced by a system temp profile.

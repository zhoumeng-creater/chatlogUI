# P4-A Developer Diagnostics And Privacy Mode 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: Use `planning-with-files`, `executing-plans`, `test-driven-development`, `app-productization`, `ui-acceptance`, `frontend-design`, `sidecar-integration`, `release-gate`, and `verification-before-completion` when implementing this plan. Do not use subagents unless the user explicitly asks for subagent or parallel agent work.

**Goal:** Upgrade the current P4/P5-0 diagnostics foundation into a product-grade local developer diagnostics and privacy system that can explain sidecar/API/UI/update failures without leaking private chat data, credentials, local paths, media keys, SQL, or raw response content.

**Architecture:** Preserve the L1/L2/L3/L4 boundary. L4 network/system atoms create raw local HTTP/Tauri events through optional callbacks and never import L2. L2 owns event recording, filtering, manifest construction, privacy policy, recovery suggestions, export orchestration, and state normalization. L3 renders a dense developer console and diagnostics surfaces from props/callbacks. L1 only places shells and delegates.

**Tech Stack:** React 18, TypeScript 5, Zustand, Tailwind CSS v4/project tokens, lucide-react, Vitest, Tauri v2, Rust diagnostic export guards, local `chatlog_alpha` HTTP/SSE on `http://127.0.0.1:5030`.

---

## Source Baseline Read

This plan is based on the current source and documents as of 2026-06-02:

- `AGENTS.md`
- `开发指南.md`
- `docs/总体开发规划.md`
- `.specify/memory/constitution.md`
- `docs/ui-functional-audit-and-redesign-plan.md`
- `specs/001-ready-desktop-app/spec.md`
- `specs/001-ready-desktop-app/plan.md`
- `specs/001-ready-desktop-app/contracts/diagnostics-package.md`
- `specs/001-ready-desktop-app/release-evidence.md`
- `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`
- `specs/001-ready-desktop-app/architecture-boundary-check.md`
- `docs/release/ready-desktop-app.md`
- `docs/superpowers/plans/2026-05-30-p2-c-settings-diagnostics-polish.md`
- `docs/superpowers/plans/2026-06-01-p2-e-visual-qa-accessibility-release-gate.md`
- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`
- `docs/superpowers/plans/2026-06-01-p4-p5-0-capability-diagnostics-e2e-foundation.md`
- `specs/002-advanced-capabilities/capability-matrix.md`
- `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`
- `specs/002-advanced-capabilities/e2e-matrix.md`
- `specs/002-advanced-capabilities/e2e-fixture-plan.md`
- `specs/002-advanced-capabilities/test-data-policy.md`
- Current diagnostics/privacy source files listed below.

Early guidance in `开发指南.md` and `docs/总体开发规划.md` about force-killing unknown ports, fake macOS traffic lights, and heavy glass styling is treated as superseded by AGENTS, the constitution, P2-E release evidence, and P4/P5 planning. Active guidance is local-only sidecar behavior, redaction-first diagnostics, dense desktop tooling, and strict architecture boundaries.

## Current Baseline

### Completed Foundation From P4/P5-0

- `specs/002-advanced-capabilities/` exists with endpoint-level capability matrix, privacy diagnostics contract, test data policy, E2E matrix, and fixture plan.
- `e2e/fixtures/core-ready.json`, `advanced-capabilities.json`, and `diagnostics-redaction.json` exist and are synthetic-only.
- `src/l4-atom/network/diagnosticEvents.ts` creates sanitized local diagnostic events.
- `src/l4-atom/network/httpClient.ts` supports optional `onDiagnosticEvent` and classifies success, HTTP error, timeout, caller abort, and network error.
- `src/l2-coordinator/data-clerk/stores/useDiagnosticEventStore.ts` stores bounded local diagnostic events.
- `src/l2-coordinator/commander/diagnosticEventViewModel.ts` merges sidecar logs and diagnostic events with source/level/privacy filters.
- `src/l3-molecule/common/DevConsole.tsx` is props-driven and shows a foundation event list.
- `src/l2-coordinator/commander/diagnostics.ts` and Rust `src-tauri/src/sidecar.rs` fail closed if redaction cannot be proven.

### Confirmed Current Gaps

- Production code does not yet pass `onDiagnosticEvent` into fetchers or commanders. `requestJson` emits HTTP events only in tests.
- `fetchDbReady.ts` and `fetchDbStatus.ts` still use direct raw `fetch` and do not emit diagnostic events.
- DevConsole currently supports source, level, and privacy filters only. It lacks time range, endpoint group, failed-only filtering, detail drawer, and suggested next action.
- Diagnostics report currently contains setup/readiness/log count and event summary. It lacks an explicit manifest with app version, build channel, package readiness, sidecar lifecycle summary, update state, and release smoke summary.
- Global privacy mode masks many user-facing surfaces, but diagnostics still need stronger coverage for event attributes, accessible names, tooltips, copy text, export output, and screenshot-safe high-risk panels.
- `createDeferredSubscription()` and `applyWindowMaterial()` still write raw errors to `console.error`. These paths should become redacted local diagnostic events.
- The current event model has no correlation ID, endpoint group filter, time bucket, failed-only selector, or recovery hint.

### Current Scan Results

Run in this planning session:

- `rg -n "@l4/network|@/l4-atom/network|fetch\(|EventSource|WebSocket|axios" src/l1-entry src/l3-molecule` produced no output.
- `rg -n "@l2|l2-coordinator" src/l4-atom` produced no output.
- `rg -n "onDiagnosticEvent|diagnostics:\s*\{" src/l2-coordinator src/l4-atom/network src/l3-molecule` only found `httpClient.ts` and tests.
- `rg -n "console\.(log|debug|info|warn|error)|alert\(" src/l1-entry src/l2-coordinator src/l3-molecule src/l4-atom` found runtime `console.error` in `applyWindowMaterial.ts` and `deferredSubscription.ts`, plus expected test strings.

## Product Direction

P4-A is a developer/operator tool inside the desktop workbench, not a marketing page and not a generic terminal. The UI direction is:

- Data-dense developer console / real-time monitor.
- Compact event table plus summary strip, filters, and detail drawer.
- Neutral workbench palette with semantic status colors for safe/redacted/blocked, warning, error, success.
- Lucide/vector icons only; no emoji icons.
- Dense but keyboard-operable controls.
- No decorative gradient-orb backgrounds, nested cards, or hero/landing layouts.
- At 390px, filters collapse without horizontal overflow and the detail drawer remains closeable.

## Scope

### In Scope

- Production diagnostic event wiring for core HTTP families.
- Diagnostic event store/view-model expansion: time, endpoint group, failed-only, correlation ID, recovery hint.
- DevConsole 2.0: dense event rows, filter toolbar, detail drawer, summary counts, safe copy/export, accessible status.
- Privacy Mode 2.0 for diagnostics and high-risk surfaces: visible text, aria/alt/title/tooltips, copy/export, event details, screenshot-safe rendering.
- Diagnostics export manifest with app/package/sidecar/update/readiness/event summary fields.
- Redaction helper expansion for media keys, SNS proxy URLs, raw SQL, raw response previews, and local identity paths.
- Tauri/Rust export guard updates if manifest fields need stronger fail-closed behavior.
- Documentation/evidence updates for P4-A.

### Out Of Scope

- Implementing P4-B media UI, SNS UI, DB explorer, API runner, hook console, MCP console, semantic preview, or graph residual forms.
- Broad release pipeline hardening from P5-C.
- Adding a generic remote HTTP client.
- Automatic diagnostic upload or telemetry.
- Broad Tauri CSP/capability changes.
- Changing `chatlog_alpha` backend behavior.
- Adding real chat data, real screenshots, real media, or real local DB fixtures.
- Replacing the P4/P5-0 foundation with a different event emitter architecture.

## Key Decisions

| Decision | Value |
| --- | --- |
| Privacy mode storage | Reuse existing `settings.privacyOn` for P4-A. Do not add a second persistent privacy flag unless a later spec explicitly asks for it. |
| Screenshot-safe behavior | When `privacyOn` is true, DevConsole and diagnostics panels should act screenshot-safe by default. This means no raw private values, no raw paths, no media keys, no SQL, no raw body previews. |
| HTTP event wiring | Keep `requestJson` opt-in. Add endpoint-family callbacks through L2-owned diagnostic bridge and optional fetcher options. L4 still does not import Zustand or commanders. |
| Raw response/body policy | P4-A does not show raw bodies. Future P4-D raw preview must be redacted by default and is outside this stage. |
| Export policy | Export remains user-triggered and fail-closed. P4-A adds a richer manifest, not automatic upload. |
| UI surface | DevConsole remains a shell tool accessible from the global command cluster. No separate route is required for P4-A. |

## File Map

### Modify Existing Files

- `src/l4-atom/network/diagnosticEvents.ts`
- `src/l4-atom/network/diagnosticEvents.test.ts`
- `src/l4-atom/network/httpClient.ts`
- `src/l4-atom/network/httpClient.test.ts`
- `src/l4-atom/network/readiness.ts`
- `src/l4-atom/network/fetchDbReady.ts`
- `src/l4-atom/network/fetchDbStatus.ts`
- Selected existing L4 fetchers for core, semantic, graph, and update families.
- `src/l2-coordinator/data-clerk/stores/useDiagnosticEventStore.ts`
- `src/l2-coordinator/data-clerk/stores/useDiagnosticEventStore.test.ts`
- `src/l2-coordinator/commander/diagnosticEventViewModel.ts`
- `src/l2-coordinator/commander/diagnosticEventViewModel.test.ts`
- `src/l2-coordinator/commander/diagnostics.ts`
- `src/l2-coordinator/commander/diagnostics.test.ts`
- `src/l2-coordinator/commander/useDevConsoleCommander.ts`
- `src/l2-coordinator/commander/useDiagnosticsCommander.ts`
- `src/l2-coordinator/commander/useUpdateCommander.ts`
- `src/l2-coordinator/commander/deferredSubscription.ts`
- `src/l4-atom/system/applyWindowMaterial.ts`
- `src/l3-molecule/common/DevConsole.tsx`
- `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx`
- `src/l3-molecule/diagnostics/DiagnosticCopyButton.tsx`
- `src/utils/maskSecrets.ts`
- `src/utils/maskSecrets.test.ts`
- `src/styles/layout.css`
- `src-tauri/src/sidecar.rs`
- `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`
- `specs/002-advanced-capabilities/e2e-matrix.md`
- `specs/001-ready-desktop-app/release-evidence.md`
- `specs/001-ready-desktop-app/architecture-boundary-check.md`
- `docs/release/ready-desktop-app.md`
- `task_plan.md`, `findings.md`, `progress.md`

### Create New Files If Useful

- `src/l2-coordinator/commander/diagnosticEventBridge.ts`
- `src/l2-coordinator/commander/diagnosticEventBridge.test.ts`
- `src/l2-coordinator/commander/diagnosticRecovery.ts`
- `src/l2-coordinator/commander/diagnosticRecovery.test.ts`
- `src/l3-molecule/common/devConsoleDisplay.test.ts`
- `src/l3-molecule/diagnostics/diagnosticsDisplay.test.ts`

Do not create files only to satisfy aesthetics. Create them when they isolate real behavior: event bridge, recovery hints, privacy display helpers, or display tests.

---

## Task A0: Baseline, Inventory, And Red Lines

**Purpose:** Freeze the current P4-A starting point and prevent later implementation from re-litigating already-settled P2/P4/P5 decisions.

**Files:**
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `task_plan.md`

**Steps:**

- [ ] Confirm branch/worktree:
  - Run `git status --short --branch`.
  - Expected: not on `master`; no unrelated uncommitted source edits except current planning docs.

- [ ] Re-run diagnostic boundary scans:
  - L1/L3 raw network scan.
  - L4-to-L2 scan.
  - Production `onDiagnosticEvent` scan.
  - Runtime `console.error` / `alert()` scan.

- [ ] Record P4-A start state:
  - P4/P5-0 foundation complete.
  - P2-E release gate complete.
  - P4-A will not expand Tauri CSP/capabilities.
  - P4-A will not implement P4-B/P4-C/P4-D modules.

**Acceptance:**

- Current baseline and known gaps are recorded before implementation.
- No plan task assumes production HTTP events are already wired.

**Verification:**

- `git status --short --branch`
- The scans above, recorded in `progress.md`.

---

## Task A1: Expand Diagnostic Event Model And Store Filters

**Purpose:** Make the event model expressive enough for a developer console without storing unsafe content.

**Files:**
- Modify: `src/l4-atom/network/diagnosticEvents.ts`
- Modify: `src/l4-atom/network/diagnosticEvents.test.ts`
- Modify: `src/l2-coordinator/data-clerk/stores/useDiagnosticEventStore.ts`
- Modify: `src/l2-coordinator/data-clerk/stores/useDiagnosticEventStore.test.ts`

**Behavior To Add With TDD:**

- Correlation ID support for related events.
- Endpoint group/family filter support.
- Failed-only filter support, where failed means warning/error or categories such as `http.error`, `http.timeout`, `http.abort`, `diagnostic.export`.
- Time range filter support such as `all`, `last15m`, `last1h`, `session`.
- Safe recovery-hint field or tag, for example `retry`, `check-service`, `open-settings`, `privacy-blocked`, `none`.
- Events continue to omit raw query, body, response body, SQL, media key, SNS proxy URL, local path, and private text.

**TDD Steps:**

- [ ] Add failing tests in `diagnosticEvents.test.ts`:
  - HTTP event includes `correlationId` when supplied.
  - Unsafe `url`, `query`, `requestBody`, `responseBody`, `sql`, `mediaKey`, and `snsProxyUrl` attributes are omitted.
  - A blocked event serializes as a blocked placeholder.
  - Recovery hint only accepts the safe enum.

- [ ] Add failing tests in `useDiagnosticEventStore.test.ts`:
  - Filters include `endpointFamily`, `failedOnly`, and `timeRange`.
  - Partial filter updates preserve existing fields.
  - Clearing events does not accidentally reset filter preferences unless explicitly requested.

- [ ] Implement the smallest model/store changes.

**Acceptance:**

- L4 event model remains dependency-free from L2/L3/Zustand/Tauri.
- Store filters are expressive enough for DevConsole 2.0.
- Unsafe event fields remain omitted before entering L2.

**Verification:**

```powershell
pnpm test src\l4-atom\network\diagnosticEvents.test.ts src\l2-coordinator\data-clerk\stores\useDiagnosticEventStore.test.ts
rg -n "l2-coordinator|l3-molecule|zustand|@tauri-apps" src\l4-atom\network\diagnosticEvents.ts
```

---

## Task A2: Add L2 Diagnostic Event Bridge And Wire Core HTTP Events

**Purpose:** Convert P4/P5-0 opt-in HTTP diagnostics from test-only behavior into production local diagnostics.

**Files:**
- Create: `src/l2-coordinator/commander/diagnosticEventBridge.ts`
- Create: `src/l2-coordinator/commander/diagnosticEventBridge.test.ts`
- Modify: selected L4 network fetchers.
- Modify: selected L2 commanders that call those fetchers.

**Recommended Bridge Shape:**

- L2 provides a small helper that returns:
  - endpoint family.
  - HTTP method.
  - `onDiagnosticEvent` callback that writes to `useDiagnosticEventStore.getState().addEvent`.
  - optional correlation ID.
- L4 fetchers accept optional diagnostics options and pass those options to `requestJson`.
- L4 fetchers still work exactly as before when no diagnostics options are provided.

**Endpoint Families To Wire In P4-A:**

Start with high-value families only:

- Setup/readiness:
  - `/health`
  - `/api/v1/db`
- Core workbench:
  - sessions
  - history
  - search
  - stats
- Semantic:
  - config
  - index status/actions
  - search
  - topics/profiles
  - QA non-streaming and stream lifecycle summary where appropriate
- Graph:
  - status
  - query
  - timeline
  - visualize
  - actions
- Update:
  - update check/download/install state summaries, without adding remote content to diagnostics.

Defer media/SNS/DB/hook/MCP families to their implementation phases, but keep P4-A bridge reusable for them.

**TDD Steps:**

- [ ] Add bridge tests:
  - Bridge adds safe events to store.
  - Bridge strips query-like metadata.
  - Bridge can produce a stable correlation ID in tests.
  - Bridge can create `http`, `ui`, `tauri`, and `updater` event sinks without L3 involvement.

- [ ] Add one fetcher integration test per representative family:
  - Core search event uses `endpointFamily=search` and does not include keyword.
  - Semantic search event uses `endpointFamily=semantic` and does not include query/chat.
  - Graph query event uses `endpointFamily=graph` and does not include keyword/entity.
  - Readiness event uses `endpointFamily=db` or `health`.

- [ ] Update fetcher signatures with optional diagnostics options.

- [ ] Update L2 commanders to pass diagnostic bridge options for the families above.

**Acceptance:**

- DevConsole receives HTTP events during normal setup/workbench usage.
- Diagnostic events contain operational metadata only.
- No raw search keyword, chat ID, SQL, media key, SNS proxy URL, path, body, or response body enters the event store.
- Existing fetcher callers and tests remain compatible.

**Verification:**

```powershell
pnpm test src\l2-coordinator\commander\diagnosticEventBridge.test.ts
pnpm test src\l4-atom\network\httpClient.test.ts
pnpm test src\l4-atom\network\fetchContacts.test.ts src\l4-atom\network\semanticFetchers.test.ts src\l4-atom\network\graphFetchers.test.ts
pnpm typecheck
```

---

## Task A3: Add UI/Tauri/Updater/Subscription Diagnostic Events

**Purpose:** Capture non-HTTP failures that users currently cannot explain from the UI.

**Files:**
- Modify: `src/l2-coordinator/commander/deferredSubscription.ts`
- Modify: `src/l4-atom/system/applyWindowMaterial.ts`
- Modify: `src/l2-coordinator/commander/useUpdateCommander.ts`
- Modify: `src/l2-coordinator/commander/useDevConsoleCommander.ts`
- Modify: `src/l2-coordinator/commander/useDiagnosticsCommander.ts`
- Potentially modify: `src/l4-atom/system/exportDiagnostics.ts`

**Events To Add:**

- Tauri event subscription initialization failure.
- Window material application failure.
- Update check unavailable because build is not updater-enabled.
- Update check failure.
- Update download progress summary.
- Update download/install failure.
- Diagnostics export success and failure.
- Sidecar log subscription lifecycle summary.

**TDD Steps:**

- [ ] Add tests for `deferredSubscription` behavior:
  - Failed subscription invokes a safe diagnostic callback instead of raw `console.error`.
  - Cleanup behavior remains intact.

- [ ] Add tests or a small helper for update diagnostics:
  - Updater-disabled state emits a safe `updater` event.
  - Update error message is redacted before it enters store/logs.

- [ ] Add tests for diagnostics export:
  - Successful export emits `diagnostic.export` safe event with no path detail beyond a safe status.
  - Blocked export emits redacted/blocked event.

**Acceptance:**

- Runtime `console.error` paths in P4-A-owned code are removed or classified as accepted non-sensitive dev-only exceptions.
- Non-HTTP failures become visible in DevConsole.
- No update URL response body, local path, or raw native error content is stored.

**Verification:**

```powershell
pnpm test src\l2-coordinator\commander\deferredSubscription.test.ts
pnpm test src\l2-coordinator\commander\diagnosticEventViewModel.test.ts src\l2-coordinator\commander\diagnostics.test.ts
rg -n "console\.(log|debug|info|warn|error)|alert\(" src\l1-entry src\l2-coordinator src\l3-molecule src\l4-atom
```

---

## Task A4: DevConsole 2.0 View Model And Dense UI

**Purpose:** Turn the current foundation console into a useful local developer diagnostics console.

**Files:**
- Modify: `src/l2-coordinator/commander/diagnosticEventViewModel.ts`
- Modify: `src/l2-coordinator/commander/diagnosticEventViewModel.test.ts`
- Modify: `src/l2-coordinator/commander/useDevConsoleCommander.ts`
- Modify: `src/l3-molecule/common/DevConsole.tsx`
- Create: `src/l3-molecule/common/devConsoleDisplay.test.ts` if display helpers are split out.
- Modify: `src/styles/layout.css`

**View Model Additions:**

- `endpointFamilyOptions`
- `timeRangeOptions`
- `failedOnly`
- `selectedEvent`
- `eventDetail` with safe attributes only
- `suggestedAction` derived from source/category/error kind
- counts by source, by level, by privacy, by endpoint family
- latest error summary

**UI Additions:**

- Summary strip:
  - total
  - failed
  - redacted/blocked
  - latest event time
- Filter toolbar:
  - source
  - level
  - privacy
  - endpoint group
  - time range
  - failed-only toggle
- Event table/list:
  - time
  - source
  - level
  - privacy
  - endpoint/category
  - summary
- Detail drawer:
  - safe attributes
  - correlation ID if present
  - recovery hint
  - privacy state
  - copy redacted summary only
- Keyboard behavior:
  - table row selection via Enter/Space.
  - Escape closes detail drawer.
  - focus returns to selected row or close button.

**TDD Steps:**

- [ ] Add view-model tests:
  - endpoint/time/failed filters work together.
  - row detail exposes only whitelisted attributes.
  - blocked events render blocked placeholder.
  - recovery hints map categories to next actions.

- [ ] Add display tests if helpers are extracted:
  - source/level/privacy labels are textual, not color-only.
  - narrow filter labels remain accessible.

- [ ] Implement UI with existing `Button`, `StatusIndicator`, `Surface`, `Typography`, `IconButton`, `Tooltip`, `Select`, and `SegmentedControl` where appropriate.

**Acceptance:**

- A developer can answer: what failed, where, when, whether it was redacted, and what to try next.
- DevConsole does not show raw request body, response body, SQL, paths, media keys, SNS URLs, tokens, private messages, or raw IDs.
- 1440px and 390px layouts do not overflow.
- Status is not conveyed by color alone.

**Verification:**

```powershell
pnpm test src\l2-coordinator\commander\diagnosticEventViewModel.test.ts
pnpm typecheck
rg -n "requestJson|fetch\(|http://|invoke\(" src\l3-molecule\common\DevConsole.tsx
```

---

## Task A5: Privacy Mode 2.0 And Redaction Helpers

**Purpose:** Make diagnostics and future raw-data-heavy tools screenshot-safe when privacy mode is enabled.

**Files:**
- Modify: `src/utils/maskSecrets.ts`
- Modify: `src/utils/maskSecrets.test.ts`
- Modify: `src/l2-coordinator/commander/diagnostics.ts`
- Modify: `src/l2-coordinator/commander/diagnostics.test.ts`
- Modify: `src/l3-molecule/common/DevConsole.tsx`
- Modify: `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx`
- Modify: `src/l3-molecule/diagnostics/DiagnosticCopyButton.tsx`

**Redaction Coverage To Add:**

- media resource keys and `/image/*key`, `/video/*key`, `/voice/*key`, `/file/*key`, `/data/*path`
- SNS proxy `url` and `key`
- raw SQL and SQL result-like values
- raw response previews
- `Authorization`, `Bearer`, API/provider keys
- WeChat IDs and local `WeChat Files` paths
- local user profile paths
- private message markers from `diagnostics-redaction.json`
- endpoint query strings carrying keyword/chat/time/path/key values

**Display Rules:**

- Visible DevConsole rows use redacted summaries.
- Detail drawer attributes show only safe keys and safe values.
- Tooltips, `aria-label`, `title`, live regions, and copy text use the same redaction policy.
- Export path display should not expose full private path. It may say export succeeded, and the path can be omitted or shown as a sanitized basename/status.
- In privacy mode, diagnostics panels should be screenshot-safe by default.

**TDD Steps:**

- [ ] Extend `maskSecrets.test.ts` with synthetic markers from `e2e/fixtures/diagnostics-redaction.json`.
- [ ] Add diagnostics tests:
  - Copy text does not contain private markers.
  - Export report fails closed when an unsafe line remains.
  - Event summaries with synthetic media/SNS/SQL data are redacted or blocked.
- [ ] Add display/helper tests if needed:
  - DevConsole accessible labels do not expose raw marker strings.
  - Diagnostics panel blocked state uses visible and screen-reader friendly error text.

**Acceptance:**

- Synthetic redaction markers are absent from visible text, accessible text, copy text, export text, and event detail text.
- Aggregate state remains visible: counts, status labels, endpoint families, durations, readiness states.
- Privacy mode does not make the console useless; it removes private content while preserving operational meaning.

**Verification:**

```powershell
pnpm test src\utils\maskSecrets.test.ts src\l2-coordinator\commander\diagnostics.test.ts
pnpm test src\l3-molecule\common\DevConsole.test.tsx
```

Also run a fixture-marker leak scan using the synthetic marker list from `e2e/fixtures/diagnostics-redaction.json`. Matches are allowed only in fixtures and tests, not production UI strings.

---

## Task A6: Diagnostics Export Manifest 2.0

**Purpose:** Make exported diagnostics useful for release/debugging without exposing private data.

**Files:**
- Modify: `src/l2-coordinator/commander/diagnostics.ts`
- Modify: `src/l2-coordinator/commander/diagnostics.test.ts`
- Modify: `src/l2-coordinator/commander/useDiagnosticsCommander.ts`
- Modify: `src/l2-coordinator/commander/useDevConsoleCommander.ts`
- Modify: `src/l4-atom/system/exportDiagnostics.ts` if payload shape changes.
- Modify: `src-tauri/src/sidecar.rs` if Rust export validation needs new manifest-line tests.

**Manifest Fields:**

Allowed:

- app version
- build channel: dev/prod/update-enabled status
- platform and architecture if safely available
- backend base URL as local-only `127.0.0.1:5030`
- sidecar state and port state
- HTTP ready and DB ready
- setup mode/config source with paths redacted
- update status summary
- diagnostic event totals by source, level, privacy, endpoint family
- latest redacted event summary
- redaction result
- export manifest version

Forbidden:

- raw data key, image key, API key, token, credential
- raw message body, search snippet, SQL, raw response body
- raw media key or SNS proxy URL
- full user path or DB/cache/media path
- unredacted contact/group/user identity

**TDD Steps:**

- [ ] Add report manifest tests:
  - Manifest includes app version/build channel/readiness/update/event totals.
  - Manifest path-like fields are redacted.
  - Manifest blocks export when unsafe content survives.

- [ ] Add Rust export guard tests only if payload/line semantics change:
  - Sensitive labels are redacted.
  - Unsafe values cause export failure.
  - Safe manifest lines write successfully.

**Acceptance:**

- User-triggered export explains app/sidecar/update/readiness/event state.
- Export is still a line-based or manifest-safe payload accepted by Rust.
- No raw private content appears in exported text.

**Verification:**

```powershell
pnpm test src\l2-coordinator\commander\diagnostics.test.ts
Push-Location src-tauri; cargo test diagnostics; Pop-Location
```

Run `cargo test diagnostics` only if Rust code changed. If not, document why Rust was not touched.

---

## Task A7: Diagnostics Surface Integration

**Purpose:** Make setup diagnostics, settings diagnostics, and workbench DevConsole share the same source of truth.

**Files:**
- Modify: `src/l3-molecule/setup/DiagnosticPanel.tsx`
- Modify: `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx`
- Modify: `src/l1-entry/pages/SettingsView.tsx` or settings diagnostics/about section if P4-A exposes diagnostics there.
- Modify: `src/l2-coordinator/commander/useDiagnosticsCommander.ts`

**Integration Requirements:**

- Setup side panel shows the redaction state and a safe diagnostics summary.
- Workbench DevConsole shows the full event table and detail drawer.
- Settings/About diagnostics section, if touched, shows export readiness and redaction state.
- Copy/export actions use the same manifest and fail-closed path.
- Status updates use `aria-live="polite"` or `role="alert"` depending on severity.

**TDD Steps:**

- [ ] Add diagnostics display tests:
  - blocked report disables copy/export or clearly blocks it.
  - export error is announced.
  - safe report hides private markers.

**Acceptance:**

- Users see one consistent diagnostics model, not three divergent summaries.
- No raw path or secret appears in setup or settings diagnostics.
- Export failure is recoverable and understandable.

**Verification:**

```powershell
pnpm test src\l3-molecule\diagnostics\diagnosticsDisplay.test.ts src\l2-coordinator\commander\diagnostics.test.ts
pnpm typecheck
```

If `diagnosticsDisplay.test.ts` is not created, run the equivalent component/helper tests that cover these assertions.

---

## Task A8: UI Acceptance And Browser Evidence

**Purpose:** Verify diagnostics/privacy changes are shippable UI, not just model tests.

**Files:**
- Modify: `specs/002-advanced-capabilities/e2e-matrix.md`
- Modify: `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md` only if P4-A extends existing evidence.
- Modify: `progress.md`

**Routes And Surfaces:**

- `/`
  - Setup diagnostics panel.
  - Service healthy / DB unavailable if mock state is available.
  - Privacy on/off.
- `/workbench?codex-smoke=workbench-ready`
  - DevConsole open.
  - Events empty state.
  - HTTP event state if synthetic event injection is available.
  - Failed-only filter.
  - Detail drawer.
  - Privacy on/off.
- `/settings`
  - Privacy control visible.
  - Diagnostics/about section if P4-A touches it.

**Viewport Checks:**

- 1440x900.
- 390x820.

**Required Assertions:**

- No page-level horizontal overflow.
- Filter toolbar does not clip text or buttons.
- Detail drawer is keyboard closeable.
- Event rows do not overlap.
- Icon buttons have labels/tooltips.
- `aria-live` announces export success/failure.
- Privacy mode hides synthetic private markers.
- Copy/export text is safe.

**Verification Options:**

- Prefer existing Playwright CLI/headless Chrome fallback if Browser plugin is unavailable.
- Do not add `@playwright/test` in P4-A unless implementation explicitly chooses to start P5-B.
- Use only synthetic data or privacy-on screenshots.

**Verification Commands:**

```powershell
pnpm dev
```

Then run browser checks through the available browser tool or local Playwright/Chrome script. Record the exact tool and result in `progress.md`.

---

## Implementation Evidence Through A8

Recorded during the 2026-06-02 implementation session:

- A1 expanded `DiagnosticEvent` with safe `correlationId` and fixed-enum `recoveryHint`, and added endpoint family, failed-only, and time-range store filters.
- A2 added the L2 diagnostic event bridge and wired production core/search/stats/chat readiness, semantic, graph, DB readiness/status, and semantic QA SSE HTTP diagnostics while keeping L4 independent.
- A3 converted UI/Tauri/updater/subscription/export failures into redacted local diagnostic events and removed P4-A-owned runtime console logging paths.
- A4 delivered DevConsole 2.0 view-model/UI support for source, level, privacy, endpoint, time, failed-only filters, status/duration/recovery labels, and safe detail rows.
- A5 expanded diagnostics redaction for media keys/paths, SNS proxy queries, SQL, raw request/response labels, local identity paths, credentials, and synthetic private markers.
- A6 added diagnostics manifest 2.0 as safe line-based report content and reused the existing fail-closed export path without changing Rust payload shape.
- A7 reused the shared diagnostics report model in setup, Settings/About, and Workbench DevConsole surfaces.
- A8 checked `/workbench?codex-smoke=workbench-ready` and `/settings` at `1440x900` and `390x820` with Vite plus cached Chromium DevTools Protocol. Both surfaces had no page-level horizontal overflow, no visible synthetic/private marker strings, and no sub-28px visible button targets after the DevConsole row min-height fix.
- Tooling caveat: Chromium profiles for browser evidence must stay outside the Vite project tree to avoid watcher reload churn.

This evidence does not claim P4-B/P4-C/P4-D/P4-E implementation, persistent P5-B E2E coverage, or P5-C packaged rerun coverage.

---

## Task A9: Documentation And Evidence Closeout

**Purpose:** Keep product specs and release evidence aligned with the new diagnostics/privacy behavior.

**Files:**
- Modify: `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`
- Modify: `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`
- Modify: `specs/002-advanced-capabilities/e2e-matrix.md`
- Modify: `specs/001-ready-desktop-app/release-evidence.md`
- Modify: `specs/001-ready-desktop-app/architecture-boundary-check.md`
- Modify: `docs/release/ready-desktop-app.md`
- Modify: `task_plan.md`, `findings.md`, `progress.md`

**Required Updates:**

- Link this P4-A plan from the P4/P5 master route map.
- Mark P4-A planning/execution state accurately.
- Document that diagnostic events are local-only and user-triggered export remains fail-closed.
- Add new scan results:
  - L1/L3 raw network.
  - L4-to-L2.
  - production diagnostic event wiring.
  - runtime console errors.
  - privacy marker scan.
- Update E2E matrix DevConsole/diagnostics rows if P4-A implementation changes readiness.
- Do not claim P5-B/P5-C completion.

**Acceptance:**

- No evidence claim exceeds actual verification.
- No old global emitter wording remains if implementation uses the current callback bridge.
- P4-A closeout does not imply P4-B/P4-C/P4-D features are implemented.

---

## Task A10: Final Verification

**Purpose:** Provide fresh evidence before any completion claim.

**Minimum Commands For P4-A Source Implementation:**

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
git diff --check
```

If Rust files changed:

```powershell
Push-Location src-tauri
cargo test
Pop-Location
```

If Tauri capabilities, CSP, sidecar startup, or packaging changed, which P4-A should avoid:

```powershell
pnpm tauri build
```

**Targeted Test Set:**

```powershell
pnpm test src\l4-atom\network\diagnosticEvents.test.ts src\l4-atom\network\httpClient.test.ts src\l2-coordinator\data-clerk\stores\useDiagnosticEventStore.test.ts src\l2-coordinator\commander\diagnosticEventViewModel.test.ts src\l2-coordinator\commander\diagnostics.test.ts src\utils\maskSecrets.test.ts
```

**Static Scans:**

```powershell
rg -n "@l4/network|@/l4-atom/network|fetch\(|EventSource|WebSocket|axios" src\l1-entry src\l3-molecule
rg -n "@l2|l2-coordinator" src\l4-atom
rg -n "onDiagnosticEvent|diagnostics:\s*\{" src\l2-coordinator src\l4-atom\network src\l3-molecule
rg -n "dataKey|data_key|api[_-]?key|token|secret|credential|password|wxid_|WeChat Files|C:\\\\Users" src specs docs e2e
rg -n "console\.(log|debug|info|warn|error)|alert\(" src\l1-entry src\l2-coordinator src\l3-molecule src\l4-atom
```

Expected interpretation:

- L1/L3 raw network scan should stay empty.
- L4-to-L2 scan should stay empty.
- `onDiagnosticEvent` should appear in production after A2, but only through L2-owned bridge/fetcher options, not L3.
- Sensitive marker scan must classify hits as tests, fixtures, redaction helpers, field names, or blockers.
- Runtime console scan should have no P4-A-owned raw error leakage.

**Completion Criteria:**

- Core setup/workbench/semantic/graph/update families can produce local redacted diagnostic events.
- DevConsole has source, level, privacy, endpoint, time, failed-only filters and safe detail drawer.
- Diagnostics export manifest includes app/sidecar/readiness/update/event summaries and fails closed.
- Privacy mode masks diagnostics visible text, accessible text, copy/export, and detail drawer content.
- UI acceptance checks are recorded for desktop and 390px.
- No Tauri CSP/capability broadening was introduced.
- No backend sidecar contract changed.

---

## Acceptance Checklist

- [x] Production diagnostic events are not test-only.
- [x] L4 remains independent from L2/L3/Zustand/Tauri.
- [x] L2 owns event recording and recovery suggestions.
- [x] DevConsole can filter by source, level, privacy, endpoint, time, and failed-only.
- [x] DevConsole detail drawer only shows safe attributes.
- [x] Diagnostics export is user-triggered and fail-closed.
- [x] Export manifest includes app version/build channel/sidecar/readiness/update/event summaries.
- [x] Privacy mode masks diagnostics rows, event detail, accessible labels, tooltips, copy, and export.
- [x] Synthetic redaction markers do not appear in production UI output.
- [x] Setup diagnostics, workbench DevConsole, and settings/about diagnostics use consistent report logic.
- [x] UI checked at 1440px and 390px.
- [x] `pnpm verify` passes or any failure is recorded with root cause.
- [x] `cargo test` runs if Rust changed.
- [x] Documentation and working memory are updated.

## Final Verification Evidence

Recorded after A10 on 2026-06-02:

- `pnpm lint` passed after adding `root: true` to `.eslintrc.cjs`, which prevents nested worktree lint runs from inheriting the parent repository ESLint config.
- `pnpm typecheck` passed.
- `pnpm test` passed: 47 test files / 241 tests.
- `pnpm build` passed: production Vite build transformed 2912 modules; `GraphCanvas` stayed a small lazy business chunk and the 3D vendor bundle remained in the explicit-click lazy vendor chunk.
- `pnpm verify` passed: lint, typecheck, test, and build all passed in sequence.
- `git diff --check` returned no whitespace errors; output only included CRLF normalization warnings.
- L1/L3 raw network scan returned no matches.
- L4-to-L2/Zustand scan returned no matches.
- Runtime console scan returned no matches.
- Production synthetic marker scan returned no UI/business-source matches; the only broader source hit was the intended `maskSecrets.ts` redaction denylist.
- `onDiagnosticEvent` production scan showed L2 bridge ownership and L4 opt-in callback sites, with no L3 diagnostic wiring.
- `cargo test` was not run because no Rust/Tauri source, CSP, capabilities, sidecar startup, or Rust diagnostics payload schema changed.

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Diagnostic events become telemetry | High trust loss | Keep local-only, no upload, user-triggered export only. |
| HTTP event wiring leaks query/body | High privacy risk | Endpoint-family metadata only; test keyword/chat/media/SNS/SQL cases. |
| L4 imports L2 store to emit events | Architecture regression | Use optional callback from L2 bridge; scan L4-to-L2. |
| DevConsole grows into full API runner | Scope creep | P4-A handles event console only; P4-D owns API runner. |
| Privacy mode hides too much operational state | Poor usability | Preserve counts/status/duration/endpoint family and only mask sensitive data. |
| Export path leaks local profile | Privacy risk | Show sanitized status/basename only; omit full path from visible/copy text in privacy mode. |
| Browser evidence relies on private data | Privacy risk | Use synthetic fixtures or privacy-on screenshots only. |
| Rust export change forces package build | Schedule risk | Avoid Rust changes unless manifest fail-closed tests require them; if touched, run cargo tests. |

## Handoff Notes For Implementation

- Start with A1/A2. Without production HTTP event wiring, DevConsole 2.0 has little live value.
- Keep implementation test-first. Do not add production code before seeing the relevant RED test fail.
- Prefer small slices:
  1. model/filter tests
  2. bridge tests
  3. one endpoint family wiring
  4. console view-model
  5. UI rendering
  6. export manifest
  7. browser evidence
- Do not implement P4-B media or P4-D raw tools while working P4-A.
- Do not paste real logs or private screenshots into evidence.

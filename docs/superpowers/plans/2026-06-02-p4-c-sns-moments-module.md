# P4-C SNS / Moments Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: Use `planning-with-files`, `executing-plans`, `test-driven-development`, `app-productization`, `ui-acceptance`, `frontend-design`, `sidecar-integration`, and `verification-before-completion` when implementing this plan. Use `systematic-debugging` or `chatlog-debug` if any API, UI, test, build, sidecar, or browser acceptance failure appears. Do not use subagents unless the user explicitly asks for subagent or parallel agent work.

**Goal:** Bring `chatlog_alpha` SNS/朋友圈 browsing, notifications, search, and media preview into the desktop workbench as a first-class local-private-data module.

**Architecture:** Preserve the L1/L2/L3/L4 boundary. L4 owns raw SNS HTTP fetchers, backend-shaped raw types, adapters, and safe local proxy URL validation. L2 owns SNS state, filters, request orchestration, diagnostics, error translation, and privacy-aware view models. L3 renders timeline/search/notification/media/detail views from props and callbacks only. L1 only places the SNS module in the workbench shell and delegates actions.

**Tech Stack:** React 18, TypeScript 5, Zustand, Tailwind CSS v4/project tokens, lucide-react, Vitest, Tauri v2 CSP already reviewed for local media playback, local `chatlog_alpha` HTTP on `http://127.0.0.1:5030`.

---

## Source Baseline Read

This plan is based on the current source and documents as of 2026-06-02:

- `AGENTS.md`
- `开发指南.md`
- `docs/总体开发规划.md`
- `docs/ui-functional-audit-and-redesign-plan.md`
- `task_plan.md`
- `findings.md`
- `progress.md`
- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`
- `docs/superpowers/plans/2026-06-01-p4-p5-0-capability-diagnostics-e2e-foundation.md`
- `docs/superpowers/plans/2026-06-02-p4-a-developer-diagnostics-privacy-mode-2.md`
- `specs/001-ready-desktop-app/spec.md`
- `specs/001-ready-desktop-app/plan.md`
- `specs/001-ready-desktop-app/release-evidence.md`
- `specs/001-ready-desktop-app/architecture-boundary-check.md`
- `specs/002-advanced-capabilities/capability-matrix.md`
- `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`
- `specs/002-advanced-capabilities/e2e-matrix.md`
- `specs/002-advanced-capabilities/e2e-fixture-plan.md`
- `specs/002-advanced-capabilities/test-data-policy.md`
- `e2e/fixtures/advanced-capabilities.json`
- Current P4-B implementation files in `src/l4-atom/network`, `src/l2-coordinator/commander`, `src/l2-coordinator/data-clerk/stores`, `src/l3-molecule/media`, `src/l1-entry/pages/WorkbenchView.tsx`, and `src/styles/workbench-content.css`.
- Local `chatlog_alpha` source at `E:\OneDrive - Default Directory\chatlog_alpha`, specifically `internal/model/sns.go`, `internal/chatlog/http/route.go`, `internal/chatlog/http/sns_media.go`, `cmd/chatlog/cmd_http.go`, and `README.md`.

Older product language about heavy glass, fake traffic lights, and aggressive port cleanup is treated as historical context. Current active constraints are AGENTS, ready-desktop evidence, strict local privacy, safe diagnostics, and the L1/L2/L3/L4 architecture.

## Current Baseline

### Completed Prerequisites

- P4/P5-0 created the advanced capability matrix, privacy diagnostics contract, synthetic fixture policy, E2E matrix, diagnostic event foundation, and synthetic advanced fixture.
- P4-A implemented production diagnostic bridge, DevConsole 2.0, manifest 2.0, redaction expansion for SNS proxy values, and no-telemetry local diagnostics.
- Current P4-B branch `codex/p4b-media-chat-extensions` adds media/chat-extension L4 fetchers, typed media adapters, `useMediaStore`, `useMediaCommander`, `MediaLibrary`, `MediaPreviewSheet`, Workbench media rail entry, attachment summaries, and minimal `media-src` CSP for local sidecar playback.
- P4-B verification is recorded as passing for targeted tests, lint, typecheck, test, build, verify, cargo test, mocked UI smoke, and `pnpm tauri build`. This branch is still dirty and not assumed to be merged into `master`.

### Confirmed Current Gaps

- No SNS-specific frontend modules exist. `rg` finds no `src/l4-atom/network/fetchSns*`, `snsAdapters.ts`, `useSnsStore`, `useSnsCommander`, or `src/l3-molecule/sns/*`.
- `src/l4-atom/network/index.ts` exports P4-B media/chat extension fetchers, but no SNS fetchers.
- `WorkbenchModule` currently includes `chat | stats | media | ai | graph | settings`; SNS is not a workbench module.
- `e2e/fixtures/advanced-capabilities.json` contains only shallow SNS rows (`summary`, `media_count`, `timestamp`) and is not backend-shaped enough for P4-C adapter tests.
- `specs/002-advanced-capabilities/capability-matrix.md` still marks SNS as `documented`. P4-C implementation should move it to source-verified/implemented only after targeted code and UI evidence exist.
- The P4/P5 master route map contains a short P4-C placeholder. This dedicated plan is the implementation handoff for P4-C.

### Backend Contract Evidence

`chatlog_alpha` registers these SNS endpoints:

- `GET /api/v1/sns_notifications`
- `GET /api/v1/sns_feed`
- `GET /api/v1/sns_search`
- `GET /api/v1/sns/media/proxy`

`sns_notifications` query behavior:

- Supported query values in current handler: `format`, `limit`, `time`, `since`, `until`, `include_read`.
- JSON response shape: `{ notifications, total }`.
- Notification rows include `type`, `time`, `timestamp`, `from_username`, `from_nickname`, `content`, `feed_id`, `feed_author`, `feed_author_username`, and `feed_preview`.

`sns_feed` query behavior:

- Supported query values in current handler: `format`, `limit`, `user`, `time`, `since`, `until`, plus media behavior consumed by `enrichSNSPostMedia`: `media`, `replace`.
- JSON response shape: `{ count, items }`.
- Feed rows include `id`, `timestamp`, `time`, `username`, `display`, `content`, `raw_content`, `content_type`, `location`, `media_list`, `article`, and `finder_feed`.

`sns_search` query behavior:

- Required query value: `keyword`.
- Supported query values in current handler: `format`, `limit`, `user`, `time`, `since`, `until`, plus `media` and `replace` through `enrichSNSPostMedia`.
- JSON response shape: `{ count, items }`.
- Search rows use the same row shape as feed rows, except `display` may be absent.

`sns/media/proxy` behavior:

- Required query value: `url`.
- Optional query value: `key`; `key=0` can be resolved from the sidecar cache after feed/search has parsed that SNS media URL.
- Returns binary image/video data with content type after decryption.
- README states `sns_feed` and `sns_search` return `media_list` with proxy addresses that can be accessed directly.
- The proxy URL query contains sensitive `url` and maybe `key`; it must never enter diagnostics, copy/export text, visible labels, alt text, title text, logs, or screenshots as raw text.

## Product Direction

P4-C is a user-facing Library module, not a developer console and not a generic endpoint runner.

- Add a first-class `朋友圈` module in Workbench navigation near `媒体`.
- Default to a dense timeline with compact filters and a detail inspector.
- Keep SNS search in the same module rather than using a separate route.
- Render notifications as a compact secondary tab/badge, only if backend data exists.
- Treat media preview as local-private content. Show image/video/live-photo placeholders and recoverable proxy errors, but do not expose raw URLs or keys.
- Use the current workbench operational style: restrained colors, project CSS variables, compact lists, segmented controls, lucide icons, stable dimensions, and no marketing/hero layout.
- At 390px, SNS must collapse to one column/list-first behavior without horizontal overflow.

## Scope

### In Scope

- Backend-shaped raw SNS TypeScript types for feed, search, notifications, media, location, article, and finder feed rows.
- L4 adapters that normalize SNS backend rows into safe display models and strip or classify sensitive fields.
- L4 fetchers for SNS feed, search, notifications, and local proxy URL validation.
- L2 `useSnsStore`, `useSnsCommander`, and any SNS view model helpers needed for filters, loading state, selected post, search, notifications, retry, and privacy display.
- L3 `SnsModule`, `SnsTimeline`, `SnsSearchPanel`, `SnsMediaGrid`, `SnsDetailInspector`, and `snsDisplay` helpers.
- Workbench rail/toolbar/inspector integration for a `sns` module.
- Synthetic backend-shaped SNS fixture expansion in `advanced-capabilities.json`.
- P4-C targeted tests, architecture scans, privacy scans, and UI acceptance requirements.
- Documentation updates to keep P4/P5 planning and `specs/002` from drifting.

### Out Of Scope

- Posting, deleting, liking, commenting, or modifying SNS content.
- Changing `chatlog_alpha` sidecar behavior or adding an opaque SNS proxy ID endpoint.
- Raw XML viewer for `raw_content`.
- Generic remote media proxying or arbitrary URL input.
- True offset pagination. The current SNS handlers use `limit` and internal filtering but do not expose `offset`; P4-C should use refresh and adjustable limit/load-more-by-limit only.
- Downloading SNS media to disk unless a later permission review approves file writes.
- DB explorer, API runner, Hook/Hermes, MCP, semantic residuals, or graph residuals.
- Real WeChat data, real SNS screenshots, real media binaries, or committed local cache artifacts.

## Key Decisions

| Decision | Value |
| --- | --- |
| Module placement | Add `sns` as a Workbench Library/inspector module after `media` and before `ai`. Do not bury SNS inside DevConsole or DB tools. |
| Query defaults | Use `format=json`, `limit=50` for feed/notifications, `media=1`, `replace=1`, and explicit `time/since/until/user/keyword` only when set by L2. |
| Pagination | Do not pretend offset pagination exists. Implement refresh and "load more" by increasing `limit` with clear UI copy if needed. |
| Media proxy | Use only local sidecar proxy URLs from backend output or validated local proxy URL builders. Never render or log external SNS media URL/key as text. |
| Raw XML | Drop `raw_content` from UI models by default. Keep only a boolean such as `hasRawContent` if useful for debugging status. |
| Diagnostics | Reuse P4-A `createDiagnosticHttpOptions()`. SNS events record endpoint family/status/duration/count only, not keyword, user, proxy URL, media key, raw XML, content, or result bodies. |
| Privacy mode | Use existing `settings.privacyOn`. Mask authors, nicknames, content, locations, article/finder titles, media thumbnails, alt text, tooltips, selected detail text, notifications, and search result snippets. Preserve counts, dates, content type, and safe state labels. |
| CSP | P4-B already added minimal local `media-src`. P4-C should not broaden CSP unless implementation proves a new local-only requirement. Any CSP change triggers `cargo test` and `pnpm tauri build`. |
| Fixture policy | Expand `advanced-capabilities.json` with backend-shaped synthetic SNS rows. No real names, IDs, URLs, media files, raw XML from real data, or raw query strings. |

## File Map

### Create New Files

- `src/l4-atom/network/snsAdapters.ts`
- `src/l4-atom/network/snsAdapters.test.ts`
- `src/l4-atom/network/fetchSnsFeed.ts`
- `src/l4-atom/network/fetchSnsSearch.ts`
- `src/l4-atom/network/fetchSnsNotifications.ts`
- `src/l4-atom/network/fetchSnsEndpoints.test.ts`
- `src/l2-coordinator/data-clerk/stores/useSnsStore.ts`
- `src/l2-coordinator/data-clerk/stores/useSnsStore.test.ts`
- `src/l2-coordinator/commander/useSnsCommander.ts`
- `src/l2-coordinator/commander/snsViewModel.ts`
- `src/l2-coordinator/commander/snsViewModel.test.ts`
- `src/l3-molecule/sns/snsDisplay.ts`
- `src/l3-molecule/sns/snsDisplay.test.ts`
- `src/l3-molecule/sns/SnsModule.tsx`
- `src/l3-molecule/sns/SnsTimeline.tsx`
- `src/l3-molecule/sns/SnsSearchPanel.tsx`
- `src/l3-molecule/sns/SnsMediaGrid.tsx`
- `src/l3-molecule/sns/SnsDetailInspector.tsx`

### Modify Existing Files

- `src/l4-atom/network/chatlogRawTypes.ts`
- `src/l4-atom/network/index.ts`
- `src/l2-coordinator/data-clerk/stores/index.ts`
- `src/l2-coordinator/commander/index.ts`
- `src/l2-coordinator/commander/workbenchViewModel.ts`
- `src/l2-coordinator/commander/workbenchViewModel.test.ts`
- `src/l2-coordinator/commander/useWorkbenchCommander.ts`
- `src/l1-entry/pages/WorkbenchView.tsx`
- `src/styles/workbench-content.css`
- `e2e/fixtures/advanced-capabilities.json`
- `specs/002-advanced-capabilities/capability-matrix.md`
- `specs/002-advanced-capabilities/e2e-matrix.md`
- `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`
- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`
- `task_plan.md`
- `findings.md`
- `progress.md`

### Do Not Modify Unless Proven Necessary

- `src-tauri/tauri.conf.json`, unless SNS media needs a new local-only CSP rule beyond P4-B `media-src`.
- Rust/Tauri sidecar code, unless diagnostics/export or CSP behavior changes.
- `chatlog_alpha` backend source.

## Task C0: Baseline, Contract, And Fixture Freeze

**Purpose:** Prevent P4-C from guessing API shape or using the shallow current fixture.

**Files:**

- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `task_plan.md`
- Modify: `e2e/fixtures/advanced-capabilities.json`
- Modify: `specs/002-advanced-capabilities/capability-matrix.md`

**Steps:**

- [ ] Record current branch and dirty-worktree baseline.
- [ ] Confirm the implementation starts from a branch that includes P4-B media/CSP work, or explicitly merge/rebase P4-B before coding.
- [ ] Capture the SNS backend contract from local `chatlog_alpha`:
  - `/api/v1/sns_notifications`
  - `/api/v1/sns_feed`
  - `/api/v1/sns_search`
  - `/api/v1/sns/media/proxy`
- [ ] Expand `advanced-capabilities.json` SNS sections to include backend-shaped synthetic rows:
  - notification row with comment and like cases
  - feed row with `content_type=image`, location, media list, article, and finder fields
  - search row with matched synthetic content
  - media item with proxy URL placeholder classified as synthetic and local-only
- [ ] Ensure fixture text uses synthetic prefixes and does not include real `wxid_*`, raw external media URLs, raw query strings, local paths, or real names.
- [ ] Update capability matrix SNS rows from vague "Future SNS module" to source-verified P4-C planned file ownership, while keeping status `documented` or `planned` until code exists.

**Acceptance:**

- SNS fixture rows match the Go handler response shape closely enough for adapter tests.
- No raw external SNS URL/key/query is committed in fixture text.
- The task memory says whether P4-B is the implementation baseline.

## Task C1: L4 SNS Raw Types And Adapters

**Purpose:** Normalize backend-shaped SNS rows before any UI renders them.

**Files:**

- Modify: `src/l4-atom/network/chatlogRawTypes.ts`
- Create: `src/l4-atom/network/snsAdapters.ts`
- Create: `src/l4-atom/network/snsAdapters.test.ts`

**Steps:**

- [ ] Add raw interfaces for:
  - feed/search response `{ count, items }`
  - notification response `{ notifications, total }`
  - SNS post row, notification row, media item, live photo, location, article, and finder feed
- [ ] Write RED adapter tests proving:
  - feed/search rows adapt `id`, `timestamp`, `time`, `author`, `content`, `contentType`, safe media count, location summary, article/finder summaries, and selected post metadata
  - notifications adapt comment/like cases without leaking actor IDs in privacy-sensitive display helpers
  - adapter output omits `raw_content`, raw media URL, raw thumb URL, token, key, raw XML, and raw query text
  - media proxy fields are classified as sensitive and only exposed through a safe media descriptor
  - malformed/missing fields produce stable fallback rows instead of throwing
- [ ] Implement the adapter with strict defaults:
  - empty strings become safe fallback labels
  - unknown content types become `text` or `unknown`
  - media dimensions/duration are optional metadata
  - location becomes a display summary, not raw lat/long by default
- [ ] Add helper classification for media kinds: image, video, live_photo, article_cover, finder_video, unknown.

**Acceptance:**

- Adapter tests pass.
- `JSON.stringify(adapted)` does not contain raw XML, raw URL, token, key, or synthetic private markers.

## Task C2: L4 SNS Fetchers And Proxy URL Safety

**Purpose:** Make SNS HTTP access typed, local-only, JSON-by-default, and diagnostic-safe.

**Files:**

- Create: `src/l4-atom/network/fetchSnsFeed.ts`
- Create: `src/l4-atom/network/fetchSnsSearch.ts`
- Create: `src/l4-atom/network/fetchSnsNotifications.ts`
- Create: `src/l4-atom/network/fetchSnsEndpoints.test.ts`
- Modify: `src/l4-atom/network/index.ts`

**Steps:**

- [ ] Write RED fetcher tests that intercept `globalThis.fetch` and assert:
  - every SNS fetcher appends `format=json`
  - feed/search pass `limit`, `user`, `since`, `until`, `media=1`, and `replace=1` only from typed options
  - search rejects or surfaces empty keyword before calling backend
  - notifications supports `include_read`, `limit`, and time filters
  - diagnostics emit endpoint families `sns_feed`, `sns_search`, and `sns_notifications` without raw keyword/user/query/media URL/key
- [ ] Implement fetchers with `requestJson()` and `withRequestDiagnostics()`.
- [ ] Validate proxy URLs before UI use:
  - accept only `http://127.0.0.1:5030/api/v1/sns/media/proxy?...` or `http://localhost:5030/api/v1/sns/media/proxy?...`
  - reject remote hosts
  - never expose query text in display helpers
- [ ] Export SNS fetchers and adapted types from `src/l4-atom/network/index.ts`.

**Acceptance:**

- Fetcher tests pass.
- L4 files do not import L2, Zustand, Tauri state, or L3.
- Diagnostics event payloads contain endpoint family and status only.

## Task C3: L2 SNS Store, View Model, And Commander

**Purpose:** Keep SNS orchestration in L2 and avoid L3 direct network calls.

**Files:**

- Create: `src/l2-coordinator/data-clerk/stores/useSnsStore.ts`
- Create: `src/l2-coordinator/data-clerk/stores/useSnsStore.test.ts`
- Create: `src/l2-coordinator/commander/useSnsCommander.ts`
- Create: `src/l2-coordinator/commander/snsViewModel.ts`
- Create: `src/l2-coordinator/commander/snsViewModel.test.ts`
- Modify: `src/l2-coordinator/data-clerk/stores/index.ts`
- Modify: `src/l2-coordinator/commander/index.ts`

**Steps:**

- [ ] Add store state:
  - `status: idle | loading | ready | empty | error`
  - `feed`, `notifications`, `searchResults`
  - `selectedPostId`
  - `activeTab: timeline | search | notifications`
  - filters: `user`, `since`, `until`, `contentType`, `mediaOnly`, `includeRead`, `limit`
  - search query and search status
  - safe error message
- [ ] Add store actions for loading/data/error/filter/search/selection/reset.
- [ ] Write RED store tests for empty/ready/error transitions, filter updates, selected post, and reset.
- [ ] Add `snsViewModel` helpers for:
  - badge counts
  - filtered content type options
  - privacy-aware title/subtitle
  - selected post lookup
  - safe empty/error/retry copy
  - "load more by limit" state without implying true offset pagination
- [ ] Implement `useSnsCommander()`:
  - load feed and notifications when SNS module opens
  - run search only when keyword is non-empty
  - pass P4-A diagnostic options with endpoint families
  - translate backend errors into recoverable UI messages
  - avoid storing raw query/body/response in errors

**Acceptance:**

- Store and view-model tests pass.
- L2 owns all fetch calls; L3 receives props and callbacks.
- Search keyword may be sent to the sidecar, but must not enter diagnostics or exports.

## Task C4: Workbench SNS Module Integration

**Purpose:** Make SNS a first-class workbench module without disrupting chat/media/AI/graph flows.

**Files:**

- Modify: `src/l2-coordinator/commander/workbenchViewModel.ts`
- Modify: `src/l2-coordinator/commander/workbenchViewModel.test.ts`
- Modify: `src/l2-coordinator/commander/useWorkbenchCommander.ts`
- Modify: `src/l1-entry/pages/WorkbenchView.tsx`

**Steps:**

- [ ] Extend `WorkbenchModule` with `sns`.
- [ ] Insert `朋友圈` rail item after `media`.
- [ ] Add SNS badge rules:
  - loading: `加载中`
  - error: `异常`
  - notification count: capped count
  - feed count: capped count
  - empty: no badge or `无数据` depending on existing rail convention
- [ ] Update `getInspectorTitle()` and `isInspectorModule()` for SNS.
- [ ] Make `useWorkbenchCommander()` open SNS in the inspector and call `useSnsCommander().loadSnsModule()` when active.
- [ ] Stop AI stream and cancel graph load when switching away, preserving existing behavior.
- [ ] Render `SnsModule` from `WorkbenchView` with only L2-provided props/callbacks.
- [ ] Keep settings navigation behavior unchanged.

**Acceptance:**

- Workbench view-model tests show module order `chat, stats, media, sns, ai, graph, settings`.
- SNS panel opens from rail and toolbar where applicable.
- No L1 business logic beyond placement and delegation.

## Task C5: L3 SNS Timeline, Search, Notifications, Media, And Detail UI

**Purpose:** Provide the actual SNS browsing experience with complete states.

**Files:**

- Create: `src/l3-molecule/sns/snsDisplay.ts`
- Create: `src/l3-molecule/sns/snsDisplay.test.ts`
- Create: `src/l3-molecule/sns/SnsModule.tsx`
- Create: `src/l3-molecule/sns/SnsTimeline.tsx`
- Create: `src/l3-molecule/sns/SnsSearchPanel.tsx`
- Create: `src/l3-molecule/sns/SnsMediaGrid.tsx`
- Create: `src/l3-molecule/sns/SnsDetailInspector.tsx`
- Modify: `src/styles/workbench-content.css`

**Steps:**

- [ ] Add display helpers for:
  - author label
  - content preview
  - notification label
  - content type label
  - media tile label
  - location/article/finder summaries
  - proxy error copy
  - privacy-on masking
- [ ] Write RED display tests proving privacy mode masks:
  - authors and nicknames
  - content and search snippets
  - notification actor/content
  - location/POI
  - article/finder titles and URLs
  - media alt/title/tooltips
  - proxy URL/key strings
- [ ] Implement `SnsModule` with:
  - header summary
  - segmented tabs for timeline/search/notifications
  - compact filters
  - refresh and retry actions
  - loading, empty, error, success states
- [ ] Implement timeline list:
  - stable row height/min dimensions
  - date, safe author/content type/media count
  - selected row state
  - no raw XML or URL text
- [ ] Implement search panel:
  - search input and explicit search action
  - no-results state
  - result list with safe highlight summary, not raw HTML
  - clear search action
- [ ] Implement media grid/detail:
  - image/video/live-photo placeholders
  - local proxy media preview using sensitive `src` only, never visible text
  - load/error fallback
  - no download-to-disk action in P4-C
- [ ] Implement notification view:
  - comment/like rows
  - include-read toggle if exposed by L2
  - empty state for no unread notifications
- [ ] Add CSS under existing workbench tokens:
  - no nested cards
  - no decorative orbs/gradients
  - 28px+ interactive hit targets
  - 390px single-column behavior
  - long text wraps without overlap

**Acceptance:**

- L3 does not import L4 network atoms or L2 stores.
- SNS renders loading, empty, error, success, retry, privacy-on, and narrow-width states.
- No visible text, alt text, title, tooltip, or copy helper contains proxy query, key, token, raw URL, or raw XML.

## Task C6: Privacy, Diagnostics, And Export Hardening

**Purpose:** Ensure SNS does not become the first module to leak private social data.

**Files:**

- Modify: `src/utils/maskSecrets.ts` if tests prove SNS-specific gaps.
- Modify: `src/utils/maskSecrets.test.ts` if needed.
- Modify: `src/l2-coordinator/commander/diagnostics.test.ts` if report/export rules need coverage.
- Modify: `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`

**Steps:**

- [ ] Add tests for SNS-specific redaction gaps only if current P4-A redaction does not cover them:
  - `sns/media/proxy?url=...&key=...`
  - `raw_content`
  - `raw_url`
  - `raw_thumb`
  - `token`
  - `feed_id`
  - article/finder external URLs
- [ ] Ensure diagnostic events for SNS fetchers include only:
  - endpoint family
  - method
  - status
  - duration
  - count summary if available
  - retryable/error category
- [ ] Ensure diagnostic exports do not include:
  - search keyword
  - user filter
  - feed text
  - notification content
  - proxy URL
  - media key/token
  - raw XML
- [ ] Update privacy diagnostics contract with P4-C implementation notes.

**Acceptance:**

- Privacy-on SNS screenshot is safe by default.
- Diagnostics copy/export cannot surface SNS query, content, media URL, or key.

## Task C7: Documentation And Matrix Sync

**Purpose:** Keep the planning and specs aligned with the new P4-C implementation.

**Files:**

- Modify: `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`
- Modify: `specs/002-advanced-capabilities/capability-matrix.md`
- Modify: `specs/002-advanced-capabilities/e2e-matrix.md`
- Modify: `specs/002-advanced-capabilities/README.md`
- Modify: `specs/001-ready-desktop-app/release-evidence.md` only if P4-C produces source/UI evidence worth recording
- Modify: `docs/release/ready-desktop-app.md` only if the user-visible release surface changes materially
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

**Steps:**

- [ ] Link this P4-C dedicated plan from the P4/P5 master route map.
- [ ] Update SNS matrix rows to reflect actual files, tests, and status after implementation.
- [ ] Update E2E matrix SNS row with evidence if browser acceptance is run.
- [ ] Record no sidecar contract change, no telemetry, no remote generic client, and CSP impact.
- [ ] Keep P5-B/P5-C persistent E2E/release gates clearly separate from P4-C source/UI evidence.

**Acceptance:**

- Future workers can find this plan from the master P4/P5 route map.
- Docs do not claim packaged release readiness unless packaged smoke is actually rerun.

## Task C8: UI Acceptance And Browser Evidence

**Purpose:** Verify SNS is usable at desktop and narrow widths with synthetic data.

**Files:**

- No mandatory source file if checks pass.
- Update `progress.md` and optionally `specs/002-advanced-capabilities/e2e-matrix.md` with evidence.

**Steps:**

- [ ] Start Vite with a known local URL.
- [ ] Use a local mock or fetch interception for SNS endpoints:
  - feed success with image/video/article/finder rows
  - feed empty
  - search no results
  - search results
  - notifications empty and ready
  - proxy/media failure
- [ ] Check `/workbench?codex-smoke=workbench-ready` at `1440x900`.
- [ ] Check `/workbench?codex-smoke=workbench-ready` at `390x820` or similar narrow width.
- [ ] Assert:
  - SNS rail/toolbar entry visible
  - no page-level horizontal overflow
  - filters and segmented tabs fit
  - selected detail remains closeable
  - media grid does not resize/shift unexpectedly
  - privacy mode hides synthetic private markers
  - browser console has no app-owned raw SNS errors
  - visible text does not include `sns-secret-key`, `raw_url`, `raw_content`, external SNS URL, or local path
- [ ] Stop dev server and remove temporary smoke artifacts.

**Acceptance:**

- UI evidence covers desktop and narrow width.
- Evidence uses synthetic fixture data only.

## Task C9: Final Verification

**Purpose:** Prove the implemented P4-C slice is healthy before calling it complete.

**Minimum Source Verification:**

```powershell
pnpm test src\l4-atom\network\snsAdapters.test.ts src\l4-atom\network\fetchSnsEndpoints.test.ts src\l2-coordinator\data-clerk\stores\useSnsStore.test.ts src\l2-coordinator\commander\snsViewModel.test.ts src\l3-molecule\sns\snsDisplay.test.ts
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

**Architecture Scans:**

```powershell
rg -n "@l4/network|@/l4-atom/network|fetch\(|EventSource|WebSocket|axios" src\l1-entry src\l3-molecule
rg -n "@l2|l2-coordinator|zustand" src\l4-atom\network
rg -n "@l2|l2-coordinator|useSnsStore" src\l3-molecule\sns
```

**Privacy Scans:**

```powershell
rg -n "sns-secret|raw_content|raw_url|raw_thumb|sns/media/proxy\\?|token=|key=|wxid_real|C:\\\\Users\\\\" src docs specs e2e
rg -n "console\\.(log|debug|info|warn|error)|alert\\(" src\l1-entry src\l2-coordinator src\l3-molecule src\l4-atom
```

If any scan intentionally matches tests or redaction helpers, record why in `progress.md` rather than deleting the scan.

**Tauri/Rust Verification:**

Run these only if P4-C changes Tauri CSP, capabilities, Rust commands, sidecar startup, diagnostics export payload shape, or packaged behavior:

```powershell
cd src-tauri
cargo test
cd ..
pnpm tauri build
```

**Acceptance:**

- Targeted P4-C tests pass.
- Full frontend verify passes.
- UI acceptance evidence exists or any skipped UI evidence is documented with blocker and owner.
- No sidecar contract change is made unless explicitly documented.
- No raw SNS content, proxy URL, media key, token, local path, or private identifier leaks into visible UI, diagnostics, logs, screenshots, fixtures, or docs.

## Implementation Evidence Through C8

P4-C source/UI implementation was completed on 2026-06-02 on the current `codex/p4b-media-chat-extensions` development branch.

- C0 fixture/matrix: `advanced-capabilities.json` now has backend-shaped SNS feed/search/notifications rows with synthetic data only, and the capability matrix records actual P4-C ownership.
- C1-C2 L4: `snsAdapters.ts`, `fetchSnsFeed.ts`, `fetchSnsSearch.ts`, and `fetchSnsNotifications.ts` are implemented and covered by targeted tests. Adapter output omits raw XML, raw URLs, token, key, and proxy query text from enumerable state.
- C3-C4 L2/Workbench: `useSnsStore`, `snsViewModel`, `useSnsCommander`, Workbench rail/badge/title integration, and L1 placement are implemented. L3 receives props/callbacks only.
- C5 UI: `SnsModule`, `SnsTimeline`, `SnsSearchPanel`, `SnsMediaGrid`, and `SnsDetailInspector` are implemented with loading, empty, error, success, retry, filters, notifications, media placeholders, and plain text search highlights.
- C6 privacy/diagnostics: P4-C made no new diagnostics export payload or CSP changes. SNS diagnostics use endpoint families only through the existing P4-A bridge; display helpers avoid visible proxy URL/key/raw XML output.
- C8 UI acceptance: mocked Playwright route interception checked `/workbench?codex-smoke=workbench-ready` at desktop and `390x780`; an initial compressed desktop inspector layout was fixed and rerun successfully.
- Scope note: no `chatlog_alpha` sidecar contract changes, no Rust/Tauri changes, no new telemetry, no generic remote client, and no fake offset pagination.

## Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Backend proxy URL query contains sensitive `url` and `key` | High privacy risk | Treat proxy URL as sensitive implementation detail; never show/copy/export/log it; tests assert display helpers and diagnostics omit it. |
| Current backend lacks offset pagination | UI could imply unsupported behavior | Use refresh and limit increase only; document true offset pagination as out of scope until backend contract changes. |
| Raw XML accidentally reaches UI or diagnostics | Critical privacy risk | Adapter drops `raw_content`; tests stringify adapted models and scan output. |
| Remote SNS media URL leaks through failed image/video events | High privacy risk | Validate local proxy host/path only; on media failure show redacted endpoint label such as `sns:media-proxy`. |
| SNS UI becomes too card-heavy or decorative | Product quality drift | Use dense timeline/list/detail and existing workbench tokens; no hero, nested cards, or decorative backgrounds. |
| P4-B branch is not merged before P4-C execution | Missing media/CSP baseline | Confirm baseline at C0; either implement on top of P4-B branch or merge/rebase before P4-C coding. |
| Diagnostic events include search keyword or user filter | Private data leakage | L2 diagnostics passes endpoint family only; tests with synthetic private keyword/user prove omission. |
| Browser evidence depends on real sidecar data | Privacy and repeatability risk | Use synthetic fixture/mock intercepts only. |

## Handoff Notes

- Do not paste full implementation code into this plan. The plan intentionally names files, contracts, states, tests, and validation commands rather than embedding source.
- P4-C implementation should start with adapter/fetcher tests, then L2 state/view model, then Workbench integration, then L3 UI.
- A reviewer should reject a P4-C implementation that adds direct network calls in L1/L3, logs SNS query strings, renders raw proxy URLs, or claims pagination that the backend does not support.

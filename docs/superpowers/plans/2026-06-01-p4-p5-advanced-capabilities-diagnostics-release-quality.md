# P4/P5 Advanced Capabilities, Diagnostics, Privacy, E2E, And Release Quality Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: `planning-with-files`, `writing-plans`, `brainstorming`, `frontend-design`, `ui-acceptance`, `sidecar-integration`, `app-productization`, `release-gate`, `verification-before-completion`. Use `test-driven-development` for every implementation task after this planning phase. Use `playwright` or a project E2E harness for browser evidence. Do not use subagents unless the user explicitly asks for them.

**Goal:** Complete the next productization stage after P2-E by covering `chatlog_alpha` original advanced Web capabilities, upgrading diagnostics/privacy to handle raw-data-heavy tools, and turning the current manual release evidence into repeatable E2E, visual, and release-quality gates.

**Baseline:** P2-E packaged Windows gate is complete. The current app can install, launch, start its app-managed sidecar, pass `/health`, export a redacted packaged diagnostics artifact, quit without leaving the sidecar alive, reopen, and handle an unknown `5030` port occupant without killing it. P4/P5 must build on that baseline instead of repeating P2-E.

**Architecture:** Keep the existing four-layer contract. L1 routes and view shells delegate. L2 owns orchestration, state, privacy decisions, diagnostic event normalization, and error translation. L3 molecules receive props and callbacks. L4 network/system atoms own raw HTTP/SSE/Tauri calls and must not import L2/L3.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS v4/project variables, Tauri v2, Rust sidecar commands, `chatlog_alpha` HTTP/SSE endpoints on `http://127.0.0.1:5030`, Vitest, Rust tests, GitHub Actions, Playwright-style browser automation.

---

## Current Status

| Area | Current state | P4/P5 implication |
| --- | --- | --- |
| Core setup and packaging | P2-E Windows x64 packaged smoke passed with synthetic data. | Treat startup, quit cleanup, and unknown port handling as protected release contracts. |
| Core workbench | Chat, search, stats, settings, semantic, and graph MVP exist. | P4 modules should enter the workbench as grouped modules, not as ad hoc overlays. |
| Original advanced capabilities | Media, SNS, DB explorer, hook/push, favorites, members, unread/new_messages, MCP/wx-cli runner are missing or only represented by old plans. | P4 must map each original `chatlog_alpha` capability to a UI entry or explicit non-goal. |
| Diagnostics | Basic sidecar log capture and redacted diagnostics export exist. | P4 must add HTTP/UI/Tauri/updater/release event diagnostics before exposing raw tools. |
| Privacy mode | Core chat/search/stats/semantic/graph/diagnostics have partial coverage and tests. | Every P4 surface must define visible text, aria text, copy/export, screenshots, and raw response behavior under privacy mode. |
| E2E/visual | Evidence exists from one-off Playwright/Chrome/UIA/manual smoke sessions, not a stable suite. | P5 must make high-value flows repeatable and CI-friendly. |
| Release pipeline | `.github/workflows/build-check.yml` and `release.yml` exist. Updater signing checks exist. | P5 must close sidecar artifact acquisition, updater verification, platform smoke, and release evidence automation. |
| Sidecar artifact source | `cmd/chatlog` is not present in this repo; `src-tauri/binaries/` is ignored. CI check can create placeholder binaries, but release mode needs real sidecar binaries or source. | This is a P5 release-quality blocker for real GitHub release reproducibility. |
| CSP | `img-src` allows `127.0.0.1:5030`; `media-src` is not explicit. | P4 media/video/voice needs a deliberate CSP review and test. |

---

## Priority Order

1. **P4/P5-0: Capability matrix, diagnostics/privacy baseline, and E2E fixture foundation.**
   This must happen first because media, SNS, DB, hook, and raw endpoint tools all expose sensitive data and need stable fixtures/tests.

2. **P4-A: Diagnostics and privacy mode 2.0.**
   Add a redaction-first event pipeline and screenshot/export rules before raw data surfaces expand.
   Dedicated implementation plan: `docs/superpowers/plans/2026-06-02-p4-a-developer-diagnostics-privacy-mode-2.md`.

3. **P4-B: Media, attachments, favorites, chatroom members, unread, and new messages.**
   These are closest to the existing chat workflow and will improve daily usability immediately.

4. **P4-C: SNS/朋友圈 module.**
   Adds a distinct content domain with its own filters, media proxy, and privacy risk.

5. **P4-D: DB explorer and wx-cli/API endpoint runner.**
   Valuable but risky; keep inside Developer Tools with read-only defaults and strong guardrails.

6. **P4-E: Hook/push, Hermes configuration, MCP compatibility, semantic preview, graph ingest/QA residuals.**
   This is powerful but operationally specialized; keep it out of ordinary user flows.

7. **P5-A: Contract fixture tests and adapter hardening.**
   Backfill real backend-shaped JSON/default-format fixtures for all P4 endpoints.

8. **P5-B: Browser E2E, visual regression, and accessibility gate.**
   Convert current manual evidence into stable scripts and CI artifacts.

9. **P5-C: Release pipeline hardening.**
   Close sidecar artifact reproducibility, updater signing/public key, platform packaging, and release notes evidence.

10. **P5-D: Release governance and maintenance loop.**
    Maintain evidence, checklists, versioning, privacy audit records, and regression dashboards.

---

## UI Direction

P4/P5 should continue the post-P2 Apple-like desktop direction: quiet, dense, clear, and local-data-oriented. Do not build landing pages, hero panels, decorative gradients, fake marketing cards, or one-off glass panels.

Use these patterns:

- **Grouped rail:** Keep one primary workbench and group modules as Core, Intelligence, Library, Developer, System.
- **Split views:** Use list/detail for media, SNS, favorites, DB tables, hook events, and endpoint history.
- **Inspector panels:** Use a right-side inspector for metadata, request details, privacy status, errors, and next actions.
- **Sheets/modals only for focused tasks:** Media preview, SQL confirmation, destructive cache clear, hook credential setup.
- **Segmented controls and filters:** Use segments for content type/status/time range; use menus for endpoint groups; use tables for logs/DB/events.
- **State completeness:** Every module must ship loading, empty, error, success, retry, and privacy-on states.
- **Data-density:** Developer tools and DB/SNS views should be scannable and compact, not card-heavy.
- **Responsive behavior:** At narrow width, split views collapse to list/detail navigation with stable toolbar height and no horizontal page overflow.

Recommended workbench module grouping:

| Group | Modules | Notes |
| --- | --- | --- |
| Core | Conversations, Search, Statistics | Existing modules, continue as daily workflow. |
| Intelligence | Semantic, Graph | Existing P2-D/P2-E work, plus semantic preview and graph residuals later. |
| Library | Media, Favorites, SNS | User-facing advanced browsing and extraction. |
| Developer | Diagnostics, DB Explorer, API Runner, Hooks, MCP | Hide raw/experimental tools from ordinary flows. |
| System | Settings, Release/Update status | Keep configuration and app health separate from data browsing. |

---

## Original Capability Matrix

| Capability | `chatlog_alpha` endpoints | Current UI coverage | P4/P5 target |
| --- | --- | --- | --- |
| Media resources | `/image/*key`, `/video/*key`, `/file/*key`, `/voice/*key`, `/data/*path` | Message bubbles only show a basic media marker. | Typed attachments, preview, download/save, retry, error reason, privacy-safe thumbnails. |
| Chat extensions | `/api/v1/unread`, `/api/v1/members`, `/api/v1/new_messages`, `/api/v1/favorites` | Sessions have local unread field fallback; no members/new/favorites module. | Members inspector, unread/new messages surfaces, favorites browser. |
| SNS | `/api/v1/sns_notifications`, `/api/v1/sns_feed`, `/api/v1/sns_search`, `/api/v1/sns/media/proxy` | Not implemented. | SNS timeline/search with media proxy and privacy-safe media detail. |
| DB explorer | `/api/v1/db`, `/api/v1/db/search`, `/api/v1/db/tables`, `/api/v1/db/data`, `/api/v1/db/query`, `/api/v1/cache/clear` | `/api/v1/db` only used for readiness. | Developer DB explorer with read-only SQL guardrails, table paging, search, export preview, cache clear confirmation. |
| Hook/push | `/api/v1/hook/config`, `/api/v1/hook/status`, `/api/v1/hook/events`, `/api/v1/hook/events/clear`, `/api/v1/hook/stream`, Hermes Weixin/QQ endpoints | Not implemented. | Developer hook configuration, event stream, event replay/test surfaces if backend supports it. |
| MCP/wx-cli compatibility | `/mcp`, `/sse`, `/message`, `chatlog http list/call` endpoint aliases | Not implemented. | Local-only endpoint runner and MCP status/help view, not arbitrary remote HTTP client. |
| Semantic residuals | `/api/v1/semantic/index/preview` | Semantic config/status/search/QA/topics/profiles exist. | Index preview with privacy-safe rows. |
| Graph residuals | `/api/v1/graph/ingest/message`, `/api/v1/graph/ingest/business`, `/api/v1/graph/ingest/event`, `/api/v1/graph/qa` | Graph status/query/timeline/visualize/rebuild/pause/resume exist. | Controlled ingest forms and graph QA inside Graph/Developer advanced area. |

---

## Cross-Cutting Contracts

### Privacy Contract

Every new P4 surface must define these behaviors before implementation:

| Surface | Privacy-on behavior |
| --- | --- |
| Visible rows/cards | Mask identities, message bodies, raw paths, URLs, keys, DB cell values that may contain private content. Preserve aggregate counts, timestamps, status labels, and safe enum labels. |
| Aria labels and titles | Must match the masked visible meaning. Never expose raw names or snippets through accessibility text. |
| Copy/export | Disabled or redacted by default. Raw export requires an explicit privacy-off state and user confirmation if implemented at all. |
| Diagnostics | Record endpoint labels, status, timing, error class, and redacted query keys. Do not record raw request bodies, SQL, media keys, SNS URLs, tokens, or private message text. |
| Screenshots | Screenshot-safe mode should hide media thumbnails, names, raw rows, raw SQL, raw JSON, and paths while preserving layout and operational status. |
| Media | In privacy mode, thumbnails should be blurred or replaced with neutral placeholders; video/audio filenames and keys must be masked. |
| DB/API tools | Raw responses must default to redacted preview; explicit raw reveal should be scoped to the visible session and never appear in diagnostics. |

### Diagnostics Event Contract

Add a redaction-first diagnostic event model before exposing P4 raw tools. L4 can emit events through a dependency-free local event atom; L2 subscribes and stores normalized events. L4 must not import L2.

Proposed event shape:

```ts
export type DiagnosticEventSource =
  | "ui"
  | "http"
  | "sidecar"
  | "tauri"
  | "updater"
  | "e2e"
  | "privacy"
  | "release";

export type DiagnosticEventLevel = "debug" | "info" | "warning" | "error";

export interface DiagnosticEvent {
  id: string;
  timestamp: string;
  source: DiagnosticEventSource;
  level: DiagnosticEventLevel;
  scope: string;
  message: string;
  redactionOk: boolean;
  correlationId?: string;
  endpointLabel?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  errorKind?: string;
  retryable?: boolean;
  tags?: string[];
}
```

Do not store raw SQL, raw response bodies, media keys, SNS URLs, credentials, data keys, private chat text, or full local paths in this event store.

### Sidecar/CSP Contract

- Keep the local backend boundary at `http://127.0.0.1:5030`.
- Build source/bundle config may still use `src-tauri/binaries/chatlog_alpha-*` and `externalBin: binaries/chatlog_alpha`; runtime sidecar invocation must preserve the P2-E corrected installed-app contract, `sidecar("chatlog_alpha")`.
- If media is implemented with native `<video>` or `<audio>`, add an explicit `media-src 'self' http://127.0.0.1:5030 blob: data:` CSP rule and test packaged playback.
- Keep `object-src 'none'`.
- Do not enable broad shell open. If "open containing folder" is required, implement a validated Tauri/Rust command or a tightly scoped shell permission and document the security reason.
- Endpoint runner must be local-only and allowlist `127.0.0.1:5030` sidecar endpoints. It must not become a generic remote HTTP client.

---

## Phase P4/P5-0: Capability Matrix, Diagnostics/Privacy Baseline, E2E Fixture Foundation

This is the first executable subtask. It is deliberately a foundation phase because later P4 modules expose raw private data.

**Dedicated plan:** `docs/superpowers/plans/2026-06-01-p4-p5-0-capability-diagnostics-e2e-foundation.md`

**Status target:** Complete before any broad media/SNS/DB/hook UI implementation.

**Files likely to change or create:**

- Create: `specs/002-advanced-capabilities/capability-matrix.md`
- Create: `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`
- Create: `specs/002-advanced-capabilities/test-data-policy.md`
- Create: `specs/002-advanced-capabilities/e2e-matrix.md`
- Create: `specs/002-advanced-capabilities/e2e-fixture-plan.md`
- Create: `specs/001-ready-desktop-app/test-data-policy.md`
- Create: `src/l4-atom/network/diagnosticEvents.ts`
- Create: `src/l4-atom/network/diagnosticEvents.test.ts`
- Modify: `src/l4-atom/network/httpClient.ts`
- Modify: `src/l4-atom/network/httpClient.test.ts`
- Create: `src/l2-coordinator/data-clerk/stores/useDiagnosticEventStore.ts`
- Create: `src/l2-coordinator/commander/diagnosticEventViewModel.ts`
- Create: `src/l2-coordinator/commander/diagnosticEventViewModel.test.ts`
- Modify: `src/l2-coordinator/commander/useDevConsoleCommander.ts`
- Modify: `src/l3-molecule/common/DevConsole.tsx`
- Create: `e2e/README.md`
- Create: `e2e/fixtures/core-ready.json`
- Create: `e2e/fixtures/advanced-capabilities.json`
- Create: `e2e/fixtures/diagnostics-redaction.json`
- Create: `e2e/mock-chatlog-server/README.md`
- Create: `playwright.config.ts` only if the team commits to persistent Playwright test specs.
- Modify: `package.json` only if adding persistent E2E scripts/dependencies.

### Task 0.1: Freeze The Advanced Capability Matrix

- [ ] Compare `chatlog_alpha` endpoint aliases in `cmd/chatlog/cmd_http.go`, `README.md`, and `internal/chatlog/http/route.go`.
- [ ] Create `specs/002-advanced-capabilities/capability-matrix.md`.
- [ ] For every endpoint group, record:
  - endpoint path and method
  - intended UI module
  - L4 fetcher file
  - adapter/fixture status
  - privacy risk
  - E2E coverage target
  - release/CSP/capability impact
- [ ] Mark unsupported or intentionally deferred endpoints explicitly, not silently.

Acceptance:

- The matrix covers media, chat extensions, SNS, DB explorer, hook, MCP, semantic preview, and graph residual endpoints.
- There is no endpoint group without an owner or privacy rule.

Verification:

Run a placeholder scan over the newly created `specs/002-advanced-capabilities` files. Expected result: no unresolved markers in the new specs.

### Task 0.2: Define The Privacy And Diagnostics Contract

- [ ] Create `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`.
- [ ] Define the privacy behavior table for media, SNS, DB, hook, API runner, diagnostics, screenshots, copy, export, and aria labels.
- [ ] Define the diagnostic event shape and redaction rules.
- [ ] Define event retention defaults, for example max event count and export window.
- [ ] Define fail-closed export behavior if redaction cannot be proven.

Acceptance:

- The contract clearly distinguishes safe operational metadata from forbidden private content.
- The contract explicitly says raw data must not enter diagnostics.
- It includes screenshot-safe mode requirements.

### Task 0.3: Add L4 Diagnostic Event Helpers Without L2 Coupling

- [ ] Create small L4 diagnostic helpers for event creation, HTTP event creation, attribute sanitization, serialization, and retention limits.
- [ ] Keep them independent from React/Zustand/Tauri and from L2/L3 imports.
- [ ] Sanitize event fields before they enter callbacks, stores, or exports.
- [ ] Add unit tests proving secrets/private strings are redacted or blocked.

Acceptance:

- `rg -n "@l2|l2-coordinator|@l3|l3-molecule" src\l4-atom\network\diagnosticEvents.ts` has no output.
- Events with synthetic `dataKey`, `sk-`, token, private message, wxid, full Windows user path, media key, and raw SQL are redacted or rejected.

Verification:

```powershell
pnpm test src\l4-atom\network\diagnosticEvents.test.ts
```

### Task 0.4: Instrument `httpClient` With Redacted HTTP Events

- [ ] Modify `requestJson()` to emit redacted success, HTTP error, timeout, caller abort, and network error events through an opt-in callback.
- [ ] Record endpoint labels, method, status, duration, retryable flag, and error kind.
- [ ] Never record full query strings when they may contain keys, SNS URLs, SQL, or paths.
- [ ] Preserve current timeout, caller cancellation, and `format=json` behavior.
- [ ] Add tests for success, HTTP error, timeout/cancel behavior, and redaction.

Acceptance:

- Existing `httpClient` tests still pass.
- New tests prove raw SQL/media/SNS/key data is not stored in events.
- L4 still does not import L2.

Verification:

```powershell
pnpm test src\l4-atom\network\httpClient.test.ts src\l4-atom\network\diagnosticEvents.test.ts
```

### Task 0.5: Add L2 Diagnostic Event Store And Dev Console View Model

- [ ] Create `useDiagnosticEventStore` with bounded retention and filters.
- [ ] Add view-model helpers for counts, latest errors, grouped sources, privacy status, and exportable diagnostic lines.
- [ ] Update DevConsole commander to combine sidecar logs with diagnostic events.
- [ ] Do not put store reads inside low-level L3 leaves.

Acceptance:

- DevConsole can filter by sidecar/http/ui/tauri/updater/release source.
- Export uses the existing diagnostics fail-closed path.
- No raw synthetic secrets appear in serialized output.

Verification:

```powershell
pnpm test src\l2-coordinator\commander\diagnosticEventViewModel.test.ts src\l2-coordinator\commander\diagnostics.test.ts
```

### Task 0.6: Create Synthetic Advanced Fixtures

- [ ] Create synthetic fixture content for:
  - sessions/history with image, video, voice, file, sticker, and unknown media
  - favorites
  - members/unread/new_messages
  - SNS feed/search/notifications with media proxy URLs
  - DB groups/files/tables/data/query/search
  - hook config/status/events/stream sample
  - semantic index preview
  - graph ingest/QA responses
- [ ] Ensure fixtures contain clearly fake private strings that privacy tests can search for.
- [ ] Ensure fixtures do not contain real chat content, real keys, or real paths.

Acceptance:

- Fixtures are synthetic and documented.
- Privacy tests can assert that known fake raw strings do not leak.

### Task 0.7: Establish E2E Matrix And Mock Backend Strategy

- [ ] Create `specs/002-advanced-capabilities/e2e-matrix.md`.
- [ ] Define required browser routes/states:
  - clean setup
  - ready workbench
  - privacy-on workbench
  - media module
  - SNS module
  - DB explorer
  - hook/developer tools
  - diagnostics export
  - update notification
  - narrow width drawer/collapse
- [ ] Decide whether the persistent suite uses `@playwright/test` or a repo-local Playwright CLI wrapper script.
- [ ] If using `@playwright/test`, add `pnpm e2e` and `pnpm e2e:ui` scripts later in P5-A, not during this foundation task unless implementation starts immediately.
- [ ] Define mock server behavior for `/health`, `/api/v1/db`, REST JSON, SSE, media blobs, and error states.

Acceptance:

- The E2E matrix names each route/state/width/privacy mode and fixture source.
- It separates mock-backend E2E from packaged-app smoke.

### Task 0.8: Document Release Risks Opened By P4

- [ ] In `specs/002-advanced-capabilities/capability-matrix.md`, record:
  - CSP changes for media
  - Tauri permission changes for download/open/save
  - sidecar artifact reproducibility
  - updater artifact verification
  - platform smoke needs
  - no-real-data fixture policy
- [ ] Add a P5 release-quality issue list to the matrix.

Acceptance:

- No P4 feature is planned without release/security impact notes.

### Task 0.9: Foundation Verification

Run:

```powershell
pnpm typecheck
pnpm test src\l4-atom\network\httpClient.test.ts src\l4-atom\network\diagnosticEvents.test.ts src\l2-coordinator\commander\diagnostics.test.ts
git diff --check
```

If persistent E2E files are added in this phase, also run:

```powershell
pnpm e2e -- --grep "@foundation"
```

Completion criteria:

- Specs exist and contain no unresolved placeholder text.
- L4 diagnostic atom is independent.
- HTTP diagnostic events are redacted.
- DevConsole can consume normalized event summaries.
- Foundation tests pass.

---

## Phase P4-A: Diagnostics And Privacy Mode 2.0

**Goal:** Make the app safe to use and safe to debug after raw-data-heavy features land.

**Dedicated plan:** `docs/superpowers/plans/2026-06-02-p4-a-developer-diagnostics-privacy-mode-2.md`

**Implementation status:** Implemented through source/UI evidence on 2026-06-02 from the completed P4/P5-0 foundation. The detailed plan kept this phase focused on production diagnostic-event integration, DevConsole 2.0, Privacy Mode 2.0, diagnostics export manifest, UI acceptance, and leak-scan verification. It intentionally did not duplicate the P4/P5-0 capability matrix, base diagnostic event atom, or synthetic fixture setup.

P4-A used an L2-owned callback bridge rather than a global emitter. L4 network/system atoms remain independent and only accept optional diagnostics callbacks/options. The Rust export payload shape was not changed; manifest 2.0 is emitted as safe line-based report content through the existing user-triggered fail-closed export path.

**Primary files:**

- `src/l2-coordinator/data-clerk/stores/useDiagnosticEventStore.ts`
- `src/l2-coordinator/commander/useDevConsoleCommander.ts`
- `src/l2-coordinator/commander/diagnostics.ts`
- `src/l3-molecule/common/DevConsole.tsx`
- `src/l3-molecule/diagnostics/*`
- `src/utils/maskSecrets.ts`
- `src/utils/maskSecrets.test.ts`
- `src/l2-coordinator/commander/diagnosticEventBridge.ts`
- `src/l2-coordinator/commander/diagnosticsManifest.ts`

Tasks:

- [x] Upgrade DevConsole from sidecar-only log viewer to unified event console.
- [x] Add filters: source, level, time, endpoint group, privacy state, failed-only.
- [x] Add event detail drawer with redacted request metadata and suggested next action.
- [x] Extend global privacy/redaction behavior for diagnostic rows, detail text, copy/export, settings/about diagnostics, and high-risk raw labels.
- [x] Add diagnostics export manifest with app version, build channel, sidecar state, HTTP event summary, readiness summary, update state, and redaction result.
- [x] Add tests for serialized diagnostics, event filtering/detail view-models, HTTP/SSE diagnostic wiring, updater/system events, and redaction helpers.
- [x] Add privacy leak scans and browser evidence for synthetic raw strings in DevConsole DOM and diagnostics surfaces.

Acceptance:

- Diagnostics can explain sidecar/API/UI failures without exposing private data.
- Privacy mode covers diagnostic logs, request metadata, tooltips, aria labels, copy, and export.
- Export fails closed if redaction cannot be proven.

Verification:

```powershell
pnpm test src\utils\maskSecrets.test.ts src\l2-coordinator\commander\diagnostics.test.ts
pnpm test src\l2-coordinator\commander\diagnosticEventViewModel.test.ts
pnpm test src\l4-atom\network\diagnosticEvents.test.ts src\l4-atom\network\httpClient.test.ts src\l2-coordinator\data-clerk\stores\useDiagnosticEventStore.test.ts
pnpm typecheck
```

Rust diagnostics tests are not required for the implemented P4-A slice because no Rust/Tauri payload schema, CSP, capability, or sidecar launcher code changed.

Final 2026-06-02 source verification passed: `pnpm lint`, `pnpm typecheck`, `pnpm test` (47 files / 241 tests), `pnpm build`, `pnpm verify`, and architecture/privacy scans. `git diff --check` reported no whitespace errors, only CRLF normalization warnings.

---

## Phase P4-B: Media, Favorites, Members, Unread, And Incremental Messages

**Goal:** Make original chat records usable beyond plain text.

**Primary endpoints:**

- `GET /image/*key`
- `GET /video/*key`
- `GET /file/*key`
- `GET /voice/*key`
- `GET /data/*path`
- `GET /api/v1/favorites`
- `GET /api/v1/members`
- `GET /api/v1/unread`
- `GET /api/v1/new_messages`

**Primary files likely to change or create:**

- `src/l4-atom/network/mediaResources.ts`
- `src/l4-atom/network/fetchFavorites.ts`
- `src/l4-atom/network/fetchMembers.ts`
- `src/l4-atom/network/fetchUnread.ts`
- `src/l4-atom/network/fetchNewMessages.ts`
- `src/l4-atom/network/mediaAdapters.ts`
- `src/l2-coordinator/data-clerk/stores/useMediaStore.ts`
- `src/l2-coordinator/commander/useMediaCommander.ts`
- `src/l2-coordinator/commander/useFavoritesCommander.ts`
- `src/l3-molecule/media/MediaLibrary.tsx`
- `src/l3-molecule/media/MediaPreviewSheet.tsx`
- `src/l3-molecule/chat/MessageBubble.tsx`
- `src/l3-molecule/chat/MessageList.tsx`
- `src/l3-molecule/chat/ConversationInspector.tsx`
- `src-tauri/tauri.conf.json`

Tasks:

- [ ] Add backend-shaped media metadata extraction from history/search/favorites responses.
- [ ] Add typed attachment model: image, video, voice, file, sticker, unknown.
- [ ] Render message attachments with stable dimensions and privacy-safe placeholders.
- [ ] Add preview sheet for images/video/audio with loading/error/retry states.
- [ ] Add file download/save action; defer "open containing folder" until permission review.
- [ ] Add favorites module with filters and detail preview.
- [ ] Add chatroom members inspector.
- [ ] Add unread/new_messages status surfaces without disrupting session list.
- [ ] Add explicit CSP update and packaged smoke for video/audio if needed.

Acceptance:

- Media messages are no longer just `[媒体可用]`.
- Privacy mode hides thumbnails/names/keys while preserving message structure.
- Failed media displays a recoverable error and redacted endpoint label.
- Favorites and members have empty/error/loading/success states.

Verification:

```powershell
pnpm test src\l4-atom\network\mediaAdapters.test.ts
pnpm test src\l3-molecule\media\mediaDisplay.test.ts src\l3-molecule\chat\transcriptDisplay.test.ts
pnpm typecheck
```

If CSP or Tauri permissions change:

```powershell
pnpm tauri build
```

---

## Phase P4-C: SNS / Moments Module

**Goal:** Bring `chatlog_alpha` SNS/朋友圈 browsing and search into the desktop UI with media/privacy support.

**Primary endpoints:**

- `GET /api/v1/sns_notifications`
- `GET /api/v1/sns_feed`
- `GET /api/v1/sns_search`
- `GET /api/v1/sns/media/proxy`

**Primary files likely to change or create:**

- `src/l4-atom/network/fetchSnsFeed.ts`
- `src/l4-atom/network/fetchSnsSearch.ts`
- `src/l4-atom/network/fetchSnsNotifications.ts`
- `src/l4-atom/network/snsAdapters.ts`
- `src/l2-coordinator/data-clerk/stores/useSnsStore.ts`
- `src/l2-coordinator/commander/useSnsCommander.ts`
- `src/l3-molecule/sns/SnsModule.tsx`
- `src/l3-molecule/sns/SnsTimeline.tsx`
- `src/l3-molecule/sns/SnsSearchPanel.tsx`
- `src/l3-molecule/sns/SnsMediaGrid.tsx`
- `src/l3-molecule/sns/SnsDetailInspector.tsx`

Tasks:

- [ ] Build adapters from real backend-shaped SNS fixtures.
- [ ] Add timeline list with date/user/media filters.
- [ ] Add search with highlighted results, safe no-results state, and pagination.
- [ ] Add SNS media grid/detail using media proxy URLs.
- [ ] Add notification list or badge if backend data is available.
- [ ] Add privacy-on masking for authors, content, media, URLs, aria labels, and export/copy.
- [ ] Add recoverable errors for missing media keys, proxy failure, and empty SNS database.

Acceptance:

- SNS is a first-class Library module, not buried in developer tools.
- Media proxy failures do not crash the module.
- Privacy mode produces a screenshot-safe SNS view.

Verification:

```powershell
pnpm test src\l4-atom\network\snsAdapters.test.ts src\l3-molecule\sns\snsDisplay.test.ts
pnpm typecheck
```

---

## Phase P4-D: DB Explorer And wx-cli/API Endpoint Runner

**Goal:** Provide controlled access to raw database and endpoint debugging without exposing ordinary users to dangerous tools.

**Primary endpoints:**

- `GET /api/v1/db`
- `GET /api/v1/db/search`
- `GET /api/v1/db/tables`
- `GET /api/v1/db/data`
- `GET /api/v1/db/query`
- `POST /api/v1/cache/clear`
- `GET/POST` local endpoint aliases from `chatlog http list/call`

**Primary files likely to change or create:**

- `src/l4-atom/network/fetchDbExplorer.ts`
- `src/l4-atom/network/runEndpoint.ts`
- `src/l4-atom/network/dbExplorerAdapters.ts`
- `src/l2-coordinator/data-clerk/stores/useDbExplorerStore.ts`
- `src/l2-coordinator/commander/useDbExplorerCommander.ts`
- `src/l2-coordinator/commander/useEndpointRunnerCommander.ts`
- `src/l3-molecule/developer/DeveloperToolsModule.tsx`
- `src/l3-molecule/developer/DbExplorer.tsx`
- `src/l3-molecule/developer/EndpointRunner.tsx`
- `src/l3-molecule/developer/RawResponsePreview.tsx`

Tasks:

- [ ] Add DB groups/files/tables/data adapters with paging.
- [ ] Add deep DB search UI with mode/limit filters.
- [ ] Add table data grid with column sizing, overflow-safe cells, keyboard navigation, and privacy-safe rendering.
- [ ] Add SQL query panel restricted by default to read-only statements such as `SELECT`, `PRAGMA`, and `EXPLAIN`.
- [ ] Add explicit confirmation for cache clear.
- [ ] Add endpoint runner with allowlisted local endpoints only.
- [ ] Add raw response preview with redacted default, copy redacted JSON/YAML, and raw reveal only if privacy is off and user confirms.
- [ ] Record all requests in the diagnostic event store without raw query/body leakage.

Acceptance:

- Developer DB tools are powerful but not in the normal user path.
- SQL and raw endpoint actions cannot accidentally log or export private content.
- DB explorer works with large tables through paging or virtualization.

Verification:

```powershell
pnpm test src\l4-atom\network\dbExplorerAdapters.test.ts
pnpm test src\l2-coordinator\commander\dbExplorerViewModel.test.ts
pnpm test src\l3-molecule\developer\dbExplorerDisplay.test.ts
```

---

## Phase P4-E: Hook/Push, MCP, Semantic Preview, Graph Residuals

**Goal:** Cover specialized original Web UI and CLI-compatible capabilities in a controlled Developer/Intelligence area.

**Primary endpoints:**

- `GET /api/v1/hook/config`
- `POST /api/v1/hook/config`
- `GET /api/v1/hook/status`
- `GET /api/v1/hook/events`
- `POST /api/v1/hook/events/clear`
- `GET /api/v1/hook/stream`
- `GET/POST /api/v1/hook/hermes/weixin`
- `GET/POST /api/v1/hook/hermes/qq`
- `ANY /mcp`
- `ANY /sse`
- `ANY /message`
- `GET /api/v1/semantic/index/preview`
- `POST /api/v1/graph/ingest/message`
- `POST /api/v1/graph/ingest/business`
- `POST /api/v1/graph/ingest/event`
- `POST /api/v1/graph/qa`

Tasks:

- [ ] Add hook config/status/event adapters and store.
- [ ] Add hook event stream parser with cancellation and retry.
- [ ] Add Hermes Weixin/QQ config forms with credential masking and validation.
- [ ] Add event clear confirmation and redacted diagnostics.
- [ ] Add MCP status/help view and endpoint runner compatibility, but do not implement a full remote MCP client unless explicitly required.
- [ ] Add semantic index preview rows with privacy-safe content.
- [ ] Add graph ingest forms and graph QA only after fixtures confirm backend shapes.

Acceptance:

- Hook tools are isolated to Developer and default to disabled/explicit activation.
- SSE streams are cancellable.
- Credentials and event payloads do not leak through diagnostics, aria labels, or screenshots.

Verification:

```powershell
pnpm test src\l2-coordinator\diplomat\sseParser.test.ts
pnpm test src\l4-atom\network\hookAdapters.test.ts src\l4-atom\network\semanticAdapters.test.ts src\l4-atom\network\graphAdapters.test.ts
```

---

## Phase P5-A: API Contract Tests And Adapter Fixtures

**Goal:** Stop relying on frontend-shaped guesses.

Tasks:

- [ ] Add backend-shaped fixtures for all advanced endpoints.
- [ ] Cover JSON and default response behavior where `chatlog_alpha` supports both.
- [ ] Add raw response fixture tests for adapter failure and unknown-field tolerance.
- [ ] Add tests for `format=json` appending and default-format handling.
- [ ] Add privacy fixture tests that scan known synthetic private strings.
- [ ] Add fixture policy: no real chat content, no real media, no real keys, no real local paths.

Acceptance:

- Adapter tests fail if raw backend response shapes drift.
- Fixtures are synthetic and reviewed.
- P4 modules can be developed from stable contract tests.

Verification:

```powershell
pnpm test src\l4-atom\network
pnpm test src\utils\maskSecrets.test.ts
```

---

## Phase P5-B: Browser E2E, Visual Regression, And Accessibility Gate

**Goal:** Make "product opens and remains usable" repeatable.

Recommended structure:

- `e2e/fixtures/`
- `e2e/specs/setup.spec.ts`
- `e2e/specs/workbench.spec.ts`
- `e2e/specs/privacy.spec.ts`
- `e2e/specs/advanced-media.spec.ts`
- `e2e/specs/advanced-sns.spec.ts`
- `e2e/specs/developer-tools.spec.ts`
- `e2e/specs/release-smoke.spec.ts` for mockable release states only
- `scripts/mock-chatlog-server.mjs`
- `output/playwright/` for generated artifacts only

Tasks:

- [ ] Add a mock local backend server that covers `/health`, `/api/v1/db`, REST JSON, SSE, media blobs, errors, and latency.
- [ ] Add desktop and narrow-width route smoke for `/`, `/workbench`, `/dashboard`, `/settings`, and every P4 module.
- [ ] Add privacy-on leak checks for DOM text, accessible names, screenshots, diagnostic export text, and raw response panels.
- [ ] Add visual screenshots for light/dark, desktop/narrow, loading/empty/error/success, long content, and privacy-on.
- [ ] Add keyboard checks for rail navigation, tables, sheets, drawers, dialogs, and streaming cancel.
- [ ] Add CI artifact upload for screenshots/traces without committing private or large binary artifacts by default.

Acceptance:

- A fresh checkout can run E2E against synthetic data.
- E2E failures produce enough redacted traces/screenshots to debug.
- Visual baselines or artifact comparisons do not include real private content.

Verification:

```powershell
pnpm e2e
pnpm e2e:visual
```

If persistent Playwright specs are deferred, keep using the CLI wrapper for manual evidence but do not claim P5-B complete.

---

## Phase P5-C: CI/CD, Sidecar Artifact, Updater, And Platform Release Hardening

**Goal:** Make GitHub release output reproducible, signed, updateable, and evidence-backed.

Tasks:

- [ ] Decide and implement sidecar artifact acquisition:
  - vendored source subtree,
  - pinned release artifact download with checksum,
  - private CI artifact dependency,
  - or another explicitly documented source.
- [ ] Remove reliance on local ignored `src-tauri/binaries/` for release reproducibility.
- [ ] Update `.github/scripts/prepare-sidecar.sh` to fail clearly when real release sidecar acquisition is impossible.
- [ ] Add checksums for sidecar binaries and release artifacts.
- [ ] Verify updater `latest.json` generation and public key injection in a real release dry run.
- [ ] Add platform-specific smoke scripts:
  - Windows install/open/quit/reopen/unknown-port-conflict.
  - macOS install/open/sidecar permission/notarization caveat.
  - Linux AppImage launch/sidecar permission/caveat.
- [ ] Keep build-check placeholder behavior only for non-release CI, and label it as such.
- [ ] Add release notes generation with privacy/release caveats.
- [ ] Add `CHANGELOG.md` or enforce release body source.

Acceptance:

- `release.yml` can produce real artifacts on GitHub without relying on a developer's ignored local binary.
- Updater artifacts are signed and verified.
- Platform caveats are explicit.
- Release evidence names the source commit and sidecar version/checksum.

Verification:

```powershell
pnpm verify
cd src-tauri; cargo test
pnpm tauri build
```

In CI:

```text
build-check matrix: Windows, macOS Intel, macOS Apple Silicon, Linux
release dry run: signed updater artifacts or intentionally blocked before publish
```

---

## Phase P5-D: Release Governance And Maintenance

**Goal:** Keep the project shippable after P4/P5 lands.

Tasks:

- [ ] Update `specs/001-ready-desktop-app/release-evidence.md` or create a P4/P5 release evidence appendix.
- [ ] Add `specs/002-advanced-capabilities/acceptance-checklist.md`.
- [ ] Add a privacy audit checklist for each new module.
- [ ] Add a release checklist that separates automated gates, manual packaged smoke, notarization/signing, updater, and known caveats.
- [ ] Add a regression dashboard section to `docs/release/ready-desktop-app.md`.
- [ ] Add "what not to log" guidance for P4 developers.
- [ ] Keep deprecated early guidance out of active release docs, especially force-killing unknown ports and fake macOS traffic lights.

Acceptance:

- New contributors can tell what is shippable, what is staged, and what is unsafe.
- Release evidence is not a one-off note from a single local machine.
- Privacy obligations are visible in every implementation task.

---

## Recommended Split For Implementation Sessions

Because the full P4/P5 scope is large, do not attempt it in one implementation session. Use this split:

1. **Session 1:** P4/P5-0 foundation only.
2. **Session 2:** P4-A diagnostics/privacy 2.0.
3. **Session 3:** P4-B media/favorites/members/unread.
4. **Session 4:** P4-C SNS.
5. **Session 5:** P4-D DB explorer/API runner.
6. **Session 6:** P4-E hook/MCP/semantic-preview/graph residuals.
7. **Session 7:** P5-A/P5-B contract fixtures and E2E/visual harness.
8. **Session 8:** P5-C/P5-D release pipeline and governance.

If time is limited, the highest-value first implementation is **Session 1**. It gives later workers the matrix, privacy contract, diagnostic event pipeline, and synthetic fixtures needed to implement the rest without guessing.

---

## Final Gate For P4/P5 Completion

P4/P5 should not be called complete until all of the following are true:

- Advanced capability matrix has no unowned endpoint group.
- Media, SNS, DB explorer, hook/developer tools, semantic preview, and graph residuals either have UI coverage or an explicit deferral.
- Privacy mode covers visible text, aria labels, copy/export, screenshots, diagnostics, media, SNS, DB rows, hook events, endpoint runner, and raw response panels.
- DevConsole shows sidecar, HTTP, UI, Tauri, updater, release, and privacy audit events with filtering and redacted export.
- Contract fixture tests cover backend-shaped responses for P4 endpoints.
- E2E covers setup, workbench, privacy, media, SNS, DB/developer tools, diagnostics, and narrow-width behavior.
- Visual/a11y evidence exists for desktop and narrow widths, light/dark, long/empty/error/loading/success, and privacy-on states.
- Release workflow can obtain real sidecar binaries/source reproducibly.
- Updater signing/public key/release artifact generation is verified.
- `pnpm verify`, `cargo test`, `pnpm tauri build`, and the project E2E suite pass.
- Release evidence names commit, sidecar version/checksum, platform caveats, and privacy audit result.

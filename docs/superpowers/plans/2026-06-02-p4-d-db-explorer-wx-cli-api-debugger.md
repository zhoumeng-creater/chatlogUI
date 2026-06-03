# P4-D DB Explorer And wx-cli/API Debugger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS for implementation: use `planning-with-files`, `executing-plans`, `test-driven-development`, `chatlog-debug` when failures appear, `app-productization`, `frontend-design`, `ui-acceptance`, `sidecar-integration` for backend-contract checks, and `verification-before-completion`. Evaluate `using-git-worktrees` before coding. Do not use Spec Kit unless the user explicitly asks to update Spec Kit artifacts.

**Goal:** Add a controlled Developer Tools module for DB exploration, read-only SQL inspection, cache clear confirmation, and a wx-cli-compatible local API runner without exposing raw private data or arbitrary HTTP tooling to ordinary user flows.

**Architecture:** Preserve the L1/L2/L3/L4 boundary. L4 owns raw DB/API HTTP fetchers, endpoint catalog, response adapters, local-only URL construction, and request cancellation. L2 owns Zustand state, command orchestration, read-only SQL guard decisions, diagnostics, privacy-aware view models, and error translation. L3 renders Developer Tools from props and callbacks only. L1 only places the module in Workbench and delegates events.

**Current baseline:** This plan is written on `codex/p4b-media-chat-extensions`, a dirty development branch containing P4-B media/chat extension work and P4-C SNS implementation. Treat those changes as current product context. Do not rebase, revert, or ignore them during P4-D execution without user approval.

---

## Source Context Read

Read and use these before implementing P4-D:

- `AGENTS.md`
- `开发指南.md`
- `docs/总体开发规划.md`
- `docs/ui-functional-audit-and-redesign-plan.md`
- `.specify/memory/constitution.md`
- `specs/001-ready-desktop-app/spec.md`
- `specs/001-ready-desktop-app/contracts/local-backend.md`
- `specs/001-ready-desktop-app/contracts/diagnostics-package.md`
- `specs/001-ready-desktop-app/release-evidence.md`
- `specs/002-advanced-capabilities/README.md`
- `specs/002-advanced-capabilities/capability-matrix.md`
- `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`
- `specs/002-advanced-capabilities/e2e-matrix.md`
- `specs/002-advanced-capabilities/e2e-fixture-plan.md`
- `specs/002-advanced-capabilities/test-data-policy.md`
- `docs/superpowers/plans/2026-06-01-p4-p5-0-capability-diagnostics-e2e-foundation.md`
- `docs/superpowers/plans/2026-06-02-p4-a-developer-diagnostics-privacy-mode-2.md`
- `docs/superpowers/plans/2026-06-02-p4-c-sns-moments-module.md`
- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`
- `task_plan.md`, `findings.md`, and `progress.md`

Local `chatlog_alpha` references used for this plan:

- `E:\OneDrive - Default Directory\chatlog_alpha\README.md`
- `E:\OneDrive - Default Directory\chatlog_alpha\cmd\chatlog\cmd_http.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\skills\chatlog-http-cli\SKILL.md`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\http\route.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\http\static\index.htm`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\database\service.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\wechatdb\datasource\wcdb\datasource.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\wechatdb\wcdbapi\client.go`

---

## Current Frontend Baseline

- P4-A diagnostics and privacy mode are available through `createDiagnosticHttpOptions()`, `createDiagnosticEventSink()`, `maskDiagnosticText()`, DevConsole 2.0, and diagnostics export manifest 2.0.
- P4-B/P4-C established the implementation pattern P4-D should reuse:
  - backend-shaped synthetic fixture first
  - L4 raw DTOs, adapters, and local-only fetchers
  - L2 store, commander, and view model
  - Workbench rail and inspector integration
  - L3 props-only module with loading, empty, error, success, retry, and privacy states
  - mocked local sidecar UI acceptance at desktop and narrow widths
- Current Workbench modules are `chat | stats | media | sns | ai | graph | settings`.
- Current frontend has no `DbExplorer`, `EndpointRunner`, `DeveloperToolsModule`, DB fetchers, DB store, or endpoint runner catalog.
- Current `advanced-capabilities.json` DB fixtures are too shallow for adapter tests and do not match all backend response shapes.

---

## Backend Contract Evidence

### DB Endpoints

Base URL remains `http://127.0.0.1:5030`.

Relevant routes from `internal/chatlog/http/route.go`:

- `GET /api/v1/db`
  - Returns a map of database group to file names.
  - Example shape: group key such as `message`, `session`, `contact`, `sns`, `media` mapped to file arrays.
- `GET /api/v1/db/search`
  - Query: `keyword` required.
  - Query: `mode=quick|deep`, default `quick`.
  - Query: `limit`, default `100`, backend max `500`.
  - Returns `keyword`, `mode`, `total`, and `items`.
  - Item fields include `group`, `file`, `db_name`, `table`, `column`, `row_id`, `preview`, and `row`.
- `GET /api/v1/db/tables`
  - Query: `group` and `file` required.
  - Returns a string array of table names.
- `GET /api/v1/db/data`
  - Query: `group`, `file`, and `table` required.
  - Query: `keyword`, `limit`, `offset`, `format`.
  - JSON returns an array of row maps.
  - CSV/XLSX export streams all rows when `format=csv|xlsx|excel`; P4-D should not expose this export by default.
- `GET /api/v1/db/query`
  - Query: `group`, `file`, and `sql` required.
  - Query: `format`.
  - JSON returns an array of row maps.
  - Backend currently does not enforce read-only SQL. P4-D must block unsafe statements before request dispatch.
- `POST /api/v1/cache/clear`
  - Clears generated decrypted media/cache files under `dataDir`.
  - Returns `message` and `deletedCount`.
  - Requires explicit destructive confirmation in UI.

DB middleware can return 503 JSON errors when the database is not ready, decrypting, or in error state. L2 should translate these into recoverable states, not generic crashes.

### wx-cli/API Runner Contract

`chatlog http list/call` in `cmd/chatlog/cmd_http.go` exposes an alias catalog for local sidecar API access. P4-D should model that catalog in the UI instead of shelling out to the CLI.

Relevant alias families:

- readiness: `health`, `ping`
- core: `sessions`, `history`, `search`, `unread`, `members`, `new_messages`, `stats`, `favorites`, `contacts`, `chatrooms`
- SNS: `sns_notifications`, `sns_feed`, `sns_search`
- DB: `db`, `db_tables`, `db_data`, `db_query`, `cache_clear`
- media: `image`, `video`, `file`, `voice`, `data`
- MCP: `mcp`, `mcp_sse`, `mcp_message`

P4-D must not expose:

- arbitrary remote URL input
- raw `--path` override
- raw headers editor
- body-file upload
- generic host field
- generic remote HTTP client behavior

P4-D may expose a curated local endpoint catalog with safe parameter forms and JSON response preview.

---

## Product Direction

P4-D is a Developer Tools module. It is powerful, local-only, and privacy-sensitive. It should be reachable from Workbench navigation but separated from ordinary chat, media, SNS, AI, and graph workflows.

Recommended Workbench placement:

- Add module id `developer`.
- Rail label: `开发者`.
- Inspector title: `开发者工具`.
- Order: after `sns`, before `ai`.
- Module tabs inside Developer Tools:
  - `数据库`
  - `API 调试`
  - `缓存`
  - optional embedded `诊断摘要` link or panel, reusing existing DevConsole data but not duplicating DevConsole.

Primary user jobs:

- Inspect decrypted DB group/file/table availability after setup.
- Browse a table page with safe paging and optional keyword filter.
- Run read-only SQL to debug sidecar/database behavior.
- Search all DBs with quick/deep mode and a bounded limit.
- Clear generated cache only after explicit confirmation.
- Run documented local sidecar endpoints from an allowlisted catalog.
- View redacted response previews and safe request summaries.

---

## Scope

Implement in P4-D:

- Backend-shaped DB/API fixtures in `advanced-capabilities.json`.
- DB response adapters and typed display models.
- DB fetchers for list, search, tables, data, query, and cache clear.
- Read-only SQL classifier and request guard.
- Local endpoint catalog for wx-cli-style aliases.
- Endpoint runner fetcher that accepts only catalog entries and typed params.
- L2 Developer Tools store, commander(s), and view models.
- Workbench `developer` module integration.
- L3 Developer Tools UI with DB Explorer, SQL/query panel, DB search, cache clear, and API runner.
- Privacy-safe raw response preview.
- Diagnostic events through existing P4-A bridge, with safe attributes only.
- Targeted tests, architecture scans, privacy scans, and mocked browser UI acceptance.
- Docs/spec updates reflecting P4-D ownership and source/UI evidence.

Do not implement in P4-D:

- Backend changes to `chatlog_alpha`.
- Tauri sidecar launch changes.
- CSP or capability broadening unless implementation proves an unavoidable local-only need.
- Generic remote HTTP client.
- CLI shell execution from UI.
- Raw header/body editor.
- DB write/update/delete/admin SQL.
- Raw DB export, full table export, or result export to disk.
- Real WeChat DB fixtures, real rows, real local paths, real keys, or screenshots containing private data.
- Hook/Hermes/SSE/MCP full console beyond catalog visibility. Those remain P4-E unless explicitly pulled forward.

---

## Key Decisions

| Area | Decision |
| --- | --- |
| Module placement | Add a dedicated Workbench `developer` module after SNS and before AI. Do not bury DB/API tools inside DevConsole or SNS/media. |
| DB browsing | Treat DB groups/files/tables as sensitive metadata. Show group/file/table names, but mask or categorize them in privacy mode and diagnostics. |
| SQL | Default and only P4-D mode is read-only. Allow `SELECT`, `PRAGMA`, and `EXPLAIN`. Block mutations before any network request. |
| Query diagnostics | Use endpoint family, method, status, duration, statement kind, row count, column count, and table category only. Do not record SQL text, keyword, row values, result cells, or raw response body. |
| API runner | Use a static local allowlist based on `cmd_http.go`. No arbitrary host/path/header/body editor. |
| Response preview | Redacted display by default. Copy/export must be redacted. Raw reveal is optional and only allowed when privacy mode is off plus explicit confirmation; the safer first implementation can omit raw reveal. |
| Cache clear | Separate cache tab/action with confirmation. Make clear it removes generated cache/media artifacts, not source WeChat DBs. |
| Fixtures | Use backend-shaped synthetic rows only. Keep `advanced-capabilities.json` free of real paths, keys, tokens, SQL results, or private messages. |
| Exports | Do not expose DB result CSV/XLSX export in P4-D. Backend supports it, but privacy/release review should happen separately. |
| Backend contract | Preserve sidecar behavior. Add frontend guards and adapters instead of changing Go code. |

---

## File Map

### Create

- `src/l4-atom/network/dbExplorerAdapters.ts`
- `src/l4-atom/network/dbExplorerAdapters.test.ts`
- `src/l4-atom/network/fetchDbExplorer.ts`
- `src/l4-atom/network/fetchDbExplorer.test.ts`
- `src/l4-atom/network/endpointCatalog.ts`
- `src/l4-atom/network/endpointCatalog.test.ts`
- `src/l4-atom/network/runEndpoint.ts`
- `src/l4-atom/network/runEndpoint.test.ts`
- `src/l2-coordinator/data-clerk/stores/useDeveloperToolsStore.ts`
- `src/l2-coordinator/data-clerk/stores/useDeveloperToolsStore.test.ts`
- `src/l2-coordinator/commander/dbExplorerViewModel.ts`
- `src/l2-coordinator/commander/dbExplorerViewModel.test.ts`
- `src/l2-coordinator/commander/endpointRunnerViewModel.ts`
- `src/l2-coordinator/commander/endpointRunnerViewModel.test.ts`
- `src/l2-coordinator/commander/useDeveloperToolsCommander.ts`
- `src/l3-molecule/developer/DeveloperToolsModule.tsx`
- `src/l3-molecule/developer/DbExplorer.tsx`
- `src/l3-molecule/developer/DbSearchPanel.tsx`
- `src/l3-molecule/developer/SqlQueryPanel.tsx`
- `src/l3-molecule/developer/EndpointRunner.tsx`
- `src/l3-molecule/developer/RawResponsePreview.tsx`
- `src/l3-molecule/developer/developerDisplay.ts`
- `src/l3-molecule/developer/developerDisplay.test.ts`

### Modify

- `e2e/fixtures/advanced-capabilities.json`
- `src/l4-atom/network/chatlogRawTypes.ts`
- `src/l4-atom/network/index.ts`
- `src/l2-coordinator/data-clerk/stores/index.ts`
- `src/l2-coordinator/commander/index.ts`
- `src/l2-coordinator/commander/workbenchViewModel.ts`
- `src/l2-coordinator/commander/workbenchViewModel.test.ts`
- `src/l2-coordinator/commander/useWorkbenchCommander.ts`
- `src/l3-molecule/workbench/WorkbenchRail.tsx`
- `src/l1-entry/pages/WorkbenchView.tsx`
- `src/styles/workbench-content.css`
- `src/utils/maskSecrets.ts` and `src/utils/maskSecrets.test.ts` only if P4-D tests prove a redaction gap.
- `specs/002-advanced-capabilities/capability-matrix.md`
- `specs/002-advanced-capabilities/e2e-matrix.md`
- `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`
- `specs/002-advanced-capabilities/README.md`
- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`
- `specs/001-ready-desktop-app/release-evidence.md` only after source/UI evidence exists.
- `task_plan.md`, `findings.md`, and `progress.md`

### Avoid Unless Proven Necessary

- `src-tauri/tauri.conf.json`
- `src-tauri/src/*`
- Tauri capabilities
- bundled sidecar config
- `chatlog_alpha` source

Any Rust/Tauri/CSP/capability change triggers `cd src-tauri && cargo test` and `pnpm tauri build`.

---

## Task D0: Contract, Fixture, And Baseline Freeze

**Purpose:** Prevent P4-D from guessing endpoint shapes or using shallow fixtures.

Steps:

- Confirm branch and dirty state before coding. Do not run destructive git commands.
- Re-read local `chatlog_alpha` DB handlers and `cmd_http.go` alias catalog.
- Expand `e2e/fixtures/advanced-capabilities.json` with backend-shaped synthetic DB/API data:
  - `/api/v1/db`: group-to-file map.
  - `/api/v1/db/tables`: table name arrays.
  - `/api/v1/db/data`: row map arrays.
  - `/api/v1/db/query`: row map arrays.
  - `/api/v1/db/search`: `keyword`, `mode`, `total`, `items`.
  - `/api/v1/cache/clear`: `message`, `deletedCount`.
  - API runner catalog entries and synthetic safe responses.
- Use synthetic names such as `SyntheticMessages`, `message_0.db`, `SyntheticContacts`, `sample_author`, and redaction-test-only markers.
- Do not include real paths, real wxids, real usernames, real SQL result text, media keys, tokens, or DB files.
- Update matrix rows from vague future ownership to P4-D ownership, then update status once implementation evidence exists.

Acceptance:

- Fixture JSON parses.
- DB fixture shape matches Go handler behavior closely enough for adapter tests.
- The fixture scan finds no real private paths, keys, or raw private message content.
- `findings.md` records the backend contract and current frontend absence.

---

## Task D1: L4 DB Raw Types, Adapters, And SQL Guard

**Purpose:** Normalize DB responses and block unsafe SQL before any fetcher sends it.

Steps:

- Extend `chatlogRawTypes.ts` with DB raw DTOs:
  - DB group map.
  - DB search response/item.
  - DB table row map.
  - cache clear response.
- Create `dbExplorerAdapters.ts` with pure functions for:
  - normalizing DB group/file lists into stable `DbFileRef` items
  - normalizing table names
  - normalizing row arrays into `columns` plus `rows`
  - extracting row count, column count, preview-safe values, and empty states
  - adapting DB search results
  - adapting cache clear result
  - classifying SQL as `select`, `pragma`, `explain`, `blocked`, or `empty`
- SQL guard rules:
  - Trim comments and whitespace enough to classify leading statement safely.
  - Allow only `SELECT`, `WITH ... SELECT`, `PRAGMA`, and `EXPLAIN`.
  - Block `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `REPLACE`, `TRUNCATE`, `VACUUM`, `ATTACH`, `DETACH`, `REINDEX`, `ANALYZE`, transaction/control statements, multi-statement input, and unknown leading tokens.
  - Do not log the SQL text when blocked.

Tests first:

- Adapter accepts backend array shapes for `db/data` and `db/query`.
- Adapter tolerates the current shallow fixture wrapper shape temporarily, if needed for migration, but tests should prefer backend-shaped arrays.
- SQL guard allows read-only forms and blocks mutations/multi-statements.
- Privacy formatter masks result values when requested.

Acceptance:

- No network, Zustand, Tauri, or UI imports in L4 adapter tests.
- Unsafe SQL classification returns a user-facing reason without retaining raw SQL in state history or diagnostics.

---

## Task D2: L4 DB Fetchers

**Purpose:** Provide typed, local-only DB access atoms.

Steps:

- Create `fetchDbExplorer.ts` with functions:
  - `fetchDbFiles(options)`
  - `fetchDbTables({ group, file }, options)`
  - `fetchDbTableData({ group, file, table, keyword, limit, offset }, options)`
  - `searchDb({ keyword, mode, limit }, options)`
  - `executeReadOnlyDbQuery({ group, file, sql }, options)`
  - `clearDbCache(options)`
- All URLs must be built from the known local sidecar base and documented paths.
- Append `format=json` where the backend supports multiple output formats.
- Use `requestJson()` and optional `RequestDiagnosticsOptions`.
- Never include raw SQL or keyword in diagnostic options.
- Ensure `executeReadOnlyDbQuery()` calls the SQL guard before building a URL and refuses blocked statements.
- Do not add CSV/XLSX export fetchers in P4-D.

Tests first:

- Fetchers call correct local paths and query keys.
- `format=json` is appended for DB data/query/search where applicable.
- Blocked SQL does not call `fetch`.
- Diagnostics events include only endpoint family/method/status/duration.
- Abort signal and timeout behavior follow existing `httpClient` conventions.

Acceptance:

- L4 fetchers do not import L2/Zustand/UI/Tauri.
- Errors from DB not ready/decrypting are preserved enough for L2 translation.

---

## Task D3: L4 Endpoint Catalog And Runner

**Purpose:** Implement a wx-cli-style local endpoint runner without creating a generic HTTP client.

Steps:

- Create `endpointCatalog.ts` with a curated catalog derived from `cmd_http.go`.
- Each catalog entry should define:
  - alias id
  - endpoint family
  - method
  - path template
  - description
  - parameter schema
  - default values
  - sensitivity level
  - whether the response body can be previewed redacted
- Include safe P4-D catalog entries:
  - health, ping
  - sessions, history, search, unread, members, new_messages, stats, favorites, contacts, chatrooms
  - sns_notifications, sns_feed, sns_search
  - db, db_tables, db_data, db_query, cache_clear
  - media aliases as metadata-only or disabled preview entries unless a safe key parameter is supplied by synthetic fixture
  - MCP aliases as listed but non-goal for full console
- Exclude raw `path`, arbitrary `headers`, `body-file`, arbitrary host, and generic POST body editor.
- Create `runEndpoint.ts` that:
  - accepts only a catalog id
  - validates params using catalog schema
  - constructs a local sidecar URL
  - defaults to JSON for `/api/v1/*` endpoints
  - handles GET and documented POST actions
  - returns a safe runner result with status, duration, endpoint family, redacted preview, and parsed body summary

Tests first:

- Unknown catalog id is rejected.
- Remote URLs cannot be supplied.
- Raw path override cannot be supplied.
- Params are encoded safely.
- `db_query` runner delegates to the same read-only SQL guard.
- `cache_clear` requires explicit confirmation metadata before dispatch.

Acceptance:

- API runner cannot perform requests outside `127.0.0.1:5030`.
- API runner cannot become a remote HTTP debugger by props, state mutation, or URL text input.

---

## Task D4: L2 Store, View Models, And Commander

**Purpose:** Keep orchestration, privacy, selected state, and diagnostics in L2.

Steps:

- Create `useDeveloperToolsStore.ts` with bounded state for:
  - active tab
  - DB files status and items
  - selected DB group/file/table
  - table list/data pagination
  - DB search filters/results
  - SQL editor draft, last safe statement kind, blocked reason, and result summary
  - cache clear pending/success/error result
  - endpoint runner selected alias, params, status, result summary, and bounded request history
- Do not persist raw SQL, raw response bodies, row values, or request bodies in history.
- Create `dbExplorerViewModel.ts`:
  - table/file labels
  - privacy-on masking for file/table/row values
  - row preview models with fixed max length
  - empty/error/loading copy
  - disabled states and action labels
- Create `endpointRunnerViewModel.ts`:
  - catalog grouping
  - param form model
  - safe request summary
  - redacted response preview
  - copy eligibility
  - privacy-on masking
- Create `useDeveloperToolsCommander.ts`:
  - load DB files when Developer module opens
  - load tables when DB file changes
  - load table data with paging and keyword
  - run DB search
  - run read-only SQL
  - clear cache only after confirmation
  - run endpoint catalog entries
  - record diagnostics through `createDiagnosticHttpOptions()` and optional safe local event sinks

Tests first:

- Store handles loading, ready, empty, error, retry, and reset.
- View models mask identities, row values, SQL text, file names as needed in privacy mode.
- Commander never records raw SQL or raw response body in request history.
- Cache clear flow cannot execute from an unconfirmed state.

Acceptance:

- L2 imports L4 fetchers and L3 imports only L2 types/view props, not fetchers.
- DB/API errors are translated into actionable Chinese UI copy.

---

## Task D5: Workbench Developer Module Integration

**Purpose:** Add a first-class Developer Tools entry without disturbing existing modules.

Steps:

- Extend `WorkbenchModule` with `developer`.
- Update rail order to `chat`, `stats`, `media`, `sns`, `developer`, `ai`, `graph`, `settings`.
- Add lucide icon such as `Wrench`, `TerminalSquare`, or `Database` in `WorkbenchRail.tsx`.
- Update `buildWorkbenchRailItems()`, `buildWorkbenchModuleBadges()`, `getInspectorTitle()`, and `isInspectorModule()`.
- Update `workbenchViewModel.test.ts` rail order and inspector title tests.
- Update `useWorkbenchCommander.ts` to call `useDeveloperToolsCommander()` when active module is `developer`.
- Update `WorkbenchView.tsx` to render `DeveloperToolsModule` in the inspector branch.
- Keep Settings route behavior unchanged.

Acceptance:

- Existing media and SNS rail entries remain in order.
- Developer module does not replace chat main content outside the established inspector/drawer pattern.
- Narrow single-pane behavior still works with the Developer module.

---

## Task D6: L3 Developer Tools UI

**Purpose:** Build a dense, operational UI for raw local tools.

Create props-driven components:

- `DeveloperToolsModule.tsx`
  - header, tab/segmented control, summary/status, privacy-safe notices
- `DbExplorer.tsx`
  - DB group/file selector
  - table list
  - table data grid
  - paging controls
  - keyword filter
  - empty/error/retry states
- `DbSearchPanel.tsx`
  - keyword input
  - quick/deep segmented mode
  - limit input bounded to backend max
  - result table/list with masked previews
- `SqlQueryPanel.tsx`
  - textarea or compact editor
  - read-only statement status
  - disabled run state for unsafe SQL
  - blocked reason
  - result summary and table preview
- `EndpointRunner.tsx`
  - catalog grouped list/select
  - generated param form
  - safe request summary
  - run/retry/cancel where supported
  - redacted response preview
- `RawResponsePreview.tsx`
  - redacted JSON/YAML/text preview
  - copy redacted content only
  - optional raw reveal only if privacy off and confirmed, or omit raw reveal in first implementation
- `developerDisplay.ts`
  - small pure formatting helpers for cells, previews, status labels, and privacy masking

Design rules:

- Use dense split/list/detail layouts, not marketing cards.
- Avoid nested cards.
- Keep table/cell dimensions stable and overflow-safe.
- Use icons for destructive/cache/run/copy controls when appropriate, with accessible labels.
- Do not put raw local paths, SQL, full row values, or response bodies in title, tooltip, aria-label, live region, or visible status.
- At 390px, collapse to one-column sections with horizontal data grids contained inside local scroll regions, not page-level overflow.

Acceptance:

- Loading, empty, error, success, retry, blocked SQL, cache confirmation, privacy-on, and narrow states render.
- Long table names, columns, values, and endpoint labels do not overlap.
- No L3 component imports L4 fetchers or Zustand stores directly.

---

## Task D7: Privacy And Diagnostics Hardening

**Purpose:** Make P4-D safe enough for a local-private-data app.

Steps:

- Use existing `maskDiagnosticText()` and add tests only where DB/API cases reveal gaps.
- Add redaction tests for:
  - SQL text
  - raw SQL result labels
  - `requestBody`, `responseBody`, `rawResponse`
  - DB local paths
  - `wxid_*`
  - endpoint query strings
- Ensure diagnostic events for DB fetchers include only:
  - source `http`
  - endpoint family
  - method
  - status
  - duration
  - safe recovery hint
  - aggregate counts when needed
- Ensure any local UI event for blocked SQL records only:
  - statement kind `blocked`
  - reason code
  - no SQL text
- Ensure endpoint runner history records only:
  - catalog id
  - endpoint family
  - method
  - status
  - duration
  - safe parameter keys, not parameter values
  - redaction state
- Keep DevConsole/export behavior fail-closed if redaction cannot be proven.

Acceptance:

- Diagnostic event store cannot contain raw SQL, row values, raw response body, private message content, token, key, local path, or arbitrary endpoint URL.
- Privacy-on screenshots are safe by default.

---

## Task D8: Docs And Spec Sync

**Purpose:** Keep planning, specs, and implementation evidence aligned.

Steps before implementation:

- Link this plan from the P4/P5 total route map P4-D section.
- Update `capability-matrix.md` DB/API rows with planned P4-D file ownership.
- Update `e2e-matrix.md` DB/API rows to point to this plan and expected evidence.
- Update `privacy-diagnostics-contract.md` with P4-D-specific implementation constraints if current table is too short.
- Update `README.md` in `specs/002-advanced-capabilities` to mention P4-D source/UI evidence after implementation.

Steps after implementation evidence:

- Update status to source/UI evidence or verified only after targeted tests and UI acceptance pass.
- Update `specs/001-ready-desktop-app/release-evidence.md` only if P4-D evidence was actually collected.
- Keep P5-B persistent E2E and P5-C packaged release gates separate from P4-D source/UI evidence.

Acceptance:

- Docs never claim packaged readiness unless `pnpm tauri build` and package smoke actually ran.
- Docs never include full implementation code or private DB examples.

---

## Task D9: UI Acceptance

**Purpose:** Verify Developer Tools work at desktop and narrow sizes with synthetic data.

Use a local mock or route interception for:

- `/health`
- `/api/v1/db`
- `/api/v1/db/tables`
- `/api/v1/db/data`
- `/api/v1/db/search`
- `/api/v1/db/query`
- `/api/v1/cache/clear`
- several catalog runner endpoints such as `/api/v1/sessions`, `/api/v1/stats`, `/api/v1/sns_feed`

Viewport checks:

- `1440x900`
- `390x820`

Scenarios:

- Open Workbench with `?codex-smoke=workbench-ready`.
- Open `开发者` rail entry.
- DB file list loads.
- Table list loads.
- Table data page loads.
- DB search quick and deep render synthetic results.
- Read-only SQL runs.
- Unsafe SQL is blocked before network.
- Cache clear opens confirmation and only dispatches after confirm.
- API runner catalog displays local aliases.
- API runner executes an allowlisted endpoint.
- Remote URL entry is absent.
- Privacy mode masks row previews, SQL/result text, response preview, identities, and local paths.

Required assertions:

- No page-level horizontal overflow.
- No visible raw SQL text in diagnostics or request history.
- No visible raw response body in DevConsole/export surfaces.
- No arbitrary `http://` remote input field.
- Browser console has no app-owned runtime errors.
- Screenshots contain synthetic data only.

---

## Task D10: Final Verification

Run targeted tests first:

```powershell
pnpm test src\l4-atom\network\dbExplorerAdapters.test.ts src\l4-atom\network\fetchDbExplorer.test.ts src\l4-atom\network\endpointCatalog.test.ts src\l4-atom\network\runEndpoint.test.ts
pnpm test src\l2-coordinator\data-clerk\stores\useDeveloperToolsStore.test.ts src\l2-coordinator\commander\dbExplorerViewModel.test.ts src\l2-coordinator\commander\endpointRunnerViewModel.test.ts src\l2-coordinator\commander\workbenchViewModel.test.ts
pnpm test src\l3-molecule\developer\developerDisplay.test.ts src\utils\maskSecrets.test.ts
```

Run architecture and privacy scans:

```powershell
rg -n "fetch\\(|requestJson|@l4/network|useDeveloperToolsStore|use[A-Z].*Store" src\l3-molecule\developer src\l1-entry\pages\WorkbenchView.tsx
rg -n "rawResponse|responseBody|requestBody|sql|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|dataKey|imgKey|token|wxid_|WeChat Files|sns/media/proxy" src specs docs e2e\fixtures
```

Expected scan interpretation:

- L3/L1 should not directly call network atoms.
- Test fixtures may include synthetic redaction markers.
- Production UI should not visibly render raw private markers.
- Planned docs may mention forbidden terms as rules, but not contain real data.

Run full frontend verification:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

Run Tauri/package checks only if Rust, Tauri, CSP, capabilities, sidecar launch, or packaged behavior changed:

```powershell
cd src-tauri
cargo test
cd ..
pnpm tauri build
```

Acceptance before claiming P4-D complete:

- Targeted P4-D tests pass.
- Full frontend verification passes.
- UI acceptance passes at desktop and narrow widths.
- No raw SQL, result cells, response bodies, keys, tokens, local paths, or private message text leak into visible UI, diagnostics, logs, screenshots, fixtures, or docs.
- Cache clear has explicit confirmation.
- API runner remains local allowlist only.
- No `chatlog_alpha` backend behavior changed unintentionally.

---

## Implementation Sequence

1. D0 fixture and matrix baseline.
2. D1 L4 DB adapters and SQL guard tests.
3. D2 L4 DB fetchers.
4. D3 endpoint catalog and runner.
5. D4 L2 store, view models, and commander.
6. D5 Workbench integration.
7. D6 L3 Developer Tools UI.
8. D7 privacy and diagnostics hardening.
9. D8 docs/spec sync.
10. D9 UI acceptance.
11. D10 final verification and evidence update.

---

## Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| SQL runner mutates DB because backend has no read-only guard | Critical | Frontend SQL classifier blocks non-read-only and multi-statement input before dispatch; tests prove blocked SQL does not call fetch. |
| API runner becomes a generic remote HTTP client | Critical | Static catalog, local base URL, no raw URL/path/header/body editor, tests for unknown id and remote URL rejection. |
| Diagnostics store raw SQL or row data | Critical | Use P4-A diagnostic bridge only; attributes are endpoint family/status/duration/counts; redaction tests cover SQL/result/body labels. |
| DB table preview leaks private messages in screenshots | High | Privacy mode masks cells; UI acceptance checks privacy-on screenshots; fixtures synthetic only. |
| Cache clear is destructive or misunderstood | High | Separate confirmation copy, disabled default, result summary only, no automatic clear. |
| Large DB tables freeze UI | High | Paging first; stable table dimensions; no full table export; consider virtualization only if table preview performance requires it. |
| Backend response shapes drift from shallow fixture assumptions | Medium | D0 updates fixtures to backend-shaped arrays/maps and adapters tolerate documented shapes. |
| P4-D conflicts with existing P4-B/P4-C dirty branch | Medium | Confirm baseline before coding; do not revert unrelated changes; keep file ownership narrow. |
| Raw response preview leaks secrets through copy/aria/title | High | Preview uses redacted content by default; copy redacted only; tests and UI scan include aria/title/live-region paths. |

---

## Reviewer Checklist

A reviewer should reject a P4-D implementation if any of these are true:

- L1 or L3 imports L4 network atoms directly.
- Endpoint runner accepts an arbitrary host, raw URL, or raw path.
- SQL text, result cells, raw response bodies, or query values enter diagnostics or request history.
- Unsafe SQL reaches `fetch`.
- Cache clear can run without confirmation.
- DB result export is added without a separate privacy/release review.
- Real WeChat data, local paths, keys, or private messages appear in fixtures, screenshots, docs, tests, or logs.
- Workbench rail order regresses existing `media` or `sns` modules.
- The final report claims packaged release readiness without package verification evidence.

---

## Implementation Evidence Through D9

- D0 fixture completed: `advanced-capabilities.json` now includes backend-shaped DB files, tables, data, query, search, cache clear, and API runner allowlist metadata.
- D1-D3 L4 completed: `dbExplorerAdapters.ts`, `fetchDbExplorer.ts`, and `endpointRunner.ts` implement row-map adapters, conservative read-only SQL guard, local sidecar fetchers, cache clear fetcher, fixed endpoint catalog, schema params, and redacted response preview.
- D4-D5 L2/Workbench completed: `useDeveloperToolsStore.ts`, `dbExplorerViewModel.ts`, `endpointRunnerViewModel.ts`, `useDeveloperToolsCommander.ts`, Workbench module order, rail icon, badge, toolbar entry, and inspector placement are implemented.
- D6-D7 L3/privacy completed: `DeveloperToolsModule`, `DbExplorer`, `DbSearchPanel`, `SqlQueryPanel`, `EndpointRunner`, `RawResponsePreview`, `ResultTable`, and `developerDisplay` render the Developer Tools module from props. Privacy mode hides DB file names/table values and disables SQL draft display.
- Targeted verification passed: P4-D targeted suite passed 8 files / 32 tests; `pnpm lint` passed; `pnpm typecheck` passed.
- Full verification passed: `pnpm test` passed 63 files / 294 tests; `pnpm build` passed; `pnpm verify` passed; `cargo test` passed 20 tests; `pnpm tauri build` produced MSI/NSIS artifacts.
- UI acceptance passed: Vite plus temporary mocked `127.0.0.1:5030` sidecar checked 1440x900 and 390x820 with privacy off/on. Developer rail opened, table data loaded, unsafe SQL guard rendered, API runner redacted preview rendered, no raw runner controls were visible, and no page-level horizontal overflow was detected.
- Scope note: Rust/Tauri/CSP/capabilities/sidecar launch and backend `chatlog_alpha` behavior were not changed in P4-D.

---

## Status

Implementation status on 2026-06-02: P4-D source/UI implementation and final verification are complete. P5-B persistent E2E and P5-C packaged release gates remain future work.

# P4-E Hook/MCP/Semantic Preview/Graph Residuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS for implementation: use `planning-with-files`, `executing-plans`, `test-driven-development`, `chatlog-debug` when failures appear, `app-productization`, `frontend-design`, `ui-acceptance`, `sidecar-integration` for backend-contract checks, and `verification-before-completion`. Evaluate `using-git-worktrees` before coding. Do not use Spec Kit unless the user explicitly asks to update Spec Kit artifacts.

**Goal:** Add the specialized `chatlog_alpha` residual capabilities for Hook/Hermes push monitoring, MCP local compatibility, semantic index preview, and graph ingest/QA without changing sidecar behavior, leaking private data, or creating a second frontend architecture.

**Architecture:** Preserve the existing four-layer contract. L4 owns raw HTTP/SSE atoms and adapters for hook, MCP summaries, semantic preview, and graph residual endpoints. L2 owns Zustand state, orchestration, privacy-aware view models, event-stream lifecycle, diagnostics, and error translation. L3 renders props-driven Developer/AI/Graph panels. L1 only places modules in the existing Workbench inspector and delegates callbacks.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS v4/project CSS variables, Tauri v2, local `chatlog_alpha` HTTP/SSE endpoints at `http://127.0.0.1:5030`, Vitest, mocked local sidecar UI acceptance.

**Current baseline:** This plan is written on `codex/p4b-media-chat-extensions`, a dirty development branch containing P4-B media/chat extensions, P4-C SNS, and P4-D Developer Tools source/UI implementation. Treat those changes as current product context. Do not rebase, revert, or ignore them during P4-E execution without user approval.

---

## Source Context Read

Read and use these before implementing P4-E:

- `AGENTS.md`
- `开发指南.md`
- `docs/总体开发规划.md`
- `.specify/memory/constitution.md`
- `specs/001-ready-desktop-app/contracts/local-backend.md`
- `specs/001-ready-desktop-app/contracts/diagnostics-package.md`
- `specs/001-ready-desktop-app/release-evidence.md`
- `specs/002-advanced-capabilities/README.md`
- `specs/002-advanced-capabilities/capability-matrix.md`
- `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`
- `specs/002-advanced-capabilities/e2e-matrix.md`
- `specs/002-advanced-capabilities/e2e-fixture-plan.md`
- `specs/002-advanced-capabilities/test-data-policy.md`
- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`
- `docs/superpowers/plans/2026-06-01-p4-p5-0-capability-diagnostics-e2e-foundation.md`
- `docs/superpowers/plans/2026-06-02-p4-a-developer-diagnostics-privacy-mode-2.md`
- `docs/superpowers/plans/2026-06-02-p4-c-sns-moments-module.md`
- `docs/superpowers/plans/2026-06-02-p4-d-db-explorer-wx-cli-api-debugger.md`
- `task_plan.md`, `findings.md`, and `progress.md`

Local `chatlog_alpha` references used for this plan:

- `E:\OneDrive - Default Directory\chatlog_alpha\README.md`
- `E:\OneDrive - Default Directory\chatlog_alpha\cmd\chatlog\cmd_http.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\skills\chatlog-http-cli\SKILL.md`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\http\route.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\http\mcp.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\http\hermes_weixin.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\http\hermes_qq.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\messagehook\service.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\semantic\store.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\semantic\manager.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\http\graph.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\temporalgraph\types.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\http\static\index.htm`

---

## Current Frontend Baseline

- P4-A diagnostics and privacy mode are available through the L2 diagnostic bridge, DevConsole 2.0, manifest 2.0 diagnostics export, and redaction helpers.
- P4-B/P4-C/P4-D established the implementation pattern P4-E should reuse:
  - backend-shaped synthetic fixture first
  - L4 raw DTOs, adapters, fetchers, optional diagnostics, and local-only URLs
  - L2 store, commander, and privacy-aware view models
  - L3 props-driven module surfaces
  - Workbench inspector integration
  - mocked local sidecar UI acceptance at desktop and narrow widths with privacy off/on
- Current Workbench modules are `chat | stats | media | sns | developer | ai | graph | settings`.
- `DeveloperToolsModule` currently has `db` and `api` tabs only. P4-E should extend this module for Hook and MCP instead of creating a second developer surface.
- `endpointRunner.ts` already includes allowlisted MCP aliases (`mcp`, `mcp_sse`, `mcp_message`) but does not provide a dedicated MCP status/help/tool view or stream lifecycle UI.
- Existing semantic L4/L2/L3 code covers config, index status/actions, semantic search, topics, profiles, QA, and QA SSE. It does not cover `/api/v1/semantic/index/preview`.
- Existing graph L4/L2/L3 code covers status, query, timeline, visualize, rebuild, pause, and resume. It does not cover graph config display/save, graph ingest message/business/event, or graph QA.
- Existing `semanticStreamParser` and L2 diplomat wrapper can be reused as the SSE parsing pattern for Hook stream, but Hook stream has distinct event names and payload shapes.
- `advanced-capabilities.json` has shallow P4-E samples only. It must be expanded before adapter tests.

---

## Backend Contract Evidence

### Hook/Hermes

Relevant routes:

- `GET /api/v1/hook/config`
- `POST /api/v1/hook/config`
- `GET /api/v1/hook/status`
- `GET /api/v1/hook/events`
- `POST /api/v1/hook/events/clear`
- `GET /api/v1/hook/stream`
- `GET /api/v1/hook/hermes/weixin`
- `POST /api/v1/hook/hermes/weixin`
- `GET /api/v1/hook/hermes/qq`
- `POST /api/v1/hook/hermes/qq`

Contract observations:

- Hook config returns `keywords`, `notify_mode`, `post_url`, `before_count`, `after_count`, `forward_all`, `forward_contacts`, and `forward_chatrooms`.
- Hook config save validates `notify_mode`, non-negative context counts, and Hermes install/channel readiness when `weixin` or `qq` targets are enabled.
- `forward_all=true` clears keywords and explicit forward target lists on the backend.
- Hook status returns operational fields such as `running`, keyword counts, notify mode, context counts, `mcp_notification_method`, `sse_clients`, `event_count`, `last_event_at`, `events_store_file`, and nested `weixin`/`qq` status.
- Hermes Weixin status can include `installed`, `hermes_bin`, `enabled`, `available`, `editable`, `hermes_home`, file paths, `account_id`, `token`, base URLs, home channel fields, and `error`.
- Hermes QQ status can include `installed`, `hermes_bin`, `enabled`, `available`, `editable`, `hermes_home`, file paths, `app_id`, `client_secret`, home channel fields, and `error`.
- Hook events contain high-risk fields: `talker`, `talker_name`, `sender`, `sender_name`, `keyword`, `trigger_content`, `context[]`, and delivery details.
- Hook stream emits `snapshot` with recent events, `hook_event` for incremental events, and keepalive ticks. It must be cancellable and recoverable in UI.

Privacy implication:

- P4-E must never show or record raw `token`, `client_secret`, `post_url`, full Hermes paths, talker IDs, sender IDs, trigger content, context message bodies, or raw event payloads in diagnostics, aria labels, tooltips, screenshots, copy/export, or runner history.

### MCP

Relevant routes:

- `ANY /mcp`
- `ANY /mcp/`
- `ANY /sse`
- `ANY /message`

Contract observations:

- `chatlog_alpha` uses `mcp-go` with a streamable HTTP server plus an SSE server using `/sse` and `/message`.
- Tools and prompts include local chatlog capabilities such as sessions, contacts, chatrooms, history, search, unread, members, new messages, stats, favorites, SNS feed/search/notifications, user profile, shared files, webhook notification, current time, and analysis prompts.
- P4-D already provides a fixed local endpoint runner catalog for MCP aliases. P4-E should add an MCP status/help view and safe tool/prompt inventory, not a full remote MCP client or arbitrary MCP message debugger.

Privacy implication:

- MCP tool names, prompt names, and local endpoint availability can be shown. Private tool arguments, prompt arguments containing talker IDs, request bodies, SSE message payloads, and model-generated private content must not be stored or exported.

### Semantic Index Preview

Relevant route:

- `GET /api/v1/semantic/index/preview`

Query parameters:

- `kind=message|entity|chunk|all`
- `talker`
- `limit`
- `offset`
- `format`

Response shape:

- `model`, `dim`, `kind`, `limit`, `offset`, `total`, `groups`, `items`, `store_path`, `sample_dims`, and `outliers`.
- Preview item fields include identity and content-bearing data such as `talker`, `sender`, `username`, `display`, `content`, `seq`, time fields, vector metadata, coordinates, and outlier scores.

Privacy implication:

- `store_path`, talker/sender/user identifiers, display names, and `content` are high-risk. The UI should preserve aggregate counts, kind/group labels, vector dimensions, coordinates, and outlier status, while masking or omitting raw content and identities in privacy mode. Diagnostics should record only kind, limit/offset range, status, counts, and timing.

### Graph Residuals

Relevant routes:

- `GET /api/v1/graph/config`
- `POST /api/v1/graph/config`
- `POST /api/v1/graph/ingest/message`
- `POST /api/v1/graph/ingest/business`
- `POST /api/v1/graph/ingest/event`
- `POST /api/v1/graph/qa`

Contract observations:

- Graph config gets/saves `workers` and `enqueue_workers`.
- Ingest endpoints accept either a single object or an array.
- Ingest responses return `ok`, `count`, `ids`, and `status`.
- Message ingest payloads include source/talker/sender names, message content, metadata, context, and participants.
- Business/event ingest payloads include source/type/time/title/content/entities/actors/targets/metadata.
- Graph QA accepts `query`, `window`, `start`, and `end`, then returns `answer` and `evidence`.

Privacy implication:

- P4-E should not expose a raw JSON editor for message ingest. First implementation should provide guarded, synthetic/example-driven forms for business/event ingest and count summaries only. Message ingest can be adapter/fetcher-ready and deferred from visible UI unless the implementation can prove a safe form. Graph QA evidence must be redacted or summarized; diagnostics must not store prompt text, answer text, or evidence text.

---

## Product Direction

P4-E is specialized and operational. It should be useful for power users and developers without polluting ordinary chat/media/SNS workflows.

Recommended placement:

- **Developer Tools / Hook:** Add a Hook tab under the existing Developer Tools module.
- **Developer Tools / MCP:** Add an MCP tab under the existing Developer Tools module, reusing P4-D API runner context for local aliases.
- **AI / Preview:** Add an Index Preview tab or panel inside the AI module after semantic readiness is known.
- **Graph / Advanced:** Add Graph Advanced controls inside the existing Graph module, behind explicit disclosure/segmented controls.

Primary user jobs:

- Inspect Hook push configuration and status safely.
- Configure notify targets and context counts without leaking credentials.
- Monitor Hook events and stream lifecycle with cancellation and reconnect.
- Clear Hook event history only after confirmation.
- Inspect Hermes Weixin/QQ availability and editable state while masking credentials and paths.
- View MCP local endpoint/help/tool inventory without invoking private tool calls.
- Preview semantic index health, groups, and outliers without revealing message content.
- Adjust graph worker settings and run guarded graph ingest/QA actions with summary-only output.

---

## Scope

Implement in P4-E:

- Backend-shaped P4-E fixtures in `advanced-capabilities.json`.
- Hook raw DTOs, adapters, fetchers, and stream parser.
- Hook store, commander, view model, and Developer Tools Hook tab.
- Hermes Weixin/QQ status/config adapters and guarded save forms.
- Hook events clear confirmation.
- MCP status/help/tool inventory adapters and Developer Tools MCP tab.
- Semantic index preview adapters, fetcher, AI store/commander/view model, and AI preview UI.
- Graph config, ingest, and QA adapters/fetchers.
- Graph store/commander/view model additions and explicit Graph Advanced UI.
- Privacy-safe display helpers for hook events, Hermes config, MCP metadata, semantic preview rows, graph ingest summaries, and graph QA evidence.
- Diagnostic events through existing P4-A bridge, with safe lifecycle summaries only.
- Targeted tests, architecture scans, privacy scans, and mocked browser UI acceptance.
- Docs/spec updates reflecting P4-E planning and later source/UI evidence.

Do not implement in P4-E:

- Backend changes to `chatlog_alpha`.
- Tauri sidecar launch changes.
- Tauri CSP/capability broadening unless implementation proves an unavoidable local-only need.
- Generic remote MCP client.
- Arbitrary MCP message body editor.
- Generic webhook sender beyond existing Hook/Hermes configuration fields.
- Raw Hook event export.
- Raw semantic vector export.
- Raw graph evidence export.
- Raw JSON graph ingest editor for private message payloads.
- Persistent Playwright/P5 E2E suite. P5-B owns that.
- Packaged release rerun claim. P5-C owns packaged release gates.

---

## Key Decisions

| Area | Decision |
| --- | --- |
| Module placement | Extend existing Developer Tools with Hook and MCP tabs; extend existing AI and Graph modules for residual intelligence features. Do not create a new top-level Workbench module unless implementation proves the inspector becomes unusable. |
| Hook stream | Use a Hook-specific SSE parser modeled after `semanticStreamParser`; support snapshot, hook_event, keepalive/unknown, cancellation, and reconnect state. |
| Hook events | Store adapted safe event summaries. Keep raw payload out of state history, diagnostics, copy, export, aria, title, and tooltips. |
| Hermes | Treat token, client secret, account id, home channel, Hermes paths, and config file paths as sensitive. UI may show status and masked field presence. |
| Hook config | `forward_all` disables keyword and target lists in UI, matching backend behavior. Save is explicit and recoverable. |
| MCP | Show tool/prompt inventory and local endpoint availability. Reuse API runner aliases for smoke calls. Do not implement arbitrary tool invocation or raw MCP body editing. |
| Semantic preview | Show groups, totals, kind, dimensions, coordinate/outlier metadata, and masked preview labels. Do not expose `store_path` or raw content by default. |
| Graph ingest | Business/event ingest may use structured forms. Message ingest should be fetcher-ready but visible UI can be deferred unless it has strict safe fields. |
| Graph QA | Display answer/evidence through privacy-safe summaries. Diagnostics record only status/count/window. |
| Diagnostics | Record endpoint family, method, status, duration, lifecycle event, counts, and redaction state only. |
| Fixtures | Use backend-shaped synthetic rows only; no real hook events, MCP arguments, semantic content, graph evidence, credentials, paths, or chat text. |

---

## File Map

### Create

- `src/l4-atom/network/hookAdapters.ts`
- `src/l4-atom/network/hookAdapters.test.ts`
- `src/l4-atom/network/fetchHook.ts`
- `src/l4-atom/network/fetchHook.test.ts`
- `src/l4-atom/network/hookStreamParser.ts`
- `src/l4-atom/network/hookStreamParser.test.ts`
- `src/l4-atom/network/mcpAdapters.ts`
- `src/l4-atom/network/mcpAdapters.test.ts`
- Deferred: `src/l4-atom/network/fetchMcpStatus.ts`; P4-E uses `mcpAdapters.ts` static local inventory because there is no safe lightweight status endpoint beyond protocol routes, and a live MCP client would widen the privacy surface.
- `src/l4-atom/network/fetchSemanticIndexPreview.ts`
- `src/l4-atom/network/graphResidualAdapters.ts`
- `src/l4-atom/network/graphResidualAdapters.test.ts`
- `src/l4-atom/network/fetchGraphResiduals.ts`
- `src/l2-coordinator/data-clerk/stores/useHookStore.ts`
- `src/l2-coordinator/data-clerk/stores/useHookStore.test.ts`
- `src/l2-coordinator/data-clerk/stores/useMcpStore.ts`
- `src/l2-coordinator/data-clerk/stores/useMcpStore.test.ts`
- `src/l2-coordinator/commander/hookViewModel.ts`
- `src/l2-coordinator/commander/hookViewModel.test.ts`
- `src/l2-coordinator/commander/mcpViewModel.ts`
- `src/l2-coordinator/commander/mcpViewModel.test.ts`
- `src/l2-coordinator/commander/semanticPreviewViewModel.ts`
- `src/l2-coordinator/commander/semanticPreviewViewModel.test.ts`
- `src/l2-coordinator/commander/graphResidualViewModel.ts`
- `src/l2-coordinator/commander/graphResidualViewModel.test.ts`
- `src/l2-coordinator/commander/useHookCommander.ts`
- `src/l2-coordinator/commander/useMcpCommander.ts`
- `src/l3-molecule/developer/HookConsole.tsx`
- `src/l3-molecule/developer/HookConfigPanel.tsx`
- `src/l3-molecule/developer/HookEventStream.tsx`
- `src/l3-molecule/developer/HermesBridgePanel.tsx`
- `src/l3-molecule/developer/McpPanel.tsx`
- `src/l3-molecule/developer/hookDisplay.ts`
- `src/l3-molecule/developer/hookDisplay.test.ts`
- `src/l3-molecule/developer/mcpDisplay.ts`
- `src/l3-molecule/developer/mcpDisplay.test.ts`
- `src/l3-molecule/semantic/SemanticIndexPreview.tsx`
- `src/l3-molecule/semantic/semanticPreviewDisplay.ts`
- `src/l3-molecule/semantic/semanticPreviewDisplay.test.ts`
- `src/l3-molecule/graph/GraphAdvancedPanel.tsx`
- Consolidated: graph ingest and QA UI live inside `src/l3-molecule/graph/GraphAdvancedPanel.tsx`; separate `GraphIngestPanel.tsx` and `GraphQAPanel.tsx` were not required for the current scoped surface.

### Modify

- `e2e/fixtures/advanced-capabilities.json`
- `src/l4-atom/network/chatlogRawTypes.ts`
- `src/l4-atom/network/index.ts`
- `src/l2-coordinator/api-docs/semantic.ts`
- `src/l2-coordinator/api-docs/graph.ts`
- `src/l2-coordinator/data-clerk/stores/useAiStore.ts`
- `src/l2-coordinator/data-clerk/stores/useGraphStore.ts`
- `src/l2-coordinator/data-clerk/stores/useDeveloperToolsStore.ts`
- `src/l2-coordinator/data-clerk/stores/index.ts`
- `src/l2-coordinator/commander/useAiCommander.ts`
- `src/l2-coordinator/commander/useGraphCommander.ts`
- `src/l2-coordinator/commander/useDeveloperToolsCommander.ts`
- `src/l2-coordinator/commander/index.ts`
- `src/l3-molecule/developer/DeveloperToolsModule.tsx`
- `src/l3-molecule/semantic/AiPanel.tsx`
- `src/l3-molecule/graph/GraphModule.tsx`
- `src/l3-molecule/graph/GraphModuleView.tsx`
- `src/styles/workbench-content.css`
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

## Task E0: Contract, Fixture, And Baseline Freeze

**Purpose:** Prevent P4-E from guessing endpoint shapes or storing raw high-risk payloads.

Steps:

- Confirm branch and dirty state before coding. Do not run destructive git commands.
- Re-read local `chatlog_alpha` Hook/Hermes/MCP/semantic preview/graph handlers.
- Expand `e2e/fixtures/advanced-capabilities.json` with backend-shaped synthetic P4-E data:
  - `/api/v1/hook/config`
  - `/api/v1/hook/status`
  - `/api/v1/hook/events`
  - `/api/v1/hook/events/clear`
  - `/api/v1/hook/stream` snapshot and hook_event samples
  - `/api/v1/hook/hermes/weixin`
  - `/api/v1/hook/hermes/qq`
  - MCP tool/prompt inventory and endpoint availability summaries
  - `/api/v1/semantic/index/preview`
  - `/api/v1/graph/config`
  - graph ingest message/business/event responses
  - `/api/v1/graph/qa`
- Include named synthetic redaction cases only where tests prove masking.
- Do not include real paths, tokens, app secrets, wxids, talker IDs, private message text, raw hook event content, semantic content, vector dumps, or graph evidence text.
- Update matrix rows from vague future ownership to this P4-E file ownership, keeping implementation status as documented until code lands.

Acceptance:

- Fixture JSON parses.
- Fixture shape matches Go handler behavior closely enough for adapter tests.
- P4-E fixture scan finds no real private paths, credentials, or private message content.
- `findings.md` records the backend contract and current frontend absence.

---

## Task E1: L4 Hook/Hermes Adapters And REST Fetchers

**Purpose:** Normalize Hook/Hermes REST responses and enforce privacy before data reaches L2.

Steps:

- Extend raw DTOs for hook config/status/events/clear and Hermes Weixin/QQ status/config.
- Create pure adapters for:
  - config display and save payloads
  - notify target parsing and canonical labels
  - hook status summary
  - Hermes status presence/masking
  - hook event safe summaries
  - clear result summary
- Create `fetchHook.ts` functions:
  - `fetchHookConfig`
  - `saveHookConfig`
  - `fetchHookStatus`
  - `fetchHookEvents`
  - `clearHookEvents`
  - `fetchHermesWeixinStatus`
  - `saveHermesWeixinConfig`
  - `fetchHermesQQStatus`
  - `saveHermesQQConfig`
- Append `format=json` for GET/POST routes where backend supports formatted output.
- Use `requestJson()` with optional P4-A diagnostics.
- Do not put raw post URL, token, client secret, account id, home channel, or file paths into diagnostics options.

Tests first:

- Config adapter maps backend snake_case fields and `forward_all` clearing behavior.
- Notify mode accepts combined modes such as `mcp,weixin`.
- Hermes adapter marks credential presence without exposing `token` or `client_secret`.
- Hook event adapter masks talker/sender/content/context and preserves status/count/time labels.
- Fetchers call correct paths/methods and emit only endpoint-family diagnostics.

Acceptance:

- L4 hook files do not import L2/Zustand/Tauri/UI.
- Raw high-risk fields are either omitted, represented as booleans/presence, or masked before L2 state.

---

## Task E2: L4 Hook Stream Parser And Stream Atom

**Purpose:** Handle Hook SSE incrementally and cancellably.

Steps:

- Create `hookStreamParser.ts` modeled after `semanticStreamParser`.
- Parse named events:
  - `snapshot`
  - `hook_event`
  - `keepalive` or comment/no-data events
  - `error`
  - unknown events
- Create a stream atom in `fetchHook.ts` or a dedicated `streamHookEvents.ts`.
- Support caller `AbortSignal`.
- Emit lifecycle diagnostics for connect, snapshot, hook_event count, abort, retryable failure, and stream close.
- Do not emit raw event payloads in diagnostics.

Tests first:

- Parser handles split chunks, multi-line data, snapshot events, hook_event events, malformed JSON, and unknown events.
- Aborting the caller signal stops the stream and produces a cancelled state without surfacing a false user error.
- Synthetic trigger content does not enter diagnostic attributes.

Acceptance:

- Hook stream is cancellable from UI and cleaned up when leaving the Hook tab/module.
- Stream events entering L2 are already adapted or immediately adapted by the commander before storage.

---

## Task E3: L2 Hook Store, Commander, And View Model

**Purpose:** Keep Hook orchestration, validation, privacy, and diagnostics in L2.

Steps:

- Create `useHookStore.ts` with bounded state for:
  - active Hook subtab
  - config status/draft/save status
  - hook status summary
  - recent events
  - stream status
  - clear confirmation state
  - Hermes Weixin/QQ statuses and drafts
  - errors per area
- Create `hookViewModel.ts` for:
  - config form model
  - notify mode target toggles
  - status summary
  - privacy-safe event rows
  - stream lifecycle labels
  - Hermes field presence and editability
  - clear confirmation copy
- Create `useHookCommander.ts`:
  - load config/status/events
  - save config
  - load/save Hermes Weixin and QQ config
  - start/stop stream
  - reconnect stream
  - clear events only after confirmation
  - record safe diagnostics and UI events
- Use `createDiagnosticHttpOptions()` for REST and safe local diagnostic events for blocked/stream lifecycle states.

Tests first:

- Store handles loading, ready, empty, error, streaming, stopped, reconnecting, and reset.
- View model masks event identities/content/context and Hermes sensitive fields in privacy mode.
- Commander stops the stream when the Hook tab is left.
- Clear events cannot execute without confirmation.

Acceptance:

- L2 never persists raw Hook event payloads, context message bodies, credentials, full paths, or raw post URLs.
- Hook errors are translated into actionable Chinese UI copy.

---

## Task E4: Developer Tools Hook UI

**Purpose:** Add a dense, operational Hook console inside the existing Developer Tools module.

Steps:

- Extend `DeveloperToolsActiveTab` with `hook`.
- Add a `HookConsole` tab to `DeveloperToolsModule`.
- Add presentational components:
  - `HookConfigPanel`
  - `HookEventStream`
  - `HermesBridgePanel`
- UI requirements:
  - segmented targets for MCP/POST/Weixin/QQ
  - toggle for forward-all
  - disabled keyword/target fields when forward-all is enabled
  - numeric inputs for before/after context counts
  - status row for running, subscribers, event count, last event time, and MCP notification method
  - event list/table with masked content and delivery status
  - start/stop/reconnect stream controls
  - clear events confirmation
  - Hermes Weixin/QQ availability/editability status and masked credential fields
- Use icons for refresh, stream, stop, clear, and save where appropriate.
- Keep controls dense and stable; no nested cards and no raw event JSON.

Acceptance:

- Loading, empty, error, success, retry, streaming, stopped, reconnect, clear-confirmation, privacy-on, and narrow states render.
- No raw credential/path/event content appears in visible text, aria labels, titles, tooltips, live regions, or copied text.
- L3 Hook components do not import L4 fetchers or Zustand stores directly.

---

## Task E5: MCP Status/Help View

**Purpose:** Provide MCP compatibility visibility without turning the app into an arbitrary MCP client.

Steps:

- Create `mcpAdapters.ts` and `fetchMcpStatus.ts` if a lightweight status/help request can be safely derived from backend behavior and fixture data.
- If no safe live status endpoint exists beyond protocol endpoints, build the MCP view from:
  - local endpoint runner catalog entries
  - static known tool/prompt inventory derived from backend source and fixture
  - optional smoke calls limited to P4-D allowlisted aliases
- Create `useMcpStore.ts`, `mcpViewModel.ts`, and `useMcpCommander.ts`.
- Add `McpPanel` tab in Developer Tools.
- Show:
  - local base URL
  - `/mcp`, `/sse`, `/message` route availability
  - tool/prompt names and safe descriptions
  - setup snippets for local clients only, with URLs but no private arguments
  - last smoke status from allowlisted endpoint runner
- Do not implement arbitrary tool invocation, arbitrary MCP body editor, raw SSE message composer, or remote MCP host input.

Tests first:

- Tool/prompt inventory is display-safe and privacy-on stable.
- View model omits private arguments and message bodies.
- Remote host/path/body controls are absent.
- Diagnostics record only route availability, tool count, and status.

Acceptance:

- MCP tab explains compatibility and route status without exposing a full protocol debugger.
- P4-D API Runner remains the only place for allowlisted endpoint smoke calls.

---

## Task E6: Semantic Index Preview

**Purpose:** Add semantic index observability without exposing raw message content or vector store paths.

Steps:

- Extend semantic raw DTOs and adapters with preview response/item/group/outlier models.
- Create `fetchSemanticIndexPreview.ts`.
- Extend `useAiStore` with preview filters, status, data, selected item, and errors.
- Extend `useAiCommander` with:
  - load preview
  - set kind/talker/limit/offset filters
  - retry preview
  - clear preview on conversation change if scoped
- Create `semanticPreviewViewModel.ts` and `SemanticIndexPreview.tsx`.
- Add an AI tab such as `预览` when semantic module is ready or index status is inspectable.
- Display:
  - total, groups, kind, model, dim, sample dims
  - table/list of preview rows with masked identity/content
  - coordinate/outlier metadata
  - bounded outlier list
  - pagination by offset/limit
- Never display `store_path`.

Tests first:

- Adapter maps backend preview groups/items/outliers.
- Adapter/view model omits or masks `store_path`, identities, and `content`.
- Fetcher appends `format=json` and safe query params.
- Privacy-on preview hides content and identity while preserving counts and metadata.

Acceptance:

- Preview rows have loading, empty, error, success, retry, pagination, and privacy-on states.
- Diagnostics record only kind, limit/offset, status, duration, total/counts, and recovery hint.

---

## Task E7: Graph Config, Ingest, And QA Residuals

**Purpose:** Expose graph management residuals in a guarded Graph Advanced area.

Steps:

- Create graph residual adapters for:
  - config get/save
  - ingest response summary
  - graph QA response summary
  - redacted evidence summary
- Create `fetchGraphResiduals.ts` functions:
  - `fetchGraphConfig`
  - `saveGraphConfig`
  - `ingestGraphBusiness`
  - `ingestGraphEvent`
  - optional `ingestGraphMessage` atom without visible UI until safe form is approved
  - `askGraphQA`
- Extend `useGraphStore` with config, ingest, QA status/data/errors, and draft state.
- Extend `useGraphCommander` with graph config load/save, guarded business/event ingest, optional message ingest support, and graph QA.
- Create `graphResidualViewModel.ts`.
- Add `GraphAdvancedPanel`, `GraphIngestPanel`, and `GraphQAPanel` under `GraphModule`.
- UI should:
  - show workers/enqueue workers with bounded numeric inputs
  - provide structured business/event ingest forms
  - require explicit submit confirmation for ingest
  - show count/id summary only
  - support graph QA query/window with answer/evidence redaction
  - keep 3D canvas explicit-load behavior unchanged

Tests first:

- Config adapter maps worker values and clamps invalid drafts in view model.
- Ingest adapters return count/status summary without preserving submitted raw content.
- Graph QA view model masks answer/evidence in privacy mode and diagnostics do not store query/answer/evidence text.
- Fetchers use POST JSON and safe diagnostics.

Acceptance:

- Graph Advanced does not mount 3D canvas automatically.
- Graph ingest and QA are explicit actions with loading/error/success/retry states.
- Message ingest visible UI is deferred unless safe form boundaries are proven.

---

## Task E8: Privacy And Diagnostics Hardening

**Purpose:** Make the raw-data-heavy P4-E surfaces safe enough for a local-private-data app.

Steps:

- Add redaction tests for:
  - Hook event `trigger_content`, `context.content`, talker/sender IDs, and delivery details
  - Hook POST URL
  - Hermes paths, account ID, token, app ID, client secret, home channel
  - MCP arguments and message bodies
  - semantic `store_path`, `content`, display names, talker/sender/user IDs
  - graph ingest content, metadata, participants, graph QA query/answer/evidence
- Ensure diagnostic events for P4-E include only:
  - endpoint family
  - method
  - status
  - duration
  - stream lifecycle event
  - aggregate counts
  - redaction state
  - fixed recovery hint
- Ensure copy/export surfaces are disabled or redacted by default.
- Ensure privacy-on screenshots are safe.
- Confirm no new remote calls except documented Hermes/backend local behavior already performed by sidecar.

Acceptance:

- Diagnostic event store cannot contain raw credentials, Hook event payloads, semantic preview content, graph QA evidence, local paths, or MCP private arguments.
- DevConsole/export remains fail-closed when redaction cannot be proven.

---

## Task E9: Workbench Integration And UI Acceptance

**Purpose:** Verify P4-E works in the current Workbench inspector and does not regress P4-B/C/D.

Workbench integration:

- Developer Tools tabs should become `db | api | hook | mcp`.
- Hook and MCP should load only when their tab/module is active.
- Hook stream must stop when leaving the Hook tab, leaving Developer module, or closing the inspector.
- AI preview should load only when its tab is active.
- Graph Advanced should not auto-run ingest/QA or mount the 3D canvas.

Mocked UI acceptance scenarios:

- `/workbench?codex-smoke=workbench-ready`
- `1440x900` and `390x820`
- privacy off and privacy on
- Developer Hook tab opens, config/status/events render, stream start/stop controls are visible, clear confirmation works.
- Developer MCP tab opens, tool/prompt inventory and route status render, no raw body/remote host controls appear.
- AI preview tab opens, preview rows/groups/outliers render from synthetic data, privacy mode masks content.
- Graph Advanced opens, worker config form renders, business/event ingest is confirmation-gated, graph QA redacted summary renders.

Required assertions:

- No page-level horizontal overflow.
- No visible synthetic secret/private markers.
- No raw Hook event content, credentials, semantic store path, semantic content, graph evidence, raw MCP message body, or local path appears in DOM text.
- Browser console has no app-owned runtime errors.
- Existing media, SNS, DB/API runner entries still open.

---

## Task E10: Docs, Evidence, And Final Verification

**Purpose:** Keep planning, specs, and implementation evidence aligned.

Docs before implementation:

- Link this plan from the P4/P5 total route map P4-E section.
- Update `capability-matrix.md` P4-E rows with planned file ownership.
- Update `e2e-matrix.md` P4-E rows to point to this plan and expected evidence.
- Update `privacy-diagnostics-contract.md` with P4-E-specific constraints if current rules are too short.
- Update `README.md` in `specs/002-advanced-capabilities` to mention P4-E planning.

Docs after implementation evidence:

- Update status to source/UI evidence or verified only after targeted tests and UI acceptance pass.
- Update `specs/001-ready-desktop-app/release-evidence.md` only if P4-E evidence was actually collected.
- Keep P5-B persistent E2E and P5-C packaged release gates separate from P4-E source/UI evidence.

Targeted tests:

```powershell
pnpm test src\l4-atom\network\hookAdapters.test.ts src\l4-atom\network\fetchHook.test.ts src\l4-atom\network\hookStreamParser.test.ts
pnpm test src\l4-atom\network\mcpAdapters.test.ts src\l4-atom\network\semanticAdapters.test.ts src\l4-atom\network\graphResidualAdapters.test.ts
pnpm test src\l2-coordinator\data-clerk\stores\useHookStore.test.ts src\l2-coordinator\data-clerk\stores\useMcpStore.test.ts
pnpm test src\l2-coordinator\commander\hookViewModel.test.ts src\l2-coordinator\commander\mcpViewModel.test.ts src\l2-coordinator\commander\semanticPreviewViewModel.test.ts src\l2-coordinator\commander\graphResidualViewModel.test.ts
pnpm test src\l3-molecule\developer\hookDisplay.test.ts src\l3-molecule\developer\mcpDisplay.test.ts src\l3-molecule\semantic\semanticPreviewDisplay.test.ts src\l3-molecule\graph\graphDisplay.test.ts
```

Architecture and privacy scans:

```powershell
rg -n "fetch\(|requestJson|@l4/network|useHookStore|useMcpStore|useAiStore|useGraphStore" src\l3-molecule\developer src\l3-molecule\semantic src\l3-molecule\graph src\l1-entry\pages\WorkbenchView.tsx
rg -n "trigger_content|context|token|client_secret|post_url|hermes_home|store_path|vector_sample|rawResponse|responseBody|requestBody|wxid_|WeChat Files|graph evidence|mcp message" src specs docs e2e\fixtures
```

Full frontend verification:

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

Acceptance before claiming P4-E complete:

- Targeted P4-E tests pass.
- Full frontend verification passes.
- UI acceptance passes at desktop and narrow widths with privacy off/on.
- Hook stream is cancellable and cleaned up.
- Hook events, Hermes config, MCP message bodies, semantic preview content, graph ingest content, and graph QA evidence do not leak into visible UI, diagnostics, logs, screenshots, fixtures, docs, or exports.
- No generic MCP client, generic remote HTTP client, raw graph ingest JSON editor, raw event export, raw vector export, or raw evidence export was added.
- No `chatlog_alpha` backend behavior changed unintentionally.

---

## Implementation Sequence

1. E0 fixture and matrix baseline.
2. E1 Hook/Hermes L4 adapters and REST fetchers.
3. E2 Hook stream parser and stream atom.
4. E3 Hook L2 store, commander, and view model.
5. E4 Developer Tools Hook UI.
6. E5 MCP status/help view.
7. E6 Semantic index preview.
8. E7 Graph config, ingest, and QA residuals.
9. E8 privacy and diagnostics hardening.
10. E9 Workbench integration and UI acceptance.
11. E10 docs/evidence/final verification.

---

## Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Hook event stream leaks private content | Critical | Adapt events before storage; visible rows show masked summaries; diagnostics record lifecycle/counts only. |
| Hermes credentials or paths leak through UI/diagnostics | Critical | Represent credentials as presence flags, mask fields, add redaction tests, forbid raw paths/tokens/secrets in diagnostics. |
| MCP panel becomes a generic protocol debugger | High | Static inventory plus local route status only; no arbitrary body, host, or tool invocation. |
| Semantic preview exposes raw message content/vector store path | Critical | Omit `store_path`; mask/omit content and identities; show counts, groups, dimensions, and outlier metadata. |
| Graph ingest creates unsafe raw JSON editor | High | Structured business/event forms only; message ingest visible UI deferred until safe boundaries are proven. |
| Graph QA leaks evidence text | High | Redacted evidence summary by default; diagnostics only status/count/window. |
| Stream cancellation regresses when leaving modules | High | Commander stops stream on tab/module/inspector exit; tests cover abort cleanup. |
| P4-E overloads Developer Tools inspector | Medium | Keep Hook/MCP in tabs, lazy-load active tab data, use compact table/list layouts. |
| Existing P4-B/C/D dirty branch conflicts | Medium | Confirm baseline before coding; do not revert unrelated changes; keep file ownership narrow. |
| Docs claim release readiness too early | Medium | Source/UI evidence is separate from P5-B persistent E2E and P5-C packaged release gates. |

---

## Reviewer Checklist

A reviewer should reject a P4-E implementation if any of these are true:

- L1 or L3 imports L4 network atoms directly beyond already-recorded module-root exceptions.
- Hook events store raw `trigger_content`, context message bodies, talker IDs, sender IDs, credentials, post URLs, or full paths.
- Hook stream cannot be cancelled or keeps running after leaving the Hook tab/module.
- Hermes token/client secret/account/home channel values appear in visible text, aria labels, titles, tooltips, diagnostics, screenshots, or exports.
- MCP UI accepts arbitrary remote host, raw request body, raw path, raw headers, or arbitrary tool invocation.
- Semantic preview displays `store_path` or raw content by default.
- Graph ingest exposes a raw private-message JSON editor without a separate approved privacy review.
- Graph QA stores query/answer/evidence in diagnostics or request history.
- P4-E fixtures include real chat content, paths, credentials, media keys, or private messages.
- Final report claims packaged release readiness without packaged verification evidence.

---

## Status

Source/UI status on 2026-06-03: P4-E implementation is complete for the planned source/UI scope. It adds Hook/Hermes adapters/fetchers/stream parsing, Hook and MCP Developer Tools tabs, semantic index preview, and Graph Advanced config/business ingest/event ingest/QA summary controls. Message ingest visible UI remains deferred by design until a separately proven safe structured form exists. P5-B persistent E2E and P5-C packaged release gates remain future work.

Implementation evidence:

- Targeted P4-E suite passed: 16 files / 29 tests.
- Final frontend verification passed after documentation updates: `pnpm lint`, `pnpm typecheck`, `pnpm test` (81 files / 330 tests), `pnpm build`, and `pnpm verify`.
- Continuous-working-tree Tauri verification also passed: `cargo test` in `src-tauri` passed 20 tests, and `pnpm tauri build` produced MSI/NSIS bundles. This remains build evidence, not a packaged smoke rerun.
- Mocked browser acceptance passed against synthetic local sidecar data for Developer Hook/MCP, AI Preview, and Graph Advanced at desktop and narrow widths with privacy checks.
- No `chatlog_alpha` sidecar behavior, Tauri launch args, CSP, capabilities, or bundle config were changed for P4-E.

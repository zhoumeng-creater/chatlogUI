# Advanced Capability Matrix

Status values:

- `not-started`: not yet designed beyond this matrix.
- `documented`: product and privacy rules are known.
- `foundation-ready`: diagnostic and fixture foundation exists.
- `implemented`: UI/API implementation exists.
- `verified`: implementation has targeted tests and UI evidence.
- `deferred`: intentionally excluded with a documented reason.

| Capability group | Backend endpoint family | Desktop product target | Initial batch | Privacy level | L4 ownership target | L2 ownership target | Diagnostic event need | Fixture strategy | Release/CSP impact | P4/P5-0 status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Core query | `/api/v1/db`, `/api/v1/sessions`, `/api/v1/history`, `/api/v1/search`, `/api/v1/stats`, `/api/v1/contacts`, `/api/v1/chatrooms` | Existing workbench and P4 polish | Existing/P4 | High | Existing core fetchers | Existing commanders/stores | HTTP status, duration, readiness category | `core-ready.json` | None in foundation | foundation-ready |
| Media resources | `/image/*key`, `/video/*key`, `/file/*key`, `/voice/*key`, `/data/*path` | Media preview/download with safe failure states | P4-B | Critical | Future media fetchers | Future media commander | Endpoint family only, no key/path/query | synthetic metadata only | Future `media-src` review | documented |
| Chat extensions | `/api/v1/unread`, `/api/v1/members`, `/api/v1/new_messages`, `/api/v1/favorites` | Conversation badges, member inspector, favorites module | P4-B | High | Future chat extension fetchers | Workbench/chat commander | Status, duration, count summary | synthetic rows | None in foundation | documented |
| SNS | `/api/v1/sns_notifications`, `/api/v1/sns_feed`, `/api/v1/sns_search`, `/api/v1/sns/media/proxy` | SNS browse/search module | P4-C | Critical | `snsAdapters.ts`, `fetchSnsFeed.ts`, `fetchSnsSearch.ts`, `fetchSnsNotifications.ts` | `useSnsStore`, `useSnsCommander`, `snsViewModel` | Endpoint family and counts only; proxy must not log `url` or `key` | backend-shaped synthetic feed/notification/search rows | Local media proxy only; P4-C made no new CSP change beyond P4-B media-src | verified |
| DB explorer/query/cache | `/api/v1/db/search`, `/api/v1/db/tables`, `/api/v1/db/data`, `/api/v1/db/query`, `/api/v1/cache/clear` | Developer DB explorer with read-only default | P4-D | Critical | `dbExplorerAdapters.ts`, `fetchDbExplorer.ts` | `useDeveloperToolsStore`, `useDeveloperToolsCommander`, `dbExplorerViewModel` | Query action summary, table category, statement kind, counts only; no raw SQL/result body | backend-shaped synthetic schema/table rows | Destructive cache clear needs confirmation; no DB export in P4-D | verified |
| API runner/wx-cli | chatlog-compatible list/call style HTTP API access | Local endpoint runner for documented sidecar APIs | P4-D | High | `endpointRunner.ts` | `useDeveloperToolsCommander`, `endpointRunnerViewModel` | Endpoint family, method, status, duration, parameter keys only; no raw body | synthetic endpoint catalog and safe responses | Must remain local allowlist only; no arbitrary URL/path/header/body editor | verified |
| Hook/Hermes/SSE | `/api/v1/hook/config`, `/api/v1/hook/status`, `/api/v1/hook/events`, `/api/v1/hook/events/clear`, `/api/v1/hook/stream`, Hermes endpoints | Developer Tools Hook console with config/status/events/stream and Hermes bridge panels | P4-E | High | `hookAdapters.ts`, `fetchHook.ts`, `hookStreamParser.ts` | `useHookStore`, `useHookCommander`, `hookViewModel` | Event count, stream lifecycle, cancellation; no raw event payload | backend-shaped synthetic config/status/events/stream/Hermes rows | SSE cancellation evidence passed; no CSP change | verified |
| MCP | `/mcp`, `/mcp/`, `/sse`, `/message` | Developer Tools MCP status/help/tool inventory, plus P4-D local alias compatibility | P4-E | High | `mcpAdapters.ts`; existing `endpointRunner.ts` aliases | `useMcpStore`, `useMcpCommander`, `mcpViewModel` | Tool/prompt counts and route status only; no private arguments | synthetic tool/prompt inventory and route status | Local-only sidecar boundary; no generic MCP client | verified |
| Semantic residuals | `/api/v1/semantic/index/preview` | AI module semantic index preview | P4-E | High | `fetchSemanticIndexPreview.ts` plus semantic preview adapters | AI store/commander preview state and `semanticPreviewViewModel` | Index range, count, status, no message content or store path | backend-shaped synthetic preview rows/groups/outliers | None | verified |
| Graph residuals | `/api/v1/graph/config`, graph ingest business/event, graph QA | Graph Advanced config, guarded ingest, and QA residuals | P4-E | High | `graphResidualAdapters.ts`, `fetchGraphResiduals.ts` | graph store/commander additions and `graphResidualViewModel` | Ingest type/count/status and QA count/window only; no raw event/evidence content | backend-shaped synthetic graph config/ingest/QA rows | Heavy UI remains explicit-load; no 3D auto-mount | verified |
| Diagnostics | sidecar logs, HTTP events, Tauri/system events, updater, release smoke | Unified local diagnostic console and export | P4-A/P5 | Medium to High | diagnostic event helpers | diagnostic store/view model | Required foundation output | diagnostics-redaction fixture | No auto-upload | foundation-ready |
| Release quality | contract fixtures, browser E2E, visual/a11y checks, release evidence | Repeatable quality gates without real data | P5 | Medium | fixture/mock assets | release/test orchestration | Smoke summary only | all fixtures synthetic | Future CI changes | foundation-ready |

## Endpoint-Level Inventory

Source basis: local `chatlog_alpha` route and README evidence captured during P4/P5 planning, current frontend L4 atoms, and the ready-desktop release evidence. This table is the handoff checklist for later P4/P5 batches; an endpoint that is not implemented in UI still needs a product owner, privacy rule, fixture target, and E2E target.

| Capability | Method | Endpoint or route | Desktop surface | L4 target | L2 target | Fixture target | E2E state target | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Health | GET | `/health` | Setup center and service controls | existing readiness atom | setup/workbench commanders | `core-ready.json` | setup loading, healthy, conflict, DB unavailable | foundation-ready |
| Core query | GET | `/api/v1/db` | Setup readiness and status bar | existing readiness atom | setup/workbench commanders | `core-ready.json` | service healthy but DB unavailable, DB ready | foundation-ready |
| Core query | GET | `/api/v1/sessions` | Workbench session list | existing core fetcher | workbench commander | `core-ready.json` | empty and ready session list | foundation-ready |
| Core query | GET | `/api/v1/history` | Conversation transcript | existing core fetcher | workbench commander | `core-ready.json` | loading, empty, ready, error transcript | foundation-ready |
| Core query | GET | `/api/v1/search` | Global/local search | existing core fetcher | search/workbench commander | `core-ready.json` | no results, results, retry/error | foundation-ready |
| Core query | GET | `/api/v1/stats` | Stats inspector/dashboard | existing stats fetcher | stats/workbench commander | `core-ready.json` | privacy on/off, empty, ready | foundation-ready |
| Core query | GET | `/api/v1/contacts` | Contacts/session metadata | existing core fetcher | workbench commander | `core-ready.json` | privacy on/off identity masking | foundation-ready |
| Core query | GET | `/api/v1/chatrooms` | Chatroom metadata | existing core fetcher | workbench commander | `core-ready.json` | privacy on/off room masking | foundation-ready |
| Semantic baseline | GET | `/api/v1/semantic/config` | AI settings | existing semantic fetcher | AI commander | `core-ready.json` | configured, missing provider, missing credentials | verified |
| Semantic baseline | POST | `/api/v1/semantic/config` | AI settings save | existing semantic fetcher | AI commander | `core-ready.json` | save success and safe error summary | verified |
| Semantic baseline | GET | `/api/v1/semantic/index/status` | AI index status | existing semantic fetcher | AI commander | `core-ready.json` | idle, running, paused, error | verified |
| Semantic baseline | POST | `/api/v1/semantic/index/rebuild` | AI index action | existing semantic action atom | AI commander | `core-ready.json` | explicit action, progress, retry | verified |
| Semantic baseline | POST | `/api/v1/semantic/index/pause` | AI index action | existing semantic action atom | AI commander | `core-ready.json` | pause action and recovery | verified |
| Semantic baseline | POST | `/api/v1/semantic/index/resume` | AI index action | existing semantic action atom | AI commander | `core-ready.json` | resume action and recovery | verified |
| Semantic baseline | POST | `/api/v1/semantic/index/clear` | AI index action | existing semantic action atom | AI commander | `core-ready.json` | destructive confirmation and recovery | verified |
| Semantic baseline | GET | `/api/v1/semantic/search` | Semantic search | existing semantic fetcher | AI commander | `core-ready.json` | no results, rerank, results, error | verified |
| Semantic baseline | GET | `/api/v1/semantic/topics` | Topic explorer | existing semantic fetcher | AI commander | `core-ready.json` | empty, ready, privacy on/off | verified |
| Semantic baseline | GET | `/api/v1/semantic/profiles` | Profile explorer | existing semantic fetcher | AI commander | `core-ready.json` | empty, ready, privacy on/off | verified |
| Semantic baseline | POST | `/api/v1/semantic/test` | Provider test | existing semantic fetcher | AI commander | `core-ready.json` | missing credential, success, failure | verified |
| Semantic baseline | POST | `/api/v1/semantic/qa` | AI QA non-streaming fallback | existing semantic fetcher | AI commander | `core-ready.json` | answer, no answer, error | verified |
| Semantic baseline | POST | `/api/v1/semantic/qa/stream` | AI QA streaming | existing SSE atom | AI commander/SSE parser | `core-ready.json` | incremental tokens, cancel, retry | verified |
| Semantic residual | GET | `/api/v1/semantic/index/preview` | P4-E AI index preview tab/panel | `fetchSemanticIndexPreview.ts` | AI commander preview state and `semanticPreviewViewModel` | `advanced-capabilities.json` | preview rows, groups, outliers, empty/error, privacy on/off | verified |
| Graph baseline | GET | `/api/v1/graph/status` | Graph status panel | existing graph fetcher | graph commander | `core-ready.json` | disabled, ready, running, error | verified |
| Graph baseline | GET | `/api/v1/graph/query` | Graph query table | existing graph fetcher | graph commander | `core-ready.json` | empty, results, privacy on/off | verified |
| Graph baseline | GET | `/api/v1/graph/visualize` | Explicit 3D graph | existing graph fetcher | graph commander | `core-ready.json` | explicit load, nonblank canvas, narrow viewport | verified |
| Graph baseline | GET | `/api/v1/graph/timeline` | Graph timeline | existing graph fetcher | graph commander | `core-ready.json` | empty, rows, privacy on/off | verified |
| Graph baseline | POST | `/api/v1/graph/rebuild` | Graph action | existing graph action atom | graph commander | `core-ready.json` | explicit action, progress, recovery | verified |
| Graph baseline | POST | `/api/v1/graph/pause` | Graph action | existing graph action atom | graph commander | `core-ready.json` | pause action and recovery | verified |
| Graph baseline | POST | `/api/v1/graph/resume` | Graph action | existing graph action atom | graph commander | `core-ready.json` | resume action and recovery | verified |
| Graph residual | GET | `/api/v1/graph/config` | P4-E Graph Advanced config | `fetchGraphResiduals.ts` | graph commander config state and `graphResidualViewModel` | `advanced-capabilities.json` | safe config display, no secret/private fields | verified |
| Graph residual | POST | `/api/v1/graph/config` | P4-E Graph Advanced config save | `fetchGraphResiduals.ts` | graph commander guarded save | `advanced-capabilities.json` | guarded save and recovery | verified |
| Graph residual | POST | `/api/v1/graph/ingest/message` | Adapter/fetcher-visible UI deferred | deferred from visible UI | deferred | `advanced-capabilities.json` | explicit action, count summary only, no raw message content | deferred |
| Graph residual | POST | `/api/v1/graph/ingest/business` | P4-E structured business ingest | `fetchGraphResiduals.ts` | graph commander guarded ingest | `advanced-capabilities.json` | explicit action, count summary only | verified |
| Graph residual | POST | `/api/v1/graph/ingest/event` | P4-E structured event ingest | `fetchGraphResiduals.ts` | graph commander guarded ingest | `advanced-capabilities.json` | explicit action, count summary only | verified |
| Graph residual | POST | `/api/v1/graph/qa` | P4-E Graph Advanced QA | `fetchGraphResiduals.ts` | graph commander QA state and `graphResidualViewModel` | `advanced-capabilities.json` | answer/evidence redacted summary, no raw evidence text | verified |
| Media resources | GET | `/image/*key` | Future media preview | future media fetcher | media commander | `advanced-capabilities.json` | placeholder, loading, error, safe thumbnail | documented |
| Media resources | GET | `/video/*key` | Future media preview | future media fetcher | media commander | `advanced-capabilities.json` | placeholder, load error, CSP-reviewed playback | documented |
| Media resources | GET | `/file/*key` | Future file download | future media fetcher | media commander | `advanced-capabilities.json` | confirmation, error, no raw key text | documented |
| Media resources | GET | `/voice/*key` | Future voice playback | future media fetcher | media commander | `advanced-capabilities.json` | placeholder, load error, CSP-reviewed playback | documented |
| Media resources | GET | `/data/*path` | Future data resource | future media fetcher | media commander | `advanced-capabilities.json` | no raw path, explicit failure state | documented |
| Chat extensions | GET | `/api/v1/unread` | Future unread badges | future chat extension fetcher | workbench/chat commander | `advanced-capabilities.json` | count badge, zero state, privacy on/off | documented |
| Chat extensions | GET | `/api/v1/members` | Future member inspector | future chat extension fetcher | workbench/chat commander | `advanced-capabilities.json` | empty, list, privacy on/off | documented |
| Chat extensions | GET | `/api/v1/new_messages` | Future new message surface | future chat extension fetcher | workbench/chat commander | `advanced-capabilities.json` | incremental rows, retry/error | documented |
| Chat extensions | GET | `/api/v1/favorites` | Future favorites browser | future chat extension fetcher | workbench/chat commander | `advanced-capabilities.json` | empty, list, privacy on/off | documented |
| SNS | GET | `/api/v1/sns_notifications` | P4-C SNS notifications tab/badge | `fetchSnsNotifications.ts` | `useSnsCommander` | `advanced-capabilities.json` | empty, list, privacy on/off | verified |
| SNS | GET | `/api/v1/sns_feed` | P4-C SNS timeline | `fetchSnsFeed.ts` | `useSnsCommander` | `advanced-capabilities.json` | empty, list, media placeholder | verified |
| SNS | GET | `/api/v1/sns_search` | P4-C SNS in-module search | `fetchSnsSearch.ts` | `useSnsCommander` | `advanced-capabilities.json` | no results, results, retry/error | verified |
| SNS | GET | `/api/v1/sns/media/proxy` | P4-C local-only SNS media preview | `snsAdapters.ts` local proxy validation | `useSnsCommander`/L3 media grid | `advanced-capabilities.json` | proxy placeholder, no `url` or `key` logging | verified |
| DB explorer | GET | `/api/v1/db/search` | P4-D DB search panel | `fetchDbExplorer.ts` | developer commander | `advanced-capabilities.json` | bounded quick/deep search, no raw result export | verified |
| DB explorer | GET | `/api/v1/db/tables` | P4-D DB table list | `fetchDbExplorer.ts` | developer commander | `advanced-capabilities.json` | table list, empty, error | verified |
| DB explorer | GET | `/api/v1/db/data` | P4-D paged table data | `fetchDbExplorer.ts` | developer commander | `advanced-capabilities.json` | paged rows, privacy on/off, no raw path | verified |
| DB explorer | GET | `/api/v1/db/query` | P4-D read-only SQL runner | `dbExplorerAdapters.ts` SQL guard plus `fetchDbExplorer.ts` | developer commander | `advanced-capabilities.json` | read-only guard, blocked unsafe SQL before fetch, no raw SQL/result in diagnostics | verified |
| DB explorer | POST | `/api/v1/cache/clear` | P4-D cache action | `fetchDbExplorer.ts` | developer commander | `advanced-capabilities.json` | destructive confirmation and recovery | verified |
| API runner | local allowlist | `chatlog http list/call` compatible catalog | P4-D local endpoint runner | `endpointRunner.ts` | developer commander | `advanced-capabilities.json` | allowlisted local endpoints only, no arbitrary remote URL input | verified |
| Hook/Hermes/SSE | GET | `/api/v1/hook/config` | P4-E Developer Hook config | `fetchHook.ts` | `useHookCommander` | `advanced-capabilities.json` | config display, no secrets/post URL leak | verified |
| Hook/Hermes/SSE | POST | `/api/v1/hook/config` | P4-E Developer Hook config save | `fetchHook.ts` | `useHookCommander` | `advanced-capabilities.json` | guarded save and recovery | verified |
| Hook/Hermes/SSE | GET | `/api/v1/hook/status` | P4-E Developer Hook monitor | `fetchHook.ts` | `useHookCommander`/`hookViewModel` | `advanced-capabilities.json` | idle/running/error, subscriber and count summaries | verified |
| Hook/Hermes/SSE | GET | `/api/v1/hook/events` | P4-E Developer Hook event list | `fetchHook.ts` | `useHookStore`/`hookViewModel` | `advanced-capabilities.json` | empty, list, privacy on/off, no raw content/context | verified |
| Hook/Hermes/SSE | POST | `/api/v1/hook/events/clear` | P4-E Developer Hook event clear | `fetchHook.ts` | `useHookCommander` | `advanced-capabilities.json` | confirmation and recovery | verified |
| Hook/Hermes/SSE | GET | `/api/v1/hook/stream` | P4-E Developer Hook event stream | `hookStreamParser.ts` and `streamHookEvents` | `useHookCommander` stream lifecycle | `advanced-capabilities.json` | incremental snapshot/events, cancel, reconnect, cleanup on tab exit | verified |
| Hook/Hermes/SSE | GET/POST | `/api/v1/hook/hermes/weixin` | P4-E Hermes Weixin bridge | `fetchHook.ts`/`hookAdapters.ts` | `useHookCommander`/`hookViewModel` | `advanced-capabilities.json` | local-only status/action summary, no token/path/channel leak | verified |
| Hook/Hermes/SSE | GET/POST | `/api/v1/hook/hermes/qq` | P4-E Hermes QQ bridge | `fetchHook.ts`/`hookAdapters.ts` | `useHookCommander`/`hookViewModel` | `advanced-capabilities.json` | local-only status/action summary, no client secret/path/channel leak | verified |
| MCP | ANY | `/mcp` | P4-E MCP route/tool status | `mcpAdapters.ts` static local inventory plus P4-D aliases | `useMcpCommander`/`mcpViewModel` | `advanced-capabilities.json` | tool list only, no private args | verified |
| MCP | ANY | `/mcp/` | P4-E MCP route/tool status | `mcpAdapters.ts` static local inventory plus P4-D aliases | `useMcpCommander`/`mcpViewModel` | `advanced-capabilities.json` | tool list only, no private args | verified |
| MCP | ANY | `/sse` | P4-E MCP route status | MCP status surface; no arbitrary stream composer | `useMcpCommander`/`mcpViewModel` | `advanced-capabilities.json` | route status and cancellation only | verified |
| MCP | ANY | `/message` | P4-E MCP message route status | MCP status surface; no raw message body editor | `useMcpCommander`/`mcpViewModel` | `advanced-capabilities.json` | request summary only, no raw body | verified |
| Diagnostics | n/a | local diagnostic event model | Dev console and diagnostics export | diagnostic event helpers | diagnostic store/view model | `diagnostics-redaction.json` | source/level/privacy filters, export redaction | foundation-ready |
| Release quality | n/a | synthetic fixtures and mock notes | Future P5 tests | fixture assets | release/test orchestration | all fixtures | route/state/viewport/privacy matrix | foundation-ready |

## Ownership Rules

- Media and SNS proxy events must never persist raw keys, raw proxy URLs, or raw file paths.
- DB query and API runner events must never persist raw SQL, request body, response body, or private result values.
- Hook, MCP, semantic, and graph stream events must be cancellable and recorded as lifecycle summaries.
- Any endpoint family not implemented in UI must remain `documented` or `deferred`, not silently absent.
- The E2E owner for each row is recorded in `e2e-matrix.md`; P4/P5-0 records the matrix and synthetic fixtures, while runnable Playwright suites belong to later P5 phases.

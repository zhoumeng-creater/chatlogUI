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
| SNS | `/api/v1/sns_notifications`, `/api/v1/sns_feed`, `/api/v1/sns_search`, `/api/v1/sns/media/proxy` | SNS browse/search module | P4-C | Critical | Future SNS fetchers | Future SNS commander | Endpoint family only; proxy must not log `url` or `key` | synthetic feed/notification/search rows | Future media/proxy security review | documented |
| DB explorer/query/cache | `/api/v1/db/search`, `/api/v1/db/tables`, `/api/v1/db/data`, `/api/v1/db/query`, `/api/v1/cache/clear` | Developer DB explorer with read-only default | P4-D | Critical | Future DB explorer fetchers | Future developer commander | Query action summary, table name category, no raw SQL/result body | synthetic schema/table rows | Destructive cache clear needs confirmation | documented |
| API runner/wx-cli | chatlog-compatible list/call style HTTP API access | Local endpoint runner for documented sidecar APIs | P4-D | High | Future runner fetcher | Developer commander | Endpoint family, method, status, duration; no raw body | synthetic endpoint catalog | Must remain local allowlist only | documented |
| Hook/Hermes/SSE | `/api/v1/hook/config`, `/api/v1/hook/status`, `/api/v1/hook/events`, `/api/v1/hook/events/clear`, `/api/v1/hook/stream`, Hermes endpoints | Push event monitor and config surface | P4-E | High | Future hook fetchers/SSE parser | Hook commander | Event count, stream lifecycle, cancellation | synthetic event stream rows | SSE cancellation evidence required | documented |
| MCP | `/mcp`, `/mcp/`, `/sse`, `/message` | MCP status/tool visibility and developer bridge | P4-E | High | Future MCP fetchers | Developer/MCP commander | Tool names and status only, no private arguments | synthetic tool list | Local-only sidecar boundary | documented |
| Semantic residuals | `/api/v1/semantic/index/preview`, pause/resume residuals | Index preview and management polish | P4-E | High | Existing/future semantic fetchers | AI commander | Index range, count, status, no message content | synthetic preview rows | None in foundation | documented |
| Graph residuals | graph ingest message/business/event, config, QA residuals | Graph management and QA polish | P4-E | High | Existing/future graph fetchers | Graph commander | Ingest type, count, status, no raw event content | synthetic graph rows | Heavy UI remains explicit-load | documented |
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
| Semantic residual | GET | `/api/v1/semantic/index/preview` | Future index preview | future semantic fetcher | AI commander | `advanced-capabilities.json` | preview rows, empty, privacy on/off | documented |
| Graph baseline | GET | `/api/v1/graph/status` | Graph status panel | existing graph fetcher | graph commander | `core-ready.json` | disabled, ready, running, error | verified |
| Graph baseline | GET | `/api/v1/graph/query` | Graph query table | existing graph fetcher | graph commander | `core-ready.json` | empty, results, privacy on/off | verified |
| Graph baseline | GET | `/api/v1/graph/visualize` | Explicit 3D graph | existing graph fetcher | graph commander | `core-ready.json` | explicit load, nonblank canvas, narrow viewport | verified |
| Graph baseline | GET | `/api/v1/graph/timeline` | Graph timeline | existing graph fetcher | graph commander | `core-ready.json` | empty, rows, privacy on/off | verified |
| Graph baseline | POST | `/api/v1/graph/rebuild` | Graph action | existing graph action atom | graph commander | `core-ready.json` | explicit action, progress, recovery | verified |
| Graph baseline | POST | `/api/v1/graph/pause` | Graph action | existing graph action atom | graph commander | `core-ready.json` | pause action and recovery | verified |
| Graph baseline | POST | `/api/v1/graph/resume` | Graph action | existing graph action atom | graph commander | `core-ready.json` | resume action and recovery | verified |
| Graph residual | GET | `/api/v1/graph/config` | Future graph config | future graph config fetcher | graph/developer commander | `advanced-capabilities.json` | safe config display, no secret fields | documented |
| Graph residual | POST | `/api/v1/graph/config` | Future graph config | future graph config fetcher | graph/developer commander | `advanced-capabilities.json` | guarded save and recovery | documented |
| Graph residual | POST | `/api/v1/graph/ingest/message` | Future graph ingest | future graph ingest fetcher | developer/graph commander | `advanced-capabilities.json` | explicit action, count summary only | documented |
| Graph residual | POST | `/api/v1/graph/ingest/business` | Future graph ingest | future graph ingest fetcher | developer/graph commander | `advanced-capabilities.json` | explicit action, count summary only | documented |
| Graph residual | POST | `/api/v1/graph/ingest/event` | Future graph ingest | future graph ingest fetcher | developer/graph commander | `advanced-capabilities.json` | explicit action, count summary only | documented |
| Graph residual | POST | `/api/v1/graph/qa` | Future graph QA | future graph QA fetcher | graph commander | `advanced-capabilities.json` | answer, no answer, no raw evidence text | documented |
| Media resources | GET | `/image/*key` | Future media preview | future media fetcher | media commander | `advanced-capabilities.json` | placeholder, loading, error, safe thumbnail | documented |
| Media resources | GET | `/video/*key` | Future media preview | future media fetcher | media commander | `advanced-capabilities.json` | placeholder, load error, CSP-reviewed playback | documented |
| Media resources | GET | `/file/*key` | Future file download | future media fetcher | media commander | `advanced-capabilities.json` | confirmation, error, no raw key text | documented |
| Media resources | GET | `/voice/*key` | Future voice playback | future media fetcher | media commander | `advanced-capabilities.json` | placeholder, load error, CSP-reviewed playback | documented |
| Media resources | GET | `/data/*path` | Future data resource | future media fetcher | media commander | `advanced-capabilities.json` | no raw path, explicit failure state | documented |
| Chat extensions | GET | `/api/v1/unread` | Future unread badges | future chat extension fetcher | workbench/chat commander | `advanced-capabilities.json` | count badge, zero state, privacy on/off | documented |
| Chat extensions | GET | `/api/v1/members` | Future member inspector | future chat extension fetcher | workbench/chat commander | `advanced-capabilities.json` | empty, list, privacy on/off | documented |
| Chat extensions | GET | `/api/v1/new_messages` | Future new message surface | future chat extension fetcher | workbench/chat commander | `advanced-capabilities.json` | incremental rows, retry/error | documented |
| Chat extensions | GET | `/api/v1/favorites` | Future favorites browser | future chat extension fetcher | workbench/chat commander | `advanced-capabilities.json` | empty, list, privacy on/off | documented |
| SNS | GET | `/api/v1/sns_notifications` | Future SNS module | future SNS fetcher | SNS commander | `advanced-capabilities.json` | empty, list, privacy on/off | documented |
| SNS | GET | `/api/v1/sns_feed` | Future SNS timeline | future SNS fetcher | SNS commander | `advanced-capabilities.json` | empty, list, media placeholder | documented |
| SNS | GET | `/api/v1/sns_search` | Future SNS search | future SNS fetcher | SNS commander | `advanced-capabilities.json` | no results, results, retry/error | documented |
| SNS | GET | `/api/v1/sns/media/proxy` | Future SNS media proxy | future SNS media fetcher | SNS commander | `advanced-capabilities.json` | proxy placeholder, no `url` or `key` logging | documented |
| DB explorer | GET | `/api/v1/db/search` | Future DB search | future DB explorer fetcher | developer commander | `advanced-capabilities.json` | read-only search, no raw result export | documented |
| DB explorer | GET | `/api/v1/db/tables` | Future DB table list | future DB explorer fetcher | developer commander | `advanced-capabilities.json` | table list, empty, error | documented |
| DB explorer | GET | `/api/v1/db/data` | Future DB table data | future DB explorer fetcher | developer commander | `advanced-capabilities.json` | paged rows, privacy on/off, no raw path | documented |
| DB explorer | GET | `/api/v1/db/query` | Future query runner | future DB explorer fetcher | developer commander | `advanced-capabilities.json` | read-only guard, no raw SQL/result in diagnostics | documented |
| DB explorer | POST | `/api/v1/cache/clear` | Future cache action | future DB explorer fetcher | developer commander | `advanced-capabilities.json` | destructive confirmation and recovery | documented |
| API runner | local allowlist | `chatlog http list/call` compatible catalog | Future local endpoint runner | future runner fetcher | developer commander | `advanced-capabilities.json` | allowlisted local endpoints only | documented |
| Hook/Hermes/SSE | GET | `/api/v1/hook/config` | Future hook console | future hook fetcher | hook commander | `advanced-capabilities.json` | config display, no secrets | documented |
| Hook/Hermes/SSE | POST | `/api/v1/hook/config` | Future hook console | future hook fetcher | hook commander | `advanced-capabilities.json` | guarded save and recovery | documented |
| Hook/Hermes/SSE | GET | `/api/v1/hook/status` | Future hook monitor | future hook fetcher | hook commander | `advanced-capabilities.json` | idle, connected, error | documented |
| Hook/Hermes/SSE | GET | `/api/v1/hook/events` | Future event list | future hook fetcher | hook commander | `advanced-capabilities.json` | empty, list, privacy on/off | documented |
| Hook/Hermes/SSE | POST | `/api/v1/hook/events/clear` | Future event action | future hook fetcher | hook commander | `advanced-capabilities.json` | confirmation and recovery | documented |
| Hook/Hermes/SSE | GET | `/api/v1/hook/stream` | Future event stream | future SSE atom | hook commander/SSE parser | `advanced-capabilities.json` | incremental events, cancel, reconnect | documented |
| Hook/Hermes/SSE | GET/POST | `/api/v1/hook/hermes/weixin` | Future Hermes bridge | future hook fetcher | hook commander | `advanced-capabilities.json` | local-only status/action summary | documented |
| Hook/Hermes/SSE | GET/POST | `/api/v1/hook/hermes/qq` | Future Hermes bridge | future hook fetcher | hook commander | `advanced-capabilities.json` | local-only status/action summary | documented |
| MCP | ANY | `/mcp` | Future MCP status/tool view | future MCP fetcher | developer/MCP commander | `advanced-capabilities.json` | tool list only, no private args | documented |
| MCP | ANY | `/mcp/` | Future MCP status/tool view | future MCP fetcher | developer/MCP commander | `advanced-capabilities.json` | tool list only, no private args | documented |
| MCP | ANY | `/sse` | Future MCP stream view | future SSE atom | developer/MCP commander | `advanced-capabilities.json` | incremental status, cancel | documented |
| MCP | ANY | `/message` | Future MCP message bridge | future MCP fetcher | developer/MCP commander | `advanced-capabilities.json` | request summary only, no raw body | documented |
| Diagnostics | n/a | local diagnostic event model | Dev console and diagnostics export | diagnostic event helpers | diagnostic store/view model | `diagnostics-redaction.json` | source/level/privacy filters, export redaction | foundation-ready |
| Release quality | n/a | synthetic fixtures and mock notes | Future P5 tests | fixture assets | release/test orchestration | all fixtures | route/state/viewport/privacy matrix | foundation-ready |

## Ownership Rules

- Media and SNS proxy events must never persist raw keys, raw proxy URLs, or raw file paths.
- DB query and API runner events must never persist raw SQL, request body, response body, or private result values.
- Hook, MCP, semantic, and graph stream events must be cancellable and recorded as lifecycle summaries.
- Any endpoint family not implemented in UI must remain `documented` or `deferred`, not silently absent.
- The E2E owner for each row is recorded in `e2e-matrix.md`; P4/P5-0 records the matrix and synthetic fixtures, while runnable Playwright suites belong to later P5 phases.

# Privacy And Diagnostics Contract

## Local-Only Rule

Diagnostics are a local troubleshooting feature. They are not telemetry. The app must not upload diagnostics automatically, schedule background collection, or include raw private chat content in routine logs, screenshots, fixtures, release evidence, or exported reports.

## User Trigger

Diagnostic export is allowed only after a clear user action such as clicking `导出诊断`. The user must be able to avoid export. If redaction cannot be proven, export must fail closed with a user-visible error.

## Allowed Diagnostic Content

- App version, build channel, platform, architecture, and package readiness.
- Sidecar lifecycle summary, health status, port conflict class, and owned/unowned process classification.
- Endpoint family, HTTP method, status, duration, retryable flag, and error category.
- Readiness summaries for setup, service, DB, workbench, semantic, graph, updater, and release smoke.
- Counts and aggregate summaries.
- Redaction result and blocked-export reason.

## Forbidden Diagnostic Content

- Raw `dataKey`, image key, API key, token, secret, credential, password, or authorization header.
- Private message body, message snippets, raw search result text, raw SQL result values, or raw response bodies.
- Unredacted contact names, group names, aliases, sender IDs, avatars, or private identities.
- Full local paths, database paths, media paths, cache paths, or profile directories.
- SNS proxy `url` and `key` query values.
- Media resource keys and `/data/*path` values.
- Generic remote HTTP targets outside the documented update/provider cases.

## Diagnostic Event Shape

Each local diagnostic event should be safe before it enters L2 state:

```ts
type DiagnosticEventSource = "http" | "sidecar" | "tauri" | "ui" | "updater" | "release";
type DiagnosticEventLevel = "debug" | "info" | "warn" | "error";
type DiagnosticEventPrivacy = "safe" | "redacted" | "blocked";
```

Safe attributes are restricted to values such as endpoint family, method, status, duration, category, retryable flag, and aggregate counts. Attributes that cannot be proven safe must be omitted or replaced with `[redacted]`.

## P4-A Implementation Status

As of 2026-06-02, P4-A implements Diagnostics and Privacy Mode 2.0 on top of the P4/P5-0 foundation:

- Production HTTP diagnostics are wired through an L2-owned callback bridge. L4 network and system atoms still do not import L2, Zustand, Tauri state, or UI modules.
- Core setup/workbench/search/stats/chat readiness, semantic, graph, DB readiness/status, and semantic QA SSE families can emit safe local events with endpoint family, method, status, duration, category, retryability, optional correlation ID, and fixed recovery hint.
- UI, Tauri window material, sidecar log subscription, updater, and diagnostics export failures are translated by L2 into local diagnostic events.
- DevConsole 2.0 adds source, level, privacy, endpoint family, time range, and failed-only filters, plus safe status/duration/recovery labels and a detail panel that only renders safe rows.
- Diagnostics export uses manifest version 2.0 as line-based report content. It records app/build/update/platform/package/backend/sidecar/readiness/setup/release/redaction summaries while preserving the existing user-triggered fail-closed export path.
- Redaction helpers cover media resource keys/paths, SNS proxy query values, SQL, request query/body labels, raw response/body labels, local WeChat/profile paths, credentials, tokens, and synthetic private message markers.
- Setup diagnostics, Settings/About diagnostics, and Workbench DevConsole use the same L2 report/redaction model.
- No telemetry, automatic upload, generic remote HTTP client, Tauri CSP broadening, Tauri capability broadening, Rust export payload shape change, or `chatlog_alpha` sidecar contract change was introduced.

## P4-D Implementation Status

As of 2026-06-02, P4-D implements DB Explorer and the local API runner under the same privacy contract:

- DB query dispatch uses an L4 read-only SQL classifier and blocks mutation, multi-statement, empty, and unsupported SQL before `fetch`.
- DB table/query/search UI masks file names, result values, and search previews in privacy mode.
- Cache clear is explicit and confirmation-gated.
- API runner requests are built from a fixed local-sidecar catalog and schema parameters; there is no raw host, URL, path, header, body, or body-file editor.
- Runner history stores only method, endpoint family, status, duration, parameter keys, and redaction state.
- Raw response preview is recursively redacted before rendering.

## P4-E Implementation Status

As of 2026-06-03, P4-E has source/UI evidence for Hook/MCP/Semantic Preview/Graph Residuals. The implementation follows these additional constraints and keeps P5-B persistent E2E plus P5-C packaged release gates separate:

- Hook event state may retain only adapted summaries. Raw `talker`, `talker_name`, `sender`, `sender_name`, `keyword`, `trigger_content`, `context`, delivery payloads, POST URLs, and event JSON must not enter diagnostics, exported reports, copied text, aria labels, titles, or screenshots.
- Hook stream diagnostics may record lifecycle events such as connect, snapshot count, event count, abort, retryable failure, and close. They must not record raw SSE data.
- Hermes Weixin/QQ status and config may show installed/enabled/available/editable states and masked field presence. Tokens, client secrets, account IDs, app IDs, home channel values, base URLs, config files, env files, and Hermes home paths must be masked or omitted.
- MCP UI is limited to local route status, tool/prompt names, safe descriptions, and allowlisted local smoke summaries. It must not provide arbitrary remote hosts, raw path overrides, raw headers, raw request bodies, arbitrary tool invocation, raw SSE message composition, or message-body export.
- Semantic index preview may show kind, totals, groups, model/dimension metadata, coordinates, and outlier status. It must not display or export `store_path`, raw `content`, raw display names, talker/sender/user IDs, or vector store paths by default.
- Graph residual UI may show worker config, guarded business/event ingest summaries, and redacted QA summaries. Message ingest visible UI is deferred unless a separate safe structured form is proven. Graph diagnostics must not store query text, submitted content, metadata, participants, answer text, or evidence text.
- Mocked browser acceptance covered Developer Hook/MCP, AI preview, and Graph Advanced at desktop and narrow widths with synthetic fixtures only. No raw Hook content, Hermes credential/path/channel, MCP raw body/control, semantic store path/content, or graph answer/evidence marker appeared in the checked DOM text.

## Retention

- UI state may retain a bounded number of events in memory.
- P4/P5-0 default retention is 1000 events in the diagnostic event store.
- Diagnostic export should include summaries rather than full event history by default.
- Logs and events are cleared by explicit user action or app session end.

## UI Requirements

- Privacy mode must not remove important aggregate status. It should mask private identity and content while preserving service status, endpoint family, counts, and redaction state.
- Dev Console should show source, level, privacy state, category, time, and safe summary.
- Icon-only actions require accessible labels or visible text.
- Error states must explain whether export was blocked by redaction, sidecar state, or filesystem failure.

## Module-Specific Rules

| Module | Diagnostic rule |
| --- | --- |
| Media | Record resource family and status only. Do not record keys or file paths. |
| SNS | Record endpoint family and counts only. Do not record feed text, proxy URL, or media key. |
| DB explorer | Record table category, statement kind, status, duration, and aggregate counts only. Do not record raw SQL, keywords, row values, result cells, database paths, or exported table data. Unsafe SQL must be blocked before network dispatch. |
| API runner | Local allowlist only. Do not become a generic remote HTTP client. Do not record parameter values, request bodies, response bodies, arbitrary URLs, headers, or raw path overrides. |
| Hook/Hermes | Record stream lifecycle and event counts, not raw event payloads. |
| MCP | Record tool names/status only, not private arguments or message bodies. |
| Semantic/Graph | Record index/graph status and counts, not raw private message content. |

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
| DB explorer | Record table category and status only. Do not record raw SQL or result cells. |
| API runner | Local allowlist only. Do not become a generic remote HTTP client. |
| Hook/Hermes | Record stream lifecycle and event counts, not raw event payloads. |
| MCP | Record tool names/status only, not private arguments or message bodies. |
| Semantic/Graph | Record index/graph status and counts, not raw private message content. |

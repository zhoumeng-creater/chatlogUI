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
- Favorites preview/source/chat values, member usernames/display names, unread summaries, and new message bodies/state maps.
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

## P4-B Implementation Status

As of 2026-06-02, P4-B implements media attachments, favorites, members, unread badges, and explicit incremental-message refresh under the same local-only diagnostics contract:

- Media fetchers and commanders emit only endpoint family, method, status, duration, error category, and fixed recovery metadata. Raw media keys, media paths, redirect data paths, and blob contents are not diagnostic attributes.
- Message attachments render stable labels and privacy-safe placeholders. Image preview uses blob object URLs; video, voice, and file surfaces use download/placeholder states rather than native playback, so no Tauri `media-src` or capability broadening was introduced.
- Favorites, group members, unread summaries, and new message bodies are masked in privacy mode across visible text and narrow-viewport screenshots.
- Redaction helpers now denylist P4-B-specific labels: favorites preview/source, member identity fields, unread summaries, new message body, and `newMessagesState`.
- Source/UI evidence passed at `1440x900` privacy off and `390x820` privacy on with synthetic route mocks. Persistent P5-B browser automation and packaged P5-C reruns are not yet added.

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
| Media | Record resource family and status only. Do not record keys, file paths, redirect paths, or blob contents. |
| Favorites | Record endpoint/status/count only. Do not record preview text, sender/source identity, chat title, or favorite item content. |
| Members/unread/new messages | Record endpoint/status/count only. Do not record member usernames/display names, unread summaries, new message bodies, or raw state maps. |
| SNS | Record endpoint family and counts only. Do not record feed text, proxy URL, or media key. |
| DB explorer | Record table category and status only. Do not record raw SQL or result cells. |
| API runner | Local allowlist only. Do not become a generic remote HTTP client. |
| Hook/Hermes | Record stream lifecycle and event counts, not raw event payloads. |
| MCP | Record tool names/status only, not private arguments or message bodies. |
| Semantic/Graph | Record index/graph status and counts, not raw private message content. |

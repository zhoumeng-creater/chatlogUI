# Contract: Diagnostic Package

## Purpose

Define the required user-triggered troubleshooting bundle for evidence-driven debugging without exposing local private WeChat data.

## Trigger

- Diagnostics are generated only after an explicit user action.
- Automatic diagnostic collection or upload is not allowed.
- The user must be able to cancel or avoid generating a package.

## Allowed Content

A diagnostic package may include redacted evidence for:

- App version, platform, architecture, and build channel.
- Tauri package readiness and sidecar bundle presence.
- Sidecar lifecycle state, health status, exit summary, and port conflict classification.
- Selected data source validation category with sensitive paths redacted.
- Readiness state summaries for setup, backend, dashboard, search, semantic, graph, and settings.
- Recent app errors with private data removed.
- Command or smoke-test summaries produced during release validation.

## Forbidden Content

A diagnostic package must not include:

- Raw `dataKey` values.
- API keys, provider credentials, tokens, or secrets.
- Private message bodies or unredacted snippets.
- Unredacted contact names, chatroom names, aliases, avatars, or private identities.
- Sensitive local paths that reveal user identity or private data locations.
- Real local database files, cache files, media files, or fixtures containing private messages.

## Redaction Result

The package must record whether redaction completed successfully. If redaction cannot be completed, package creation must fail with a user-visible error instead of exporting unsafe content.

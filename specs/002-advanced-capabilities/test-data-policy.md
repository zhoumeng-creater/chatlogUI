# Advanced Capabilities Test Data Policy

## Purpose

Advanced P4/P5 features touch media, SNS, DB rows, hook events, MCP tool calls, semantic preview, graph ingest, and diagnostics. These features must be tested without real WeChat data.

## Fixture Rules

- Every fixture file must include `synthetic: true`.
- Every fixture file must include `fixturePurpose` and `privacyNotes`.
- Timestamps must be fixed and deterministic.
- IDs must use explicit synthetic prefixes such as `session_synthetic_001`, `sns_synthetic_001`, or `graph_synthetic_001`.
- Display text must be obviously synthetic and must not resemble a real private conversation.
- Media fixtures must be metadata-only unless a later spec adds generated public-domain assets.
- DB fixtures must be schema-shaped synthetic rows, not exported local databases.
- Redaction fixtures may include secret-like markers only when the field name states that the value is a synthetic redaction case.

## Forbidden Data

- Real message bodies, contact names, aliases, group names, sender IDs, avatars, or social feed text.
- Real `wxid_*` values outside a named synthetic redaction case.
- Real local paths, database files, cache files, media files, or binary attachments.
- Real `dataKey`, API key, token, provider key, cookie, authorization header, or credential.
- Screenshots of private local data.

## Synthetic Redaction Cases

Redaction tests may include values such as:

- `synthetic-data-key-redaction-case`
- `sk-synthetic-redaction-case`
- `Bearer synthetic-bearer-redaction-case`
- `C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_redaction_case`
- `Synthetic private message for redaction test only`

These strings are allowed only in fixtures or tests that assert they are masked, blocked, or omitted from exports.

## Review Checklist

- The fixture has `synthetic: true`.
- The fixture purpose is clear.
- Secret-like fields are synthetic redaction cases.
- No raw query strings contain media keys, SNS proxy URLs, or local paths.
- No fixture forces a Tauri CSP or permission expansion.
- The fixture can be safely committed and shown in CI logs.

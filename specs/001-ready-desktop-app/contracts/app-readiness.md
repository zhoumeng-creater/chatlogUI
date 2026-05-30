# Contract: App Readiness States

## Purpose

Define the UI-facing readiness contract for the ready-to-use desktop app. This contract applies across launch, setup, backend, data, dashboard, browsing, search, semantic, graph, settings, privacy, diagnostics, and packaging surfaces.

## State Taxonomy

Each user-facing flow must classify its current state as one of:

- `idle`: No user action has started yet.
- `loading`: Work is in progress and the UI must show progress or waiting feedback.
- `empty`: Work completed but usable data is absent.
- `success`: Work completed and usable data or confirmation is available.
- `error`: Work failed and the UI must show a safe summary plus recovery guidance where possible.
- `conflict`: A specific recoverable conflict exists, such as an unknown process occupying port `5030`.
- `cancelled`: User stopped or abandoned the operation.

## Required Coverage

- Launch and setup: detect, choose, validate, retry.
- Backend lifecycle: starting, ready, unhealthy, exited, stopping, conflict.
- Dashboard: loading stats, empty history, failed stats, loaded stats.
- Browsing: loading lists, empty lists, failed lists, loaded lists, long-history continuation.
- Search: pending query, invalid query, no results, failed search, loaded results.
- Semantic: missing config, validating config, index unavailable, index running, index failed, index ready, stream connecting, streaming, stopped, failed, empty answer, completed.
- Graph: loading, empty, failed, oversized or malformed, loaded and inspectable.
- Settings/privacy: editing, saving, saved, validation error, privacy masked active.
- Diagnostics: preparing, redaction failure, ready package, cancelled.
- Packaging/release: package missing, package built, install smoke failed, install smoke passed, caveats documented.

## Recovery Rules

- Recoverable failures must provide a retry, settings, choose-directory, stop-stream, export-diagnostics, or conflict-resolution action.
- Non-recoverable or blocked states must explain the blocked requirement without exposing private data.
- Empty states are not errors and must not be styled or reported as failures.

## Privacy Rules

Readiness labels and aggregate statuses should remain visible in privacy mode. Names, message bodies, credentials, sensitive local paths, and private identities must be masked or withheld.

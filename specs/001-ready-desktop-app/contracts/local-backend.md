# Contract: Local Backend

## Purpose

Define how chatlogUI consumes the local `chatlog_alpha` sidecar for the ready-to-use desktop app. This is a consumer contract for productization and does not approve backend API changes.

## Base Service

- Expected local base URL: `http://127.0.0.1:5030`
- Sidecar process: `chatlog_alpha`
- Expected launch role: local HTTP service
- Health endpoint: `/health`
- Port policy: stop or reuse only confirmed app-managed `chatlog_alpha`; show a recoverable conflict for unknown port occupants.

## Endpoint Families

The app consumes existing endpoint families under `/api/v1/*`, including:

- `/api/v1/db` for database and data source readiness.
- `/api/v1/stats` for dashboard statistics.
- `/api/v1/sessions` for sessions and conversation lists.
- `/api/v1/contacts` for contact browsing.
- `/api/v1/chatrooms` for group browsing.
- `/api/v1/history` for message history.
- `/api/v1/search` for local search.
- `/api/v1/semantic/*` for semantic configuration, index, and QA features.
- `/api/v1/graph/*` for graph MVP data.

## REST Expectations

- Requests are local to the user machine unless the user explicitly configures an external provider through semantic settings.
- Responses must be translated into user-visible loading, empty, error, and success states by the app.
- Backend failures must not expose raw secrets, data keys, tokens, private message bodies, or unredacted private identities in routine UI diagnostics.

## SSE Expectations

- Semantic QA streaming uses incremental server-sent events or equivalent local streaming exposed by `chatlog_alpha`.
- Streams must be cancellable or safely abandoned from the app.
- Partial answers must render progressively.
- Interrupted, empty, failed, and completed streams must have distinct user-visible states.

## Lifecycle Expectations

- Launch readiness is not complete until sidecar health is known.
- The packaged app must recover from stale app-managed sidecar processes without manual terminal cleanup.
- Unknown process conflicts are recoverable user states, not automatic termination events.
- App quit must stop or detach from the sidecar safely according to ownership.

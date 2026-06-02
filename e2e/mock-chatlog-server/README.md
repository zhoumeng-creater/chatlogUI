# Mock Chatlog Server Notes

## Purpose

This folder reserves the future local mock server used by P5 browser E2E and contract tests. P4/P5-0 establishes the route mapping and safety rules but does not require a runnable server.

## Safety Rules

- Bind local-only.
- Read only files under `e2e/fixtures/`.
- Return deterministic JSON.
- Do not read user profile folders.
- Do not proxy SNS media URLs.
- Do not serve binary media unless a later spec adds generated public-domain test assets.
- Do not replace packaged sidecar smoke tests.

## Initial Route Mapping

| Fixture | Endpoint families |
| --- | --- |
| `core-ready.json` | `/health`, `/api/v1/db`, `/api/v1/sessions`, `/api/v1/contacts`, `/api/v1/chatrooms`, `/api/v1/history`, `/api/v1/search`, `/api/v1/stats` |
| `advanced-capabilities.json` | unread, members, new messages, favorites, media metadata, SNS, DB explorer, hook, MCP, semantic preview, graph residuals |
| `diagnostics-redaction.json` | redaction-only diagnostic assertions |

## Future Commands

Do not add `pnpm e2e` until the repository has a runnable E2E harness. When added, the command should start this mock server as an explicit test dependency and shut it down cleanly.

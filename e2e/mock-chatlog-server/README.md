# Mock Chatlog Server

## Purpose

This folder contains the local-only mock server used by P5-A/B browser E2E, visual, accessibility, and route contract checks. It serves synthetic fixture sections from `e2e/fixtures/` and never reads real local chat data.

## Safety Rules

- Bind local-only.
- Read only files under `e2e/fixtures/`.
- Return deterministic JSON.
- Do not read user profile folders.
- Do not proxy SNS media URLs.
- Do not serve binary media unless a later spec adds generated public-domain test assets.
- Do not replace packaged sidecar smoke tests.

## Commands

Run from the repository root:

```powershell
pnpm fixtures:check
pnpm mock:chatlog
pnpm e2e
pnpm e2e:visual
pnpm e2e:a11y
```

The Playwright config starts this server as a webServer dependency for E2E suites. If `127.0.0.1:5030` is already occupied, startup fails instead of killing or replacing the unknown listener.

## Route Mapping

| Fixture | Endpoint families |
| --- | --- |
| `core-ready.json` | `/health`, `/api/v1/db`, `/api/v1/sessions`, `/api/v1/contacts`, `/api/v1/chatrooms`, `/api/v1/history`, `/api/v1/search`, `/api/v1/stats` |
| `advanced-capabilities.json` | unread, members, new messages, favorites, media metadata, SNS, DB explorer, hook, MCP, semantic preview, graph residuals |
| `diagnostics-redaction.json` | redaction-only diagnostic assertions |

`route-map.json` owns the runnable REST/SSE endpoint list. Media routes return generated placeholders and do not read or proxy real files.

## Release Boundary

This mock backend proves deterministic source/UI behavior only. P5-C remains responsible for packaged sidecar smoke, real sidecar artifact reproducibility, updater signing, install/open/quit/reopen, and unknown-port packaged-app evidence.

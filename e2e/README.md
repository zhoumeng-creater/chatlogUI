# E2E Fixture Foundation

This directory contains synthetic fixtures, the local-only mock server, and Playwright specs for P5-A/B automation. It must not contain real local chat data, real media, real database files, raw keys, or private screenshots.

## Fixtures

- `fixtures/core-ready.json`: core sidecar and workbench-ready endpoint shapes.
- `fixtures/advanced-capabilities.json`: advanced P4 endpoint shapes with synthetic rows.
- `fixtures/diagnostics-redaction.json`: synthetic secret/private markers for redaction tests only.
- `fixtures/fixture-manifest.json`: fixture ownership and route-state manifest used by `pnpm fixtures:check`.

## Rules

- Keep every fixture deterministic.
- Keep every fixture marked with `synthetic: true`.
- Do not add binary media.
- Do not add local database or cache files.
- Do not copy data from a real WeChat profile.

## Commands

- `pnpm fixtures:check`: validate fixture JSON, route-map section references, key contract shapes, and forbidden private-data markers.
- `pnpm mock:chatlog`: run the local-only mock server on `127.0.0.1:5030`.
- `pnpm e2e`: run core, advanced, and privacy Playwright specs against Vite plus the mock server.
- `pnpm e2e:visual`: compare synthetic visual baselines.
- `pnpm e2e:update-snapshots`: explicitly update synthetic visual baselines.
- `pnpm e2e:a11y`: run axe, keyboard, and privacy accessible-text checks.

## Mock Server

`mock-chatlog-server/README.md` defines the route mapping and safety rules. The mock server is local-only, reads only synthetic fixtures, serves deterministic JSON/SSE/media placeholders, and does not replace P5-C packaged-app sidecar smoke tests.

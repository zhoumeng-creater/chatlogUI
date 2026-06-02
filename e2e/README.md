# E2E Fixture Foundation

This directory contains synthetic fixtures and mock server notes for future P5 automation. It must not contain real local chat data, real media, real database files, raw keys, or private screenshots.

## Fixtures

- `fixtures/core-ready.json`: core sidecar and workbench-ready endpoint shapes.
- `fixtures/advanced-capabilities.json`: advanced P4 endpoint shapes with synthetic rows.
- `fixtures/diagnostics-redaction.json`: synthetic secret/private markers for redaction tests only.

## Rules

- Keep every fixture deterministic.
- Keep every fixture marked with `synthetic: true`.
- Do not add binary media.
- Do not add local database or cache files.
- Do not copy data from a real WeChat profile.

## Future Mock Server

`mock-chatlog-server/README.md` defines the route mapping and safety rules. The mock server should remain local-only and should not replace packaged-app sidecar smoke tests.

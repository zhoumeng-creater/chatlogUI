# P2-C Settings And Diagnostics Polish Plan

## Goal

Bring Settings, Setup Center diagnostics, privacy controls, and local diagnostic surfaces to the same product quality as the P2-B core workbench without changing the `chatlog_alpha` sidecar contract.

## Scope

- Replace remaining raw/Tailwind-only setup and settings controls with project primitives where the control is a command, form field, status, or navigation item.
- Keep credentials inside real form semantics with explicit `name`, `autocomplete`, and submit/cancel behavior.
- Ensure privacy mode covers settings summaries, diagnostic output, filesystem paths, key presence labels, and accessibility text.
- Keep all backend communication routed through L4 atoms and L2 commander/store orchestration.
- Add focused tests for settings migration, redaction helpers, and diagnostic packaging behavior.

## Known Inputs From P2-B Review

- `SettingsLayout.tsx` still has raw navigation buttons by design; evaluate whether they should become `Button`/segmented controls or a dedicated navigation atom.
- Setup Center was partially repaired in P2-B by replacing command buttons and form-scoping credentials, but mode chooser cards and service diagnostics still need visual QA.
- Diagnostics must never include raw `dataKey`, API keys, tokens, private messages, or full local paths unless the user explicitly requests debug output.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Browser smoke for `/settings` and `/` at 1440, 900, 768, and 390 px.
- Password/form browser warnings must be absent on Settings and Setup credential surfaces.

# Quickstart: Ready-to-Use Desktop App

## Scope

Use this quickstart to verify the productization feature after implementation tasks exist. It is a planning artifact, not proof that the current code already passes.

## Prerequisites

- Windows x64 test machine or equivalent Windows x64 packaging environment.
- Compatible `chatlog_alpha` sidecar binary available for packaging.
- Local WeChat data or sanitized prepared test data covering sessions, contacts, chatrooms, messages, search matches, long history, semantic readiness states, and graph states.
- Node, pnpm, Rust/Tauri prerequisites, and the project dependencies installed.

## Setup

```powershell
pnpm install
```

## Verification Commands

Run from the repository root unless noted.

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

For Tauri, Rust, sidecar lifecycle, permissions, or packaging changes:

```powershell
Push-Location src-tauri
cargo test
Pop-Location
pnpm tauri build
```

## Manual Product Smoke

1. Install or open the Windows x64 app without starting a terminal service.
2. Launch with discoverable valid WeChat data and confirm setup reaches the main workspace.
3. Launch with no discoverable data and confirm the app asks for a directory with a clear empty/setup state.
4. Select an invalid or inaccessible data directory and confirm validation gives recovery guidance.
5. Confirm the app starts and monitors `chatlog_alpha` on port `5030`.
6. Occupy port `5030` with an unknown process and confirm the app reports a recoverable conflict without stopping it.
7. Confirm dashboard statistics load, empty, error, and success states.
8. Browse sessions, contacts, chatrooms, and messages, including an empty conversation and a long conversation.
9. Search known matches, no-match terms, invalid queries, and backend failure states.
10. Open semantic features with missing provider configuration and confirm dashboard, browse, and search remain usable.
11. Validate semantic index unavailable, running, failed, empty, and ready states.
12. Start semantic QA streaming, observe progressive answer updates, then stop or leave the stream safely.
13. Open graph MVP with available, empty, failing, malformed, and oversized graph data.
14. Enable privacy controls and confirm names, message bodies, and credentials are masked while safe aggregate stats remain useful.
15. Export a diagnostic package only through a user action and inspect it for redaction.
16. Quit and reopen the packaged app, confirming no manual sidecar cleanup is required.

## Redaction Checks

Acceptance evidence must contain zero raw data keys, provider credentials, tokens, private message bodies, or unredacted private identities. Screenshots, logs, diagnostics, fixtures, and release notes must follow the same rule.

---
name: sidecar-integration
description: Use for Tauri, Rust, sidecar binary, health check, port, CSP, permissions, data path, or chatlog_alpha API integration work.
---

# sidecar-integration

## Purpose

Safely integrate `chatlog_alpha` as a local sidecar.

## Files to inspect

- `src-tauri/tauri.conf.json`
- `src-tauri/src/lib.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/sidecar.rs`
- `src-tauri/src/health.rs`
- `src/l4-atom/system/*`
- `src/l4-atom/network/*`
- `src/l2-coordinator/commander/useAppCommander.ts`

## Contract

- Sidecar binary base path: `binaries/chatlog_alpha`
- Runtime port: `5030`
- Health endpoint: `/health`
- Backend protocol: HTTP REST + SSE
- Sidecar data path and data key are user-specific and sensitive.

## Safety rules

- Do not log secrets.
- Do not commit binaries under `src-tauri/binaries/`.
- Keep CSP/capabilities minimal.
- Explain every permission/CSP change.
- Treat platform-specific behavior as release risk until smoke-tested.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
cd src-tauri && cargo test
```

If packaging changed:

```bash
pnpm tauri build
```

## Report format

```text
Sidecar contract touched:
Changed files:
Security/privacy impact:
Platform impact:
Verification:
Remaining release risk:
```

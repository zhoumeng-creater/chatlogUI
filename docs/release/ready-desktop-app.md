# Ready Desktop App Release Runbook

Canonical evidence lives in `specs/001-ready-desktop-app/release-evidence.md`.

## Required Commands

```powershell
pnpm verify
Push-Location src-tauri; cargo test; Pop-Location
pnpm tauri build
```

## Manual Smoke

- Install or open the Windows x64 app artifact.
- Launch without a terminal and confirm setup or workbench is reachable.
- Confirm `chatlog_alpha` health at `http://127.0.0.1:5030/health`.
- Quit the app and verify the app-managed sidecar is cleaned up.
- Reopen the app and confirm state restoration.
- Test an unknown process already occupying `5030`.
- Capture only redacted screenshots and logs.

## Current Status

- `pnpm verify`, `cargo test`, and `pnpm tauri build` passed on 2026-05-30.
- Windows x64 MSI and NSIS bundles were produced under `src-tauri/target/release/bundle/`.
- Manual install, quit, reopen, port-conflict, and full privacy log audit evidence is still pending.

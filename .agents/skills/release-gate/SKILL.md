---
name: release-gate
description: Use before considering chatlogUI shippable, before release builds, or when evaluating blockers for packaging and delivery.
---

# release-gate

## Purpose

Decide whether the current branch is ready to ship as a desktop app.

## Required checks

```bash
pnpm verify
cd src-tauri && cargo test
pnpm tauri build
```

## Manual smoke

- Launch app.
- Missing data path state.
- Manual data path selection.
- Sidecar starts.
- `/health` succeeds.
- Dashboard loads or shows a useful empty state.
- Settings open/save.
- Quit app and confirm sidecar cleanup.
- Check logs for secret leakage.

## Review categories

- Build/test
- Sidecar lifecycle
- UI states
- API contract
- Security/privacy
- Tauri CSP/capabilities
- Platform caveats
- Release notes

## Output

```text
Status: PASS | BLOCKED

Blockers:
1.
2.

Warnings:
1.
2.

Verification:
- command: result

Smoke test:
- item: pass/fail

Release notes draft:
```

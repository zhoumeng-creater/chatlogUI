---
description: Release gate for chatlogUI
agent: build
---

Use AGENTS.md and release-gate.

Goal:

$ARGUMENTS

Run the release gate checks if possible:
- pnpm verify
- cd src-tauri && cargo test
- pnpm tauri build

Return PASS or BLOCKED with exact blockers, warnings, smoke test checklist, and release notes draft.

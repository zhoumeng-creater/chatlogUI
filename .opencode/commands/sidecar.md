---
description: Tauri sidecar integration review or implementation
agent: build
---

Use AGENTS.md and sidecar-integration.

Task:

$ARGUMENTS

Inspect:
@src-tauri/tauri.conf.json
@src-tauri/src/sidecar.rs
@src-tauri/src/health.rs
@src-tauri/src/commands.rs
@src/l2-coordinator/commander/useAppCommander.ts

Rules:
- do not log secrets
- keep port 5030 explicit
- keep CSP/capabilities minimal
- document release impact

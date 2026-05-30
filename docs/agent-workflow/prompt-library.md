# Prompt Library for Codex App and opencode

## 1. Baseline audit prompt

```text
Use the chatlog-debug and sidecar-integration skills.

Do not modify files.

Goal: establish the current delivery baseline for chatlogUI becoming a ready-to-use desktop app for chatlog_alpha.

Read:
- AGENTS.md
- package.json
- docs/总体开发规划.md
- 开发指南.md
- src-tauri/tauri.conf.json
- src-tauri/src/lib.rs
- src-tauri/src/sidecar.rs
- src-tauri/src/health.rs
- src/l2-coordinator/commander/useAppCommander.ts
- src/l4-atom/network/index.ts
- src/l1-entry/routes/index.tsx
- src/l1-entry/pages/LaunchView.tsx
- src/l1-entry/pages/DashboardView.tsx
- src/l1-entry/pages/SettingsView.tsx

Then run, if possible:
- pnpm install
- pnpm verify
- cd src-tauri && cargo test
- pnpm tauri build

Produce docs/agent-workflow/baseline-report.md with:
1. Current build/test status
2. Blocking failures
3. Productization gaps
4. UI delivery gaps
5. Sidecar integration risks
6. Suggested next 10 tasks with verification commands

Do not fix anything in this pass.
```

## 2. Spec Kit productization prompt

```text
Use $speckit-constitution first if project principles are not finalized.
Then use $speckit-specify.

Feature: make chatlogUI a ready-to-use desktop app that packages and controls chatlog_alpha.

Context:
- chatlog_alpha is the Go sidecar backend.
- chatlogUI is Tauri v2 + React 18 + TypeScript + Zustand.
- Existing architecture is L1 Entry, L2 Coordinator, L3 Molecule, L4 Atom.
- The app must manage the sidecar, connect to local APIs on port 5030, handle setup, show chats/search/stats, semantic QA, graph views, and settings.
- The current project already has a skeleton but is not deliverable.

Write the spec in product/user terms, not implementation guesses.
Include:
- MVP user journeys
- first-run setup
- boot and failure states
- chat browsing/search
- semantic index/QA
- graph MVP
- settings/privacy
- packaging/release acceptance
- out of scope
```

## 3. Implement one task prompt

```text
Use the current AGENTS.md and specs/000-productization/tasks.md.

Task: <paste one task ID and full task text>

Rules:
- Create or use a feature branch/worktree.
- Do not work on master.
- Keep the diff small.
- Preserve chatlog_alpha sidecar behavior unless the task explicitly changes the contract.
- Follow L1/L2/L3/L4 boundaries.
- Add or update tests where feasible.
- Run the task verification commands.
- Report changed files, verification output, and remaining assumptions.

Stop if the task requires changing the sidecar API contract, Tauri permissions, CSP, or secret handling.
```

## 4. Debug prompt

```text
Use chatlog-debug or superpowers/systematic-debugging.

Bug:
<paste error, screenshot description, or failing command>

Required process:
1. Reproduce the failure.
2. Read the full error.
3. Identify the failing layer: L1/L2/L3/L4/Tauri/sidecar/build/tooling.
4. Find a working pattern in the repo.
5. State one root-cause hypothesis.
6. Make the smallest fix.
7. Run the narrow verification.
8. Run pnpm verify if the fix touches shared code.

Do not apply multiple unrelated fixes.
```

## 5. UI polish prompt

```text
Use frontend-design and ui-acceptance.

Route/page:
<route or component>

Goal:
<visual/product goal>

Constraints:
- Preserve existing architecture.
- Do not fetch directly from L1/L3.
- Use existing atoms/molecules/design tokens where possible.
- Cover loading, empty, error, success states.
- Check desktop and narrow widths.
- Keep UI distinctive but consistent with Apple-like local desktop app direction.

Return:
- changed files
- states verified
- screenshots or visual observations
- remaining issues
```

## 6. Sidecar integration prompt

```text
Use sidecar-integration.

Goal:
<sidecar issue or feature>

Read:
- src-tauri/tauri.conf.json
- src-tauri/src/sidecar.rs
- src-tauri/src/health.rs
- src-tauri/src/commands.rs
- src/l4-atom/system/*
- src/l4-atom/network/*
- src/l2-coordinator/commander/useAppCommander.ts

Rules:
- Never log dataKey or private content.
- Keep port 5030 behavior explicit.
- Keep health endpoint behavior explicit.
- Keep Tauri CSP/capabilities minimal.
- If externalBin or binary naming changes, update release checklist too.

Verify:
- cd src-tauri && cargo test
- pnpm typecheck
- pnpm build
- pnpm tauri build if packaging changed
```

## 7. Final release readiness prompt

```text
Use release-gate.

Goal: decide whether chatlogUI is shippable as an out-of-the-box app.

Evaluate:
- first-run setup
- sidecar lifecycle
- database/data-key handling
- chat/search/stats
- semantic QA/index
- graph MVP
- settings/privacy
- updater config
- macOS/Windows packaging assumptions
- error states
- no secret logging
- no private data in fixtures/logs

Run:
- pnpm verify
- cd src-tauri && cargo test
- pnpm tauri build

Return:
- PASS/BLOCKED
- exact blockers
- release notes draft
- smoke test checklist
```

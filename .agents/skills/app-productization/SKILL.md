---
name: app-productization
description: Use when turning chatlog_alpha/chatlogUI work into a shippable desktop app feature, including specs, tasks, packaging, first-run setup, and release readiness.
---

# app-productization

## Purpose

Move from "works in development" to "usable by a non-technical user."

## Steps

1. Read `AGENTS.md`.
2. Read `specs/000-productization/spec.md`, `plan.md`, and `tasks.md`.
3. Identify the current task and acceptance criteria.
4. Confirm whether the task affects:
   - UI only
   - L2 state/orchestration
   - L4 backend API calls
   - Tauri/Rust
   - sidecar packaging
   - release flow
5. Implement the smallest deliverable.
6. Verify with the task commands.
7. Update the relevant spec/task/checklist if the product contract changed.

## Acceptance lens

Every deliverable should answer:

- Can a user understand what to do next?
- Does it work in Tauri, not only Vite?
- Are loading/empty/error/success states handled?
- Does it preserve local privacy?
- Does it respect L1/L2/L3/L4 boundaries?
- Is the release implication documented?

## Report format

```text
Task:
Changed files:
User-visible result:
Verification:
Release impact:
Remaining assumptions:
```

# chatlogUI Agent Guide

## Product goal

`chatlogUI` exists to turn `chatlog_alpha` into a ready-to-use desktop app.

The core backend is `chatlog_alpha`, a Go sidecar. Preserve backend behavior unless the task explicitly says to change the sidecar contract. Most work should be frontend UI, Tauri integration, debugging, productization, packaging, and release readiness.

## Current stack

- Desktop shell: Tauri v2
- Frontend: React 18 + TypeScript + Vite
- Styling: Tailwind CSS v4 + project CSS variables
- State: Zustand
- Motion: Framer Motion
- Graph rendering: Three.js / React Three Fiber
- Package manager: pnpm
- Frontend dev server: `http://localhost:5173`
- Local backend sidecar: `http://127.0.0.1:5030`

## Commands

Run from the repository root unless noted.

```bash
pnpm install
pnpm dev
pnpm tauri dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
pnpm tauri build
```

When Rust/Tauri files changed, also run:

```bash
cd src-tauri && cargo test
```

## Repository map

- `src/l1-entry/`: page-level routes and view shells only.
- `src/l2-coordinator/`: Commander, DataClerk, Diplomat, API contracts, orchestration.
- `src/l3-molecule/`: reusable feature components. No direct network calls.
- `src/l4-atom/`: UI atoms, network atoms, system atoms. Atoms must remain independent.
- `src-tauri/`: Tauri shell, sidecar process management, native commands, capabilities, bundle config.
- `docs/`: planning and architecture documents.
- `specs/`: executable specifications for productization work.
- `.agents/skills/`: Codex/opencode reusable workflows.
- `.opencode/commands/`: opencode slash-command prompts.
- `.opencode/agents/`: opencode review and analysis subagents.

## Architecture rules

1. L1 is layout and event delegation only. Do not place business logic, fetch calls, or persistent state in L1.
2. L2 is the only cross-module orchestration layer. User flows, retries, error translation, state normalization, and API coordination belong here.
3. L3 molecules receive data and callbacks as props. They must not call L4 network atoms directly.
4. L4 atoms are independent. L4 UI atoms do not know app state; L4 network atoms only perform raw HTTP/SSE calls; L4 system atoms only wrap Tauri/system APIs.
5. All backend communication flows through L4 network/system atoms, then L2 Diplomat/Commander, then state/UI.
6. Do not introduce a second parallel architecture unless a spec explicitly approves it.

## Sidecar contract

The packaged app runs `chatlog_alpha` as a Tauri sidecar.

- Bundle config uses `src-tauri/binaries/chatlog_alpha`.
- The Rust sidecar launcher starts the program with `serve --http-addr 0.0.0.0:5030`.
- Health check endpoint is `/health`.
- Common APIs include `/api/v1/db`, `/api/v1/sessions`, `/api/v1/history`, `/api/v1/search`, `/api/v1/stats`, `/api/v1/contacts`, `/api/v1/chatrooms`, `/api/v1/semantic/*`, and `/api/v1/graph/*`.
- SSE APIs, especially semantic QA streaming, must be handled incrementally and cancellably.
- Never log raw `dataKey`, API keys, tokens, secrets, or private chat content beyond what the user explicitly requests for debugging.

## Security and privacy rules

- This is a local-private-data app. Avoid telemetry by default.
- Do not add remote calls except documented update checks or explicit user-configured AI providers.
- Do not broaden Tauri CSP/capabilities without explaining why.
- Do not commit `.env`, logs, local chat data, sidecar binaries, build output, or test fixtures containing real private messages.
- Redact secrets in logs and screenshots.

## Development workflow

Never implement non-trivial work directly on `master` unless explicitly instructed.

Use one of these flows:

- Bug/build failure: use `chatlog-debug` or existing `superpowers/systematic-debugging`.
- UI implementation/polish: use `ui-acceptance` plus existing `frontend-design`.
- Sidecar/Tauri integration: use `sidecar-integration`.
- Feature/productization work: use Spec Kit outputs plus `app-productization`.
- Release readiness: use `release-gate`.
- Multi-step implementation: use git worktree + plan + review before merge.

## Done means

For most tasks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For final delivery or sidecar/Tauri changes:

```bash
pnpm verify
cd src-tauri && cargo test
pnpm tauri build
```

Also confirm:

- Loading, empty, error, success states are handled.
- UI was checked at desktop size and a narrow/mobile-ish width.
- No core sidecar behavior changed unintentionally.
- No secrets or private data were logged.
- Remaining assumptions are written in the final report or PR body.

## Key project references

Read these before major work:

- `docs/总体开发规划.md`
- `开发指南.md`
- `.specify/memory/constitution.md`
- `specs/000-productization/constitution.md`
- `specs/000-productization/spec.md`
- `specs/000-productization/plan.md`
- `specs/000-productization/tasks.md`
- `specs/000-productization/acceptance-checklist.md`

<!-- SPECKIT START -->
For the active ready-to-use desktop app feature, read:

- `specs/001-ready-desktop-app/spec.md`
- `specs/001-ready-desktop-app/plan.md`
- `specs/001-ready-desktop-app/research.md`
- `specs/001-ready-desktop-app/data-model.md`
- `specs/001-ready-desktop-app/quickstart.md`
- `specs/001-ready-desktop-app/contracts/`
<!-- SPECKIT END -->

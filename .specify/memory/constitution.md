<!--
Sync Impact Report
Version change: Unratified template -> 1.0.0
Modified principles:
- PRINCIPLE_1_NAME placeholder -> I. Sidecar Is The Product Core
- PRINCIPLE_2_NAME placeholder -> II. Local Private Data Stays Local
- PRINCIPLE_3_NAME placeholder -> III. Layered Architecture Is Enforceable
- PRINCIPLE_4_NAME placeholder -> IV. Visible User States Are Required
- PRINCIPLE_5_NAME placeholder -> V. Debugging Is Evidence-Driven
Added principles:
- VI. Packaging And Lifecycle Are Product Scope
- VII. Specification-Guided Delivery
Added sections:
- Product Boundaries And Security Constraints
- Development Workflow And Quality Gates
Removed sections:
- None
Templates requiring updates:
- .specify/templates/plan-template.md: updated
- .specify/templates/spec-template.md: updated
- .specify/templates/tasks-template.md: updated
- .specify/templates/commands/*.md: not present; no update required
Runtime guidance checked:
- AGENTS.md: updated
- specs/000-productization/constitution.md: updated
- docs/总体开发规划.md: already aligned
- 开发指南.md: checked; no file present
- README.md: checked; no file present
Follow-up TODOs:
- None
-->

# chatlogUI Constitution

## Core Principles

### I. Sidecar Is The Product Core

`chatlog_alpha` is the backend engine and product core. chatlogUI MUST package,
start, stop, monitor, and present that engine without casually rewriting,
duplicating, or bypassing its behavior. Changes to sidecar invocation, port
binding, API endpoints, data-key handling, permissions, health checks, or
shutdown behavior are high-risk changes and MUST document the contract impact,
test evidence, and rollback path. The rationale is that product value depends on
making the existing Go sidecar usable as a desktop app, not replacing it with an
unproven parallel backend.

### II. Local Private Data Stays Local

chatlogUI handles local private WeChat data. The app MUST be local-first, MUST
avoid telemetry by default, and MUST NOT log, commit, screenshot, or transmit raw
private chat content, `dataKey`, API keys, tokens, secrets, or local database
fixtures except when the user explicitly provides sanitized debugging material.
Remote calls are allowed only for documented update checks or explicit
user-configured AI providers with clear consent and redaction. The rationale is
that a desktop wrapper for private chat history loses user trust if privacy is
treated as an implementation detail.

### III. Layered Architecture Is Enforceable

All implementation MUST preserve the L1 Entry, L2 Coordinator, L3 Molecule, and
L4 Atom architecture. L1 owns routes, layout, and event delegation only. L2 owns
cross-module orchestration, retries, error translation, state normalization, API
coordination, Commander, DataClerk, and Diplomat responsibilities. L3 molecules
receive data and callbacks as props and MUST NOT call L4 network atoms directly.
L4 atoms remain independent: UI atoms do not know app state, network atoms
perform raw HTTP/SSE calls only, and system atoms wrap Tauri or OS APIs only.
Introducing a second architecture requires an approved spec amendment. The
rationale is that the layer boundary is the main control against React/Tauri
desktop complexity spreading through the codebase.

### IV. Visible User States Are Required

Every user-facing feature MUST define and implement loading, empty, error, and
success states before it is considered complete. Error states MUST provide retry
or next-step guidance when recovery is possible, and empty states MUST explain
what data or setup is missing. Streaming flows MUST be incremental and safe to
cancel or abandon. The rationale is that local sidecar, database, AI, and graph
work can fail independently, and the desktop app must not collapse into blank or
ambiguous screens.

### V. Debugging Is Evidence-Driven

Bug fixes MUST start from observable evidence: a failing command, reproduction
path, log excerpt with secrets redacted, UI state, test failure, or sidecar/API
response. Each fix MUST identify the failing layer, a root-cause hypothesis, the
minimal change, and verification output. Patching by guesswork is a governance
violation. The rationale is that sidecar lifecycle, Tauri permissions, local
data, and frontend state failures often look similar from the UI but require
different fixes.

### VI. Packaging And Lifecycle Are Product Scope

A feature is incomplete if it only works in browser dev mode. Any change that
touches Tauri, sidecar startup, system permissions, CSP, updater behavior,
release configuration, or desktop-only flows MUST account for packaged-app
behavior. Release readiness MUST verify sidecar binary presence and naming,
startup on `127.0.0.1:5030`, health checks, shutdown cleanup, platform caveats,
and user-facing failure states. The rationale is that chatlogUI exists to make
`chatlog_alpha` ready to use as an installed desktop application.

### VII. Specification-Guided Delivery

Non-trivial work MUST be driven by a written spec, plan, or task record before
implementation. Specs MUST state user journeys, privacy implications, sidecar
contract impact, state coverage, and verification expectations. Tasks MUST be
small enough to review and verify, and completion MUST be checked against the
spec before merge or release. The rationale is that agent-assisted work needs a
stable written target to avoid accidental architecture drift and regressions.

## Product Boundaries And Security Constraints

chatlogUI is a Tauri v2, React 18, TypeScript, Vite, Tailwind CSS v4, Zustand,
Framer Motion, and Three.js desktop app. The backend core is the
`chatlog_alpha` Go sidecar served at `http://127.0.0.1:5030`, with health checks
through `/health` and app data APIs under `/api/v1/*`.

Backend communication MUST flow through L4 network or system atoms, then L2
Diplomat or Commander, then state and UI. SSE APIs, especially semantic QA
streaming, MUST be parsed incrementally and support cancellation or safe
abandonment. Tauri CSP, capabilities, shell permissions, and sidecar execution
allowances MUST stay minimal and must be broadened only with documented product
need. Build outputs, sidecar binaries, `.env` files, logs, real local chat data,
and fixtures containing private messages MUST NOT be committed.

## Development Workflow And Quality Gates

Development MUST avoid non-trivial direct work on `master` unless explicitly
approved. The default flow is to update the relevant spec or task record, make
the smallest coherent change, verify it, and review against this constitution.
Layer changes MUST name the affected L1/L2/L3/L4 responsibility in the plan or
PR body. Sidecar or Tauri changes MUST include Rust/Tauri verification in
addition to frontend checks.

For most tasks, completion evidence MUST include `pnpm lint`, `pnpm typecheck`,
`pnpm test`, and `pnpm build`, or a clear reason a command could not run. Final
delivery or sidecar/Tauri work MUST include `pnpm verify`, `cd src-tauri &&
cargo test`, and `pnpm tauri build` when feasible. UI work MUST be checked at a
desktop size and a narrow width. Debugging work MUST record the reproduction,
root cause, fix, and verification result.

## Governance

This constitution supersedes conflicting local practices, generated templates,
and ad hoc agent instructions. Amendments MUST update this file, include a Sync
Impact Report, and propagate changes to affected Spec Kit templates, product
specs, runtime guidance, or acceptance checklists in the same change when
practical. If a dependent artifact cannot be updated, the Sync Impact Report
MUST list the pending follow-up.

Versioning follows semantic versioning. MAJOR increments apply when a principle
is removed or redefined in a way that breaks prior governance. MINOR increments
apply when a principle or mandatory governance section is added or materially
expanded. PATCH increments apply to clarifications, wording fixes, and
non-semantic refinements.

Compliance review is required during planning, task generation, code review,
and release readiness. Any deliberate violation MUST be documented with the
reason, the simpler alternative considered, the risk, and the verification plan.

**Version**: 1.0.0 | **Ratified**: 2026-05-30 | **Last Amended**: 2026-05-30

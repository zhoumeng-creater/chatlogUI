# Implementation Plan: Ready-to-Use Desktop App

**Branch**: `001-ready-desktop-app` | **Date**: 2026-05-30 | **Spec**: `specs/001-ready-desktop-app/spec.md`

**Input**: Feature specification from `specs/001-ready-desktop-app/spec.md`

## Summary

Productize the existing chatlogUI framework into a Windows x64 installable Tauri desktop app for `chatlog_alpha`. The app must launch without terminal usage, detect or request local WeChat data, manage the sidecar on port `5030`, expose dashboard, browsing, search, semantic, graph, settings, privacy, diagnostics, and packaging readiness with visible user states. The plan preserves `chatlog_alpha` as the backend core and uses the existing L1/L2/L3/L4 architecture rather than introducing a parallel implementation path.

## Technical Context

**Language/Version**: TypeScript 5, React 18, Rust/Tauri v2 shell, and the existing Go `chatlog_alpha` sidecar contract.

**Primary Dependencies**: Vite, Tailwind CSS v4, Zustand, Framer Motion, Three.js/React Three Fiber, Tauri APIs, and `chatlog_alpha` HTTP REST plus SSE APIs.

**Storage**: Local WeChat data is accessed through `chatlog_alpha`. The desktop app may persist safe local settings such as selected data source, privacy mode, and semantic configuration metadata, but must not persist or echo raw secrets beyond deliberate credential storage controls already approved by the product.

**Testing**: Specification and design work is validated by artifact checks. Implementation tasks must use `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and for final delivery or Tauri/sidecar changes also `pnpm verify`, `cd src-tauri && cargo test`, and `pnpm tauri build`.

**Target Platform**: Windows x64 is the required first installable release target. macOS remains a documented follow-up target and must not block Windows x64 delivery.

**Project Type**: Tauri desktop app wrapping and supervising a local Go sidecar.

**Performance Goals**: First-time users with valid local data reach the main workspace in under 5 minutes without a terminal. Common search outcomes return within 3 seconds on prepared local data. A 10,000-message conversation remains browsable with continuation feedback. SSE answers render progressively and can be stopped or abandoned. Graph MVP data loads without unrecoverable UI freezes.

**Constraints**: Preserve `chatlog_alpha` backend behavior. Use port `5030` for the local backend. Stop or reuse only confirmed app-managed sidecar processes. Treat unknown port occupants as recoverable conflicts. Semantic provider configuration is optional and must not block launch, dashboard, browsing, or search. Avoid telemetry by default. Never log raw secrets, data keys, tokens, private message bodies, or unredacted private identities. Keep all feature work inside the L1/L2/L3/L4 architecture.

**Scale/Scope**: Launch/setup, WeChat data source validation, sidecar lifecycle, dashboard statistics, sessions/contacts/chatrooms/messages browsing, search, semantic config/index/QA streaming, graph MVP, settings/privacy, redacted diagnostics, and Windows x64 packaging readiness.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Sidecar Contract**: PASS. The feature packages, starts, monitors, and shuts down the existing `chatlog_alpha` sidecar on port `5030` without changing backend behavior. Any implementation task touching sidecar invocation, health checks, permissions, or shutdown must document contract impact and verification.
- **Privacy Boundary**: PASS. The feature is local-first, has no default telemetry, requires user-controlled external provider use, masks private surfaces in privacy mode, and requires only user-triggered redacted diagnostics.
- **Layer Ownership**: PASS. L1 remains routes and view shells. L2 owns flow orchestration, retries, readiness state, error translation, API coordination, and streaming cancellation. L3 renders feature views from props. L4 owns raw UI atoms, network REST/SSE calls, and Tauri/system atoms.
- **Visible States**: PASS. Launch, setup, backend, database, dashboard, browse, search, semantic, graph, settings, privacy, diagnostics, and packaging flows must each cover loading, empty, error, and success where applicable, with recovery guidance for recoverable states.
- **Evidence And Verification**: PASS. Debugging and implementation tasks must capture reproduction evidence, failing layer, root-cause hypothesis, minimal fix, and command or UI verification. Release readiness must include Windows x64 install, launch, quit, and reopen evidence.

**Post-Design Re-Check**: PASS. `research.md`, `data-model.md`, `contracts/`, and `quickstart.md` keep the sidecar contract intact, document privacy and diagnostics boundaries, map user states to readiness contracts, and keep the L1/L2/L3/L4 structure as the only approved implementation architecture.

## Project Structure

### Documentation (this feature)

```text
specs/001-ready-desktop-app/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   ├── productization.md
│   └── requirements.md
└── contracts/
    ├── app-readiness.md
    ├── diagnostics-package.md
    └── local-backend.md
```

### Source Code (repository root)

```text
src/
├── l1-entry/          # routes, view shells, layout, event delegation only
├── l2-coordinator/    # Commander, DataClerk, Diplomat, readiness and API coordination
├── l3-molecule/       # feature views and reusable molecules; no direct network calls
├── l4-atom/           # independent UI atoms, network atoms, and system atoms
└── styles/            # global CSS variables and layout styles

src-tauri/
├── src/               # Tauri commands, sidecar lifecycle, health, shutdown
├── capabilities/      # minimal permissions for desktop behavior
└── binaries/          # packaged sidecar path in bundle config; binaries are not committed

docs/                  # architecture, release, workflow, and operational notes
specs/                 # executable product specifications and checklists
```

**Structure Decision**: Use the existing chatlogUI L1/L2/L3/L4 architecture. Each implementation task must name its touched source path and layer responsibility. No second frontend state architecture, direct L1 fetch path, or L3 network path is approved by this plan.

## Complexity Tracking

No constitution violations or additional architectural complexity are planned.

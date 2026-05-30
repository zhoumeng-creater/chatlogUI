# Research: Ready-to-Use Desktop App

## Decision 1: Preserve `chatlog_alpha` As The Backend Core

**Decision**: Treat the existing `chatlog_alpha` Go sidecar as the authoritative backend and product core. chatlogUI will package, launch, monitor, and communicate with it instead of rewriting backend behavior.

**Rationale**: The product goal is to make `chatlog_alpha` ready to use as a desktop app. Rewriting the backend would increase risk, split behavior, and violate the constitution unless a future approved spec changes the sidecar contract.

**Alternatives considered**: A frontend-only data reader was rejected because it duplicates backend logic. A new service wrapper was rejected because it adds another runtime and another contract. Changing sidecar APIs was rejected because the current feature is productization, not backend redesign.

## Decision 2: Windows x64 Is The First Installable Target

**Decision**: Plan the first deliverable around Windows x64 packaging, install, launch, quit, and reopen behavior. macOS remains a follow-up platform.

**Rationale**: The clarification session set Windows x64 as the required first release target. Keeping the first platform narrow makes lifecycle, permissions, and sidecar packaging evidence achievable.

**Alternatives considered**: Shipping Windows and macOS together was rejected because it expands platform-specific packaging risk. Treating the app as development-only was rejected because the feature explicitly requires an installable Tauri app.

## Decision 3: Port 5030 Conflicts Are Non-Destructive By Default

**Decision**: If port `5030` is occupied, the app may stop or reuse the process only when it can confirm the process is an app-managed `chatlog_alpha` sidecar. Unknown occupants produce a recoverable conflict state.

**Rationale**: Port conflicts can involve unrelated local services. Non-destructive behavior protects user systems while still allowing cleanup of known app-managed sidecar instances.

**Alternatives considered**: Always killing the port occupant was rejected as unsafe. Never reusing or stopping any process was rejected because it would leave app-managed stale sidecars unrecoverable.

## Decision 4: Semantic Features Are Optional And Non-Blocking

**Decision**: Semantic configuration, indexing, and QA streaming are available product areas, but missing provider configuration must not block launch, dashboard statistics, chat browsing, or local search.

**Rationale**: Users should be able to use local history features without configuring an AI provider. Semantic readiness is a feature-specific readiness state, not a global app-readiness requirement.

**Alternatives considered**: Requiring semantic setup on first launch was rejected because it blocks core local workflows. Hiding semantic features entirely was rejected because the product scope includes config, index, and streaming QA readiness.

## Decision 5: Privacy Mode Masks Sensitive Content While Preserving Utility

**Decision**: Privacy mode masks private names, message content, and credentials, while preserving aggregate statistics, readiness statuses, and non-sensitive navigation structure unless those elements would reveal private identities or message bodies.

**Rationale**: Users need privacy-safe viewing, screenshots, and diagnostics without making the app unusable. Aggregate and structural information helps troubleshooting and orientation without exposing raw chat content.

**Alternatives considered**: Hiding every screen completely was rejected because it prevents useful troubleshooting and app use. Masking only message bodies was rejected because names and credentials are also sensitive.

## Decision 6: Diagnostics Are User-Triggered And Redacted

**Decision**: The product provides a user-triggered diagnostic package containing redacted setup, readiness, package, and sidecar evidence. Automatic diagnostic collection is not allowed.

**Rationale**: Evidence-driven debugging is required, but the app handles private local WeChat data. Diagnostics must support troubleshooting without silently collecting private material.

**Alternatives considered**: Automatic diagnostic upload was rejected because telemetry is disabled by default and remote transfer needs explicit consent. No diagnostics were rejected because packaging and lifecycle issues need reproducible evidence.

## Decision 7: L1/L2/L3/L4 Ownership Remains The Implementation Boundary

**Decision**: Productization work must stay within the existing architecture. L1 delegates user intent, L2 orchestrates user flows and API coordination, L3 renders supplied data and callbacks, and L4 isolates raw HTTP/SSE and Tauri/system access.

**Rationale**: The app already has a layered architecture. Preserving it limits cross-module coupling while adding lifecycle, readiness, and packaging behavior.

**Alternatives considered**: Direct fetches from L1 or L3 were rejected because they bypass orchestration and error translation. A new parallel state architecture was rejected because it creates duplicate product logic.

## Decision 8: REST And SSE Are Contracted As Local Backend Interfaces

**Decision**: Use the existing local REST endpoints for dashboard, browsing, search, semantic, and graph data. Treat semantic QA streaming as cancellable incremental SSE handled by low-level network atoms and coordinated by L2.

**Rationale**: This matches the sidecar contract and supports progressive answer feedback, cancellation, and safe abandonment without coupling UI components to transport details.

**Alternatives considered**: Polling streaming answers was rejected because it loses incremental behavior. Embedding SSE parsing in UI components was rejected because it violates layer ownership.

## Decision 9: Graph MVP Must Be Bounded And Recoverable

**Decision**: The graph MVP uses the existing Three.js/React Three Fiber stack and must explicitly handle available, empty, failed, malformed, and oversized data states without freezing the app.

**Rationale**: Graph rendering can become expensive quickly. The MVP should make relationships inspectable while protecting the desktop app from unrecoverable UI locks.

**Alternatives considered**: Unlimited graph rendering was rejected because it risks freezes. Omitting graph states was rejected because graph MVP is part of the product scope.

# Feature Specification: Ready-to-Use Desktop App

**Feature Branch**: `001-ready-desktop-app`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "Feature: make chatlogUI a ready-to-use desktop application for chatlog_alpha. Focus on what and why, not implementation guesses. The product must start without terminal usage; detect or ask for WeChat data directory; start and monitor chatlog_alpha sidecar; connect to local backend APIs on port 5030; show dashboard statistics; browse sessions/contacts/chatrooms/messages; support search; support semantic config/index/QA streaming; support graph MVP; provide settings and privacy controls; build into installable Tauri app; avoid logging secrets or private data. Current project context: core framework already exists; current app is not yet formally deliverable; main work is debugging, missing features, UI polish, and packaging."

## Clarifications

### Session 2026-05-30

- Q: What is the required first installable release platform scope? → A: Windows x64 is the required first installable release target; macOS is follow-up.
- Q: What is the policy when port 5030 is occupied? → A: Stop or reuse only a confirmed app-managed `chatlog_alpha`; otherwise show a recoverable conflict state.
- Q: How should the app behave when semantic provider configuration is missing? → A: Semantic config, index, and QA are optional; missing provider must not block browsing, search, or dashboard use.
- Q: What should privacy mode hide or preserve? → A: Mask names, message content, and credentials while keeping aggregate statistics, statuses, and non-sensitive structure visible.
- Q: What diagnostic export scope is required? → A: A user-triggered redacted diagnostic package is required; automatic diagnostic collection is not allowed.

## Constitution Alignment *(mandatory)*

- **Sidecar Contract Impact**: This feature makes the existing `chatlog_alpha`
  sidecar part of the deliverable product. The app must start, monitor, stop,
  and report readiness for the sidecar without changing the backend contract.
  The user-visible local service is expected on port `5030`.
- **Privacy/Security Impact**: The product handles local private WeChat data.
  Secrets, data keys, tokens, provider credentials, local file paths that expose
  private identity, and private message content must not appear in routine logs,
  diagnostics, screenshots, release artifacts, or committed fixtures.
- **Layer Ownership**: The feature must preserve the established product
  architecture boundaries: entry screens delegate user intent, coordination
  owns app flow and error translation, reusable feature views render supplied
  data, and low-level local service or system access remains isolated.
- **Visible States**: Every user-facing flow must have loading, empty, error,
  and success states. Recoverable failures must show retry or next-step
  guidance.
- **Packaging Impact**: The feature is not complete until the app can be
  delivered as an installable Windows x64 desktop package that includes the
  local backend lifecycle, first-launch setup, privacy-safe logs, and release
  caveats. macOS packaging remains a follow-up target and must not block the
  first deliverable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Launch Without Terminal (Priority: P1)

A non-technical user opens the desktop app and reaches a usable ready state
without starting any terminal command or manually managing a backend service.

**Why this priority**: This is the defining product promise. If launch still
requires terminal work, the app has not productized `chatlog_alpha`.

**Independent Test**: Install or open the app on a clean user profile with valid
local WeChat data available. Confirm the user can complete setup, see backend
readiness, and enter the main workspace without terminal usage.

**Acceptance Scenarios**:

1. **Given** the app is opened for the first time and a valid WeChat data
   directory is discoverable, **When** launch completes, **Then** the app shows
   the detected data source, starts the local backend, reports readiness, and
   enters the main workspace.
2. **Given** the app cannot detect a WeChat data directory, **When** the user
   opens the app, **Then** the app asks the user to choose a directory and
   explains what is needed without showing a blank or technical failure screen.
3. **Given** the local backend cannot become ready, **When** launch fails,
   **Then** the app shows the failure state, a safe diagnostic summary, and a
   retry or setup action.

---

### User Story 2 - Inspect Chat History And Dashboard (Priority: P1)

A user views meaningful dashboard statistics and browses sessions, contacts,
chatrooms, and messages from local WeChat history.

**Why this priority**: Browsing and understanding local chat history is the core
value users expect before advanced analysis features matter.

**Independent Test**: Use a prepared local data set containing contacts,
chatrooms, messages, and statistics. Confirm the dashboard and browsing flows
show useful data and graceful empty states.

**Acceptance Scenarios**:

1. **Given** local chat data is available, **When** the user opens the main
   workspace, **Then** dashboard statistics summarize the available history.
2. **Given** sessions, contacts, or chatrooms are available, **When** the user
   selects one, **Then** the app shows the relevant message history with clear
   loading and completion feedback.
3. **Given** no messages are available for the selected item, **When** the user
   opens it, **Then** the app explains the empty state and offers a next step
   where one exists.

---

### User Story 3 - Search Local History (Priority: P1)

A user searches across local chat history and understands the result set,
including no-match and failure outcomes.

**Why this priority**: Search is the fastest path from a large private archive
to useful information.

**Independent Test**: Search for terms with known matches, terms with no
matches, and terms while the local backend is unavailable. Confirm results,
empty state, and recoverable errors are all understandable.

**Acceptance Scenarios**:

1. **Given** local messages contain matching text, **When** the user searches
   for that text, **Then** matching results appear with enough context to open
   the relevant conversation.
2. **Given** no local messages match the query, **When** the user searches,
   **Then** the app shows a no-results state without treating it as a failure.
3. **Given** the local backend cannot complete the search, **When** the search
   fails, **Then** the app shows an error with retry or setup guidance.

---

### User Story 4 - Use Semantic Analysis And Streaming QA (Priority: P2)

A user configures semantic analysis, manages index readiness, and asks
questions that stream answers progressively.

**Why this priority**: Semantic QA is a differentiating capability, but it
depends on a reliable base app and clear readiness feedback.

**Independent Test**: Exercise semantic setup states with missing configuration,
index unavailable, index ready, streaming answer, interrupted stream, and empty
answer.

**Acceptance Scenarios**:

1. **Given** semantic configuration is incomplete, **When** the user opens the
   semantic area, **Then** the app states what is missing and how to proceed.
2. **Given** semantic indexing is not ready, **When** the user checks index
   status, **Then** the app distinguishes unavailable, running, failed, and
   ready states.
3. **Given** semantic QA is ready, **When** the user asks a question, **Then**
   answer content appears progressively and the user can safely stop or leave
   the stream.

---

### User Story 5 - Explore Graph MVP (Priority: P2)

A user opens a graph view, loads a small relationship graph, and inspects nodes
or relations without the app freezing or obscuring failure states.

**Why this priority**: The graph MVP turns extracted relationships into an
inspectable product feature, but it must be bounded and recoverable.

**Independent Test**: Open the graph view with available graph data, no graph
data, and a failing graph load. Confirm the user can distinguish each state.

**Acceptance Scenarios**:

1. **Given** graph data is available, **When** the user opens the graph view,
   **Then** a usable graph appears with inspectable nodes or relations.
2. **Given** no graph data is available, **When** the graph view loads, **Then**
   the app explains why the graph is empty and what can make it available.
3. **Given** graph loading fails or the data is too large, **When** the user
   attempts to load it, **Then** the app stays responsive and provides recovery
   guidance.

---

### User Story 6 - Control Settings, Privacy, And Release Readiness (Priority: P1)

A user can configure data, semantic provider settings, and privacy behavior,
while the product can be packaged and reopened as a normal desktop application.

**Why this priority**: The app is not deliverable if configuration, privacy, and
packaging remain incomplete even when individual screens work in development.

**Independent Test**: Change settings, enable privacy controls, close and reopen
the app, and confirm the installable package preserves safe behavior.

**Acceptance Scenarios**:

1. **Given** the user opens settings, **When** they update data or semantic
   configuration, **Then** the app gives clear save, validation, and failure
   feedback without exposing secrets after save.
2. **Given** privacy controls are enabled, **When** private chat surfaces are
   visible, **Then** sensitive names, message content, and credentials are
   masked or withheld according to the privacy mode.
3. **Given** the app has been packaged for installation, **When** the user
   installs, launches, quits, and reopens it on Windows x64, **Then** it
   behaves like the same ready-to-use product without manual service
   management.

### Edge Cases

- The WeChat data directory is missing, moved, inaccessible, unsupported, or
  selected incorrectly.
- The local backend is unavailable, unhealthy, already occupied by another
  process, slow to become ready, or exits while the app is open.
- Port `5030` is occupied by an unknown process; the app must not stop it
  automatically and must show the user a recoverable conflict state.
- The user has no sessions, no contacts, no chatrooms, no messages, no search
  matches, no semantic index, or no graph data.
- A message history is very large and must remain browsable without locking the
  interface.
- Semantic configuration is missing, rejected, expired, or intentionally not
  configured because the user only wants local browsing.
- A streaming answer is interrupted, returns an error, returns no useful answer,
  or continues after the user leaves the semantic view.
- Graph data is too large, malformed, unavailable, or not yet generated.
- The user enables privacy controls while private content is already visible.
- Diagnostic logs or screenshots are requested while secrets or private message
  content are present.
- The user exports diagnostics while private content is visible; the exported
  package must redact private identities, message content, credentials, data
  keys, tokens, and sensitive local paths.
- The packaged app is missing required local backend assets, lacks permission to
  access selected data, or cannot shut down the backend cleanly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST let a user open the desktop app and reach setup
  or the main workspace without using a terminal.
- **FR-002**: The product MUST detect a plausible WeChat data directory when
  possible and ask the user to choose one when detection is unavailable or
  ambiguous.
- **FR-003**: The product MUST validate the selected data source enough to tell
  the user whether it can be used, is empty, is inaccessible, or needs action.
- **FR-004**: The product MUST start and monitor the `chatlog_alpha` local
  backend as part of the app experience.
- **FR-005**: The product MUST connect to the expected local backend service on
  port `5030` and report connection, readiness, and failure states in user
  language.
- **FR-006**: The product MUST stop or detach safely from the local backend when
  the app quits, and it MUST recover on the next launch without requiring manual
  process cleanup.
- **FR-006a**: If port `5030` is occupied, the product MUST stop or reuse the
  process only when it can confirm the process is an app-managed
  `chatlog_alpha` sidecar; unknown processes MUST produce a recoverable port
  conflict state.
- **FR-007**: The dashboard MUST show meaningful statistics when local history
  is available and a useful empty state when it is not.
- **FR-008**: The product MUST let users browse sessions, contacts, chatrooms,
  and message history from the selected local data source.
- **FR-009**: Message browsing MUST support long histories through progressive
  loading, pagination, or equivalent user-visible continuation behavior.
- **FR-010**: The product MUST let users search local chat history and open a
  result in its conversation context.
- **FR-011**: Search MUST distinguish matching results, no results, invalid
  queries, and recoverable failures.
- **FR-012**: Semantic features MUST show configuration readiness before users
  attempt semantic search or QA.
- **FR-012a**: Missing semantic provider configuration MUST NOT block launch,
  dashboard statistics, chat browsing, or search; it only limits semantic
  feature availability.
- **FR-013**: Semantic index controls MUST show current readiness, in-progress,
  empty, failed, and completed states.
- **FR-014**: Semantic QA MUST display streamed answer progress incrementally
  and allow the user to stop, abandon, or recover from an interrupted stream.
- **FR-015**: The graph MVP MUST load an available relationship graph and let
  users inspect at least one node or relation.
- **FR-016**: The graph MVP MUST handle empty, failed, and oversized graph
  states without freezing the app.
- **FR-017**: Settings MUST allow users to review and change data source,
  semantic configuration, privacy controls, and relevant app preferences.
- **FR-018**: Saved secrets or credentials MUST NOT be displayed back to the user
  unless the user explicitly re-enters or reveals them through a deliberate
  control.
- **FR-019**: Privacy controls MUST mask or withhold private names, message
  content, and credentials on the main user-facing surfaces when enabled.
- **FR-019a**: Privacy controls MUST keep aggregate statistics, readiness
  statuses, and non-sensitive navigation structure visible unless those elements
  would reveal private identities or message content.
- **FR-020**: Routine logs, diagnostics, screenshots, fixtures, release notes,
  and failure reports MUST avoid raw secrets, data keys, tokens, and private
  message content.
- **FR-020a**: The product MUST provide a user-triggered redacted diagnostic
  package for troubleshooting, and MUST NOT collect diagnostic packages
  automatically.
- **FR-021**: Every user-facing flow in this feature MUST provide loading,
  empty, error, and success states with recovery guidance where applicable.
- **FR-022**: The product MUST avoid remote communication unless it is a
  documented update check or an explicit user-configured provider action.
- **FR-023**: The product MUST be deliverable as an installable desktop app, not
  only as a development-mode experience, with Windows x64 as the required first
  release target.
- **FR-024**: The product MUST communicate known platform permission caveats,
  local data requirements, macOS follow-up status, and release limitations
  before final delivery.
- **FR-025**: The product MUST preserve the existing `chatlog_alpha` backend
  behavior unless a future approved specification explicitly changes that
  contract.

### Key Entities

- **WeChat Data Source**: A local directory or data location that contains the
  user's chat history and related assets.
- **Local Backend Service**: The `chatlog_alpha` process the app relies on to
  read, search, analyze, and expose local chat data.
- **Readiness State**: The user-visible state that explains whether setup,
  backend, database, semantic, graph, or package readiness is loading, empty,
  failed, or usable.
- **Session**: A conversation thread or activity grouping available for browsing.
- **Contact**: An individual conversation participant available in the local
  history.
- **Chatroom**: A group conversation available in the local history.
- **Message**: A single chat item with sender, time, content, and optional media
  indicators.
- **Search Result**: A matched item that includes enough context for the user to
  understand and open it.
- **Dashboard Statistic**: A summarized measure of available local history.
- **Semantic Configuration**: User-controlled settings and readiness indicators
  for semantic indexing and question answering.
- **Semantic Index**: The searchable semantic preparation state for local chat
  history.
- **QA Stream**: A progressive answer session for a user question.
- **Graph Item**: A node or relationship shown in the graph MVP.
- **Privacy Control**: A user setting that changes how private content is shown
  or withheld.
- **Installable Release**: A packaged desktop app that can be installed,
  launched, quit, and reopened by a normal user.
- **Diagnostic Package**: A user-triggered troubleshooting bundle containing
  redacted setup, readiness, package, and local backend evidence without raw
  private content or secrets.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of first-time users with valid local data can reach
  the main workspace in under 5 minutes without opening a terminal.
- **SC-002**: 100% of tested launch, setup, backend, and data-readiness failures
  produce a visible error state with a next action instead of a blank screen.
- **SC-002a**: 100% of tested unknown port `5030` conflicts are reported as a
  recoverable conflict state without automatically stopping the unknown process.
- **SC-003**: Users can view dashboard statistics, open a conversation, and read
  messages from a prepared local data set in under 2 minutes after launch.
- **SC-004**: 95% of common searches over a prepared local data set show
  results, no-results feedback, or a recoverable error within 3 seconds.
- **SC-005**: A prepared long conversation of at least 10,000 messages remains
  browsable with explicit continuation feedback and no unrecoverable UI lockup.
- **SC-006**: Semantic QA tests show progressive answer feedback for available
  streams and a clear stopped, failed, or empty-answer state for interrupted
  streams.
- **SC-006a**: With semantic provider configuration absent, users can still
  launch the app, view dashboard statistics, browse messages, and search local
  history.
- **SC-007**: Graph MVP tests cover available, empty, failed, and oversized graph
  cases without causing an unrecoverable app freeze.
- **SC-008**: Privacy acceptance tests find zero raw data keys, provider
  credentials, tokens, or private message bodies in routine logs, diagnostics,
  release notes, or test fixtures.
- **SC-008a**: With privacy controls enabled, private names, message bodies, and
  credentials are masked while aggregate statistics and non-sensitive structure
  remain usable.
- **SC-008b**: A user-triggered diagnostic export contains zero raw data keys,
  provider credentials, tokens, private message bodies, or unredacted private
  identities in acceptance testing.
- **SC-009**: A Windows x64 packaged build can be installed, launched, quit, and
  reopened without manual backend process cleanup.
- **SC-010**: Release review identifies no unresolved P1 blocker for launch,
  browsing, search, settings/privacy, sidecar lifecycle, or packaging.

## Assumptions

- The target user is a single local desktop user who wants to inspect and
  analyze their own WeChat history.
- The existing app framework and project structure remain the basis for this
  productization work; this feature is not a greenfield rewrite.
- `chatlog_alpha` remains the authoritative backend for reading and analyzing
  WeChat data.
- A compatible `chatlog_alpha` backend binary and compatible local WeChat data
  are available for acceptance testing.
- If automatic data detection fails, asking the user to choose the directory is
  an acceptable fallback.
- Semantic provider configuration may be optional for users who only need local
  browsing, dashboard, search, and graph features.
- External AI providers are used only when explicitly configured by the user.
- Final release hardening may document platform caveats when signing,
  notarization, or real-machine coverage is not yet complete.
- The first installable release target is Windows x64. macOS support is a
  follow-up target unless a later spec amendment changes release scope.

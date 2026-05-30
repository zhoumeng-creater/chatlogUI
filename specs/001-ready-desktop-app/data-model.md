# Data Model: Ready-to-Use Desktop App

## Overview

This model defines product entities and user-visible states for making chatlogUI a ready-to-use desktop app. It does not redefine `chatlog_alpha` storage or backend internals.

## Entities

### WeChatDataSource

**Fields**: `id`, `displayName`, `pathRef`, `validationState`, `lastCheckedAt`, `selectedAt`, `problemSummary`.

**Relationships**: Provides the data context for `LocalBackendService`, `DashboardStatistic`, `Session`, `Contact`, `Chatroom`, `Message`, `SearchResult`, `SemanticIndex`, and `GraphItem`.

**Validation rules**: The selected location must be readable enough to classify as usable, empty, inaccessible, unsupported, or requiring user action. Raw local paths that reveal private identity must be redacted in routine logs and diagnostics.

**State transitions**: `unknown -> detecting -> detected | needsSelection -> validating -> usable | empty | inaccessible | unsupported | error`.

### LocalBackendService

**Fields**: `port`, `baseUrl`, `lifecycleState`, `ownership`, `healthState`, `startedAt`, `lastHealthCheckAt`, `lastExitSummary`, `lastErrorSummary`.

**Relationships**: Serves all local REST and SSE data for the app. Depends on `WeChatDataSource` and packaged sidecar availability.

**Validation rules**: Expected port is `5030`. Unknown port occupants must not be stopped automatically. Only confirmed app-managed `chatlog_alpha` processes may be reused or stopped.

**State transitions**: `stopped -> starting -> ready -> unhealthy | exited | stopping -> stopped`; conflict path `starting -> portConflict -> retrying | stopped`.

### ReadinessState

**Fields**: `scope`, `status`, `title`, `message`, `recoveryAction`, `updatedAt`, `evidenceRef`.

**Relationships**: Attached to setup, backend, database, dashboard, browsing, search, semantic, graph, privacy, diagnostics, and packaging surfaces.

**Validation rules**: User-facing flows must expose loading, empty, error, and success states where those outcomes apply. Recoverable errors must include a next action.

**State transitions**: `idle -> loading -> success | empty | error | conflict | cancelled`.

### Session

**Fields**: `id`, `title`, `lastMessageAt`, `messageCount`, `participantsSummary`, `privacyMasked`.

**Relationships**: Contains or links to `Message` records and may reference `Contact` or `Chatroom`.

**Validation rules**: Private names must be masked when privacy mode is enabled. Empty sessions must not be displayed as failures.

### Contact

**Fields**: `id`, `displayName`, `alias`, `avatarRef`, `messageCount`, `lastActiveAt`, `privacyMasked`.

**Relationships**: Can appear in `Session`, `Message`, `SearchResult`, `SemanticIndex`, and `GraphItem`.

**Validation rules**: Names, aliases, and identifying avatar data are private surfaces under privacy mode.

### Chatroom

**Fields**: `id`, `displayName`, `memberCount`, `messageCount`, `lastActiveAt`, `privacyMasked`.

**Relationships**: Can contain `Session` and `Message` records and contribute to graph nodes or relations.

**Validation rules**: Room names and member-identifying details are private surfaces under privacy mode.

### Message

**Fields**: `id`, `conversationId`, `senderId`, `timestamp`, `contentPreview`, `messageType`, `mediaIndicator`, `privacyMasked`, `paginationCursor`.

**Relationships**: Belongs to a session, contact conversation, or chatroom. Can appear in `SearchResult` and semantic answers.

**Validation rules**: Message bodies must be masked in privacy mode and must not appear raw in routine logs, fixtures, diagnostics, or release notes. Long histories require progressive loading, pagination, or equivalent continuation behavior.

### SearchResult

**Fields**: `id`, `query`, `matchedEntityType`, `matchedEntityId`, `snippet`, `timestamp`, `conversationContext`, `resultState`, `privacyMasked`.

**Relationships**: Links to `Message`, `Session`, `Contact`, or `Chatroom` context.

**Validation rules**: Search must distinguish matches, no results, invalid query, backend failure, and cancelled request. Snippets are private content under privacy mode.

### DashboardStatistic

**Fields**: `id`, `label`, `value`, `trend`, `sourceScope`, `computedAt`, `privacySafe`.

**Relationships**: Summarizes `WeChatDataSource` content across sessions, contacts, chatrooms, and messages.

**Validation rules**: Aggregate statistics may remain visible in privacy mode unless the label or breakdown exposes private identity or message content.

### SemanticConfiguration

**Fields**: `providerKind`, `configuredState`, `credentialState`, `modelLabel`, `lastValidatedAt`, `problemSummary`.

**Relationships**: Enables `SemanticIndex` and `QAStream` when ready.

**Validation rules**: Missing configuration must not block launch, dashboard, browsing, or search. Saved secrets must not be displayed back without deliberate reveal or re-entry controls.

**State transitions**: `unconfigured -> editing -> validating -> ready | rejected | expired | disabled`.

### SemanticIndex

**Fields**: `status`, `coverageSummary`, `lastStartedAt`, `lastCompletedAt`, `failureSummary`, `progress`.

**Relationships**: Depends on `SemanticConfiguration` and local chat data. Enables semantic search and QA readiness.

**Validation rules**: Must distinguish unavailable, empty, running, failed, and ready states.

**State transitions**: `unavailable -> queued -> running -> ready | empty | failed | cancelled`.

### QAStream

**Fields**: `id`, `question`, `status`, `partialAnswer`, `finalAnswer`, `startedAt`, `stoppedAt`, `failureSummary`, `privacyMasked`.

**Relationships**: Uses `SemanticConfiguration`, `SemanticIndex`, and SSE backend APIs.

**Validation rules**: Answers must render progressively, support stop or abandon, and avoid continuing into unmounted UI surfaces. Private answer content is masked in privacy mode.

**State transitions**: `idle -> connecting -> streaming -> completed | stopped | failed | empty`.

### GraphItem

**Fields**: `id`, `kind`, `label`, `weight`, `sourceEntityRef`, `relationType`, `privacyMasked`.

**Relationships**: Represents nodes or relations derived from contacts, chatrooms, messages, or semantic outputs.

**Validation rules**: Graph surfaces must handle available, empty, failed, malformed, and oversized data without unrecoverable UI freezes. Labels are private surfaces when they identify people, rooms, or message content.

### PrivacyControl

**Fields**: `enabled`, `maskNames`, `maskMessages`, `maskCredentials`, `preserveAggregateStats`, `updatedAt`.

**Relationships**: Applies to all private UI surfaces, logs, screenshots, diagnostics, and exported evidence.

**Validation rules**: When enabled, names, message content, and credentials must be masked or withheld while aggregate statistics and non-sensitive structure remain usable where safe.

### DiagnosticPackage

**Fields**: `id`, `createdAt`, `triggeredByUser`, `includedScopes`, `redactionStatus`, `fileRef`, `problemSummary`.

**Relationships**: Includes redacted setup, readiness, package, and sidecar evidence. Must not include raw private entities.

**Validation rules**: Must be user-triggered. Must exclude raw data keys, provider credentials, tokens, private message bodies, unredacted private identities, and sensitive local paths.

### InstallableRelease

**Fields**: `platform`, `architecture`, `packageState`, `sidecarBundleState`, `installState`, `launchSmokeState`, `knownCaveats`.

**Relationships**: Depends on Tauri configuration, sidecar binary availability, capabilities, privacy-safe logging, and release documentation.

**Validation rules**: Windows x64 package must install, launch, quit, and reopen without terminal usage or manual sidecar cleanup. macOS caveats are documented as follow-up.

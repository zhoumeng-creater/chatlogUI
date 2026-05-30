# Tasks: Ready-to-Use Desktop App

**Input**: Design documents from `specs/001-ready-desktop-app/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Include targeted Vitest or Rust tests for changed contracts, L2 orchestration, state normalization, sidecar/Tauri behavior, redaction helpers, and regression-prone display helpers. Final delivery also requires the quickstart smoke checks.

**Branch/Worktree Rule**: Each task is intentionally scoped so it can be implemented on a separate branch or Codex App worktree. Suggested branch names should use `codex/T###-short-name`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase because likely file ownership does not overlap.
- **[Story]**: User story label from `spec.md`. Setup, foundational, and polish tasks do not use a story label.
- Every task includes likely changed files, acceptance criteria, verification commands, sidecar/privacy/release risk, and Codex App worktree/cloud suitability.

## Phase 1: Setup (Shared Planning Infrastructure)

**Purpose**: Create the implementation tracking scaffolding needed for many separate worktrees.

- [ ] T001 Create implementation inventory in `specs/001-ready-desktop-app/implementation-inventory.md`
  - Files likely to change: `specs/001-ready-desktop-app/implementation-inventory.md`
  - Acceptance criteria: Inventory maps each feature area to current L1/L2/L3/L4 and `src-tauri/` files, notes owner layer, and flags existing dirty files that need merge care.
  - Verification commands: `rg -n "L1|L2|L3|L4|src-tauri|sidecar" specs/001-ready-desktop-app/implementation-inventory.md`
  - Sidecar/privacy/release risk: Low sidecar risk; low privacy risk; medium release risk because the inventory affects task sequencing.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T002 [P] Define sanitized test data policy in `specs/001-ready-desktop-app/test-data-policy.md`
  - Files likely to change: `specs/001-ready-desktop-app/test-data-policy.md`
  - Acceptance criteria: Policy states no real WeChat messages, raw data keys, provider credentials, tokens, or unredacted local paths may be committed; it defines allowed synthetic fixtures for stats, search, semantic, graph, and long-history tests.
  - Verification commands: `rg -n "real WeChat|dataKey|credential|synthetic|fixture" specs/001-ready-desktop-app/test-data-policy.md`
  - Sidecar/privacy/release risk: No sidecar risk; high privacy relevance; low release risk.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [x] T003 [P] Create release evidence template in `specs/001-ready-desktop-app/release-evidence.md`
  - Files likely to change: `specs/001-ready-desktop-app/release-evidence.md`
  - Acceptance criteria: Template captures Windows x64 install, launch, quit, reopen, sidecar ownership, port conflict, redaction, and caveat evidence without requiring private data.
  - Verification commands: `rg -n "Windows x64|install|launch|quit|reopen|redact|5030" specs/001-ready-desktop-app/release-evidence.md`
  - Sidecar/privacy/release risk: Medium sidecar relevance; medium privacy relevance; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes for template, local Windows required for final evidence.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared contracts and guardrails that all user stories depend on.

- [ ] T004 Define shared readiness types in `src/l2-coordinator/data-clerk/types/readiness.ts`
  - Files likely to change: `src/l2-coordinator/data-clerk/types/readiness.ts`, `src/l2-coordinator/data-clerk/types/app.ts`, `src/l2-coordinator/data-clerk/types/setup.ts`
  - Acceptance criteria: Type model covers `idle`, `loading`, `empty`, `success`, `error`, `conflict`, and `cancelled` with scope, message, recovery action, and redaction-safe evidence fields.
  - Verification commands: `pnpm typecheck`; `pnpm test -- src/l2-coordinator`
  - Sidecar/privacy/release risk: Medium sidecar relevance; medium privacy relevance; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T005 [P] Add redaction guard tests and helpers in `src/utils/maskSecrets.ts`
  - Files likely to change: `src/utils/maskSecrets.ts`, `src/utils/maskSecrets.test.ts`
  - Acceptance criteria: Helper redacts data keys, API keys, tokens, credential-like values, message snippets, and sensitive path segments while preserving non-sensitive status text.
  - Verification commands: `pnpm test -- src/utils/maskSecrets.test.ts`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Low sidecar risk; high privacy relevance; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T006 [P] Normalize local backend contract types in `src/l2-coordinator/api-docs/sidecar.ts`
  - Files likely to change: `src/l2-coordinator/api-docs/sidecar.ts`, `src/l4-atom/network/readiness.ts`, `src/l4-atom/network/readiness.test.ts`
  - Acceptance criteria: Contract represents `/health`, port `5030`, app-managed vs unknown process ownership, and backend readiness states without changing `chatlog_alpha` API behavior.
  - Verification commands: `pnpm test -- src/l4-atom/network/readiness.test.ts`; `pnpm typecheck`
  - Sidecar/privacy/release risk: High sidecar relevance; low privacy risk; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes for TypeScript tests, local sidecar not required.

- [ ] T007 [P] Add reusable readiness UI surface in `src/l3-molecule/common/ReadinessStatePanel.tsx`
  - Files likely to change: `src/l3-molecule/common/ReadinessStatePanel.tsx`, `src/l3-molecule/common/index.ts`, `src/l4-atom/ui/StatusIndicator.tsx`
  - Acceptance criteria: Component renders loading, empty, error, conflict, cancelled, and success variants from props only and exposes retry or next-step callbacks without direct network calls.
  - Verification commands: `pnpm lint`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Low sidecar risk; medium privacy relevance because messages must be redaction-safe; low release risk.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T008 Centralize user-safe error translation in `src/l2-coordinator/diplomat/errorTranslator.ts`
  - Files likely to change: `src/l2-coordinator/diplomat/errorTranslator.ts`, `src/l2-coordinator/diplomat/errorTranslator.test.ts`
  - Acceptance criteria: Errors from setup, sidecar, backend APIs, SSE, graph, settings, and diagnostics map to user-facing summaries with redacted details and recovery actions.
  - Verification commands: `pnpm test -- src/l2-coordinator/diplomat/errorTranslator.test.ts`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Medium sidecar relevance; high privacy relevance; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [x] T009 Add architecture boundary checklist in `specs/001-ready-desktop-app/architecture-boundary-check.md`
  - Files likely to change: `specs/001-ready-desktop-app/architecture-boundary-check.md`
  - Acceptance criteria: Checklist states no L1 business logic, no L1/L3 direct network calls, L2 owns orchestration, and L4 owns raw network/system atoms.
  - Verification commands: `rg -n "L1|L2|L3|L4|network|orchestration" specs/001-ready-desktop-app/architecture-boundary-check.md`
  - Sidecar/privacy/release risk: Low sidecar risk; low privacy risk; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

**Checkpoint**: Foundation ready. User story work can now proceed in separate worktrees.

---

## Phase 3: User Story 1 - Launch Without Terminal (Priority: P1) - MVP

**Goal**: A user opens the desktop app and reaches setup or the main workspace without terminal usage.

**Independent Test**: Install or open the app with valid local data available and confirm data readiness, sidecar readiness, and main workspace entry without terminal commands.

- [ ] T010 [US1] Harden sidecar lifecycle and ownership tests in `src-tauri/src/sidecar.rs`
  - Files likely to change: `src-tauri/src/sidecar.rs`, `src-tauri/src/service_probe.rs`, `src-tauri/src/health.rs`, `src-tauri/src/sidecar_args.rs`, `src-tauri/src/sidecar_tests.rs`
  - Acceptance criteria: Rust logic distinguishes app-managed sidecar, unknown port occupant, unhealthy sidecar, clean shutdown, and stale app-managed process recovery.
  - Verification commands: `Push-Location src-tauri; cargo test; Pop-Location`
  - Sidecar/privacy/release risk: High sidecar risk; low privacy risk; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud partial because final port/process behavior needs local Windows validation.

- [ ] T011 [P] [US1] Complete WeChat data detection and validation command flow in `src-tauri/src/wechat_detect.rs`
  - Files likely to change: `src-tauri/src/wechat_detect.rs`, `src-tauri/src/config_store.rs`, `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`
  - Acceptance criteria: Commands classify detected, needs selection, usable, empty, inaccessible, unsupported, and error states without logging sensitive full paths.
  - Verification commands: `Push-Location src-tauri; cargo test; Pop-Location`
  - Sidecar/privacy/release risk: Medium sidecar risk; high privacy relevance for paths; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud partial because real Windows data detection needs local validation.

- [ ] T012 [P] [US1] Wrap launch system calls in L4 atoms in `src/l4-atom/system/sidecarManager.ts`
  - Files likely to change: `src/l4-atom/system/sidecarManager.ts`, `src/l4-atom/system/spawnSidecar.ts`, `src/l4-atom/system/detectWxPath.ts`, `src/l4-atom/system/openDirectoryPicker.ts`, `src/l4-atom/system/spawnSidecar.test.ts`
  - Acceptance criteria: L4 system atoms expose typed start, stop, health, detect, pick, and log subscription operations with redacted error payloads.
  - Verification commands: `pnpm test -- src/l4-atom/system/spawnSidecar.test.ts`; `pnpm typecheck`
  - Sidecar/privacy/release risk: High sidecar risk; medium privacy relevance; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes for mocked Tauri tests, local app smoke still required.

- [ ] T013 [US1] Implement launch orchestration in `src/l2-coordinator/commander/appBoot.ts`
  - Files likely to change: `src/l2-coordinator/commander/appBoot.ts`, `src/l2-coordinator/commander/appBoot.test.ts`, `src/l2-coordinator/commander/setupMachine.ts`, `src/l2-coordinator/data-clerk/stores/useAppStore.ts`, `src/l2-coordinator/data-clerk/stores/useSetupStore.ts`
  - Acceptance criteria: L2 boot flow coordinates data detection, user selection fallback, sidecar start, health polling, retry, conflict, and safe failure states.
  - Verification commands: `pnpm test -- src/l2-coordinator/commander/appBoot.test.ts src/l2-coordinator/commander/setupMachine.test.ts`; `pnpm typecheck`
  - Sidecar/privacy/release risk: High sidecar risk; medium privacy relevance; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes with mocked L4 atoms.

- [ ] T014 [US1] Render launch and setup states in `src/l1-entry/pages/LaunchView.tsx`
  - Files likely to change: `src/l1-entry/pages/LaunchView.tsx`, `src/l1-entry/pages/SetupCenterView.tsx`, `src/l3-molecule/setup/SetupStepper.tsx`, `src/l3-molecule/setup/ServiceControlPanel.tsx`, `src/l3-molecule/setup/ReadinessChecklist.tsx`
  - Acceptance criteria: UI shows loading, detected, choose-directory, validating, backend-starting, conflict, error, and ready states with actions and without terminal instructions.
  - Verification commands: `pnpm lint`; `pnpm typecheck`; `pnpm build`
  - Sidecar/privacy/release risk: Medium sidecar relevance; medium privacy relevance; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes for UI build, local launch smoke required.

- [ ] T015 [US1] Add no-terminal launch smoke evidence in `specs/001-ready-desktop-app/release-evidence.md`
  - Files likely to change: `specs/001-ready-desktop-app/release-evidence.md`, `specs/001-ready-desktop-app/quickstart.md`
  - Acceptance criteria: Evidence template includes clean profile, valid data, missing data, unknown port conflict, backend failure, retry, and workspace entry cases.
  - Verification commands: `rg -n "clean profile|unknown port|retry|workspace" specs/001-ready-desktop-app/release-evidence.md`
  - Sidecar/privacy/release risk: Medium sidecar relevance; low privacy risk if evidence stays redacted; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes for document update, local Windows required to fill evidence.

**Checkpoint**: US1 can be tested independently as the MVP launch path.

---

## Phase 4: User Story 2 - Inspect Chat History And Dashboard (Priority: P1)

**Goal**: A user sees dashboard statistics and browses sessions, contacts, chatrooms, and messages.

**Independent Test**: Use sanitized prepared data with contacts, chatrooms, messages, stats, empty conversation, and a long history.

- [ ] T016 [P] [US2] Verify stats and browsing L4 adapters in `src/l4-atom/network/fetchStats.ts`
  - Files likely to change: `src/l4-atom/network/fetchStats.ts`, `src/l4-atom/network/fetchContacts.ts`, `src/l4-atom/network/fetchHistory.ts`, `src/l4-atom/network/chatlogAdapters.ts`, `src/l4-atom/network/chatlogAdapters.test.ts`
  - Acceptance criteria: Adapters normalize stats, sessions, contacts, chatrooms, history, empty responses, and backend failures without leaking raw private content in thrown errors.
  - Verification commands: `pnpm test -- src/l4-atom/network/chatlogAdapters.test.ts`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Medium sidecar relevance; high privacy relevance; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes with mocked HTTP.

- [ ] T017 [US2] Implement dashboard state orchestration in `src/l2-coordinator/commander/useStatsCommander.ts`
  - Files likely to change: `src/l2-coordinator/commander/useStatsCommander.ts`, `src/l2-coordinator/data-clerk/stores/useStatsStore.ts`, `src/l2-coordinator/commander/workbenchViewModel.ts`, `src/l2-coordinator/commander/workbenchViewModel.test.ts`
  - Acceptance criteria: Dashboard exposes loading, empty, error, and success states, preserves aggregate stats under privacy mode, and provides retry guidance.
  - Verification commands: `pnpm test -- src/l2-coordinator/commander/workbenchViewModel.test.ts`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Low sidecar risk; medium privacy relevance; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T018 [US2] Implement browsing state orchestration in `src/l2-coordinator/commander/useChatCommander.ts`
  - Files likely to change: `src/l2-coordinator/commander/useChatCommander.ts`, `src/l2-coordinator/data-clerk/stores/useChatStore.ts`, `src/l2-coordinator/data-clerk/stores/useChatStore.test.ts`
  - Acceptance criteria: Sessions, contacts, chatrooms, selected history, empty selections, backend errors, and long-history continuation are represented in L2 state.
  - Verification commands: `pnpm test -- src/l2-coordinator/data-clerk/stores/useChatStore.test.ts`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Low sidecar risk; high privacy relevance; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T019 [P] [US2] Render dashboard statistics states in `src/l3-molecule/stats/DashboardOverview.tsx`
  - Files likely to change: `src/l3-molecule/stats/DashboardOverview.tsx`, `src/l3-molecule/stats/StatsInspector.tsx`, `src/l3-molecule/stats/statsDisplay.ts`, `src/l3-molecule/stats/statsDisplay.test.ts`
  - Acceptance criteria: Stats components render loading, empty, error, success, privacy-masked labels, and fallback chart/table states from props only.
  - Verification commands: `pnpm test -- src/l3-molecule/stats/statsDisplay.test.ts`; `pnpm lint`; `pnpm typecheck`
  - Sidecar/privacy/release risk: No sidecar risk; medium privacy relevance; low release risk.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T020 [US2] Render chat browsing and long-history continuation in `src/l3-molecule/chat/ChatView.tsx`
  - Files likely to change: `src/l3-molecule/chat/ChatView.tsx`, `src/l3-molecule/chat/ConversationList.tsx`, `src/l3-molecule/chat/MessageList.tsx`, `src/l3-molecule/chat/transcriptDisplay.ts`, `src/l3-molecule/chat/transcriptDisplay.test.ts`, `src/l1-entry/pages/WorkbenchView.tsx`
  - Acceptance criteria: Chat UI shows sessions, contacts, chatrooms, message loading, empty history, recoverable errors, 10,000-message continuation affordance, and privacy masking.
  - Verification commands: `pnpm test -- src/l3-molecule/chat/transcriptDisplay.test.ts`; `pnpm lint`; `pnpm build`
  - Sidecar/privacy/release risk: Low sidecar risk; high privacy relevance; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes for component tests, local data smoke recommended.

**Checkpoint**: US2 can be tested independently after US1 foundation is available.

---

## Phase 5: User Story 3 - Search Local History (Priority: P1)

**Goal**: A user searches local chat history and understands matches, no results, invalid queries, and failures.

**Independent Test**: Search known matches, no-match terms, invalid queries, and backend-unavailable states.

- [ ] T021 [P] [US3] Verify search L4 adapter behavior in `src/l4-atom/network/fetchSearch.ts`
  - Files likely to change: `src/l4-atom/network/fetchSearch.ts`, `src/l4-atom/network/chatlogAdapters.ts`, `src/l4-atom/network/chatlogAdapters.test.ts`
  - Acceptance criteria: Adapter distinguishes result, empty result, invalid query, cancelled request, and backend failure with redacted error payloads.
  - Verification commands: `pnpm test -- src/l4-atom/network/chatlogAdapters.test.ts`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Low sidecar risk; high privacy relevance; low release risk.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T022 [US3] Implement search orchestration in `src/l2-coordinator/commander/useSearchCommander.ts`
  - Files likely to change: `src/l2-coordinator/commander/useSearchCommander.ts`, `src/l2-coordinator/commander/searchRequest.ts`, `src/l2-coordinator/commander/searchRequest.test.ts`, `src/l2-coordinator/data-clerk/stores/useSearchStore.ts`
  - Acceptance criteria: Search flow handles debounce, pending, invalid, matches, no matches, backend failure, retry, cancellation, and open-result context.
  - Verification commands: `pnpm test -- src/l2-coordinator/commander/searchRequest.test.ts`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Low sidecar risk; high privacy relevance; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T023 [P] [US3] Render search result states in `src/l3-molecule/search/GlobalSearch.tsx`
  - Files likely to change: `src/l3-molecule/search/GlobalSearch.tsx`, `src/l3-molecule/search/SearchResultsPane.tsx`, `src/l3-molecule/search/SearchResults.tsx`, `src/l3-molecule/search/FilterBar.tsx`
  - Acceptance criteria: UI distinguishes initial, loading, invalid query, no results, failed, and result states; snippets and identities are masked in privacy mode.
  - Verification commands: `pnpm lint`; `pnpm typecheck`; `pnpm build`
  - Sidecar/privacy/release risk: No sidecar risk; high privacy relevance; low release risk.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T024 [US3] Wire search result navigation in `src/l1-entry/pages/WorkbenchShellView.tsx`
  - Files likely to change: `src/l1-entry/pages/WorkbenchShellView.tsx`, `src/l1-entry/pages/WorkbenchView.tsx`, `src/l2-coordinator/commander/useWorkbenchCommander.ts`
  - Acceptance criteria: Opening a result selects the relevant conversation context without adding fetch logic to L1 and preserves visible failure states if the conversation cannot load.
  - Verification commands: `pnpm test -- src/l2-coordinator/commander/workbenchViewModel.test.ts`; `pnpm lint`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Low sidecar risk; medium privacy relevance; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

**Checkpoint**: US3 can be tested independently with mocked backend and prepared local data.

---

## Phase 6: User Story 6 - Control Settings, Privacy, And Release Readiness (Priority: P1)

**Goal**: A user configures data, semantic provider settings, and privacy behavior, and the product can be packaged and reopened as a desktop app.

**Independent Test**: Change settings, enable privacy controls, export diagnostics, build Windows x64 package, install, launch, quit, and reopen.

- [ ] T025 [US6] Implement settings persistence and validation in `src/l2-coordinator/commander/useSettingsCommander.ts`
  - Files likely to change: `src/l2-coordinator/commander/useSettingsCommander.ts`, `src/l2-coordinator/data-clerk/stores/useSettingsStore.ts`, `src/l4-atom/system/chatlogConfig.ts`, `src/l4-atom/system/chatlogConfig.test.ts`
  - Acceptance criteria: Data source, semantic metadata, privacy mode, and app preferences save with validation feedback and without echoing saved credentials.
  - Verification commands: `pnpm test -- src/l4-atom/system/chatlogConfig.test.ts`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Medium sidecar relevance; high privacy relevance; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes with mocked config store.

- [ ] T026 [P] [US6] Apply privacy masking across display helpers in `src/l3-molecule/chat/conversationDisplay.ts`
  - Files likely to change: `src/l3-molecule/chat/conversationDisplay.ts`, `src/l3-molecule/chat/conversationDisplay.test.ts`, `src/l3-molecule/stats/statsDisplay.ts`, `src/l3-molecule/stats/statsDisplay.test.ts`, `src/l3-molecule/search/SearchResultsPane.tsx`
  - Acceptance criteria: Names, message bodies, credentials, and identifying snippets are masked while aggregate statistics and non-sensitive structure remain usable.
  - Verification commands: `pnpm test -- src/l3-molecule/chat/conversationDisplay.test.ts src/l3-molecule/stats/statsDisplay.test.ts`; `pnpm typecheck`
  - Sidecar/privacy/release risk: No sidecar risk; high privacy relevance; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T027 [US6] Build user-triggered diagnostics flow in `src-tauri/src/commands.rs`
  - Files likely to change: `src-tauri/src/commands.rs`, `src-tauri/src/config_store.rs`, `src/l4-atom/system/index.ts`, `src/l2-coordinator/commander/useSetupCommander.ts`, `src/l3-molecule/setup/DiagnosticPanel.tsx`
  - Acceptance criteria: Diagnostic export is explicit, cancellable, redacted, fails closed on redaction failure, and never collects automatically.
  - Verification commands: `Push-Location src-tauri; cargo test; Pop-Location`; `pnpm typecheck`; `pnpm lint`
  - Sidecar/privacy/release risk: Medium sidecar relevance; high privacy relevance; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud partial because filesystem export behavior needs local validation.

- [ ] T028 [P] [US6] Render settings validation and privacy controls in `src/l1-entry/pages/SettingsView.tsx`
  - Files likely to change: `src/l1-entry/pages/SettingsView.tsx`, `src/l3-molecule/settings/DataSettings.tsx`, `src/l3-molecule/settings/AIModelSettings.tsx`, `src/l3-molecule/settings/AppearanceSettings.tsx`, `src/l3-molecule/settings/AboutSettings.tsx`
  - Acceptance criteria: Settings show editing, saving, saved, validation error, missing semantic provider, credential hidden, and privacy active states.
  - Verification commands: `pnpm lint`; `pnpm typecheck`; `pnpm build`
  - Sidecar/privacy/release risk: Low sidecar risk; high privacy relevance; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T029 [US6] Verify Windows x64 Tauri bundle configuration in `src-tauri/tauri.conf.json`
  - Files likely to change: `src-tauri/tauri.conf.json`, `src-tauri/build.rs`, `src-tauri/capabilities/default.json`, `src-tauri/src/main.rs`
  - Acceptance criteria: Bundle expects `src-tauri/binaries/chatlog_alpha`, permissions remain minimal, sidecar launch is packaged-app safe, and missing sidecar assets produce a visible failure state.
  - Verification commands: `Push-Location src-tauri; cargo test; Pop-Location`; `pnpm tauri build`
  - Sidecar/privacy/release risk: High sidecar risk; medium privacy relevance; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud no for final package validation because Windows x64 installer smoke is required.

- [ ] T030 [US6] Document release caveats and smoke results in `docs/release/ready-desktop-app.md`
  - Files likely to change: `docs/release/ready-desktop-app.md`, `specs/001-ready-desktop-app/release-evidence.md`, `specs/001-ready-desktop-app/quickstart.md`
  - Acceptance criteria: Document covers Windows x64 scope, local data requirements, sidecar lifecycle, port conflict behavior, privacy logging, macOS follow-up, and unresolved caveats.
  - Verification commands: `rg -n "Windows x64|macOS|5030|privacy|sidecar|caveat" docs/release/ready-desktop-app.md`
  - Sidecar/privacy/release risk: Medium sidecar relevance; medium privacy relevance; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes for docs, local release evidence still required.

**Checkpoint**: US6 closes the P1 product-readiness path when combined with US1, US2, and US3.

---

## Phase 7: User Story 4 - Use Semantic Analysis And Streaming QA (Priority: P2)

**Goal**: A user configures semantic analysis, manages index readiness, and receives streamed QA answers progressively.

**Independent Test**: Exercise missing provider, rejected provider, index unavailable, index running, index failed, index ready, streaming, stopped, failed, and empty-answer states.

- [ ] T031 [P] [US4] Verify semantic REST and SSE L4 adapters in `src/l4-atom/network/streamQA.ts`
  - Files likely to change: `src/l4-atom/network/fetchSemanticConfig.ts`, `src/l4-atom/network/fetchIndexStatus.ts`, `src/l4-atom/network/manageIndex.ts`, `src/l4-atom/network/streamQA.ts`, `src/l2-coordinator/diplomat/sseParser.ts`
  - Acceptance criteria: Adapters expose semantic config, index readiness, index actions, QA stream chunks, stream errors, cancellation, and empty answer states with redacted payloads.
  - Verification commands: `pnpm test -- src/l2-coordinator/diplomat`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Medium sidecar relevance; high privacy relevance; low release risk.
  - Codex App worktree/cloud: Worktree yes; cloud yes with mocked SSE.

- [ ] T032 [US4] Implement semantic orchestration in `src/l2-coordinator/commander/useAiCommander.ts`
  - Files likely to change: `src/l2-coordinator/commander/useAiCommander.ts`, `src/l2-coordinator/data-clerk/stores/useAiStore.ts`, `src/l2-coordinator/api-docs/semantic.ts`
  - Acceptance criteria: L2 keeps semantic optional, prevents missing provider from blocking core app use, coordinates index readiness, streams partial answers, and cancels safely on stop or route leave.
  - Verification commands: `pnpm test -- src/l2-coordinator`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Low sidecar risk; high privacy relevance if provider credentials exist; medium release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes with mocked providers.

- [ ] T033 [P] [US4] Render semantic config, index, and QA states in `src/l3-molecule/semantic/AiPanel.tsx`
  - Files likely to change: `src/l3-molecule/semantic/AiPanel.tsx`, `src/l3-molecule/semantic/SetupWizard.tsx`, `src/l3-molecule/semantic/QAPanel.tsx`, `src/l3-molecule/semantic/QAInput.tsx`, `src/l3-molecule/semantic/QAMessage.tsx`
  - Acceptance criteria: UI distinguishes missing config, validating, ready, unavailable index, running index, failed index, streaming, stopped, failed, empty, and completed answer states.
  - Verification commands: `pnpm lint`; `pnpm typecheck`; `pnpm build`
  - Sidecar/privacy/release risk: No sidecar risk; high privacy relevance for questions and answers; low release risk.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T034 [US4] Wire semantic navigation without blocking other workflows in `src/l1-entry/pages/WorkbenchView.tsx`
  - Files likely to change: `src/l1-entry/pages/WorkbenchView.tsx`, `src/l3-molecule/workbench/WorkbenchFrame.tsx`, `src/l2-coordinator/commander/useWorkbenchCommander.ts`
  - Acceptance criteria: Semantic area can be opened or left while dashboard, browse, and search remain usable when semantic provider configuration is missing.
  - Verification commands: `pnpm test -- src/l2-coordinator/commander/workbenchViewModel.test.ts`; `pnpm lint`; `pnpm typecheck`
  - Sidecar/privacy/release risk: No sidecar risk; medium privacy relevance; low release risk.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

**Checkpoint**: US4 is independently usable after P1 base flows exist.

---

## Phase 8: User Story 5 - Explore Graph MVP (Priority: P2)

**Goal**: A user opens a graph view, loads relationship data, inspects nodes or relations, and avoids UI freezes on empty, failed, malformed, or oversized graph data.

**Independent Test**: Load available graph data, no graph data, failed graph load, malformed data, and oversized data.

- [ ] T035 [P] [US5] Verify graph L4 adapters in `src/l4-atom/network/fetchGraphVisualize.ts`
  - Files likely to change: `src/l4-atom/network/fetchGraphStatus.ts`, `src/l4-atom/network/fetchGraphQuery.ts`, `src/l4-atom/network/fetchGraphVisualize.ts`, `src/l2-coordinator/api-docs/graph.ts`
  - Acceptance criteria: Adapters classify available, empty, failed, malformed, and oversized graph responses with redacted labels where needed.
  - Verification commands: `pnpm test -- src/l4-atom/network`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Low sidecar risk; medium privacy relevance; low release risk.
  - Codex App worktree/cloud: Worktree yes; cloud yes with mocked HTTP.

- [ ] T036 [US5] Implement graph orchestration and bounds in `src/l2-coordinator/commander/useGraphCommander.ts`
  - Files likely to change: `src/l2-coordinator/commander/useGraphCommander.ts`, `src/l2-coordinator/data-clerk/stores/useGraphStore.ts`
  - Acceptance criteria: L2 tracks graph loading, empty, error, oversized, loaded, selected node, selected relation, retry, and cancel states.
  - Verification commands: `pnpm test -- src/l2-coordinator`; `pnpm typecheck`
  - Sidecar/privacy/release risk: Low sidecar risk; medium privacy relevance; medium release relevance because freezes affect product readiness.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T037 [P] [US5] Render bounded graph MVP states in `src/l3-molecule/graph/GraphModule.tsx`
  - Files likely to change: `src/l3-molecule/graph/GraphModule.tsx`, `src/l3-molecule/graph/GraphCanvas.tsx`, `src/l3-molecule/graph/GraphTooltip.tsx`, `src/l3-molecule/graph/GraphControlBar.tsx`, `src/l3-molecule/graph/GraphLabels.tsx`
  - Acceptance criteria: Graph renders inspectable node or relation data, empty state, failure state, oversized state, and privacy-masked labels while keeping controls responsive.
  - Verification commands: `pnpm lint`; `pnpm typecheck`; `pnpm build`
  - Sidecar/privacy/release risk: No sidecar risk; medium privacy relevance; medium release relevance due to UI freeze risk.
  - Codex App worktree/cloud: Worktree yes; cloud partial because final canvas interaction should be checked in a local browser/app.

- [ ] T038 [US5] Wire graph view and fallback states in `src/l1-entry/pages/WorkbenchView.tsx`
  - Files likely to change: `src/l1-entry/pages/WorkbenchView.tsx`, `src/l3-molecule/workbench/WorkbenchRail.tsx`, `src/l3-molecule/workbench/WorkbenchFrame.tsx`
  - Acceptance criteria: Graph navigation opens the graph MVP, exposes retry and recovery states, and does not hide dashboard, browse, search, or semantic routes.
  - Verification commands: `pnpm test -- src/l3-molecule/workbench/workbenchLayout.test.ts`; `pnpm lint`; `pnpm typecheck`
  - Sidecar/privacy/release risk: No sidecar risk; low privacy risk; low release risk.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

**Checkpoint**: US5 can be verified independently with mocked graph payloads and local UI smoke.

---

## Final Phase: Polish & Cross-Cutting Release Gate

**Purpose**: Confirm the product satisfies the constitution, quickstart, packaging, privacy, and architecture constraints.

- [ ] T039 Run architecture boundary audit and record result in `specs/001-ready-desktop-app/architecture-boundary-check.md`
  - Files likely to change: `specs/001-ready-desktop-app/architecture-boundary-check.md`
  - Acceptance criteria: Audit records no direct L1/L3 network calls, no L4 atom cross-coupling, and L2 ownership for orchestration and error translation.
  - Verification commands: `rg -n "fetch\\(|http|invoke\\(" src/l1-entry src/l3-molecule`; `rg -n "from .*l4-atom/network" src/l3-molecule src/l1-entry`
  - Sidecar/privacy/release risk: Medium sidecar relevance; medium privacy relevance; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes.

- [ ] T040 Run privacy and diagnostics audit in `specs/001-ready-desktop-app/release-evidence.md`
  - Files likely to change: `specs/001-ready-desktop-app/release-evidence.md`
  - Acceptance criteria: Evidence records zero raw data keys, provider credentials, tokens, private message bodies, unredacted identities, and sensitive local paths in logs, diagnostics, screenshots, fixtures, and release notes.
  - Verification commands: `rg -n "dataKey|token|api[_-]?key|secret|credential" src specs docs`; manual review of generated diagnostic package if available.
  - Sidecar/privacy/release risk: Low sidecar risk; high privacy relevance; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud partial because generated diagnostics need local verification.

- [x] T041 Run full frontend verification and record result in `specs/001-ready-desktop-app/release-evidence.md`
  - Files likely to change: `specs/001-ready-desktop-app/release-evidence.md`
  - Acceptance criteria: Evidence includes fresh passing output or documented blockers for `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm verify`.
  - Verification commands: `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm build`; `pnpm verify`
  - Sidecar/privacy/release risk: Low sidecar risk; medium privacy relevance through test fixtures; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud yes if dependencies are available.

- [ ] T042 Run Tauri packaging and Windows x64 smoke evidence in `specs/001-ready-desktop-app/release-evidence.md`
  - Files likely to change: `specs/001-ready-desktop-app/release-evidence.md`, `docs/release/ready-desktop-app.md`
  - Acceptance criteria: Evidence covers `cargo test`, `pnpm tauri build`, Windows x64 install, launch, quit, reopen, sidecar cleanup, port conflict, and documented macOS follow-up caveats.
  - Verification commands: `Push-Location src-tauri; cargo test; Pop-Location`; `pnpm tauri build`; manual Windows x64 smoke from `specs/001-ready-desktop-app/quickstart.md`
  - Sidecar/privacy/release risk: High sidecar relevance; medium privacy relevance; high release relevance.
  - Codex App worktree/cloud: Worktree yes; cloud no for final installer smoke because it requires local Windows/Tauri environment and sidecar binary.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks all user story work.
- **US1 Launch MVP**: Depends on Phase 2.
- **US2 Dashboard/Browse**: Depends on Phase 2 and can run after or alongside US1 once backend readiness contracts are stable.
- **US3 Search**: Depends on Phase 2 and can run after or alongside US2.
- **US6 Settings/Privacy/Release**: Depends on Phase 2; release packaging tasks depend on US1 sidecar lifecycle being stable.
- **US4 Semantic**: Depends on Phase 2 and benefits from US6 settings privacy controls.
- **US5 Graph**: Depends on Phase 2 and can run independently of semantic once graph contracts are stable.
- **Final Phase**: Depends on all selected story phases for the release scope.

### User Story Dependencies

- **US1 (P1)**: MVP, no story dependency after foundation.
- **US2 (P1)**: Requires backend/data readiness from foundation; independently testable with mocked or prepared data.
- **US3 (P1)**: Requires backend/data readiness from foundation; independently testable with mocked search responses.
- **US6 (P1)**: Can start after foundation; packaging verification depends on US1 sidecar lifecycle.
- **US4 (P2)**: Requires semantic settings and privacy handling; core app must remain usable without provider config.
- **US5 (P2)**: Requires graph API contracts and bounded UI rendering; independent of semantic.

## Parallel Execution Examples

### Setup And Foundation

```text
T002 test data policy and T003 release evidence template can run together.
T005 redaction helper, T006 backend contract types, and T007 readiness UI can run together.
T004 readiness types should land before L2 story orchestration tasks.
```

### US1 Launch

```text
T010 Rust sidecar lifecycle and T011 data detection can run in separate worktrees.
T012 L4 system atoms can run while T010/T011 are in progress using mocked command shapes.
T013 L2 orchestration should integrate after T010-T012 contracts settle.
```

### US2 Dashboard/Browse

```text
T016 L4 adapters and T019 stats rendering can run together.
T017 dashboard orchestration and T018 chat orchestration should use the shared readiness model from T004.
T020 chat rendering should integrate after T018 state shape is stable.
```

### US3 Search

```text
T021 search adapter and T023 search UI states can run together.
T022 search orchestration should integrate adapter outcomes before T024 result navigation.
```

### US6 Settings/Privacy/Release

```text
T026 privacy display helpers and T028 settings UI can run together.
T027 diagnostics and T029 packaging should be separate worktrees because both may touch Tauri-sensitive behavior.
T030 release docs can run after T027/T029 define final behavior.
```

### US4 Semantic

```text
T031 semantic adapters and T033 semantic UI can run together with mocked states.
T032 orchestration integrates stream cancellation and optional provider behavior before T034 navigation.
```

### US5 Graph

```text
T035 graph adapters and T037 graph UI can run together with synthetic payloads.
T036 orchestration should land before T038 final workbench wiring.
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1 Launch Without Terminal).
3. Validate US1 independently with no-terminal launch and sidecar readiness evidence.

### Product-Ready P1 Slice

1. Complete US1, US2, US3, and US6.
2. Run frontend verification, Rust/Tauri verification, and Windows x64 smoke evidence.
3. Stop before P2 if any P1 launch, browsing, search, privacy, sidecar, or packaging blocker remains.

### P2 Increment

1. Complete US4 semantic features without blocking core local workflows.
2. Complete US5 graph MVP with bounded rendering and recoverable states.
3. Re-run privacy, architecture, and release evidence checks.

## Notes

- Tasks marked [P] can be implemented in parallel when assigned to separate worktrees.
- Every implementation task must preserve L1/L2/L3/L4 ownership.
- All UI-facing work must cover loading, empty, error, and success states where applicable.
- Never commit real WeChat data, sidecar binaries, `.env` files, logs, build output, or fixtures containing private messages.
- Use local Windows validation for final Tauri packaging and sidecar lifecycle claims.

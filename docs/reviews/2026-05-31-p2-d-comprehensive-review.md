# P2-D Comprehensive Review Record

Date: 2026-05-31
Branch observed: `codex/p2-d-ai-graph-containment`
Review scope: current P2-D code, P2-D plan and progress records, `AGENTS.md`, `开发指南.md`, `docs/总体开发规划.md`, `.specify/memory/constitution.md`, `specs/001-ready-desktop-app/*`, release evidence, and the local `chatlog_alpha` semantic/graph HTTP implementation.

## Verdict

P2-D has useful partial work, but it cannot be marked as satisfying all stage, project, UI, architecture, privacy, and release requirements.

The main reason is not that the command matrix is absent. The current records show frontend verification, Rust tests, Tauri packaging, and browser smoke were run during P2-D. The blocker is that several important checks were performed against frontend assumptions rather than the real `chatlog_alpha` contract, and the visible semantic/graph UI still contains architecture and design debt that conflicts with the project rules.

## Evidence Summary

- Existing P2-D records report `pnpm verify` passed, including lint, typecheck, tests, and build with 56 test files and 315 tests.
- Existing P2-D records report `cargo test` passed with 17 Rust tests.
- Existing P2-D records report `pnpm tauri build` passed and produced Windows MSI/NSIS artifacts.
- The build evidence still reports a large explicit graph visualization chunk: `GraphCanvas-CWoiW_I8.js` at 1,034.88 kB.
- Release evidence still marks install, launch, quit, reopen, and unknown `5030` port conflict smoke as not run.
- A fresh code inspection found semantic adapter fixtures that do not match `chatlog_alpha` search/profile responses, graph and semantic leaf components that still read L2 stores/commanders directly, and visible controls that still use raw inline styling and very small hit targets.

## Findings

### R1 - Semantic Search Adapter Does Not Match `chatlog_alpha`

Severity: P2-D functional blocker.

Evidence:
- Frontend adapter maps each search hit from `result.chat`, `result.sender`, `result.time`, and `result.local_id` in `src/l4-atom/network/semanticAdapters.ts:296-301`.
- Frontend response adapter reads top-level `rerank_enabled` and `rerank_provider` in `src/l4-atom/network/semanticAdapters.ts:311-314`.
- Current frontend test fixture uses the same frontend-shaped fields in `src/l4-atom/network/semanticAdapters.test.ts:166-181`.
- Real backend search hit fields are `talker`, `talker_name`, `sender`, `sender_name`, `seq`, `time`, `content`, `score`, and rerank fields in `E:/OneDrive - Default Directory/chatlog_alpha/internal/chatlog/semantic/manager.go:36-53`.
- Real backend search response returns `rerank`, `rerank_tried`, `rerank_applied`, and `rerank_error` in `E:/OneDrive - Default Directory/chatlog_alpha/internal/chatlog/http/route.go:508-519`.
- `SemanticSearch` displays `searchResults.totalCount` in `src/l3-molecule/semantic/SemanticSearch.tsx:84`, but the adapter returns `count` without a `totalCount` alias.

Impact:
- Real search hits can lose the conversation id because `talker` is not mapped into `chat`.
- Sender display can fall back to a raw id or blank because `sender_name` is ignored.
- Numeric backend timestamps can render as blank or invalid text because the adapter treats `time` as a string.
- Rerank status can be shown incorrectly because the backend does not return the current `rerank_enabled` shape.
- Existing tests pass against the wrong fixture shape, so they do not protect the actual sidecar contract.

Required outcome:
- Adapter tests must use real backend-shaped fixtures.
- `adaptSemanticSearch()` must map `talker` to the UI conversation id, prefer `talker_name` and `sender_name` for display, normalize numeric timestamps, map `seq` to local id, and expose count/rerank fields that the UI consumes consistently.

### R2 - Semantic Profile Adapter And Profile UI Do Not Match Real Profile Rows

Severity: P2-D functional/UI blocker.

Evidence:
- Real backend profile rows include `sender`, `sender_name`, `messages`, and `top_keywords` in `E:/OneDrive - Default Directory/chatlog_alpha/internal/chatlog/http/route.go:680-750`.
- Real backend `type_distribution` is an array of `{ type, count }`, not a record, in `E:/OneDrive - Default Directory/chatlog_alpha/internal/chatlog/http/route.go:737-748`.
- Frontend adapter treats `type_distribution` as a record in `src/l4-atom/network/semanticAdapters.ts:351`.
- Frontend adapter copies raw profile objects without a typed row model in `src/l4-atom/network/semanticAdapters.ts:359`.
- Current profile test uses fake `traits` and record-shaped `type_distribution` in `src/l4-atom/network/semanticAdapters.test.ts:221-245`.
- `ContactProfile` renders old fields such as `activeHours`, `dailyFrequency`, and `mainTopics` in `src/l3-molecule/semantic/ContactProfile.tsx:30-56`.

Impact:
- Real profile rows can render almost no useful content beyond a summary.
- Type distribution can be discarded or misrepresented.
- Existing tests validate a schema the sidecar does not return.

Required outcome:
- Profile adapter tests must use backend-shaped rows.
- The adapter must normalize `type_distribution` arrays and typed profile rows.
- `ContactProfile` must render sender display name, message count, top keywords, summary, empty state, and error state from the normalized view model.

### R3 - Semantic Module State Coverage Is Incomplete

Severity: P2-D UX and productization blocker.

Evidence:
- `useAiCommander.initialize()` handles `ready`, `building`, and `running`, then falls back to `index_not_built` in `src/l2-coordinator/commander/useAiCommander.ts:81-88`.
- Error paths write a shared store error in `src/l2-coordinator/commander/useAiCommander.ts:98-123` and `src/l2-coordinator/commander/useAiCommander.ts:249`.
- `AiPanel` still branches the main content by `ai.phase` for setup/index states in `src/l3-molecule/semantic/AiPanel.tsx:141-231`, even though `useAiCommander` derives `moduleView`.
- `SemanticSearch` does not render an explicit local empty or retry state and only shows the result count line in `src/l3-molecule/semantic/SemanticSearch.tsx:81-94`.
- `ContactProfile` returns `null` when no profile exists in `src/l3-molecule/semantic/ContactProfile.tsx:26`.

Impact:
- Backend states such as paused, unavailable, failed, and search/profile errors can collapse into misleading setup states.
- Users can see an empty area instead of an actionable empty/error state.
- This conflicts with the constitution rule that every user-visible flow must have loading, empty, error, success, and recovery states.

Required outcome:
- The semantic UI should render from a single L2 view model that includes unavailable, not configured, not indexed, building/running, paused, ready, failed, loading, empty, and retryable error states.
- Search/topics/profile should have local empty/error/retry affordances instead of relying only on a global error string.

### R4 - Architecture Boundaries Remain Blurred

Severity: Project architecture blocker before claiming full compliance.

Evidence:
- Constitution layer rules are explicit in `.specify/memory/constitution.md:61-68`: L1 delegates, L2 orchestrates, L3 receives data/callbacks, and L4 atoms remain independent.
- L4 system atoms import L2 types in `src/l4-atom/system/sidecarManager.ts:2` and `src/l4-atom/system/chatlogConfig.ts:2`.
- Graph leaf components still import L2 commander/store directly:
  - `src/l3-molecule/graph/GraphCanvas.tsx:6-17`
  - `src/l3-molecule/graph/GraphControlBar.tsx:2-22`
  - `src/l3-molecule/graph/GraphEngine.tsx:10` and `src/l3-molecule/graph/GraphEngine.tsx:122-126`
  - `src/l3-molecule/graph/GraphTimeline.tsx:1-29`
  - `src/l3-molecule/graph/GraphTooltip.tsx:1-23`
  - `src/l3-molecule/graph/GraphNode3D.tsx:3-39`
- Semantic leaf components still import L2 commander/store directly:
  - `src/l3-molecule/semantic/SemanticSearch.tsx:5-13`
  - `src/l3-molecule/semantic/ContactProfile.tsx:2-8`
  - `src/l3-molecule/semantic/TopicView.tsx:2-8`
  - `src/l3-molecule/semantic/QAPanel.tsx:4-11`
  - `src/l3-molecule/semantic/QAMessage.tsx:4-13`

Impact:
- L3 components are not presentational units and are harder to test with plain props.
- L4 system atoms are not independent because they depend upward on L2 type definitions.
- The current architecture checklist understates this debt if it only accepts module roots as the boundary.

Required outcome:
- L4 system raw DTOs must be local to L4 or a neutral shared contract and mapped by L2.
- L3 leaf components should receive view data and callbacks from module roots, with L2 access centralized in the module root or L1/L2 coordinator.
- The architecture checklist must record the remaining allowed exceptions by file and the planned removal point.

### R5 - Visible Semantic/Graph UI Is Not Yet Consistent With The Project Design System

Severity: UI quality blocker for P2-D acceptance.

Evidence:
- `AiPanel` tabs use raw inline styles and hard-coded `#007AFF` in `src/l3-molecule/semantic/AiPanel.tsx:102-133`.
- `SetupWizard` uses hard-coded step bar/provider-card styles and `#007AFF` in `src/l3-molecule/semantic/SetupWizard.tsx:117-167`.
- `SetupWizard` starts connection testing and immediately advances to the next step with `handleTest(); setStep(3);` in `src/l3-molecule/semantic/SetupWizard.tsx:244`.
- `GraphControlBar` uses 11px text and 30-50px compact controls in `src/l3-molecule/graph/GraphControlBar.tsx:55-155`.
- `GraphTimeline` uses a 24px close button and 11px metadata text in `src/l3-molecule/graph/GraphTimeline.tsx:63-104`.

Impact:
- AI and graph controls do not look or feel unified with the P2-B/P2-C tokenized desktop UI.
- Tiny graph controls are difficult to use and violate the project guidance for stable, predictable controls.
- The setup wizard can show the user a success step before the async connection test has finished.

Required outcome:
- Tabs, segmented controls, graph controls, setup stepper, and provider cards must use the existing button/status/token system or a new shared primitive.
- The setup wizard must await connection-test completion before advancing and must show failure inline.
- Desktop and 390px screenshots must show no overlapping text, no clipped controls, and no page-level horizontal overflow.

### R6 - Productization And Release Evidence Is Still Incomplete

Severity: Release blocker.

Evidence:
- `specs/001-ready-desktop-app/tasks.md:361-382` still leaves T039, T040, and T042 unchecked.
- `specs/001-ready-desktop-app/release-evidence.md:24-28` marks install, launch, quit, reopen, and port conflict as not run.
- `docs/release/ready-desktop-app.md:15-30` still lists manual install, quit, reopen, port-conflict, and full privacy log audit evidence as pending.

Impact:
- P2-D can be considered an implementation stage, but not release-ready.
- Passing automated build and packaging does not prove the installed desktop app starts without a terminal, owns its sidecar, cleans up on quit, restores state on reopen, or handles an occupied `5030` port.

Required outcome:
- T039/T040/T042 must remain open until the architecture audit, privacy/diagnostics audit, and Windows x64 manual smoke are recorded.
- P2-D completion wording must distinguish automated build evidence from release readiness.

### R7 - Graph Visualization Chunk Remains A Performance Risk

Severity: UX/performance risk.

Evidence:
- Existing P2-D build evidence records `GraphCanvas-CWoiW_I8.js` at 1,034.88 kB, gzip 292.95 kB.
- `specs/001-ready-desktop-app/release-evidence.md:62` states the lazy `GraphCanvas` chunk is still larger than 500 kB.
- `docs/release/ready-desktop-app.md:29` records the same Vite warning.

Impact:
- Lazy loading prevents this from blocking the default workbench, but the first explicit graph visualization can still feel delayed.
- Current evidence proves containment, not performance acceptability.

Required outcome:
- Keep the default graph path canvas-free.
- Add browser evidence for the explicit visualization loading state, nonblank canvas, and 390px drawer behavior.
- Track chunk-size reduction or loading feedback as a follow-up release-risk item.

## Positive Coverage

- P2-D did move semantic and graph work into a clearer workbench module direction.
- Existing evidence indicates major automated commands were run during implementation.
- The graph default path is documented as separate from the explicit 3D visualization path.
- Manual release smoke was not incorrectly marked complete in T039/T040/T042.

## Decision

Do not claim P2-D is fully complete until the remediation plan in `docs/superpowers/plans/2026-05-31-p2-d-comprehensive-remediation.md` is executed and verified.

The immediate correction is to add real backend-shaped tests for semantic search/profile, fix the adapters and UI states, remove the clearest L4-upward and L3-leaf boundary violations, polish the visible semantic/graph controls, then update release evidence without marking manual smoke as complete unless it has actually been run.

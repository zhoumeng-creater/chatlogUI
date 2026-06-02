# P2-D AI And Graph Containment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn semantic AI and graph from legacy demo-style surfaces into contained, optional, contract-correct workbench modules that do not block chat browsing, search, statistics, settings, diagnostics, or release readiness.

**Architecture:** P2-D builds on P2-A/P2-B/P2-C. L1 remains route/layout composition only. L2 commanders own semantic and graph orchestration, cancellation, state normalization, error classification, and cross-module navigation. L3 module roots render L2 view models and pass props to leaf components. L4 network atoms perform raw HTTP/SSE calls against `chatlog_alpha` and adapt raw DTOs through tested parser helpers. No P2-D task may change the sidecar contract.

**Tech Stack:** React 18, TypeScript 5, Zustand, Vitest, Vite, Tauri v2, Tailwind CSS v4/project CSS tokens, lucide-react, existing `Button/IconButton/Surface/StatusIndicator/Tooltip` primitives, Three.js/React Three Fiber only inside the on-demand graph visualization path.

---

## 1. Current Baseline

P2-D starts after:

- P2-A introduced the tokenized shell, `Button`, `IconButton`, `Surface`, `StatusIndicator`, `WorkbenchFrame`, and initial semantic/graph module entries.
- P2-B polished core chat/search/stats, added privacy masking, transcript virtualization, measured stats fallback, canonical dev port `5173/5174`, release evidence files, and an installable Tauri build path.
- Code review remediation removed the old Graph floating overlay from L1 and moved graph into a lazy `GraphModule` workbench inspector path.
- P2-C polished settings, diagnostics, readiness/status taxonomy, redaction, user-triggered diagnostic export, and honest AI credential display in Settings.

Current residual debt relevant to P2-D:

- `specs/001-ready-desktop-app/tasks.md` still has T031-T038 unchecked for semantic and graph readiness.
- `docs/reviews/2026-05-30-p2-b-comprehensive-review.md` still records semantic/graph legacy UI and `GraphModule` chunk warning as later-stage debt.
- `specs/001-ready-desktop-app/release-evidence.md` accepts the current semantic/graph legacy caveat until graph route splitting and module containment are addressed.
- `specs/000-productization/*` does not exist in the repository. P2-D uses `.specify/memory/constitution.md`, `specs/001-ready-desktop-app/*`, `docs/release/ready-desktop-app.md`, the P2 master plan, P2-B review/remediation, P2-C plan/evidence, and current source code as the source of truth.

## 2. P2-D Scope

P2-D includes:

- Correct semantic REST and SSE adapters against the actual `chatlog_alpha` contract.
- Correct graph REST adapters against the actual `chatlog_alpha` contract.
- Optional semantic behavior: missing provider/index readiness limits semantic features only and must not block browse/search/stats.
- Cancellable semantic QA streaming with explicit `connecting`, `streaming`, `completed`, `stopped`, `failed`, and `empty` states.
- Semantic setup/index/search/QA UI rendered through current design-system primitives and honest provider/index wording.
- Graph module states for `loading`, `empty`, `loaded`, `error`, `malformed`, `oversized`, and `cancelled`.
- Graph summary/table fallback that remains usable without loading Three.js.
- On-demand graph visualization so the heavy 3D canvas path loads only after the user chooses visualization.
- Privacy masking for semantic search snippets, QA evidence labels, topic/profile summaries, graph node labels, graph tooltips, and graph timeline rows.
- Workbench navigation that keeps chat, search, stats, semantic, and graph recoverable without hiding the main workflow.
- Productization evidence updates for T031-T038 only after implementation and verification.

P2-D does not include:

- New backend endpoints or sidecar behavior changes.
- New remote telemetry, automatic diagnostic uploads, or provider calls not explicitly initiated by the user.
- Full P3 semantic feature expansion beyond contract correction, state handling, and contained UI.
- Full graph AI QA expansion beyond bounded graph status/query/visualize productization.
- Windows installer manual smoke completion, quit/reopen evidence, or release-signing decisions. Those remain P2-E/release gate.
- Removing the `AppleButton` export itself. P2-D must remove visible semantic/graph usage, but compatibility exports can remain until a later cleanup.

## 3. Contract Corrections

The current UI must be aligned to the real local sidecar behavior.

Semantic REST:

- `GET /api/v1/semantic/config` returns a flat snake_case object. It does not return `{ config: ... }`.
- Config response includes exact fields such as `enabled`, `base_url`, `ollama_base_url`, `deepseek_base_url`, `embedding_provider`, `rerank_provider`, `chat_provider`, `embedding_model`, `rerank_model`, `chat_model`, `chat_thinking`, `chat_max_tokens`, `chat_temperature`, `embedding_dimension`, `enable_rerank`, `enable_qa`, `enable_topics`, `enable_profiles`, `enable_llm_chunk`, `realtime_index`, `index_workers`, `recall_k`, `top_n`, and `similarity_threshold`.
- Config response includes `has_api_key` and `has_deepseek_api_key`; `api_key` and `deepseek_api_key` are returned as empty strings and raw saved keys are not echoed.
- `POST /api/v1/semantic/config` accepts snake_case fields. Empty `api_key` and `deepseek_api_key` preserve saved keys.
- Semantic configuration is not one single provider. Embedding, rerank, and chat providers can differ and must not be collapsed into a single UI/backend `provider` field.
- `POST /api/v1/semantic/test` returns `{ ok: true }` or `{ ok: false, error: string }`, not `{ success, message }`.
- `GET /api/v1/semantic/index/status` returns readiness fields such as `ready`, `running`, `paused`, `processed`, `pending`, `failed`, `progress_pct`, and `last_error`.
- `POST /api/v1/semantic/index/rebuild|pause|resume|clear` returns `{ ok, accepted?, status }`.
- `GET /api/v1/semantic/search` returns `{ query, chat, source_count, window, depth, count, rerank_*, results }`.
- `GET /api/v1/semantic/topics` returns `window`, `window_label`, `from`, `to`, `count`, `truncated`, `topics`, `daily`, `summary`, and `summary_error`.
- `GET /api/v1/semantic/profiles` returns `window`, `window_label`, `from`, `to`, `count`, `truncated`, `profiles`, `type_distribution`, `summary`, and `summary_error`.
- `POST /api/v1/semantic/qa` accepts `query`, `chat`, `chats`, `window`, `entity_override`, `retrieval_depth`, `source_limit`, `top_n`, and `history`.
- Semantic REST calls must use the existing JSON helper path so `format=json` is present and error bodies are normalized.

Semantic SSE:

- `POST /api/v1/semantic/qa/stream` emits SSE events with event names.
- `event: delta` carries `data: {"text":"..."}`.
- `event: done` carries final QA data including `answer`, `evidence`, `reason`, and metadata.
- `event: error` carries `data: {"error":"..."}`.
- The parser must read `event:` and `data:` lines incrementally and handle chunks split across network reads.
- Cancellation must abort the request and leave the store in `stopped` or `cancelled`, not `failed`.

Graph REST:

- `GET /api/v1/graph/status` returns status fields such as `enabled`, `paused`, `running`, entity/relation/event/fact/source counts, `pending`, `processing`, `processed`, `failed`, `progress_pct`, and `last_error`.
- `GET /api/v1/graph/visualize` accepts `keyword`, `window`, `start`, `end`, and `limit`; `limit` is capped by the backend at 300.
- `GET /api/v1/graph/query` accepts `keyword`, `entity`, `relation`, `window`, `start`, `end`, and `limit`.
- `GET /api/v1/graph/timeline` is available for timeline rows.
- `POST /api/v1/graph/rebuild|pause|resume` returns `{ ok, accepted?, status }`.
- `GET /api/v1/graph/config` and `POST /api/v1/graph/config` exist for worker counts, but P2-D should only implement them if needed for status/action recovery; graph configuration UI is not part of this containment phase.
- Graph REST calls must use `format=json` and must classify malformed payloads before they reach rendering code.

## 4. File Structure

Create:

- `src/l4-atom/network/semanticAdapters.ts`
- `src/l4-atom/network/semanticAdapters.test.ts`
- `src/l4-atom/network/graphAdapters.ts`
- `src/l4-atom/network/graphAdapters.test.ts`
- `src/l4-atom/network/fetchGraphTimeline.ts`
- `src/l4-atom/network/manageGraph.ts`
- `src/l2-coordinator/commander/semanticViewModel.ts`
- `src/l2-coordinator/commander/semanticViewModel.test.ts`
- `src/l2-coordinator/commander/graphViewModel.ts`
- `src/l2-coordinator/commander/graphViewModel.test.ts`
- `src/l3-molecule/semantic/AiModuleView.tsx`
- `src/l3-molecule/semantic/semanticDisplay.ts`
- `src/l3-molecule/semantic/semanticDisplay.test.ts`
- `src/l3-molecule/graph/GraphModuleView.tsx`
- `src/l3-molecule/graph/GraphSummaryPanel.tsx`
- `src/l3-molecule/graph/GraphFallbackTable.tsx`
- `src/l3-molecule/graph/GraphVisualizePanel.tsx`
- `src/l3-molecule/graph/graphDisplay.ts`
- `src/l3-molecule/graph/graphDisplay.test.ts`

Modify:

- `src/l2-coordinator/api-docs/semantic.ts`
- `src/l2-coordinator/api-docs/graph.ts`
- `src/l2-coordinator/diplomat/sseParser.ts`
- `src/l2-coordinator/diplomat/sseParser.test.ts`
- `src/l2-coordinator/commander/useAiCommander.ts`
- `src/l2-coordinator/commander/useGraphCommander.ts`
- `src/l2-coordinator/commander/useWorkbenchCommander.ts`
- `src/l2-coordinator/data-clerk/stores/useAiStore.ts`
- `src/l2-coordinator/data-clerk/stores/useGraphStore.ts`
- `src/l1-entry/pages/WorkbenchView.tsx`
- `src/l3-molecule/common/StatusBar.tsx`
- `src/l4-atom/network/fetchSemanticConfig.ts`
- `src/l4-atom/network/fetchIndexStatus.ts`
- `src/l4-atom/network/fetchSemanticSearch.ts`
- `src/l4-atom/network/fetchSemanticTopics.ts`
- `src/l4-atom/network/fetchSemanticProfiles.ts`
- `src/l4-atom/network/fetchSemanticQA.ts`
- `src/l4-atom/network/manageIndex.ts`
- `src/l4-atom/network/streamQA.ts`
- `src/l4-atom/network/testLLMConnection.ts`
- `src/l4-atom/network/fetchGraphStatus.ts`
- `src/l4-atom/network/fetchGraphQuery.ts`
- `src/l4-atom/network/fetchGraphVisualize.ts`
- `src/l4-atom/network/index.ts`
- `src/l3-molecule/semantic/AiPanel.tsx`
- `src/l3-molecule/semantic/SetupWizard.tsx`
- `src/l3-molecule/semantic/QAPanel.tsx`
- `src/l3-molecule/semantic/QAInput.tsx`
- `src/l3-molecule/semantic/QAMessage.tsx`
- `src/l3-molecule/semantic/SemanticSearch.tsx`
- `src/l3-molecule/semantic/TopicView.tsx`
- `src/l3-molecule/semantic/ContactProfile.tsx`
- `src/l3-molecule/graph/GraphModule.tsx`
- `src/l3-molecule/graph/GraphCanvas.tsx`
- `src/l3-molecule/graph/GraphControlBar.tsx`
- `src/l3-molecule/graph/GraphEngine.tsx`
- `src/l3-molecule/graph/GraphLabels.tsx`
- `src/l3-molecule/graph/GraphTimeline.tsx`
- `src/l3-molecule/graph/GraphTooltip.tsx`
- `src/styles/workbench-content.css`
- `src/styles/layout.css`
- `specs/001-ready-desktop-app/tasks.md`
- `specs/001-ready-desktop-app/release-evidence.md`
- `specs/001-ready-desktop-app/architecture-boundary-check.md`
- `docs/release/ready-desktop-app.md`
- `task_plan.md`, `findings.md`, `progress.md`

## 5. Task D0: Baseline And Inventory

**Files:**
- Modify: `progress.md`
- Modify: `findings.md`

- [ ] **Step 1: Confirm branch and existing worktree state**

Run:

```powershell
git status --short --branch
```

Expected starting point for this planning branch:

```text
## codex/p2-c-settings-diagnostics-planning
```

The worktree currently contains P2-C implementation files and planning files. Do not revert them. If implementing P2-D in a separate session, either continue on a clearly named `codex/p2-d-ai-graph-containment` branch after preserving P2-C changes, or create an isolated worktree only after confirming the current dirty state will not be lost.

- [ ] **Step 2: Record active source documents**

Read before editing code:

- `AGENTS.md`
- `开发指南.md`
- `docs/总体开发规划.md`
- `docs/ui-functional-audit-and-redesign-plan.md`
- `.specify/memory/constitution.md`
- `specs/001-ready-desktop-app/spec.md`
- `specs/001-ready-desktop-app/plan.md`
- `specs/001-ready-desktop-app/data-model.md`
- `specs/001-ready-desktop-app/tasks.md`
- `specs/001-ready-desktop-app/quickstart.md`
- `specs/001-ready-desktop-app/contracts/app-readiness.md`
- `specs/001-ready-desktop-app/contracts/local-backend.md`
- `specs/001-ready-desktop-app/contracts/diagnostics-package.md`
- `specs/001-ready-desktop-app/release-evidence.md`
- `specs/001-ready-desktop-app/architecture-boundary-check.md`
- `docs/release/ready-desktop-app.md`
- `docs/superpowers/plans/2026-05-29-p2-apple-like-ui-system-refactor.md`
- `docs/superpowers/plans/2026-05-29-p2-b-core-workbench-polish.md`
- `docs/superpowers/plans/2026-05-30-p2-c-settings-diagnostics-polish.md`
- `docs/reviews/2026-05-30-p2-b-comprehensive-review.md`
- `docs/superpowers/plans/2026-05-30-p2-b-comprehensive-remediation.md`
- `docs/Sprint3-AI聊天分析详细规划.md`
- `docs/superpowers/plans/2026-05-28-sprint4-knowledge-graph.md`

- [ ] **Step 3: Capture code inventory**

Run:

```powershell
rg -n "AppleButton|dangerouslySetInnerHTML|streamQA|GraphCanvas|GraphModule|format=json|fetch\\(" src\l1-entry src\l2-coordinator src\l3-molecule src\l4-atom
```

Record remaining semantic/graph hits in `findings.md` before implementation.

## 6. Task D1: Semantic Contract Tests And Adapters

**Files:**
- Create: `src/l4-atom/network/semanticAdapters.ts`
- Create: `src/l4-atom/network/semanticAdapters.test.ts`
- Modify: `src/l2-coordinator/api-docs/semantic.ts`
- Modify: `src/l4-atom/network/fetchSemanticConfig.ts`
- Modify: `src/l4-atom/network/fetchIndexStatus.ts`
- Modify: `src/l4-atom/network/fetchSemanticSearch.ts`
- Modify: `src/l4-atom/network/fetchSemanticTopics.ts`
- Modify: `src/l4-atom/network/fetchSemanticProfiles.ts`
- Modify: `src/l4-atom/network/fetchSemanticQA.ts`
- Modify: `src/l4-atom/network/manageIndex.ts`
- Modify: `src/l4-atom/network/testLLMConnection.ts`

- [ ] **Step 1: Add raw DTO fixtures**

Add tests that cover:

- Flat config with snake_case fields and `has_api_key: true`.
- Config with `api_key: ""` and `deepseek_api_key: ""`, proving raw saved credentials are not echoed.
- Config with no embedding, rerank, or chat provider readiness and no saved keys.
- Config where embedding, rerank, and chat providers differ, proving the adapter does not collapse them into one `provider`.
- Test response `{ ok: true }`.
- Test response `{ ok: false, error: "missing api key" }`.
- Index status with `ready: false`, `running: true`, `paused: false`, `progress_pct: 41.5`.
- Index status with `ready: true`, `running: false`, `processed`, `pending`, `failed`, and `last_error`.
- Search response with `count`, `source_count`, `results`, and rerank metadata.
- Topics response with `window_label`, `count`, `truncated`, `topics`, `daily`, `summary`, and `summary_error`.
- Profiles response with `profiles`, `type_distribution`, `summary`, and `summary_error`.
- QA request builder output for `query`, `chat`, `chats`, `window`, `entity_override`, `retrieval_depth`, `source_limit`, `top_n`, and `history`.

The adapter output should produce UI-safe names such as:

- `SemanticConfigView`
- `SemanticCredentialState`
- `SemanticIndexStatus`
- `SemanticIndexActionResult`
- `SemanticSearchResultSet`
- `SemanticTopicsView`
- `SemanticProfilesView`
- `SemanticQARequestPayload`
- `ConnectionTestResult`

- [ ] **Step 2: Correct TypeScript contracts**

Update `semantic.ts` so it no longer describes the old `{ config }`, `{ success, message }`, or `idle|building|paused|ready|error` assumptions as primary backend shapes.

The exported UI-facing model must support:

- Embedding, rerank, and chat provider readiness independently configured or missing.
- Saved credential present without exposing raw credential.
- Index `idle`, `running`, `paused`, `ready`, `error`, and `unavailable` display states derived from backend flags.
- Search `idle`, `loading`, `empty`, `success`, `error`, and `cancelled` states.
- QA `idle`, `connecting`, `streaming`, `completed`, `stopped`, `failed`, and `empty` states.
- Topic/profile analytics `idle`, `loading`, `empty`, `success`, `error`, and `unavailable` states.

- [ ] **Step 3: Migrate REST atoms to `requestJson`**

Each semantic REST atom must use the existing L4 JSON client path that appends `format=json` and normalizes errors.

Do not hand-roll response parsing in UI components. Raw response conversion must happen in `semanticAdapters.ts`.

- [ ] **Step 4: Add targeted tests**

Run:

```powershell
pnpm test src/l4-atom/network/semanticAdapters.test.ts
pnpm test src/l4-atom/network/httpClient.test.ts
```

Expected result: semantic adapters pass and existing HTTP JSON-format behavior remains unchanged.

## 7. Task D2: SSE Parser And QA Stream State

**Files:**
- Modify: `src/l2-coordinator/diplomat/sseParser.ts`
- Modify: `src/l2-coordinator/diplomat/sseParser.test.ts`
- Modify: `src/l4-atom/network/streamQA.ts`
- Modify: `src/l2-coordinator/api-docs/semantic.ts`
- Modify: `src/l2-coordinator/data-clerk/stores/useAiStore.ts`
- Modify: `src/l2-coordinator/commander/useAiCommander.ts`

- [ ] **Step 1: Test real event-name parsing**

Add tests for:

- `event: delta` plus `data: {"text":"partial"}`.
- `event: done` plus final answer payload.
- `event: error` plus error payload.
- Multiple `data:` lines in one SSE message.
- Network chunks that split in the middle of `event:` or JSON.
- Empty answer with no final `answer`.

- [ ] **Step 2: Implement event-aware parser output**

Represent parser output as:

```ts
type SemanticStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; payload: SemanticQADonePayload }
  | { type: "error"; error: string }
  | { type: "unknown"; event: string; payload: unknown };
```

Unknown events must not crash the stream. They should be ignored by the commander and recorded only as redacted debug metadata when diagnostics are explicitly exported.

- [ ] **Step 3: Add cancellation semantics**

`streamQA` must accept an `AbortSignal` or return a cancel handle owned by L2. `useAiCommander` must expose `stopQAStream()`.

`streamQA` must send the real backend body shape from `SemanticQARequestPayload`: `query`, optional `chat`, optional `chats`, optional `window`, optional `entity_override`, optional `retrieval_depth`, optional `source_limit`, optional `top_n`, and optional `history`. Do not send UI-only `scope` to the backend.

Expected store behavior:

- Asking a question sets `qaStatus` to `connecting`, then `streaming` once the first delta arrives.
- Stop button sets `qaStatus` to `stopped` and aborts the request.
- Route/module leave aborts the request and sets `stopped` unless a final `done` arrived.
- Backend error event sets `failed` with a redacted user-facing message.
- Empty final answer sets `empty`, not `completed`.

- [ ] **Step 4: Verify with targeted tests**

Run:

```powershell
pnpm test src/l2-coordinator/diplomat/sseParser.test.ts
pnpm test src/l2-coordinator/commander/semanticViewModel.test.ts
```

The second command will exist after Task D3. Until then, run the parser tests and the current AI store/commander tests available in the repository.

## 8. Task D3: Semantic Commander And View Model

**Files:**
- Create: `src/l2-coordinator/commander/semanticViewModel.ts`
- Create: `src/l2-coordinator/commander/semanticViewModel.test.ts`
- Modify: `src/l2-coordinator/commander/useAiCommander.ts`
- Modify: `src/l2-coordinator/data-clerk/stores/useAiStore.ts`
- Modify: `src/l2-coordinator/commander/useWorkbenchCommander.ts`
- Modify: `src/l3-molecule/common/StatusBar.tsx`

- [ ] **Step 1: Add view-model tests**

Cover:

- Missing semantic provider produces a semantic-only setup state.
- Missing provider does not change workbench app readiness, selected chat, search status, or stats status.
- Running index shows progress when `progress_pct` is present.
- Paused index shows a resume action.
- Ready index enables semantic search and QA only when provider prerequisites are present.
- Search error is distinct from no results.
- QA stop is distinct from backend failure.
- Compact semantic status maps `running`, `paused`, `ready`, `error`, `unavailable`, and missing config into StatusBar-safe labels without reading raw backend DTO fields in L3.

- [ ] **Step 2: Reduce commander side effects**

`useAiCommander` currently mixes config, index polling, semantic search, topic/profile analysis, QA stream, and current-chat reset logic. P2-D should keep one public hook if that is least disruptive, but split pure view-model derivation into `semanticViewModel.ts`.

Commander responsibilities:

- Initialize semantic status only when the semantic module is opened or when StatusBar requests a compact status.
- Poll index status only while the semantic module is visible or an index action is running.
- Abort QA stream on stop, module leave, or component unmount.
- Prevent duplicate `loadAnalysis()` calls from `TopicView` and `ContactProfile`.
- Never write raw API keys, prompt text, evidence content, or private messages to console logs.

- [ ] **Step 3: Preserve route independence**

Workbench must remain usable when semantic config is missing, index is unavailable, provider test fails, or a stream is stopped. Add tests or assertions around `useWorkbenchCommander` navigation if current test infrastructure permits it.

- [ ] **Step 4: Update compact StatusBar semantic state**

`StatusBar` should receive a compact UI-facing semantic status from L2 or use a tested helper that understands the new `SemanticIndexStatus`. It must not depend on the old `IndexStatusResponse.status === "building"` shape once adapters are in place.

## 9. Task D4: Semantic Module UI Containment

**Files:**
- Create: `src/l3-molecule/semantic/AiModuleView.tsx`
- Create: `src/l3-molecule/semantic/semanticDisplay.ts`
- Create: `src/l3-molecule/semantic/semanticDisplay.test.ts`
- Modify: `src/l3-molecule/semantic/AiPanel.tsx`
- Modify: `src/l3-molecule/semantic/SetupWizard.tsx`
- Modify: `src/l3-molecule/semantic/QAPanel.tsx`
- Modify: `src/l3-molecule/semantic/QAInput.tsx`
- Modify: `src/l3-molecule/semantic/QAMessage.tsx`
- Modify: `src/l3-molecule/semantic/SemanticSearch.tsx`
- Modify: `src/l3-molecule/semantic/TopicView.tsx`
- Modify: `src/l3-molecule/semantic/ContactProfile.tsx`
- Modify: `src/styles/workbench-content.css`
- Modify: `src/styles/layout.css`

- [ ] **Step 1: Replace visible legacy controls**

Remove semantic-visible imports of:

- `AppleButton`
- `framer-motion` for ordinary state transitions
- structural emoji or text icons where lucide icons exist
- `dangerouslySetInnerHTML`

Use:

- `Button`
- `IconButton`
- `Surface`
- `StatusIndicator`
- lucide icons
- stable layout dimensions and tokenized CSS

- [ ] **Step 2: Make the first semantic screen honest**

Semantic module must show one of these clear states:

- Not configured: provider or saved credential missing.
- Index unavailable: backend semantic service not ready.
- Index running: progress, pause action, and non-blocking copy.
- Index paused: resume and rebuild actions.
- Ready: search and QA controls enabled.
- Failed: redacted reason and retry/rebuild actions.

Do not imply full semantic readiness before config and index state support it.

- [ ] **Step 3: Update setup wizard**

The setup wizard must:

- Use form semantics for credential fields.
- Never echo saved credentials.
- Explain that external provider calls are user-configured.
- Represent embedding provider, rerank provider, and chat provider separately enough to match the backend contract. A simplified UI may choose safe defaults, but saved payloads must still use `embedding_provider`, `rerank_provider`, `chat_provider`, related model fields, and the correct credential fields.
- Test connection using `{ ok, error }`.
- Save snake_case config through the corrected adapter.
- Offer save-only and save-and-index flows without forcing core app restart.

- [ ] **Step 4: Update QA UI**

QA UI must:

- Display progressive partial answer text.
- Include a stop button while streaming.
- Show `stopped`, `empty`, and `failed` as distinct results.
- Avoid rendering arbitrary markdown through `dangerouslySetInnerHTML`.
- Mask private sender/chat labels in evidence and snippets when privacy mode is active.

If markdown rendering is kept, implement a limited text-to-segments helper in `semanticDisplay.ts` and test headings, bullets, links-as-text, and escaping.

- [ ] **Step 5: Update semantic search/topics/profile**

Semantic search, topics, and profile panels must:

- Render loading, empty, error, and success states.
- Mask private chat/contact labels through the same policy used by core workbench.
- Avoid duplicate topic/profile fetches on one module render.
- Keep leaf components props-driven where practical. The semantic module root can call the L2 commander during this staged cleanup.

## 10. Task D5: Graph Contract Tests And Adapters

**Files:**
- Create: `src/l4-atom/network/graphAdapters.ts`
- Create: `src/l4-atom/network/graphAdapters.test.ts`
- Modify: `src/l2-coordinator/api-docs/graph.ts`
- Modify: `src/l4-atom/network/fetchGraphStatus.ts`
- Modify: `src/l4-atom/network/fetchGraphQuery.ts`
- Modify: `src/l4-atom/network/fetchGraphVisualize.ts`
- Create: `src/l4-atom/network/fetchGraphTimeline.ts`
- Create: `src/l4-atom/network/manageGraph.ts`
- Modify: `src/l4-atom/network/index.ts`

- [ ] **Step 1: Add raw graph DTO tests**

Cover:

- Status ready with counts.
- Status running with progress.
- Status disabled or unavailable.
- Visualize success with nodes, edges, timeline, and `generated_at`.
- Visualize empty payload.
- Visualize malformed payload with missing node ids or non-array edges.
- Visualize oversized payload above the UI policy cap.
- Query success with entities, relations, events, and facts.
- Timeline response `{ items, count }` with privacy-sensitive `source` labels.
- Action response from `rebuild`, `pause`, and `resume`, including `{ ok, accepted?, status }`.

- [ ] **Step 2: Define UI policy**

Use a conservative client policy:

- Request limit default: 150 nodes unless user changes the module filter.
- Absolute visualization cap: 300 nodes, aligned with backend limit.
- If payload exceeds the chosen visualization cap, render `oversized` summary/table state and require explicit narrowing before 3D visualization.
- If required fields are malformed, render `malformed` with retry and diagnostics-safe details.

- [ ] **Step 3: Migrate graph atoms to `requestJson`**

All graph REST atoms must append `format=json` through the shared JSON client and must pass raw responses through `graphAdapters.ts`.

`fetchGraphTimeline()` should call `GET /api/v1/graph/timeline`. `manageGraph()` should own `POST /api/v1/graph/rebuild|pause|resume`. Do not add graph config UI in P2-D unless implementation proves worker count configuration is required for recovery.

- [ ] **Step 4: Verify targeted tests**

Run:

```powershell
pnpm test src/l4-atom/network/graphAdapters.test.ts
```

## 11. Task D6: Graph Store, Commander, And View Model

**Files:**
- Create: `src/l2-coordinator/commander/graphViewModel.ts`
- Create: `src/l2-coordinator/commander/graphViewModel.test.ts`
- Modify: `src/l2-coordinator/commander/useGraphCommander.ts`
- Modify: `src/l2-coordinator/data-clerk/stores/useGraphStore.ts`
- Modify: `src/l2-coordinator/commander/useWorkbenchCommander.ts`

- [ ] **Step 1: Replace boolean-only graph state**

Model graph module state as:

```ts
type GraphLoadStatus =
  | "idle"
  | "loading"
  | "empty"
  | "loaded"
  | "error"
  | "malformed"
  | "oversized"
  | "cancelled";
```

Store should also track:

- `statusSummary`
- `query`
- `filters`
- `summary`
- `tableRows`
- `timelineRows`
- `visualizationData`
- `lastUpdatedAt`
- `error`
- `actionStatus`
- `activeNodeId`
- `visualizationRequested`

- [ ] **Step 2: Add commander actions**

`useGraphCommander` should expose:

- `openGraphModule()`
- `refreshStatus()`
- `loadGraphSummary()`
- `loadGraphTimeline()`
- `loadVisualization()`
- `cancelGraphLoad()`
- `retryGraphLoad()`
- `rebuildGraph()`
- `pauseGraph()`
- `resumeGraph()`
- `setGraphFilter()`
- `selectNode()`
- `clearGraphError()`

Existing `openGraph()` can remain as a compatibility alias only if callers still need it.

- [ ] **Step 3: Keep graph optional**

Graph failures must not block semantic, search, browse, or stats. This should be expressed in `graphViewModel.test.ts`.

- [ ] **Step 4: Preserve cross-module navigation**

When a graph node can map to a chat/contact identifier, the commander may request chat selection. If the node only has a display label, do not fabricate a chat id. Render a disabled or informational inspect action instead.

## 12. Task D7: Graph Module Surface And 3D Lazy Boundary

**Files:**
- Create: `src/l3-molecule/graph/GraphModuleView.tsx`
- Create: `src/l3-molecule/graph/GraphSummaryPanel.tsx`
- Create: `src/l3-molecule/graph/GraphFallbackTable.tsx`
- Create: `src/l3-molecule/graph/GraphVisualizePanel.tsx`
- Create: `src/l3-molecule/graph/graphDisplay.ts`
- Create: `src/l3-molecule/graph/graphDisplay.test.ts`
- Modify: `src/l3-molecule/graph/GraphModule.tsx`
- Modify: `src/l3-molecule/graph/GraphCanvas.tsx`
- Modify: `src/l3-molecule/graph/GraphTooltip.tsx`
- Modify: `src/l3-molecule/graph/GraphTimeline.tsx`
- Modify: `src/l3-molecule/graph/GraphControlBar.tsx`
- Modify: `src/l3-molecule/graph/GraphLabels.tsx`
- Modify: `src/styles/workbench-content.css`
- Modify: `src/styles/layout.css`

- [ ] **Step 1: Make summary/table the default**

`GraphModule` should render `GraphModuleView`, not import `GraphCanvas` at top level.

Default module view:

- Compact status summary.
- Filters/search input.
- Empty/error/malformed/oversized states.
- Inspectable table of entities, relations, events, facts, and timeline rows when available.
- Explicit button to load visualization.

- [ ] **Step 2: Lazy-load the 3D visualization only on demand**

`GraphVisualizePanel` should lazy import `GraphCanvas` after the user asks to visualize and the payload is within cap.

The normal workbench and the graph summary/table view should not load `@react-three/fiber`, `@react-three/drei`, `three`, or `d3-force-3d`.

- [ ] **Step 3: Remove visible legacy UI controls**

Graph-visible components must not use:

- `AppleButton`
- structural emoji icons
- uncontrolled tiny raw buttons
- raw private labels in tooltips, labels, or timeline rows

Use `Button`, `IconButton`, `Tooltip`, `Surface`, `StatusIndicator`, lucide icons, and tokenized CSS.

- [ ] **Step 4: Add privacy-safe graph display helpers**

`graphDisplay.ts` should produce:

- Masked node label.
- Masked relation label.
- Safe tooltip title/body.
- Safe timeline row title/source.
- Fallback label for malformed or missing names.

Tests must cover privacy-on and privacy-off behavior.

- [ ] **Step 5: Ensure no canvas on non-visual states**

`GraphCanvas` must not mount for `idle`, `loading`, `empty`, `error`, `malformed`, `oversized`, or `cancelled`.

## 13. Task D8: Graph Canvas Performance And Interaction Polish

**Files:**
- Modify: `src/l3-molecule/graph/GraphCanvas.tsx`
- Modify: `src/l3-molecule/graph/GraphEngine.tsx`
- Modify: `src/l3-molecule/graph/GraphNode3D.tsx`
- Modify: `src/l3-molecule/graph/GraphLabels.tsx`
- Modify: `src/l3-molecule/graph/GraphControlBar.tsx`

- [ ] **Step 1: Make layout deterministic enough for regression checks**

Sort nodes and edges before layout or use deterministic initial positions. Avoid `Math.random()` as the only initial placement source.

- [ ] **Step 2: Respect reduced motion**

If the user prefers reduced motion, reduce camera animation and avoid non-essential continuous movement.

- [ ] **Step 3: Bound heavy work**

Do not run force layout for oversized data. For allowed data, keep layout work isolated to the visualization path and avoid recomputing when unrelated controls change.

- [ ] **Step 4: Fix cursor cleanup**

If `GraphNode3D` changes `document.body.style.cursor`, cleanup must restore it on unmount and on hover exit.

- [ ] **Step 5: Verify visual canvas behavior**

Use browser checks after implementation:

- Desktop workbench graph summary loads without canvas.
- Clicking visualize mounts a nonblank canvas for valid data.
- Oversized and malformed states do not mount canvas.
- 390px width keeps controls visible and avoids horizontal overflow.

## 14. Task D9: Workbench Navigation And Module Boundaries

**Files:**
- Modify: `src/l1-entry/pages/WorkbenchView.tsx`
- Modify: `src/l2-coordinator/commander/useWorkbenchCommander.ts`
- Modify: `src/l2-coordinator/commander/workbenchViewModel.ts`
- Modify: `src/l2-coordinator/commander/workbenchViewModel.test.ts`
- Modify: `src/l3-molecule/workbench/WorkbenchFrame.tsx`

- [ ] **Step 1: Keep L1 as composition**

`WorkbenchView` may lazy-load module roots, but should not own semantic/graph business logic. New decisions such as module state, retry behavior, graph filter defaults, or semantic stop behavior belong in L2.

- [ ] **Step 2: Keep modules recoverable**

Navigation must support:

- Open semantic module.
- Leave semantic module while a stream is active and cancel safely.
- Open graph module.
- Leave graph module while a load or visualization request is active and cancel safely.
- Return to chat/search/stats without graph overlay or canvas blocking input.
- Retry semantic or graph module failures without resetting selected conversation.

- [ ] **Step 3: Update module entry states**

Workbench module entries should show compact status:

- Semantic: not configured, indexing, ready, failed, stopped.
- Graph: unavailable, loading, empty, loaded, failed, oversized.

Do not show semantic or graph as fully ready when the backend status is unknown.

## 15. Task D10: Productization Evidence And Spec Tasks

**Files:**
- Modify: `specs/001-ready-desktop-app/tasks.md`
- Modify: `specs/001-ready-desktop-app/release-evidence.md`
- Modify: `specs/001-ready-desktop-app/architecture-boundary-check.md`
- Modify: `docs/release/ready-desktop-app.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `task_plan.md`

- [ ] **Step 1: Update tasks only after verification**

Do not mark T031-T038 complete until the corresponding adapter, commander, UI, navigation, and verification work has landed.

Mapping:

- T031: Tasks D1-D2.
- T032: Task D3.
- T033: Task D4.
- T034: Task D9 semantic portion.
- T035: Task D5.
- T036: Task D6.
- T037: Tasks D7-D8.
- T038: Task D9 graph portion.

- [ ] **Step 2: Update release evidence**

Record:

- Semantic provider missing state.
- Semantic index running/ready/error state.
- QA streaming, stopped, failed, and empty state evidence.
- Graph available, empty, failed, malformed, oversized, and loaded evidence.
- Build output chunk evidence showing graph 3D dependencies are only loaded by the visualization path or recording remaining warning with exact rationale.

- [ ] **Step 3: Update architecture checklist**

Record the staged boundary decision:

- Module roots may still call L2 commanders.
- Leaf components should receive props/callbacks.
- L4 network atoms own raw sidecar calls and parsing helpers.
- L1 only composes lazy modules and workbench shell state.

## 16. Task D11: Verification Matrix

**Files:**
- Modify only evidence/progress docs after commands complete.

- [ ] **Step 1: Targeted tests**

Run:

```powershell
pnpm test src/l4-atom/network/semanticAdapters.test.ts src/l2-coordinator/diplomat/sseParser.test.ts src/l2-coordinator/commander/semanticViewModel.test.ts
pnpm test src/l4-atom/network/graphAdapters.test.ts src/l2-coordinator/commander/graphViewModel.test.ts src/l3-molecule/graph/graphDisplay.test.ts
pnpm test src/l3-molecule/semantic/semanticDisplay.test.ts src/l2-coordinator/commander/workbenchViewModel.test.ts
```

The first graph command must cover `fetchGraphTimeline()` and `manageGraph()` fixtures through `graphAdapters.test.ts` or adjacent targeted tests. The semantic view-model command must cover the compact StatusBar semantic status mapping.

- [ ] **Step 2: Full frontend verification**

Run:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

`pnpm build` output must be copied into release evidence if graph chunk warnings remain.

- [ ] **Step 3: Browser UI acceptance**

Run the app on `http://localhost:5173` and check:

- `/workbench` at desktop width with semantic not configured.
- `/workbench` at desktop width with semantic index running.
- `/workbench` at desktop width with QA streaming and stop action.
- `/workbench` at desktop width with graph empty state.
- `/workbench` at desktop width with graph loaded summary/table state.
- `/workbench` at desktop width with graph visualize state and nonblank canvas.
- `/workbench` at 390px width for semantic module.
- `/workbench` at 390px width for graph module.

For graph canvas checks, verify the canvas has nonblank pixels and controls remain reachable. For summary/empty/oversized states, verify no canvas is mounted.

- [ ] **Step 4: Privacy and logging checks**

Run:

```powershell
rg -n "console\.(log|debug|info|warn|error)" src\l2-coordinator src\l3-molecule src\l4-atom
rg -n "dangerouslySetInnerHTML|AppleButton|🔄|⚙|✨|🧠|🕸" src\l3-molecule\semantic src\l3-molecule\graph
```

Expected:

- No semantic/graph logs of raw prompt, answer evidence, API keys, contact names in privacy mode, or message content.
- No visible semantic/graph dependency on `AppleButton` or structural emoji.
- No `dangerouslySetInnerHTML` in semantic answer rendering.

## 17. Acceptance Criteria

P2-D is complete when:

- Semantic config/index/test/search/QA adapters match the real sidecar contract and use JSON REST handling where applicable.
- Semantic topics/profile adapters match the real sidecar contract and render unavailable/empty/error states honestly.
- Compact semantic StatusBar state comes from the new UI-facing semantic view model, not the old `status: "building"` response assumption.
- Semantic QA streaming parses named SSE events, streams incrementally, stops safely, and exposes distinct stopped/failed/empty states.
- Missing semantic provider never blocks launch, dashboard, chat browse, stats, or search.
- Semantic module uses current design primitives and no visible `AppleButton`, structural emoji, or unsafe HTML rendering.
- Graph status/query/timeline/visualize/action adapters match the real sidecar contract and classify empty/malformed/oversized payloads before rendering.
- Graph module opens as a contained workbench module, not a floating overlay, with summary/table fallback as default.
- Three.js/R3F canvas loads only for explicit graph visualization and never for empty/error/malformed/oversized states.
- Graph controls, labels, tooltips, and timeline rows use current design primitives and privacy masking.
- Workbench navigation remains recoverable across chat/search/stats/semantic/graph without losing selected conversation.
- T031-T038 are updated only after the relevant code and verification are complete.
- `pnpm verify` passes, or any failure is fully documented with root cause and owner.
- Browser checks cover desktop and 390px widths for semantic and graph states.

## 18. Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Current semantic DTO types are optimistic and diverge from Go sidecar | Semantic settings and QA can appear broken even when backend works | Start with L4 adapter fixtures from real responses and only then update commanders/UI |
| UI collapses semantic embedding/rerank/chat providers into one provider | Saved config can silently misconfigure indexing, rerank, or chat | Keep exact snake_case backend fields in adapters and only simplify UI through explicit defaults |
| SSE parser ignores `event:` names | QA stream may never show final done/error state correctly | Add parser tests for `delta`, `done`, `error`, split chunks, and cancellation |
| AI module can accidentally imply remote provider use | Privacy/product trust issue | Copy and state model must say provider calls occur only after explicit user configuration |
| Graph payloads can be large or malformed | UI freeze or blank canvas | Classify before rendering and keep summary/table default |
| Graph timeline/actions are omitted because current UI only calls visualize | Graph module lacks recovery evidence and timeline fallback | Add `fetchGraphTimeline()` and `manageGraph()` to L4 scope before UI work |
| Graph 3D dependencies remain in the first graph module chunk | Bundle warning persists and workbench feels heavy | Split summary/table from visualization and record build chunk evidence |
| L3 still has existing commander imports | Strict architecture debt persists | In P2-D, module roots may call L2 commanders, while leaf components move toward props/callbacks; record remaining debt in architecture evidence |
| Privacy masking diverges between core workbench, semantic, and graph | Private contact/chat labels leak in module surfaces | Reuse existing privacy display helpers or add tested semantic/graph display helpers with the same policy |

## 19. Implementation Order

1. D0 baseline and inventory.
2. D1 semantic REST adapter tests and implementation.
3. D2 SSE parser, `streamQA`, and cancellation state.
4. D3 semantic commander/view-model state.
5. D4 semantic UI containment.
6. D5 graph REST adapter tests and implementation.
7. D6 graph commander/store/view-model state.
8. D7 graph summary/table module and lazy visualization split.
9. D8 graph canvas performance and interaction polish.
10. D9 workbench navigation and module entry status.
11. D10 productization evidence.
12. D11 verification matrix.

Semantic and graph adapter tasks can be developed in parallel if using disjoint files. UI containment should wait for the corresponding L2 view models to avoid baking backend assumptions into components.

## 20. Final Handoff Notes

- Preserve backend behavior. If a sidecar response seems insufficient, document the mismatch and adapt UI state around it instead of changing Go code.
- Treat all semantic and graph data as private by default. Do not add screenshots or logs that expose real chat content.
- Keep P2-D as a containment/productization phase. Deep semantic ranking, graph QA improvements, media, hooks, or new provider features belong to later stages.
- If implementation reveals that a current component is too coupled to refactor safely in one pass, add a tested adapter/view-model first and leave a documented debt item rather than mixing network parsing into L3.

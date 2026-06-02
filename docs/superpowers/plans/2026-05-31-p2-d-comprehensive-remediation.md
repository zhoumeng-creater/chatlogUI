# P2-D Comprehensive Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` when parallel workers are explicitly requested, or `superpowers:executing-plans` when implementing this plan task-by-task in one session. Steps use checkbox syntax for tracking.

**Goal:** Bring P2-D semantic and graph containment into alignment with the real `chatlog_alpha` backend contract, the project L1/L2/L3/L4 architecture rules, visible UI quality requirements, privacy constraints, and productization evidence rules.

**Architecture:** L4 network/system atoms expose raw sidecar calls and local DTO normalization only. L2 commander/view-model code owns orchestration, error translation, retries, cancellation, and state normalization. L3 semantic/graph leaf components receive data and callbacks from their module roots. L1 only hosts route/layout/module navigation.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4/project CSS variables, Zustand, Tauri v2, Vitest, Playwright/browser smoke where needed.

---

## Task 0 - Freeze Baseline And Add Real Contract Fixtures

- [ ] Confirm branch and dirty scope.
  - Run: `git branch --show-current`
  - Run: `git status --short`
  - Expected branch: `codex/p2-d-ai-graph-containment`
  - Record unrelated dirty files in `progress.md` before editing.

- [ ] Add backend-shaped semantic search fixture in `src/l4-atom/network/semanticAdapters.test.ts`.
  - Replace the current search fixture that uses `chat`, `sender`, string `time`, `local_id`, `rerank_enabled`, and `rerank_provider`.
  - Use this raw shape:

```ts
const search = adaptSemanticSearch({
  query: "release",
  chat: "wxid_filter",
  source_count: 25,
  window: "all",
  depth: "standard",
  count: 1,
  rerank: true,
  rerank_tried: true,
  rerank_applied: false,
  rerank_error: "rerank unavailable",
  results: [
    {
      talker: "wxid_a",
      talker_name: "Project room",
      sender: "wxid_sender",
      sender_name: "Alice",
      seq: 123,
      time: 1717044000,
      content: "Release checklist",
      score: 0.91,
      rerank_score: 0.42,
    },
  ],
});
```

  - Expected assertions:
    - `search.chat === "wxid_filter"`
    - `search.count === 1`
    - `search.totalCount === 1`
    - `search.rerank.enabled === true`
    - `search.rerank.tried === true`
    - `search.rerank.applied === false`
    - `search.rerank.error === "rerank unavailable"`
    - `search.results[0].chat === "wxid_a"`
    - `search.results[0].chatName === "Project room"`
    - `search.results[0].sender === "Alice"`
    - `search.results[0].senderId === "wxid_sender"`
    - `search.results[0].localId === 123`
    - `search.results[0].time` is a non-empty display-safe string.

- [ ] Add backend-shaped semantic profile fixture in `src/l4-atom/network/semanticAdapters.test.ts`.
  - Replace the current profile fixture that uses `traits` and record-shaped `type_distribution`.
  - Use this raw shape:

```ts
const profiles = adaptSemanticProfiles({
  window: "all",
  window_label: "All time",
  count: 1,
  profiles: [
    {
      sender: "wxid_sender",
      sender_name: "Alice",
      messages: 42,
      top_keywords: [
        { topic: "release", count: 7 },
        { topic: "design", count: 3 },
      ],
    },
  ],
  type_distribution: [
    { type: "person", count: 1 },
    { type: "room", count: 2 },
  ],
  summary: "Profile summary",
  summary_error: "",
});
```

  - Expected assertions:
    - `profiles.profiles[0].sender === "wxid_sender"`
    - `profiles.profiles[0].senderName === "Alice"`
    - `profiles.profiles[0].messages === 42`
    - `profiles.profiles[0].topKeywords[0].topic === "release"`
    - `profiles.typeDistribution` preserves both rows.

- [ ] Run the target adapter tests and confirm they fail before implementation.
  - Run: `pnpm test src/l4-atom/network/semanticAdapters.test.ts`
  - Required RED evidence: failures must point to current adapter assumptions, not test syntax errors.

## Task 1 - Fix Semantic Search Adapter And Search UI

- [ ] Update semantic search types in `src/l4-atom/network/semanticAdapters.ts`.
  - Add `totalCount: number` to `SemanticSearchView`.
  - Add `chatName: string` and `senderId: string` to search result rows.
  - Extend `rerank` to include `tried: boolean`, `applied: boolean`, and `error: string`.

- [ ] Update `adaptSemanticSearch()` in `src/l4-atom/network/semanticAdapters.ts`.
  - Result mapping:
    - `chat = stringValue(result.talker) || stringValue(result.chat)`
    - `chatName = stringValue(result.talker_name) || chat`
    - `senderId = stringValue(result.sender)`
    - `sender = stringValue(result.sender_name) || senderId`
    - `localId = numberValue(result.seq, numberValue(result.local_id))`
    - `time = semanticTimeString(result.time)`
  - Response mapping:
    - `count = numberValue(data.count, results.length)`
    - `totalCount = count`
    - `rerank.enabled = boolValue(data.rerank)`
    - `rerank.tried = boolValue(data.rerank_tried)`
    - `rerank.applied = boolValue(data.rerank_applied)`
    - `rerank.error = stringValue(data.rerank_error)`
  - Add helper `semanticTimeString(value: unknown): string` in the same file:
    - Return a trimmed string when input is a non-empty string.
    - Treat numeric values above `100000000000` as milliseconds.
    - Treat smaller positive numeric values as seconds.
    - Return `""` for invalid values.

- [ ] Update `src/l3-molecule/semantic/SemanticSearch.tsx`.
  - Display result count from `searchResults.count ?? searchResults.totalCount ?? searchResults.results.length`.
  - When rendering a result, use `chatName` for conversation label and `sender` for sender label.
  - Disable result navigation when `r.chat` is empty.
  - Call `selectAndLoad(r.chat, r.chatName || r.chat)`.
  - Render an explicit empty state when the last query completed with zero results.
  - Render an explicit retryable error state when the search command exposes a search error.

- [ ] Run target tests.
  - Run: `pnpm test src/l4-atom/network/semanticAdapters.test.ts src/l4-atom/network/semanticFetchers.test.ts src/l3-molecule/semantic/semanticDisplay.test.ts`

## Task 2 - Fix Semantic Profiles Adapter And Profile UI

- [ ] Update profile types in `src/l4-atom/network/semanticAdapters.ts`.
  - Replace `profiles: Array<Record<string, unknown>>` with:

```ts
profiles: Array<{
  sender: string;
  senderName: string;
  messages: number;
  topKeywords: Array<{ topic: string; count: number }>;
}>;
typeDistribution: Array<{ type: string; count: number }>;
```

- [ ] Update `adaptSemanticProfiles()` in `src/l4-atom/network/semanticAdapters.ts`.
  - Treat `data.type_distribution` as an array.
  - For compatibility with malformed responses, return an empty array when the field is not an array.
  - Map each profile row from `sender`, `sender_name`, `messages`, and `top_keywords`.
  - Preserve `summary` and `summaryError`.

- [ ] Update `src/l3-molecule/semantic/ContactProfile.tsx`.
  - Do not return `null` for missing profile data.
  - Render loading, empty, error, and success states.
  - In success state, render:
    - Summary text when present.
    - A compact row/table list with display name, message count, and top keywords.
    - Type distribution as compact chips.
  - Apply existing privacy display helpers to sender names and keyword text.

- [ ] Add or update `src/l3-molecule/semantic/semanticDisplay.test.ts`.
  - Cover sender display fallback.
  - Cover privacy-on sender masking.
  - Cover top keyword formatting.
  - Cover empty profile rows.

- [ ] Run target tests.
  - Run: `pnpm test src/l4-atom/network/semanticAdapters.test.ts src/l3-molecule/semantic/semanticDisplay.test.ts`

## Task 3 - Make Semantic Module State View-Model Driven

- [ ] Update `src/l2-coordinator/commander/semanticViewModel.ts`.
  - Include module states: `unavailable`, `not_configured`, `index_not_built`, `index_building`, `index_paused`, `index_ready`, `index_failed`, `loading`, and `error`.
  - Include per-panel states for search, topics, profile, and QA: `idle`, `loading`, `empty`, `success`, `error`, and `cancelled` where cancellation is supported.
  - Include retry labels and recovery action ids for retryable states.

- [ ] Update `src/l2-coordinator/commander/useAiCommander.ts`.
  - In `initialize()`, map backend `paused` to `index_paused`, `error` or `failed` to `index_failed`, `ready` to `index_ready`, and `running/building` to `index_building`.
  - Store local error fields for search, topics, and profile instead of only writing the shared module error.
  - Expose retry callbacks: `retrySearch`, `retryTopics`, and `retryProfile`.
  - Keep QA stop/cancel behavior intact.

- [ ] Update `src/l3-molecule/semantic/AiPanel.tsx`.
  - Render from `ai.moduleView` instead of branching on `ai.phase`.
  - Keep only module-root access to `useAiCommander`, `useChatCommander`, and `useChatStore`.
  - Pass semantic data and callbacks into `SemanticSearch`, `TopicView`, `ContactProfile`, and `QAPanel` as props.

- [ ] Convert semantic leaf components to props.
  - `src/l3-molecule/semantic/SemanticSearch.tsx`
  - `src/l3-molecule/semantic/TopicView.tsx`
  - `src/l3-molecule/semantic/ContactProfile.tsx`
  - `src/l3-molecule/semantic/QAPanel.tsx`
  - `src/l3-molecule/semantic/QAMessage.tsx`
  - Remove direct `@l2` imports from those leaf files.

- [ ] Run state tests and architecture scan.
  - Run: `pnpm test src/l2-coordinator/commander/semanticViewModel.test.ts src/l3-molecule/semantic/semanticDisplay.test.ts`
  - Run: `rg -n "@l2|l2-coordinator" src/l3-molecule/semantic`
  - Expected scan result: only the semantic module root may import L2 during this remediation stage.

## Task 4 - Clean Graph Leaf Architecture Boundary

- [ ] Update graph module ownership.
  - Keep `useGraphCommander` and `useGraphStore` access in `src/l3-molecule/graph/GraphModule.tsx` or a single module-root container.
  - Pass data and callbacks into graph leaf components as props.

- [ ] Convert graph leaf components to props.
  - `src/l3-molecule/graph/GraphControlBar.tsx`
  - `src/l3-molecule/graph/GraphCanvas.tsx`
  - `src/l3-molecule/graph/GraphEngine.tsx`
  - `src/l3-molecule/graph/GraphTimeline.tsx`
  - `src/l3-molecule/graph/GraphTooltip.tsx`
  - `src/l3-molecule/graph/GraphNode3D.tsx`
  - `src/l3-molecule/graph/GraphLabels.tsx`
  - Remove direct `@l2` and `l2-coordinator` imports from those leaf files.

- [ ] Preserve reduced-motion and deterministic layout behavior.
  - When moving props, keep `autoRotate`, `layoutMode`, `visibleEntityKinds`, hover state, selected state, pulsed state, and tooltip coordinates explicit in prop types.

- [ ] Run graph tests and architecture scan.
  - Run: `pnpm test src/l2-coordinator/commander/graphViewModel.test.ts src/l3-molecule/graph/graphDisplay.test.ts src/l3-molecule/graph/graphLayout.test.ts`
  - Run: `rg -n "@l2|l2-coordinator" src/l3-molecule/graph`
  - Expected scan result: only the graph module root may import L2 during this remediation stage.

## Task 5 - Remove L4 Upward Type Dependencies

- [ ] Create L4-owned raw system types in `src/l4-atom/system/systemTypes.ts`.
  - Move raw `PortState` shape used by sidecar/system calls into this file.
  - Move raw setup profile summary shape used by config import into this file.

- [ ] Update L4 system atoms.
  - `src/l4-atom/system/sidecarManager.ts` imports `PortState` from `./systemTypes`.
  - `src/l4-atom/system/chatlogConfig.ts` imports `SetupProfileSummary` from `./systemTypes`.
  - `src/l4-atom/system/index.ts` exports the L4 raw system types.

- [ ] Update L2 setup code.
  - L2 imports L4 raw types only at orchestration boundaries.
  - L2 maps L4 raw return values into L2 setup view-model types before passing data to UI.

- [ ] Run typecheck and scan.
  - Run: `pnpm typecheck`
  - Run: `rg -n "@l2|l2-coordinator" src/l4-atom`
  - Expected scan result: no L4 file imports L2.

## Task 6 - Polish Semantic And Graph Visible Controls

- [ ] Replace `AiPanel` raw tabs.
  - In `src/l3-molecule/semantic/AiPanel.tsx`, remove hard-coded `#007AFF`, inline tab borders, and per-tab inline color rules.
  - Use an existing button/segmented-control primitive if present.
  - If no primitive exists, add a compact local semantic tab class in `src/styles/layout.css` using project CSS variables.

- [ ] Replace `SetupWizard` raw step/provider visuals.
  - In `src/l3-molecule/semantic/SetupWizard.tsx`, remove hard-coded `#007AFF`.
  - Provider cards must be `button type="button"` with tokenized focus, selected, hover, disabled, and error states.
  - Replace `onClick={() => { handleTest(); setStep(3); }}` with an awaited flow:

```ts
const passed = await handleTest();
if (passed) {
  setStep(3);
}
```

  - `handleTest()` must return `Promise<boolean>` and must not advance the step on failure.

- [ ] Replace graph tiny controls.
  - In `src/l3-molecule/graph/GraphControlBar.tsx`, use icon+tooltip controls where commands are clear.
  - Minimum control height: 32px.
  - Minimum icon button width: 32px.
  - Remove 11px command labels where they act as primary controls.
  - Use wrapping groups on 390px width.

- [ ] Replace graph timeline tiny close/control styling.
  - In `src/l3-molecule/graph/GraphTimeline.tsx`, increase close control to at least 32px square.
  - Use tokenized muted text for metadata, not inline 11px styles.

- [ ] Run UI checks.
  - Run: `pnpm test src/l3-molecule/graph/graphLayout.test.ts src/l3-molecule/semantic/semanticDisplay.test.ts`
  - Start dev server on `http://127.0.0.1:5173`.
  - Browser smoke `/workbench` at 1440px and 390px:
    - Open semantic module.
    - Open setup wizard.
    - Open graph module.
    - Open graph timeline.
    - Confirm no text overlap, no clipped controls, and no page-level horizontal overflow.

## Task 7 - Recheck Graph Visualization Performance Evidence

- [ ] Keep default graph route canvas-free.
  - Before clicking visualization, browser check must report `document.querySelectorAll("canvas").length === 0`.

- [ ] Verify explicit visualization loading state.
  - Click the graph visualization command.
  - Confirm a loading state is visible before or while `GraphCanvas` loads on a cold navigation.
  - Confirm one canvas mounts after load.
  - Confirm canvas bounding box width and height are both above 200px on desktop and above 180px on 390px width.
  - Confirm canvas pixel sample is not blank.

- [ ] Record evidence.
  - Update `specs/001-ready-desktop-app/release-evidence.md` with:
    - Default graph path canvas count before click.
    - Canvas mount result after click.
    - Desktop and 390px bounding box measurements.
    - Current graph chunk names and sizes from `pnpm build`.
  - Do not mark manual installer smoke complete in this task.

## Task 8 - Productization Evidence And Task Status Corrections

- [ ] Update `specs/001-ready-desktop-app/architecture-boundary-check.md`.
  - Record fresh scans:
    - `rg -n "@l2|l2-coordinator" src/l4-atom`
    - `rg -n "@l2|l2-coordinator" src/l3-molecule/semantic`
    - `rg -n "@l2|l2-coordinator" src/l3-molecule/graph`
  - List any remaining accepted module-root exceptions by exact file.

- [ ] Update `specs/001-ready-desktop-app/release-evidence.md`.
  - Record privacy/diagnostics audit scan:
    - `rg -n "dangerouslySetInnerHTML|AppleButton|AnimatePresence|motion\\.div" src/l3-molecule/semantic src/l3-molecule/graph`
    - `rg -n "@l4/network|fetch\\(|EventSource|WebSocket|axios" src/l1-entry src/l3-molecule`
    - `rg -n "api[_-]?key|token|credential|dataKey|imgKey|wxid_|sender_name|talker_name" src-tauri/src src/l2-coordinator src/l3-molecule src/l4-atom`
  - Explain each remaining hit as safe, redacted, test-only, or requiring a separate fix.

- [ ] Update `specs/001-ready-desktop-app/tasks.md`.
  - Keep T031-T038 checked only after Tasks 1-7 pass.
  - Check T039 only if the architecture audit is complete and recorded.
  - Check T040 only if the privacy/diagnostics audit is complete and recorded.
  - Keep T042 unchecked unless Windows x64 install/launch/quit/reopen/port-conflict smoke has actually been run.

- [ ] Update `docs/release/ready-desktop-app.md`.
  - Add the P2-D remediation evidence summary.
  - Keep install, quit, reopen, port-conflict, and full privacy log audit caveats visible if not run.

## Task 9 - Final Verification Matrix

- [ ] Run targeted tests.

```powershell
pnpm test src/l4-atom/network/semanticAdapters.test.ts src/l4-atom/network/semanticFetchers.test.ts src/l4-atom/network/streamQA.test.ts src/l2-coordinator/diplomat/sseParser.test.ts src/l2-coordinator/commander/semanticViewModel.test.ts src/l3-molecule/semantic/semanticDisplay.test.ts src/l4-atom/network/graphAdapters.test.ts src/l4-atom/network/graphFetchers.test.ts src/l2-coordinator/commander/graphViewModel.test.ts src/l3-molecule/graph/graphDisplay.test.ts src/l3-molecule/graph/graphLayout.test.ts src/l2-coordinator/commander/workbenchViewModel.test.ts
```

- [ ] Run full frontend verification.

```powershell
pnpm verify
```

- [ ] Run Rust tests if Tauri/Rust files changed.

```powershell
Push-Location src-tauri
cargo test
Pop-Location
```

- [ ] Run packaging verification if release evidence or Tauri packaging status is updated.

```powershell
pnpm tauri build
```

- [ ] Run browser UI acceptance.
  - Desktop: `/workbench` at 1440px.
  - Narrow: `/workbench` at 390px.
  - Cover semantic setup/search/profile, graph summary/table, graph timeline, and explicit graph visualization.
  - Record screenshots or measured evidence in release evidence.

- [ ] Run final scans.

```powershell
rg -n "dangerouslySetInnerHTML|AppleButton|AnimatePresence|motion\\.div" src\l3-molecule\semantic src\l3-molecule\graph
rg -n "@l4/network|fetch\(|EventSource|WebSocket|axios" src\l1-entry src\l3-molecule
rg -n "@l2|l2-coordinator" src\l4-atom
```

- [ ] Update working memory files.
  - Append implementation findings to `findings.md`.
  - Append verification results to `progress.md`.
  - Append a new completed phase to `task_plan.md` only after the verification matrix has been run and read.

## Acceptance Criteria

- Real backend-shaped semantic search and profile fixtures fail on the old adapter and pass after the adapter changes.
- Semantic search/profile UI renders meaningful data from real `chatlog_alpha` response shapes.
- Semantic search/profile/topics/QA states include loading, empty, success, error, and retry or recovery where applicable.
- L4 no longer imports L2.
- Semantic and graph leaf components no longer import L2, except for explicitly recorded module-root boundaries.
- AI/graph visible controls use tokenized styling, stable dimensions, and no tiny primary controls.
- Default graph module does not mount a canvas before explicit visualization.
- Release evidence clearly separates automated verification from manual installer smoke.
- `pnpm verify` passes after the remediation.
- `cargo test` and `pnpm tauri build` pass when their related files or release evidence are changed.

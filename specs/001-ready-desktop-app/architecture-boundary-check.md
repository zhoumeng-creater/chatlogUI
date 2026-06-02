# Architecture Boundary Checklist

This checklist records the current L1/L2/L3/L4 boundary expectations for the ready desktop app work.

## Rules

- L1 renders page shells and delegates events only.
- L1 must not own business logic, persistent state transitions, raw network calls, or sidecar calls.
- L2 owns orchestration, retries, error translation, state normalization, and API coordination.
- L3 molecules render feature UI from props or L2 commanders and must not call L4 network atoms directly.
- L4 network atoms own raw HTTP/SSE calls.
- L4 system atoms own Tauri and OS integration wrappers.
- Backend communication must flow through L4 network/system atoms, then L2 commander/diplomat, then state/UI.

## Scan Commands

```powershell
rg "@l4/network|fetch\(|EventSource|WebSocket|axios" src/l1-entry src/l3-molecule -n
rg "use[A-Za-z]+Store|zustand|localStorage|sessionStorage" src/l1-entry -n
rg "@l4/network|fetch\(|EventSource|WebSocket|axios" src/l2-coordinator src/l4-atom -n
rg "@l2/commander|@l2/data-clerk|@l4/network|@l4/system" src/l3-molecule -n
rg "@l3/|@/l3-molecule|l3-molecule" src/l2-coordinator src/l4-atom -n
```

## 2026-05-30 Scan Result

- No direct L1/L3 raw `fetch`, `EventSource`, `WebSocket`, `axios`, or `@l4/network` import was found.
- L4 network atoms contain raw `fetch` calls, and L2 commanders call L4 network atoms. This matches the expected network boundary.
- L1 still imports setup/app stores in `SetupCenterView.tsx` and `WorkbenchShellView.tsx`. `SettingsView.tsx` now delegates through `useSettingsPageCommander`.
- Several L3 feature components still read Zustand stores or commanders directly. This is tolerated by the current codebase pattern but should be reduced where shared molecules need pure prop-driven reuse.
- `ConfigImportPanel.tsx` and `DataSettings.tsx` now route directory picking through L2 setup/settings commanders. Remaining L3 commander/store reads are staged cleanup debt.

## Follow-Up Items

- L1 readiness reads were moved into L2 view models on 2026-06-01 for setup center and workbench shell.
- Route directory-picker actions through L2 commanders.
- Keep P2-B chat, stats, search, setup, and settings components free of direct L4 network calls.

## 2026-05-31 P2-D Scan Result

- Semantic and graph raw REST parsing now lives in L4 adapters/fetchers; L3 semantic/graph components do not call `@l4/network` or raw `fetch()`.
- Semantic SSE parsing is split between the L4 stream atom and L2 diplomat parser; UI receives normalized stream state through `useAiCommander`.
- Graph summary/table rendering is separated from the lazy `GraphCanvas` path. `GraphModule.tsx` no longer imports `GraphCanvas` at top level.
- Module roots still call L2 commanders as a staged boundary decision. New graph leaf panels receive data and callbacks through props.
- Workbench L1 remains composition/router shell. It passes module selection callbacks and does not own semantic/graph REST parsing, stream state, graph filters, or retry classification.
- Remaining architecture debt: several existing L3 roots across the app still read commanders/stores directly; this remains a staged cleanup item outside P2-D completion.

## 2026-05-31 P2-D Comprehensive Remediation Scan

- `rg -n "@l2|l2-coordinator" src/l4-atom`: no matches. L4 network/system atoms no longer import L2 types or diplomats.
- `rg -n "@l4/network|@/l4-atom/network|fetch\(|EventSource|WebSocket|axios" src/l1-entry src/l3-molecule`: no matches. L1/L3 do not call raw network or L4 network atoms directly.
- `rg -n "dangerouslySetInnerHTML|AppleButton|AnimatePresence|motion\.div" src/l3-molecule/semantic src/l3-molecule/graph`: no matches in the contained semantic/graph module paths.
- `rg -n "@l2|l2-coordinator" src/l3-molecule/semantic src/l3-molecule/graph`: only module-root boundary files remain:
  - `src/l3-molecule/semantic/AiPanel.tsx` imports `useAiCommander`, `useChatCommander`, `useChatStore`, and `useSettingsStore` to bridge L2 state into semantic leaf props.
  - `src/l3-molecule/graph/GraphModule.tsx` imports `useGraphCommander` and `useSettingsStore` to bridge L2 state into graph leaf props.
- Semantic leaf components (`QAPanel`, `QAMessage`, `SemanticSearch`, `TopicView`, `ContactProfile`, `SetupWizard`) now receive data and callbacks through props.
- Graph leaf components (`GraphCanvas`, `GraphControlBar`, `GraphEngine`, `GraphTimeline`, `GraphTooltip`, `GraphNode3D`, `GraphLabels`, `GraphEdge3D`, fallback/summary/visualize panels) now receive data and callbacks through props.
- Accepted remaining debt: broader app L3 roots outside the contained semantic/graph scope still use commander/store reads and remain staged architecture cleanup outside P2-D remediation.

## 2026-06-01 Suggested Fix Recheck

- `rg -n "use[A-Za-z]+Store|zustand|localStorage|sessionStorage|useSetupCommander|useAppStore|useSetupStore" src/l1-entry`: no matches. `SetupCenterView.tsx` now delegates readiness labels/actions through `useSetupCenterCommander`; `WorkbenchShellView.tsx` delegates gate/readiness state through `useWorkbenchShellCommander`.
- `rg -n "ai\.phase" src/l3-molecule src/l1-entry`: no matches. Semantic panel rendering now uses `ai.moduleView.kind`, including the `checking_config` module state.
- `src/l2-coordinator/commander/workbenchViewModel.ts` exposes a dev-only smoke-ready input consumed by `useWorkbenchShellCommander` from `?codex-smoke=workbench-ready`, allowing browser UI smoke to enter the workbench without mutating L1 stores or changing production behavior.

## 2026-06-01 P2-E Recheck

- `rg -n "@l4/network|@/l4-atom/network|fetch\(|EventSource|WebSocket|axios" src/l1-entry src/l3-molecule`: no matches. P2-E privacy/a11y changes did not introduce raw network calls in L1/L3.
- `rg -n "@l2|l2-coordinator" src/l4-atom`: no matches. L4 remains independent of L2.
- `rg -n "ai\.phase" src/l1-entry src/l3-molecule`: no matches.
- `rg -n "dangerouslySetInnerHTML|AppleButton|GlassPanel" src/l1-entry src/l3-molecule`: no matches.
- `WorkbenchFrame` drawer accessibility is implemented through `workbenchAccessibility.ts`; `UpdateNotification` now exposes dialog/progressbar semantics from L3 helper/view-model code without adding new architecture exceptions.
- Sidecar bind-address drift is closed for current guidance: `AGENTS.md`, code, local-backend contract, release runbook, and `sidecar_args.rs` use `127.0.0.1:5030` as the local-only default.

## 2026-06-01 P2-E Comprehensive Remediation Scan

- `rg -n "@l3/|@/l3-molecule|l3-molecule" src/l2-coordinator src/l4-atom`: no matches. The former `useWorkbenchCommander.ts` / `workbenchViewModel.ts` dependency on L3 `workbenchLayout` is now owned by `src/l2-coordinator/commander/workbenchLayout.ts`.
- `rg -n "@l4/network|@/l4-atom/network|fetch\(|EventSource|WebSocket|axios" src/l1-entry src/l3-molecule`: no matches. P2-E comprehensive remediation did not reintroduce raw network access in L1/L3.
- `rg -n "@l2|l2-coordinator" src/l4-atom`: no matches. L4 remains independent of L2.
- `rg -n "ai\.phase" src/l1-entry src/l3-molecule`: no matches.
- `rg -n "dangerouslySetInnerHTML|AppleButton|GlassPanel" src/l1-entry src/l3-molecule`: no matches.
- `AppLayout.tsx` is now presentational for the shell privacy/dev-console/settings actions; `useAppShellCommander()` owns store reads, navigation, and window material coordination in L2.
- `UpdateNotificationView.tsx` is now presentational; `useUpdateNotificationCommander()` owns updater state/actions and `updateNotificationViewModel.ts` is in L2. The dialog focus-restore path no longer refocuses during status transitions.
- Focused L1/common-shell token scan passed for the remediated files: `SetupCenterView.tsx`, `SettingsView.tsx`, `WorkbenchShellView.tsx`, `WorkbenchView.tsx`, and `UpdateNotificationView.tsx` have no `style={{ ... }}` usages.

Remaining L3 commander/store exceptions are explicit staged debt rather than a clean global pass:

| Scope | Files | Current status | Exit criterion |
| --- | --- | --- | --- |
| Semantic module root | `src/l3-molecule/semantic/AiPanel.tsx` | Accepted P2-D module-root bridge. Leaf semantic components receive props. | Move orchestration into an L2/L1 container if semantic module roots must become pure molecules. |
| Graph module root | `src/l3-molecule/graph/GraphModule.tsx` | Accepted P2-D module-root bridge. Graph leaf panels/canvas receive props. | Move graph orchestration into an L2/L1 container if graph module roots must become pure molecules. |
| Dev console shell tool | `src/l3-molecule/common/DevConsole.tsx` | Uses `useDevConsoleCommander()` directly as an existing shell tool. | Split into an L2 container plus presentational console view. |
| Setup workflow molecules | `SetupModeChooser`, `ConfigImportPanel`, `ManualAdvancedConfigPanel`, `ServiceControlPanel`, `ReadinessChecklist`, `DiagnosticPanel`, `SetupStepper` | Existing setup components still read setup commanders/stores in localized places. | Route all setup state/actions through `useSetupCenterCommander()` and pass props into setup leaves. |
| Chat/search legacy roots | `ChatView`, `ConversationList`, `MessageList`, `SearchResults`, `GlobalSearch` | Existing chat/search roots still bridge L2 state. They do not call raw network atoms. | Future P2-F/P3 cleanup: split each root into L2 container + props-only L3 views. |
| Type-only shell imports | `StatusBar.tsx`, `ReadinessStatePanel.tsx` | Uses L2 types/helpers for shell display compatibility. | Move stable display types/helpers to neutral local UI/domain modules if global props-only L3 enforcement becomes required. |

# Code Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address the urgent findings in `Code review.md` without regressing P0/P1/P2-A behavior.

**Architecture:** Move ready-workbench orchestration out of `DashboardView` into an L2 workbench commander/view-model. Keep L1 pages as layout wrappers, make Graph a workbench inspector module instead of a floating overlay, and migrate the visible Setup/Settings/Stats/Semantic surfaces onto tokenized L4 controls.

**Tech Stack:** React 18, TypeScript 5, Zustand, Vitest, Vite, Tauri v2, lucide-react, existing CSS tokens in `src/styles`.

---

## File Structure

- Create: `src/l2-coordinator/commander/workbenchViewModel.ts`
- Create: `src/l2-coordinator/commander/workbenchViewModel.test.ts`
- Create: `src/l2-coordinator/commander/useWorkbenchCommander.ts`
- Create: `src/l1-entry/pages/WorkbenchView.tsx`
- Create: `src/l3-molecule/graph/GraphModule.tsx`
- Create: `src/l4-atom/ui/formControl.ts`
- Create: `src/l4-atom/ui/formControl.test.ts`
- Create: `src/l4-atom/ui/Field.tsx`
- Create: `src/l4-atom/ui/Select.tsx`
- Create: `src/l4-atom/ui/SegmentedControl.tsx`
- Modify: `src/l1-entry/pages/DashboardView.tsx`
- Modify: `src/l1-entry/pages/WorkbenchShellView.tsx`
- Modify: `src/l2-coordinator/commander/index.ts`
- Modify: `src/l3-molecule/workbench/WorkbenchRail.tsx`
- Modify: `src/l3-molecule/workbench/WorkbenchFrame.tsx`
- Modify: `src/l3-molecule/chat/ContactList.tsx`
- Modify: `src/l3-molecule/graph/GraphCanvas.tsx`
- Modify: `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx`
- Modify: `src/l3-molecule/settings/*.tsx`
- Modify: `src/l3-molecule/stats/*.tsx`
- Modify: `src/l3-molecule/semantic/TopicView.tsx`
- Modify: `src/l3-molecule/semantic/ContactProfile.tsx`
- Modify: `src/styles/layout.css`
- Modify: `src/styles/globals.css`
- Modify: `task_plan.md`, `findings.md`, `progress.md`

## Task 1: Workbench View Model Tests

- [x] Write `workbenchViewModel.test.ts` for single-pane list/detail behavior, one active module at a time, and graph inspector titles.
- [x] Run `pnpm test src/l2-coordinator/commander/workbenchViewModel.test.ts`; expected failure because helper does not exist.
- [x] Implement `workbenchViewModel.ts`.
- [x] Re-run the same test; expected pass.

## Task 2: Form Control Tests

- [x] Write `formControl.test.ts` for class name generation and touch-size behavior.
- [x] Run `pnpm test src/l4-atom/ui/formControl.test.ts`; expected failure because helper does not exist.
- [x] Implement `formControl.ts`, `Field`, `Select`, `SegmentedControl`, and update `Input`.
- [x] Re-run the same test; expected pass.

## Task 3: L2 Workbench Commander And L1 Wrapper

- [x] Implement `useWorkbenchCommander` to aggregate chat/search/stats/AI/Graph orchestration and viewport-derived layout state.
- [x] Add `WorkbenchView.tsx` as the ready-workbench root.
- [x] Replace `DashboardView.tsx` with a compatibility wrapper that renders `WorkbenchView`.
- [x] Change `WorkbenchShellView.tsx` to render `WorkbenchView` when `dbReady`.
- [x] Verify with `pnpm typecheck`.

## Task 4: Navigation, Single-Pane Return, And Graph Module

- [x] Update `WorkbenchRail` to accept `activeModule` and only render one active item.
- [x] Add a list/detail state path so single mode can return to the conversation list after selecting a conversation.
- [x] Replace floating `graph.visible && <LazyGraphCanvas />` with a graph inspector/drawer module.
- [x] Rewrite `GraphCanvas` as an embedded module surface without fixed positioning, drag/resize/minimize, or emoji.
- [x] Verify with `pnpm test src/l2-coordinator/commander/workbenchViewModel.test.ts src/l3-molecule/workbench/workbenchLayout.test.ts`.

## Task 5: Design System Coverage

- [x] Update `ManualAdvancedConfigPanel` to use `Field`, `Input`, `Select`, `SegmentedControl`, `Button`, and `Surface`.
- [x] Replace Settings `GlassPanel`/native inputs with `Surface`, tokenized controls, and segmented controls.
- [x] Replace Stats `GlassPanel` surfaces with `Surface`.
- [x] Replace Semantic analysis `GlassPanel` surfaces with `Surface`.
- [x] Add mobile touch target overrides for `.ui-button`, `.ui-icon-button`, and rail/settings buttons.
- [x] Verify no `GlassPanel` remains in Settings/Stats/Semantic with `rg`.

## Task 6: Full Verification

- [x] Run `pnpm lint`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm test`.
- [x] Run `pnpm build`.
- [x] Reuse or start the Vite dev server and browser-smoke `/`, `/workbench`, `/settings` at desktop and 390px widths.
- [x] Record verification output and any residual Graph chunk warning in `progress.md`.

## Acceptance Criteria

- `WorkbenchShellView` renders `WorkbenchView`, and `DashboardView` is only a compatibility entry.
- Ready-workbench business effects live in L2 `useWorkbenchCommander`, not in L1.
- Graph is no longer rendered as a fixed floating overlay and has no emoji icon.
- In single mode, selected conversations have a visible “返回会话列表” path.
- Settings/Stats/Semantic visible surfaces no longer use `GlassPanel`.
- Workbench rail allows only one active module and includes Graph/Settings navigation state.
- Mobile/touch controls use larger hit targets.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.

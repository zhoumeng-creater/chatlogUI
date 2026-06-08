# 2026-06-08 Desktop Shell Step 3 High-Impact Control Migration Plan

> Scope: detailed repair plan for the fourth remediation step requested by the user. The parent remediation plan numbers this as `Step 3` because it starts at `Step 0`; in user-facing wording this is the fourth step: high-impact control migration.
>
> User constraint: this document intentionally does not include full implementation code. It defines current evidence, exact files, ownership, target behavior, tests, governance, verification, and handoff rules.

## 1. Goal

Migrate the remaining high-impact compact controls and disabled-control states onto the shared tooltip and disabled-reason contracts created in the previous remediation slices.

This step targets the remaining acceptance gap for:

- `P2-13`: tooltip affordance coverage is inconsistent and not accessibility/test gated.
- `P2-14`: disabled controls often lack a visible reason or recovery hint.

The practical goal is:

- remaining command-style native `title` usage is removed from the highest-impact controls;
- icon-only and compact command controls use `IconButton` plus shared `Tooltip`, or an equivalent shared tooltip contract where `IconButton` is not the right component;
- high-impact disabled states distinguish why the control is unavailable and what the user can do next;
- keyboard users can discover the same command explanations and recovery paths as pointer users;
- tests and governance shrink the explicit debt ledger instead of silently allowing more one-off controls.

This step does not close all UI debt in the product. It is the targeted migration slice between primitive foundation and final acceptance/ledger closure.

## 2. Inputs Reviewed

Primary planning and issue inputs:

- `docs/superpowers/plans/2026-06-08-desktop-shell-micro-affordance-remediation.md`
- `2026-06-08-desktop-shell-baseline-tests-governance-plan.md`
- `2026-06-08-desktop-shell-window-controls-shared-shell-plan.md`
- `2026-06-08-desktop-shell-tooltip-disabled-reason-primitives-plan.md`
- `product-acceptance-issue-ledger.md`
- `ux-micro-affordance-opportunities.md`
- `task_plan.md`
- `findings.md`
- `progress.md`

Acceptance and development constraints:

- `AGENTS.md`
- `docs/product-acceptance-standards.md`
- `docs/ui-development-standards.md`
- `.specify/memory/constitution.md`
- `specs/001-ready-desktop-app/spec.md`
- `specs/001-ready-desktop-app/plan.md`
- `specs/001-ready-desktop-app/tasks.md`
- `specs/001-ready-desktop-app/architecture-boundary-check.md`
- `docs/总体开发规划.md`
- `开发指南.md`
- `docs/ui-functional-audit-and-redesign-plan.md`

Current source and test baseline:

- `src/l4-atom/ui/Tooltip.tsx`
- `src/l4-atom/ui/IconButton.tsx`
- `src/l4-atom/ui/DisabledReason.tsx`
- `src/l4-atom/ui/Tooltip.test.tsx`
- `src/l4-atom/ui/DisabledReason.test.tsx`
- `src/l3-molecule/workbench/WorkbenchRail.tsx`
- `src/l3-molecule/workbench/workbenchAccessibility.ts`
- `src/l3-molecule/workbench/workbenchAccessibility.test.ts`
- `src/l3-molecule/graph/GraphControlBar.tsx`
- `src/l3-molecule/graph/GraphTimeline.tsx`
- `src/l3-molecule/graph/GraphTimelineWorkbench.tsx`
- `src/l3-molecule/graph/GraphAdvancedPanel.tsx`
- `src/l3-molecule/graph/GraphAdvancedPanel.test.tsx`
- `src/l3-molecule/graph/GraphQAPanel.tsx`
- `src/l3-molecule/graph/GraphQAPanel.test.tsx`
- `src/l3-molecule/media/MediaLibrary.tsx`
- `src/l3-molecule/media/MediaLibrary.test.tsx`
- `src/l3-molecule/media/MediaPreviewSheet.tsx`
- `src/l3-molecule/search/SearchScopeMenu.tsx`
- `src/l3-molecule/search/SearchScopeMenu.test.tsx`
- `src/l3-molecule/semantic/QAInput.tsx`
- `src/l3-molecule/semantic/QAInput.test.tsx`
- `src/l3-molecule/semantic/SemanticIndexPreview.tsx`
- `src/l3-molecule/semantic/SemanticQAEvidenceDrawer.tsx`
- `src/l3-molecule/developer/DbExplorer.tsx`
- `src/l3-molecule/developer/DbSearchPanel.tsx`
- `src/l3-molecule/developer/EndpointRunner.tsx`
- `src/l3-molecule/developer/EndpointRunner.test.tsx`
- `src/l3-molecule/developer/HookConfigPanel.tsx`
- `src/l3-molecule/developer/HermesBridgePanel.tsx`
- `src/l3-molecule/developer/SqlQueryPanel.tsx`
- `src/l3-molecule/diagnostics/DiagnosticCopyButton.tsx`
- `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx`
- `src/styles/layout.css`
- `src/styles/workbench-content.css`
- `scripts/ui-governance.test.mjs`
- `e2e/specs/core.spec.ts`
- `e2e/specs/a11y.spec.ts`
- `e2e/specs/visual.spec.ts`

## 3. Current Progress

Do not treat this step as a primitive-foundation step. The current worktree already includes Step 1 and Step 2 source/test work.

Completed or source-implemented foundation:

- `Tooltip` supports stable id generation, `aria-describedby` merging, placement variants, delayed pointer reveal, immediate focus reveal, and narrow-safe wrapping.
- `IconButton` no longer emits a native `title` fallback. It preserves `aria-label={label}` and accepts `tooltip` plus `tooltipPlacement`.
- `DisabledReason` exists as an L4 UI primitive with stable/generated ids, existing-description merging, and `sr-only`, `inline`, and `compact` variants.
- The first high-impact disabled-reason pass already migrated `DbSearchPanel`, `MediaLibrary`, `SearchScopeMenu`, `QAInput`, `GraphAdvancedPanel`, and `GraphQAPanel` away from local raw `p.sr-only` reason blocks.
- `scripts/ui-governance.test.mjs` now requires `IconButton` call sites to pass tooltip copy and keeps high-impact disabled-reason usage on the shared primitive.

Current known remaining debt:

- `WorkbenchRail.tsx` still uses `title={accessibleLabel}` on command buttons.
- `GraphControlBar.tsx` still uses native `title` for refresh and auto-rotate icon commands.
- `GraphTimeline.tsx` still uses native `title` for the close control, and its timeline entries are clickable `div` elements rather than keyboard-operable controls.
- `StatusIndicator`, `GraphFallbackTable`, `TrendChart`, `EndpointRunner`, `AppLayout`, and `SemanticSetupCenter` still have `title=` usage, but several are data-display truncation or non-command labels. They should stay explicitly classified instead of swept into command migration without review.
- `QAInput` explains privacy-mode disabling, but not all common disabled categories: empty question, selected-scope-with-no-selected-chat, and streaming/busy states.
- `SemanticIndexPreview` previous/next page buttons can be disabled without a reason for first/last page or loading.
- `DbExplorer`, `EndpointRunner`, `SqlQueryPanel`, `HookConfigPanel`, `HermesBridgePanel`, `DiagnosticCopyButton`, and diagnostics export controls have loading/privacy/not-ready disabled states that are not consistently described.
- `MediaPreviewSheet` uses a small text button with an icon for close and a raw link for opening an attachment. Full media dialog/safe-open remediation belongs to separate ledger items, but close/open affordance copy can be improved in this migration slice without changing the resource-open contract.

Step 1 caveat:

- `P0-05` still needs real native Tauri click smoke before being marked fully remediated. This plan may reference the shared shell as the source baseline, but it must not hide that native-smoke caveat inside P2 control migration.

## 4. User-Task Check

Real user task:

The user must understand what dense controls do and why important actions are unavailable while browsing, searching, using AI, exploring graph data, inspecting media, or running local diagnostics.

First action:

When a compact icon appears, the user can hover or focus it to get a short command explanation. When a visible action is disabled, the user can read a concise reason and recovery path near the control or through its accessible description.

Duplicate entry points:

This migration should not add new product entry points. It should make existing rail, graph, media, semantic, developer, and diagnostics controls clearer through the shared primitives.

Recovery:

Disabled reasons should tell the user what to do next: select a conversation, choose a scope, enter a question, wait for loading to finish, turn off privacy mode, save required configuration, or move to another page boundary.

Missing adjacent function:

Some adjacent issues are real but outside this slice: target-size atom defaults, Field hint association, media preview dialog focus lifecycle, diagnostic full-path success copy, and release evidence. This plan should not claim those are fixed unless the implementation explicitly expands scope and verifies them.

## 5. Architecture Ownership

| Concern | Owner | Required shape |
| --- | --- | --- |
| Tooltip primitive | L4 UI | Keep `Tooltip` generic; do not add product strings or state. |
| Icon command rendering | L4 UI plus L3 usage | Prefer `IconButton` for icon-only commands. If a component must keep a custom button, wrap it in `Tooltip` and keep the same accessibility contract. |
| Disabled reason rendering | L4 UI plus L3 usage | Use `DisabledReason` for reason id/description linkage. L4 does not know why the action is disabled. |
| Reason and tooltip copy | L2/L3 view usage | Copy is static, localized, and redaction-safe. L2 may provide derived safe state labels; L3 renders them. |
| Workbench navigation | L3 molecule | `WorkbenchRail` remains presentational and receives items/callbacks; no network/store calls. |
| Graph controls | L3 graph molecules | Controls remain props-driven and do not touch graph stores or network atoms. |
| Developer diagnostics | L3 developer/diagnostics molecules | Existing props-driven surfaces stay local; no new L2 runtime imports. |
| Governance | Scripts/tests | Shrink known debt and prevent new command-title or disabled-reason bypasses. |
| Privacy | UI copy plus E2E scan | Tooltip, `aria-label`, `aria-describedby`, placeholders, visible text, and snapshots stay free of raw private data. |

## 6. Scope And Target Classification

### 6.1 Must Migrate In This Step

These are high-impact command controls with direct user confusion risk and current native-title or one-off affordance debt.

| Area | Files | Migration target |
| --- | --- | --- |
| Workbench collapsed rail | `src/l3-molecule/workbench/WorkbenchRail.tsx`, `workbenchAccessibility.test.ts` | Replace native `title` with shared tooltip. Preserve action-oriented accessible labels such as `打开AI模块`. Use `right` placement when labels are hidden. |
| Graph visual control icons | `src/l3-molecule/graph/GraphControlBar.tsx` | Replace refresh and auto-rotate native `title` with `IconButton` plus tooltip or a shared Tooltip-wrapped command. Preserve `aria-pressed` for auto-rotate. |
| Graph timeline close | `src/l3-molecule/graph/GraphTimeline.tsx` | Replace native `title` with shared tooltip and a stable accessible button. Keep the compact close affordance recognizable. |
| Graph timeline entries | `src/l3-molecule/graph/GraphTimeline.tsx` | Convert clickable timeline entries to real buttons or equivalent keyboard-operable controls with `aria-pressed` or selected state. Preserve privacy-masked display. |
| QA entity override clear | `src/l3-molecule/semantic/QAInput.tsx` | Replace the custom small clear button with `IconButton` and tooltip. Preserve `清除实体限定` label. |
| Media preview close | `src/l3-molecule/media/MediaPreviewSheet.tsx` | Use shared icon command pattern for the close action. Do not solve the whole media dialog focus lifecycle in this slice unless implementation evidence shows the close migration requires it. |

### 6.2 Must Improve Disabled Reasons In This Step

These controls block likely user tasks and should expose specific unavailable reasons beyond privacy-only coverage.

| Area | Files | Required reason categories |
| --- | --- | --- |
| Semantic QA composer | `src/l3-molecule/semantic/QAInput.tsx`, `QAInput.test.tsx` | Empty question, selected scope with no selected chats, privacy mode, streaming/busy. |
| Semantic index preview pager | `src/l3-molecule/semantic/SemanticIndexPreview.tsx` | No previous page, no next page, loading. |
| Developer DB table controls | `src/l3-molecule/developer/DbExplorer.tsx` | No selected table, loading table data, first/last page boundaries, privacy-blocked table filter. |
| API Runner execute controls | `src/l3-molecule/developer/EndpointRunner.tsx`, `EndpointRunner.test.tsx` | Loading, missing required params or can-run false, destructive confirmation pending. |
| Read-only SQL runner | `src/l3-molecule/developer/SqlQueryPanel.tsx` | Privacy mode, read-only guard disallowing SQL, empty/invalid draft, loading. |
| Hook/Hermes config saves | `HookConfigPanel.tsx`, `HermesBridgePanel.tsx` | Privacy mode, saving, incomplete required config, bridge not editable. |
| Diagnostics copy/export | `DiagnosticCopyButton.tsx`, `DiagnosticsPanel.tsx` | Redaction blocked, export in progress. |

### 6.3 Explicitly Classify But Do Not Necessarily Migrate

These `title=` cases are not all the same. The implementation should classify them and update governance so future reviewers can tell command debt from data-display debt.

| File | Current title usage | Step 3 decision |
| --- | --- | --- |
| `src/l4-atom/ui/StatusIndicator.tsx` | status title for compact data/status display | Keep or convert only if a status-detail popover is implemented. Do not force into command tooltip migration. |
| `src/l3-molecule/graph/GraphFallbackTable.tsx` | truncated label/detail values | Treat as data-display truncation. Keep explicit allowlist unless a table detail pattern is added. |
| `src/l3-molecule/stats/TrendChart.tsx` | chart point detail | Treat as data-display chart detail. Keep explicit allowlist until chart tooltip/table work. |
| `src/l3-molecule/developer/EndpointRunner.tsx` | `RawResponsePreview` title string | Classify as section title, not native command tooltip, if no `title=` attribute remains at the command level. |
| `src/l3-molecule/common/AppLayout.tsx` | app title data attribute or title prop on shell component | Do not change unless it is a DOM native title attribute in production markup. |
| `src/l3-molecule/semantic/SemanticSetupCenter.tsx` | provider card title labels | Do not migrate unless they are DOM native title attributes rather than normal section title props. |

### 6.4 Non-Goals For This Step

- Do not redesign Workbench navigation hierarchy or remove duplicate toolbar navigation from `P1-01`.
- Do not change sidecar APIs, network adapters, service base URL, Tauri CSP, capabilities, updater config, or release workflow.
- Do not fix all target-size atom defaults from `P2-01`; only ensure touched compact controls do not shrink below project standards.
- Do not fix `Field` description binding from `P2-03`.
- Do not claim media preview dialog focus lifecycle from `P2-11` is fully remediated unless the implementation deliberately expands and verifies that item.
- Do not claim diagnostic full-path success copy from `P2-06` is fixed unless it is separately implemented and verified.
- Do not migrate every data-display `title` or every disabled button in the repository.

## 7. Planned Test Changes

### 7.1 Workbench Rail Tests

Modify:

- `src/l3-molecule/workbench/workbenchAccessibility.test.ts`
- Optionally add `src/l3-molecule/workbench/WorkbenchRail.test.tsx` if static markup assertions are clearer than helper tests.

Required assertions:

- Rail buttons keep action-oriented accessible labels.
- Collapsed rail buttons expose tooltip descriptions through `aria-describedby`.
- The rendered rail no longer includes native `title=` for command explanation.
- Badge rendering and `aria-current="page"` are preserved.

Expected first RED:

- A new static render assertion should fail until `WorkbenchRail` stops using native `title` and adopts the shared tooltip contract.

### 7.2 Graph Control Tests

Create or modify:

- `src/l3-molecule/graph/GraphControlBar.test.tsx`
- `src/l3-molecule/graph/GraphTimeline.test.tsx`

Required assertions:

- Refresh graph and auto-rotate commands have accessible labels and shared tooltip descriptions.
- Auto-rotate preserves `aria-pressed` when active.
- Graph command markup has no native `title=` for command explanations.
- Timeline close command has shared tooltip description.
- Timeline entries are keyboard-operable controls, not pointer-only clickable `div` elements.
- Timeline selected/highlighted state remains visible and accessible.
- Privacy-masked timeline text remains masked after the migration.

Expected first RED:

- `GraphControlBar` should fail on native `title`.
- `GraphTimeline` should fail on native `title` and pointer-only timeline entries.

### 7.3 Semantic QA And Preview Tests

Modify:

- `src/l3-molecule/semantic/QAInput.test.tsx`

Optionally create:

- `src/l3-molecule/semantic/SemanticIndexPreview.test.tsx`

Required assertions:

- Privacy-mode disabled reason remains visible or accessible and still uses `DisabledReason`.
- Empty question disables send with a specific reason such as entering a question first.
- Selected-scope send disables when no chats are selected with a reason that tells the user to choose at least one chat.
- Streaming state exposes why source controls are locked and keeps the stop action available.
- Entity override clear uses the shared icon command tooltip.
- Semantic preview previous/next buttons describe first-page, last-page, and loading disabled states.

Expected first RED:

- Current `QAInput` has privacy reason coverage but not the other disabled categories.
- Current entity clear control is a custom small button without shared tooltip.
- Current semantic preview pager disables previous/next without an explicit reason.

### 7.4 Developer And Diagnostics Tests

Modify:

- `src/l3-molecule/developer/EndpointRunner.test.tsx`

Create or extend focused component tests only where the component has enough logic to justify it:

- `src/l3-molecule/developer/DbExplorer.test.tsx`
- `src/l3-molecule/developer/SqlQueryPanel.test.tsx`
- `src/l3-molecule/developer/HookConfigPanel.test.tsx`
- `src/l3-molecule/developer/HermesBridgePanel.test.tsx`
- `src/l3-molecule/diagnostics/DiagnosticCopyButton.test.tsx`
- `src/l3-molecule/diagnostics/DiagnosticsPanel.test.tsx`

Required assertions:

- API Runner disabled run states are described for loading and cannot-run reasons.
- Destructive confirmation copy remains two-step and still distinguishes "需要确认" from "确认运行".
- DB table load/pager disabled states are described for no selected table, first page, no next page, and loading.
- SQL run disabled state describes privacy mode and guard failure.
- Hook/Hermes save disabled states describe privacy mode and incomplete config without revealing draft values.
- Diagnostic copy/export disabled states describe redaction-blocked or exporting states.

Expected first RED:

- Current tests cover privacy masking and destructive confirmation, but not disabled reasons for run/copy/save/pager controls.

### 7.5 Browser A11y And Visual Tests

Modify:

- `e2e/specs/a11y.spec.ts`
- `e2e/specs/core.spec.ts` only if route-level assertions are useful.
- `e2e/specs/visual.spec.ts` only if visible inline/compact disabled reasons change layout.

Required browser checks:

- Workbench rail command tooltips are keyboard/focus discoverable at desktop and narrow widths.
- Graph control command tooltips stay inside the viewport.
- Graph timeline entries can be focused and activated by keyboard.
- At least one representative disabled reason in AI or developer tools is exposed through `aria-describedby` in browser mode.
- Privacy scan remains active after showing tooltip/reason text.

Visual checks:

- If visible `inline` or `compact` reasons are added in AI, graph, developer, media, or diagnostics surfaces, run visual snapshots that already cover `semantic-index-center`, `semantic-qa-evidence`, `graph-workbench`, and `developer-hook`.
- Do not update snapshots casually. Only update after confirming the layout change is intentional and privacy-safe.

## 8. Planned Source Changes

### 8.1 Workbench Rail Migration

Modify:

- `src/l3-molecule/workbench/WorkbenchRail.tsx`
- `src/l3-molecule/workbench/workbenchAccessibility.ts`
- `src/styles/layout.css`

Required behavior:

- Remove native `title={accessibleLabel}` from rail command buttons.
- Wrap rail item buttons with `Tooltip` or render them through `IconButton` if the component can preserve existing class and badge behavior.
- Use `placement="right"` when rail labels are hidden.
- Keep visible text labels when `showLabels` is true.
- Keep `aria-label` as the action-oriented label from `getWorkbenchRailButtonLabel`.
- Keep active state, badge, and click handler behavior unchanged.
- Ensure tooltip bubble does not widen the rail, overlap the titlebar, or create horizontal overflow at narrow widths.

Exit:

- Workbench rail tests pass.
- `scripts/ui-governance.test.mjs` removes `WorkbenchRail.tsx: title={accessibleLabel}` from `knownNativeTitleUsage`.

### 8.2 Graph Control Bar Migration

Modify:

- `src/l3-molecule/graph/GraphControlBar.tsx`
- `src/styles/layout.css`

Required behavior:

- Replace refresh and auto-rotate native `title` attributes with shared tooltip behavior.
- Prefer `IconButton` for pure icon commands if it can preserve target size and `aria-pressed`; otherwise use `Tooltip` around the current `Button` and remove native `title`.
- Keep `aria-label="刷新图谱"` and `aria-label="自动旋转"`.
- Keep `aria-pressed={autoRotate}` on auto-rotate.
- Use a tooltip placement that avoids clipping inside the graph toolbar.
- Preserve graph canvas behavior and do not introduce a graph state/store import.

Exit:

- Graph control tests pass.
- `GraphControlBar.tsx` native command-title entries are removed from governance allowlist.

### 8.3 Graph Timeline Migration

Modify:

- `src/l3-molecule/graph/GraphTimeline.tsx`
- `src/styles/layout.css`

Required behavior:

- Replace close control native `title` with shared tooltip.
- Convert timeline entries from clickable `div` to keyboard-operable controls or an equivalent focusable pattern with explicit key handling. A real button is preferred unless existing layout semantics require another element.
- Preserve highlight selection state.
- Use `aria-pressed` or `aria-current` where appropriate for the highlighted entry.
- Preserve `getGraphTimelineDisplay()` privacy masking.
- Keep long timeline text wrapping/truncation stable.

Exit:

- Timeline tests pass.
- Browser a11y test can focus and activate a timeline entry.
- `GraphTimeline.tsx: title="关闭时间轴"` is removed from governance allowlist.

### 8.4 Semantic QA Control Migration

Modify:

- `src/l3-molecule/semantic/QAInput.tsx`
- `src/l3-molecule/semantic/QAInput.test.tsx`
- `src/styles/layout.css`

Required behavior:

- Keep existing privacy-mode inline disabled reason.
- Add specific `DisabledReason` coverage for:
  - empty question before send;
  - selected-scope without selected chats;
  - streaming/busy state for controls locked while generation is active;
  - privacy mode.
- Do not hide or disable the stop action while streaming.
- Replace the entity override clear custom icon button with shared `IconButton` plus tooltip.
- Ensure reason text does not include the user's raw question or selected chat names.
- Keep Enter/Shift+Enter behavior unchanged.

Exit:

- QAInput tests cover privacy, empty question, selected-scope, streaming, and entity-clear tooltip.
- No private question text appears in reason copy.

### 8.5 Semantic Preview Pager Migration

Modify:

- `src/l3-molecule/semantic/SemanticIndexPreview.tsx`
- `src/styles/layout.css`

Required behavior:

- Add disabled reasons for previous/next pager buttons:
  - first page or no previous page;
  - last page or no next page;
  - preview loading.
- Use compact visible text only if layout can accommodate it without making the pager jump; otherwise use screen-reader-only reason plus stable nearby status copy.
- Keep preview row privacy masking unchanged.

Exit:

- Semantic preview test passes if added.
- Browser/visual checks show the pager does not shift unexpectedly.

### 8.6 Media Preview Affordance Migration

Modify:

- `src/l3-molecule/media/MediaPreviewSheet.tsx`
- `src/styles/workbench-content.css`

Required behavior:

- Use shared icon command pattern for `关闭媒体预览`.
- If the attachment link remains a raw link, add clear visible/link copy that does not expose local paths. Full safe-open confirmation remains a later issue unless explicitly implemented.
- Preserve media preview output for image, sticker, video, voice, and unsupported attachment states.
- Do not change resource URL allowlisting or system open behavior in this slice.

Exit:

- Media preview close control has accessible label and tooltip.
- No new local path or raw resource URL is exposed in normal visible copy.

### 8.7 Developer Tools Disabled-Reason Migration

Modify in priority order:

- `src/l3-molecule/developer/DbExplorer.tsx`
- `src/l3-molecule/developer/EndpointRunner.tsx`
- `src/l3-molecule/developer/SqlQueryPanel.tsx`
- `src/l3-molecule/developer/HookConfigPanel.tsx`
- `src/l3-molecule/developer/HermesBridgePanel.tsx`
- `src/styles/workbench-content.css`

Required behavior:

- Use `DisabledReason` for disabled controls where the blocked action is likely:
  - DB refresh/loading and table load/pager boundaries;
  - API Runner cannot run because parameters are missing, endpoint requires confirmation, or request is loading;
  - SQL cannot run because privacy mode is on, guard disallows the query, draft is empty/invalid, or request is loading;
  - Hook/Hermes cannot save because privacy mode is on, required draft fields are incomplete, bridge is not editable, or save is in progress.
- Keep copy generic and privacy-safe. Do not include SQL draft text, endpoint parameter values, tokens, URLs, local paths, account ids, table names from real data, or raw response previews.
- Keep developer tool density. Prefer `sr-only` or `compact` reasons for dense advanced controls unless the disabled state blocks a primary local action.
- Do not add network calls or sidecar changes.

Exit:

- Focused developer tests pass.
- Governance treats these files as migrated or explicitly staged with a reason.

### 8.8 Diagnostics Control Migration

Modify:

- `src/l3-molecule/diagnostics/DiagnosticCopyButton.tsx`
- `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx`

Required behavior:

- Describe why copy is disabled when `report.redactionOk` is false.
- Describe export-in-progress or redaction-blocked states when applicable.
- Keep export result copy privacy-safe. If the implementation chooses to fix the existing full-path success message, record it as a separate `P2-06` improvement and verify it explicitly.
- Keep the user-triggered diagnostic export boundary; do not add automatic diagnostic collection.

Exit:

- Diagnostics tests pass if added.
- No raw private path is introduced through new reason or tooltip text.

## 9. CSS And Layout Requirements

Modify:

- `src/styles/layout.css`
- `src/styles/workbench-content.css`

Required behavior:

- Tooltip wrappers around rail and graph controls must not disrupt grid/flex sizing.
- Rail tooltip placement should not create horizontal overflow.
- Icon command targets should meet the existing `IconButton` size contract. Touched small command controls should not become smaller than the current project default for toolbar/icon controls.
- Visible disabled reasons should use existing token colors and spacing. They should not look like new cards.
- Compact disabled reasons should wrap predictably and should not push bottom actions off-screen.
- Graph timeline button conversion should preserve row spacing and highlighted state.
- Developer and diagnostics dense panels should remain readable without turning into large explanatory blocks.

Responsive checks:

- `<720px`: rail/drawer/tooltips must not overflow the viewport.
- `720-980px`: compact graph and developer controls remain scannable.
- `980-1280px` and desktop: added helper copy does not crowd main workbench content.

## 10. Governance Changes

Modify:

- `scripts/ui-governance.test.mjs`

Required changes:

- Remove migrated command native-title entries from `knownNativeTitleUsage`:
  - `src/l3-molecule/workbench/WorkbenchRail.tsx: title={accessibleLabel}`
  - `src/l3-molecule/graph/GraphControlBar.tsx: title="刷新图谱"`
  - `src/l3-molecule/graph/GraphControlBar.tsx: title="自动旋转"`
  - `src/l3-molecule/graph/GraphTimeline.tsx: title="关闭时间轴"`
- Keep data-display title entries explicit if still present:
  - `GraphFallbackTable`
  - `TrendChart`
  - `StatusIndicator`
- Add a high-impact command migration ledger for files still allowed to contain custom compact command buttons.
- Add or tighten a rule that command-like icon-only buttons in migrated files must use `IconButton`/`Tooltip` and not native `title`.
- Add a disabled-reason tracked file list for newly migrated developer/semantic/diagnostics files. The test may start with an explicit staged ledger and should shrink it as each batch lands.
- Do not make governance so broad that unrelated legacy data-display titles fail the migration slice.

Exit:

- `pnpm test scripts/ui-governance.test.mjs` passes.
- New untracked command native-title usage fails.
- New untracked disabled controls in migrated high-impact files fail unless they expose a reason or are explicitly classified.

## 11. Command Plan

Before implementation:

- `pnpm test src/l4-atom/ui/Tooltip.test.tsx src/l4-atom/ui/DisabledReason.test.tsx`
- `pnpm test scripts/ui-governance.test.mjs`
- `pnpm test src/l3-molecule/workbench/workbenchAccessibility.test.ts`
- `pnpm test src/l3-molecule/developer/EndpointRunner.test.tsx src/l3-molecule/media/MediaLibrary.test.tsx src/l3-molecule/semantic/QAInput.test.tsx src/l3-molecule/graph/GraphAdvancedPanel.test.tsx src/l3-molecule/graph/GraphQAPanel.test.tsx`

Expected current status:

- Existing primitive and first-pass disabled-reason tests should be green in the current worktree.
- New WorkbenchRail, GraphControlBar, GraphTimeline, SemanticIndexPreview, DbExplorer, SQL, Hook/Hermes, and diagnostics disabled-reason tests should be RED when first added, because the migration is not yet implemented.

After Batch A command-title migration:

- `pnpm test src/l3-molecule/workbench/workbenchAccessibility.test.ts`
- `pnpm test src/l3-molecule/graph/GraphControlBar.test.tsx src/l3-molecule/graph/GraphTimeline.test.tsx`
- `pnpm test scripts/ui-governance.test.mjs`
- `pnpm typecheck`

After Batch B semantic/media migration:

- `pnpm test src/l3-molecule/semantic/QAInput.test.tsx src/l3-molecule/semantic/SemanticIndexPreview.test.tsx src/l3-molecule/media/MediaLibrary.test.tsx`
- `pnpm exec playwright test e2e/specs/a11y.spec.ts --grep "tooltip|semantic|keyboard"`
- `pnpm typecheck`

After Batch C developer/diagnostics disabled-reason migration:

- `pnpm test src/l3-molecule/developer/EndpointRunner.test.tsx`
- `pnpm test src/l3-molecule/developer/DbExplorer.test.tsx src/l3-molecule/developer/SqlQueryPanel.test.tsx src/l3-molecule/developer/HookConfigPanel.test.tsx src/l3-molecule/developer/HermesBridgePanel.test.tsx` if those tests are added
- `pnpm test src/l3-molecule/diagnostics/DiagnosticCopyButton.test.tsx src/l3-molecule/diagnostics/DiagnosticsPanel.test.tsx` if those tests are added
- `pnpm test scripts/ui-governance.test.mjs`
- `pnpm typecheck`

Browser/UI checks for the completed slice:

- `pnpm e2e:a11y`
- `pnpm e2e`
- `pnpm e2e:visual` if visible helper copy or graph timeline layout changes

Full source verification:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm verify`

Rust/Tauri:

- `cd src-tauri && cargo test` is not required unless the implementation unexpectedly changes Rust/Tauri files.
- `pnpm tauri build` is not required for this P2 control migration, but may be run in the final evidence step if bundled with desktop-shell release checks.

## 12. Sequencing

### Task 3.1: Confirm Current Baseline And Add RED Tests

Files:

- Current primitive tests
- Current governance test
- New or extended tests for WorkbenchRail, GraphControlBar, GraphTimeline, QAInput, SemanticIndexPreview, EndpointRunner, and selected developer/diagnostics controls

Work:

- Run the current green primitive/governance checks.
- Add focused RED tests for native command-title debt, keyboard-operable graph timeline entries, and missing disabled reasons.
- Record which failures map to which migration batch.

Exit:

- The implementer has clear RED evidence without touching production behavior first.

### Task 3.2: Migrate Workbench Rail

Files:

- `WorkbenchRail.tsx`
- `workbenchAccessibility.test.ts`
- optional `WorkbenchRail.test.tsx`
- `layout.css`
- `scripts/ui-governance.test.mjs`

Work:

- Replace native `title` with shared tooltip.
- Preserve action labels, visible labels, active state, and badges.
- Remove the WorkbenchRail native-title allowlist entry.

Exit:

- Rail tests and governance pass.

### Task 3.3: Migrate Graph Command Controls

Files:

- `GraphControlBar.tsx`
- `GraphTimeline.tsx`
- graph control/timeline tests
- `layout.css`
- `scripts/ui-governance.test.mjs`

Work:

- Replace refresh, auto-rotate, and close native command titles with shared tooltip behavior.
- Convert timeline entries to keyboard-operable controls.
- Preserve graph display privacy masking and selected/highlighted state.

Exit:

- Graph tests, governance, and focused browser keyboard checks pass.

### Task 3.4: Migrate Semantic QA And Preview Disabled Reasons

Files:

- `QAInput.tsx`
- `QAInput.test.tsx`
- `SemanticIndexPreview.tsx`
- optional `SemanticIndexPreview.test.tsx`
- `layout.css`

Work:

- Add reason categories for empty question, selected-scope missing chats, streaming/busy, first/last page, and loading.
- Replace entity-clear one-off icon button with shared icon command behavior.
- Keep privacy text and input masking unchanged.

Exit:

- Semantic tests pass.
- Browser a11y remains green for semantic QA evidence and tooltip/focus flows.

### Task 3.5: Migrate Media Preview Close Affordance

Files:

- `MediaPreviewSheet.tsx`
- `workbench-content.css`
- optional media preview test

Work:

- Apply shared icon command tooltip to the preview close action.
- Keep resource rendering unchanged.
- Add safe, non-path-revealing visible copy only if needed for the open attachment link.

Exit:

- Media checks pass and no new privacy text appears.

### Task 3.6: Migrate Developer And Diagnostics Disabled Reasons

Files:

- `DbExplorer.tsx`
- `EndpointRunner.tsx`
- `SqlQueryPanel.tsx`
- `HookConfigPanel.tsx`
- `HermesBridgePanel.tsx`
- `DiagnosticCopyButton.tsx`
- `DiagnosticsPanel.tsx`
- focused tests for the above files where added
- `workbench-content.css`
- `scripts/ui-governance.test.mjs`

Work:

- Add `DisabledReason` usage for likely blocked actions.
- Keep reasons compact and redaction-safe.
- Preserve destructive confirmation behavior in API Runner and cache clear flows.
- Avoid changing diagnostics export semantics except for reason/explanation text.

Exit:

- Developer/diagnostics tests pass.
- Governance staged debt is reduced and still passes.

### Task 3.7: Browser, Visual, And Privacy Acceptance

Files:

- `e2e/specs/a11y.spec.ts`
- `e2e/specs/core.spec.ts` only if route checks are expanded
- `e2e/specs/visual.spec.ts` only if layout changes require snapshot coverage

Work:

- Verify rail and graph command tooltips by keyboard/focus.
- Verify graph timeline keyboard activation.
- Verify representative disabled reasons in AI/developer surfaces.
- Run privacy scans after tooltip/reason text is visible.
- Run visual snapshots when visible helper text changes layout.

Exit:

- E2E/a11y/visual checks pass or documented blockers are recorded before final handoff.

### Task 3.8: Documentation And Handoff

Files:

- `product-acceptance-issue-ledger.md`
- `ux-micro-affordance-opportunities.md`
- `findings.md`
- `progress.md`

Work:

- Update `P2-13` and `P2-14` only according to actual coverage.
- If command-title debt remains only in data-display cases, state that precisely.
- Leave `P0-05` native Tauri click smoke caveat untouched unless Step 4 evidence separately closes it.
- Keep optional future opportunities such as status detail popovers, shortcut discovery, safe-open confirmations, target-size atom defaults, and modal focus fixes open unless implemented.

Exit:

- Documentation distinguishes high-impact migration completion from final acceptance closure.

## 13. Privacy And Copy Policy

Allowed copy:

- static command explanations such as `打开图谱模块`, `刷新图谱`, `关闭时间轴`, `关闭媒体预览`;
- generic recovery hints such as `先输入问题`, `选择至少一个会话后可发送`, `正在生成回答，完成或停止后可修改范围`;
- redaction-safe state copy such as `隐私模式下不可编辑此配置`, `当前没有上一页`, `请先选择数据库表`.

Forbidden copy:

- raw local paths;
- `dataKey`, API keys, provider keys, tokens, client secrets, or token-like examples;
- raw DB table names from a real environment;
- raw SQL draft text, endpoint parameter values, or response body snippets;
- raw user question text, selected chat names, graph draft content, private names, message content, or wxid-like identifiers;
- raw Tauri/sidecar errors unless translated and redacted upstream.

Copy rules:

- Say what the command does, not what icon shape is visible.
- For disabled states, say the reason and the next action when one exists.
- Keep tooltip copy short. If the explanation needs more than one sentence, use visible compact or inline reason text.
- Use Chinese for user-facing copy unless the surrounding developer-only section is intentionally English.

## 14. UI Acceptance

Controls:

- Icon-only commands have clear `aria-label`, shared tooltip description, and visible focus.
- Touched compact command targets meet the project icon-control target standard.
- Native `title` is not used for command explanations in migrated files.
- Disabled controls keep stable dimensions across loading, disabled, and enabled states.

Keyboard:

- Rail commands, graph toolbar commands, graph timeline entries, media preview close, and QA entity clear are reachable by keyboard.
- Disabled native controls are not the only way to discover a reason.
- Focus rings remain visible and are not hidden by tooltip bubbles.

Responsive:

- Tooltip and disabled-reason text do not create horizontal overflow.
- Narrow rail/drawer states remain operable.
- Graph and developer dense controls remain scannable.

Visual design:

- Do not add decorative cards, gradients, large helper paragraphs, or marketing-style copy.
- Keep dense operational surfaces quiet and utilitarian.
- Use existing tokens and class naming patterns.

## 15. Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Migration broadens into all UI debt | Keep scope to the target matrices and classify remaining title/data-display debt explicitly. |
| Tooltip wrappers break rail or graph layout | Add focused CSS and browser checks for desktop/narrow widths. |
| Disabled reasons make dense panels noisy | Use `sr-only` or `compact` variants for advanced dense controls; reserve visible inline reasons for primary workflow blockers. |
| Keyboard behavior regresses in graph timeline | Convert pointer-only entries to real buttons or tested equivalent controls. |
| Governance becomes too broad | Shrink known debt only for migrated files; keep data-display cases classified. |
| Copy leaks private content | Use static/redaction-safe copy and run privacy scans after tooltips/reasons are visible. |
| Tests become brittle | Assert accessible contract, reason copy, and absence of native command titles; avoid exact DOM-depth assertions. |

## 16. Acceptance Criteria For This Plan

This Step 3/fourth-step plan is ready when:

- it reflects the current Step 1/Step 2 source baseline rather than the older missing-primitive state;
- it identifies exact high-impact files and separates command-tooltip migration from disabled-reason migration;
- it classifies remaining native `title` debt instead of treating data-display title text as command tooltip debt;
- it preserves L1/L2/L3/L4 architecture boundaries;
- it defines RED tests, source changes, CSS/layout requirements, governance updates, browser evidence, and documentation handoff;
- it keeps privacy, target sizing, keyboard, responsive, and visual acceptance requirements explicit;
- it avoids full implementation code;
- it leaves unrelated product-acceptance ledger items open unless the implementation deliberately expands scope and verifies them.


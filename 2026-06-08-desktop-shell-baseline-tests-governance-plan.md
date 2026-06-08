# 2026-06-08 Desktop Shell Step 0 Baseline Tests And Governance Plan

> Scope: detailed repair plan for Step 0 of the Desktop Shell And Micro-Affordance remediation work.
>
> Constraint: this document intentionally does not include full implementation code. It defines files, expected behavior, RED/partial-RED evidence, governance shape, commands, and handoff criteria.

## 1. Goal

Create the test and governance baseline needed before implementing the desktop shell and micro-affordance fixes recorded in:

- `P0-05`: borderless desktop shell has no minimize, maximize/restore, or close controls.
- `P2-13`: tooltip affordance coverage is inconsistent and not accessibility/test gated.
- `P2-14`: disabled controls often lack a visible reason or recovery hint.

Step 0 must make the missing behavior measurable before production source changes. It should not add the actual window-control implementation, shared tooltip implementation, or disabled-reason primitive. Those belong to later remediation steps.

## 2. Inputs Reviewed

Primary planning and issue inputs:

- `docs/superpowers/plans/2026-06-08-desktop-shell-micro-affordance-remediation.md`
- `product-acceptance-issue-ledger.md`
- `ux-micro-affordance-opportunities.md`

Acceptance and development constraints:

- `AGENTS.md`
- `docs/product-acceptance-standards.md`
- `docs/ui-development-standards.md`
- `.specify/memory/constitution.md`
- `specs/001-ready-desktop-app/spec.md`
- `specs/001-ready-desktop-app/tasks.md`
- `specs/001-ready-desktop-app/architecture-boundary-check.md`
- `specs/001-ready-desktop-app/release-evidence.md`

Historical/current planning references:

- `task_plan.md`
- `findings.md`
- `progress.md`
- `docs/总体开发规划.md`
- `开发指南.md`
- `docs/ui-functional-audit-and-redesign-plan.md`

Current source and test baseline:

- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`
- `src/l1-entry/routes/index.tsx`
- `src/l1-entry/pages/SetupCenterView.tsx`
- `src/l1-entry/pages/WorkbenchShellView.tsx`
- `src/l1-entry/pages/WorkbenchView.tsx`
- `src/l1-entry/pages/SettingsView.tsx`
- `src/l2-coordinator/commander/useAppShellCommander.ts`
- `src/l2-coordinator/commander/appShellViewModel.ts`
- `src/l3-molecule/common/AppLayout.tsx`
- `src/l3-molecule/common/AppTitleBar.tsx`
- `src/l3-molecule/common/GlobalCommandCluster.tsx`
- `src/l4-atom/system/tauriRuntime.ts`
- `src/l4-atom/system/index.ts`
- `src/l4-atom/ui/Tooltip.tsx`
- `src/l4-atom/ui/IconButton.tsx`
- `src/l4-atom/ui/Button.tsx`
- `src/styles/layout.css`
- `scripts/ui-governance.test.mjs`
- `e2e/specs/core.spec.ts`
- `e2e/specs/a11y.spec.ts`
- `e2e/specs/visual.spec.ts`
- `e2e/utils/workbench.ts`
- `e2e/utils/viewport.ts`
- `e2e/utils/privacy-scan.ts`

## 3. Current Baseline Findings

Desktop shell:

- `src-tauri/tauri.conf.json` sets `decorations: false` and `transparent: true`, so native window chrome is removed.
- `src-tauri/capabilities/default.json` already allows close, minimize, and toggle-maximize. The missing behavior is frontend/system wiring, not a Tauri permission gap.
- `src/l3-molecule/common/AppTitleBar.tsx` has drag/no-drag regions, brand, center title, status, and actions, but no minimize, maximize/restore, or close controls.
- `src/l1-entry/pages/SetupCenterView.tsx` renders `setup-shell` directly and does not use shared `AppLayout`, so `/` is outside the common app shell.
- `/workbench`, `/dashboard`, and `/settings` pass through `AppLayout`, but they still lack window controls because `AppTitleBar` lacks them.

Micro-affordances:

- `src/l4-atom/ui/Tooltip.tsx` renders a visual `role="tooltip"` bubble only. It has no stable id, no trigger `aria-describedby`, no placement contract, and no delay policy.
- `src/l4-atom/ui/IconButton.tsx` uses `aria-label` and optional tooltip, but falls back to native `title={label}` when no tooltip is supplied.
- Existing `tooltip=` usage is limited: global privacy/dev/settings controls, workbench side drawer close, AI settings, and QA evidence close.
- Existing command-like native `title` debt includes workbench rail, graph refresh/auto-rotate, and graph timeline close. Data-display truncation `title` usage also exists and should not be treated the same as command affordances.

Disabled-state affordances:

- High-impact disabled states currently exist in media refresh, current-session search scope, developer DB search, semantic QA controls, graph advanced actions, and graph QA controls.
- Many disabled controls rely on surrounding copy, placeholders, or visual disabled styling; they do not consistently expose a specific reason and recovery path via visible text or accessible description.

Test/governance:

- `e2e/specs/core.spec.ts` checks setup, workbench, dashboard alias, and settings render, but not shared titlebar/window controls.
- `e2e/specs/a11y.spec.ts` checks representative axe and keyboard flows, but not titlebar control reachability or tooltip accessible linkage.
- `e2e/specs/visual.spec.ts` captures workbench/advanced module states, but does not include setup/settings titlebar control screenshots or titlebar overlap assertions.
- `scripts/ui-governance.test.mjs` already guards deprecated primitives, L4 class composition, and explicit L3 style debt. It is the right location for focused UI affordance governance, but new rules must avoid blocking unrelated historical debt.

## 4. Step 0 User-Task Check

Real user task:

The user must be able to operate a borderless desktop app window and understand dense icon-only or disabled controls without guessing.

First action:

After opening the app, the window controls should be visible in the app shell; icon-only commands should expose names and short explanations where the meaning is not obvious.

Duplicate entry points:

Step 0 does not add new product entry points. It only tests that existing route shells expose the same basic desktop controls and that future command affordances use one shared policy.

Recovery:

Step 0 must define how later implementation proves keyboard focus, no titlebar overlap, no privacy leak through attributes/tooltips, and route coverage for `/`, `/workbench`, `/dashboard`, and `/settings`.

Missing adjacent function:

Browser E2E can prove render, focus, accessible names, layout, and privacy. It cannot prove real native minimize/maximize/close behavior. The Step 0 plan must explicitly require a later Tauri smoke gate in Step 1/4.

## 5. Architecture Ownership

Step 0 tests should preserve these ownership boundaries:

| Concern | Owner layer | Step 0 test/governance responsibility |
| --- | --- | --- |
| Native window calls | L4 system | Unit tests define current-window action wrapper expectations and browser fallback behavior. |
| Shell action orchestration | L2 commander/view model | Tests define stable labels/action slots without putting Tauri calls in L3. |
| Titlebar rendering | L3 common molecule | E2E and static governance define visible controls, no-drag command area, focusability, and layout stability. |
| Route composition | L1 pages/routes | E2E route matrix catches `/` not using the shared shell path. |
| Tooltip primitive | L4 UI | Tests/governance define accessible description and delay expectations before implementation. |
| Disabled reason pattern | L4 UI plus L3 usage | Governance defines where reasons must be present, with a scoped debt ledger. |
| Privacy scanning | E2E utilities | Tests include tooltip/title/aria/form attributes in privacy snapshots. |

## 6. Planned Test And Governance Changes

### 6.1 Route Shell Baseline E2E

Files:

- Modify `e2e/specs/core.spec.ts`.
- Optionally add a helper in `e2e/utils/window-controls.ts` if assertions repeat across routes.
- Reuse `e2e/utils/viewport.ts`, `e2e/utils/workbench.ts`, and `e2e/utils/privacy-scan.ts`.

Route matrix:

| Route | Setup | Required assertions |
| --- | --- | --- |
| `/` | `setDesktop(page)` and `setNarrow(page)` | app titlebar or setup shell titlebar is visible; buttons named `最小化窗口`, `最大化窗口` or `还原窗口`, and `关闭窗口` are visible; no horizontal overflow. |
| `/workbench?codex-smoke=workbench-ready` | `openSyntheticWorkbench(page)` at desktop and narrow | same window controls visible; controls do not overlap workbench rail, page content, or global command cluster. |
| `/dashboard?codex-smoke=workbench-ready` | desktop | alias shell has same controls as workbench. |
| `/settings` | desktop and narrow | settings route has same controls and remains privacy-safe. |

Assertions to plan:

- Use accessible role/name queries instead of CSS selectors for primary presence checks.
- Check all three controls have bounding boxes with stable target dimensions. Normal desktop target should be at least the existing icon-button normal-density standard, with narrow target no smaller than 40px.
- Check titlebar/control bounding boxes stay above route content and do not overlap rail/global command controls.
- Run `expectStableSyntheticPage(page)` after route-specific assertions to preserve horizontal overflow and privacy scanning.

Expected RED state:

- All route checks for window-control buttons fail because the controls do not exist.
- `/` also exposes the existing setup-shell separation from the shared app shell.

### 6.2 Keyboard And Accessibility Baseline

Files:

- Modify `e2e/specs/a11y.spec.ts`.
- Reuse `expectNoCriticalA11yViolations`, `setDesktop`, `setNarrow`, and `openSyntheticWorkbench`.

Required checks:

- Keyboard focus can reach `最小化窗口`, `最大化窗口` or `还原窗口`, and `关闭窗口`.
- After the window controls are focused, the next tab path can reach existing page content or global commands. The test should not require a brittle exact full-page tab order.
- Tooltip-enabled icon commands expose accessible names and, where the tooltip is explanatory, `aria-describedby` points to an existing tooltip element.
- Showing/focusing a tooltip does not create serious/critical axe violations.
- Privacy scan includes visible text, `aria-label`, `title`, `alt`, placeholders, and tooltip text. This is already supported by `e2e/utils/privacy-scan.ts`; Step 0 should ensure new tooltip text remains covered.

Expected RED state:

- Window-control focus checks fail until controls exist.
- Tooltip `aria-describedby` checks fail for the current `Tooltip`/`IconButton` contract.

### 6.3 L4 Window-Control Unit Baseline

Files:

- Create `src/l4-atom/system/windowControls.test.ts`.
- Later Step 1 will create `src/l4-atom/system/windowControls.ts` and export it from `src/l4-atom/system/index.ts`.

Planned contract under test:

- A current-window action wrapper exists for minimize, toggle maximize/restore, and close.
- It uses Tauri v2 current-window APIs only when `canUseTauriWindow()` says window metadata is available.
- In browser/Vite/test mode, each action returns or resolves to a safe unavailable result rather than throwing.
- If the Tauri call rejects, the wrapper does not log raw error text to console and returns a safe failure result for L2 to translate.
- The tests mock Tauri window APIs and `canUseTauriWindow()` the same way existing system tests mock `@tauri-apps/api/core`.

Expected RED state:

- The test file fails because `windowControls.ts` does not exist yet.

Guardrail:

- Do not call `@tauri-apps/api/window` directly from L1 or L3 in Step 1. The unit test should make L4 the expected owner.

### 6.4 L2 Shell View-Model Baseline

Files:

- Extend `src/l2-coordinator/commander/appShellViewModel.test.ts`.
- Later Step 1 may modify `src/l2-coordinator/commander/appShellViewModel.ts` and `src/l2-coordinator/commander/useAppShellCommander.ts`.

Planned contract under test:

- The shell view model exposes localized window-control labels and tooltip copy:
  - `最小化窗口`
  - `最大化窗口`
  - `还原窗口`
  - `关闭窗口`
- The view model can represent maximized/restored state without forcing L3 to inspect Tauri directly.
- The commander exposes action callbacks for minimize, toggle maximize/restore, and close.
- Tauri/system failures should be recordable through existing local diagnostic event paths without raw private data.

Expected RED state:

- The current view model only exposes title, privacy, and material state, so the new expectations fail.

### 6.5 Tooltip Primitive Baseline

Files:

- Create or extend L4 UI tests, likely `src/l4-atom/ui/Tooltip.test.tsx` or a shared `src/l4-atom/ui/tooltip.test.tsx`.
- If staying with the current test style, use `renderToStaticMarkup` for static contract checks and Playwright for interaction/timing checks.
- Later Step 2 will modify `src/l4-atom/ui/Tooltip.tsx`, `src/l4-atom/ui/IconButton.tsx`, and related CSS.

Planned contract under test:

- Tooltip can generate or receive a stable id.
- The trigger can be connected through `aria-describedby` when the tooltip explains the command.
- Tooltip content is not duplicated into native `title` for migrated command controls.
- Keyboard focus reveals the tooltip promptly; pointer hover uses the planned delay policy.
- Tooltip text has a max width/wrap policy and remains privacy-safe.

Expected RED state:

- The current Tooltip has a `role="tooltip"` bubble but no stable id or trigger linkage.

### 6.6 Disabled-Reason Baseline

Files:

- Add focused static tests for representative components where possible:
  - `src/l3-molecule/media/MediaLibrary.test.tsx` or display-helper tests if component rendering stays server-side.
  - `src/l3-molecule/search/SearchScopeMenu.test.tsx`.
  - Extend `src/l3-molecule/developer/DbSearchPanel.test.tsx`.
  - Add semantic/graph display or component tests only for one or two representative states.
- Add governance scanning in `scripts/ui-governance.test.mjs`.

Representative required cases:

| Area | Required reason/recovery copy |
| --- | --- |
| Media refresh with no current chat | "先选择一个会话" or equivalent recovery copy. |
| Current-session search scope unavailable | Reason distinguishes missing selected conversation from loading/error. |
| Developer DB search in privacy mode | Reason says privacy mode blocks raw database search without exposing raw query/table/path. |
| Semantic QA send/scope disabled | Reason distinguishes privacy mode, empty question, streaming, and missing selected chats. |
| Graph advanced/QA privacy disabled | Reason says privacy mode blocks writing/QA inputs and how to recover. |

Expected RED or partial-RED state:

- Some components may already have contextual copy near the disabled control, but the control itself is not consistently described. Tests should expose the gap without requiring every disabled control in the app to be fixed in Step 0.

Guardrail:

- Do not rely only on native disabled buttons receiving hover tooltips. Disabled native buttons are not focusable in normal keyboard navigation. Primary workflow blockers need visible helper text or a focusable adjacent hint.

### 6.7 UI Governance Rules

File:

- Modify `scripts/ui-governance.test.mjs`.

Rules to add:

1. Command icon accessibility:
   - New command-style icon-only buttons must have an accessible name.
   - Existing broad query should avoid false positives from decorative icons, data rows, and real text buttons.

2. Native `title` command debt:
   - Treat native `title` on command controls as debt unless explicitly allowlisted.
   - Initial known command-title debt should include:
     - `src/l3-molecule/workbench/WorkbenchRail.tsx`
     - `src/l3-molecule/graph/GraphControlBar.tsx`
     - `src/l3-molecule/graph/GraphTimeline.tsx`
   - Data-display truncation use may remain allowed for now:
     - `StatusIndicator`
     - graph fallback table cell details
     - trend chart data points
     - developer raw preview title
   - The test should fail if new command-title debt appears outside the allowlist.

3. Tooltip primitive contract:
   - Require migrated command controls to use shared tooltip/description primitives rather than hand-written hover spans.
   - Do not hard-code implementation details such as exact hook names unless the implementation chooses them.

4. Disabled-reason debt ledger:
   - Track high-impact files with disabled controls that do not yet expose a reason.
   - Initial debt list should be explicit and small:
     - `MediaLibrary.tsx`
     - `SearchScopeMenu.tsx`
     - `DbSearchPanel.tsx`
     - `QAInput.tsx`
     - `GraphAdvancedPanel.tsx`
     - `GraphQAPanel.tsx`
   - The test should fail on new untracked disabled-control debt in these high-impact modules.

Expected RED or partial-RED state:

- If written as strict rules, governance fails immediately on current command-title/disabled-reason debt.
- Preferred Step 0 behavior is to record explicit debt lists so the governance test passes while preventing additional untracked debt. The RED evidence should come from targeted route/unit/accessibility tests, not from a permanently broken broad governance gate.

## 7. Command Plan

Targeted RED checks during Step 0 implementation:

- `pnpm test src/l4-atom/system/windowControls.test.ts`
- `pnpm test src/l2-coordinator/commander/appShellViewModel.test.ts`
- `pnpm test src/l4-atom/ui/Tooltip.test.tsx`
- `pnpm test scripts/ui-governance.test.mjs`
- `pnpm exec playwright test e2e/specs/core.spec.ts --grep "desktop shell"`
- `pnpm exec playwright test e2e/specs/a11y.spec.ts --grep "desktop shell|tooltip"`

Safety checks after adding Step 0 tests/governance:

- `pnpm fixtures:check`
- `pnpm typecheck`

Expected status after Step 0 only:

- The new route/window-control, L4 window-control, L2 shell-view, and tooltip linkage tests should fail for the intended missing functionality.
- Governance should either pass with explicit debt ledgers or fail only if it is intentionally being used as a RED baseline. Do not leave ambiguous broad failures.

Full GREEN verification belongs after the Step 1/2 implementation work:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm e2e`
- `pnpm e2e:a11y`
- `pnpm e2e:visual`
- `pnpm build`
- `pnpm verify`
- `cd src-tauri && cargo test` only if Rust/Tauri files changed.
- `pnpm tauri build` only for release-candidate or packaged-smoke closure.

## 8. Sequencing

### Task 0.1: Add Route Shell RED Tests

Files:

- `e2e/specs/core.spec.ts`
- optional `e2e/utils/window-controls.ts`

Work:

- Add a `desktop shell controls` group covering `/`, `/workbench`, `/dashboard`, and `/settings`.
- Use desktop and narrow viewports where route density differs.
- Assert accessible names, visibility, no horizontal overflow, and no overlap with route content.

Exit:

- Tests fail because controls are absent.

### Task 0.2: Add Keyboard/A11y RED Tests

Files:

- `e2e/specs/a11y.spec.ts`

Work:

- Assert keyboard reachability for future titlebar controls.
- Assert tooltip description linkage for a representative command after the implementation exists.
- Keep assertions resilient: do not require full-page tab order, only reachable controls and recoverable focus path.

Exit:

- Tests fail for missing controls and current tooltip contract.

### Task 0.3: Add L4 Window Wrapper RED Tests

Files:

- `src/l4-atom/system/windowControls.test.ts`

Work:

- Mock Tauri current-window actions.
- Assert minimize/toggle-maximize/close dispatch only through L4.
- Assert browser fallback and rejected Tauri calls are safe and do not log private data.

Exit:

- Tests fail until `windowControls.ts` exists.

### Task 0.4: Add L2 Shell View Baseline

Files:

- `src/l2-coordinator/commander/appShellViewModel.test.ts`

Work:

- Define localized labels and maximized/restored view state expectations.
- Define the L2-to-L3 action surface needed by `AppLayout`/`AppTitleBar`.

Exit:

- Tests fail until shell view/action model is extended.

### Task 0.5: Add Tooltip Contract Baseline

Files:

- `src/l4-atom/ui/Tooltip.test.tsx`
- `e2e/specs/a11y.spec.ts`

Work:

- Define id/description linkage and keyboard/focus behavior.
- Define hover delay expectation in browser-level terms, not as a hard-coded CSS implementation.
- Include privacy scan coverage for tooltip/title/aria text.

Exit:

- Tests fail against current visual-only tooltip.

### Task 0.6: Add Disabled-Reason Baseline

Files:

- `src/l3-molecule/developer/DbSearchPanel.test.tsx`
- optional focused tests for `MediaLibrary`, `SearchScopeMenu`, semantic QA, and graph QA/advanced.
- `scripts/ui-governance.test.mjs`

Work:

- Add representative component assertions for visible or accessible disabled reasons.
- Add explicit debt tracking so new disabled controls in high-risk files cannot be added silently.

Exit:

- Representative assertions fail where disabled reasons are missing.
- Governance either passes with debt ledger or fails intentionally with a clear debt report.

### Task 0.7: Record RED Evidence

Files:

- Update the future implementation notes or PR body.
- Do not mark `P0-05`, `P2-13`, or `P2-14` as fixed.

Work:

- Capture command, failing assertion, and why the failure is expected.
- Record that Step 0 changed tests/governance only.
- Record that browser E2E cannot prove native Tauri minimize/maximize/close.

Exit:

- The next implementation step has clear failing tests to satisfy.

## 9. Integration Strategy

Preferred branch behavior:

- Do not merge or push a final "green" claim with intentionally failing tests.
- If Step 0 is executed independently, commit it only on a clearly named draft/baseline branch and state that the branch is red by design.
- Preferred product workflow is to implement Step 0 and Step 1 in the same integration slice, using Step 0 tests as the RED checkpoint and Step 1 as the GREEN completion.

Suggested commit grouping for later implementation:

1. `test: add desktop shell baseline coverage`
2. `test: add tooltip and disabled-reason governance baseline`
3. `fix: implement desktop window controls`
4. `fix: implement tooltip and disabled-reason primitives`

The current planning-only change can be committed by itself because it does not introduce failing tests.

## 10. Privacy And Security Guardrails

- Do not put raw local paths, data keys, provider keys, tokens, private messages, table names from real data, or private chat text in test names, tooltip text, screenshots, console output, or fixture data.
- Tooltip and disabled-reason copy must be static or derived from redaction-safe view-model text.
- Existing privacy scan covers visible text, `aria-label`, `title`, `alt`, input/select/textarea values, and placeholders. Step 0 tests should keep using it after new tooltip text is shown.
- L4 window-control failures should not call `console.error` with raw Tauri errors. Use safe result values and L2 diagnostic redaction if surfaced later.
- Do not broaden Tauri CSP or capabilities for Step 0.

## 11. Non-Goals

- Do not implement `WindowControlCluster` in Step 0.
- Do not call `@tauri-apps/api/window` from L1/L3.
- Do not refactor Setup Center into `AppLayout` in Step 0.
- Do not replace every native `title` or every disabled control in Step 0.
- Do not mark any issue-ledger item as remediated after Step 0.
- Do not run or claim native minimize/maximize/close success from browser-only E2E.
- Do not add full implementation code to this plan document.

## 12. Acceptance Criteria For This Plan

This Step 0 plan is ready when:

- It names exact files for test/governance work.
- It explains which failures are expected and why.
- It keeps production implementation out of Step 0.
- It preserves L1/L2/L3/L4 ownership boundaries.
- It defines route, keyboard, tooltip, disabled-reason, privacy, and governance coverage.
- It distinguishes browser evidence from later native Tauri smoke evidence.
- It leaves unrelated ledger items open and out of scope.

# 2026-06-08 Desktop Shell Step 1 Window Controls And Shared Shell Plan

> Scope: detailed repair plan for the second remediation step, corresponding to Step 1 in `docs/superpowers/plans/2026-06-08-desktop-shell-micro-affordance-remediation.md`.
>
> User constraint: this document intentionally does not include full implementation code. It defines the files, ownership, behavior, test targets, acceptance evidence, and handoff rules for the P0 desktop shell repair.

## 1. Goal

Close `P0-05`: the borderless Tauri desktop app has no visible minimize, maximize/restore, or close controls.

The practical goal is:

- every normal desktop route exposes the same basic window controls;
- those controls call Tauri current-window APIs through L4 system atoms, not from L1 or L3;
- `SetupCenterView` joins the shared shell path so first-run users are not left outside the desktop shell;
- titlebar drag behavior still works, while command clusters remain no-drag and keyboard reachable;
- native behavior is verified with Tauri smoke, because browser E2E cannot prove minimize, maximize, restore, or close.

This step is P0 only. It should not attempt the broader P2 migration for tooltip primitives, disabled-reason primitives, media/search/semantic/graph disabled hints, or all native `title` debt.

## 2. Inputs Reviewed

Primary planning and issue inputs:

- `docs/superpowers/plans/2026-06-08-desktop-shell-micro-affordance-remediation.md`
- `2026-06-08-desktop-shell-baseline-tests-governance-plan.md`
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
- `specs/001-ready-desktop-app/release-evidence.md`
- `specs/001-ready-desktop-app/quickstart.md`

Historical/current design references:

- `docs/总体开发规划.md`
- `开发指南.md`
- `docs/ui-functional-audit-and-redesign-plan.md`

Current source and tests:

- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/lib.rs`
- `src-tauri/src/sidecar.rs`
- `src/l1-entry/routes/index.tsx`
- `src/l1-entry/pages/SetupCenterView.tsx`
- `src/l1-entry/pages/WorkbenchShellView.tsx`
- `src/l1-entry/pages/WorkbenchView.tsx`
- `src/l1-entry/pages/SettingsView.tsx`
- `src/l2-coordinator/commander/appShellViewModel.ts`
- `src/l2-coordinator/commander/appShellViewModel.test.ts`
- `src/l2-coordinator/commander/useAppShellCommander.ts`
- `src/l3-molecule/common/AppLayout.tsx`
- `src/l3-molecule/common/AppTitleBar.tsx`
- `src/l3-molecule/common/GlobalCommandCluster.tsx`
- `src/l3-molecule/common/AppStatusCluster.tsx`
- `src/l4-atom/system/tauriRuntime.ts`
- `src/l4-atom/system/index.ts`
- `src/l4-atom/system/windowControls.test.ts`
- `src/l4-atom/ui/IconButton.tsx`
- `src/l4-atom/ui/Tooltip.tsx`
- `src/styles/layout.css`
- `e2e/utils/window-controls.ts`
- `e2e/specs/core.spec.ts`
- `e2e/specs/a11y.spec.ts`
- `e2e/specs/visual.spec.ts`
- `scripts/ui-governance.test.mjs`

Local dependency evidence:

- `node_modules/@tauri-apps/api/window.d.ts` confirms available Tauri v2 APIs: `getCurrentWindow()`, `minimize()`, `toggleMaximize()`, `close()`, `isMaximized()`, and `onResized()`.

## 3. Current Progress And RED Baseline

Step 0 has already added tests/governance and did not add production behavior.

Current RED or expected-failing P0 signals:

- `src/l4-atom/system/windowControls.test.ts` expects a missing L4 wrapper for minimize, toggle maximize, and close.
- `src/l2-coordinator/commander/appShellViewModel.test.ts` expects shell window-control labels and maximized/restored state.
- `e2e/utils/window-controls.ts`, `e2e/specs/core.spec.ts`, and `e2e/specs/a11y.spec.ts` expect routes to expose `最小化窗口`, `最大化窗口` or `还原窗口`, and `关闭窗口`.

Current P2 RED signals that should remain out of this P0-only step unless the owner explicitly combines later steps:

- `src/l4-atom/ui/Tooltip.test.tsx` for shared tooltip id and `aria-describedby`.
- Representative disabled-reason tests such as `DbSearchPanel`, `MediaLibrary`, `SearchScopeMenu`, `QAInput`, `GraphAdvancedPanel`, and `GraphQAPanel`.
- `e2e/specs/a11y.spec.ts --grep "tooltip"` for full tooltip description linkage.

Current green guardrail:

- `pnpm test scripts/ui-governance.test.mjs` currently passes: 1 file / 7 tests.

Important execution consequence:

- A P0-only implementation should turn the window-control tests green.
- A full `pnpm test` or full `pnpm e2e:a11y` may still be red if P2 tooltip/disabled-reason RED tests are included in the active staged set. Do not claim full-suite completion until those later P2 steps are implemented or explicitly kept out of the P0 integration slice.

## 4. Root-Cause Evidence

Confirmed source evidence:

- `src-tauri/tauri.conf.json` sets `decorations: false` and `transparent: true`, so native window chrome is removed.
- `src-tauri/capabilities/default.json` already grants `core:window:allow-close`, `core:window:allow-minimize`, and `core:window:allow-toggle-maximize`.
- `src/l3-molecule/common/AppTitleBar.tsx` has a draggable titlebar and no-drag action area, but no minimize, maximize/restore, or close controls.
- `src/l1-entry/pages/SetupCenterView.tsx` renders a standalone `setup-shell`, not `AppLayout`, so `/` is outside the common desktop shell.
- `/workbench`, `/dashboard`, and `/settings` go through `AppLayout`, but `AppLayout` delegates to the same `AppTitleBar`, which currently lacks window controls.
- `rg` found no production `@tauri-apps/api/window`, `getCurrentWindow`, `minimizeCurrentWindow`, `toggleMaximizeCurrentWindow`, or `closeCurrentWindow` implementation in `src/`.
- `src-tauri/src/lib.rs` already handles `WindowEvent::CloseRequested` and calls `sidecar::shutdown_sidecar_for_app_exit`, so a frontend `currentWindow.close()` should be smoke-tested against the existing cleanup path before adding any new Rust command.

Root-cause hypothesis:

The P0 failure is not a missing Tauri permission or backend contract issue. It is missing frontend/system wiring across L4 system, L2 shell orchestration, L3 common shell rendering, and L1 route shell coverage.

## 5. User-Task Check

Real user task:

A user must be able to operate the app window after opening a borderless installed desktop app.

First action:

The user should see standard window operations in the app shell immediately, including during first-run setup.

Duplicate entry points:

There should be one shared titlebar/window-control contract. `SetupCenterView`, Workbench, Dashboard alias, and Settings may have different page content, but they should not each invent separate shell controls.

Recovery and freedom:

The user can minimize the app, maximize/restore it, close it, and still rely on existing sidecar cleanup when the app exits.

Missing adjacent function:

Browser tests can prove visibility, labels, target size, focus reachability, no overflow, and no overlap. Only Tauri smoke can prove native minimize/maximize/close behavior and sidecar cleanup after close.

## 6. Architecture Ownership

| Concern | Owner | Required shape |
| --- | --- | --- |
| Current-window native calls | L4 system | `src/l4-atom/system/windowControls.ts` wraps Tauri APIs and browser fallback. |
| Shell state and actions | L2 commander/view model | `useAppShellCommander` owns action callbacks and maximized state; L3 receives props. |
| Titlebar controls | L3 common molecule | `WindowControlCluster` renders supplied labels/state/actions with existing UI atoms. |
| Route shell coverage | L1 pages | `SetupCenterView`, Workbench, Dashboard alias, and Settings enter the common shell contract. |
| Drag/no-drag behavior | L3 + CSS | Header drag region remains; command clusters use no-drag regions. |
| Native close lifecycle | Tauri/Rust existing shell | Existing `CloseRequested` handler remains the cleanup path; no new Rust command unless smoke disproves it. |
| Privacy | L2/L3 static copy | Window-control copy is static and contains no local path, token, query, or chat content. |

## 7. Planned Source Changes

### 7.1 L4 System Window Wrapper

Create:

- `src/l4-atom/system/windowControls.ts`

Modify:

- `src/l4-atom/system/index.ts`
- `src/l4-atom/system/windowControls.test.ts` if the state-reading contract is expanded.

Required behavior:

- Export `minimizeCurrentWindow`, `toggleMaximizeCurrentWindow`, and `closeCurrentWindow`.
- Use `canUseTauriWindow()` from `src/l4-atom/system/tauriRuntime.ts` before touching `getCurrentWindow()`.
- Call Tauri v2 current-window methods from `@tauri-apps/api/window` only in this L4 system file.
- Return safe structured results instead of throwing in browser/Vite/test mode.
- Convert rejected Tauri calls to safe failures without `console.error` or raw error text.
- Add a small state helper for L2, such as reading whether the current window is maximized, using `isMaximized()` behind the same Tauri availability guard.
- If a resize/state listener is added for label accuracy, keep listener setup and cleanup in L4 or expose a narrow L4 subscription wrapper. Do not import `@tauri-apps/api/window` in L2.

Non-goals:

- Do not add a Rust command for window controls.
- Do not broaden Tauri capabilities or CSP.
- Do not log raw Tauri errors.

Exit:

- `pnpm test src/l4-atom/system/windowControls.test.ts` passes.
- `scripts/ui-governance.test.mjs` still confirms Tauri current-window APIs are owned by L4 system atoms.

### 7.2 L2 Shell View And Actions

Modify:

- `src/l2-coordinator/commander/appShellViewModel.ts`
- `src/l2-coordinator/commander/appShellViewModel.test.ts`
- `src/l2-coordinator/commander/useAppShellCommander.ts`

Required behavior:

- Extend `AppShellView` with a `windowControls` view object.
- Keep localized labels exactly aligned with the RED tests:
  - `最小化窗口`
  - `最大化窗口`
  - `还原窗口`
  - `关闭窗口`
- Derive `toggleMaximizeLabel` from `isMaximized`.
- Default `isMaximized` to `false` in browser mode.
- Initialize maximized/restored state from the L4 wrapper when Tauri window APIs are available.
- After `toggleMaximizeWindow`, re-read maximized state so the visible label changes between `最大化窗口` and `还原窗口`.
- Expose action callbacks through `useAppShellCommander`:
  - `minimizeWindow`
  - `toggleMaximizeWindow`
  - `closeWindow`
- Keep failures quiet in browser mode. For real Tauri failures, record only a redaction-safe diagnostic summary if diagnostic recording is used.

Non-goals:

- Do not let L3 inspect Tauri state.
- Do not read or mutate business stores in L3 for shell state.
- Do not couple shell actions to sidecar start/stop state. Close remains a window action; Rust close lifecycle handles sidecar cleanup.

Exit:

- `pnpm test src/l2-coordinator/commander/appShellViewModel.test.ts` passes.
- Existing shell actions for privacy, developer console, and settings still work.

### 7.3 L3 Window Control Cluster

Create:

- `src/l3-molecule/common/WindowControlCluster.tsx`

Optionally create:

- `src/l3-molecule/common/WindowControlCluster.test.tsx` for a static render contract if the implementation adds non-trivial display logic.

Modify:

- `src/l3-molecule/common/index.ts`

Required behavior:

- Render three controls in order: minimize, maximize/restore, close.
- Use lucide icons through existing UI atoms:
  - minimize: a minus-style icon;
  - maximize/restore: a maximize/restore pair;
  - close: an X-style icon.
- Use existing `IconButton` for target sizing, focus ring, active styling, and accessible label consistency.
- Pass explicit tooltip text for the new icon buttons so no new native `title` fallback is created for window commands.
- Keep static Chinese labels exactly as the tests expect.
- Mark the whole cluster as a no-drag command region through titlebar structure and CSS.
- Use a dedicated class such as `app-window-control-cluster` so E2E/layout checks can distinguish it from `app-command-cluster`.

Non-goals:

- Do not use fake macOS traffic-light controls for the Windows x64 P0 fix.
- Do not hand-roll SVG icons when lucide icons are available.
- Do not add platform-specific placement logic in this step unless local smoke shows a Windows-specific blocker.

Exit:

- `IconButton` governance still passes.
- No new untracked native `title=` command debt appears in `scripts/ui-governance.test.mjs`.

### 7.4 AppTitleBar And AppLayout Integration

Modify:

- `src/l3-molecule/common/AppTitleBar.tsx`
- `src/l3-molecule/common/AppLayout.tsx`
- `src/styles/layout.css`

Required behavior:

- Preserve the titlebar as the app-level drag region.
- Keep brand/status, center title, app/global command cluster, and window controls in separate layout slots.
- Keep `app-command-cluster` for privacy, developer console, and settings.
- Add `app-window-control-cluster` for minimize, maximize/restore, and close.
- Ensure both action clusters are no-drag.
- Keep the center title truncatable and non-blocking.
- On narrow widths, do not hide the window-control cluster. It must remain visible and at least 40x40 per Step 0 E2E expectations.
- Avoid overlap between window controls and:
  - `.app-main`
  - `.workbench-rail`
  - `.app-command-cluster`
- Keep visual treatment restrained and Windows-understandable. The controls should read as desktop shell commands, not decorative app feature buttons.

Layout direction:

- Current `.app-titlebar` is a three-column grid. Add an explicit window-control slot rather than letting window controls compete inside the same generic actions area.
- The likely stable shape is brand/status, center title, shell app commands, then window controls.
- At widths below 720px, the status cluster and center title may stay hidden, but brand/app commands/window controls must still fit without overflow.

Non-goals:

- Do not redesign the whole workbench toolbar.
- Do not move developer/settings/privacy command semantics.
- Do not add nested cards or a second titlebar.

Exit:

- `pnpm exec playwright test e2e/specs/core.spec.ts --grep "desktop shell"` passes for route visibility, target size, and overlap checks.
- `pnpm exec playwright test e2e/specs/a11y.spec.ts --grep "desktop shell"` passes for keyboard reachability.

### 7.5 Setup Center Shared Shell Coverage

Modify:

- `src/l1-entry/pages/SetupCenterView.tsx`
- `src/styles/layout.css`

Possibly modify:

- `src/l2-coordinator/commander/useAppShellCommander.ts` only if setup needs a different title argument or shell labels.

Required behavior:

- Wrap the setup route in the same `AppLayout` shell contract or an equivalent shared app shell path that uses `AppTitleBar` and `WindowControlCluster`.
- Use `useAppShellCommander("设置中心")` or equivalent L2-owned shell state for `/`.
- Keep setup business orchestration in `useSetupCenterCommander`.
- Do not move setup readiness logic into `AppLayout` or common titlebar components.
- Preserve setup center content structure:
  - setup nav/stepper;
  - setup main content;
  - setup status/diagnostics aside;
  - ready/open-workbench action.
- Adjust `setup-shell` sizing because it will sit inside `.app-main`, not directly under the viewport. Avoid `min-height: 100vh` causing titlebar overflow inside the shared shell.
- Ensure `/` at desktop and narrow widths has no page-level horizontal overflow.

Non-goals:

- Do not rewrite setup flow.
- Do not change setup service, DB readiness, diagnostics, or sidecar contracts.
- Do not duplicate shell controls inside setup content.

Exit:

- `/` passes Step 0 window-control E2E at desktop and narrow widths.
- Setup readiness, diagnostics, and open-workbench affordances remain visible and usable.

### 7.6 Existing Route Shells

Review and modify only if needed:

- `src/l1-entry/pages/WorkbenchShellView.tsx`
- `src/l1-entry/pages/WorkbenchView.tsx`
- `src/l1-entry/pages/SettingsView.tsx`
- `src/l1-entry/routes/index.tsx`

Required behavior:

- `/workbench` and `/dashboard` continue to use `AppLayout` through their existing shell paths.
- `/settings` continues to use `AppLayout`.
- No route should render nested `AppLayout` instances.
- `WorkbenchShellView` should not create a shell mismatch between its readiness gate path and its ready `WorkbenchView` path.
- The dashboard alias should expose the same window controls as workbench because it resolves to the same shell.

Exit:

- Route matrix in `e2e/specs/core.spec.ts` passes for `/`, `/workbench`, `/dashboard`, and `/settings`.

## 8. Planned Test Changes

Step 0 already created most RED tests. Step 1 should mostly make those tests pass.

Allowed test updates:

- Update `src/l4-atom/system/windowControls.test.ts` only if adding the maximized-state read/listener contract.
- Update `src/l2-coordinator/commander/appShellViewModel.test.ts` only to align with final view-model field names while preserving the same labels and state behavior.
- Add a focused `WindowControlCluster` test if the L3 component has logic beyond simple rendering.
- Add browser assertions only if the implementation reveals an uncovered P0 risk such as titlebar button clicks being swallowed by drag regions.

Do not weaken:

- Accessible button names.
- Route coverage for setup/workbench/dashboard/settings.
- Target-size thresholds.
- No-overlap assertions.
- L4 ownership of `@tauri-apps/api/window`.
- Privacy scan behavior.

## 9. Command Plan

Before implementation, confirm the intended RED state if the current worktree has not changed:

- `pnpm test src/l4-atom/system/windowControls.test.ts src/l2-coordinator/commander/appShellViewModel.test.ts`
- `pnpm exec playwright test e2e/specs/core.spec.ts --grep "desktop shell"`
- `pnpm exec playwright test e2e/specs/a11y.spec.ts --grep "desktop shell"`

After L4 implementation:

- `pnpm test src/l4-atom/system/windowControls.test.ts`
- `pnpm test scripts/ui-governance.test.mjs`
- `pnpm typecheck`

After L2 shell contract:

- `pnpm test src/l2-coordinator/commander/appShellViewModel.test.ts`
- `pnpm typecheck`

After L3/L1/CSS shell integration:

- `pnpm exec playwright test e2e/specs/core.spec.ts --grep "desktop shell"`
- `pnpm exec playwright test e2e/specs/a11y.spec.ts --grep "desktop shell"`
- `pnpm fixtures:check`
- `pnpm typecheck`
- `pnpm test scripts/ui-governance.test.mjs`

Broader source/UI regression checks when the P0 targeted checks are green:

- `pnpm e2e`
- `pnpm e2e:visual`
- `pnpm build`

Full verification expectation:

- If this P0 slice is delivered alone while later P2 RED tests remain active, do not claim `pnpm test`, `pnpm e2e:a11y`, or `pnpm verify` are green unless those commands are actually green.
- If the branch must be merge-ready with all active tests green, either implement the necessary Step 2/3 P2 test targets in the same integration slice or keep P2 RED tests outside the staged P0 commit until their planned step.

Tauri/native smoke:

- Run `pnpm tauri dev` for a local desktop smoke after browser checks pass.
- If producing release-candidate evidence, run `pnpm tauri build` and perform the installed-app smoke from `specs/001-ready-desktop-app/quickstart.md`.

Rust command:

- `cd src-tauri && cargo test` is not required if this step does not change Rust/Tauri source files.
- If native close smoke shows sidecar cleanup is bypassed and Rust must change, then run `cd src-tauri && cargo test` and record the contract impact.

## 10. Manual Tauri Smoke Checklist

Use synthetic or privacy-safe setup state only. Do not open real private chat content for window-control smoke.

Desktop shell visibility:

- Launch `pnpm tauri dev`.
- Confirm `/` shows the shared titlebar with `设置中心` and all three window controls.
- Navigate to `/workbench?codex-smoke=workbench-ready`, `/dashboard?codex-smoke=workbench-ready`, and `/settings`; confirm the same controls appear.

Native actions:

- Click `最小化窗口`; the native desktop window minimizes.
- Restore the window from the taskbar or OS window switcher.
- Click `最大化窗口`; the native window maximizes and the control label becomes `还原窗口`.
- Click `还原窗口`; the native window restores and the control label becomes `最大化窗口`.
- Click `关闭窗口`; the app window closes.

Drag/no-drag behavior:

- Drag the titlebar area outside command clusters; the window moves.
- Click each command cluster button; clicks are not swallowed by drag behavior.

Sidecar lifecycle:

- If an app-managed sidecar is running, close the window and confirm the existing `CloseRequested` cleanup removes the app-managed sidecar.
- Confirm no unknown `5030` process is stopped as part of this smoke.

Narrow width:

- Resize to a narrow/mobile-ish width.
- Confirm window controls remain visible, at least 40x40, keyboard reachable, and not overlapping page content.

Evidence to record:

- route/page;
- viewport;
- action tested;
- observed result;
- whether sidecar was running;
- remaining caveat if the smoke was dev-mode rather than packaged.

## 11. Privacy And Security Guardrails

- Window-control labels and tooltips must be static product copy only.
- Do not include local paths, raw service URLs beyond existing safe summaries, data keys, provider keys, tokens, raw query text, private names, or chat content in labels, tooltips, diagnostics, test fixtures, screenshots, or console output.
- Browser fallback should not log unavailable Tauri APIs.
- Rejected Tauri calls should not expose raw error text to console or UI.
- Do not broaden CSP, shell permissions, updater permissions, or window capabilities for this step.
- Do not change `chatlog_alpha` sidecar API behavior.

## 12. Design And UI Acceptance

Controls:

- Use familiar symbols, not text-only rectangular buttons.
- Use lucide icons through the existing atom system.
- Target size:
  - desktop normal target at least 32x32;
  - narrow viewport target at least 40x40.
- Use visible focus styling inherited from `IconButton`.
- Keep text labels accessible through `aria-label`.

Visual placement:

- Windows x64 first release uses right-aligned controls.
- Do not reintroduce fake macOS traffic lights.
- Do not make the titlebar a decorative card.
- Do not add gradient/orb/decorative backgrounds.
- Keep titlebar information density quiet: brand/status, page title, app commands, window commands.

Responsive behavior:

- At narrow widths, status and center title may be hidden, but window controls must remain visible.
- Do not let window controls wrap into page content.
- Do not let the setup nav/aside force page-level horizontal overflow.

## 13. Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Browser tests pass but native actions do nothing | Require Tauri smoke before marking `P0-05` remediated. |
| `currentWindow.close()` bypasses sidecar cleanup | Smoke against existing `CloseRequested` path; add Rust fix only if evidence shows bypass. |
| Titlebar drag region swallows button clicks | Mark command clusters no-drag and verify with E2E/manual click smoke. |
| Setup shell nesting creates overflow | Adjust `setup-shell` sizing for `.app-main` containment and verify desktop/narrow route checks. |
| Full test suite remains red due to P2 RED tests | Document P0/P2 split; do not claim full suite green until P2 tests are addressed or not staged. |
| Maximized label becomes stale after OS-level resize/snap | Read `isMaximized()` after toggle and refresh on resize/focus if needed through L4 wrappers. |
| New native title debt appears | Use explicit `tooltip` props and keep `scripts/ui-governance.test.mjs` green. |

## 14. Sequencing

### Task 1.1: Confirm P0 RED And Ownership

Files:

- Existing Step 0 tests and governance files.

Work:

- Run the targeted P0 RED checks.
- Confirm failures are still missing L4 wrapper, missing shell view contract, and missing route controls.
- Confirm `scripts/ui-governance.test.mjs` is green.

Exit:

- The implementation starts from known P0 RED evidence.

### Task 1.2: Implement L4 Current-Window Wrapper

Files:

- Create `src/l4-atom/system/windowControls.ts`.
- Modify `src/l4-atom/system/index.ts`.
- Extend `src/l4-atom/system/windowControls.test.ts` only for state-read behavior if needed.

Work:

- Implement current-window action wrappers.
- Implement safe browser/unavailable and Tauri-error results.
- Add maximized-state read support if L2 needs it.

Exit:

- L4 window-control tests pass.
- Governance still shows no `@tauri-apps/api/window` outside `src/l4-atom/system/`.

### Task 1.3: Extend L2 Shell Contract

Files:

- Modify `src/l2-coordinator/commander/appShellViewModel.ts`.
- Modify `src/l2-coordinator/commander/useAppShellCommander.ts`.
- Keep `src/l2-coordinator/commander/appShellViewModel.test.ts` aligned with labels and state.

Work:

- Add `windowControls` view state and window action callbacks.
- Initialize and refresh maximized/restored state through L4.
- Keep all user-facing failure handling redaction-safe.

Exit:

- App shell view-model tests pass.
- Existing shell privacy/dev/settings actions continue to compile and work.

### Task 1.4: Add WindowControlCluster

Files:

- Create `src/l3-molecule/common/WindowControlCluster.tsx`.
- Modify `src/l3-molecule/common/index.ts`.
- Optionally add `src/l3-molecule/common/WindowControlCluster.test.tsx`.

Work:

- Render minimize, maximize/restore, and close controls from props.
- Use existing `IconButton`.
- Keep command labels and tooltips static and localized.

Exit:

- No new untracked `IconButton` or `title=` governance debt.

### Task 1.5: Rework AppTitleBar Layout

Files:

- Modify `src/l3-molecule/common/AppTitleBar.tsx`.
- Modify `src/l3-molecule/common/AppLayout.tsx`.
- Modify `src/styles/layout.css`.

Work:

- Add explicit titlebar slots for app commands and window controls.
- Preserve drag and no-drag behavior.
- Make desktop and narrow sizing stable.

Exit:

- Workbench/settings route checks find visible, correctly sized, non-overlapping window controls.

### Task 1.6: Put SetupCenterView Into Shared Shell

Files:

- Modify `src/l1-entry/pages/SetupCenterView.tsx`.
- Modify `src/styles/layout.css`.

Work:

- Use the shared app shell for `/`.
- Preserve setup content and L2 setup commander ownership.
- Fix `setup-shell` height/overflow for app-main containment.

Exit:

- `/` desktop and narrow checks pass.
- Setup readiness and diagnostics remain visible.

### Task 1.7: Targeted Browser And Native Verification

Files:

- No production files unless verification exposes a defect.
- Update process notes after verification.

Work:

- Run targeted P0 unit and browser tests.
- Run Tauri smoke for native window behavior.
- Re-run broader E2E/visual/build checks as appropriate.

Exit:

- `P0-05` can be marked remediated only if Tauri smoke confirms native action behavior.
- If only browser/source checks pass, record `P0-05` as source implemented but native smoke pending.

## 15. Documentation And Ledger Updates After Implementation

Update only after the implementation and smoke evidence exist:

- `product-acceptance-issue-ledger.md`
  - Mark `P0-05` remediated only after native Tauri smoke passes.
  - Do not mark `P2-13` or `P2-14` remediated during this P0-only step.
- `ux-micro-affordance-opportunities.md`
  - Note that window controls now use the shell control pattern.
  - Keep shared tooltip and disabled-reason opportunities open unless Step 2/3 is also implemented.
- `findings.md` and `progress.md`
  - Record command output, route coverage, Tauri smoke result, and any remaining caveat.
- Any PR/body/closeout notes
  - Distinguish browser evidence from native desktop evidence.
  - State whether P2 RED tests remain expected.

## 16. Non-Goals

- Do not implement shared tooltip primitive upgrades in this P0 step.
- Do not implement disabled-reason primitives or migrate media/search/semantic/graph disabled states.
- Do not redesign Workbench navigation, toolbar density, or Developer Tools exposure.
- Do not change sidecar launch args, backend API contracts, CSP, updater config, or bundle sidecar paths.
- Do not add new remote calls or telemetry.
- Do not commit sidecar binaries, logs, private fixtures, screenshots with private data, or build output.
- Do not claim release readiness from this step alone.

## 17. Acceptance Criteria For This Plan

This Step 1 P0 plan is ready when:

- It identifies the current RED tests and separates P0 from later P2 RED work.
- It names exact files to create or modify.
- It keeps Tauri window APIs in L4 system atoms.
- It keeps shell state/actions in L2.
- It keeps L3 titlebar rendering presentational.
- It makes Setup Center part of the shared shell.
- It defines browser and Tauri native verification separately.
- It avoids complete implementation code.
- It leaves unrelated ledger items open.


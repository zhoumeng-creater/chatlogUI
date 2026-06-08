# 2026-06-08 Desktop Shell Step 4 Acceptance Evidence And Ledger Update Plan

> User constraint: this document intentionally does not include full implementation code. It defines the files, evidence gates, smoke checks, ledger transition rules, documentation updates, and residual-risk reporting needed to close the fifth remediation slice.

## 1. Goal

Write and execute the parent remediation plan's fifth slice, `Step 4: Acceptance, Evidence, And Ledger Closure`, for the 2026-06-08 desktop shell and micro-affordance remediation sequence.

The parent plan starts at `Step 0`, so this is the fifth detailed remediation plan even though its step id is `Step 4`.

This step must prove, record, and reconcile the current Step 0-3 work:

- `P0-05`: borderless desktop shell window controls.
- `P2-13`: shared tooltip and compact command explanation coverage.
- `P2-14`: shared disabled reason and recovery hint coverage.

This step is not another broad UI migration. Its main deliverable is reliable acceptance evidence and truthful issue-ledger state.

## 2. Inputs Reviewed

Parent and slice plans:

- `docs/superpowers/plans/2026-06-08-desktop-shell-micro-affordance-remediation.md`
- `2026-06-08-desktop-shell-baseline-tests-governance-plan.md`
- `2026-06-08-desktop-shell-window-controls-shared-shell-plan.md`
- `2026-06-08-desktop-shell-tooltip-disabled-reason-primitives-plan.md`
- `2026-06-08-desktop-shell-high-impact-control-migration-plan.md`

Issue and opportunity files:

- `product-acceptance-issue-ledger.md`
- `ux-micro-affordance-opportunities.md`

Standing standards:

- `AGENTS.md`
- `docs/product-acceptance-standards.md`
- `docs/ui-development-standards.md`

Historical and productization references:

- `docs/总体开发规划.md`
- `开发指南.md`
- `specs/001-ready-desktop-app/spec.md`
- `specs/001-ready-desktop-app/plan.md`
- `specs/001-ready-desktop-app/tasks.md`
- `specs/001-ready-desktop-app/quickstart.md`
- `specs/001-ready-desktop-app/release-evidence.md`
- `specs/001-ready-desktop-app/architecture-boundary-check.md`
- `specs/001-ready-desktop-app/test-data-policy.md`
- `specs/002-advanced-capabilities/acceptance-checklist.md`
- `docs/release/ready-desktop-app.md`
- `docs/release/release-governance.md`
- `docs/release/privacy-audit.md`
- `docs/release/sidecar-artifacts.md`

Current source and tests:

- `src/l4-atom/system/windowControls.ts`
- `src/l4-atom/system/windowControls.test.ts`
- `src/l2-coordinator/commander/useAppShellCommander.ts`
- `src/l2-coordinator/commander/appShellViewModel.ts`
- `src/l2-coordinator/commander/appShellViewModel.test.ts`
- `src/l3-molecule/common/AppLayout.tsx`
- `src/l3-molecule/common/AppTitleBar.tsx`
- `src/l3-molecule/common/WindowControlCluster.tsx`
- `src/l3-molecule/common/GlobalCommandCluster.tsx`
- `src/l1-entry/pages/SetupCenterView.tsx`
- `src/l4-atom/ui/Tooltip.tsx`
- `src/l4-atom/ui/IconButton.tsx`
- `src/l4-atom/ui/DisabledReason.tsx`
- `src/l4-atom/ui/Tooltip.test.tsx`
- `src/l4-atom/ui/DisabledReason.test.tsx`
- `scripts/ui-governance.test.mjs`
- `e2e/specs/core.spec.ts`
- `e2e/specs/a11y.spec.ts`
- `e2e/specs/visual.spec.ts`
- `e2e/utils/window-controls.ts`
- `e2e/utils/privacy-scan.ts`
- high-impact migration components and tests in `src/l3-molecule/workbench`, `src/l3-molecule/graph`, `src/l3-molecule/semantic`, `src/l3-molecule/media`, `src/l3-molecule/search`, `src/l3-molecule/developer`, and `src/l3-molecule/diagnostics`.

## 3. Current Progress Baseline

Current branch and worktree:

- Branch is `codex/product-acceptance-standards`.
- The worktree is intentionally dirty with Step 0-3 source, test, governance, ledger, and opportunity-file changes.
- This Step 4 plan must preserve those changes and use them as the current baseline. Do not revert unrelated or pre-existing edits.

Current P0 shell implementation evidence in source:

- `src/l4-atom/system/windowControls.ts` wraps Tauri current-window minimize, toggle maximize, close, maximized-state read, and window-state listeners.
- Browser/Vite/test fallback returns safe unavailable results and does not log private data.
- `src/l2-coordinator/commander/useAppShellCommander.ts` owns minimize, toggle maximize, close, and maximized-state refresh callbacks.
- `src/l2-coordinator/commander/appShellViewModel.ts` derives `最小化窗口`, `最大化窗口`, `还原窗口`, and `关闭窗口` labels.
- `src/l3-molecule/common/WindowControlCluster.tsx` renders three shared `IconButton` controls with shared tooltip placement.
- `src/l3-molecule/common/AppLayout.tsx` passes shell state/actions into `AppTitleBar`.
- `src/l1-entry/pages/SetupCenterView.tsx` now uses the shared `AppLayout`, so `/` has the same shell controls as the workbench/settings shell.

Current P2 tooltip implementation evidence in source:

- `Tooltip` supplies stable/generated ids, `role="tooltip"`, and `aria-describedby` linkage for valid trigger children.
- `IconButton` keeps `aria-label={label}` and uses the shared `Tooltip` path when `tooltip` is supplied.
- `IconButton` no longer has a native `title` fallback.
- `Tooltip` supports placement variants used by titlebar, graph toolbar, media preview, and dense controls.

Current P2 disabled-reason implementation evidence in source:

- `DisabledReason` supports generated or explicit ids, preserves existing `aria-describedby`, and exposes `sr-only`, `inline`, and `compact` variants.
- High-impact disabled controls now use the shared primitive instead of raw local `p.sr-only` reason blocks.
- `scripts/ui-governance.test.mjs` treats `Button loading=` as a disabled state in high-impact files, so loading-only disabled controls cannot bypass the reason rule silently.
- `QAInput` masks retained entity override labels as `已隐藏` in privacy mode.
- Graph advanced, graph QA, graph visualize, semantic preview refresh, DB explorer cache, Hook/Hermes save, diagnostics copy/export, and developer endpoint/SQL controls have focused reason tests or governance coverage.

Current browser/governance evidence in source:

- `e2e/utils/window-controls.ts` checks visible controls, target sizes, no overlap, and keyboard reachability.
- `e2e/specs/core.spec.ts` checks setup, workbench, dashboard alias, and settings route shell controls at desktop and narrow widths.
- `e2e/specs/a11y.spec.ts` checks shell control keyboard reachability, titlebar tooltip viewport placement, delayed pointer tooltip reveal, focus tooltip reveal, migrated graph command tooltips, and keyboard-operable graph timeline entries.
- `e2e/specs/visual.spec.ts` covers synthetic desktop/narrow workbench, semantic, graph, and privacy states that can reveal visual regressions from visible helper copy.
- `scripts/ui-governance.test.mjs` locks native title usage, IconButton tooltip call sites, L4-only Tauri window API ownership, high-impact disabled descriptions, and shared `DisabledReason` usage.

Current ledger baseline:

- `P0-05` remains `confirmed` even though source/browser/package-build evidence has been added, because native click behavior for minimize, maximize/restore, and close still needs a Tauri desktop smoke before full remediation can be claimed.
- `P2-13` is `partial-source-browser-implemented`; high-impact command coverage is substantially implemented, but lower-frequency compact controls and target-dimension checks remain outside this slice.
- `P2-14` is `partial-source-browser-implemented`; high-impact reason categories are substantially implemented, but lower-frequency controls and service/permission readiness states remain outside this slice.

## 4. Acceptance Scope

Step 4 may close or advance these items:

| Item | What Step 4 may claim after evidence | What Step 4 must not claim |
| --- | --- | --- |
| `P0-05` | Remediated for desktop-shell operability if browser route checks and native Tauri smoke prove visible, keyboard-reachable, correctly invoking controls across setup/workbench/settings. | Full release readiness unless packaged smoke, sidecar provenance, updater metadata, privacy audit, and release-owner signoff also exist. |
| `P2-13` | High-impact shared tooltip and compact command migration is source/browser verified. | All tooltip debt in the product is gone. Lower-frequency compact controls, target-size atom checks, and data-display `title` classifications remain separate. |
| `P2-14` | High-impact disabled reason and recovery hint coverage is source/browser verified. | Every disabled control in the app has an ideal visible reason. Service/permission readiness and rare advanced states remain follow-up unless explicitly verified. |
| `ux-micro-affordance-opportunities.md` items 1-2 | Foundation and high-impact scope implemented; remaining targets listed. | Optional status popovers, shortcut discovery, safe-open confirmations, field linkage, modal focus, release evidence, or target-size gaps are completed. |

Step 4 must leave unrelated ledger issues open, including but not limited to:

- `P0-01`, `P0-02`, `P0-04`: privacy/service configuration issues.
- `P1-01` through `P1-17`: workbench navigation, external mode, search, SSE, graph, setup, media/SNS, and other product tasks.
- `P2-01` through `P2-12`: target sizes, field linkage, visual coverage, inline style debt, diagnostic path copy, updater/release evidence, media modal focus, and automated a11y gaps.
- Release-candidate blockers in `docs/release/*` and `specs/002-advanced-capabilities/acceptance-checklist.md`.

## 5. Architecture Ownership

Step 4 must verify, not alter, these ownership boundaries unless evidence exposes a real defect:

| Concern | Required owner | Evidence to collect |
| --- | --- | --- |
| Native window APIs | L4 system atom | `scripts/ui-governance.test.mjs` passes L4-only Tauri window import rule. |
| Shell orchestration | L2 commander/view model | `appShellViewModel.test.ts` and `useAppShellCommander` source inspection show labels/actions are L2-owned. |
| Titlebar rendering | L3 common molecules | `AppLayout`, `AppTitleBar`, and `WindowControlCluster` receive props and callbacks; no direct Tauri calls in L3. |
| Route coverage | L1 routes plus shared shell | `/`, `/workbench`, `/dashboard`, and `/settings` E2E checks show the same controls. |
| Tooltip primitive | L4 UI | `Tooltip.test.tsx`, `IconButton` source, and governance prove shared behavior. |
| Disabled reason primitive | L4 UI plus L3 usage | `DisabledReason.test.tsx`, high-impact component tests, and governance prove shared behavior. |
| Privacy and copy | L2/L3 static/redacted copy plus E2E scan | `privacy-scan.ts` covers visible text, aria/title/alt, placeholders, and form values. |

## 6. Planned Evidence Changes

### 6.1 Create A Current Evidence Matrix

Files:

- `findings.md`
- `progress.md`
- `task_plan.md`
- optional temporary notes inside this plan's execution notes

Work:

- Record current branch, dirty state, and exact files changed by Step 0-3.
- Map each Step 0-3 deliverable to current source/tests before updating ledger status.
- Use a table with these columns:
  - issue id;
  - evidence type;
  - command or manual action;
  - expected result;
  - actual result;
  - status impact;
  - residual caveat.
- Keep source/UI, browser, native dev smoke, packaged smoke, and release-candidate evidence separate.

Exit:

- The implementer can point to evidence for every status change.
- No ledger item is marked more complete than the evidence supports.

### 6.2 Run Focused Source And Governance Verification

Files verified:

- `src/l4-atom/system/windowControls.test.ts`
- `src/l2-coordinator/commander/appShellViewModel.test.ts`
- `src/l4-atom/ui/Tooltip.test.tsx`
- `src/l4-atom/ui/DisabledReason.test.tsx`
- `scripts/ui-governance.test.mjs`
- high-impact component tests added in Step 2/3.

Commands:

- `pnpm test src/l4-atom/system/windowControls.test.ts src/l2-coordinator/commander/appShellViewModel.test.ts`
- `pnpm test src/l4-atom/ui/Tooltip.test.tsx src/l4-atom/ui/DisabledReason.test.tsx`
- `pnpm test scripts/ui-governance.test.mjs`
- `pnpm test src/l3-molecule/workbench/WorkbenchRail.test.tsx src/l3-molecule/graph/GraphControlBar.test.tsx src/l3-molecule/graph/GraphTimeline.test.tsx src/l3-molecule/media/MediaPreviewSheet.test.tsx src/l3-molecule/semantic/QAInput.test.tsx src/l3-molecule/semantic/SemanticIndexPreview.test.tsx`
- `pnpm test src/l3-molecule/developer/DbExplorer.test.tsx src/l3-molecule/developer/EndpointRunner.test.tsx src/l3-molecule/developer/SqlQueryPanel.test.tsx src/l3-molecule/developer/HookConfigPanel.test.tsx src/l3-molecule/developer/HermesBridgePanel.test.tsx src/l3-molecule/diagnostics/DiagnosticCopyButton.test.tsx src/l3-molecule/diagnostics/DiagnosticsPanel.test.tsx`
- `pnpm test src/l3-molecule/graph/GraphAdvancedPanel.test.tsx src/l3-molecule/graph/GraphQAPanel.test.tsx src/l3-molecule/graph/GraphVisualizePanel.test.tsx`

Expected evidence:

- L4 window wrapper tests pass for browser fallback and mocked Tauri dispatch.
- L2 shell view-model tests pass for maximize/restore labels.
- Tooltip and DisabledReason primitive tests pass for id/description linkage and no native title fallback.
- Governance passes with explicit tracked native title/data-display debt and no new command title debt.
- Governance confirms all high-impact disabled/loading states have `aria-describedby` and use `DisabledReason`.
- Component tests confirm privacy-safe reason copy and no raw private labels in relevant markup.

Exit:

- Source and unit-level evidence is current-date and recorded.
- Any failure is classified by layer before changing documentation.

### 6.3 Run Browser, Accessibility, Privacy, And Visual Evidence

Files verified:

- `e2e/specs/core.spec.ts`
- `e2e/specs/a11y.spec.ts`
- `e2e/specs/visual.spec.ts`
- `e2e/utils/window-controls.ts`
- `e2e/utils/privacy-scan.ts`

Commands:

- `pnpm fixtures:check`
- `pnpm e2e:a11y`
- `pnpm e2e`
- `pnpm e2e:visual`

Focused commands if diagnosis is needed:

- `pnpm exec playwright test e2e/specs/core.spec.ts --grep "desktop shell"`
- `pnpm exec playwright test e2e/specs/a11y.spec.ts --grep "window controls|tooltip|graph command"`
- `pnpm exec playwright test e2e/specs/visual.spec.ts`

Required browser assertions:

- `/` setup route exposes `最小化窗口`, `最大化窗口` or `还原窗口`, and `关闭窗口`.
- `/workbench?codex-smoke=workbench-ready` exposes the same controls at desktop and narrow widths.
- `/dashboard?codex-smoke=workbench-ready` exposes the same controls as the workbench compatibility route.
- `/settings` exposes the same controls at desktop and narrow widths.
- Window controls meet target-size thresholds: at least 32 x 32 in normal desktop density, at least 40 x 40 in narrow mode.
- Window controls do not overlap main content, workbench rail, or global command cluster.
- Keyboard can reach the titlebar controls and return to meaningful page content.
- Tooltip-enabled titlebar and graph commands expose `aria-describedby` and keep tooltip bubbles inside the viewport.
- Pointer tooltip reveal is delayed while focus reveal remains immediate.
- Migrated graph timeline entries are keyboard operable and reflect `aria-pressed`.
- Privacy scans include visible text, `aria-label`, `title`, `alt`, input/select/textarea values, and placeholders.
- Synthetic visual screenshots remain privacy-safe.

Exit:

- Browser evidence proves route coverage, keyboard reachability, a11y, visual stability, and privacy-scan safety.
- Browser evidence is not used as proof that native Tauri minimize/maximize/close actions work.

### 6.4 Run Full Source Verification

Commands:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm verify`

Expected evidence:

- `pnpm verify` remains the final source/UI quality gate because it runs lint, typecheck, test, and production build.
- If `pnpm test` or `pnpm verify` hits the known Windows/OneDrive Vitest process-launch instability, rerun the failing test family with the existing project strategy: threads pool, no file parallelism, and narrow target. Record the first failure and the successful rerun separately.

Exit:

- Full source/UI verification is current-date.
- Any caveat is concrete and tied to a command output.

### 6.5 Run Tauri Native Window Smoke

This is required before `P0-05` can be marked fully remediated for the desktop-shell issue scope.

Command:

- `pnpm tauri dev`

Privacy rule:

- Use synthetic route states or configuration-safe screens only.
- Do not open real private chat content.
- Do not paste local data paths, keys, tokens, API keys, or private message text into smoke notes.

Desktop shell visibility:

- Launch the app in Tauri dev mode.
- Confirm `/` shows the shared titlebar with `设置中心` and all three window controls.
- Navigate to `/workbench?codex-smoke=workbench-ready`, `/dashboard?codex-smoke=workbench-ready`, and `/settings`.
- Confirm all three controls appear on each route.

Native actions:

- Click `最小化窗口`; confirm the native desktop window minimizes.
- Restore the app from the taskbar or OS window switcher.
- Click `最大化窗口`; confirm the native window maximizes and the button label becomes `还原窗口`.
- Click `还原窗口`; confirm the native window restores and the button label becomes `最大化窗口`.
- Click `关闭窗口`; confirm the app window closes.

Drag/no-drag behavior:

- Drag the titlebar outside command clusters; confirm the window moves.
- Click global command buttons and window controls; confirm clicks are not swallowed by the drag region.

Sidecar lifecycle:

- If an app-managed sidecar is running, close the app and confirm the existing close lifecycle shuts down the app-managed sidecar.
- Confirm no unknown `5030` listener is stopped during this smoke.
- If sidecar state is not part of the smoke because the app is only in synthetic route mode, record that limitation explicitly.

Narrow/resize check:

- Resize the Tauri window to a narrow/mobile-ish width.
- Confirm window controls remain visible, target sizes remain usable, keyboard focus works, and content does not overlap.

Evidence to record:

- Date and environment.
- Command used.
- Route/page.
- Viewport or window size.
- Action tested.
- Observed result.
- Sidecar running state.
- Whether the smoke was dev-mode or packaged.
- Remaining caveat.

Exit:

- `P0-05` can advance only if native actions are observed.
- If native smoke is not run, leave `P0-05` open with source/browser evidence only.

### 6.6 Conditional Packaged Smoke And Release Checks

Run this only if the implementer wants Step 4 to update release evidence beyond source/UI and Tauri dev smoke.

Commands:

- `cd src-tauri && cargo test`
- `pnpm tauri build`
- `pnpm release:check:sidecar`
- `pnpm release:check:sidecar:release`
- `pnpm release:check:updater`

Expected current release-risk behavior:

- `cd src-tauri && cargo test` should pass if no Rust regression exists.
- `pnpm tauri build` should produce Windows MSI/NSIS artifacts if sidecar packaging inputs are present.
- `pnpm release:check:sidecar` may pass in check mode.
- `pnpm release:check:sidecar:release` must not be represented as passing unless sidecar provenance is approved.
- `pnpm release:check:updater` is expected to remain blocked until generated signed updater metadata exists under `src-tauri/target`.

Packaged Windows smoke if release evidence is desired:

- Open or install the generated Windows x64 app artifact.
- Confirm window controls invoke native actions in the installed app, not only in Tauri dev mode.
- Confirm setup/workbench/settings shell coverage.
- Confirm app-managed sidecar health and close cleanup if the packaged app starts the sidecar.
- Confirm diagnostics/privacy notes are redaction-safe.
- Confirm unknown `5030` occupant is not killed.

Exit:

- If packaged smoke is not run, document `source-ui-verified` or `native-dev-smoke-verified` only.
- Do not claim `packaged-smoke-verified` or release readiness from `pnpm tauri build` alone.

## 7. Documentation Update Plan

### 7.1 Update `product-acceptance-issue-ledger.md`

Files:

- `product-acceptance-issue-ledger.md`

Work:

- Reconcile `Status values` at the top of the ledger with statuses actually used in the file. If `partial-source-browser-implemented` remains used, add it to the legend. If a fully closed state is needed, add a clear `remediated` definition.
- For `P0-05`, update status and evidence only according to the native smoke result:
  - If source/browser checks pass but native smoke is not run, keep `Status: confirmed` or move only to a partial status and state `native Tauri smoke pending`.
  - If Tauri dev native smoke passes, mark the desktop-shell issue remediated for source/browser/native-dev scope, but explicitly say packaged/release-candidate smoke is not claimed unless performed.
  - If packaged smoke passes, add packaged evidence separately and distinguish it from release readiness.
- For `P2-13`, keep or update `partial-source-browser-implemented` unless lower-frequency controls and target-dimension checks are also closed. Add current evidence for:
  - shared Tooltip contract;
  - IconButton no native title fallback;
  - governance no-growth rule;
  - high-impact Workbench/graph/media command migration;
  - graph browser tooltip/timeline checks;
  - remaining lower-frequency/data-display title classifications.
- For `P2-14`, keep or update `partial-source-browser-implemented` unless lower-frequency and service/permission readiness controls are also closed. Add current evidence for:
  - shared DisabledReason primitive;
  - high-impact disabled/loading reason coverage;
  - governance coverage for `Button loading=`;
  - QA privacy entity masking;
  - graph/developer/diagnostics follow-up tests;
  - remaining service/permission/lower-frequency work.
- Do not edit unrelated issues except to add cross-reference notes if a command failure reveals a real new blocker.

Exit:

- Ledger status and evidence match what was actually verified.
- Remaining work is explicit and not hidden inside optimistic language.

### 7.2 Update `ux-micro-affordance-opportunities.md`

Files:

- `ux-micro-affordance-opportunities.md`

Work:

- Keep opportunity 1, shared tooltip policy, marked as foundation and high-impact migration implemented only if Step 4 evidence confirms it.
- Keep lower-frequency compact controls, inspector/drawer close/open controls, QA evidence controls, status popovers, shortcut discovery, and safe-open confirmations as pending where not implemented.
- Keep opportunity 2, disabled-reason hints, marked as shared primitive and high-impact reason categories implemented only if Step 4 evidence confirms it.
- Keep service/DB readiness, unsupported/permission-blocked advanced controls, and rare compact disabled controls as pending where not implemented.
- Add a short evidence pointer to the new `release-evidence.md` section if that section is created.

Exit:

- Opportunities file separates implemented foundation/high-impact scope from optional or out-of-scope enhancements.

### 7.3 Update Release Evidence Without Overclaiming

Files:

- `specs/001-ready-desktop-app/release-evidence.md`
- optionally `docs/release/ready-desktop-app.md`
- optionally `specs/002-advanced-capabilities/acceptance-checklist.md`
- optionally `docs/release/privacy-audit.md` only for a concrete release candidate

Work:

- Add a new section in `specs/001-ready-desktop-app/release-evidence.md` named `2026-06-08 Desktop Shell And Micro-Affordance Evidence`.
- Record source/UI commands and results.
- Record browser E2E/a11y/visual results.
- Record Tauri native dev smoke result if performed.
- Record packaged smoke result only if performed.
- Record release checks only if performed, including expected blockers such as missing updater metadata.
- Explicitly distinguish:
  - `source-ui-verified`;
  - `browser-verified`;
  - `native-dev-smoke-verified`;
  - `packaged-smoke-verified`;
  - `release-artifact-verified`;
  - `release-blocked`.
- If `docs/release/ready-desktop-app.md` is updated, add or adjust dashboard rows without weakening the existing release-blocked statuses for sidecar provenance, updater signing, packaged smoke refresh, and privacy audit.
- Do not update `docs/release/privacy-audit.md` as passed unless a concrete candidate is reviewed after the current build.

Exit:

- Release evidence helps future reviewers understand this shell/micro-affordance slice without implying the whole product is release-ready.

### 7.4 Update Working Memory

Files:

- `task_plan.md`
- `findings.md`
- `progress.md`

Work:

- Mark this Step 4 planning task complete after the plan is written and verified.
- During implementation of this Step 4 plan, record actual command outputs and manual smoke outcomes.
- Log all failures, including quoting/tooling issues and reruns, so future workers do not repeat failed approaches.

Exit:

- Working memory points to the new plan and captures residual assumptions.

## 8. Command Plan

Planning-document verification after this plan is written:

- Confirm file exists: `Test-Path .\2026-06-08-desktop-shell-acceptance-evidence-ledger-update-plan.md`
- Confirm line count and key sections: inspect headings or use `Select-String`.
- Confirm no fenced code blocks: fixed-string search for triple backticks.
- Confirm no actionable placeholders with the project's normal placeholder-pattern scan.
- Confirm no trailing whitespace in this plan.
- Run `git diff --check -- 2026-06-08-desktop-shell-acceptance-evidence-ledger-update-plan.md task_plan.md findings.md progress.md`.

Implementation verification for Step 4 execution:

- `pnpm test src/l4-atom/system/windowControls.test.ts src/l2-coordinator/commander/appShellViewModel.test.ts`
- `pnpm test src/l4-atom/ui/Tooltip.test.tsx src/l4-atom/ui/DisabledReason.test.tsx`
- `pnpm test scripts/ui-governance.test.mjs`
- `pnpm test src/l3-molecule/workbench/WorkbenchRail.test.tsx src/l3-molecule/graph/GraphControlBar.test.tsx src/l3-molecule/graph/GraphTimeline.test.tsx src/l3-molecule/media/MediaPreviewSheet.test.tsx src/l3-molecule/semantic/QAInput.test.tsx src/l3-molecule/semantic/SemanticIndexPreview.test.tsx`
- `pnpm test src/l3-molecule/developer/DbExplorer.test.tsx src/l3-molecule/developer/EndpointRunner.test.tsx src/l3-molecule/developer/SqlQueryPanel.test.tsx src/l3-molecule/developer/HookConfigPanel.test.tsx src/l3-molecule/developer/HermesBridgePanel.test.tsx src/l3-molecule/diagnostics/DiagnosticCopyButton.test.tsx src/l3-molecule/diagnostics/DiagnosticsPanel.test.tsx`
- `pnpm test src/l3-molecule/graph/GraphAdvancedPanel.test.tsx src/l3-molecule/graph/GraphQAPanel.test.tsx src/l3-molecule/graph/GraphVisualizePanel.test.tsx`
- `pnpm fixtures:check`
- `pnpm e2e:a11y`
- `pnpm e2e`
- `pnpm e2e:visual`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm verify`

Desktop/native evidence:

- `pnpm tauri dev`
- `cd src-tauri && cargo test` if Rust/Tauri code changed or if final desktop evidence is being refreshed.
- `pnpm tauri build` only when packaged/build evidence is needed.

Release-risk evidence, only when claiming release readiness or updating release dashboard:

- `pnpm release:check:sidecar`
- `pnpm release:check:sidecar:release`
- `pnpm release:check:updater`

## 9. Sequencing

### Task 4.1: Lock Baseline And Evidence Scope

Files:

- `task_plan.md`
- `findings.md`
- `progress.md`
- `product-acceptance-issue-ledger.md`
- `ux-micro-affordance-opportunities.md`

Work:

- Capture `git status --short --branch`.
- Confirm current branch is not `master`.
- Re-read parent and Step 0-3 plans.
- Re-read `P0-05`, `P2-13`, and `P2-14` ledger sections.
- Confirm whether the ledger already contains post-Step-3 follow-up evidence.
- Build the issue-to-evidence matrix.

Exit:

- Evidence scope is explicit before commands run.
- No issue status has been changed yet.

### Task 4.2: Verify Source Contracts And Governance

Files:

- L4 system/window control tests.
- L2 shell view tests.
- L4 UI primitive tests.
- high-impact component tests.
- `scripts/ui-governance.test.mjs`.

Work:

- Run the focused commands from section 6.2.
- If any command fails, classify the layer before editing documentation:
  - L4 system;
  - L2 shell/view model;
  - L3 molecule;
  - L4 UI primitive;
  - E2E harness;
  - governance script;
  - tooling.
- Do not mark the ledger if focused source evidence is failing.

Exit:

- Focused source and governance evidence is green or the blocker is recorded.

### Task 4.3: Verify Browser, A11y, Visual, And Privacy Gates

Files:

- `e2e/specs/core.spec.ts`
- `e2e/specs/a11y.spec.ts`
- `e2e/specs/visual.spec.ts`
- `e2e/utils/window-controls.ts`
- `e2e/utils/privacy-scan.ts`

Work:

- Run `pnpm fixtures:check`.
- Run `pnpm e2e:a11y`.
- Run `pnpm e2e`.
- Run `pnpm e2e:visual`.
- Record route, width, state, and assertion coverage.
- Confirm privacy scans include tooltip/title/aria/form text.

Exit:

- Browser evidence is current-date.
- Any visual snapshot update is intentional, reviewed, and privacy-safe.

### Task 4.4: Run Native Desktop Smoke

Files:

- no source file should change unless the smoke exposes a defect.
- evidence notes go into `progress.md`, `findings.md`, and later release/ledger docs.

Work:

- Run `pnpm tauri dev`.
- Perform the checklist in section 6.5.
- Record whether sidecar lifecycle was part of the smoke.
- Record that dev-mode smoke is not packaged smoke.

Exit:

- `P0-05` has the missing native-action evidence, or remains open with the exact reason.

### Task 4.5: Run Broad Source Verification

Files:

- no source file should change unless verification exposes a real defect.

Work:

- Run `pnpm lint`.
- Run `pnpm typecheck`.
- Run `pnpm test`.
- Run `pnpm build`.
- Run `pnpm verify`.
- If needed for desktop final evidence, run `cd src-tauri && cargo test`.

Exit:

- Full source verification is recorded.
- If verification cannot be completed, documentation must say which gate is missing and why.

### Task 4.6: Reconcile Ledger And Opportunities

Files:

- `product-acceptance-issue-ledger.md`
- `ux-micro-affordance-opportunities.md`

Work:

- Update the status legend if current status values are missing from the legend.
- Update `P0-05`, `P2-13`, and `P2-14` only to the level proven.
- Add exact command/manual evidence summaries.
- Preserve unrelated issues as open.
- Keep opportunities 1-2 honest about foundation/high-impact completion versus remaining broader migration.

Exit:

- Ledger and opportunities no longer imply either less or more progress than the evidence supports.

### Task 4.7: Record Release Evidence And Release Risk

Files:

- `specs/001-ready-desktop-app/release-evidence.md`
- optionally `docs/release/ready-desktop-app.md`
- optionally `specs/002-advanced-capabilities/acceptance-checklist.md`
- optionally `docs/release/privacy-audit.md`

Work:

- Add the new 2026-06-08 evidence section.
- Record source/browser/native/package/release states separately.
- Keep release-blocked statuses if updater metadata, sidecar provenance, packaged smoke refresh, privacy audit, or owner signoff are missing.
- Do not turn `pnpm tauri build` into a release-ready claim.

Exit:

- Future release reviewers can see what this desktop-shell slice proves and what it does not prove.

### Task 4.8: Final Handoff And Self-Review

Files:

- `task_plan.md`
- `findings.md`
- `progress.md`
- updated ledger/opportunity/evidence docs

Work:

- Update working memory with exact command results.
- Search updated docs for actionable placeholders.
- Run `git diff --check` on touched docs.
- Review status wording for overclaiming.
- Confirm no private paths, secrets, data keys, tokens, or private chat content were added to docs.

Exit:

- Step 4 evidence and documentation can be reviewed independently.

## 10. Privacy And Security Guardrails

- All evidence must use synthetic, mocked, or privacy-masked data.
- Do not include raw local filesystem paths, real usernames, real WeChat ids, `dataKey`, API keys, tokens, signing keys, updater private keys, SQL drafts, endpoint payloads, raw URLs from private content, or private chat text.
- Tooltip and disabled-reason copy must remain static or redaction-safe.
- Privacy scans must cover visible text, `aria-label`, `title`, `alt`, form values, and placeholders.
- Manual smoke notes should say whether sidecar was running, but should not paste process command lines that include private paths.
- Do not broaden Tauri CSP or capabilities in this step. If evidence unexpectedly requires a permission change, stop and create a separate sidecar/Tauri integration task.

## 11. UI Acceptance Checks

Step 4 evidence must answer these user-perspective questions:

- Can a first-time user find basic window actions on setup, workbench, dashboard alias, and settings?
- Can keyboard users reach the same actions and return to page content?
- Do tooltip and disabled-reason explanations reduce guessing without crowding dense panels?
- Do controls keep stable target sizes and avoid overlap at desktop and narrow widths?
- Does privacy mode still mask retained semantic entity labels, visible text, attributes, screenshots, and browser output?
- Does graph command migration remain keyboard-operable and stateful?
- Do loading-disabled high-impact buttons explain the busy state instead of silently disabling?
- Does the documentation distinguish high-impact completion from lower-frequency follow-up?

Page/design scoring impact:

- The shell should no longer fail due to blocked navigation or missing basic desktop operation.
- Tooltip/disabled reason work should improve recognition over recall, consistency, and recovery.
- Remaining page-level design scores must not be inflated unless the page itself was reviewed against the 10-item 16/20 standard.

## 12. Non-Goals

- Do not migrate every remaining compact control in the product.
- Do not close target-size, Field `aria-describedby`, media modal focus, safe-open, status popover, shortcut discovery, updater, sidecar provenance, or privacy-audit ledger items unless separately implemented and verified.
- Do not change `chatlog_alpha` backend behavior or sidecar API contracts.
- Do not change Tauri capabilities, CSP, updater workflow, release workflow, or sidecar artifact manifest in this Step 4 documentation pass unless evidence exposes a separate release blocker and the scope is explicitly expanded.
- Do not commit sidecar binaries, build output, private logs, local chat data, screenshots with real data, or generated release artifacts.
- Do not call a source/browser-verified slice release-ready.
- Do not paste complete implementation code into this plan or follow-up planning docs.

## 13. Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Browser E2E passes but native minimize/maximize/close does not work | Require `pnpm tauri dev` native smoke before `P0-05` remediation status. |
| Tauri dev smoke passes but packaged app differs | Record `native-dev-smoke-verified` only; run packaged smoke before package evidence. |
| Ledger status overclaims broad tooltip/disabled coverage | Keep `P2-13` and `P2-14` partial unless lower-frequency/service-readiness controls are actually closed. |
| Release docs imply release readiness | Use source/browser/native/package/release state labels and keep release blockers explicit. |
| Tooltip/reason copy leaks private content through aria or screenshots | Use static copy and run privacy scans after tooltip/reason text is visible. |
| Governance blocks unrelated historical data-display title usage | Keep data-display/structural `title` usage explicitly classified and separate from command-tooltip debt. |
| Manual smoke notes capture sensitive local state | Use synthetic routes and redact environment details. |
| Verification commands are expensive or flaky on Windows/OneDrive | Run full gates when making acceptance claims; if flaky, record initial failure and rerun the narrow command with existing thread/no-file-parallelism strategy. |

## 14. Acceptance Criteria For This Plan

This Step 4 plan is ready when:

- It reflects the current Step 0-3 source/test/ledger progress, including follow-up fixes after the Step 3 review caveats.
- It names exact files to update during evidence closure.
- It separates source/UI, browser, native dev smoke, packaged smoke, and release-candidate evidence.
- It defines exact command gates and manual smoke checks.
- It gives specific ledger status transition rules for `P0-05`, `P2-13`, and `P2-14`.
- It preserves unrelated ledger issues and release blockers.
- It includes privacy, architecture, UI acceptance, responsive, keyboard, and release-risk guardrails.
- It avoids full implementation code.
- It can be executed without guessing what evidence belongs where.

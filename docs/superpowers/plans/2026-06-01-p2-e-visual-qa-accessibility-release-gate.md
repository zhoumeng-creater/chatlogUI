# P2-E Visual QA Accessibility And Release Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` when the implementation is split across independent workers, or `superpowers:executing-plans` when executing this plan task-by-task in one session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close P2 by converting the current P2-A through P2-D implementation into an evidence-backed desktop release candidate: responsive visual QA, keyboard and accessibility coverage, privacy-safe UI and diagnostics verification, and Windows x64 package smoke evidence.

**Architecture:** P2-E must not change the `chatlog_alpha` sidecar contract. L1 remains route/layout/event delegation only. L2 owns readiness, privacy state, orchestration, smoke-state derivation, and user-safe error messages. L3 renders props-driven UI surfaces and receives callbacks from module roots. L4 network/system atoms remain raw HTTP/Tauri wrappers. Release smoke records evidence; it must not broaden CSP/capabilities or add telemetry.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Tauri v2, Rust tests, pnpm, Tailwind CSS v4/project CSS variables, lucide-react, Framer Motion only where already present and reduced-motion safe, Three.js/React Three Fiber only behind the explicit graph visualization path, local Windows x64 packaging artifacts.

---

## 1. Current Baseline

P2-E starts after the 2026-06-01 P2-D suggested fix:

- Current branch: `codex/p2-d-ai-graph-containment`.
- Current worktree contains many P2-C/P2-D/P2-D suggested-fix source and documentation changes. Treat them as the current baseline. Do not revert or overwrite unrelated dirty files.
- `task_plan.md` latest completed stage is Phase 25: P2-D Suggested Fix Implementation.
- P2-A delivered shell/tokens/setup/settings foundation.
- P2-B delivered chat/search/stats polish, privacy accessibility fixes for conversation rows, long-history virtualization, search states, stats measured fallback, and release evidence scaffolding.
- P2-C delivered settings/diagnostics/readiness redaction, user-triggered diagnostics export, and setup/settings L2 boundary work.
- P2-D delivered semantic/graph contract containment, optional semantic states, graph summary/table default view, on-demand graph visualization, semantic/graph privacy helpers, architecture scans, and dev-only `?codex-smoke=workbench-ready`.

Automated evidence already recorded:

- `pnpm verify` passed on 2026-06-01 with 57 test files / 322 tests.
- `pnpm tauri build` passed in prior P2-D remediation and produced MSI/NSIS artifacts.
- `cargo test` passed in prior P2-D remediation with 17 tests.
- Mocked/headless UI smoke passed for `/workbench?codex-smoke=workbench-ready` and `/` at 1440px and 390px.
- Semantic/graph architecture scans are clean except the accepted module-root L2 bridges: `AiPanel.tsx` and `GraphModule.tsx`.

Remaining release/productization work:

- `specs/001-ready-desktop-app/tasks.md` still leaves T029, T030, and T042 unchecked.
- `specs/001-ready-desktop-app/release-evidence.md` still records Install, Launch, Quit, Reopen, and Port conflict as Not run.
- `docs/release/ready-desktop-app.md` still requires manual Windows x64 install/open/quit/reopen/unknown-port-conflict evidence.
- `GraphCanvas` remains split behind explicit visualization, but the lazy chunk still triggers a Vite >500 kB warning.
- Rust still emits the existing non-snake-case crate warning for `chatlogUI_lib`.
- `specs/000-productization/*` does not exist in this repo; P2-E uses `.specify/memory/constitution.md`, `specs/001-ready-desktop-app/*`, `docs/release/ready-desktop-app.md`, P2-A/P2-B/P2-C/P2-D plans and reviews, and current source as the source of truth.

Current code observations relevant to P2-E:

- At planning time, `AGENTS.md` said the Rust sidecar launcher starts `serve --http-addr 0.0.0.0:5030`, while current code/contracts used `127.0.0.1:5030`. P2-E comprehensive remediation resolved this drift by documenting `127.0.0.1:5030` as the local-only default.
- `src/l3-molecule/common/UpdateNotification.tsx` is a user-visible overlay with hard-coded dark styling, inline colors, backdrop dismissal, and no explicit dialog role, focus initialization, focus restore, or Escape handling.
- `src/l3-molecule/workbench/WorkbenchFrame.tsx` drawer closes on backdrop click and has a close button, but current code does not explicitly focus the drawer/close control, restore focus, or handle Escape.
- `src/l3-molecule/stats/TopContactCard.tsx` renders `item.display || item.sender` directly in visible text, avatar fallback, and avatar alt. It does not receive privacy state.
- `src/l1-entry/pages/WorkbenchView.tsx` renders `workbench.currentConversation?.displayName` directly in the toolbar title. This must be reviewed against privacy mode because prior P2-B privacy fixes focused on conversation rows.
- Inline styles and hard-coded colors remain in setup, settings, semantic, graph, common UI atoms, and `UpdateNotification`. P2-E should classify these by visible release risk instead of attempting a broad style rewrite.
- Baseline scans on 2026-06-01 show L1/L3 raw network and L4-to-L2 scans are currently clean; semantic/graph L2 imports remain only in module roots (`AiPanel.tsx`, `GraphModule.tsx`); `ai.phase` is absent from L1/L3.
- Baseline role/focus scan found no `role="dialog"`, `aria-modal`, Escape handling, or focus management in the workbench/common/L1 surfaces relevant to drawer/update notification. P2-E must treat drawer/update notification accessibility as implementation work, not just a QA checklist.

## 2. P2-E Scope

P2-E includes:

- Full visual QA matrix for setup, workbench, settings, dashboard alias, semantic module, graph module, update notification, diagnostics/dev console, loading, empty, error, success, and privacy-on states.
- Responsive checks at 1440, 1180, 900, 768, and 390 px, with light/dark mode where supported.
- Keyboard and accessibility checks for tab order, focus visibility, drawer/dialog behavior, Escape handling, accessible names, `aria-current`, no color-only states, reduced motion, and screen-reader-visible privacy surfaces.
- Privacy verification for visible text, accessibility labels, avatar alt/fallbacks, titles/tooltips, screenshots, dev console, diagnostics report/export, semantic evidence, graph labels, search snippets, stats senders, local paths, and credentials.
- Targeted remediation for concrete P2-E blockers found during baseline scans, especially stats/workbench privacy leaks, drawer focus handling, and update notification dialog semantics.
- Graph visualization evidence that confirms the heavy 3D path remains explicit, nonblank, bounded, and recorded with the existing chunk warning.
- Windows x64 release-gate evidence: install/open packaged app, no-terminal launch, sidecar `/health`, quit cleanup, reopen, unknown `5030` process conflict, privacy-safe logs/screenshots, and updated release docs.
- Productization task closeout for T029/T030/T042 only after the corresponding evidence actually exists.

P2-E does not include:

- New sidecar endpoints or backend behavior changes.
- macOS packaging, notarization, signing, or a full auto-update release pipeline.
- P3 semantic feature expansion, SNS/media export, SQL editor expansion, or new AI provider features.
- Eliminating the lazy `GraphCanvas` chunk warning unless measurement proves it blocks release. P2-E must record it honestly and verify it is isolated behind explicit visualization.
- Broad component-library rewrites unrelated to release-blocking visual, privacy, or accessibility defects.
- Automatic telemetry, remote diagnostic upload, or unrequested remote calls.

## 3. Evidence Rules

- Use only synthetic, mocked, redacted, or user-approved local evidence.
- Do not paste raw `dataKey`, API keys, tokens, credentials, real chat text, real contact names, or full private local paths into docs.
- Screenshots used for evidence must be privacy-on or synthetic/mocked data unless the user explicitly approves otherwise.
- Diagnostic packages must be generated by explicit user action and reviewed for redaction before marking privacy evidence complete.
- Keep T042 unchecked until Windows x64 install/launch/quit/reopen/sidecar cleanup/unknown-port-conflict smoke has actually run.
- If a release smoke step is blocked by missing sanitized local data, record the blocker instead of inventing evidence.

## 4. File Structure

Create:

- `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`

Potentially create if implementation needs repeatable browser evidence:

- `scripts/p2e-ui-smoke.mjs`

Modify:

- `src/l2-coordinator/commander/useWorkbenchCommander.ts`
- `src/l2-coordinator/commander/workbenchViewModel.ts`
- `src/l2-coordinator/commander/workbenchViewModel.test.ts`
- `src/l1-entry/pages/WorkbenchView.tsx`
- `src/l3-molecule/stats/StatsInspector.tsx`
- `src/l3-molecule/stats/TopContactCard.tsx`
- `src/l3-molecule/stats/statsDisplay.ts`
- `src/l3-molecule/stats/statsDisplay.test.ts`
- `src/l3-molecule/workbench/WorkbenchFrame.tsx`
- `src/l3-molecule/common/UpdateNotification.tsx`
- `src/styles/layout.css`
- `specs/001-ready-desktop-app/tasks.md`
- `specs/001-ready-desktop-app/release-evidence.md`
- `specs/001-ready-desktop-app/architecture-boundary-check.md`
- `docs/release/ready-desktop-app.md`
- `task_plan.md`
- `findings.md`
- `progress.md`

Do not modify unless a P2-E check exposes a blocker:

- `src-tauri/tauri.conf.json`
- `src-tauri/src/sidecar.rs`
- `src-tauri/src/service_probe.rs`
- `src-tauri/capabilities/default.json`

## 5. Task E0: Baseline, Sources, And Scans

**Files:**
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`

- [ ] Confirm branch and dirty scope.

Run:

```powershell
git status --short --branch
```

Expected branch:

```text
## codex/p2-d-ai-graph-containment
```

Record that existing P2-C/P2-D/P2-D suggested-fix changes are baseline context.

- [ ] Read and cite the current source documents.

Required source documents:

- `AGENTS.md`
- `docs/总体开发规划.md`
- `开发指南.md`
- `docs/ui-functional-audit-and-redesign-plan.md`
- `.specify/memory/constitution.md`
- `specs/001-ready-desktop-app/spec.md`
- `specs/001-ready-desktop-app/plan.md`
- `specs/001-ready-desktop-app/research.md`
- `specs/001-ready-desktop-app/data-model.md`
- `specs/001-ready-desktop-app/quickstart.md`
- `specs/001-ready-desktop-app/contracts/app-readiness.md`
- `specs/001-ready-desktop-app/contracts/local-backend.md`
- `specs/001-ready-desktop-app/contracts/diagnostics-package.md`
- `specs/001-ready-desktop-app/tasks.md`
- `specs/001-ready-desktop-app/release-evidence.md`
- `specs/001-ready-desktop-app/architecture-boundary-check.md`
- `docs/release/ready-desktop-app.md`
- P2-A/P2-B/P2-C/P2-D plans and review/remediation documents under `docs/superpowers/plans/` and `docs/reviews/`

- [ ] Run baseline architecture and UI-risk scans.

Run:

```powershell
rg -n "@l4/network|@/l4-atom/network|fetch\(|EventSource|WebSocket|axios" src\l1-entry src\l3-molecule
rg -n "@l2|l2-coordinator" src\l4-atom
rg -n "@l2|l2-coordinator" src\l3-molecule\semantic src\l3-molecule\graph
rg -n "ai\.phase" src\l1-entry src\l3-molecule
rg -n "AppleButton|GlassPanel|dangerouslySetInnerHTML|alert\(|console\.(log|debug|info|warn|error)" src
rg -n "style=\{\{" src\l1-entry src\l3-molecule src\l4-atom
rg -n "#[0-9A-Fa-f]{3,8}|rgba\(|linear-gradient|backdropFilter|backdrop-filter" src\l1-entry src\l3-molecule src\l4-atom src\styles
rg -n "dataKey|data_key|api[_-]?key|token|secret|credential|password|wxid_|WeChat Files|sender_name|talker_name" src specs docs
```

Expected interpretation:

- L1/L3 raw network scan should stay empty.
- L4-to-L2 scan should stay empty.
- Semantic/graph L2 scan should only show accepted module-root bridges if unchanged.
- `ai.phase` should not appear in L1/L3.
- Unsafe UI/secret/style scans are not automatic blockers; classify each hit as release-blocking, accepted compatibility, synthetic test data, redaction helper, placeholder, or follow-up.

- [ ] Create `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`.

The matrix must include columns:

- Route/surface
- State
- Width/theme
- Privacy mode
- Keyboard path
- Expected result
- Evidence status
- Notes/blockers

Initial required rows:

- `/` setup center: clean profile, missing path, invalid path, backend starting, backend ready, backend conflict.
- `/workbench?codex-smoke=workbench-ready`: chat, search, stats, semantic, graph summary, graph explicit visualization.
- `/workbench`: real setup/db gate without smoke override.
- `/dashboard`: alias behavior.
- `/settings`: data, AI model, appearance, diagnostics/about.
- Update notification: available, downloading, ready, error.
- Dev console/diagnostics: empty logs, redacted logs, export success/failure.

## 6. Task E1: Privacy Regression Fixes For Workbench And Stats

**Files:**
- Modify: `src/l2-coordinator/commander/useWorkbenchCommander.ts`
- Modify: `src/l1-entry/pages/WorkbenchView.tsx`
- Modify: `src/l3-molecule/stats/StatsInspector.tsx`
- Modify: `src/l3-molecule/stats/TopContactCard.tsx`
- Modify: `src/l3-molecule/stats/statsDisplay.ts`
- Modify: `src/l3-molecule/stats/statsDisplay.test.ts`

- [ ] Add RED tests for stats sender privacy display helpers.

Add helper coverage in `statsDisplay.test.ts`:

- Privacy off returns the sender display name or id.
- Privacy on masks sender display text.
- Privacy on returns a non-identifying avatar alt.
- Empty display falls back to masked/non-identifying text, not raw `sender`.
- Counts remain visible because aggregate counts are allowed.

- [ ] Add or extend helper functions in `statsDisplay.ts`.

Expected helpers:

- `formatTopSenderName(sender, privacyOn)`
- `formatTopSenderAvatarAlt(sender, privacyOn)`
- `formatTopSenderFallback(sender, privacyOn)`

These helpers must not reveal raw sender ids or display names when privacy mode is on.

- [ ] Pass privacy mode from L2 to stats UI.

Implementation direction:

- `useWorkbenchCommander()` may read `useSettingsStore` because it is L2 orchestration.
- Return `privacyOn` as part of the workbench view model.
- Prefer a pure helper in `workbenchViewModel.ts` for the toolbar conversation title, with tests for privacy on/off and empty selection.
- `WorkbenchView` passes `privacyOn` to `StatsInspector`.
- `StatsInspector` passes `privacyOn` to `TopContactCard`.
- Do not make `TopContactCard` read a store directly.

- [ ] Mask the workbench toolbar conversation title.

`WorkbenchView` currently renders `workbench.currentConversation?.displayName` directly. When `privacyOn` is true, the toolbar title must use the same privacy display policy as conversation rows or a neutral label such as `已隐藏会话`.

- [ ] Run targeted tests.

Run:

```powershell
pnpm test src\l3-molecule\stats\statsDisplay.test.ts src\l3-molecule\chat\conversationDisplay.test.ts src\l2-coordinator\commander\workbenchViewModel.test.ts
pnpm typecheck
```

- [ ] Record evidence.

Update `p2-e-visual-qa-matrix.md` and `findings.md` with the privacy surfaces checked:

- Visible toolbar title.
- Stats top senders.
- Avatar alt/fallback.
- Existing conversation row accessibility labels.

## 7. Task E2: Drawer And Update Notification Accessibility

**Files:**
- Modify: `src/l3-molecule/workbench/WorkbenchFrame.tsx`
- Modify: `src/l3-molecule/common/UpdateNotification.tsx`
- Modify: `src/styles/layout.css`

- [ ] Harden workbench drawer keyboard behavior.

Expected behavior:

- Drawer container has appropriate dialog-like semantics when it overlays the page on compact/single layouts.
- Opening the drawer focuses the close button or drawer container.
- Escape closes the drawer.
- Closing the drawer restores focus to the previously focused element when feasible.
- Backdrop click still closes the drawer.
- Drawer body click does not close the drawer.
- Focus outline remains visible.

Implementation direction:

- Use `useEffect` and `useRef` inside `WorkbenchFrame`.
- Add `role="dialog"` and `aria-modal="true"` for overlay drawer mode.
- Add `aria-labelledby` for the drawer title.
- Capture `document.activeElement` before moving focus, then restore on close if the element is still connected.
- Avoid adding global key listeners that remain after unmount.

- [ ] Harden update notification as an accessible dialog.

Expected behavior:

- Dialog has `role="dialog"`, `aria-modal="true"`, and a stable title id.
- First actionable button or the dialog container receives focus on open.
- Escape dismisses only dismissible states.
- Focus is restored on dismiss/install/retry path when feasible.
- Progress is exposed with `role="progressbar"` and `aria-valuenow` during download.
- Error text uses a non-color-only status surface.
- Motion respects reduced-motion preferences.

Implementation direction:

- Replace inline hard-coded overlay/card styles with tokenized classes in `layout.css`.
- Keep `useUpdateCommander()` only at the L3 module root; do not move update orchestration into L1.
- Prefer existing `Button` primitives.
- Do not add a remote updater flow or broaden updater permissions in P2-E.

- [ ] Browser acceptance checks.

Use the in-app browser, headless Chrome, or the existing local smoke approach to check:

- Tab reaches drawer close button.
- Escape closes drawer.
- Focus returns to the module trigger or a stable workbench control.
- Update notification is keyboard reachable and has no horizontal overflow at 390 px.
- Reduced-motion mode does not run springy transition effects.

- [ ] Record caveats honestly.

If full focus trapping is too invasive for the current layout, record the residual risk and ensure at minimum that initial focus, Escape close, and focus restore are implemented.

## 8. Task E3: Visual QA Matrix

**Files:**
- Modify: `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`
- Modify if blockers are found: route/component files listed in the matrix.

- [ ] Start the frontend dev server.

Run:

```powershell
pnpm dev
```

Use `http://localhost:5173` as the canonical frontend dev server. If occupied, record the alternate port instead of changing project defaults.

- [ ] Check required widths.

For each required route/state, check:

- 1440 px
- 1180 px
- 900 px
- 768 px
- 390 px

Required assertions:

- No page-level horizontal overflow.
- No clipped primary actions.
- No unreadable tiny controls.
- No overlapping toolbar/status/sidebar/drawer content.
- Dialogs/drawers remain closeable.
- Loading/empty/error/success states remain visible.
- Touch targets remain at least 32 px for compact workbench controls, and preferably 40 px where layout permits.
- Status is not conveyed by color alone.

- [ ] Check required routes and states.

Setup:

- Clean profile.
- Missing data path.
- Manual path selection.
- Sidecar starting.
- Managed sidecar ready.
- Unknown port conflict.
- Diagnostic export success/failure.

Workbench:

- Chat list empty.
- Chat selected.
- Long transcript.
- Search initial/loading/invalid/no results/results/error.
- Stats empty/loading/error/success/privacy-on.
- Semantic not configured/index building/index ready/QA streaming/stopped/error.
- Graph summary empty/loading/malformed/oversized/error/success.
- Graph explicit visualization loading/nonblank/cancelled.

Settings:

- Data settings validation error/saved.
- AI credential absent/present flags without raw key.
- Privacy toggle on/off.
- Appearance/material choices.
- About/update check state if available.

Common:

- Update notification available/downloading/ready/error.
- Dev console empty/redacted logs/export.
- Status bar with backend/db/semantic combinations.

- [ ] Check themes and motion.

Required checks:

- Light mode.
- Dark mode if supported by current settings/system.
- Reduced-motion preference.

Do not add visual decoration, one-off gradients, or marketing-style hero content. This remains a desktop workbench, not a landing page.

- [ ] Record evidence paths without private data.

If screenshots are saved, store only synthetic/privacy-on screenshots under a temporary or evidence directory agreed for release artifacts. Do not commit private screenshots.

## 9. Task E4: Keyboard, Accessibility, And Privacy Audit

**Files:**
- Modify: `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`
- Modify: `specs/001-ready-desktop-app/release-evidence.md`
- Modify if blockers are found: affected UI components.

- [ ] Keyboard path checklist.

Required paths:

- Setup: reach path picker, start/connect, diagnostics, settings link.
- Workbench: rail, conversation list, search, result open, transcript actions, stats/AI/graph module buttons.
- Drawer: open module, focus enters drawer, Escape closes, focus returns.
- Settings: category navigation, forms, toggles, save/reset actions.
- Update notification: dismiss, download/retry, install action.
- Dev console/diagnostics export.

- [ ] Accessibility surface checklist.

Required checks:

- Icon buttons have accessible labels/tooltips.
- Active navigation uses `aria-current` or equivalent state.
- Progress indicators have accessible text or progressbar semantics.
- Charts/tables have accessible labels or table fallback.
- Error states use `role="alert"` or equivalent when appropriate.
- Privacy mode masks accessible names, alt text, title attributes, tooltips, and live-region text.
- No private data appears only because it is hidden visually but exposed to assistive technology.

- [ ] Privacy scan and classification.

Run:

```powershell
rg -n "dataKey|data_key|api[_-]?key|token|secret|credential|password|wxid_|sender_name|talker_name|WeChat Files|C:\\\\Users" src specs docs
```

Classify every relevant hit as:

- Field name or type only.
- Synthetic fixture/test.
- Placeholder.
- Redaction helper/test.
- User-entered input that is masked.
- Release blocker.

- [ ] Diagnostic package review.

If a diagnostic package can be generated locally:

- Generate it through the UI only.
- Open the generated file.
- Confirm raw keys, tokens, credentials, private chat text, raw ids, and full private paths are absent.
- Record pass/fail in `release-evidence.md`.

If it cannot be generated, keep privacy evidence as "Passed with caveats" and record the blocker.

## 10. Task E5: Graph Visualization And Performance Evidence

**Files:**
- Modify: `specs/001-ready-desktop-app/release-evidence.md`
- Modify: `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`
- Modify if blockers are found: graph display files.

- [ ] Confirm default graph module remains canvas-free.

Use the dev smoke path and mocked/synthetic backend:

- Open graph module.
- Confirm summary/table state renders.
- Confirm `document.querySelectorAll("canvas").length === 0` before explicit visualization.

- [ ] Confirm explicit visualization renders nonblank canvas.

After clicking the visualization action:

- A loading state appears while lazy code loads or graph data prepares.
- Exactly expected canvas path appears.
- Canvas bounding box is visible at desktop and 390 px.
- Pixel/data-url check confirms it is not blank.
- Escape/drawer close or module switch cancels/recoverably exits loading where applicable.

- [ ] Record build chunk evidence.

Run:

```powershell
pnpm build
```

Record:

- Graph module chunk name and size.
- Graph canvas chunk name and size.
- Whether Vite still emits the >500 kB warning.
- Whether the warning remains isolated to explicit visualization.

Do not mark the chunk warning fixed unless the output proves it.

## 11. Task E6: Windows x64 Package Smoke

**Files:**
- Modify: `specs/001-ready-desktop-app/release-evidence.md`
- Modify: `docs/release/ready-desktop-app.md`
- Modify: `specs/001-ready-desktop-app/tasks.md`

- [ ] Run fresh automated release commands.

Run:

```powershell
pnpm verify
Push-Location src-tauri; cargo test; Pop-Location
pnpm tauri build
```

Expected:

- `pnpm verify` passes.
- `cargo test` passes or records a blocker.
- `pnpm tauri build` produces Windows x64 MSI/NSIS artifacts.

- [ ] Verify package configuration.

Check:

- `src-tauri/tauri.conf.json` still uses `externalBin: ["binaries/chatlog_alpha"]`.
- Sidecar launch address is explicitly recorded. P2-E comprehensive remediation selected and documented `serve --http-addr 127.0.0.1:5030` as the local-only default across current guidance.
- CSP/capabilities are not broadened by P2-E.
- Updater endpoint/status is documented honestly; do not claim full update release readiness unless it is actually tested and configured.

Only mark T029 complete after package config and package build evidence are recorded.

- [ ] Install/open Windows x64 artifact.

Use MSI or NSIS artifact from:

- `src-tauri/target/release/bundle/msi/`
- `src-tauri/target/release/bundle/nsis/`

Required evidence:

- App opens without terminal commands.
- Clean profile reaches setup.
- Missing data path prompts recovery.
- Valid or user-approved sanitized data reaches workbench if available.
- App-managed sidecar starts.
- `/health` responds from `http://127.0.0.1:5030/health`.
- App does not log private data.

- [ ] Quit and reopen.

Required evidence:

- Quit app.
- App-managed sidecar is no longer listening on `5030`.
- Reopen app.
- Settings/readiness state restores correctly.
- Sidecar can start again.

- [ ] Unknown port conflict smoke.

Create an unknown test listener on `127.0.0.1:5030` without using `chatlog_alpha`.

Possible PowerShell approach:

```powershell
$job = Start-Job -ScriptBlock {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), 5030)
  $listener.Start()
  Start-Sleep -Seconds 600
  $listener.Stop()
}
```

Then open the packaged app.

Expected:

- App reports a recoverable unknown port conflict.
- App does not kill the unknown listener.
- User can quit the app.
- Stop the test listener after the smoke:

```powershell
Stop-Job $job
Remove-Job $job
```

Record the job/process cleanup in evidence.

- [ ] Keep manual evidence redaction-safe.

Do not paste real process paths, usernames, chat names, or private messages. Use redacted summaries.

Only mark T042 complete after all required Windows x64 smoke evidence is recorded.

## 12. Task E7: Release Documentation Closeout

**Files:**
- Modify: `specs/001-ready-desktop-app/tasks.md`
- Modify: `specs/001-ready-desktop-app/release-evidence.md`
- Modify: `specs/001-ready-desktop-app/architecture-boundary-check.md`
- Modify: `docs/release/ready-desktop-app.md`
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

- [ ] Update ready-desktop-app tasks.

Rules:

- T029 can be checked only after package config and build evidence are fresh.
- T030 can be checked only after release caveats and smoke results are documented.
- T042 can be checked only after Windows x64 install/launch/quit/reopen/sidecar cleanup/unknown-port-conflict smoke actually runs.
- Do not change old unchecked setup/foundation tasks unless P2-E explicitly completes them with evidence.

- [ ] Update release evidence.

Required sections:

- Build under test: date, branch, commit/dirty state, artifact paths.
- Automated verification.
- UI visual/accessibility matrix summary.
- Privacy/diagnostics review.
- Windows x64 install/open/quit/reopen.
- Sidecar ownership and `/health`.
- Unknown port conflict.
- Current caveats.

- [ ] Update release runbook.

`docs/release/ready-desktop-app.md` must state:

- Windows x64 is the current release target.
- macOS packaging/signing remains follow-up unless completed separately.
- Unknown `5030` process is handled as a recoverable conflict, not force-killed.
- Privacy evidence requirements.
- Graph chunk warning status.
- Rust crate-name warning status.
- Updater status and caveats.

- [ ] Update architecture checklist.

Record fresh scan outputs for:

- L1/L3 raw network calls.
- L4-to-L2 imports.
- L1 direct store/storage access.
- Semantic/graph module-root exceptions.
- Privacy/accessibility surfaces reviewed in P2-E.

## 13. Task E8: Final Verification And Self-Review

**Files:**
- Modify only if verification exposes blockers.

- [ ] Run final commands.

Run:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
Push-Location src-tauri; cargo test; Pop-Location
pnpm tauri build
```

If P2-E only edits docs in a planning-only session, do not claim source verification. Instead run document-level verification and state that code tests were not needed.

- [ ] Run final scans.

Run:

```powershell
rg -n "@l4/network|@/l4-atom/network|fetch\(|EventSource|WebSocket|axios" src\l1-entry src\l3-molecule
rg -n "@l2|l2-coordinator" src\l4-atom
rg -n "use[A-Za-z]+Store|zustand|localStorage|sessionStorage|useSetupCommander|useAppStore|useSetupStore" src\l1-entry
rg -n "ai\.phase" src\l1-entry src\l3-molecule
rg -n "dangerouslySetInnerHTML|AppleButton|GlassPanel" src\l1-entry src\l3-molecule
git diff --check
```

- [ ] Review against release-gate criteria.

Classify final state as:

- PASS: all automated, UI, accessibility, privacy, package, and manual smoke evidence exists.
- BLOCKED: name the exact missing evidence or failing check.
- PASS WITH CAVEATS: allowed only for known non-blocking warnings such as isolated GraphCanvas chunk warning or Rust crate-name warning, if product owner accepts them.

- [ ] Request or perform final code review.

At minimum, review:

- Privacy mode surfaces.
- Focus/dialog/drawer changes.
- Release evidence claims versus actual commands.
- T029/T030/T042 checkboxes.

Do not merge or call the release ready unless evidence matches the claims.

## 14. Risks And Decisions

- **Sanitized data availability:** Full valid-data smoke needs a user-approved local data path or synthetic fixture strategy. Without that, release evidence must stay partially blocked.
- **Installer interaction:** MSI/NSIS smoke may require manual UI steps. Record exactly what was performed.
- **Unknown port listener cleanup:** The conflict smoke must clean up only the listener created for the test. Do not kill unrelated user processes.
- **Update notification scope:** P2-E can make the notification accessible, but should not claim full updater release readiness unless the updater signing/public-key/release manifest path is actually configured and tested.
- **Graph chunk warning:** Current acceptable path is "heavy chunk isolated to explicit visualization." Treat size reduction as follow-up unless it causes visible blank/slow behavior in smoke.
- **Broad style debt:** Inline style and hard-coded color scans will remain noisy. P2-E should fix release-visible issues and record lower-risk style debt rather than attempting a risky global restyle.

## 15. Completion Criteria

P2-E is complete when:

- `p2-e-visual-qa-matrix.md` records required routes, widths, states, privacy mode, keyboard paths, and evidence.
- Privacy mode does not leak identities/messages/paths/credentials through visible text, alt text, titles, tooltips, aria labels, live regions, logs, diagnostics, or screenshots.
- Workbench drawer and update notification are keyboard-reachable and have acceptable dialog/focus behavior.
- Graph visualization remains explicit, bounded, nonblank, and documented with chunk evidence.
- `pnpm verify`, `cargo test`, and `pnpm tauri build` have fresh recorded results.
- Windows x64 install/open/quit/reopen/sidecar cleanup/unknown-port-conflict smoke has recorded redaction-safe evidence.
- T029/T030/T042 are updated only according to actual evidence.
- `docs/release/ready-desktop-app.md`, `release-evidence.md`, `architecture-boundary-check.md`, `task_plan.md`, `findings.md`, and `progress.md` match the final state.

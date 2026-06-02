# P2-E Comprehensive Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` when implementing this plan task-by-task in one session. If the user explicitly asks for parallel workers, use `superpowers:subagent-driven-development` and split only independent tasks with disjoint file ownership. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining P2-E release, architecture, privacy, UI consistency, sidecar lifecycle, and evidence gaps so the branch can honestly report P2-E complete and know whether it is release-ready.

**Architecture:** Keep raw sidecar/system calls in L4, orchestration and view-model derivation in L2, presentational UI in L3, and route/layout/event delegation in L1. Treat any temporary L3 module-root store/commander usage as an explicitly documented exception with an owner and removal criterion.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4/project CSS variables, Zustand, Framer Motion, Three.js/React Three Fiber, Tauri v2, Rust tests, Vitest, Playwright, Windows x64 packaged-app smoke.

---

## Task 0 - Freeze Review Baseline And Keep Evidence Honest

**Files:**
- Modify: `progress.md`
- Modify: `findings.md`
- Modify: `specs/001-ready-desktop-app/release-evidence.md`

- [ ] **Step 1: Confirm branch and dirty scope**

Run:

```powershell
git branch --show-current
git status --short
git diff --stat
```

Expected:
- Branch is not `master`.
- Output is recorded in `progress.md`.
- Existing unrelated dirty files are not reverted.

- [ ] **Step 2: Preserve current P2-E status wording**

In `specs/001-ready-desktop-app/release-evidence.md`, keep the status equivalent to:

```markdown
P2-E automated verification passed with caveats. Release readiness remains blocked until Windows x64 packaged-app smoke, unknown-port conflict smoke, and full privacy artifact review are complete.
```

Do not mark T042 complete in this task.

- [ ] **Step 3: Run evidence sanity scan**

Run:

```powershell
rg -n "release-ready|ready to ship|T042.*\\[x\\]|Install \\| Passed|Launch \\| Passed|Quit \\| Passed|Reopen \\| Passed|Port conflict \\| Passed" specs docs task_plan.md findings.md progress.md
```

Expected:
- No document claims release-ready before Task 9 completes.
- Any hit that suggests release readiness is corrected to a blocked/caveated status.

## Task 1 - Complete Windows x64 Packaged-App Smoke Gate

**Files:**
- Modify: `specs/001-ready-desktop-app/release-evidence.md`
- Modify: `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`
- Modify: `docs/release/ready-desktop-app.md`
- Modify only after pass: `specs/001-ready-desktop-app/tasks.md`

- [ ] **Step 1: Build the package under test**

Run:

```powershell
pnpm verify
Push-Location src-tauri; cargo test; Pop-Location
pnpm tauri build
```

Expected:
- `pnpm verify` passes.
- `cargo test` passes.
- MSI and NSIS artifacts exist under `src-tauri/target/release/bundle/`.
- Any GraphCanvas chunk warning and Rust crate-name warning are copied into evidence as warnings, not hidden.

- [ ] **Step 2: Install or open the Windows x64 artifact**

Use one of:

```text
src-tauri/target/release/bundle/msi/chatlog_alpha_0.1.0_x64_zh-CN.msi
src-tauri/target/release/bundle/nsis/chatlog_alpha_0.1.0_x64-setup.exe
```

Expected:
- App opens from the installed artifact without a terminal.
- Setup or workbench is reachable.
- Evidence records the artifact path and install/open result.

- [ ] **Step 3: Confirm app-managed sidecar health**

Run after app launch:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5030/health" -TimeoutSec 5
Get-Process | Where-Object { $_.ProcessName -like "*chatlog_alpha*" } | Select-Object Id, ProcessName, Path
```

Expected:
- `/health` succeeds.
- The sidecar process path is consistent with the packaged app or documented runtime location.
- Evidence records only redacted/non-private process data.

- [ ] **Step 4: Quit and confirm sidecar cleanup**

Close the app normally, then run:

```powershell
Start-Sleep -Seconds 3
Get-Process | Where-Object { $_.ProcessName -like "*chatlog_alpha*" } | Select-Object Id, ProcessName, Path
```

Expected:
- App-managed sidecar is gone.
- Unknown external sidecars are not killed.
- Evidence records the cleanup result.

- [ ] **Step 5: Reopen and confirm safe state restoration**

Open the installed app again.

Expected:
- Persisted safe settings restore.
- Setup/workbench state is coherent.
- No private data appears in screenshots or logs.

- [ ] **Step 6: Test unknown `5030` occupant**

Start an unknown occupant before app launch:

```powershell
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:5030/")
$listener.Start()
"unknown occupant listening on 5030"
```

Then launch the installed app.

Expected:
- App reports a recoverable port conflict.
- App does not stop the unknown listener.
- Evidence records the visible user-facing conflict state without raw private data.

Cleanup:

```powershell
$listener.Stop()
$listener.Close()
```

- [ ] **Step 7: Close T042 only after all manual smoke rows pass**

Update `specs/001-ready-desktop-app/tasks.md` only when install, launch, quit, reopen, sidecar cleanup, and unknown port conflict are recorded.

Expected:
- T042 changes from `[ ]` to `[x]` only after evidence exists.
- `docs/release/ready-desktop-app.md` removes the P2-E manual gate blocker only after evidence exists.

## Task 2 - Harden Sidecar Ownership And Unknown Port Classification

**Files:**
- Modify: `src-tauri/src/sidecar.rs`
- Modify as needed: `src-tauri/src/service_probe.rs`
- Modify as needed: `src-tauri/src/setup.rs`
- Test: Rust tests in the nearest existing `#[cfg(test)]` module or new focused test module under `src-tauri/src/`
- Modify: `specs/001-ready-desktop-app/contracts/local-backend.md`
- Modify: `specs/001-ready-desktop-app/release-evidence.md`

- [ ] **Step 1: Add a Rust test for unknown occupant preservation**

Add a test that models an inspected port with an owner classified as unknown or external and asserts it is not treated as app-managed.

Use an assertion equivalent to:

```rust
assert_ne!(classification.owner, PortOwner::Managed);
assert!(classification.recoverable_conflict);
```

Expected RED:
- The current logic does not clearly protect `managed_pid` assignment from unknown post-spawn occupants, or the helper needed for this assertion does not exist yet.

- [ ] **Step 2: Refactor managed PID assignment**

In `src-tauri/src/sidecar.rs`, replace unconditional post-spawn assignment:

```rust
inner.managed_pid = inspection.process.map(|p| p.pid);
```

with logic that only stores a PID when the process is confirmed to be the child just started or otherwise classified as app-managed.

Expected behavior:
- Unknown occupant never becomes `managed_pid`.
- External `chatlog_alpha` is reused or reported according to the existing policy, but not silently owned unless classified as managed.
- Spawn failure cannot cause an unrelated port occupant to be cleaned up later.

- [ ] **Step 3: Run Rust tests**

Run:

```powershell
Push-Location src-tauri
cargo test
Pop-Location
```

Expected:
- All Rust tests pass.
- Existing crate-name warning may remain and should be recorded as a warning.

- [ ] **Step 4: Re-run Task 1 unknown-port manual smoke**

Expected:
- The installed app reports recoverable conflict.
- The unknown listener remains alive until manually stopped.

## Task 3 - Reconcile Sidecar Bind-Address Contract

**Files:**
- Modify: `AGENTS.md`
- Modify: `开发指南.md`
- Modify: `docs/总体开发规划.md`
- Modify: `specs/001-ready-desktop-app/contracts/local-backend.md`
- Modify: `specs/001-ready-desktop-app/quickstart.md`
- Modify: `docs/release/ready-desktop-app.md`
- Modify if product decision changes: `src-tauri/src/sidecar_args.rs`

- [ ] **Step 1: Choose the canonical binding**

Preferred decision for local-private-data app:

```text
Canonical sidecar bind address: 127.0.0.1:5030
Rationale: local desktop app, local private data, no remote exposure by default.
```

If this decision changes, record the security rationale before editing code.

- [ ] **Step 2: Update stale documentation**

If local-only remains canonical, update every stale reference that says:

```text
0.0.0.0:5030
```

to:

```text
127.0.0.1:5030
```

Expected:
- `AGENTS.md` no longer contradicts `sidecar_args.rs`.
- Release runbook, quickstart, and local backend contract all match.

- [ ] **Step 3: Verify no drift remains**

Run:

```powershell
rg -n "0\\.0\\.0\\.0:5030|127\\.0\\.0\\.1:5030|localhost:5030" AGENTS.md docs specs src src-tauri
```

Expected:
- Any `0.0.0.0:5030` hit is either removed or explicitly documented as a non-default alternative.
- `127.0.0.1:5030` is the release/default address.

## Task 4 - Fix L2-to-L3 Workbench Layout Boundary

**Files:**
- Move or create: `src/l2-coordinator/commander/workbenchLayout.ts`
- Modify: `src/l2-coordinator/commander/useWorkbenchCommander.ts`
- Modify: `src/l2-coordinator/commander/workbenchViewModel.ts`
- Modify: `src/l2-coordinator/commander/workbenchViewModel.test.ts`
- Modify: `src/l3-molecule/workbench/workbenchLayout.ts` or remove after migration
- Modify: `src/l3-molecule/workbench/*` imports as needed
- Modify: `specs/001-ready-desktop-app/architecture-boundary-check.md`

- [ ] **Step 1: Move pure layout derivation out of L3**

Create `src/l2-coordinator/commander/workbenchLayout.ts` with the current pure `WorkbenchLayout`, `WorkbenchMode`, and `getWorkbenchLayout()` definitions.

Expected:
- The file contains no React component imports.
- The file contains no DOM or network calls.
- L3 workbench components import types from L2 only if they are module-root/container props; presentational leaves should prefer local prop types where practical.

- [ ] **Step 2: Update L2 imports**

Change:

```ts
import { getWorkbenchLayout } from "@l3/workbench/workbenchLayout";
```

to:

```ts
import { getWorkbenchLayout } from "./workbenchLayout";
```

and change type imports in `workbenchViewModel.ts` to the new L2 file.

- [ ] **Step 3: Remove or turn old L3 layout file into a compatibility re-export**

If L3 still needs the path during migration, keep only:

```ts
export type { WorkbenchLayout, WorkbenchMode } from "@l2/commander/workbenchLayout";
export { getWorkbenchLayout } from "@l2/commander/workbenchLayout";
```

Then remove the compatibility file in a follow-up once all imports are migrated.

- [ ] **Step 4: Add architecture scan**

Update `specs/001-ready-desktop-app/architecture-boundary-check.md` with:

```powershell
rg -n "@l3/|@/l3-molecule|l3-molecule" src/l2-coordinator src/l4-atom
```

Expected:
- No L2/L4 imports from L3 remain, except explicitly documented temporary compatibility re-exports if kept.

- [ ] **Step 5: Run tests and scans**

Run:

```powershell
pnpm test src/l2-coordinator/commander/workbenchViewModel.test.ts
pnpm typecheck
rg -n "@l3/|@/l3-molecule|l3-molecule" src/l2-coordinator src/l4-atom
```

Expected:
- Tests and typecheck pass.
- Scan output is empty or documented with a removal ticket.

## Task 5 - Close Or Explicitly Classify Remaining L3 Store/Commander Exceptions

**Files:**
- Modify: `src/l3-molecule/common/UpdateNotification.tsx`
- Create or modify: `src/l3-molecule/common/UpdateNotificationView.tsx`
- Modify or create: `src/l2-coordinator/commander/useAppShellCommander.ts`
- Modify as needed: `src/l1-entry/*`
- Modify: `src/l3-molecule/common/AppLayout.tsx`
- Modify: `specs/001-ready-desktop-app/architecture-boundary-check.md`

- [ ] **Step 1: Split update notification container and view**

Create a presentational component with props equivalent to:

```ts
interface UpdateNotificationViewProps {
  view: UpdateNotificationView;
  reduceMotion: boolean;
  onDismiss: () => void;
  onInstall: () => void;
  onRetry: () => void;
}
```

Expected:
- The presentational file imports no L2 commander/store.
- The current `UpdateNotification.tsx` either becomes a clearly named container or moves its L2 access to a shell commander.

- [ ] **Step 2: Move AppLayout state reads out of the L3 common component**

Create an L2 shell view model that returns:

```ts
interface AppShellView {
  privacyOn: boolean;
  windowMaterial: WindowMaterial;
  title: string;
}
```

and callbacks:

```ts
interface AppShellActions {
  navigateHome: () => void;
  navigateSettings: () => void;
  togglePrivacy: () => void;
  toggleConsole: () => void;
}
```

Expected:
- `AppLayout` receives shell data/actions as props or is renamed/classified as a shell container.
- L3 presentational children do not read Zustand stores directly.

- [ ] **Step 3: Record accepted exceptions**

If full shell migration is too large for P2-E, update `architecture-boundary-check.md` with an explicit table:

```markdown
| File | Exception | Reason | Removal criterion |
| --- | --- | --- | --- |
| `src/l3-molecule/common/AppLayout.tsx` | Temporary shell container reads L2 stores | Existing app shell boundary predates strict L3 props-only cleanup | Remove when `useAppShellCommander` owns shell state |
```

Expected:
- No broad statement says the whole architecture is clean while exceptions remain.

- [ ] **Step 4: Run architecture scans**

Run:

```powershell
rg -n "@l2|l2-coordinator|use[A-Za-z]+Store|use[A-Za-z]+Commander" src/l3-molecule
rg -n "@l3/|@/l3-molecule|l3-molecule" src/l2-coordinator src/l4-atom
```

Expected:
- Output is either reduced to known module-root exceptions or recorded in the checklist with exact files.

## Task 6 - Tokenize Release-Visible UI And Remove Cramped Narrow States

**Files:**
- Modify: `src/styles/layout.css`
- Modify: `src/l1-entry/pages/SetupCenterView.tsx`
- Modify: `src/l1-entry/pages/SettingsView.tsx`
- Modify: `src/l1-entry/pages/WorkbenchView.tsx`
- Modify: `src/l1-entry/pages/WorkbenchShellView.tsx`
- Modify: `src/l3-molecule/semantic/AiPanel.tsx`
- Modify: `src/l3-molecule/semantic/QAInput.tsx`
- Modify: `src/l3-molecule/semantic/SemanticSearch.tsx`
- Modify: `src/l3-molecule/semantic/SetupWizard.tsx`
- Modify: `src/l3-molecule/semantic/QAMessage.tsx`
- Modify as needed: `src/l3-molecule/common/AppStatusCluster.tsx`
- Modify: `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`

- [ ] **Step 1: Classify inline styles before editing**

Run:

```powershell
rg -n "style=\\{\\{|#[0-9A-Fa-f]{3,8}|rgba\\(|linear-gradient" src/l1-entry src/l3-molecule src/l4-atom
```

Classify hits in `findings.md`:
- `layout-only`: dynamic sizing or virtualization where inline style is justified.
- `tokenize-now`: release-visible color, spacing, border, shadow, background.
- `legacy-defer`: old atom retained but not used by release-visible path.

- [ ] **Step 2: Replace release-visible visual inline styles with classes/tokens**

Use CSS variables already present in the project. New classes should live in `src/styles/layout.css` or the closest existing style file.

Expected:
- Semantic tabs, setup stepper/provider cards, QA input helper labels, setup center header, settings cards, and status cluster use tokenized classes.
- Text does not overlap or clip at 390px.
- Buttons preserve stable hit areas and do not resize on hover.

- [ ] **Step 3: Fix narrow setup/status composition**

For setup center narrow width:
- Ensure brand/title wraps cleanly.
- Keep icon/title spacing stable.
- Avoid adjacent words visually merging.

For bottom status cluster at 390px:
- Hide or abbreviate low-priority labels through existing compact status model.
- Preserve readable health and AI state.

- [ ] **Step 4: Run visual smoke**

Run local dev server, then Playwright or Browser acceptance for:
- `/` at 1440x900 and 390x844.
- `/settings` at 1440x900 and 390x844.
- `/workbench?codex-smoke=workbench-ready` at 1440x900 and 390x844.
- `/dashboard?codex-smoke=workbench-ready` at 390x844.

Expected:
- No page-level horizontal overflow.
- No text overlaps.
- No clipped primary controls.
- Screenshots contain no raw private data.

## Task 7 - Finish Accessibility And Update Notification UX Polish

**Files:**
- Modify: `src/l3-molecule/common/UpdateNotification.tsx`
- Modify: `src/l3-molecule/common/updateNotificationViewModel.ts`
- Modify: `src/l3-molecule/common/updateNotificationViewModel.test.ts`
- Modify: `src/l3-molecule/workbench/WorkbenchFrame.tsx` only if regressions are found
- Modify: `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`

- [ ] **Step 1: Stabilize update notification focus**

Change the focus effect so it stores the previous active element only when the dialog transitions from hidden to visible.

Expected:
- Status changes while visible do not restore focus to the old trigger.
- Closing still restores focus when the previous element is connected.

- [ ] **Step 2: Decide ready-state dismissibility**

Choose one behavior:
- `ready` remains non-dismissible because installing/restarting is the only supported safe completion path.
- `ready` gains a secondary `Later` action that dismisses the dialog without installing.

Record the decision in `updateNotificationViewModel.test.ts` with an explicit test name.

- [ ] **Step 3: Re-run accessibility tests**

Run:

```powershell
pnpm test src/l3-molecule/common/updateNotificationViewModel.test.ts src/l3-molecule/workbench/workbenchAccessibility.test.ts
```

Expected:
- Dialog semantics, Escape behavior, focus restore, progressbar values, and ready/error states pass.

- [ ] **Step 4: Re-run keyboard smoke**

Expected:
- Workbench drawer opens with focus inside the dialog at 390px.
- Escape closes the drawer and returns focus to the trigger.
- Update notification available/downloading/ready/error states are keyboard reachable.

## Task 8 - Complete Privacy And Diagnostics Artifact Audit

**Files:**
- Modify as needed: `src/utils/maskSecrets.ts`
- Modify as needed: diagnostics/export tests nearest existing files
- Modify: `specs/001-ready-desktop-app/release-evidence.md`
- Modify: `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`
- Modify: `docs/release/ready-desktop-app.md`

- [ ] **Step 1: Generate a synthetic diagnostic artifact**

Use synthetic data only:

```text
dataKey: synthetic-data-key-should-be-redacted
apiKey: sk-synthetic-should-be-redacted
token: synthetic-token-should-be-redacted
private message: synthetic-private-message-should-be-redacted
local path: C:\Users\PrivateName\Documents\chatlog
```

Expected:
- Diagnostic generation is user-triggered.
- Output package/log is available for inspection.

- [ ] **Step 2: Scan generated artifact contents**

After extracting the generated artifact, set `$DiagnosticExtractionDir` to that actual extraction directory and run:

```powershell
$DiagnosticExtractionDir = "E:\OneDrive - Default Directory\chatlogUI\.tmp\diagnostics-p2-e-redaction-check"
rg -n "synthetic-data-key|sk-synthetic|synthetic-token|synthetic-private-message|PrivateName" $DiagnosticExtractionDir
```

Expected:
- No hits.
- If hits exist, fix redaction and regenerate.

- [ ] **Step 3: Update privacy evidence**

In release evidence, record:
- Artifact generated.
- Scan command.
- Result.
- Any caveat.

Do not paste real secrets, real local private paths, or real chat content.

## Task 9 - Close P2-E Visual QA Matrix Follow-Ups

**Files:**
- Modify: `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`
- Modify: `specs/001-ready-desktop-app/release-evidence.md`
- Add optional reusable smoke spec: `tests/playwright/p2-e-smoke.spec.ts` or nearest existing test location if the repo already has one

- [ ] **Step 1: Close setup edge rows**

Cover:
- Setup missing path state.
- Setup invalid path state.
- Backend starting state.
- Backend conflict state.

Expected:
- Each row is `Passed`, `Blocked`, or `Deferred` with a concrete reason.
- No row remains ambiguous.

- [ ] **Step 2: Close dev console/diagnostics empty logs row**

Expected:
- Empty logs state has readable text.
- Export is disabled or produces a redacted empty report.
- No raw private content appears.

- [ ] **Step 3: Persist smoke automation where useful**

If the current Playwright smoke is stable, add it as a reusable spec that:
- Mocks backend data with synthetic private names/content.
- Checks desktop and 390px no-overflow.
- Checks privacy-on masking.
- Checks graph explicit canvas mount.
- Checks update notification dialog/progress states.

Expected:
- The spec can be run with one documented command.
- It does not require real private chat data.

## Task 10 - Decide Graph Visualization Performance Caveat

**Files:**
- Modify if accepted as caveat: `specs/001-ready-desktop-app/release-evidence.md`
- Modify if optimizing: `src/l3-molecule/graph/GraphVisualizePanel.tsx`
- Modify if optimizing: `src/l3-molecule/graph/GraphCanvas.tsx`
- Modify if optimizing: Vite config only if an explicit chunking decision is made

- [ ] **Step 1: Record current chunk evidence**

Run:

```powershell
pnpm build
```

Expected:
- Build passes.
- GraphCanvas chunk size and gzip size are copied into release evidence.

- [ ] **Step 2: Choose accept or optimize**

Accepted caveat criteria:
- Default workbench path does not load canvas.
- User must explicitly click `打开可视化`.
- First visualization delay is acceptable for P2-E.

Optimize criteria:
- Product requires no >500 kB lazy chunk warning.
- First visualization must load below the documented budget.

- [ ] **Step 3A: If accepted, document it**

Release evidence wording:

```markdown
The GraphCanvas chunk remains larger than Vite's warning threshold, but it is isolated behind explicit user action and does not load in the default workbench graph summary path. This is accepted for P2-E and remains a P3 performance follow-up.
```

- [ ] **Step 3B: If optimizing, split and re-test**

Expected:
- Default path still has zero canvas.
- Visualization path still renders a nonblank canvas.
- `pnpm build` warning is reduced or intentionally explained.

## Task 11 - Produce Final Verification And Clean Evidence

**Files:**
- Modify: `specs/001-ready-desktop-app/release-evidence.md`
- Modify: `docs/release/ready-desktop-app.md`
- Modify: `specs/001-ready-desktop-app/tasks.md`
- Modify: `task_plan.md`
- Modify: `progress.md`

- [ ] **Step 1: Run required automated verification**

Run:

```powershell
pnpm verify
Push-Location src-tauri; cargo test; Pop-Location
pnpm tauri build
git diff --check
```

Expected:
- All commands pass.
- Any known warnings are recorded.
- `git diff --check` has no whitespace errors.

- [ ] **Step 2: Run final architecture scans**

Run:

```powershell
rg -n "fetch\\(|EventSource|WebSocket|axios" src/l1-entry src/l3-molecule
rg -n "@l2|l2-coordinator" src/l4-atom
rg -n "@l3/|@/l3-molecule|l3-molecule" src/l2-coordinator src/l4-atom
rg -n "ai\\.phase" src/l1-entry src/l3-molecule
rg -n "dangerouslySetInnerHTML|AppleButton|GlassPanel" src/l1-entry src/l3-molecule
```

Expected:
- Empty output or exact documented exceptions with removal criteria.

- [ ] **Step 3: Update release evidence**

Include:
- Build under test with clean commit SHA if available.
- Automated command results.
- Manual packaged-app smoke results.
- Unknown port conflict result.
- Privacy artifact review result.
- Browser/Playwright caveats.
- Platform caveats.

- [ ] **Step 4: Update task status**

Only after all acceptance criteria pass:
- Mark T042 `[x]`.
- Update `task_plan.md` P2-E status from `complete with manual release-smoke blocker` to `complete`.
- If manual smoke still cannot run, keep blocker status and record why.

## Final Acceptance Criteria

P2-E can be called fully complete only when all of the following are true:

- `pnpm verify` passes.
- `cargo test` passes.
- `pnpm tauri build` passes.
- Windows x64 installed app launches without a terminal.
- App-managed sidecar reaches `/health`.
- App quit cleans up only app-managed sidecar processes.
- Reopen restores safe state coherently.
- Unknown `5030` occupant is not killed and is shown as a recoverable conflict.
- Generated diagnostics/log artifacts are reviewed and redacted.
- Architecture scans cover L1/L3 raw network, L4 upward imports, L2-to-L3 imports, L1/L3 `ai.phase`, and old unsafe UI patterns.
- Remaining architecture exceptions are listed by file with removal criteria.
- Desktop and 390px visual smoke has no horizontal overflow, clipped primary controls, or incoherent overlap.
- Graph default path remains canvas-free and graph visualization requires explicit user action.
- Release evidence references a clean reproducible source state or explicitly documents that it is not yet a release artifact.

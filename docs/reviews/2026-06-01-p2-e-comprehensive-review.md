# P2-E Comprehensive Review Record

Date: 2026-06-01
Branch observed: `codex/p2-d-ai-graph-containment`
Review scope: current P2-E code and evidence, `AGENTS.md`, `开发指南.md`, `docs/总体开发规划.md`, `.specify/memory/constitution.md`, `specs/001-ready-desktop-app/*`, `docs/release/ready-desktop-app.md`, current UI implementation, Tauri sidecar code, architecture scans, and automated verification output.

## Verdict

P2-E automated remediation is useful and mostly effective for the targeted privacy, accessibility, responsive smoke, update notification, workbench drawer, and explicit graph visualization goals.

It does not yet satisfy all stage, project, UI, architecture, privacy, and release requirements. The correct status is:

**P2-E code and automated evidence: passed with caveats.**

**Release readiness and full project compliance: blocked.**

The largest blocker is still the missing Windows x64 packaged-app smoke for install, no-terminal launch, sidecar ownership, quit cleanup, reopen persistence, and unknown `5030` port conflict behavior. The remaining high-value risks are incomplete architecture boundary coverage, unresolved L3 state/commander coupling outside the semantic/graph containment work, incomplete UI tokenization/visual unification, sidecar bind-address contract drift, and missing manual diagnostic/privacy artifact review.

## Evidence Summary

- `pnpm verify` passed on 2026-06-01 with 59 test files and 334 tests; the production build completed.
- `cargo test` in `src-tauri` passed with 17 tests.
- `pnpm tauri build` passed and produced Windows MSI/NSIS artifacts.
- Playwright fallback smoke found no page-level horizontal overflow in the checked 1440px and 390px routes.
- Workbench privacy smoke with synthetic private data did not expose raw `Alice Private` or `Secret content` in visible text.
- Graph visualization remained explicit: default workbench graph summary mounted no canvas, and clicking `打开可视化` mounted one canvas.
- The Browser plugin attempt timed out, so UI evidence depends on Playwright fallback instead of the in-app Browser tool.
- `specs/001-ready-desktop-app/release-evidence.md` still records install, launch, quit, reopen, and port conflict as not run.
- `specs/001-ready-desktop-app/tasks.md` still leaves T042 unchecked.
- `docs/release/ready-desktop-app.md` explicitly says not to call the app release-ready until a human runs the Windows x64 packaged-app smoke.

## Findings

### E1 - Windows Packaged-App Release Gate Is Still Blocked

Severity: P0 release blocker.

Evidence:
- `specs/001-ready-desktop-app/release-evidence.md:24-28` marks Install, Launch, Quit, Reopen, and Port conflict as `Not run`.
- `specs/001-ready-desktop-app/release-evidence.md:36-42` leaves no-terminal launch cases pending.
- `specs/001-ready-desktop-app/tasks.md:382-385` keeps T042 unchecked and defines acceptance as `cargo test`, `pnpm tauri build`, Windows x64 install, launch, quit, reopen, sidecar cleanup, port conflict, and macOS caveats.
- `docs/release/ready-desktop-app.md:37-45` says not to call the app release-ready until a human completes the packaged-app smoke.

Impact:
- The branch cannot be called release-ready even though automated verification and packaging pass.
- The app is not yet proven to start from the installed artifact without a terminal.
- Sidecar ownership, sidecar cleanup, persisted state restoration, and unknown port conflict behavior remain unproven in the actual packaged runtime.

Required outcome:
- Run the Windows x64 MSI or NSIS artifact manually.
- Record install/open/quit/reopen/sidecar cleanup/unknown-port-conflict evidence in release evidence and the visual QA matrix.
- Keep T042 unchecked until that evidence is complete.

### E2 - Architecture Audit Misses An L2-to-L3 Dependency

Severity: P1 architecture blocker before claiming full compliance.

Evidence:
- `src/l2-coordinator/commander/useWorkbenchCommander.ts:12` imports `getWorkbenchLayout` from `@l3/workbench/workbenchLayout`.
- `src/l2-coordinator/commander/workbenchViewModel.ts:1` imports `WorkbenchLayout` and `WorkbenchMode` from `@l3/workbench/workbenchLayout`.
- Current architecture evidence focuses on no L1/L3 raw network calls, no L4-to-L2 imports, no L1/L3 `ai.phase`, and no old unsafe UI patterns. It does not cover L2 importing L3.

Impact:
- The four-layer direction is inverted for workbench layout.
- L2 view-model tests and commander code depend on an L3 molecule implementation file.
- Architecture evidence can report pass while a different direction of boundary violation remains.

Required outcome:
- Move `workbenchLayout` types and pure layout derivation into L2 or a neutral shared non-UI module.
- Update L3 workbench components to consume the layout data as props/types from the new location.
- Extend `architecture-boundary-check.md` with a scan that catches `@l3` imports from L2/L4.

### E3 - L3 Props-Only Rule Is Still Not Globally Satisfied

Severity: P1 project architecture debt.

Evidence:
- `src/l3-molecule/common/UpdateNotification.tsx:3` imports `useUpdateCommander` directly from L2.
- `src/l3-molecule/common/AppLayout.tsx:5-6` imports L2 stores directly.
- `src/l3-molecule/common/AppLayout.tsx:18-21` reads settings/dev-console store state and actions inside an L3 common component.
- Broader L3 scans still show existing root/container components that pull L2 stores or commanders directly outside the strict props-only ideal.

Impact:
- L3 is still partly acting as a coordinator/container layer instead of a reusable molecule layer.
- This is inconsistent with `AGENTS.md` and the constitution rule that L3 molecules receive data and callbacks as props.
- P2-D accepted `AiPanel.tsx` and `GraphModule.tsx` as staged module-root exceptions, but P2-E did not explicitly classify or close the remaining common-shell exceptions.

Required outcome:
- Create or extend L2 shell/update commanders that expose view models and callbacks.
- Make `UpdateNotification` presentational, receiving update view state and callbacks as props.
- Move `AppLayout` state access to an L1/L2 shell container or document it as a named, temporary module-root exception with removal criteria.
- Update the architecture checklist to record allowed exceptions by file.

### E4 - UI Consistency And Tokenization Are Incomplete

Severity: P2 UI quality debt.

Evidence:
- Release-visible files still contain many inline styles and hard-coded visual values:
  - `src/l3-molecule/semantic/AiPanel.tsx`
  - `src/l3-molecule/semantic/QAInput.tsx`
  - `src/l3-molecule/semantic/SemanticSearch.tsx`
  - `src/l3-molecule/semantic/SetupWizard.tsx`
  - `src/l3-molecule/semantic/QAMessage.tsx`
  - `src/l1-entry/pages/SetupCenterView.tsx`
  - `src/l1-entry/pages/SettingsView.tsx`
  - `src/l1-entry/pages/WorkbenchView.tsx`
  - `src/l1-entry/pages/WorkbenchShellView.tsx`
  - several legacy L4 atoms including `Avatar`, `Badge`, `ProgressBar`, `CodeBlock`, `GlassPanel`, and `SpringModal`.
- `src/l4-atom/ui/index.ts` still exports legacy `AppleButton` and `GlassPanel`, even though L1/L3 scans did not find current direct usage.
- 390px smoke did not find page-level overflow, but the setup header and bottom status cluster remain cramped in narrow widths.

Impact:
- The app is usable, but not fully unified as a polished desktop workbench.
- UI quality depends on local one-off styles instead of the project's token/system primitives.
- Legacy primitives remain available and can re-enter future work.

Required outcome:
- Classify inline styles into layout-only, tokenizable visual style, and legacy-removal categories.
- Tokenize release-visible semantic/setup/status/update/common-shell surfaces first.
- Add visual QA screenshots for desktop and 390px states after token cleanup.
- Either remove legacy exports or mark them deprecated with scan enforcement.

### E5 - Sidecar Bind-Address Contract Is Drifting

Severity: P2 product contract/documentation risk.

Evidence:
- At review time, `AGENTS.md:70` said the sidecar launcher starts `serve --http-addr 0.0.0.0:5030`; P2-E comprehensive remediation later updated current guidance to the local-only `127.0.0.1:5030` default.
- `src-tauri/src/sidecar_args.rs:41` defaults the address to `127.0.0.1:5030`.
- `specs/001-ready-desktop-app/contracts/local-backend.md:9` expects `http://127.0.0.1:5030`.
- `docs/release/ready-desktop-app.md:17` and release evidence use `http://127.0.0.1:5030`.

Impact:
- Engineers and release operators can test or document the wrong network exposure.
- The local-private-data product goal favors local-only binding, but the canonical agent instructions still say otherwise.

Required outcome:
- Make an explicit product/security decision.
- If local-only remains correct, update `AGENTS.md`, release runbook, quickstart, and any older docs to consistently say `127.0.0.1:5030`.
- If `0.0.0.0` is required for a real reason, update code and document the security rationale and firewall expectations.

### E6 - Diagnostic Package And Full Privacy Artifact Audit Are Still Pending

Severity: P2 privacy/release evidence gap.

Evidence:
- `specs/001-ready-desktop-app/release-evidence.md:29` marks privacy redaction as `Passed with caveats`.
- `specs/001-ready-desktop-app/release-evidence.md:54-57` leaves logs, screenshots, raw secrets, and private chat content review fields empty.
- `docs/release/ready-desktop-app.md:33` says full privacy log audit evidence remains pending.

Impact:
- Automated masking tests do not prove generated diagnostic packages, logs, screenshots, or exported evidence are clean.
- The release package cannot be treated as privacy-reviewed.

Required outcome:
- Generate diagnostics using synthetic paths, keys, tokens, and private-like chat text.
- Inspect the generated package manually and with scans.
- Record redacted evidence without pasting raw private data.

### E7 - Unknown Port Conflict And Sidecar Ownership Need Packaged Runtime Proof

Severity: P2 sidecar lifecycle risk.

Evidence:
- `specs/001-ready-desktop-app/contracts/local-backend.md:13` says unknown port occupants must be shown as recoverable conflicts and must not be stopped.
- `src-tauri/src/sidecar.rs:142-150` inspects the configured port after spawn and assigns `managed_pid` from whichever process is found.
- The normal setup path pre-inspects the port, but the post-spawn assignment can be risky if a race places an unrelated process on the port between preflight and post-spawn inspection.
- T042 unknown `5030` conflict smoke remains unrun.

Impact:
- In rare race or failure cases, app-managed sidecar ownership could be inferred from a process that is not actually app-managed.
- The release evidence does not yet prove unknown port occupants are preserved.

Required outcome:
- Harden ownership assignment so only confirmed app-managed or expected sidecar processes become `managed_pid`.
- Add Rust tests for unknown occupant and spawn-failure/race classification where practical.
- Complete manual packaged-app unknown-port smoke.

### E8 - Update Notification UX Is Accessible But Needs Product Review

Severity: P3 UX polish risk.

Evidence:
- `src/l3-molecule/common/UpdateNotification.tsx:21-33` restores focus on cleanup and depends on both `view.visible` and `update.status`, so focus can bounce during status transitions.
- The ready/install state is intentionally non-dismissible in the current view model and UI.

Impact:
- State transitions such as available to downloading to ready can briefly restore focus to the prior trigger before focusing the new dialog content.
- A non-dismissible ready state may be acceptable for update safety, but it should be a deliberate product decision.

Required outcome:
- Adjust the focus effect to avoid unnecessary restore/refocus cycles during visible status transitions.
- Decide whether the ready state needs a secondary `Later` action, and document the decision in the update notification view-model test.

### E9 - Setup And Dev Console Visual QA Matrix Still Has Follow-Ups

Severity: P2 visual QA evidence gap.

Evidence:
- `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md` records pending or blocked setup states and release smoke states.
- The dev console/diagnostics empty logs row is recorded as a follow-up rather than a closed pass.
- Browser plugin was blocked and Playwright fallback was used.

Impact:
- P2-E visual QA is broad but not fully closed.
- Setup edge states and diagnostics-empty behavior are still not fully evidenced.

Required outcome:
- Complete or explicitly defer each pending matrix row.
- Convert dev console/diagnostics empty state into a testable acceptance case.
- Keep Browser-plugin timeout as an environment caveat, not as a product pass.

### E10 - Graph Canvas Chunk Warning Remains A Performance Caveat

Severity: P2 performance/experience caveat.

Evidence:
- `pnpm verify` and `pnpm tauri build` still warn that the lazy `GraphCanvas` chunk is over 500 kB.
- `specs/001-ready-desktop-app/release-evidence.md:62` and `docs/release/ready-desktop-app.md:31` record the warning.

Impact:
- P2-E correctly prevents the heavy 3D canvas from loading by default, but first visualization still has a large load cost.
- This is not a release blocker by itself if accepted, but it must remain explicit.

Required outcome:
- Decide whether the large explicit chunk is accepted for P2-E.
- If accepted, record a performance caveat and keep default path canvas-free.
- If not accepted, split or lazy-load more graph dependencies and re-run build evidence.

### E11 - Build Under Test Is Not A Clean Reproducible Commit

Severity: P3 evidence hygiene risk.

Evidence:
- `specs/001-ready-desktop-app/release-evidence.md:9` records `459c2ed plus current working tree changes`.
- Current working tree contains many modified and untracked files across specs, docs, source, tests, and Tauri code.

Impact:
- Release evidence is tied to a dirty working tree rather than a clean commit.
- A future operator cannot reproduce the exact build without preserving the uncommitted state.

Required outcome:
- Before final release evidence, stage/commit or otherwise snapshot the intended source state.
- Update release evidence with a clean commit SHA.

## Positive Confirmations

- Automated frontend verification, Rust tests, and Tauri packaging pass.
- P2-E fixed the targeted workbench/stats privacy regressions in synthetic UI smoke.
- Workbench drawer and update notification now have dialog/focus/Escape/progress semantics covered by tests and smoke evidence.
- L1/L3 raw network scans remain clean.
- L4-to-L2 scans remain clean.
- L1/L3 `ai.phase` scans remain clean.
- L1/L3 scans did not find direct `dangerouslySetInnerHTML`, `AppleButton`, or `GlassPanel` usage.
- Graph canvas remains behind an explicit user action in the checked path.

## Required Next Step

Execute `docs/superpowers/plans/2026-06-01-p2-e-comprehensive-remediation.md` before changing P2-E status from `complete with manual release-smoke blocker` to fully complete or release-ready.

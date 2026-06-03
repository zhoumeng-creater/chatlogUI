# P5-C/D Remaining Blockers Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining release, architecture, UI, and governance gaps identified after P5-C/D guardrail remediation.

**Architecture:** Preserve the existing L1/L2/L3/L4 model. Release blockers must be fixed through evidence-producing gates rather than by weakening checks. Architecture/UI cleanup should move runtime orchestration out of L3 roots incrementally, with tests at each boundary.

**Tech Stack:** Tauri v2, Rust, React 18, TypeScript, Vite, Vitest, Playwright, pnpm, GitHub Actions.

---

## Implementation Status 2026-06-03

- Local source/UI remediation is complete for the current branch: runtime L3-to-L2 imports are now blocked with an empty architecture guard allowlist, and setup/chat/search/semantic/graph module roots receive runtime state/actions through L1/L2 props.
- High-visibility setup/search/semantic UI tokenization debt has been cleaned. `scripts/ui-governance.test.mjs` now tracks 11 remaining file-level staged entries.
- Release readiness remains blocked by external/candidate evidence: approved sidecar provenance, signed updater `latest.json`, refreshed installed-app P4/P5 Windows smoke, candidate privacy audit, and real CI/draft-release evidence.
- Final local verification passed: targeted governance/release tests 5 files / 22 tests, `pnpm fixtures:check`, `pnpm e2e` 10 tests, `pnpm e2e:visual` 2 tests, `pnpm e2e:a11y` 4 tests, `pnpm verify` 89 files / 370 tests, `cargo test` 20 tests, `pnpm tauri build`, and `git diff --check` with LF/CRLF warnings only.

## File Map

- `scripts/release/sidecar-artifacts.json`: sidecar provenance manifest.
- `scripts/verify-sidecar-artifacts.mjs`: sidecar release verifier.
- `scripts/verify-updater-manifest.mjs`: updater manifest verifier.
- `.github/scripts/prepare-sidecar.sh`: sidecar preparation script.
- `.github/workflows/build-check.yml`: source/UI and package compile CI.
- `.github/workflows/release.yml`: draft release CI.
- `specs/001-ready-desktop-app/release-evidence.md`: candidate evidence record.
- `docs/release/privacy-audit.md`: candidate privacy audit.
- `docs/release/ready-desktop-app.md`: release dashboard.
- `specs/002-advanced-capabilities/acceptance-checklist.md`: advanced release checklist.
- `specs/001-ready-desktop-app/architecture-boundary-check.md`: boundary record.
- `src/l3-molecule/chat/*`, `src/l3-molecule/search/*`, `src/l3-molecule/setup/*`, `src/l3-molecule/semantic/*`, `src/l3-molecule/graph/*`: staged L3 cleanup targets.
- `src/l2-coordinator/commander/*`: container/view-model homes for orchestration.
- `src/styles/workbench-content.css`, `src/styles/layout.css`, `src/styles/tokens.css`: UI token/style homes.
- `docs/总体开发规划.md`, `开发指南.md`: historical docs that need supersession notes.

## Phase 0: Baseline Lock

- [x] **Step 0.1: Confirm current branch and dirty context**

Run:

```powershell
git branch --show-current
git status --short
```

Expected:

- branch is not `master`
- existing dirty P4/P5 context is preserved

- [x] **Step 0.2: Re-run source and release guardrail baseline**

Run:

```powershell
pnpm fixtures:check
pnpm e2e
pnpm e2e:visual
pnpm e2e:a11y
pnpm verify
Push-Location src-tauri; cargo test; Pop-Location
pnpm tauri build
pnpm release:check:sidecar
pnpm release:check:sidecar:release
pnpm release:check:updater
```

Expected:

- all source/UI/build commands pass
- `release:check:sidecar:release` fails until sidecar provenance is approved
- `release:check:updater` fails until generated `latest.json` exists

Record output in `progress.md`.

## Phase 1: Sidecar Provenance

- [ ] **Step 1.1: Choose release provenance strategy**

Record exactly one selected strategy in `docs/release/sidecar-artifacts.md`:

```markdown
## Release Candidate Provenance Strategy

- Strategy: build-from-source | pinned-https-artifacts | private-ci-artifacts
- Owner:
- Date:
- Sidecar source/release:
- Targets covered:
- Targets excluded:
- Rationale:
```

- [ ] **Step 1.2: If using pinned HTTPS artifacts, update manifest**

For each approved target, update `scripts/release/sidecar-artifacts.json`:

```json
{
  "target": "x86_64-pc-windows-msvc",
  "platformKey": "windows-x86_64",
  "binaryName": "chatlog_alpha-x86_64-pc-windows-msvc.exe",
  "version": "chatlog_alpha-<version-or-revision>",
  "releaseAllowed": true,
  "checkModeAllowed": true,
  "source": {
    "type": "none",
    "path": "",
    "releaseAllowed": false
  },
  "artifact": {
    "path": "src-tauri/binaries/chatlog_alpha-x86_64-pc-windows-msvc.exe",
    "sha256": "<64-hex-sha256>",
    "url": "https://<approved-host>/<approved-path>/chatlog_alpha-x86_64-pc-windows-msvc.exe"
  },
  "notes": "Release candidate approved artifact."
}
```

Do not set `releaseAllowed:true` without SHA-256.

- [ ] **Step 1.3: Verify release sidecar provenance**

Run:

```powershell
node scripts/verify-sidecar-artifacts.mjs --mode release --stage-dir src-tauri/binaries --json
pnpm release:check:sidecar:release
```

Expected:

- verifier stages approved URL artifacts when needed
- every release target intended for this candidate passes
- excluded targets remain documented as caveats

## Phase 2: Updater Metadata Evidence

- [ ] **Step 2.1: Prepare signing inputs outside git**

Confirm the release environment has:

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
TAURI_UPDATER_PUBKEY
```

Do not write private key material into any repo file.

- [ ] **Step 2.2: Run release artifact generation**

Use the release workflow as the preferred path. For local Windows-only dry run, run:

```powershell
$env:VITE_ENABLE_UPDATER="true"
pnpm tauri build -- --config '{"bundle":{"createUpdaterArtifacts":true}}'
```

Expected:

- Tauri produces updater metadata and signed platform artifacts.
- `src-tauri/target` contains a generated `latest.json`.

- [ ] **Step 2.3: Verify updater metadata**

Run:

```powershell
node scripts/verify-updater-manifest.mjs --bundle-root src-tauri/target --required-platforms windows-x86_64 --json
pnpm release:check:updater
```

Expected:

- Windows-only local dry run may pass target-specific verifier.
- Full `pnpm release:check:updater` passes only when all required platform metadata exists.

Record manifest SHA-256 and artifact SHA-256 in `specs/001-ready-desktop-app/release-evidence.md`.

## Phase 3: P4/P5 Windows Packaged Smoke Refresh

- [ ] **Step 3.1: Install current NSIS package**

Use:

```powershell
src-tauri\target\release\bundle\nsis\chatlog_alpha_0.1.0_x64-setup.exe
```

Expected:

- installer exits successfully
- app launches without terminal

- [ ] **Step 3.2: Clean-profile launch smoke**

Check:

- setup or workbench is reachable
- no raw private data appears
- no terminal is needed
- unknown `5030` listener is not killed

- [ ] **Step 3.3: App-managed sidecar smoke**

Check:

```powershell
Invoke-RestMethod http://127.0.0.1:5030/health
```

Expected:

- `/health` succeeds when app-managed sidecar is running
- app quit cleans the app-managed sidecar
- reopen recovers readiness

- [ ] **Step 3.4: Diagnostics export smoke**

Export diagnostics through the installed app UI.

Scan exported artifact for:

- raw data key
- API keys
- updater private keys
- signing keys
- tokens
- full private local paths
- private message markers

Record result in `specs/001-ready-desktop-app/release-evidence.md`.

## Phase 4: Privacy Audit And Release Evidence

- [ ] **Step 4.1: Complete privacy audit**

Fill `docs/release/privacy-audit.md`:

```markdown
## Candidate

- Date: 2026-06-03
- App version: 0.1.0
- App commit: <commit>
- Sidecar version/source: <source-or-artifact>
- Release candidate tag: <tag>
- Operator: <name>
- Reviewer: <name>
```

Mark each checklist row with `[x]` only after evidence exists.

- [ ] **Step 4.2: Create release evidence bundle section**

Append to `specs/001-ready-desktop-app/release-evidence.md`:

```markdown
## <date> Release Candidate Evidence

| Area | Status | Evidence |
| --- | --- | --- |
| App commit/version | Passed | `<commit>` / `<version>` |
| Sidecar provenance | Passed | `<version>` / `<sha256>` |
| Installer checksums | Passed | MSI `<sha256>`, NSIS `<sha256>` |
| Updater metadata | Passed | latest.json `<sha256>` |
| Packaged smoke | Passed | install/open/quit/reopen/conflict/export |
| Privacy audit | Passed | `docs/release/privacy-audit.md` |
| Platform caveats | Passed with caveat | macOS/Linux not release-ready unless smoke completed |
```

## Phase 5: macOS/Linux Platform Decision

- [x] **Step 5.1: Decide platform claim**

For each non-Windows platform, choose one:

```text
release-ready
platform-caveat
not-in-this-release
```

- [x] **Step 5.2: If platform-caveat, update dashboard**

Update `docs/release/ready-desktop-app.md` release dashboard rows:

```markdown
| macOS Intel | `platform-caveat` | no smoke | not included in first release |
| macOS Apple Silicon | `platform-caveat` | no smoke | not included in first release |
| Linux x64 | `platform-caveat` | no smoke | not included in first release |
```

## Phase 6: Architecture Cleanup Wave

**Implementation status:** Complete for runtime L3-to-L2 imports. The guard allowlist is now empty; type-only display contracts remain a separate A2 debt item.

- [x] **Step 6.1: Add architecture guard test**

Create `scripts/architecture-boundary.test.mjs` that fails on runtime L3 store/commander imports outside an explicit allowlist:

```js
const allowed = new Set([
  "src/l3-molecule/semantic/AiPanel.tsx",
  "src/l3-molecule/graph/GraphModule.tsx"
]);
```

Initial expectation: fail with current chat/search/setup offenders.

- [x] **Step 6.2: Refactor setup molecules first**

Move setup state/actions into `useSetupCenterCommander()` output and pass props into:

- `SetupStepper`
- `SetupModeChooser`
- `ConfigImportPanel`
- `ManualAdvancedConfigPanel`
- `ServiceControlPanel`
- `ReadinessChecklist`
- `DiagnosticPanel`

Run:

```powershell
pnpm test src/l2-coordinator/commander/*setup* src/l3-molecule/setup --runInBand
pnpm typecheck
```

- [x] **Step 6.3: Refactor chat/search roots**

Create props-only view components:

- `ConversationListView`
- `ChatViewPanel`
- `MessageListView`
- `GlobalSearchView`
- `SearchResultsView`

Keep orchestration in L2 commander/view models. Existing root names may become thin containers only outside `src/l3-molecule`.

Run:

```powershell
pnpm test src/l2-coordinator/commander/workbenchViewModel.test.ts src/l3-molecule/chat src/l3-molecule/search
pnpm e2e
```

- [x] **Step 6.4: Remove or justify semantic/graph root exceptions**

Either:

- move `AiPanel` / `GraphModule` orchestration into L2/L1 containers, or
- keep them in the architecture guard allowlist with an explicit expiry date and owner.

## Phase 7: UI Tokenization Cleanup

**Implementation status:** High-visibility setup/search/semantic cleanup complete. Remaining 11 file-level entries are intentionally tracked by the governance test.

- [x] **Step 7.1: Add L3 inline-style report**

Create or extend `scripts/ui-governance.test.mjs` with a report mode for:

```text
style={{ ... }}
filter(Boolean).join
className={`...`}
```

Do not fail globally at first. Record counts in `specs/001-ready-desktop-app/architecture-boundary-check.md`.

- [x] **Step 7.2: Convert semantic/setup high-visibility panels**

Prioritize:

- `src/l3-molecule/semantic/AiPanel.tsx`
- `src/l3-molecule/semantic/SetupWizard.tsx`
- `src/l3-molecule/semantic/QAInput.tsx`
- `src/l3-molecule/semantic/SemanticSearch.tsx`
- `src/l3-molecule/setup/*`

Move visual styles into `src/styles/workbench-content.css` or a new focused CSS file imported by `globals.css`.

Run:

```powershell
pnpm e2e:visual
pnpm e2e:a11y
pnpm verify
```

## Phase 8: Historical Docs Cleanup

- [x] **Step 8.1: Add supersession note to historical docs**

At the top of `docs/总体开发规划.md` and `开发指南.md`, add:

```markdown
> Historical note: Some early UI and lifecycle guidance in this document has been superseded by `AGENTS.md`, `.specify/memory/constitution.md`, `docs/release/ready-desktop-app.md`, and the current P5-C/D release governance docs. Do not reintroduce unknown-port killing, deprecated `AppleButton`/`GlassPanel`, or hand-written updater manifests.
```

- [x] **Step 8.2: Update architecture examples**

Replace examples that name `AppleButton` and `GlassPanel` as current atoms with current primitives:

- `Button`
- `IconButton`
- `Surface`
- `StatusIndicator`
- `Input`

Run:

```powershell
rg -n "AppleButton|GlassPanel|killPort|手写.*update|0\\.0\\.0\\.0:5030" docs 开发指南.md AGENTS.md
```

Expected:

- hits are either removed or explicitly marked historical/superseded.

## Phase 9: Final Release Gate

- [ ] **Step 9.1: Run full verification matrix**

Run:

```powershell
pnpm fixtures:check
pnpm e2e
pnpm e2e:visual
pnpm e2e:a11y
pnpm verify
Push-Location src-tauri; cargo test; Pop-Location
pnpm tauri build
pnpm release:check:sidecar:release
pnpm release:check:updater
git diff --check
```

Expected:

- all commands pass for the release candidate
- no release checker remains expected-fail

- [ ] **Step 9.2: Update status**

Update:

- `task_plan.md`
- `findings.md`
- `progress.md`
- `docs/release/ready-desktop-app.md`
- `specs/002-advanced-capabilities/acceptance-checklist.md`

Set status to one of:

- `release-ready-windows-x64`
- `source-ui-verified-release-blocked`
- `platform-caveat`

Do not use `release-ready` unless B1-B7 are all closed.

## Self-Review

- Spec coverage: covers sidecar provenance, updater, packaged smoke, privacy audit, release evidence, architecture debt, UI tokenization, historical docs, and final gates.
- Placeholder scan: no `TBD`, `TODO`, or "fill in later" instructions remain.
- Type consistency: plan keeps L2 orchestration and L3 props-only cleanup aligned with AGENTS and constitution.

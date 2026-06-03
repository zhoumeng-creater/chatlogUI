# P5-C/D Remaining Blockers Review

**Date:** 2026-06-03

**Status:** BLOCKED for release-ready claim. Source/UI gates and release guardrails pass, but concrete release evidence is still missing.

This review answers the question: after the P5-C/D guardrail remediation, what is still not fully solved?

## Remediation Update 2026-06-03

Local remediation has since closed the runtime architecture debt called out in A1: `scripts/architecture-boundary.test.mjs` now has an empty runtime allowlist, and chat/search/setup/semantic/graph L3 module roots receive state/actions/privacy through L1/L2 props instead of importing L2 stores or commanders at runtime.

The high-visibility UI tokenization debt called out in A3 has also been reduced: setup, search, and semantic AI/QA/search/setup panels were migrated from inline styles/manual class joins to CSS classes or native progress elements. The remaining UI governance ledger is 11 file-level staged entries, mainly chat virtualization/media, common shell class composition, graph positioning/progress, stats compact chart sizing, and workbench grid sizing.

The P0 release blockers below remain accurate: release-ready is still blocked by sidecar provenance, generated signed updater metadata, current installed-app smoke, candidate privacy audit, real CI/draft-release evidence, and a complete candidate evidence bundle.

## Executive Summary

The current codebase is not in a "many things are broken" state. The source-level quality gates are strong:

- `pnpm fixtures:check` passed with 48 route entries.
- `pnpm e2e` passed with 10 browser tests.
- `pnpm e2e:visual` passed with 2 visual tests.
- `pnpm e2e:a11y` passed with 4 accessibility tests.
- `pnpm verify` passed with 88 Vitest files and 368 tests.
- `cargo test` passed with 20 Rust tests.
- `pnpm tauri build` produced Windows MSI and NSIS bundles.

However, this still does not equal publish-ready. The remaining problems are release evidence, provenance, packaged smoke, privacy signoff, and staged architecture/UI debt.

## P0 Release Blockers

### B1. No Approved Release Sidecar Provenance

**Evidence**

- `scripts/release/sidecar-artifacts.json` has `releaseAllowed:false` for all release targets.
- Windows x64 has only a local ignored binary inventory:
  `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af`.
- macOS Intel, macOS Apple Silicon, and Linux x64 have no local release artifact checksum or URL.
- `pnpm release:check:sidecar:release` fails as expected:
  - `x86_64-pc-windows-msvc: target is not allowed for release`
  - `x86_64-apple-darwin: target is not allowed for release`
  - `aarch64-apple-darwin: target is not allowed for release`
  - `x86_64-unknown-linux-gnu: target is not allowed for release`

**Impact**

The app can be built locally, but the release process cannot prove which `chatlog_alpha` binary was packaged. Publishing would not be reproducible.

**Required fix**

Choose one release provenance strategy:

- build `chatlog_alpha` from audited source in CI, or
- use pinned HTTPS artifacts with SHA-256 per target, or
- consume a private CI artifact with checksum/attestation.

Then update `scripts/release/sidecar-artifacts.json`, set `releaseAllowed:true` only for proven targets, and rerun `pnpm release:check:sidecar:release`.

### B2. No Generated Signed Updater Metadata

**Evidence**

- `pnpm release:check:updater` fails with:
  `no latest.json was found under src-tauri/target`.
- The verifier is implemented and tested, but no concrete release candidate has generated Tauri updater metadata.

**Impact**

Updater integration cannot be claimed publish-ready. The app may build, but there is no signed update manifest evidence.

**Required fix**

Run a real release dry run or draft release build with:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` when needed
- `TAURI_UPDATER_PUBKEY`
- `VITE_ENABLE_UPDATER=true`
- `bundle.createUpdaterArtifacts=true`

Then verify the generated `latest.json` and platform artifacts with `scripts/verify-updater-manifest.mjs`.

### B3. P4/P5 Packaged Smoke Has Not Been Refreshed

**Evidence**

- Current source/UI gates are P5-A/B and P5-C/D guardrail evidence.
- The latest full packaged install/open/quit/reopen/unknown-port smoke evidence is historical P2-E Windows x64 evidence from 2026-06-01.
- `specs/001-ready-desktop-app/release-evidence.md` explicitly says later P4/P5 build results are not packaged smoke reruns.

**Impact**

The current advanced P4/P5 feature set is proven in source/UI and build/package generation, but not in an installed app lifecycle after those changes.

**Required fix**

Run Windows x64 packaged smoke against the current NSIS/MSI output:

- clean profile install/open
- setup or workbench reachable without terminal
- app-managed sidecar health at `/health`
- quit cleanup
- reopen recovery
- unknown `127.0.0.1:5030` conflict
- diagnostics export redaction review

### B4. Candidate-Specific Privacy Audit Is Missing

**Evidence**

- `docs/release/privacy-audit.md` is still a template.
- `specs/002-advanced-capabilities/acceptance-checklist.md` has unchecked:
  `Release-candidate privacy audit is completed`.

**Impact**

This is a local-private-data app. Release artifacts should not publish without a concrete privacy review of current logs, screenshots, diagnostics, release notes, and updater metadata.

**Required fix**

Complete the privacy audit for a named release candidate and record:

- app version
- commit
- sidecar source/version/checksum
- diagnostics export review
- screenshot/log review
- CSP/capability diff review
- update metadata review

### B5. macOS/Linux Are Not Release-Ready

**Evidence**

- Sidecar artifact manifest has no approved macOS/Linux sidecar provenance.
- No macOS Intel, macOS Apple Silicon, or Linux packaged smoke is recorded.
- macOS signing/notarization and Linux runtime caveats are not closed.

**Impact**

Only Windows x64 can be considered the first realistic release target, and even Windows needs refreshed P4/P5 packaged smoke.

**Required fix**

Either:

- mark macOS/Linux as explicit `platform-caveat` and do not claim them release-ready, or
- provide sidecar artifacts, build outputs, signing/notarization where needed, and smoke evidence per platform.

### B6. Release Workflow Has Not Been Proven By A Real CI Run

**Evidence**

- Workflow YAML parses locally.
- Governance tests verify branch triggers, target platform keys, updater verifier command, and pinned Tauri action.
- No actual GitHub Actions build-check/release workflow run evidence is recorded for the current branch/candidate.

**Impact**

Local validation proves configuration intent, not CI environment success.

**Required fix**

Run build-check and a draft release/dry run, then archive:

- run URL
- target matrix result
- sidecar provenance logs
- updater manifest verifier output
- release evidence artifact

### B7. Release Evidence Bundle Is Incomplete

**Evidence**

- `specs/002-advanced-capabilities/acceptance-checklist.md` still has unchecked release bundle/signoff rows.
- Current evidence lacks a single concrete release candidate record with app commit, app version, sidecar source/checksum, installer checksums, updater artifact checksums, generated update JSON checksum, packaged smoke result, privacy audit result, and caveats.

**Impact**

A reviewer cannot yet answer "what exactly are we publishing?" for the current P4/P5 release candidate.

**Required fix**

Create a candidate-specific release evidence section after B1-B6 are satisfied.

## P1 Architecture And Product Debt

### A1. L3 Props-Only Architecture Is Not Globally Clean

**Remediation status:** Resolved for runtime imports on 2026-06-03. Type-only L2 display/store imports remain covered by A2.

**Evidence**

The scan still finds runtime L3 imports of L2 commanders/stores in chat/search/setup/semantic/graph paths. Representative files:

- `src/l3-molecule/chat/ConversationList.tsx`
- `src/l3-molecule/chat/ChatView.tsx`
- `src/l3-molecule/chat/MessageList.tsx`
- `src/l3-molecule/search/GlobalSearch.tsx`
- `src/l3-molecule/search/SearchResults.tsx`
- `src/l3-molecule/setup/ConfigImportPanel.tsx`
- `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx`
- `src/l3-molecule/setup/ServiceControlPanel.tsx`
- `src/l3-molecule/setup/ReadinessChecklist.tsx`
- `src/l3-molecule/setup/SetupModeChooser.tsx`
- `src/l3-molecule/setup/SetupStepper.tsx`
- `src/l3-molecule/semantic/AiPanel.tsx`
- `src/l3-molecule/graph/GraphModule.tsx`

**Impact**

This is not a current runtime failure, but it violates the strictest reading of the constitution and AGENTS architecture rules. It increases future regression risk.

**Required fix**

Split these into L2/L1 containers plus props-only L3 views, then add an architecture guard that fails on runtime L3 `use*Store` / `use*Commander` imports except approved transitional files.

### A2. L3 Still Depends On L2 Store/View Types In Many Places

**Evidence**

Many L3 files import L2 types such as `ChatMessage`, `Conversation`, `SettingsSaveStatus`, `TrendDataPoint`, `DeveloperToolsLoadStatus`, `GraphResidualView`, and semantic preview view models.

**Impact**

Type-only imports are lower risk than runtime store reads, but they still couple reusable molecules to L2 storage shapes.

**Required fix**

Move stable display/view types into neutral `src/l3-molecule/*/*Types.ts` or `src/l2-coordinator/api-docs` contract types where appropriate, then adapt L2 view models to those public display contracts.

### A3. UI Tokenization And Inline Style Debt Remains Outside L4 Atoms

**Remediation status:** Partially resolved on 2026-06-03. High-visibility setup/search/semantic panels were cleaned; 11 tracked file-level entries remain as staged debt.

**Evidence**

The L4 UI atoms were cleaned, and `AppleButton`/`GlassPanel` were removed. But inline styles still exist in L3 paths, especially:

- semantic panels and QA/search controls
- setup wizard/config panels
- graph tooltip/summary/progress visuals
- chat/message virtualization sizing
- stats/chart fallback sizing

**Impact**

The UI is usable and has passing visual/a11y gates, but not all components are equally design-system driven. This can create inconsistent spacing, typography, and responsive behavior over time.

**Required fix**

Prioritize user-visible semantic/setup/search panels, convert inline visual styling to CSS classes/tokens, and add targeted visual/a11y regression checks for those routes.

### A4. Historical Planning Docs Still Contain Superseded Guidance

**Evidence**

`docs/总体开发规划.md` and `开发指南.md` still include old guidance such as `AppleButton`, `GlassPanel`, heavy Apple/macOS traffic-light styling, and port-kill behavior that conflicts with later privacy/release-safe practice.

**Impact**

New contributors or agents may follow outdated guidance unless they know the later AGENTS/constitution/release docs supersede it.

**Required fix**

Add explicit supersession notes to historical docs or update the conflicting sections to point at current rules:

- no unknown port killing
- no deprecated `AppleButton` / `GlassPanel`
- current local-only `127.0.0.1:5030`
- current release guardrail workflow

### A5. Current Advanced Features Are Synthetic-Fixture Proven, Not Real-Data Proven

**Evidence**

P5-A/B E2E uses local-only synthetic fixtures and mock backend by design. Historical packaged smoke used synthetic local data.

**Impact**

This is correct for privacy-safe automation, but a release candidate still needs either sanitized prepared data or controlled manual evidence that real-world data paths and sidecar contracts behave as expected.

**Required fix**

Define a privacy-safe prepared-data acceptance path:

- synthetic DB fixture if possible, or
- manually supplied redacted local data audit by the owner, with no raw data committed.

## P2 Warnings

### W1. Large Explicit Graph Vendor Chunk Remains

**Evidence**

Build output keeps `vendor-graph-3d` around 1.17 MB. It is lazy and explicit-click, so no Vite warning is emitted.

**Impact**

Not a release blocker, but it should remain a performance caveat for graph-heavy flows.

**Required fix**

Keep monitoring graph load time and memory. Consider deeper graph vendor splitting only if real user testing shows startup or first-graph interaction pain.

### W2. Vitest Fork Pool Is Unstable In This Windows/OneDrive Workspace

**Evidence**

`pnpm verify` initially hit Vitest fork-pool `spawn UNKNOWN` after tests had passed. Switching to `--pool=threads` fixed the run.

**Impact**

Not a product bug, but relevant to CI/dev reproducibility.

**Required fix**

Keep `package.json` test script on `--pool=threads`, and watch CI for test pool differences.

## Current Release-Gate Decision

**Status:** BLOCKED

This branch can be described as:

- source/UI verified
- release guardrails implemented
- Windows package buildable
- not release-ready

It cannot yet be described as:

- publish-ready
- update-ready
- cross-platform release-ready
- fully architecture-clean
- fully design-system-tokenized

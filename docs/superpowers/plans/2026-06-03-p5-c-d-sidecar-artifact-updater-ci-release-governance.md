# P5-C/D Sidecar Artifact, Updater, CI/CD, And Release Governance Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: `planning-with-files`, `writing-plans`, `brainstorming`, `app-productization`, `sidecar-integration`, `release-gate`, and `verification-before-completion`. Use `test-driven-development` before implementing artifact validators, updater manifest checks, release scripts, or Rust/Tauri tests. Use `chatlog-debug` or `systematic-debugging` for failing CI, sidecar launch failures, updater failures, or packaged smoke regressions. Use `requesting-code-review` before merging implementation work. Do not use subagents unless the user explicitly asks for them.

**Goal:** Turn the current P4/P5 source and packaged-smoke evidence into a reproducible, signed, updateable, and governed release path. P5-C focuses on sidecar artifacts, updater signing, CI/CD, packaging, and platform release evidence. P5-D focuses on ongoing governance: release checklists, privacy audit records, regression dashboards, versioning, and maintenance evidence.

**Status on 2026-06-03:** Planning documented. P5-A/B source/UI gates are implemented. P2-E Windows packaged smoke evidence exists for the earlier ready desktop baseline. P5-C/D release hardening is not implemented yet and must not be claimed as release-ready until the gates in this plan pass.

**Implementation update on 2026-06-03:** P5-C/D guardrails are now implemented and review-remediated: sidecar artifact manifest/checker with approved-source, checksum artifact, and HTTPS URL + SHA-256 staging paths; updater manifest checker with bundle-root discovery, target-specific platform verification, and manifest/artifact checksum evidence; `prepare-sidecar.sh` release-mode provenance gate; CI source/UI gate ordering on `master`/`main`; pinned Tauri release action; draft release workflow behavior; release governance docs; privacy audit template; advanced acceptance checklist; and changelog baseline. Release readiness remains blocked because no approved cross-platform sidecar provenance, generated updater `latest.json` evidence, P4/P5 packaged smoke refresh, or candidate privacy audit has been completed.

**Non-goals:**

- Do not change the `chatlog_alpha` sidecar API contract.
- Do not change the sidecar runtime address away from `127.0.0.1:5030`.
- Do not rely on ignored local binaries as release input.
- Do not commit real chat data, real media, local database files, API keys, tokens, updater private keys, signing keys, or private diagnostics logs.
- Do not broaden Tauri CSP, capabilities, updater endpoints, or shell permissions unless the implementation explains the release need and keeps the new surface minimal.
- Do not use the P5-A/B mock backend as packaged release proof.
- Do not put full implementation code in this planning document.

---

## Source Context Read

This plan is based on the current development branch and the existing productization documents:

- `AGENTS.md` instructions supplied for this workspace.
- `task_plan.md`, `findings.md`, and `progress.md`.
- `docs/总体开发规划.md` and `开发指南.md`.
- `.specify/memory/constitution.md`.
- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`.
- `docs/superpowers/plans/2026-06-03-p5-a-b-contract-fixtures-e2e-visual-a11y.md`.
- P2-E release gate plans, review notes, release evidence, visual QA matrix, and ready desktop release runbook.
- P4-A through P4-E dedicated plans, implementation evidence, and current source/UI progress notes.
- `specs/001-ready-desktop-app/` spec, plan, contracts, tasks, release evidence, and ready desktop release docs.
- `specs/002-advanced-capabilities/` README, capability matrix, E2E matrix, fixture plan, privacy diagnostics contract, mock server docs, and test-data policy.
- Current release and packaging files:
  - `.github/workflows/build-check.yml`
  - `.github/workflows/release.yml`
  - `.github/scripts/prepare-sidecar.sh`
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/capabilities/default.json`
  - `src-tauri/src/lib.rs`
  - `src-tauri/src/sidecar.rs`
  - `src-tauri/src/sidecar_args.rs`
  - `package.json`
  - `playwright.config.ts`
- Current updater and diagnostics frontend code:
  - `src/App.tsx`
  - `src/l2-coordinator/commander/useUpdateCommander.ts`
  - `src/l2-coordinator/data-clerk/stores/useUpdateStore.ts`
  - `src/l2-coordinator/commander/updateNotificationViewModel.ts`
  - `src/l3-molecule/common/UpdateNotificationView.tsx`
  - `src/l4-atom/network/fetchUpdateJson.ts`
  - `src/l4-atom/network/diagnosticEvents.ts`

Official documentation checked for current constraints:

- Tauri v2 sidecar documentation: <https://v2.tauri.app/develop/sidecar/>
- Tauri v2 updater plugin documentation: <https://v2.tauri.app/plugin/updater/>
- Tauri GitHub Action documentation: <https://github.com/tauri-apps/tauri-action>

Relevant documentation constraints for this phase:

- Tauri sidecar files are configured through `bundle.externalBin`; the actual binary files need target-specific names that include the target triple. Runtime sidecar lookup uses the configured base name rather than a platform-specific path in app code.
- The updater requires signed artifacts. The public key is embedded in the app, and the update JSON must carry the signature generated for the platform artifact.
- Updater JSON generated for GitHub releases should be treated as an artifact with evidence, not as a hand-written release note.
- CI release automation must prove where the sidecar came from, which version was used, which checksum was accepted, and which app commit produced the installer.

---

## Current Baseline

The current branch is `codex/p4b-media-chat-extensions`, not `master`. The working tree contains continuous P4-B/C/D/E/P5 work. P5-C/D planning and later implementation must preserve that context and must not revert unrelated edits.

Current release pipeline state:

- `.github/workflows/build-check.yml` has a matrix for Windows x64, macOS Intel, macOS Apple Silicon, and Linux x64.
- `.github/workflows/release.yml` has a tag/workflow-dispatch release path and expects updater/signing secrets.
- `.github/scripts/prepare-sidecar.sh` can build a sidecar if `cmd/chatlog` exists, can use a target-specific binary if present, and can create a synthetic check-mode binary for non-release CI.
- Release mode already refuses to continue when no buildable source or non-empty target-specific sidecar binary exists.
- `build-check.yml` runs lint, typecheck, unit tests, cargo check, and `pnpm tauri build`.
- The current CI does not yet run P5-A/B `pnpm fixtures:check`, `pnpm e2e`, `pnpm e2e:visual`, or `pnpm e2e:a11y`.

Current sidecar state:

- `src-tauri/tauri.conf.json` declares `bundle.externalBin` as `binaries/chatlog_alpha`.
- `src-tauri/src/sidecar.rs` starts the configured sidecar base name and has tests for the base-name contract.
- `src-tauri/src/sidecar_args.rs` builds `serve --http-addr 127.0.0.1:5030` and avoids logging or passing raw `dataKey`.
- Current local `src-tauri/binaries/` inspection found only a Windows target sidecar binary. Other platform binaries are absent in the local workspace.
- `src-tauri/binaries/` is not a reliable release source unless the release process explicitly provides target-specific binaries or builds them from sidecar source.

Current updater state:

- `src-tauri/tauri.conf.json` has updater endpoints pointing at the GitHub release `latest.json` URL.
- `src-tauri/tauri.conf.json` keeps `bundle.createUpdaterArtifacts` disabled by default.
- `src-tauri/src/lib.rs` injects updater public key material through compile-time environment when available.
- `.github/workflows/release.yml` enables updater artifacts for release builds and injects `TAURI_UPDATER_PUBKEY`.
- `useUpdateCommander.ts` only enables updater behavior in production when `VITE_ENABLE_UPDATER=true`.
- Frontend updater diagnostics are already routed as redacted diagnostic events.

Current evidence state:

- P2-E has Windows packaged app smoke closure for the ready desktop baseline.
- P5-A/B has source/UI fixture, E2E, visual, accessibility, `pnpm verify`, `cargo test`, and `pnpm tauri build` evidence.
- P5-C has not yet rerun packaged app smoke after P4/P5 advanced work.
- P5-C has not yet proven sidecar artifact reproducibility, updater artifact signing, or release artifact checksum governance.

---

## Planning Principles

P5-C/D should treat release output as a product feature, not as a build script detail.

- The sidecar artifact must be traceable to source, upstream version, or pinned artifact provenance; URL artifacts require HTTPS plus SHA-256 verification before staging.
- The updater must be tested through signed artifacts and a real manifest shape, with matrix jobs verifying the Tauri platform entry they produced.
- CI must fail before publish when a release cannot be reproduced.
- Release evidence must name the app commit, app version, sidecar source/version/checksum, platform, installer artifact, updater artifact, and caveats.
- Governance docs must distinguish three states: source/UI verified, packaged smoke verified, and release-publish verified.
- Existing local privacy guarantees remain binding: no telemetry by default, no private data in fixtures, no raw secrets in diagnostics, and no automatic upload.

---

## P5-C Scope: Release Pipeline Hardening

P5-C should produce a release path that can be inspected and rerun. The implementation should be split into small tasks because sidecar provenance, updater signing, CI behavior, and manual packaged smoke have different failure modes.

### C0. Baseline Inventory And Release Blocker Record

Read and record the current release-relevant state before editing implementation files.

Inputs:

- Current `git status --short`.
- Current branch.
- Current `package.json` scripts.
- Current Tauri config, updater config, capability config, and sidecar source files.
- Current GitHub workflows and sidecar preparation script.
- Current `src-tauri/binaries/` inventory by target, size, and checksum when present.

Outputs:

- Update `findings.md` with release blockers and current artifact inventory.
- Update `progress.md` with the baseline and selected implementation path.
- Do not claim P5-C implementation completion during this task.

Acceptance:

- The release blocker list explicitly distinguishes local missing artifacts from CI release blockers.
- Existing P2-E/P5-A/B evidence is preserved without upgrading its scope.

### C1. Sidecar Artifact Strategy Decision

Decide one sidecar acquisition strategy for release mode. The implementation can support more than one strategy later, but P5-C should not ship with ambiguous provenance.

Valid strategies:

- **Build from auditable sidecar source in CI.** Use this when `chatlog_alpha` source is available in the repo, submodule, or a pinned dependency checkout. This is the strongest reproducibility path.
- **Download pinned upstream release assets with checksums.** Use this when source is maintained elsewhere and published as platform artifacts. The release workflow must verify checksums before packaging.
- **Consume a private CI artifact with attestation/checksum.** Use this when `chatlog_alpha` cannot be public but can be produced by a separate trusted pipeline.
- **Use manually supplied release assets only as an explicit exception.** This is acceptable only if the release evidence records who supplied them, when, from which source, and which checksums were accepted.

Recommended default for the current repository:

- Keep `build-check` able to use a synthetic check-mode binary for packaging compile checks.
- Require release mode to use either buildable sidecar source or a pinned artifact manifest with checksums.
- Treat the current single local Windows binary as developer-local evidence, not as a complete release input.

Decision that may require project owner input:

- Whether `chatlog_alpha` source should be vendored/submoduled for CI builds, or whether P5-C should consume pinned `chatlog_alpha` release assets. The rest of this plan works with either path.

### C2. Sidecar Artifact Manifest And Verification

Add a machine-verifiable sidecar artifact manifest instead of relying on ignored local files.

Preferred manifest responsibilities:

- Declare target triple.
- Declare expected binary file name.
- Declare sidecar version or source revision.
- Declare artifact URL or source build path.
- Declare SHA-256 checksum for externally supplied binaries.
- Declare whether the artifact is allowed for release mode.
- Declare whether the artifact is allowed only for check-mode.

Suggested locations:

- Manifest: `docs/release/sidecar-artifacts.md` for human-readable governance plus a small structured file under a release scripts directory for automation.
- Verifier: a script under `scripts/` or `.github/scripts/` that can run locally and in CI.

Acceptance:

- Every release target has either buildable source or a checksum-verified artifact.
- Release mode fails before Tauri packaging if any required sidecar is missing, empty, mismatched, or marked check-only.
- Evidence records the manifest version and accepted checksums.

### C3. Harden `prepare-sidecar.sh`

Refine sidecar preparation so check-mode and release-mode behavior are unambiguous.

Required behavior:

- Build from source when the approved source path exists.
- Verify externally supplied artifacts before copying or packaging.
- Keep synthetic check-mode sidecar generation limited to non-release CI.
- Print clear target, mode, source, destination, and checksum evidence.
- Fail release mode before packaging if provenance cannot be proven.
- Avoid echoing secrets, data keys, private paths beyond the workspace path needed for build logs, or chat content.

Acceptance:

- Non-release CI can still validate the Tauri packaging path without a real sidecar.
- Release CI cannot accidentally publish with a synthetic binary.
- The script output is understandable enough for release evidence.

### C4. Updater Signing And Manifest Verification

Treat updater artifacts as signed release artifacts, not as incidental build output.

Implementation checks:

- Confirm the release build sets `VITE_ENABLE_UPDATER=true`.
- Confirm the app embeds the intended updater public key.
- Confirm `bundle.createUpdaterArtifacts` is enabled only for release artifact generation.
- Confirm the generated update JSON contains platform entries for the published artifacts.
- Confirm each platform entry uses the actual signature content generated for that artifact.
- Confirm updater endpoints match the release channel and do not broaden CSP beyond the chosen update host.
- Confirm `useUpdateCommander.ts` remains production-gated and continues to record only redacted diagnostic events.

Suggested verification additions:

- A manifest-shape checker for generated `latest.json`.
- A signature-presence checker that compares generated artifact names to platform entries.
- A local or CI dry-run step that captures updater artifact names and signatures without publishing an incomplete release.

Acceptance:

- A release cannot be marked publish-ready unless updater artifacts and signatures are present or the release is explicitly declared non-updatable.
- Evidence records updater public key source, release channel, manifest URL, and generated artifact names.

### C5. CI/CD Matrix And Gate Ordering

Update CI so release quality gates are visible and correctly sequenced.

Recommended CI structure:

- `build-check.yml` remains a cross-platform packaging compile check.
- A source/UI quality job runs:
  - `pnpm fixtures:check`
  - `pnpm e2e`
  - `pnpm e2e:visual`
  - `pnpm e2e:a11y`
  - `pnpm verify`
- Rust/Tauri verification runs when `src-tauri/` or release files change:
  - `cd src-tauri && cargo test`
  - `pnpm tauri build` for the relevant target
- Release workflow runs only after sidecar artifact verification, source/UI quality gates, and updater signing prerequisites pass.

Implementation cautions:

- Do not let browser E2E ports collide with the release sidecar packaging path.
- Keep mock backend tests separate from packaged sidecar smoke.
- Keep check-mode synthetic sidecar logs visibly labeled in CI output.
- Consider pinning the Tauri GitHub Action version rather than leaving release behavior dependent on a moving action reference.

Acceptance:

- CI makes it obvious which gate failed: source/UI, sidecar artifact, updater artifact, package build, or packaged smoke.
- CI artifacts include enough logs and checksums to reconstruct what was packaged.

### C6. Platform Packaging Smoke Scripts And Runbooks

P5-C should convert the successful P2-E Windows smoke into a repeatable P5 release gate and add platform-specific follow-up instructions.

Windows required smoke:

- Install generated Windows x64 package.
- Launch without terminal.
- Confirm app-managed sidecar health through `/health`.
- Complete clean setup with synthetic data/config only.
- Quit app and confirm owned sidecar exits.
- Reopen app and confirm readiness state recovers.
- Start an unknown listener on `127.0.0.1:5030`, launch app, and confirm it reports conflict without killing the unknown process.
- Export diagnostics and confirm manifest/event/redaction behavior still passes.

macOS follow-up smoke:

- Install or open generated artifact on Intel and Apple Silicon where available.
- Confirm sidecar executable permission and quarantine/notarization caveats.
- Confirm app-managed sidecar launch and quit cleanup.
- Record signing/notarization status explicitly.

Linux follow-up smoke:

- Launch AppImage or package artifact on a supported Linux environment.
- Confirm sidecar executable permission.
- Confirm app-managed sidecar launch and quit cleanup.
- Record distribution/runtime caveats explicitly.

Acceptance:

- Windows smoke is required for P5-C completion.
- macOS and Linux smoke are either completed with evidence or recorded as platform caveats that block claiming those platforms release-ready.
- Diagnostics export evidence is refreshed after advanced P4/P5 changes.

### C7. Release Artifact Checksums And Evidence Bundle

Every release candidate should produce an evidence bundle.

Required bundle contents:

- App source commit.
- App version.
- Sidecar source revision or upstream artifact version.
- Sidecar checksum per target.
- Installer or bundle artifact checksum per target.
- Updater artifact names and checksums.
- Generated update JSON checksum.
- Workflow run URL or local command transcript reference.
- Packaged smoke result per platform.
- Privacy audit result.
- Known caveats and unsupported platform statements.

Suggested output locations:

- `specs/001-ready-desktop-app/release-evidence.md` for the ready desktop release history.
- A P4/P5 appendix or dedicated section for advanced capability release evidence.
- `docs/release/ready-desktop-app.md` for the operator runbook.

Acceptance:

- A reviewer can answer "what did we package?" and "what sidecar did it include?" without inspecting a developer's local machine.

### C8. Release Notes, Changelog, And Versioning

Create release notes that reflect user-visible changes and release caveats without leaking internal data.

Requirements:

- Add or enforce a release notes source such as `CHANGELOG.md` or a generated release summary input.
- Include app version, sidecar version, supported platforms, updater status, and known caveats.
- Separate advanced capability source/UI completion from packaged release support.
- Avoid raw endpoint payloads, real chat snippets, screenshots containing private data, or local file paths.
- Define how app version and sidecar version are compared in release evidence.

Acceptance:

- GitHub release body is not the only place where release changes are tracked.
- Release notes can be reviewed before publish.

### C9. Documentation Synchronization

Update all active docs that define release readiness.

Files to update during implementation:

- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`
- `specs/002-advanced-capabilities/README.md`
- `specs/002-advanced-capabilities/e2e-matrix.md`
- `specs/001-ready-desktop-app/release-evidence.md`
- `docs/release/ready-desktop-app.md`
- `task_plan.md`
- `findings.md`
- `progress.md`

Acceptance:

- Active docs do not imply P5-C/D is complete until the release gates pass.
- Older Sprint 6 guidance is either superseded in active docs or clearly treated as historical context.

### C10. P5-C Final Verification

Required local commands before claiming P5-C implementation complete:

```powershell
pnpm fixtures:check
pnpm e2e
pnpm e2e:visual
pnpm e2e:a11y
pnpm verify
cd src-tauri
cargo test
cd ..
pnpm tauri build
```

Required release or CI evidence:

- Cross-platform build-check matrix result.
- Sidecar artifact verification result.
- Updater artifact generation and signature verification result.
- Windows packaged smoke result after P4/P5 advanced changes.
- macOS/Linux result or explicit release-blocking caveat.

---

## P5-D Scope: Release Governance And Maintenance

P5-D makes release quality maintainable after P5-C lands. It should convert one-off evidence into repeatable governance.

### D0. Evidence Taxonomy

Define the vocabulary used across release docs.

Recommended states:

- `source-ui-verified`: unit/adapter/source/browser gates pass against synthetic fixtures.
- `packaged-smoke-verified`: installed or launched package passes app-managed sidecar smoke.
- `release-artifact-verified`: published or dry-run release artifacts, updater metadata, signatures, and checksums are verified.
- `platform-caveat`: platform has known signing, notarization, runtime, or smoke gaps.
- `release-blocked`: a gate prevents claiming release readiness.

Acceptance:

- Contributors can tell which evidence state applies without reading the full history.

### D1. Advanced Capability Acceptance Checklist

Create `specs/002-advanced-capabilities/acceptance-checklist.md`.

Checklist sections:

- Contract fixture coverage.
- Browser E2E coverage.
- Visual regression coverage.
- Accessibility and keyboard coverage.
- Privacy diagnostics coverage.
- Sidecar artifact and updater coverage.
- Platform packaged smoke coverage.
- Evidence links and owner signoff.

Acceptance:

- P4/P5 advanced work has a single checklist that separates source/UI gates from release gates.

### D2. Release Governance Runbook

Add or extend release governance guidance under `docs/release/`.

Runbook sections:

- Release candidate preparation.
- Required local verification.
- Required CI verification.
- Sidecar artifact provenance.
- Updater signing and manifest verification.
- Windows smoke procedure.
- macOS/Linux platform caveats.
- Diagnostics/privacy audit procedure.
- Release notes and changelog procedure.
- Rollback and update disabling procedure.

Acceptance:

- A release operator can follow the runbook without relying on memory from the original developer.

### D3. Privacy Audit Checklist

Add a privacy audit record for P4/P5 release candidates.

Audit questions:

- Are all fixtures synthetic?
- Are diagnostics user-triggered?
- Are raw `dataKey`, API keys, updater keys, tokens, local database paths, and private messages absent from logs and screenshots?
- Are failed network/update/sidecar events redacted?
- Are screenshots safe to attach to release evidence?
- Did CSP/capabilities stay minimal?
- Did updater checks avoid telemetry or remote calls beyond the documented update endpoint?

Acceptance:

- Privacy review is a required gate before publishing release artifacts.

### D4. Regression Dashboard

Add a compact release dashboard in `docs/release/ready-desktop-app.md` or a linked release status doc.

Suggested rows:

- Ready desktop baseline.
- P4 diagnostics/privacy.
- P4 media/chat extensions.
- P4 SNS.
- P4 DB/API runner.
- P4 hook/MCP/semantic/graph residuals.
- P5-A contract fixtures.
- P5-B browser/visual/a11y.
- P5-C release pipeline.
- Sidecar artifact provenance.
- Updater signing.
- Platform smoke.
- Privacy audit.

Acceptance:

- The dashboard shows status, last evidence date, evidence file, and caveat for each row.

### D5. Logging And Diagnostics Governance

Add "what not to log" guidance for advanced capability developers.

Required points:

- Never log `dataKey`, API keys, updater private keys, signing keys, tokens, raw chat content, raw media URLs, local database paths, or unredacted diagnostics payloads.
- Do not attach real screenshots to evidence.
- Keep diagnostics local unless the user explicitly exports them.
- Keep release logs focused on target, checksum, artifact name, status, and redacted error summaries.

Acceptance:

- New P4/P5 contributors can find logging constraints in release governance docs, not only in `AGENTS.md`.

### D6. Deprecated Guidance Cleanup

Prevent older release notes from confusing active work.

Actions:

- Mark early Sprint 6 release planning as historical where it conflicts with current evidence.
- Keep active docs away from force-killing unknown `5030` listeners.
- Keep active docs away from fake platform UI or fake platform release claims.
- Keep active docs away from hand-written updater manifest shortcuts.
- Keep active docs away from broad shell permissions unless justified by current Tauri requirements.

Acceptance:

- Active release docs reflect the current sidecar/updater/CI approach.

### D7. Maintenance Cadence And Ownership

Define how release quality stays current.

Required decisions:

- Who updates sidecar artifact provenance when `chatlog_alpha` changes.
- Who rotates updater signing keys if needed.
- How release candidates are named.
- How sidecar version and app version are paired.
- How updater channels are separated if staging and stable releases diverge.
- How old release evidence is retained.
- How failed release candidates are recorded.

Acceptance:

- P5-D leaves an auditable release maintenance loop, not only a one-time checklist.

---

## Acceptance Matrix

| Area | Required evidence | Completion state |
| --- | --- | --- |
| Sidecar artifact provenance | Manifest/source or checksum verification per target | P5-C |
| Release sidecar preparation | Release mode fails without proven artifact | P5-C |
| Updater signing | Public key injection, signed artifacts, generated update JSON checked | P5-C |
| CI source/UI gates | Fixture, E2E, visual, a11y, `pnpm verify` results | P5-C |
| Rust/Tauri gates | `cargo test`, Tauri package build, sidecar launch contract preserved | P5-C |
| Windows packaged smoke | Install, launch, health, quit, reopen, port conflict, diagnostics export | P5-C |
| macOS/Linux release status | Smoke evidence or explicit platform caveat | P5-C |
| Release evidence | Commit, app version, sidecar version/checksum, artifact checksums, updater evidence | P5-C |
| Advanced checklist | `specs/002-advanced-capabilities/acceptance-checklist.md` | P5-D |
| Governance runbook | Release, updater, privacy, rollback, and maintenance procedures | P5-D |
| Privacy audit | Explicit release-candidate privacy review | P5-D |
| Regression dashboard | Status table with evidence links and caveats | P5-D |

---

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `chatlog_alpha` source is unavailable in this repo | CI cannot reproduce release sidecars from source | Use pinned upstream artifacts with checksums, or define a private artifact pipeline before release |
| Local Windows sidecar is mistaken for release input | Release cannot be reproduced by another runner | Require manifest verification and fail release mode without provenance |
| Check-mode synthetic sidecar leaks into release | Published app has unusable backend | Keep mode checks explicit and fail release mode before packaging |
| Updater JSON exists but signatures do not match artifacts | Update install fails or becomes unsafe | Add generated manifest/signature checks and record evidence |
| CI passes source/UI gates but packaged app fails | User-facing release is broken | Keep packaged smoke separate and required for P5-C completion |
| Older Sprint 6 docs conflict with current rules | Contributors follow obsolete release shortcuts | Mark active docs and governance docs as source of truth |
| CSP/capabilities broaden during updater work | Local-private-data boundary weakens | Review Tauri config diff and document any endpoint/capability change |
| Release logs contain private data or secrets | Privacy breach | Redacted logs only, synthetic fixtures only, privacy audit before publish |
| macOS/Linux artifacts build but are not smoke-tested | Platform release claim is unsupported | Record platform caveats or block those platforms |

---

## Reviewer Checklist

Before merging P5-C/D implementation work, reviewers should verify:

- Sidecar artifact source is documented and machine-checked.
- Release mode cannot use a synthetic sidecar.
- Updater artifacts are signed and update JSON is generated, not hand-written.
- `VITE_ENABLE_UPDATER=true` is limited to release builds.
- Tauri CSP and capabilities remain minimal and justified.
- CI distinguishes source/UI tests from packaged release gates.
- Windows packaged smoke evidence is refreshed after P4/P5 advanced work.
- macOS/Linux caveats are explicit if smoke is not complete.
- Release evidence names app commit, app version, sidecar version/source, sidecar checksums, artifact checksums, updater evidence, and caveats.
- Privacy audit evidence exists and contains no private data.
- Active docs do not claim P5-C/D release readiness before verification.

---

## Implementation Session Split

Recommended sequence:

1. **P5-C-1:** Baseline inventory, sidecar artifact decision, and sidecar manifest/verifier planning.
2. **P5-C-2:** Implement sidecar acquisition and `prepare-sidecar.sh` release hardening.
3. **P5-C-3:** Implement updater artifact/signature checks and release workflow hardening.
4. **P5-C-4:** Add CI gate ordering and release evidence bundle generation.
5. **P5-C-5:** Run packaged smoke and refresh release evidence.
6. **P5-D-1:** Add advanced acceptance checklist, release governance runbook, and privacy audit checklist.
7. **P5-D-2:** Add regression dashboard, deprecated-guidance cleanup, and maintenance ownership records.

Each implementation session should end with updated `task_plan.md`, `findings.md`, and `progress.md`, plus explicit verification commands that were actually run.

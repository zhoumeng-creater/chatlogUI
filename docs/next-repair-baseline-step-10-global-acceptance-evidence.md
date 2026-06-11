# Step 10 Global Acceptance Evidence

This file records the current global acceptance run for `codex/next-repair-baseline`. Historical evidence remains useful context, but the status below is the current evidence for 2026-06-11.

## Build Under Test

- Date: 2026-06-11
- Branch: `codex/next-repair-baseline`
- Reviewed baseline commit: `86add4b8eef5001cadf99ba26835c9dc955df424`
- Current remediation scope: endpoint-free ordinary service labels, L1 privacy-store boundary cleanup, AI primary page IA cleanup, expanded visual/page-score evidence, and release-blocker evidence clarification.
- App version: `0.1.0`
- Sidecar release target checked: `x86_64-pc-windows-msvc`
- Sidecar source/version: `github.com/zhoumeng-creater/chatlog_alpha@5b979cc666418c41467b1f9959cfdc6b3abbb86b`
- Environment: local Windows x64 development machine
- Operator: Codex

## Evidence Levels

| Level | Meaning | Current result |
| --- | --- | --- |
| D0 | Plan and evidence inventory | Passed |
| S1 | Source, unit, static, governance, fixture checks | Passed |
| B1 | Browser E2E, accessibility, visual regression with synthetic data | Passed |
| T1 | Tauri dev shell and Rust/native lifecycle tests | Passed with environment note |
| P1 | Package build and local packaged executable smoke | Partial |
| R1 | Release artifact evidence, signed updater metadata, owner signoff | Blocked |

## Overall Decision

| Scope | Decision | Reason |
| --- | --- | --- |
| Source/UI acceptance | Go | Fixtures, governance, E2E, a11y, visual, `pnpm verify`, and Rust tests passed with current code. |
| Windows x64 bundle build | Go | `pnpm tauri build` produced MSI and NSIS artifacts. |
| Windows sidecar provenance | Go for current Windows target | Release-mode sidecar check passed for the checksum-verified Windows x64 artifact. |
| Release publish | No-go | Signed updater `latest.json` is missing, installer-level smoke was not completed in this run, packaged unknown-port UI smoke was not rerun, and release owner signoff is absent. |

## Command Evidence

| Command or smoke | Result | Evidence |
| --- | --- | --- |
| `pnpm fixtures:check` | Passed | 71 route entries checked. |
| Governance Vitest run for architecture, UI, privacy, release workflow, fixture, sidecar, updater scripts | Passed | 7 files / 57 tests passed. |
| `pnpm release:check:sidecar -- --json` | Passed | Windows artifact verified; non-Windows check-mode placeholders warned as not release evidence. |
| `pnpm release:check:sidecar:release -- --json` | Passed | Windows x64 release target verified as checksum artifact, SHA-256 `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af`. |
| `pnpm release:check:updater -- --json` | Failed as release blocker | `no latest.json was found under src-tauri/target`. |
| `pnpm e2e` | Passed | 29 Playwright tests passed across core, advanced, privacy, P3-C semantic discovery, and P3-E privacy diagnostics. |
| `pnpm e2e:visual` | Passed | 4 visual regression tests passed after expanding snapshots to Workbench/Search/AI/Graph plus Setup/Settings diagnostics/Media/SNS/narrow Settings privacy. |
| `pnpm e2e:a11y` | Passed after serialized rerun | 10 accessibility/keyboard tests passed. Earlier parallel attempts failed only because another Playwright web server occupied `127.0.0.1:5030`. |
| `pnpm verify` | Passed | Lint, typecheck, 168 Vitest files / 702 tests, and production build passed. |
| `cd src-tauri && cargo test` | Passed | 22 Rust tests passed, including sidecar ownership, unknown-process classification, config redaction, and diagnostics redaction. |
| `pnpm tauri build` | Passed | MSI and NSIS x64 bundles were produced. |
| `pnpm tauri build --config '{"bundle":{"createUpdaterArtifacts":true}}'` | Failed as release blocker | Build produced bundles, then failed because `TAURI_SIGNING_PRIVATE_KEY` was not set while an updater public key is configured. |
| Tauri dev smoke | Passed with environment note | Default `5173` was already occupied by an existing Vite process from 2026-06-10, so a temporary Tauri dev config used `127.0.0.1:5174`. The Tauri window process started, `CloseMainWindow()` succeeded, and no window or sidecar process remained. |
| Packaged executable smoke | Partial pass | Built `chatlogUI.exe` launched and reopened from a temporary profile, closed cleanly both times, started no sidecar in clean-profile state, and left no `5030` listener. |
| MSI administrative extraction smoke | Blocked | `msiexec /a` hung for 180 seconds in this environment and was terminated. No installer-level smoke result is claimed. |

## Current Artifact Evidence

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `src-tauri/target/release/bundle/msi/chatlog_alpha_0.1.0_x64_zh-CN.msi` | 31,510,528 bytes | `baff967c30eba17bb405c3bf3e8a4109e52c2c191863a0f97e22723a24d8bd12` |
| `src-tauri/target/release/bundle/nsis/chatlog_alpha_0.1.0_x64-setup.exe` | 22,513,171 bytes | `4404aaff0aabb1cf4976b4ddc2ed5d872a491ee6a0fcd020383f9f5b2c0d9f2a` |
| `src-tauri/target/release/chatlogUI.exe` | current build output | `7b8f9fe293404c2ae78ad6edb90529e4d8404034bf9c579dcbde0ce5790ca17f` |
| `src-tauri/binaries/chatlog_alpha-x86_64-pc-windows-msvc.exe` | local sidecar artifact | `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af` |

## Route And State Coverage

| Surface | Current evidence |
| --- | --- |
| Setup `/` | Desktop and narrow setup center, diagnostics collapsed by default, external loopback connection, invalid external URL field error, window controls. |
| Workbench `/workbench?codex-smoke=workbench-ready` | Desktop/narrow shell, rail, chat, stats, media, SNS, AI, graph, developer entry hidden by default, privacy mode, window controls. |
| Independent routes | `/search`, `/media`, `/sns`, `/analytics`, `/ai`, and `/graph` render as independent privacy-safe surfaces. |
| Search closure | Search result open/return loop, keyboard activation, stale response guard, stale load-more guard, missing anchor recovery, privacy-on hit masking. |
| Settings | Settings route, semantic deep link, update check, diagnostics disclosure collapsed by default. |
| Advanced modules | Media/SNS, developer diagnostics, semantic setup/preview/search/topics/QA, graph list/detail/timeline/advanced/visualization/QA. |
| Privacy | Browser privacy suite masks workbench, media, SNS, semantic, graph, search snippets, form values, and accessible names. |
| Accessibility | Axe critical/serious checks, keyboard rail/tabs/graph/QA evidence, focus trap/restore, titlebar tooltips, graph command tooltips. |
| Visual | Desktop workbench/search/AI/graph/setup/settings diagnostics/media/SNS and narrow privacy workbench/AI/graph/settings snapshots passed with synthetic/privacy-safe data. |

## Page Score And Visual Evidence

These page scores are the acceptance checklist for the current remediation run. Scores use the project 10-item page score rubric from `docs/product-acceptance-standards.md`; the fresh E2E, a11y, visual, and manual snapshot checks passed for the listed synthetic/privacy-safe states.

| Page | Score | Evidence and caveat |
| --- | ---: | --- |
| Setup `/`: 18/20 | 18 | Main task, three setup paths, readiness summary, diagnostics disclosure, desktop/narrow layout, and first-run recovery are clear. Minor caveat: desktop first viewport remains dense near the lower CTA edge. |
| Settings `/settings`: 18/20 | 18 | Source-aware Settings, folded diagnostics, AI semantic ownership, data/service ownership, and endpoint-free service summary are coherent. |
| Media `/media`: 17/20 | 17 | Independent route, scope status, empty/partial/error states, disabled reasons, privacy masking, and retry paths are present. Further polish can improve dense member/resource hierarchy. |
| SNS `/sns`: 17/20 | 17 | Independent route, timeline/search/notification states, safe external-open confirmation, privacy masking, and empty-search recovery are present. Further polish can improve lower-frequency affordance explanations. |
| AI `/ai`: 18/20 | 18 | AI is a single primary workspace; semantic setup/index/QA/search/analysis/preview states, cancellation, privacy, evidence, and Settings handoff are covered. Internal stats/AI modebar was removed in this remediation. |
| Graph `/graph`: 18/20 | 18 | Summary/table default, explicit visualization, advanced/QA/timeline states, nonblank canvas checks, privacy labels, and narrow behavior are covered. |

## Privacy And Security Notes

- All browser evidence used synthetic fixtures and the local mock sidecar.
- The fixture validator rejected non-synthetic secret/path patterns and passed for 71 route entries.
- Current automated coverage confirms no visible or accessible synthetic private markers in privacy-sensitive browser paths.
- Current Rust tests confirm generated diagnostics redacts synthetic data keys, API keys, tokens, private-message labels, and local identity/path markers.
- No Tauri CSP or capability broadening was introduced in this step.
- A current packaged diagnostics export was not performed in this run; that remains part of the release no-go boundary.

## Open Release Blockers

| Blocker | Evidence | Required closure |
| --- | --- | --- |
| Signed updater metadata missing | `pnpm release:check:updater -- --json` failed because no `latest.json` exists. `createUpdaterArtifacts:true` build failed without `TAURI_SIGNING_PRIVATE_KEY`. | Run release workflow or local signed updater build with signing private key/password, then verify `latest.json` and artifact checksums. |
| Installer-level smoke incomplete | MSI administrative extraction hung and was terminated. No current install/uninstall smoke is claimed. | Run controlled NSIS/MSI install, launch, quit, reopen, uninstall/cleanup smoke on a release machine. |
| Packaged unknown-port UI smoke not rerun | Current Rust tests cover unknown-process classification; current packaged executable smoke did not click `启动服务` under an occupied port. | In a desktop smoke environment, occupy `127.0.0.1:5030`, start from a saved managed profile, trigger service start, and verify recoverable conflict plus listener survival. |
| Packaged diagnostics export not rerun | Source/browser/Rust privacy checks passed, but no current installed-app diagnostics artifact was reviewed. | Export diagnostics from the current packaged candidate and scan for raw keys, tokens, private content, and local identity/path markers. |
| macOS/Linux release caveats | Only Windows x64 target was release-checked. | Provide target sidecar provenance, signing/notarization/runtime smoke, and platform-specific evidence. |
| Release owner signoff absent | No tag/release owner approval was recorded. | Release owner reviews this evidence bundle and signs off after blockers close. |

## Files Updated By This Step

- `docs/next-repair-baseline-step-10-global-acceptance-evidence.md`
- `docs/release/ready-desktop-app.md`
- `docs/release/privacy-audit.md`
- `docs/release/sidecar-artifacts.md`
- `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/release-evidence.md`
- `specs/chatlogui-specs-hidden-for-ci-repro/002-advanced-capabilities/acceptance-checklist.md`
- `docs/next-repair-baseline-ux-ledger.md`
- `docs/next-repair-baseline-inspector-architecture.md`

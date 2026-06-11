# Ready Desktop App Release Evidence

This file is the redaction-safe evidence template for release readiness. Do not paste raw `dataKey`, API keys, tokens, private chat text, real contact names, or full private local paths.

## 2026-06-11 Step 10 Current Global Acceptance Evidence

Canonical current evidence is recorded in `docs/next-repair-baseline-step-10-global-acceptance-evidence.md`. This section supersedes older rows for current release go/no-go decisions.

### Build Under Test

- Date: 2026-06-11
- Branch: `codex/next-repair-baseline`
- Reviewed baseline commit: `86add4b8eef5001cadf99ba26835c9dc955df424`
- Current remediation scope: endpoint-free ordinary service labels, L1 privacy-store boundary cleanup, AI primary page IA cleanup, expanded visual/page-score evidence, and release-blocker evidence clarification.
- App version: `0.1.0`
- Sidecar source/version: `github.com/zhoumeng-creater/chatlog_alpha@5b979cc666418c41467b1f9959cfdc6b3abbb86b`

### Current Results

| Area | Status | Evidence |
| --- | --- | --- |
| Fixture and governance gates | Passed | `pnpm fixtures:check` passed for 71 route entries. Governance Vitest passed 7 files / 57 tests. |
| Browser E2E | Passed | `pnpm e2e` passed 29 tests covering core routes, advanced modules, privacy, P3-C semantic discovery, and P3-E privacy diagnostics. |
| Accessibility | Passed | `pnpm e2e:a11y` passed 10 tests after serialized rerun. Parallel attempts failed only because another Playwright web server occupied `127.0.0.1:5030`. |
| Visual regression | Passed | `pnpm e2e:visual` passed 4 tests covering Workbench/Search/AI/Graph plus Setup/Settings diagnostics/Media/SNS/narrow Settings privacy. |
| Full frontend verification | Passed | `pnpm verify` passed lint, typecheck, 168 Vitest files / 702 tests, and production build. |
| Rust/native tests | Passed | `cargo test` passed 22 tests in `src-tauri`. |
| Sidecar provenance | Passed for Windows x64 | `pnpm release:check:sidecar:release -- --json` verified the Windows artifact with SHA-256 `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af`. |
| Tauri bundle build | Passed | `pnpm tauri build` produced Windows x64 MSI and NSIS bundles. |
| Tauri dev smoke | Passed with environment note | Default `5173` was occupied by an existing Vite process, so a temporary `127.0.0.1:5174` dev config was used. The Tauri window started, closed, and left no sidecar/window process. |
| Packaged executable smoke | Partial pass | Built `chatlogUI.exe` launched, closed, reopened, and closed from a temporary profile without starting sidecar or leaving `5030` listeners. |
| Updater release metadata | Blocked | `pnpm release:check:updater -- --json` failed because no `latest.json` exists. `createUpdaterArtifacts:true` failed because `TAURI_SIGNING_PRIVATE_KEY` is not set. |
| Installer-level packaged smoke | Blocked | MSI administrative extraction hung for 180 seconds and was terminated. No current install/uninstall smoke is claimed. |
| Release readiness | Blocked | Needs signed updater metadata, installer-level smoke, packaged unknown-port UI smoke, packaged diagnostics export review, and owner signoff. |

### Current Package Checksums

| Artifact | SHA-256 |
| --- | --- |
| `src-tauri/target/release/bundle/msi/chatlog_alpha_0.1.0_x64_zh-CN.msi` | `baff967c30eba17bb405c3bf3e8a4109e52c2c191863a0f97e22723a24d8bd12` |
| `src-tauri/target/release/bundle/nsis/chatlog_alpha_0.1.0_x64-setup.exe` | `4404aaff0aabb1cf4976b4ddc2ed5d872a491ee6a0fcd020383f9f5b2c0d9f2a` |
| `src-tauri/target/release/chatlogUI.exe` | `7b8f9fe293404c2ae78ad6edb90529e4d8404034bf9c579dcbde0ce5790ca17f` |
| `src-tauri/binaries/chatlog_alpha-x86_64-pc-windows-msvc.exe` | `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af` |

## Build Under Test

- Date: 2026-06-01
- Branch: `codex/p2-d-ai-graph-containment`
- Commit: `459c2ed` plus current working tree changes
- Package:
  - `src-tauri/target/release/bundle/msi/chatlog_alpha_0.1.0_x64_zh-CN.msi` (31,371,264 bytes, 2026-06-01T20:43:36)
  - `src-tauri/target/release/bundle/nsis/chatlog_alpha_0.1.0_x64-setup.exe` (22,412,730 bytes, 2026-06-01T20:44:32)
- Windows x64 environment: local Windows development machine
- Operator: Codex

## Verification Summary

| Area | Status | Evidence |
| --- | --- | --- |
| Frontend verification | Passed | Final `pnpm verify` passed: 62 test files / 338 tests; production build completed without GraphCanvas chunk warnings |
| Rust tests | Passed | Final `cargo test` in `src-tauri`: 20 tests passed after sidecar basename, app-exit cleanup, sidecar ownership, and diagnostics export redaction coverage |
| Tauri package build | Passed | Final `pnpm tauri build` produced MSI and NSIS x64 bundles from the latest working tree without the previous GraphCanvas or crate-name warnings |
| Browser responsive smoke | Passed | Previous P2-E Playwright CLI checked setup, settings, dashboard alias, workbench privacy, 390px drawer, update notification, and graph explicit visualization with redaction-safe mocked backend data. P2-E comprehensive remediation additionally smoke-checked `/`, `/settings`, and `/workbench?codex-smoke=workbench-ready` with Chrome headless dump-dom against local Vite. |
| Install | Passed | Latest NSIS installer exited 0 and installed `chatlogUI.exe` plus `chatlog_alpha.exe` under the local app install directory |
| Launch | Passed | Installed `chatlogUI.exe` opened without a terminal; clean profile reached setup/config; saved synthetic config reopened to service control |
| Quit | Passed | Closing the installed app after an app-managed sidecar start removed both `chatlogUI` and `chatlog_alpha`; no `5030` listener remained |
| Reopen | Passed | Reopening the installed app restored the saved synthetic config to the service page with `启动服务` and `导出诊断` reachable |
| Port conflict | Passed | Unknown PowerShell `TcpListener` on `127.0.0.1:5030` produced a recoverable conflict state and remained alive until explicitly cleaned up by the smoke script |
| Privacy redaction | Passed | P2-C/P2-E automated redaction tests pass; real packaged diagnostics artifact was exported and manually scanned for raw synthetic key, private text, and full user profile path leakage |
| Caveats | Passed with note | The smoke used synthetic local data and did not include real private WeChat content; macOS packaging remains a separate follow-up |

## 2026-06-02 P4-A Diagnostics And Privacy Mode 2.0 Source Evidence

This section records source/UI evidence for the advanced diagnostics/privacy upgrade. It does not replace the 2026-06-01 packaged Windows x64 release gate and does not claim a new packaged artifact was built or rerun for P4-A.

| Area | Status | Evidence |
| --- | --- | --- |
| Production diagnostics wiring | Passed | L2 `diagnosticEventBridge` wires store-backed safe callbacks into production core, semantic, graph, readiness/status, update, Tauri/UI, export, and semantic QA SSE paths. L4 atoms still receive only optional diagnostics callbacks/options. |
| DevConsole 2.0 | Passed | Workbench DevConsole now has source, level, privacy, endpoint, time, and failed-only filters; status/duration/recovery labels; and a safe detail panel. |
| Manifest 2.0 export lines | Passed | Diagnostics reports now include manifest version, app/build/update/platform/package/backend/sidecar/readiness/setup/release/redaction summaries as safe line-based output through the existing fail-closed export path. |
| Privacy redaction expansion | Passed | JS tests cover media keys/paths, SNS proxy query values, SQL, request query/body labels, raw response/body labels, local identity paths, credentials, tokens, and synthetic private message markers. |
| Browser UI evidence | Passed | Vite plus cached Chromium DevTools Protocol checked `/workbench?codex-smoke=workbench-ready` and `/settings` at `1440x900` and `390x820`: no page-level overflow, no visible synthetic/private marker strings, and no sub-28px visible button targets after the DevConsole row min-height fix. |
| Final frontend verification | Passed | `pnpm lint`, `pnpm typecheck`, `pnpm test` (47 files / 241 tests), `pnpm build`, and `pnpm verify` passed on 2026-06-02. `git diff --check` returned no whitespace errors, only CRLF normalization warnings. |
| Rust/Tauri scope | Not changed | P4-A did not change Rust export payload shape, Tauri CSP, Tauri capabilities, sidecar startup, sidecar bind address, or backend contract; no new packaged artifact was produced for this source/UI evidence slice. |

## 2026-06-02 P4-C SNS Source/UI Evidence

This section records source and mocked-browser evidence only. It does not replace the 2026-06-01 packaged Windows x64 release gate, and it does not claim persistent P5-B E2E coverage.

| Area | Status | Evidence |
| --- | --- | --- |
| SNS L4 contract | Passed | `snsAdapters.test.ts` and `fetchSnsEndpoints.test.ts` cover backend-shaped feed/search/notification rows, `format=json`, `media=1`, `replace=1`, blank search rejection, local proxy validation, and diagnostics without raw query/key leakage. |
| SNS L2 orchestration | Passed | `useSnsStore.test.ts`, `snsViewModel.test.ts`, and Workbench view-model tests cover load/search/error/filter/reset state, selected post lookup, privacy-aware view model, module order, inspector title, and badge behavior. |
| SNS L3 UI privacy | Passed | `snsDisplay.test.ts` covers privacy masking and plain text search highlight segments; media proxy URLs/keys are never returned by display helpers. |
| Mocked browser acceptance | Passed | Vite `/workbench?codex-smoke=workbench-ready` was checked with synthetic local SNS feed/search/notifications/proxy responses at desktop and `390x780`. The initial desktop two-column compression was fixed to a single-column inspector layout and rechecked. |
| Tauri/sidecar scope | Not changed | P4-C did not modify Rust, Tauri capabilities, sidecar startup, diagnostics export payload shape, or CSP. It reuses the P4-B local `media-src` gate. |

## No-Terminal Launch Cases

| Case | Expected Result | Evidence |
| --- | --- | --- |
| Clean profile | App reaches setup without terminal commands | Passed: installed app opened to setup/config with no terminal and no `5030` listener |
| Valid saved config | App restores saved configuration and can start app-managed sidecar | Passed with synthetic config: service page restored, `启动服务` reached `/health` `{"status":"ok"}` |
| Missing data | App asks for directory selection | Passed by clean profile setup/config screen with manual directory selection available |
| Unknown port conflict | App shows recoverable conflict state for `5030` | Passed: UI text reported `5030 端口被其他进程占用` and did not stop the unknown listener |
| Backend failure | App shows retryable error without private details | Passed in conflict path: error used generic port-conflict text and diagnostics stayed redacted |
| Retry | Retry action updates readiness state | Passed: `检查端口` / `启动服务` updated port state from idle/free to occupied/running states |
| Workspace entry | User can enter workbench after readiness succeeds | Not exercised with real DB content in this smoke; synthetic sidecar health passed and DB remained unavailable by design |

## Sidecar Ownership

- App-managed sidecar PID: `29364` during latest successful packaged smoke
- Health endpoint `/health` result: `{"status":"ok"}`
- Backend base URL: `http://127.0.0.1:5030`
- Shutdown evidence: closing installed app PID `9500` removed the app-managed sidecar and left no `5030` listener after 5 seconds
- Unknown process conflict evidence: external PowerShell listener PID `40776` kept ownership of `127.0.0.1:5030`; installed app PID `15956` showed a recoverable conflict and did not kill PID `40776`
- Automated ownership guard: `post_spawn_pid_tracking_only_claims_spawned_child` verifies post-spawn port inspection does not claim an unrelated listener as app-managed.
- Packaged ownership proof passed on 2026-06-01 after fixing runtime sidecar basename and app-exit cleanup.

## Privacy Review

- Logs checked: packaged diagnostics artifact at `%TEMP%\chatlog_alpha_diagnostics.log`; 14 lines / 433 bytes
- Screenshots checked: clean setup, synthetic service restore, successful sidecar start state, and unknown `5030` conflict state; no private chat content was used
- Raw secrets observed: No. The exported artifact did not contain the synthetic 64-character data key.
- Private chat content observed: No. Synthetic private markers and full user profile paths were absent from the exported artifact.
- Synthetic diagnostics audit: `diagnostics.test.ts` and `maskSecrets.test.ts` cover data keys, API keys, tokens, private message labels, local identity markers, and redaction false-positive handling.
- Rust export audit: `diagnostics_report_export_redacts_synthetic_release_audit_values` writes a generated diagnostic report and asserts synthetic raw secrets/private text are absent.

## Current Caveats

- P2-D comprehensive remediation removed L4-to-L2 imports and semantic/graph leaf L2 imports, leaving only recorded module-root exceptions. P2-E comprehensive remediation also removed L2/L4-to-L3 `workbenchLayout` imports and split the common shell `AppLayout` / update notification state into L2 commanders plus presentational L3 views.
- Graph visualization remains split behind explicit visualization. The business `GraphCanvas` chunk is now small (`12.93 kB` in the latest build), while the explicit-click 3D vendor chunk is `1,170.60 kB` / gzip `336.01 kB`; Vite no longer emits a chunk warning because the lazy 3D vendor budget is explicit.
- Rust crate naming has been normalized to `chatlog_ui_lib`; the previous non-snake-case crate warning is gone.
- Manual install, quit, reopen, unknown-port-conflict smoke, and real packaged diagnostics artifact review passed on Windows x64 with synthetic local data.
- Sidecar bind-address contract is local-only by default: `AGENTS.md`, code, productization contracts, and this evidence use `127.0.0.1:5030`.

## 2026-06-01 P2-E Comprehensive Remediation Evidence

| Area | Status | Evidence |
| --- | --- | --- |
| Baseline wording guard | Superseded | Earlier scan found only blocker/negative/planning mentions while T042 was still blocked. Later packaged smoke closure provided evidence and T042 is now checked. |
| Sidecar ownership hardening | Passed with manual caveat | Rust test `post_spawn_pid_tracking_only_claims_spawned_child` covers PID ownership after spawn. Manual packaged unknown-port smoke is still required. |
| Bind-address contract | Passed | Current guidance uses local-only `127.0.0.1:5030` across `AGENTS.md`, release runbook, local-backend contract, productization evidence, and `sidecar_args.rs`. Historical review/plan mentions of `0.0.0.0:5030` remain as past findings only. |
| L2/L3 boundary repair | Passed with staged debt | `workbenchLayout` moved to L2; `rg -n "@l3/|@/l3-molecule|l3-molecule" src/l2-coordinator src/l4-atom` returned no matches. Remaining L3 commander/store exceptions are listed in `architecture-boundary-check.md`. |
| Common shell split | Passed | `AppLayout.tsx` and `UpdateNotificationView.tsx` now receive state/actions as props. `useAppShellCommander()` and `useUpdateNotificationCommander()` own store/updater/navigation orchestration in L2. |
| Focused tokenization | Passed with staged debt | Release-visible L1/common shell files no longer use inline `style={{ ... }}`. Broader semantic/graph/setup legacy style cleanup remains staged debt and is not represented as a global tokenization pass. |
| Diagnostics privacy audit | Passed | JS diagnostics/masking tests and Rust generated report export test cover synthetic release-audit secrets, private message text, and local identity markers. Later packaged smoke exported and reviewed a real installed-app diagnostics artifact; see closure evidence below. |
| Graph performance decision | Passed | The heavy graph stack remains isolated behind explicit visualization. Later closure split the business `GraphCanvas` chunk from the 3D vendor chunk and removed the Vite warning; the explicit 3D vendor budget remains documented. |
| Final verification | Superseded | P2-E comprehensive target suite passed: 9 files / 38 tests. Later closure added Rust crate-name, graph chunk, sidecar path, app-exit cleanup, and packaged smoke fixes; final verification for those latest changes is recorded below. |
| UI smoke refresh | Passed with caveat | Project-local Playwright CLI was unavailable, so the remediation refresh used Chrome headless `--dump-dom` against Vite. `/` rendered setup center, `/settings` rendered settings shell, and `/workbench?codex-smoke=workbench-ready` rendered workbench shell. This does not replace manual packaged-app smoke. |

## 2026-06-01 P2-E Packaged Smoke Closure Evidence

| Area | Status | Evidence |
| --- | --- | --- |
| Rust crate warning | Passed | `[lib] name` changed to `chatlog_ui_lib` and `src-tauri/src/main.rs` now calls `chatlog_ui_lib::run()`. `cargo test` compiled without the previous `chatlogUI_lib` warning. |
| Graph chunk warning | Passed | `vite.config.ts` splits the explicit-click graph 3D stack into `vendor-graph-3d` and sets an explicit lazy 3D vendor budget. Latest `pnpm build` / `pnpm tauri build` output: `GraphCanvas-BbOodfRQ.js` 12.93 kB, `vendor-graph-3d-BU4W_903.js` 1,170.60 kB gzip 336.01 kB, no Vite chunk warning. |
| Packaged sidecar path | Passed | Real packaged smoke initially exposed `Failed to spawn sidecar: 系统找不到指定的路径 (os error 3)`. Root cause: Tauri copies `externalBin` into the install root as `chatlog_alpha.exe`; runtime `sidecar()` must use `chatlog_alpha`, not `binaries/chatlog_alpha`. After the fix, installed app launched from a redacted local app data path and `/health` returned `{"status":"ok"}`. |
| App-exit cleanup | Passed | Real packaged smoke initially left `chatlog_alpha.exe` listening after app close. `on_window_event(CloseRequested)` now calls `shutdown_sidecar_for_app_exit()`. Latest smoke: app close removed all `chatlog*` processes and no `5030` listener remained. |
| Install/open/reopen | Passed | Latest NSIS installer exited 0. Installed app opened without terminal, clean profile reached setup/config, synthetic saved config restored to the service page on reopen, and no automatic stale sidecar was left behind. |
| Unknown `5030` occupant | Passed | External PowerShell `TcpListener` PID `40776` occupied `127.0.0.1:5030`; installed app showed `5030 端口被其他进程占用。请关闭该进程或修改服务端口后再启动。`, did not spawn sidecar, and did not kill the unknown listener. |
| Packaged diagnostics artifact | Passed | UIA invoked the installed app's `导出诊断` button. `%TEMP%\chatlog_alpha_diagnostics.log` existed with 14 lines / 433 bytes; scan found no raw synthetic data key, no synthetic private text markers, and no full user profile path. `Data key` value was `present`, not raw. |
| Smoke cleanup | Passed | Smoke-created synthetic config and temp data/work directories were removed after evidence capture; no `chatlog*` process and no `5030` listener remained. |
| Final verification | Passed | `pnpm verify` passed: 62 files / 338 tests and build without chunk warnings. `cargo fmt --check` passed. `cargo test` passed: 20 tests. `pnpm tauri build` produced final MSI/NSIS artifacts. `git diff --check` returned no whitespace errors, only CRLF normalization warnings. |

## 2026-06-01 P2-E Visual QA, Accessibility, And Release Gate Evidence

| Area | Status | Evidence |
| --- | --- | --- |
| Privacy regression | Passed | `statsDisplay.test.ts` and `workbenchViewModel.test.ts` cover top sender visible name, avatar alt, fallback, and workbench toolbar title. Playwright privacy smoke showed `已隐藏会话`, `已隐藏联系人`, fallback `隐`, and no visible synthetic `Alice Private` or `Secret content`. |
| Drawer accessibility | Passed | `workbenchAccessibility.test.ts` covers dialog props, Escape, and focus restore helper. Playwright 390px smoke exposed `dialog "统计数据"`; Escape closed it and focus returned to the `统计` trigger. |
| Update notification accessibility | Passed | `updateNotificationViewModel.test.ts` covers visible states, dismissibility, bounded progress, ready, and error. Playwright dev-store smoke verified dialog semantics, initial focus, downloading progressbar `aria-valuenow=50`, ready install action, and error `role=alert`. |
| Setup/settings/dashboard visual smoke | Passed | Playwright CLI checked `/` and `/settings` at 1440px and 390px with `overflow=false`; `/dashboard?codex-smoke=workbench-ready` rendered the workbench compatibility path with `overflow=false`. |
| Graph explicit visualization | Passed | Graph summary/table loaded with `canvasBefore=0`; clicking `打开可视化` mounted one canvas, loaded the lazy GraphCanvas resource, and a canvas screenshot sample had `1556/1600` varied pixels. The latest build moves heavy 3D dependencies to the explicit `vendor-graph-3d` lazy chunk and emits no chunk warning. |
| Architecture/privacy scans | Passed | No matches for L1/L3 raw network, L4-to-L2 imports, L1/L3 `ai.phase`, or `dangerouslySetInnerHTML|AppleButton|GlassPanel` in L1/L3. Console logs remain only in known system/deferred/dev-console error paths. |
| Full frontend verification | Passed | `pnpm build` and `pnpm tauri build` output no chunk warnings after graph 3D vendor chunk budgeting. Final `pnpm verify` rerun is tracked in the closure/final verification rows. |
| Rust/Tauri verification | Passed | Final `cargo test` passed with 20 tests after normalizing the crate name and adding app-exit sidecar cleanup coverage. `pnpm tauri build` produced MSI and NSIS bundles without the previous crate-name warning. |
| Browser plugin attempt | Blocked | Browser plugin connection to the local app timed out, so P2-E UI evidence used Playwright CLI fallback against local Vite. |
| Manual Windows x64 smoke | Passed | Latest NSIS installer smoke covered install/open, clean profile, synthetic saved config reopen, app-managed sidecar health, packaged diagnostics export, quit cleanup, and unknown `5030` conflict. T042 is checked. |

## 2026-06-02 P4-D DB Explorer And API Runner Source/UI Evidence

This evidence is source/UI validation only. It does not replace the 2026-06-01 packaged Windows x64 release gate, P5-B persistent E2E, or P5-C packaged release rerun.

| Area | Status | Evidence |
| --- | --- | --- |
| Developer module entry | Passed | Workbench rail order now includes `developer` after SNS and before AI; mocked UI smoke opened the Developer Tools inspector at 1440x900 and 390x820. |
| DB Explorer | Passed | Mocked local sidecar returned DB files, tables, and table data. UI rendered DB Explorer, loaded table rows, and masked DB file names/values in privacy mode. |
| SQL guard | Passed | Targeted L4 tests prove mutation, multi-statement, empty, and unsupported SQL are blocked before network dispatch. UI smoke displayed the blocked mutation guard for `delete from MSG`. |
| Cache clear | Passed | Store and UI require explicit cache clear confirmation before calling `/api/v1/cache/clear`; no DB export surface was added. |
| API runner | Passed | Runner uses a fixed local-sidecar catalog and schema params; unknown endpoint and unknown parameter tests pass. UI smoke rendered redacted response preview and no raw path/header/body controls. |
| Privacy/diagnostics | Passed | Runner history stores only method, endpoint family, status, duration, parameter keys, and redaction flag. Diagnostic tests assert no raw SQL or response body enters HTTP diagnostic events. |
| UI acceptance | Passed | Vite + temporary mock `127.0.0.1:5030` checked privacy off/on at 1440x900 and 390x820. All four cases had no page-level horizontal overflow and no console/page errors. |
| Rust/Tauri scope | Not changed | P4-D did not modify Rust/Tauri code, CSP, capabilities, sidecar launch args, bundle config, or `chatlog_alpha` backend behavior. |

## 2026-06-03 P4-E Hook/MCP/Semantic Preview/Graph Residuals Source/UI Evidence

This evidence is source/UI validation only. It does not replace the 2026-06-01 packaged Windows x64 release gate, P5-B persistent E2E, or P5-C packaged release rerun.

| Area | Status | Evidence |
| --- | --- | --- |
| Hook/Hermes L4 contract | Passed | `hookAdapters.test.ts`, `fetchHook.test.ts`, and `hookStreamParser.test.ts` cover backend-shaped config/status/events/clear/Hermes responses, stream snapshot/event parsing, cancellation, and omission of post URLs, credentials, paths, raw identities, trigger content, and context bodies. |
| Hook/MCP L2 orchestration | Passed | `useHookStore.test.ts`, `useMcpStore.test.ts`, `hookViewModel.test.ts`, and `mcpViewModel.test.ts` cover bounded safe state, stream/clear lifecycle, privacy-safe labels, static local MCP route/tool/prompt inventory, and forbidden generic-client controls. |
| Semantic preview | Passed | `semanticPreviewAdapters.test.ts`, `fetchSemanticIndexPreview.test.ts`, `semanticPreviewViewModel.test.ts`, and `semanticPreviewDisplay.test.ts` cover index preview groups/items/outliers, `format=json`, pagination metadata, and masking/omission of `store_path`, identities, display names, and raw content. |
| Graph residuals | Passed | `graphResidualAdapters.test.ts` and `graphResidualViewModel.test.ts` cover graph config, business/event ingest summaries, QA redaction, and summary-only evidence/count output. Visible message ingest UI remains deferred by the P4-E privacy boundary. |
| Mocked browser acceptance | Passed | Vite `/workbench?codex-smoke=workbench-ready` was checked with synthetic local sidecar responses. Developer Hook stream listen/stop, Developer MCP inventory, AI Preview, and Graph Advanced passed at `1440x900` privacy off and `390x820` privacy on with no page-level horizontal overflow, no console/page errors, and no visible synthetic secret/private marker strings. |
| Rust/Tauri scope | Not changed | P4-E did not modify Rust/Tauri code, CSP, capabilities, sidecar launch args, bundle config, or `chatlog_alpha` backend behavior. |
| Final verification | Passed | After P4-E docs/evidence updates, `pnpm lint`, `pnpm typecheck`, `pnpm test` (81 files / 330 tests), `pnpm build`, and `pnpm verify` passed. Because the continuous working tree still contains earlier Tauri/CSP changes, `cargo test` also passed with 20 tests and `pnpm tauri build` produced MSI/NSIS bundles. This is not a packaged smoke rerun. |

## 2026-06-03 P5-A/B Planning Evidence Boundary

This historical planning boundary was recorded before P5-A/B implementation. At planning time it did not prove a runnable contract fixture runner, persistent browser E2E suite, visual regression suite, accessibility gate, packaged app smoke rerun, real sidecar artifact acquisition, updater signing, or release reproducibility. The later source/UI implementation evidence is recorded in the next section and still does not claim packaged release readiness.

| Area | Status | Evidence |
| --- | --- | --- |
| Contract fixture plan | Planning documented | The plan defines fixture validator, manifest, route map, adapter/fetcher contract tests, and privacy scanner requirements for P5-A. |
| Browser E2E/visual/a11y plan | Planning documented | The plan defines synthetic mock backend, Playwright route coverage, privacy leak checks, visual targets, and axe plus keyboard checks for P5-B. |
| Release boundary | Not release evidence | P5-C remains responsible for packaged sidecar smoke, real sidecar artifact reproducibility, updater signing, platform packaging, and release evidence automation. |

## 2026-06-03 P5-A/B Contract Fixtures, E2E, Visual, And A11y Source Evidence

This section records source/UI evidence only. It does not replace the 2026-06-01 packaged Windows x64 release gate, and it does not claim P5-C release readiness.

| Area | Status | Evidence |
| --- | --- | --- |
| Fixture validator | Passed | `pnpm fixtures:check` validates `fixture-manifest.json`, `route-map.json`, synthetic fixture JSON, route references, `/api/v1/db/tables` response shape, and forbidden private-data markers. |
| Mock backend | Passed | `e2e/mock-chatlog-server/server.mjs` binds `127.0.0.1`, serves deterministic JSON/SSE/media placeholders from synthetic fixtures, and fails on occupied `5030` rather than killing unknown listeners. |
| Browser E2E | Passed | `pnpm e2e` passed 9 tests covering workbench ready desktop/narrow, dashboard alias, settings, media/SNS, Developer DB/API/Hook/MCP, AI preview, Graph visualization with nonblank canvas, and privacy-on leak/overflow checks. |
| Visual regression | Passed | `pnpm e2e:update-snapshots` generated synthetic baselines and `pnpm e2e:visual` passed for desktop workbench, Developer Hook, Graph visualization, and narrow privacy state. |
| Accessibility | Passed | `pnpm e2e:a11y` passed axe critical/serious checks, keyboard reachability for rail/tabs/Hook stream/Graph explicit-load, and narrow privacy accessible-text scanning. |
| UI/a11y fixes | Passed | Graph panel layout now preserves a clickable visualization entry; smoke-only GraphCanvas readback enables nonblank canvas verification; light theme accent/muted/success/warning contrast tokens and Avatar fallback color were adjusted to satisfy a11y. |
| Final verification | Passed | `pnpm verify` passed after excluding Playwright specs from Vitest collection; `cargo test` passed 20 tests; `pnpm tauri build` produced MSI and NSIS bundles. This is build/package verification only, not install/open/quit/reopen packaged smoke. |
| Release boundary | Not release evidence | P5-C remains responsible for packaged install/open/quit/reopen, unknown-port packaged smoke, real sidecar artifact reproducibility, updater signing, and release evidence automation. |

## 2026-06-03 P5-C/D Release Guardrail Evidence

This section records implementation guardrails only. It does not claim a publish-ready release candidate.

| Area | Status | Evidence |
| --- | --- | --- |
| Sidecar artifact manifest | Guardrail passed | `scripts/release/sidecar-artifacts.json` declares target-specific binary names, current Windows inventory checksum, check-mode allowance for non-release targets, and Windows x64 release provenance through a pinned source ref plus checksum artifact. |
| Sidecar verifier | Guardrail passed | `scripts/verify-sidecar-artifacts.test.mjs` covers check-mode placeholder allowance, release-mode check-only rejection, approved source acceptance, checksum mismatch rejection, checksum evidence, HTTPS URL staging, and URL checksum mismatch rejection. Targeted tests passed: 7 tests. |
| `prepare-sidecar.sh` release hardening | Guardrail passed | The script invokes sidecar verifier before and after preparation, labels mode/target/destination/checksum, can stage pinned URL artifacts only in release mode after checksum verification, and keeps check-mode placeholders scoped to non-release. Step 10 release-mode Windows check passed and recorded SHA-256 `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af`; all-target release remains blocked until non-Windows provenance exists. |
| Updater manifest checker | Guardrail passed | `scripts/verify-updater-manifest.test.mjs` covers signed manifest acceptance, bundle-root `latest.json` discovery, manifest/artifact SHA-256 evidence, target-specific artifact requirements, missing generated `latest.json` messaging, missing platform rejection, empty signature rejection, `.sig` file-reference rejection, and artifact-name mismatch rejection. Targeted tests passed: 8 tests. |
| CI/CD gate ordering | Guardrail passed | `scripts/release-workflows.test.mjs` verifies `build-check.yml` listens to `master`, release matrix entries carry updater platform keys, updater manifest verification uses `--bundle-root src-tauri/target --required-platforms "${{ matrix.platform }}"`, and `release.yml` pins `tauri-apps/tauri-action@action-v0.6.2`. |
| Governance docs | Guardrail documented | `docs/release/sidecar-artifacts.md`, `docs/release/release-governance.md`, `docs/release/privacy-audit.md`, `specs/002-advanced-capabilities/acceptance-checklist.md`, and `CHANGELOG.md` now define release states, privacy audit, sidecar/updater gates, dashboard status, and versioning notes. |
| UI governance | Guardrail passed | Deprecated `AppleButton` and `GlassPanel` primitives were removed from the L4 UI barrel and source tree. Core L4 UI class composition now uses `classNames()`, and `scripts/ui-governance.test.mjs` prevents these legacy primitives and hand-built class joins from returning. |
| Source/UI gates rerun | Passed | `pnpm fixtures:check` passed for 48 route entries; `pnpm e2e` passed 10 tests; `pnpm e2e:visual` passed 2 tests; `pnpm e2e:a11y` passed 4 tests. |
| Full local verification | Passed | `pnpm verify` passed with 88 test files / 368 tests after switching Vitest to `--pool=threads` to avoid Windows fork-pool `spawn UNKNOWN`; production build succeeded. `cargo test` passed 20 Rust tests; `pnpm tauri build` produced MSI and NSIS bundles. |
| Release readiness | Blocked | Windows sidecar provenance is now verified for the scoped target. Generated updater `latest.json` evidence, installer-level packaged smoke, packaged diagnostics review, owner signoff, and macOS/Linux platform evidence remain incomplete. |

## 2026-06-03 P5-C/D Remaining Blockers Remediation Evidence

This section records local governance remediation only. It does not claim a publish-ready release candidate.

| Area | Status | Evidence |
| --- | --- | --- |
| Setup L3 boundary cleanup | Passed | Setup workflow molecules now receive state/actions through `SetupCenterView` from `useSetupCenterCommander`; they no longer import setup stores or commanders at runtime. |
| Architecture guard | Passed | `scripts/architecture-boundary.test.mjs` now has an empty runtime allowlist and fails on new runtime L3 imports from L2. Chat/search/setup/semantic/graph module roots now receive state/actions/privacy through L1/L2 props. Targeted run passed on 2026-06-03. |
| UI debt ledger | Passed with staged debt | `scripts/ui-governance.test.mjs` now tracks L3 `style={{...}}`, `.filter(Boolean).join`, and template `className` debt. Setup, search, and high-visibility semantic class composition/inline styling were migrated to CSS classes or native progress elements. Remaining 11 older debt entries are explicitly enumerated in the test and architecture checklist. |
| Historical guidance cleanup | Passed | `docs/总体开发规划.md` and `开发指南.md` now carry supersession notes and current examples for `Button`, `IconButton`, `Surface`, `StatusIndicator`, safe port inspection, and current release governance. |
| Platform decision | Passed with caveat | `docs/release/ready-desktop-app.md` marks macOS Intel, macOS Apple Silicon, and Linux x64 as `platform-caveat` for the first release until sidecar provenance and smoke/signing evidence exist. |
| Sidecar provenance decision | Superseded by Step 10 | Windows x64 now has release-mode evidence through `docs/release/sidecar-artifacts.md` and `scripts/release/sidecar-artifacts.json`; non-Windows targets remain blocked as platform caveats. |
| Updater metadata | Blocked | No generated signed `latest.json` exists under `src-tauri/target`; `pnpm release:check:updater` remains a release-candidate blocker until signing inputs and updater artifacts are generated. |
| Windows P4/P5 packaged smoke | Partially refreshed by Step 10 | Current direct release executable launch/quit/reopen smoke passed from a temporary profile. Installer-level install/uninstall, packaged unknown-port UI smoke, and packaged diagnostics export review remain blocked. |
| Privacy audit | Partially refreshed by Step 10 | Current source/browser/Rust privacy audit passed and is recorded in `docs/release/privacy-audit.md`. Generated updater metadata and current packaged diagnostics export review remain blocked. |

## 2026-06-08 Desktop Shell And Micro-Affordance Step 4 Evidence

This section records current source/UI, browser, and Rust-test evidence for the desktop shell and high-impact micro-affordance remediation slice only. It does not claim observed Tauri native window-click smoke, packaged installed-app smoke, sidecar provenance approval, updater signing, or release readiness.

| Area | Status | Evidence |
| --- | --- | --- |
| Focused source/governance | Passed | Window-control L4/L2 tests passed (2 files / 7 tests); shared `Tooltip`/`DisabledReason` tests passed (2 files / 9 tests); UI governance passed (1 file / 8 tests); high-impact workbench/graph/media/semantic/developer/diagnostics component suites passed (16 files / 37 tests). |
| Fixture and browser evidence | Passed | `pnpm fixtures:check` passed for 71 route entries; `pnpm e2e:a11y` passed 10 tests; `pnpm e2e` passed 17 tests; `pnpm e2e:visual` passed 2 tests. A first cold `pnpm e2e:a11y` run exposed graph-canvas visibility timeouts; focused diagnosis showed the canvas mounted with valid computed size, and the original graph-focused tests plus final full a11y run passed without production code changes. |
| Full source/UI verification | Passed | `pnpm verify` passed, including `pnpm lint`, `pnpm typecheck`, `pnpm test` (121 test files / 499 tests), and `pnpm build` production output. |
| Rust/native lifecycle tests | Passed | `cd src-tauri && cargo test` passed 20 tests, including sidecar shutdown/redaction/probe/config tests. |
| Native Tauri window-click smoke | Not run | No observed `pnpm tauri dev` click smoke was completed for minimize, maximize/restore, close, titlebar drag/no-drag behavior, or native sidecar cleanup in a real Tauri window. `P0-05` must remain open until this evidence exists. |
| Packaged/release evidence | Not run | No current packaged install/open/quit/reopen smoke, unknown-port smoke, sidecar provenance approval, updater metadata verification, or release privacy audit was completed in this Step 4 execution. |

## 2026-05-31 P2-D AI And Graph Evidence

| Area | Status | Evidence |
| --- | --- | --- |
| Semantic REST adapters | Passed | `semanticAdapters.test.ts` and `semanticFetchers.test.ts` cover flat snake_case config, credential flags, config save payloads, index status/actions, search, topics, profiles, QA request payload, and `format=json` REST behavior. |
| Semantic SSE/QA | Passed | `sseParser.test.ts` and `streamQA.test.ts` cover named `delta/done/error` events, split chunks, multi-line data, unknown events, QA request body shape, stop/cancel handling, failed state, empty answer state, and no `dangerouslySetInnerHTML`. |
| Semantic optional state | Passed | `semanticViewModel.test.ts`, `StatusBar` compact semantic state, and workbench navigation keep missing provider/index failures scoped to AI while chat/search/stats remain reachable. |
| Semantic privacy | Passed | `semanticDisplay.test.ts`; QA messages, semantic search sender/snippet, topics, and profile summaries use privacy masking. |
| Graph REST adapters | Passed | `graphAdapters.test.ts` and `graphFetchers.test.ts` cover status, query, timeline, actions, loaded/empty/malformed/oversized visualization payloads, and capped `limit=300` behavior. |
| Graph module containment | Passed | `graphViewModel.test.ts`, `graphDisplay.test.ts`, and browser UI acceptance show summary/table is default, graph failures are optional, labels/tooltips/timeline are privacy-safe, and no canvas mounts before explicit visualization. |
| Graph 3D boundary | Superseded | Historical P2-D build produced a >500 kB lazy `GraphCanvas` warning. Later P2-E closure split the business canvas from `vendor-graph-3d` and removed the Vite warning. |
| Workbench navigation | Passed | `workbenchViewModel.test.ts`, `workbenchLayout.test.ts`, and Playwright UI acceptance cover rail/toolbutton module entry states, leave/cancel behavior, graph drawer recovery at 390px, and no page-level horizontal overflow. |
| Verification | Passed | Final `pnpm verify` passed on 2026-05-31, including `pnpm lint`, `pnpm typecheck`, `pnpm test` (56 files / 318 tests), and `pnpm build`. |
| Browser UI acceptance | Passed | Local Vite `http://127.0.0.1:5173/workbench` with mocked local backend: desktop semantic search/profile/settings and graph visualization passed; graph summary had `canvasBefore=0`, click visualize mounted one nonblank visible canvas; 390px graph drawer had no page horizontal overflow and no canvas before visualization. |

## 2026-05-31 P2-D Comprehensive Remediation Evidence

| Area | Status | Evidence |
| --- | --- | --- |
| Real semantic contract fixtures | Passed | `semanticAdapters.test.ts` and `semanticFetchers.test.ts` now use backend-shaped `talker/talker_name/sender/sender_name/seq/time`, `rerank_*`, `profiles`, and array `type_distribution` fixtures. |
| Semantic UI state and privacy | Passed | `semanticDisplay.test.ts`; search, topics, profile, QA leaf components receive props from `AiPanel`, expose empty/error/retry states, and mask display text in privacy mode. |
| Graph L3 boundary | Superseded | Historical P2-D evidence: `GraphModule.tsx` was the only graph L3 file importing L2. Later P5-C/D remediation moved graph commander access out of L3 runtime imports; `GraphModule` now receives graph state/actions through props. |
| L4 independence | Passed | `rg -n "@l2|l2-coordinator" src/l4-atom` returned no matches after moving system raw types and semantic SSE parsing/types into L4. |
| Architecture audit | Superseded | Historical P2-D evidence recorded only `AiPanel.tsx`/`GraphModule.tsx` module-root L2 exceptions. Later P5-C/D remediation made the runtime L3-to-L2 allowlist empty; see `architecture-boundary-check.md`. |
| Privacy/diagnostics scan | Passed with caveats | `dangerouslySetInnerHTML|AppleButton|AnimatePresence|motion.div` scan returned no semantic/graph hits; secret-pattern scan hits are synthetic tests, placeholder `wxid_synthetic_xxx`, form field names, adapter field names, or redaction denylist/test cases. No generated diagnostic package was produced in this run. |
| Targeted tests | Passed | 13 P2-D target test files passed; 57 tests covered semantic adapters/fetchers/SSE/view-model/display, graph adapters/fetchers/view-model/display/layout, and workbench view-model. |
| Full frontend verification | Passed | `pnpm verify` passed; 56 test files and 318 tests passed; production build completed. |
| Browser UI acceptance | Passed | Playwright with mocked local backend: 1440px semantic search/profile/settings and graph explicit visualization passed; 390px graph drawer overflow was <= 1px. Desktop canvas bbox was >200x200 and data URL length >1000; 390px canvas bbox was >180x180. |
| Rust/Tauri verification | Superseded | Historical P2-D `cargo test` / `pnpm tauri build` passed with an existing crate-name warning. Later P2-E closure renamed the crate to `chatlog_ui_lib` and removed the warning. |
| Graph chunk evidence | Superseded | Historical P2-D build had `GraphCanvas-umhRW2Aj.js` at 1,034.92 kB gzip 292.62 kB. Later P2-E closure moved heavy dependencies to `vendor-graph-3d` and removed the Vite warning. |

## 2026-06-01 Suggested Fix Recheck Evidence

| Area | Status | Evidence |
| --- | --- | --- |
| Semantic module state rendering | Passed | Added `checking_config` to `deriveSemanticModuleView()` and routed `useAiCommander` module/compact views through it. `rg -n "ai\.phase" src/l3-molecule src/l1-entry` returned no matches. |
| L1 readiness boundary | Passed | `SetupCenterView.tsx` now uses `useSetupCenterCommander`; `WorkbenchShellView.tsx` now uses `useWorkbenchShellCommander`. `rg -n "use[A-Za-z]+Store|zustand|localStorage|sessionStorage|useSetupCommander|useAppStore|useSetupStore" src/l1-entry` returned no matches. |
| Dev browser smoke entry | Passed | `http://127.0.0.1:5173/workbench?codex-smoke=workbench-ready` entered the workbench without showing setup/db gate text in headless Chrome. The override is guarded by `import.meta.env.DEV`. |
| UI smoke | Passed | Headless Chrome checked `/workbench?codex-smoke=workbench-ready` and `/` at 1440px and 390px. Workbench controls rendered, graph panel opened, setup center rendered, and page-level horizontal overflow was false in all checks. |
| Frontend verification | Superseded | Historical suggested-fix `pnpm verify` passed with the old lazy `GraphCanvas` chunk warning. Later P2-E closure split graph vendor code and removed the warning. |

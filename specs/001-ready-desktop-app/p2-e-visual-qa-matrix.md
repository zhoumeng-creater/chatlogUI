# P2-E Visual QA Matrix

This matrix records redaction-safe P2-E visual, accessibility, privacy, graph, and release-gate evidence. Do not paste raw `dataKey`, API keys, tokens, private chat text, real contact names, or full private local paths.

## Evidence Status Legend

- `Pending`: not checked in this P2-E implementation session yet.
- `Passed`: checked with redaction-safe evidence.
- `Passed with caveat`: automated checks passed, but a related manual artifact or state remains unverified.
- `Blocked`: cannot be completed without missing local/manual input.
- `Follow-up`: known non-blocking debt recorded for a later task.

## Matrix

| Route/surface | State | Width/theme | Privacy mode | Keyboard path | Expected result | Evidence status | Notes/blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` setup center | clean profile | 1440/390, light | off/on | Basic nav/render smoke | Setup surface rendered with no page-level horizontal overflow | Passed | Playwright CLI with mocked `/health` and `/api/v1/db`: width 1440 and 390, `overflow=false`, setup text present |
| `/` setup center | missing path | 1440/390 | off/on | Path picker reachable | Missing data path is an empty/setup state, not a crash | Pending | State-specific setup fixture not exercised in P2-E automation |
| `/` setup center | invalid path | 1440/390 | off/on | Retry/choose path reachable | Validation error is recoverable and redaction-safe | Pending | State-specific setup fixture not exercised in P2-E automation |
| `/` setup center | backend starting | 1440/390 | off/on | Controls remain reachable | Loading state is visible with non-color-only status | Passed | Packaged synthetic config smoke restored service controls and app-managed sidecar start reached `/health` |
| `/` setup center | backend ready | 1440/390 | off/on | Enter workbench reachable | Ready state leads to workbench | Passed | Dev workbench smoke route entered `/workbench?codex-smoke=workbench-ready` without setup gate |
| `/` setup center | backend conflict | 1440/390 | off/on | Conflict action reachable | Unknown `5030` occupant is recoverable and not force-killed | Passed | Real packaged app with external PowerShell listener on `127.0.0.1:5030` showed recoverable conflict text and left the listener alive |
| `/workbench?codex-smoke=workbench-ready` | chat | 1440/390, light | off/on | Rail/list/detail reachable | Chat layout has no page horizontal overflow and privacy labels match visible text | Passed | Synthetic `Alice Private` fixture masked to `***** *******`; toolbar became `已隐藏会话`; `overflow=false` at 1440/390 |
| `/workbench?codex-smoke=workbench-ready` | search | 1440/390 | off/on | Search input/results reachable | Search controls render and scope label follows privacy mode | Passed | Global search scope changed from raw conversation name to masked text under privacy mode |
| `/workbench?codex-smoke=workbench-ready` | stats | 1440/390 | off/on | Stats module reachable | Aggregate stats remain visible; sender identities are masked when privacy is on | Passed | Top sender visible text `已隐藏联系人`, fallback `隐`, counts `1`/`3` remained visible |
| `/workbench?codex-smoke=workbench-ready` | semantic | 1440/390 | off/on | AI module reachable, stream stop reachable | Missing config/index/QA states do not block core workbench | Passed | Existing P2-D/suggested-fix evidence remains valid; P2-E scans show no `ai.phase` in L1/L3 |
| `/workbench?codex-smoke=workbench-ready` | graph summary | 1440/390 | on | Graph module reachable | Summary/table renders without mounting canvas by default | Passed | 390 drawer graph summary: `canvasBefore=0`, `overflow=false`, table labels masked |
| `/workbench?codex-smoke=workbench-ready` | graph explicit visualization | 390 | on | Visualization action reachable, close/Escape recoverable | Canvas appears only after explicit action and is visible/nonblank | Passed | Click `打开可视化`: `canvasAfter=1`, bbox `315x278`, lazy GraphCanvas resource loaded, screenshot sample `1556/1600` varied pixels |
| `/workbench` | real setup/db gate | 1440/390 | off/on | Setup action reachable | Gate is driven by L2 readiness state and does not expose private data | Passed | P2-D suggested-fix evidence plus architecture scan: L1 store reads absent; P2-E did not rerun real sidecar gate |
| `/dashboard` | alias behavior | 1440 | off/on | Navigation remains usable | Alias reaches the workbench compatibility wrapper without duplicate logic | Passed | `/dashboard?codex-smoke=workbench-ready`: path `/dashboard`, workbench text present, `overflow=false` |
| `/settings` | data settings | 1440/390 | off/on | Category nav/forms/buttons reachable | Validation/save/error states are visible and paths are redacted when needed | Passed | Basic route smoke at 1440/390: settings text present, `overflow=false`; state-specific validation remains covered by P2-C tests |
| `/settings` | AI model settings | 1440/390 | off/on | Credential fields reachable | Saved credentials are not echoed raw | Passed | Existing P2-C settings validation/credential evidence remains valid; P2-E route smoke passed |
| `/settings` | appearance/privacy | 1440/390 | off/on | Toggle reachable | Privacy state applies to private visible and accessibility surfaces | Passed | Workbench privacy toggle verified across toolbar, chat, search, stats, graph and update surfaces |
| `/settings` | diagnostics/about | 1440/390 | off/on | Export/check update reachable | Diagnostics are user-triggered and redacted; update caveats are honest | Passed | JS diagnostics/masking tests, Rust generated report export test, and real packaged diagnostics artifact review passed with no raw synthetic key/private text/full user path leakage |
| Update notification | available | 390 | on | Dialog/buttons reachable | Dialog has role/name, initial focus, Escape behavior where dismissible | Passed | Dev store injection: dialog `发现新版本 v9.9.9`, `aria-modal=true`, initial focus on `稍后提醒` |
| Update notification | downloading | 390 | on | Progress exposed | Progressbar semantics expose current value and status text | Passed | Progressbar `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow=50`, text `512 B / 1.0 KB` |
| Update notification | ready | 390 | on | Install reachable | Ready dialog is non-progress, primary action visible | Passed | Dev store injection: title `下载完成`, dialog semantics present, `安装并重启` visible |
| Update notification | error | 390 | on | Retry/dismiss reachable | Error is not color-only and remains keyboard reachable | Passed | Dev store injection: title `更新失败`, `role=alert`, `重试` and `稍后提醒` visible |
| Workbench drawer | open/close | 390 | on | Open trigger, close button, Escape, focus restore | Overlay drawer has dialog-like semantics and recoverable focus behavior | Passed | Stats drawer snapshot exposed `dialog "统计数据"`; Escape closed it and focus returned to `统计`; `overflow=false` |
| Dev console/diagnostics | empty logs | 1440/390 | on | Export controls reachable | Empty state is clear and no private content appears | Follow-up | Not re-exercised in P2-E browser session; P2-C diagnostics tests remain passing |
| Dev console/diagnostics | redacted logs | 1440/390 | on | Export controls reachable | Redaction prevents raw keys, tokens, private identities, and full paths | Passed | `diagnostics.test.ts`, `maskSecrets.test.ts`, Rust generated report export test, and packaged diagnostics artifact review pass with synthetic secrets/private text absent |
| Dev console/diagnostics | export success/failure | 1440/390 | on | Export/retry reachable | Export is user-triggered and fail-closed on redaction failure | Passed | Rust fail-closed export tests pass; installed app `导出诊断` created `%TEMP%\chatlog_alpha_diagnostics.log` and redaction scan passed |
| Windows x64 package | build artifacts | release build | n/a | `pnpm tauri build` | MSI and NSIS x64 bundles are produced | Passed | 2026-06-01 build produced MSI and NSIS bundles under `src-tauri/target/release/bundle/` |
| Windows x64 package | install/open/quit/reopen | packaged app | on | Native app flow | App opens without terminal, sidecar health works, quit cleans sidecar, reopen restores | Passed | Latest NSIS smoke: install exit 0, clean profile setup, synthetic saved config service restore, `/health` ok, app close removed sidecar, reopen showed service controls |
| Windows x64 package | unknown `5030` conflict | packaged app | on | Conflict recovery reachable | App reports conflict and does not kill unknown listener | Passed | External PowerShell `TcpListener` PID `40776` owned `5030`; app showed conflict and left listener alive until smoke cleanup |

## 2026-06-01 Automated Evidence

- Targeted P2-E tests: `pnpm test src\l3-molecule\stats\statsDisplay.test.ts src\l3-molecule\chat\conversationDisplay.test.ts src\l2-coordinator\commander\workbenchViewModel.test.ts src\l3-molecule\workbench\workbenchAccessibility.test.ts src\l3-molecule\common\updateNotificationViewModel.test.ts` passed: 8 files / 48 tests.
- P2-E comprehensive remediation targeted tests: app shell view model, update notification view model, workbench layout/view model, diagnostics masking, and workbench accessibility passed: 9 files / 38 tests.
- Full frontend verification: final `pnpm verify` passed: 62 files / 338 tests; latest `pnpm build` and `pnpm tauri build` output no chunk warnings after graph 3D vendor chunk budgeting.
- Rust/Tauri verification: final `cargo test` passed: 20 tests, including sidecar PID ownership, app-exit cleanup, sidecar basename, and diagnostics export redaction tests. `cargo fmt --check` and `pnpm tauri build` passed without the previous crate-name warning.
- Static scans: no L1/L3 raw network hits, no L4-to-L2 hits, no L1/L3 `ai.phase` hits, and no `dangerouslySetInnerHTML`, `AppleButton`, or `GlassPanel` hits in L1/L3.
- Additional P2-E comprehensive scans: no L2/L4-to-L3 dependency hits, and focused L1/common shell tokenization scans returned no inline style hits in remediated files.
- Browser note: the Browser plugin timed out when opening the local app, so UI evidence used Playwright CLI against `http://127.0.0.1:5173` with synthetic mocked backend responses.
- P2-E comprehensive remediation UI refresh: project-local Playwright CLI was unavailable, so Chrome headless `--dump-dom` checked `/`, `/settings`, and `/workbench?codex-smoke=workbench-ready` against Vite. The smoke confirmed setup center, settings shell, and workbench shell render after the shell/layout refactor; it does not replace the manual packaged-app smoke.
- P2-E packaged-app smoke closure: latest NSIS installer, installed app launch, synthetic sidecar health, diagnostics export, quit cleanup, reopen, unknown `5030` conflict, and smoke cleanup all passed on Windows x64. Smoke used synthetic local data and did not include real private chat content.

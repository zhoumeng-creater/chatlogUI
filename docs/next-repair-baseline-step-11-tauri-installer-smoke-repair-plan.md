# 第十一步：Tauri / 安装包 smoke 修复计划

计划性质：Tauri 与安装包 smoke 证据闭环计划。本文只写验收范围、运行顺序、证据字段、失败分级、文件边界、验证命令、隐私审计和提交推送节奏；不放完整生产代码，不把脚本片段当成实现方案。

## 1. 目标结论

第十一步承接第十步的全局验收结论：当前 `codex/next-repair-baseline` 的 source/UI/browser/Rust/package build 已经具备较强证据，但 release publish 仍然不能标绿。剩余缺口集中在真实 Tauri/安装包层面，而不是普通页面功能重构。

本步骤要完成的目标是：

| 目标 | 说明 |
| --- | --- |
| 当前候选冻结 | 明确本轮 smoke 的 branch、commit、app version、package artifact、sidecar checksum、operator、环境和时间。 |
| Tauri dev 补证 | 在真实 Tauri 窗口中复核 window controls、drag/no-drag、close cleanup、sidecar health 和 privacy/log 边界。 |
| Windows x64 安装包 smoke | 对当前 MSI/NSIS 或 release exe 执行 install/open/quit/reopen/uninstall 或等价可审计路径。 |
| packaged unknown-port smoke | 用未知进程占用 `127.0.0.1:5030`，验证应用显示可恢复冲突且不杀未知进程。 |
| packaged diagnostics audit | 从当前 packaged app 用户触发导出诊断，扫描导出文件、可见文案、日志和证据记录是否脱敏。 |
| updater/release metadata 决策 | 若 release 启用 updater，生成并验证签名 `latest.json`；若本候选不启用 updater，必须写明 policy，而不是忽略失败。 |
| release go/no-go | 把 Windows x64、macOS/Linux caveat、owner signoff、阻塞项和下一步写进 release evidence。 |

第十一步完成后，必须能回答：

- 当前安装包是否能由普通用户无终端启动、退出并重开。
- app-managed sidecar 是否能启动、`/health` 成功、退出清理。
- 未知 `5030` 占用是否被保护为可恢复冲突，而不是被自动结束。
- packaged diagnostics 是否能用户触发、脱敏、失败时 fail-closed。
- updater 元数据到底是已签名通过、明确 disabled，还是 release-blocked。
- 哪些证据是 Tauri dev，哪些是 packaged smoke，哪些只是 source/browser/Rust。

## 2. 参考输入与当前事实

| 输入 | 本计划使用方式 |
| --- | --- |
| `docs/next-repair-baseline-overall-repair-plan.md` | 上位修复路线；第十一步是阶段 10 的安装包证据闭环补充。 |
| `docs/next-repair-baseline-step-10-global-acceptance-repair-plan.md` | 第十步已定义全局验收、Tauri/package smoke 和 release gate 的总要求。 |
| `docs/next-repair-baseline-step-10-global-acceptance-evidence.md` | 当前 source/UI/Tauri dev/package build 证据和 release no-go 原因。 |
| `docs/next-repair-baseline-ux-ledger.md` | P0-04 当前状态：source/browser/Tauri-dev accepted，release publish 仍 blocked。 |
| `docs/next-repair-baseline-inspector-architecture.md` | 当前架构 source/UI 已接受；剩余是 release evidence，不应无故重开 Workbench 架构。 |
| `ux-micro-affordance-opportunities.md` | window controls、tooltip、disabled reason、safe-open、diagnostics export 的烟测观察项。 |
| `docs/product-acceptance-standards.md` | 验收主合同：不能用构建通过替代安装包通过；证据必须区分 source/UI、mock browser、packaged smoke、signed release。 |
| `docs/ui-development-standards.md` | Tauri window controls、诊断导出、安全确认、disabled reason 和窄屏 shell 的 UI 检查依据。 |
| `docs/release/ready-desktop-app.md` | 当前 release dashboard 和 Windows x64 smoke checklist。 |
| `docs/release/release-governance.md` | release gate：source/UI、Rust/Tauri、sidecar/updater、privacy audit、platform smoke、owner signoff。 |
| `docs/release/privacy-audit.md` | 当前 privacy audit 仍缺 generated updater metadata 和 packaged diagnostics artifact review。 |
| `docs/release/sidecar-artifacts.md` | Windows x64 sidecar provenance 已通过；非 Windows 仍为 platform caveat。 |
| `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/*` | ready desktop app 的 installable release、local backend、diagnostics package 和 test-data policy 合同。 |
| `docs/总体开发规划.md`、`开发指南.md` | 历史愿景；只采用与当前 AGENTS/release runbook 不冲突的四层架构、sidecar 生命周期和交付目标。早期端口猎杀说法已被当前安全端口归属策略取代。 |
| 当前代码 | `src-tauri/`、L4 system atoms、release scripts、package scripts 是 smoke 失败时的边界依据。 |

### 2.1 当前可依赖事实

| 区域 | 当前事实 |
| --- | --- |
| Branch | 当前修复分支为 `codex/next-repair-baseline`，不是 `master`。 |
| Source/UI | 第十步后 `pnpm fixtures:check`、governance、`pnpm e2e`、`pnpm e2e:a11y`、`pnpm e2e:visual`、`pnpm verify` 已通过。 |
| Rust/Tauri tests | `cd src-tauri && cargo test` 已通过，覆盖 sidecar ownership、unknown process classification、config/diagnostics redaction 等。 |
| Package build | `pnpm tauri build` 已产出 Windows x64 MSI/NSIS artifacts。 |
| Sidecar provenance | `pnpm release:check:sidecar:release` 已通过 Windows x64 target，sidecar SHA-256 已记录。 |
| Tauri dev | 第十步用临时 `127.0.0.1:5174` dev config 证明真实 Tauri window start/close 无残留；默认 `5173` 当时被既有 Vite 进程占用。 |
| Packaged executable | 第十步仅证明 release exe clean-profile launch/quit/reopen 的部分路径；没有宣称 installer-level install/uninstall 通过。 |
| Release blocker | signed updater metadata、installer-level smoke、packaged unknown-port UI smoke、packaged diagnostics review、owner signoff 仍未完成。 |

### 2.2 不能直接标绿的边界

| 边界 | 原因 |
| --- | --- |
| Installer install/uninstall | `pnpm tauri build` 只证明 bundle 产出，不能证明安装器在用户机器上完成安装、快捷方式、卸载和清理。 |
| Packaged unknown-port UI | Rust unit test 证明端口分类，不能证明安装包 UI 在未知占用下显示正确 recovery copy 且不杀进程。 |
| Packaged diagnostics artifact | Rust/browser/source 测试证明 redaction contract，不能替代当前 packaged app 真实导出的文件扫描。 |
| Updater release gate | `createUpdaterArtifacts` 当前 false；`release:check:updater` 缺 `latest.json` 失败时，必须保持 release-blocked 或写明 updater-disabled release policy。 |
| macOS/Linux | 当前首发目标是 Windows x64；未签名、公证、sidecar provenance 和 runtime smoke 前不能写成全平台 ready。 |

## 3. 用户视角五问

| 问题 | 第十一步答案 |
| --- | --- |
| 这个步骤帮用户完成什么真实任务？ | 验证用户拿到安装包后能像普通桌面应用一样安装、启动、退出、重开、处理端口冲突并导出安全诊断。 |
| 第一次看到应用应先做什么？ | 双击安装后启动应用，看到 Setup 或已保存配置恢复状态；不需要打开终端、不需要手工启动 `chatlog_alpha`。 |
| 同一任务是否有重复入口？ | 安装包 smoke 只验证当前 packaged app 的真实入口；不会把 Vite browser、Tauri dev 和 installed app 证据混为同一入口。 |
| 出错或后悔时能否恢复？ | 端口占用、sidecar 启动失败、DB 未就绪、诊断导出失败、updater metadata 缺失都必须写成可恢复状态或 release blocker。 |
| 是否因为相邻功能缺失而像坏了？ | 如果 updater 签名、owner signoff、macOS/Linux smoke 不在本轮范围，必须明确 caveat；不能让用户或 reviewer 误以为 release 已完整。 |

## 4. 非目标

- 不重新实现第 1-10 步已经通过的 source/UI/global acceptance。
- 不改变 `chatlog_alpha` 后端 API 或 sidecar contract。
- 不为通过 smoke 而杀掉未知 `5030` 占用进程。
- 不手写 `latest.json` 或伪造签名/updater metadata。
- 不扩大 Tauri CSP、capabilities、shell permissions，除非 smoke 复现出必须修复的阻塞，并在 release evidence 中解释。
- 不提交 `.env`、日志、真实聊天数据、sidecar binaries、安装包、`dist/`、`src-tauri/target/`、screenshots with real data 或本地 scratch planning files。
- 不在本计划里粘贴完整脚本或生产代码。未来若需要自动化 smoke 脚本，单独以测试先行的小提交实现。

## 5. Smoke 证据分级

| 等级 | 含义 | 第十一步使用方式 |
| --- | --- | --- |
| `S1 Source/Rust` | 源码、Vitest、Rust tests、governance 通过。 | 作为进入 smoke 前的前置门槛，不替代安装包。 |
| `T1 Tauri dev` | `pnpm tauri dev` 真实窗口运行并观察窗口/sidecar 行为。 | 验证 desktop shell 与 Tauri API 行为；不能替代 installed app。 |
| `P1 Packaged exe smoke` | 当前 release exe 或 bundle 内 app 直接启动、退出、重开通过。 | 可证明部分 packaged runtime；不等同于 installer install/uninstall。 |
| `P2 Installer smoke` | 当前 MSI/NSIS 安装器 install/open/quit/reopen/uninstall 或等价安装路径通过。 | Windows x64 release candidate 的关键证据。 |
| `P3 Packaged conflict/diagnostics` | installed packaged app 下端口冲突、sidecar health、diagnostics export、privacy scan 通过。 | 关闭 Step 10 剩余 P0/P1 release blocker 的核心证据。 |
| `R1 Release artifact` | sidecar provenance、updater metadata、checksums、privacy audit、owner signoff 完整。 | 支撑 release candidate 或 publish 决策。 |

任何项只有 `S1` 或历史证据时，状态必须写 `needs-packaged-smoke`、`release-blocked` 或 `platform-caveat`，不能写 `pass`。

## 6. Smoke 契约

### 6.1 Tauri dev 契约

| 场景 | 验收要求 |
| --- | --- |
| 启动 | `pnpm tauri dev` 在当前分支打开真实窗口；若默认 `5173` 被占用，记录占用原因和临时端口策略。 |
| Window controls | 最小化、最大化/还原、关闭按钮真实调用 Tauri window API；按钮 no-drag，标题区可拖拽。 |
| Setup/Workbench/Settings | 至少覆盖 `/`、ready workbench、`/settings` 的 window controls 可见、不遮挡主任务、不泄露 raw endpoint。 |
| Sidecar health | app-managed sidecar 启动后 `/health` 成功；DB readiness 与 HTTP health 不混淆。 |
| 退出清理 | 关闭窗口后 app-managed sidecar 清理；没有残留 `chatlogUI` / `chatlog_alpha` 进程或 `5030` listener。 |
| 日志隐私 | Tauri log、sidecar log、console 不含 raw `dataKey`、API key、token、private content、unrestricted local path。 |

### 6.2 Windows x64 installer smoke 契约

| 场景 | 验收要求 |
| --- | --- |
| Artifact inventory | 记录 MSI/NSIS/release exe 路径、大小、SHA-256、生成时间、branch、commit、app version。 |
| Clean install | 在可控测试用户/profile 下运行当前 installer；安装完成有应用可启动入口。 |
| Clean launch | 无终端启动 packaged app；clean profile 到 Setup 或可解释状态；无自动遥测/无私密路径显示。 |
| Saved config reopen | 使用 synthetic config 或测试配置保存后关闭重开，恢复 service/setup 状态。 |
| Sidecar start | 在 managed mode 下点击启动服务或等价路径，`/health` 返回成功；用户能看到 service ready 与 DB ready 的区别。 |
| Quit cleanup | 关闭 app 后 app-managed sidecar 被清理；不留下 `5030` listener。 |
| Reopen | 重新打开后不会因为旧 sidecar 或旧状态进入坏页面。 |
| Uninstall/cleanup | 若执行安装器卸载，记录卸载结果、残留进程、残留 listener 和是否保留用户配置的策略。 |
| Privacy | 安装路径、日志路径、诊断导出路径只在证据中使用安全摘要；不写入真实用户路径。 |

### 6.3 Packaged unknown-port 契约

| 场景 | 验收要求 |
| --- | --- |
| Unknown listener setup | 用明确 smoke 创建的未知进程占用 `127.0.0.1:5030`，记录 PID 和进程名但不记录私密路径。 |
| App behavior | packaged app 进入可恢复端口冲突状态，说明服务端口被其他进程占用。 |
| Safety | 应用不得杀掉未知进程；unknown listener 在 smoke 结束前仍存活。 |
| Recovery | 用户能关闭未知 listener 后重试；重试进入 free/managed/startable 状态。 |
| Evidence | 记录端口检查、UI 文案摘要、listener survival、cleanup 结果。 |

### 6.4 Packaged diagnostics 契约

| 场景 | 验收要求 |
| --- | --- |
| User-triggered only | 只有用户点击导出/复制诊断后才生成文件或剪贴板内容。 |
| Redaction status | UI 显示脱敏成功或 fail-closed 错误；不能静默导出不安全内容。 |
| File scan | 生成的 diagnostics artifact 扫描 raw `dataKey`、API key、token、secret、private message、`wxid`、完整用户路径等 forbidden markers。 |
| Evidence scan | release evidence、privacy audit、PR body 或提交说明不得粘贴真实路径、真实消息或 signing secrets。 |
| Cleanup | smoke 结束后清理 smoke 生成的诊断文件，或记录保留位置为安全摘要。 |

### 6.5 Updater/release metadata 契约

| 场景 | 验收要求 |
| --- | --- |
| Updater enabled | 使用 release workflow 或本地签名环境生成 Tauri updater artifacts；`pnpm release:check:updater` 通过并记录 `latest.json` SHA-256 与 artifact SHA-256。 |
| Updater disabled for candidate | release evidence 明确本候选不发布 updater metadata，记录 `VITE_ENABLE_UPDATER` / release policy / 用户可见影响。 |
| Missing signing key | 如果 `TAURI_SIGNING_PRIVATE_KEY` 不存在，状态为 `release-blocked` 或 `needs-signer`，不能写成通过。 |
| Safety | 不手写 manifest、不提交 signing private key、不把签名内容之外的 secret 写入 docs。 |

## 7. 推荐实现任务

### Task 1：候选冻结与证据模板刷新

目标：在开始 smoke 前冻结当前候选，避免后续证据不知道对应哪个 commit/package。

文件范围：

| 文件 | 责任 |
| --- | --- |
| `docs/next-repair-baseline-step-11-tauri-installer-smoke-evidence.md` | 若执行 Step 11，新增当前候选 smoke evidence 报告。 |
| `docs/release/ready-desktop-app.md` | 更新 release dashboard 的 Windows x64 smoke 状态。 |
| `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/release-evidence.md` | 记录 canonical release evidence。 |
| `docs/release/privacy-audit.md` | 记录当前 packaged diagnostics/updater privacy 审计状态。 |
| `progress.md` | ignored scratch 记录，不提交。 |

验收：

- 记录 branch、commit、app version、operator、Windows version、package artifact 路径和 SHA-256。
- 明确哪些证据来自第十步，哪些要在第十一步刷新。
- 不写真实用户路径、真实聊天内容或签名密钥。

建议提交：`冻结安装包smoke候选`。文档扫描通过后立即提交并推送。

### Task 2：Tauri dev smoke 复核

目标：在进入安装包前排除明显 Tauri shell 和 sidecar 生命周期问题。

检查项：

| 项 | 验收 |
| --- | --- |
| Dev window | `pnpm tauri dev` 打开真实窗口。 |
| Window controls | minimize、maximize/restore、close 都有真实 Tauri 行为。 |
| Shell routes | Setup、Workbench、Settings 至少各一次窗口控件和布局检查。 |
| Sidecar | managed start、`/health`、close cleanup。 |
| Privacy/logs | Tauri/sidecar logs 不含 forbidden markers。 |

若发现 bug，可能触碰：

| 文件 | 触碰条件 |
| --- | --- |
| `src/l4-atom/system/windowControls.ts` | window API 调用或不可用状态错误。 |
| `src/l3-molecule/common/WindowControlCluster.tsx` | 控件目标、tooltip、no-drag、aria 或可见状态错误。 |
| `src-tauri/src/lib.rs` | close cleanup、updater plugin、window event 行为错误。 |
| `src-tauri/src/sidecar.rs` | sidecar spawn/shutdown/log redaction 行为错误。 |

建议提交：`补Tauri桌面smoke证据`。仅证据更新时提交证据文件；代码修复必须单独中文提交并推送。

### Task 3：安装包产物与 release gate 前置

目标：生成并核验当前 Windows x64 artifacts。

必须运行或记录阻塞：

| Gate | 命令/动作 |
| --- | --- |
| Source/UI | `pnpm verify` |
| Rust | `cd src-tauri && cargo test` |
| Package build | `pnpm tauri build` |
| Sidecar provenance | `pnpm release:check:sidecar:release` |
| Updater check | `pnpm release:check:updater` 或明确 updater-disabled / needs-signer policy。 |

验收：

- artifacts 路径、大小、SHA-256 与命令结果写入证据。
- `src-tauri/binaries/` 中 sidecar 二进制不被提交；只记录 checksum/provenance。
- updater gate 失败必须作为 release blocker，不允许跳过。

建议提交：`记录安装包产物门禁`。package/release gate 状态明确后立即提交并推送。

### Task 4：Windows installer install/open/quit/reopen/uninstall smoke

目标：验证普通用户安装路径，而不是只打开 build output exe。

Smoke 路径：

| 步骤 | 验收 |
| --- | --- |
| Install | 当前 MSI 或 NSIS installer 成功安装；失败时记录 exit code 和安装器日志摘要。 |
| Launch | 从安装后的入口启动，无终端；clean profile 到 Setup 或恢复状态。 |
| Managed start | 用 synthetic config 或测试路径启动 managed sidecar；`/health` 成功。 |
| Quit | 关闭 app 后 app-managed sidecar 清理；没有残留 `5030` listener。 |
| Reopen | 重新打开后状态恢复，不进入空白坏页面。 |
| Uninstall | 若本轮执行卸载，卸载完成后无 app 进程和 managed sidecar 残留；用户配置保留/删除策略写明。 |

验收证据：

- 只记录安装路径安全摘要，例如 installed app name、artifact name、PID、process cleanup、listener status。
- 不记录真实用户目录全路径。
- 如安装器需要管理员权限或受本机策略阻塞，状态写 `environment-blocked`，不能写 pass。

建议提交：`补安装包安装smoke证据`。install/open/quit/reopen 证据写完并扫描后立即提交并推送。

### Task 5：packaged unknown-port UI smoke

目标：关闭第十步剩余的 packaged unknown-port blocker。

Smoke 路径：

| 步骤 | 验收 |
| --- | --- |
| Occupy | smoke 自己创建未知 `127.0.0.1:5030` listener，记录 PID。 |
| Start app | 启动 installed packaged app。 |
| Trigger start | 在 managed service path 触发启动或端口检查。 |
| Observe | UI 显示可恢复冲突，普通语言说明“端口被其他进程占用”或等价文案。 |
| Preserve | unknown listener 未被 app 杀掉。 |
| Recover | 停掉 smoke listener 后重试，app 能重新识别 free/startable 状态。 |

若发现 bug，可能触碰：

| 文件 | 触碰条件 |
| --- | --- |
| `src-tauri/src/service_probe.rs` | 端口归属分类错误。 |
| `src-tauri/src/commands.rs` | `inspect_port` / `stop_managed_sidecar` 命令行为错误。 |
| `src/l4-atom/system/sidecarManager.ts` | L4 端口状态映射错误。 |
| `src/l2-coordinator/commander/setupMachine.ts`、`setupCenterViewModel.ts` | 冲突状态或用户文案错误。 |
| `src/l3-molecule/setup/*` | UI recovery action、disabled reason、diagnostics disclosure 错误。 |

建议提交：`补安装包端口冲突smoke证据`。如果有 bug，先提交 `修复安装包端口冲突处理`，再提交证据更新。

### Task 6：packaged diagnostics export privacy audit

目标：关闭当前 privacy audit 的 packaged diagnostics 缺口。

Smoke 路径：

| 步骤 | 验收 |
| --- | --- |
| Trigger | 在 installed packaged app 中由用户操作触发诊断导出。 |
| Locate | 记录导出文件安全摘要，不写完整私密路径。 |
| Scan | 扫描 raw `dataKey`、`apiKey`、token、secret、private message、`wxid`、Windows 用户目录前缀等 forbidden markers。 |
| Review UI | 导出成功/失败文案不显示完整本地路径，且说明 redaction。 |
| Cleanup | 删除 smoke 生成诊断文件，或记录安全保留策略。 |

若发现 bug，可能触碰：

| 文件 | 触碰条件 |
| --- | --- |
| `src-tauri/src/sidecar.rs` | Rust diagnostics/log export redaction 或 fail-closed 错误。 |
| `src/l2-coordinator/commander/diagnostics.ts`、`diagnosticsManifest.ts` | 诊断 manifest 行或 safe summary 错误。 |
| `src/l3-molecule/diagnostics/*` | 导出状态、disabled reason、copy/export 文案错误。 |
| `src/utils/maskSecrets.ts` | 前端 redaction helper 漏扫。 |

建议提交：`补安装包诊断脱敏证据`。如果有 bug，先提交 `修复安装包诊断脱敏问题`，再提交证据更新。

### Task 7：updater metadata 或 updater-disabled release policy

目标：让 updater gate 不再模糊。

两条合法路径：

| 路径 | 通过条件 |
| --- | --- |
| Signed updater path | 有签名私钥/密码或 release workflow 产物，生成 Tauri updater artifacts；`pnpm release:check:updater` 通过；证据记录 manifest/artifact SHA-256。 |
| Updater-disabled path | 当前候选明确不发布 updater metadata；release evidence 写明该 candidate 不可自动更新、用户影响、后续 owner/signer 任务。 |

不合法路径：

- 手写 `latest.json`。
- 伪造 signature。
- 在文档里粘贴 signing private key。
- `release:check:updater` 失败但 release dashboard 写 ready。

建议提交：`明确更新器发布策略` 或 `补更新器签名元数据`。策略或元数据验证完成后立即提交并推送。

### Task 8：release evidence、privacy audit、dashboard 和 owner signoff

目标：把 Step 11 证据同步到正式 release 文档，形成 go/no-go。

文件范围：

| 文件 | 记录内容 |
| --- | --- |
| `docs/next-repair-baseline-step-11-tauri-installer-smoke-evidence.md` | Step 11 执行总报告、命令、smoke、artifact、blockers、decision。 |
| `docs/release/ready-desktop-app.md` | Release dashboard 当前状态。 |
| `docs/release/privacy-audit.md` | Candidate packaged diagnostics/updater privacy 审计。 |
| `docs/release/sidecar-artifacts.md` | 仅当 sidecar provenance 或 checksum 变化时更新。 |
| `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/release-evidence.md` | Canonical release evidence。 |
| `specs/chatlogui-specs-hidden-for-ci-repro/002-advanced-capabilities/acceptance-checklist.md` | 若 updater/privacy/release checklist 状态变化，更新勾选。 |
| `CHANGELOG.md` | 只有进入 release candidate 或 release notes 需要时更新。 |

最终结论只允许：

| 结论 | 使用条件 |
| --- | --- |
| `PASS` | Windows x64 packaged smoke、diagnostics、sidecar provenance、updater policy/metadata、privacy audit、owner signoff 全部满足当前 release scope。 |
| `PASS WITH CAVEATS` | Windows x64 可接受，但 macOS/Linux 或 updater-disabled 等 caveat 明确不在当前发布范围。 |
| `BLOCKED` | 任一 required gate 失败或未提供，例如 signed updater metadata、installer-level smoke、diagnostics review、owner signoff。 |

建议提交：`记录安装包smoke结论`。最终命令和 smoke 证据齐全后提交并推送。

### Task 9：smoke 发现 blocker 的小修复循环

目标：smoke 不是只写报告；若发现 P0/P1 bug，立即拆小修复。

规则：

- 每个 blocker 先记录复现步骤、artifact、environment、expected、actual。
- 能写自动化回归的先写失败测试；不能自动化的记录可复现 smoke evidence。
- 只触碰必要文件。
- focused test 通过后，运行对应上层 gate。
- 每个修复单元一个短中文提交并推送。
- 不把多个 unrelated smoke bug 合并成一个大提交。
- 工作树有无关改动时，先确认 stage 范围，只 stage 当前修复文件。

中文提交示例：

| blocker 类型 | 提交标题示例 |
| --- | --- |
| Tauri window | `修复桌面窗口控制smoke问题` |
| Sidecar cleanup | `修复安装包退出清理问题` |
| Unknown port | `修复安装包端口冲突处理` |
| Diagnostics | `修复安装包诊断脱敏问题` |
| Updater metadata | `补更新器签名元数据` |
| Installer evidence | `补安装包安装smoke证据` |
| Release docs | `记录安装包smoke结论` |

## 8. 推荐执行顺序

| 顺序 | 单元 | 理由 |
| --- | --- | --- |
| 1 | 候选冻结 | 先记录 commit/artifact/checksum，避免 smoke 证据漂移。 |
| 2 | 前置 source/Rust/package gates | 防止在已知构建失败状态上做手工 smoke。 |
| 3 | Tauri dev smoke | 先排查真实 Tauri shell/sidecar 行为。 |
| 4 | Installer install/open/quit/reopen | 验证普通用户安装路径。 |
| 5 | Packaged managed sidecar health | 验证 packaged runtime 的 `/health` 和退出清理。 |
| 6 | Packaged unknown-port smoke | 验证未知占用不会被杀且 UI 可恢复。 |
| 7 | Packaged diagnostics export scan | 验证 packaged artifact 的真实隐私边界。 |
| 8 | Updater policy/metadata gate | 解决 release publish 最大 remaining blocker。 |
| 9 | Release evidence 和 privacy audit | 汇总为 go/no-go。 |
| 10 | 提交推送和必要时 PR 更新 | 每个证据单元及时远端同步，不等最后。 |

## 9. 文件范围总表

| 类型 | 文件/模块 | 说明 |
| --- | --- | --- |
| 正式计划 | `docs/next-repair-baseline-step-11-tauri-installer-smoke-repair-plan.md` | 本文件。 |
| 证据报告 | `docs/next-repair-baseline-step-11-tauri-installer-smoke-evidence.md` | 执行 Step 11 时建议新增。 |
| 总体计划 | `docs/next-repair-baseline-overall-repair-plan.md` | 增加第十一步链接和阶段衔接。 |
| Release docs | `docs/release/ready-desktop-app.md`、`docs/release/privacy-audit.md`、`docs/release/sidecar-artifacts.md`、`docs/release/release-governance.md` | 按当前 smoke 结果更新。 |
| Productization evidence | `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/release-evidence.md` | canonical evidence。 |
| Release check scripts | `scripts/verify-sidecar-artifacts.mjs`、`scripts/verify-updater-manifest.mjs`、`scripts/release-workflows.test.mjs` | 只有 artifact gate 发现脚本缺口时修改。 |
| Tauri/Rust | `src-tauri/tauri.conf.json`、`src-tauri/src/lib.rs`、`sidecar.rs`、`health.rs`、`service_probe.rs`、`commands.rs`、`sidecar_args.rs` | 只有 smoke 复现 Tauri/sidecar bug 时修改。 |
| Frontend system boundary | `src/l4-atom/system/*`、`src/l2-coordinator/commander/*`、`src/l3-molecule/common/*`、`src/l3-molecule/setup/*`、`src/l3-molecule/diagnostics/*` | 只有 smoke 复现 UI/system orchestration bug 时修改。 |
| Scratch | `task_plan.md`、`findings.md`、`progress.md` | ignored，不提交。 |

避免触碰：

- `src-tauri/binaries/*`、`src-tauri/target/*`、`dist/*`、`node_modules/*`、安装包、日志、真实截图、真实聊天数据。
- Tauri CSP/capabilities，除非有复现证据证明必须修改，并补安全解释。
- `chatlog_alpha` 后端行为。

## 10. 验证命令

### 10.1 本计划文档验证

| 检查 | 方法 |
| --- | --- |
| 文件存在 | 检查 `docs/next-repair-baseline-step-11-tauri-installer-smoke-repair-plan.md`。 |
| 未完成标记 | 扫描 `TODO`、`TBD`、`FIXME`、`待补` 等未完成占位；阻塞项必须写成明确状态。 |
| 无代码倾倒 | 扫描 fenced code block；本文不应包含完整生产代码或完整脚本。 |
| 关键章节 | 扫描“目标结论、参考输入、当前事实、Smoke 契约、推荐实现任务、验证命令、完成定义、提交推送节奏”。 |
| 隐私 | 扫描 raw private markers、real path、key/token 示例；只允许命令名和明确 synthetic/test policy 语境。 |
| Markdown diff | `git diff --check`。 |

### 10.2 Step 11 执行阶段命令

| 阶段 | 命令或动作 |
| --- | --- |
| Source/UI前置 | `pnpm fixtures:check`、`pnpm e2e`、`pnpm e2e:a11y`、`pnpm e2e:visual`、`pnpm verify`，按本轮风险决定是否全跑。 |
| Rust/Tauri | `cd src-tauri && cargo test` |
| Package build | `pnpm tauri build` |
| Sidecar provenance | `pnpm release:check:sidecar:release` |
| Updater | `pnpm release:check:updater`，或记录 updater-disabled / needs-signer policy。 |
| Tauri dev smoke | `pnpm tauri dev` 后执行真实 window controls、sidecar health、quit cleanup、privacy/log 检查。 |
| Installer smoke | 当前 MSI/NSIS install/open/quit/reopen/uninstall 或等价可审计路径。 |
| Unknown-port smoke | 占用 `127.0.0.1:5030` 后运行 installed app，验证 recoverable conflict 和 listener survival。 |
| Diagnostics smoke | installed app 中导出诊断并扫描 forbidden markers。 |

命令失败处理：

- 记录命令、退出码、错误摘要、artifact/commit。
- 不重复同一失败动作超过一次；第二次必须变更策略。
- 如果是环境阻塞，写 `environment-blocked` 和所需机器/权限。
- 如果是 release blocker，写 `release-blocked`，不包装成通过。
- 如果是代码 bug，进入 Task 9 小修复循环。

## 11. 验收矩阵

| 验收项 | 通过标准 |
| --- | --- |
| Candidate identity | branch、commit、version、artifact、checksum、sidecar provenance、operator、environment 明确。 |
| Tauri shell | 真实 Tauri window controls、drag/no-drag、close cleanup、settings/privacy controls 不遮挡、不泄露。 |
| Installer | 当前 Windows x64 installer 能安装、启动、退出、重开；卸载或 cleanup 策略明确。 |
| Sidecar lifecycle | app-managed sidecar 启动、`/health` 成功、退出清理、重开恢复。 |
| Unknown port | 未知 `5030` occupant 不被杀，UI 显示可恢复冲突，停止 unknown listener 后可恢复。 |
| Diagnostics | packaged diagnostics 用户触发、脱敏、fail-closed；导出文件和证据不含 forbidden markers。 |
| Updater/release | updater signed metadata 通过，或 updater-disabled policy 明确；缺签名材料时 release-blocked。 |
| Privacy | logs、screenshots、diagnostics、release evidence、commit/PR body 不含 raw secrets/private data/full private paths。 |
| Architecture | 如果改代码，L1/L2/L3/L4 和 L4 system ownership 仍由治理测试或 focused review 证明。 |
| Platform scope | Windows x64 与 macOS/Linux caveat 分开写，不把 Windows evidence 写成全平台 ready。 |
| Commit/push | 每个 smoke/evidence/fix 单元短中文提交并及时推送。 |

## 12. 完成定义

第十一步计划撰写完成必须满足：

1. 新增并提交本计划文档。
2. 总体修复计划能链接到第十一步。
3. 计划清楚承接第十步剩余 release blockers：signed updater metadata、installer-level smoke、packaged unknown-port UI smoke、packaged diagnostics review、owner signoff。
4. 计划区分 Tauri dev、packaged exe、installer smoke、release artifact，不混用证据等级。
5. 计划明确 unknown port safety：只停止或复用确认 app-managed sidecar，未知进程只显示可恢复冲突。
6. 计划明确 diagnostics privacy：用户触发、脱敏、fail-closed、扫描 forbidden markers。
7. 计划明确 updater gate：通过签名 metadata 或明确 disabled policy；不能忽略 `release:check:updater` 失败。
8. 计划不包含完整生产代码或脚本。
9. 文档扫描没有未完成占位或私密数据示例。
10. 本计划文档用短中文提交，并推送到 `origin/codex/next-repair-baseline`。

第十一步执行完成必须额外满足：

1. 当前 Windows x64 candidate 的 installer/open/quit/reopen/unknown-port/diagnostics smoke 有当前证据。
2. `pnpm verify`、`cd src-tauri && cargo test`、`pnpm tauri build`、`pnpm release:check:sidecar:release`、updater gate/policy 状态明确。
3. release dashboard、privacy audit、canonical release evidence 与实际命令/smoke 一致。
4. owner signoff 完成，或 release status 保持 `BLOCKED`。
5. 所有 smoke 发现的 P0/P1 blocker 已按小单元修复、验证、中文提交、及时推送；未修复项有 owner/下一步/阻塞状态。

## 13. 提交、推送和 PR 节奏

第十一步特别要求及时提交和推送，不允许把 smoke、修复、证据和结论最后一股脑提交或合并。

| 单元 | 中文提交标题示例 | 推送要求 |
| --- | --- | --- |
| 第十一步计划 | `撰写安装包smoke修复计划` | 文档扫描通过后立即提交并推送。 |
| 候选冻结 | `冻结安装包smoke候选` | artifact/checksum/commit 记录后立即提交并推送。 |
| Tauri dev evidence | `补Tauri桌面smoke证据` | Tauri dev smoke 记录并扫描后立即提交并推送。 |
| Package gates | `记录安装包产物门禁` | build/sidecar/updater gate 状态明确后立即提交并推送。 |
| Installer smoke | `补安装包安装smoke证据` | install/open/quit/reopen 证据写完后立即提交并推送。 |
| Unknown port | `补安装包端口冲突smoke证据` | unknown listener survival/recovery 证据写完后立即提交并推送。 |
| Diagnostics | `补安装包诊断脱敏证据` | diagnostics artifact 扫描完成后立即提交并推送。 |
| Updater policy | `明确更新器发布策略` 或 `补更新器签名元数据` | policy 或 metadata 验证后立即提交并推送。 |
| Bug fix | `修复安装包退出清理问题` 等 | focused test/smoke 通过后立即提交并推送；每个 bug 单独提交。 |
| Final decision | `记录安装包smoke结论` | 最终 go/no-go 证据齐全后提交并推送。 |

如果已有修复基线 PR，推送后应更新 PR 描述或评论中的 Step 11 evidence。没有 PR 时，只有用户明确要求、远端 CI/协作审查需要、或 release governance 需要审查边界时创建或更新 PR。

## 14. 风险和缓解

| 风险 | 表现 | 缓解 |
| --- | --- | --- |
| 把第十步证据重复当第十一步通过 | 文档写 source/UI green 后声明 release ready。 | 每项写证据等级；installer/diagnostics/updater 需要当前 Step 11 证据。 |
| 安装器环境阻塞 | MSI/NSIS 需要权限、企业策略或杀软拦截。 | 写 `environment-blocked`，记录所需机器/权限，不声明 pass。 |
| 误杀未知端口进程 | smoke 为了通过自动结束未知 `5030` listener。 | 只结束 smoke 自己创建的 listener；app 不得结束 unknown listener。 |
| 诊断导出泄露路径或 secret | packaged artifact 含 raw path/key/private marker。 | fail-closed；修复 redaction 后重跑 packaged export。 |
| Updater gate 被绕过 | `latest.json` 缺失但 release dashboard 写 ready。 | 必须 signed metadata 通过或 updater-disabled policy 明确，否则 release-blocked。 |
| 证据包含本地隐私 | 文档粘贴完整用户目录、日志、截图或真实消息。 | 使用安全摘要、synthetic data、artifact basename、hash；提交前扫描。 |
| 一次性大修 | smoke 发现多个 bug 后混成一个大提交。 | 每个 blocker 小修、focused test、中文提交、推送。 |
| build output 被误提交 | force-add ignored docs 时误加 target/dist/binaries。 | 只 stage docs/release/spec evidence/source fix files；提交前看 `git status --short`。 |

## 15. 后续衔接

第十一步执行后有三种结果：

| 结果 | 下一步 |
| --- | --- |
| `PASS` | Windows x64 可进入 release candidate 或按用户要求合并/PR/release 流程；仍需遵守 release governance。 |
| `PASS WITH CAVEATS` | Windows x64 当前候选可接受，但 updater-disabled、macOS/Linux caveat 或非首发平台 caveat 明确。 |
| `BLOCKED` | 不发布；按 blocker 列表继续小步 smoke/fix/evidence，中文提交并推送。 |

无论哪种结果，剩余假设必须写入 Step 11 evidence、release evidence、privacy audit 或 PR body。Tauri/安装包 smoke 不能依赖聊天上下文延续。

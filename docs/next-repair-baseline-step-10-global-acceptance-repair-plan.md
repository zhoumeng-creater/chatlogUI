# 第十步：全局验收与发布证据修复计划

计划性质：全局验收修复计划。本文只描述验收范围、证据分级、任务顺序、文件边界、测试命令、人工 smoke、发布门禁和提交节奏，不放完整生产代码，也不把代码片段当成实现方案。

## 1. 目标结论

第十步不是继续给某个页面增加入口，而是对 `codex/next-repair-baseline` 的第 1-9 步修复结果做一次全局验收：确认用户主路径、页面架构、任务闭环、隐私、可访问性、响应式、诊断、Tauri 桌面壳、sidecar 生命周期和 release evidence 是否已经能支撑“可交付桌面应用”的判断。

本步骤要输出两类结果：

| 结果 | 说明 |
| --- | --- |
| 全局验收证据 | 当前分支上真实运行过的自动化、浏览器、Tauri dev、安装包 smoke、隐私审计、发布 artifact 检查和人工验收记录。 |
| 阻塞项修复或阻塞声明 | 验收中发现的 P0/P1 缺口必须拆成小修复单元及时提交并推送；无法在本步骤修复的 release 阻塞必须明确状态、原因、影响和下一步。 |

第十步完成后，不能只说“测试通过”。必须能回答：

- 第 1-9 步关闭了哪些原始问题 ID，哪些仍需要 release 或真实桌面证据。
- Setup、Workbench、Search、Analytics、Media、SNS、AI、Graph、Settings 的主任务、状态、窄屏、隐私和错误恢复是否通过。
- 普通用户路径是否仍暴露开发者密度、私密路径、endpoint、`wxid`、key/token、内部错误或原始诊断。
- Tauri dev 和 packaged app 是否在当前分支、当前构建产物上通过窗口控制、启动、退出、sidecar 清理、端口冲突、重开和诊断导出。
- 当前候选是否可以进入 release candidate；如果不能，阻塞项是 sidecar provenance、updater metadata、packaged smoke、隐私审计、平台 caveat，还是功能/UX 回归。

## 2. 参考输入与工作流

| 输入 | 本计划使用方式 |
| --- | --- |
| `docs/next-repair-baseline-overall-repair-plan.md` | 上位修复路线；第十步承接阶段 8-10 的全局可访问性、响应式、隐私 audit、桌面壳、发布证据与最终验收。 |
| `docs/next-repair-baseline-ux-ledger.md` | 原始 P0/P1/P2 问题事实账本；第十步要逐项更新“已修复 / 源码通过 / 浏览器通过 / 仍需 Tauri 或 packaged evidence”。 |
| `docs/next-repair-baseline-inspector-architecture.md` | Workbench 容器、一级页面、上下文 inspector、Setup 层级的结构验收依据。 |
| `ux-micro-affordance-opportunities.md` | Tooltip、DisabledReason、状态解释、安全打开、风险动作说明等微交互验收补充。 |
| `docs/product-acceptance-standards.md` | 全局验收主合同：五问、状态覆盖、页面评分、模块验收、隐私、诊断和证据要求。 |
| `docs/ui-development-standards.md` | UI 开发与验收标准：target size、Field ARIA、焦点、响应式、ordinary-user copy 和控件行为。 |
| Step 01 到 Step 09 计划与进度记录 | 当前基线来源，避免把已完成内容重复写成第十步功能任务。 |
| `docs/总体开发规划.md`、`开发指南.md` | 历史架构愿景；只采用未被 AGENTS、constitution、release runbook 替代的部分。 |
| `.specify/memory/constitution.md` | sidecar 核心、本地隐私、L1/L2/L3/L4、可见状态、证据驱动、包装生命周期的治理边界。 |
| `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/*` | ready desktop app 的用户故事、FR/SC、release evidence、架构边界和测试数据政策。 |
| `docs/release/*` | release gate、sidecar provenance、updater manifest、privacy audit、Windows x64 packaged smoke 的当前治理要求。 |
| 当前源码 | 路由、Settings 收敛、primary workspace、UI governance、architecture boundary、Tauri config、sidecar 生命周期和 release scripts 的实际状态。 |

使用的工作流要求：

- 使用 `planning-with-files` 记录验收进度；scratch 文件不提交。
- 使用 `app-productization` 和 `release-gate` 判断是否可作为桌面应用交付。
- 使用 `ui-acceptance` 检查每个 route 的用户任务、状态、响应式、隐私和可访问性。
- 使用 `verification-before-completion`：任何“通过”“完成”“可发布”结论必须有本轮新鲜命令或 smoke 证据。
- 若验收发现代码缺口，修复阶段必须先写失败测试或可复现证据，再最小修复，再提交。
- 每个验收/修复单元必须短中文提交，并在该单元证据通过后及时推送；不要等全部全局验收结束后一次性提交、一次性推送或一次性合并。

## 3. 当前开发进度事实

### 3.1 可依赖的第 1-9 步基线

| 步骤 | 当前可依赖结果 | 第十步验收重点 |
| --- | --- | --- |
| Step 01 Base URL / Readiness | active service base URL、HTTP/DB readiness、外部本机服务路径、主 API 请求来源已收敛。 | 全局扫描是否仍有普通 UI 暴露旧 `127.0.0.1:5030` 或固定端口真源；Tauri CSP/capability 是否与本机服务边界一致。 |
| Step 02 隐私与开发者入口 | 普通 UI 隐私展示、开发者默认隐藏、诊断 fail-closed、Rust 配置错误脱敏已有基础。 | 默认路由、DOM、aria、tooltip、copy/export、日志和截图是否仍泄露路径、`wxid`、key/token、私密内容。 |
| Step 03 UI 基础组件 | Button/IconButton/Field/Tooltip/DisabledReason/overlay/focus 基础完成，高影响治理测试存在。 | 共享控件 target size、Field ARIA、modal/drawer focus、tooltip/disabled reason 是否在新增页面和低频控件中补齐。 |
| Step 04 SetupCenter | Setup 三路径、外部服务 URL、readiness 摘要、诊断折叠、单主 CTA、窄屏顺序完成。 | 首启、外部服务、DB 未就绪、错误恢复、隐私模式和诊断折叠是否在当前浏览器和 Tauri 中仍成立。 |
| Step 05 Workbench IA | ready workspace rail、toolbar 降噪、一级页面/inspector 分层、Settings/Developer 退出普通 rail。 | 主导航是否唯一；toolbar 是否未回退为滚动页面；inspector 是否只服务上下文。 |
| Step 06 Search 闭环 | 搜索结果稳定主区、stale guard、命中锚点、聊天定位、高亮和返回路径完成。 | 搜索的 no result、error、privacy、narrow、旧响应和锚点缺失降级是否全局通过。 |
| Step 07 独立页面 | `/search`、`/analytics`、`/media`、`/sns`、`/ai`、`/graph` 成为 canonical primary routes。 | 每个一级页面是否有清楚范围、状态、隐私安全深链和桌面/窄屏证据。 |
| Step 08 模块任务闭环 | AI、Graph、Media、SNS、Analytics 的 stale guard、cancel、partial、safe-open、降承诺和错误恢复增强。 | 长任务、局部失败、取消、旧响应、外链确认、媒体/朋友圈任务边界是否没有回归。 |
| Step 09 Settings 收敛 | Settings 返回上下文、AI 语义归属、Data/Setup 归属、诊断折叠、endpoint 隐私已完成并验证。 | Settings 作为全局验收样本：来源返回、配置归属、诊断 privacy/a11y、默认无 endpoint/密钥/路径泄露。 |

### 3.2 当前源码快照

当前 route map 已经包含：

| Route | 当前定位 |
| --- | --- |
| `/` | SetupCenter 首启与服务连接。 |
| `/workbench` | 会话工作台。 |
| `/search` | 搜索工作区。 |
| `/analytics` | 统计工作区。 |
| `/media` | 媒体工作区。 |
| `/sns` | 朋友圈工作区。 |
| `/ai` | AI 工作台。 |
| `/graph` | 图谱工作区。 |
| `/settings` | 应用设置。 |
| `/dashboard`、`/workbench/*` legacy routes | 安全重定向到 canonical route。 |

当前 `package.json` 已提供全局验收可用命令：`pnpm fixtures:check`、`pnpm e2e`、`pnpm e2e:a11y`、`pnpm e2e:visual`、`pnpm verify`、`pnpm tauri build`、`pnpm release:check:sidecar:release`、`pnpm release:check:updater`。

当前治理测试已覆盖：

| 治理项 | 当前来源 |
| --- | --- |
| L3 不出现 runtime L2 import | `scripts/architecture-boundary.test.mjs`。 |
| L4 UI classNames、deprecated primitives、native title、IconButton tooltip、disabled reason、Field ARIA、overlay focus、Workbench/Search/independent pages 回归 | `scripts/ui-governance.test.mjs`。 |
| Synthetic fixtures 和 route map | `scripts/validate-e2e-fixtures.mjs`。 |
| 浏览器核心路径、隐私、a11y、visual | `e2e/specs/*.ts`。 |

### 3.3 当前不能直接标绿的证据边界

下面内容即使源码和浏览器测试已有覆盖，也不能在第十步开始时直接写成“已通过”：

| 证据边界 | 原因 |
| --- | --- |
| Tauri native window-click smoke | 浏览器 E2E 能证明按钮渲染、target size 和键盘可达，不能证明真实 Tauri 窗口最小化、最大化/还原、关闭、拖拽和 no-drag 行为。 |
| Packaged app install/open/quit/reopen smoke | 历史 `release-evidence` 有 Windows x64 smoke，但第十步必须基于当前分支和当前产物刷新。 |
| Sidecar cleanup and unknown port conflict in installed app | 源码/Rust tests 不等同于安装包真实进程生命周期证据。 |
| Updater release metadata | `createUpdaterArtifacts` 当前为 false；如果 release 需要 updater，必须生成并验证 `latest.json`，否则明确记录 updater-disabled release policy。 |
| Platform release readiness | Windows x64 是当前首发目标；macOS Intel、macOS Apple Silicon、Linux x64 继续是 platform caveat，除非补齐签名/公证/sidecar/smoke 证据。 |
| Product issue ledger freshness | 旧 ledger 中多项问题已经被 Step 01-09 修过，但原始状态可能仍写着 confirmed；第十步必须更新为带证据等级的新状态。 |
| Visual coverage完整性 | 现有 visual snapshots 主要覆盖 Workbench、Search、AI、Graph 和窄屏隐私；Setup、Settings、Media、SNS、About diagnostics、dark mode 等仍需要判断是否补快照或记录可接受边界。 |

## 4. 用户视角验收五问

| 问题 | 第十步验收答案 |
| --- | --- |
| 这个步骤帮用户完成什么真实任务？ | 确认当前应用能作为本地聊天数据桌面工具使用：连接服务、浏览会话、搜索定位、查看统计/媒体/朋友圈、使用 AI/图谱、调整设置、导出脱敏诊断，并知道是否可以安装发布。 |
| 第一次进入应用应先做什么？ | 在 `/` 看到清晰的 Setup 主任务，选择推荐导入或连接已有本机 chatlog 服务；DB ready 后进入工作台，DB 未就绪时不进入坏页面。 |
| 同一任务是否有重复入口？ | 一级任务由 primary workspace rail 承载；Settings 在标题栏/应用级入口；Developer 仅高级/错误恢复；模块上下文入口只作为深链并带安全范围说明。 |
| 出错或后悔时能否恢复？ | 每个主路径必须有返回、关闭、重试、停止、取消、清空、复制脱敏诊断、进入 Setup/Settings/AI 配置或安全外链取消。 |
| 是否因为缺相邻功能而像坏了？ | 未配置服务、DB 未就绪、semantic 缺配置、图谱空、媒体不可预览、SNS 外链不可开、updater 未启用、release artifact 缺失都必须明确降承诺或阻塞，而不是假装完成。 |

## 5. 非目标

- 不新增业务功能，不重做第 1-9 步已经完成的页面结构。
- 不改变 `chatlog_alpha` API、sidecar 启动契约或服务端行为。
- 不把 Settings、Developer、AI、Media、SNS、Graph 重新塞回 Workbench inspector。
- 不为通过 release gate 而放宽 CSP、capabilities、shell permissions 或隐私 redaction。
- 不把历史 release evidence 冒充当前分支证据。
- 不提交 `.env`、日志、真实聊天数据、sidecar binaries、build output、screenshots with real data 或本地 scratch planning files。
- 不在计划文档中粘贴完整生产代码。

## 6. 全局验收证据分级

第十步所有结论必须标注证据等级。

| 等级 | 含义 | 可下结论 |
| --- | --- | --- |
| `D0 计划/文档` | 计划、ledger、runbook、spec 已写。 | 只能说明有要求，不能说明当前分支通过。 |
| `S1 源码/单测` | 当前源码、Vitest、Rust tests、治理测试通过。 | 可说明代码契约通过，不能说明真实浏览器或安装包体验通过。 |
| `B1 浏览器/E2E` | 当前分支在 Playwright/Vite mock backend 下通过。 | 可说明 Web shell/UI 状态通过，不能替代 Tauri native 或 packaged smoke。 |
| `T1 Tauri dev` | `pnpm tauri dev` 真实窗口运行，人工或自动验证窗口和 sidecar 行为。 | 可说明开发态桌面壳行为通过，不能替代安装包。 |
| `P1 Packaged smoke` | 当前构建产物安装/打开/退出/重开/端口冲突/诊断导出通过。 | 可说明该平台该产物通过 smoke。 |
| `R1 Release artifact` | sidecar provenance、updater metadata、checksum、privacy audit、release evidence、owner signoff 完整。 | 可说明进入 release candidate 或发布流程。 |

任何验收项如果只有 `D0` 或历史证据，状态应写为 `blocked`、`needs-current-evidence` 或 `not-in-release-scope`，不能写成 `pass`。

## 7. 全局验收契约

### 7.1 问题台账 closure 契约

第十步必须把原始问题 ID 重新分类到下面状态：

| 状态 | 使用条件 |
| --- | --- |
| `closed-source-browser` | 源码、单测、治理测试、浏览器/E2E 已证明主路径通过，不需要 Tauri/package 证据。 |
| `closed-tauri` | 需要真实 Tauri 证据的项已经通过 `pnpm tauri dev` smoke。 |
| `closed-packaged` | 需要安装包证据的项已经通过 packaged smoke。 |
| `release-blocked` | 功能和 UI 可用，但 release candidate 缺 sidecar/updater/artifact/privacy/signoff 证据。 |
| `deferred-platform-caveat` | 非 Windows x64 平台缺签名、公证、sidecar 或 smoke，明确不阻塞首发。 |
| `reopened` | Step 10 复测发现第 1-9 步回归或修复不完整。 |

每个台账项至少写清：

- 原问题 ID。
- 当前状态和证据等级。
- 涉及 route/module。
- 自动化命令或 smoke 路径。
- 是否仍需 Tauri/package/release evidence。
- 若阻塞，下一步修复单元和中文提交建议。

### 7.2 Route / task 全局矩阵

| Route/模块 | 主任务 | 必验状态 |
| --- | --- | --- |
| `/` SetupCenter | 连接本机服务或已有本机 chatlog 服务，区分 HTTP/DB readiness。 | first-run、recommended import、external URL、invalid URL、service unreachable、DB unready、ready、diagnostics collapsed、privacy、narrow。 |
| `/workbench` | 浏览会话和消息，进入上下文详情。 | sessions loading/empty/error/success、history pagination、selected chat、search-hit anchor、privacy、narrow drawer、developer hidden。 |
| `/search` | 搜索、筛选、定位命中、返回结果。 | empty query、searching、no results、results、load more、stale response、anchor missing、privacy、narrow。 |
| `/analytics` | 查看统计范围和聚合解释。 | current/all scope、no chat、loading、partial/error、privacy aggregate、narrow。 |
| `/media` | 当前范围媒体/收藏/成员/未读/新增消息边界。 | endpoint partial、preview available/unavailable、members loaded/total、favorite no preview、disabled reasons、privacy、narrow。 |
| `/sns` | 朋友圈 feed/search/notifications/detail 和安全外链。 | feed partial、empty search、notification recovery、safe-open confirm/failure、privacy、narrow。 |
| `/ai` | 语义配置、索引、QA、搜索、分析、证据。 | missing config、index states、streaming、stop、idle timeout、clear、evidence、route leave cancel、privacy、narrow。 |
| `/graph` | 图谱摘要、筛选、可视化、时间线、高级任务、QA。 | empty/error/oversized、cancel/stale guard、visualization nonblank、timeline focus、advanced disabled reasons、privacy、narrow。 |
| `/settings` | 应用偏好、配置摘要、AI/Setup 入口、隐私/诊断、关于更新。 | source-aware return、data/setup ownership、AI semantic ownership、diagnostics disclosure、save error、update error、privacy、narrow。 |

### 7.3 隐私和诊断契约

全局验收必须检查以下泄露面：

| 泄露面 | 禁止内容 |
| --- | --- |
| Visible DOM | raw local paths、`wxid`、message bodies、real contact names、API keys、tokens、semantic provider endpoint secret、diagnostic raw lines。 |
| Accessibility text | aria-label、aria-description、tooltip、disabled reason、dialog label 中的私密内容。 |
| Copy/export | 诊断复制、日志导出、诊断文件、release notes、PR body 不得包含未脱敏私密数据。 |
| Screenshots/visual snapshots | 只能使用 synthetic fixture 或 privacy-masked 内容。 |
| Logs/console | 不输出 raw `dataKey`、key/token、private messages、full local DB path。 |
| URL/query/state | 不序列化 raw chat id、focus label、local path、endpoint secret、search text private content。 |

### 7.4 可访问性、响应式和视觉契约

第十步必须覆盖：

| 项 | 验收要求 |
| --- | --- |
| Target size | 共享 Button/IconButton/Segmented/close/confirm 目标尺寸符合 `docs/ui-development-standards.md`；小目标必须有例外记录。 |
| Field ARIA | Field hint/error 与 input/select 关联；错误时有 `aria-invalid` 或 `aria-errormessage`。 |
| Focus lifecycle | Dialog/sheet/drawer/safe-open/evidence/diagnostics disclosure 具备初始焦点、Escape、焦点限制或合理 containment、关闭后恢复。 |
| Keyboard | primary workspace rail、tabs、search results、window controls、safe-open、diagnostics、AI/Graph/Media/SNS 关键动作可键盘完成。 |
| Responsive | 390x844 和 1366x900 是最低检查；关键页面不得水平溢出，底部主操作不能被遮挡。 |
| Dark/privacy mode | 页面在 privacy on 下结构保持，聚合信息可用；若检查 dark mode，记录 route、状态和截图。 |
| Visual score | 高可见页面按 10 项 page score，不低于 16/20；主任务、隐私或错误状态为 0 时直接失败。 |

### 7.5 架构和维护契约

- L1 只做 route/layout/event delegation。
- L2 owns navigation、state orchestration、retry、error translation、safe summary、route scope。
- L3 receives props and callbacks；不得新增 runtime L2 import。
- L4 network/system atoms 不导入 L2/L3，不保存业务状态。
- 所有 backend communication 仍经 L4 network/system → L2 commander/diplomat → state/UI。
- 如果验收修复触碰 shared primitives、route map、error translator、chatlog request context 或 sidecar config，必须有 focused regression tests。

### 7.6 Tauri、sidecar 和 release 契约

| 区域 | 验收要求 |
| --- | --- |
| Tauri dev | 当前分支 `pnpm tauri dev` 可打开真实窗口；最小化、最大化/还原、关闭、拖拽/no-drag、设置/隐私/window controls 不重叠。 |
| Sidecar lifecycle | app-managed sidecar starts with `serve --http-addr 127.0.0.1:5030`，`/health` 成功，退出时清理；unknown `5030` occupant 不被杀，显示可恢复冲突。 |
| Packaged smoke | Windows x64 当前构建产物安装/打开/退出/重开/恢复配置/诊断导出/端口冲突通过。 |
| Sidecar provenance | `pnpm release:check:sidecar:release` 必须通过并记录 target、source/artifact、sha256。 |
| Updater | 如果 release 启用更新，`pnpm release:check:updater` 必须通过；如果当前候选不启用 updater，release evidence 必须明确 updater-disabled policy，而不是忽略失败。 |
| Privacy audit | `docs/release/privacy-audit.md` 对当前 candidate 填写日期、commit、sidecar source、operator/reviewer、结果。 |
| Platform caveats | macOS/Linux 未 smoke 时必须保留 caveat，不阻塞 Windows x64 但不能写成全平台 ready。 |

## 8. 推荐实现任务

### Task 1：证据库存与台账重新分类

目标：先弄清当前分支能证明什么，不能证明什么。

文件范围：

| 文件 | 责任 |
| --- | --- |
| `docs/next-repair-baseline-ux-ledger.md` | 更新每个 P0/P1/P2 的当前状态、证据等级和剩余证据要求。 |
| `docs/next-repair-baseline-inspector-architecture.md` | 更新 Workbench/Setup/独立页面结构结论，不保留已经过时的源码事实。 |
| 新增 `docs/next-repair-baseline-step-10-global-acceptance-evidence.md` 或等价报告 | 汇总当前验收命令、route 矩阵、manual smoke、阻塞项和 go/no-go。 |
| `progress.md` | 只作 ignored scratch 记录，不提交。 |

验收：

- 每个原始 ID 都有当前状态和证据等级。
- 不把历史证据写成当前证据。
- 不把源码推断写成 Tauri/package 事实。
- 不出现 raw path、`wxid`、key/token、private content。

建议提交：`盘点全局验收证据`。完成文档扫描后提交并推送。

### Task 2：自动化治理和隐私扫描补强

目标：把第十步发现的可自动化验收项固化到 tests 或 scripts，防止全局验收只靠人工记忆。

可能文件：

| 文件 | 预期改动 |
| --- | --- |
| `scripts/ui-governance.test.mjs` | 若发现 lower-frequency tooltip、disabled reason、target size 或 visual debt 需要守住，补扫描或缩小 allowlist。 |
| `scripts/architecture-boundary.test.mjs` | 保护新增 route/page 不引入 L3 runtime L2 import 或 L1 业务状态。 |
| `scripts/validate-e2e-fixtures.mjs` | 若新增 route/fixture，扩展 synthetic/privacy 扫描。 |
| `e2e/utils/privacy-scan.ts` | 覆盖 aria/tooltip/diagnostics/export 相关 forbidden markers。 |
| 对应 unit tests | 对验收中发现的回归点先写红灯。 |

验收：

- Governance 能自动失败于真实风险，不只是字符串堆砌。
- 新扫描不会误杀明确 synthetic redaction test cases。
- 运行 focused governance 后，再运行 `pnpm typecheck`、`pnpm lint`。

建议提交：`补全全局验收治理扫描`。focused governance + lint/typecheck 通过后提交并推送。

### Task 3：全 route 浏览器验收矩阵

目标：用 Playwright 在当前 synthetic mock backend 下覆盖全 route、桌面/窄屏、隐私和核心状态。

可能文件：

| 文件 | 预期改动 |
| --- | --- |
| `e2e/specs/core.spec.ts` | 补 route/task 矩阵缺口，例如 Settings source return、Media/SNS/Analytics state、Setup DB unready。 |
| `e2e/specs/privacy.spec.ts` | 扩展 privacy-on DOM/aria/tooltip/url/query 扫描。 |
| `e2e/specs/advanced.spec.ts` | 补 AI/Graph/Media/SNS 长任务、partial、safe-open、disabled reason。 |
| `e2e/mock-chatlog-server/*`、`e2e/fixtures/*` | 只添加 synthetic fixture，不使用真实数据。 |

最低验收命令：

| 范围 | 命令 |
| --- | --- |
| Fixtures | `pnpm fixtures:check` |
| Browser core | `pnpm e2e` |
| Privacy focused | `pnpm e2e` 中覆盖 privacy specs，或单独运行相关 spec |

建议提交：`补全全局路由验收`。E2E 通过后提交并推送。

### Task 4：可访问性、视觉和响应式证据收敛

目标：补足全局 UI acceptance 的证据，不让 axe 结果替代项目标准。

可能文件：

| 文件 | 预期改动 |
| --- | --- |
| `e2e/specs/a11y.spec.ts` | 补 Settings diagnostics disclosure、safe-open、modal focus、target size 或 keyboard path。 |
| `e2e/specs/visual.spec.ts` | 评估并补 Setup、Settings、Media、SNS、About diagnostics、dark/privacy state 等代表性 snapshots。 |
| `docs/next-repair-baseline-step-10-global-acceptance-evidence.md` | 记录 page score、viewport、privacy mode、visual caveat。 |
| `src/styles/*` 或 L4 atoms | 仅当验收发现真实 target/overflow/focus 缺口时小修。 |

验收：

- `pnpm e2e:a11y` 通过。
- `pnpm e2e:visual` 通过；若更新 snapshots，先人工检查 synthetic screenshot，再提交。
- 关键页面 1366x900 和 390x844 无水平溢出。
- 页面评分低于 16/20 或隐私/错误状态为 0 的页面不能标绿。

建议提交：`补全全局视觉与可访问性验收`。a11y/visual 通过后提交并推送。

### Task 5：Tauri dev 桌面壳和 sidecar smoke

目标：补 P0 桌面壳和真实 Tauri 行为证据。

检查项：

| 场景 | 验收 |
| --- | --- |
| Tauri dev 启动 | `pnpm tauri dev` 能打开真实窗口；无终端操作才能继续使用。 |
| Window controls | 最小化、最大化/还原、关闭按钮真实调用 Tauri window API；按钮 no-drag，标题区可拖拽。 |
| Setup route | `/` 也在一致 shell 中，窗口 controls 可见且不遮挡首启主任务。 |
| Workbench/Settings routes | 进入后 window controls 仍可用，设置/隐私/返回动作不重叠。 |
| Sidecar health | app-managed sidecar 启动后 `/health` 成功；退出 app 后 sidecar 清理。 |
| Unknown port | 外部进程占用 `127.0.0.1:5030` 时显示 recoverable conflict，不杀 unknown process。 |
| Logs/privacy | Tauri logs 和 sidecar logs 不含 raw path、key/token、private content。 |

文件范围：

- 若只是记录证据，更新 `docs/next-repair-baseline-step-10-global-acceptance-evidence.md` 和 release evidence。
- 若发现 bug，触碰 `src-tauri/src/*`、`src/l4-atom/system/*`、`src/l2-coordinator/commander/*`、`src/l3-molecule/common/*` 前先写 focused test。

建议提交：`补Tauri桌面壳验收证据`；若有代码修复，按 bug 单独拆中文提交并推送。

### Task 6：Packaged app 和 release artifact gate

目标：基于当前分支当前产物补 Windows x64 安装包证据，并明确 release candidate 状态。

必须运行或明确阻塞：

| Gate | 命令/动作 |
| --- | --- |
| Source/UI | `pnpm verify` |
| Rust/Tauri | `cd src-tauri && cargo test` |
| Package build | `pnpm tauri build` |
| Sidecar provenance | `pnpm release:check:sidecar:release` |
| Updater manifest | `pnpm release:check:updater`，或明确 updater-disabled policy。 |
| Packaged smoke | 安装或打开 Windows x64 当前产物，执行 install/open/quit/reopen/unknown-port/diagnostics。 |
| Privacy audit | 填写 `docs/release/privacy-audit.md` 当前候选。 |

证据记录：

| 文件 | 记录内容 |
| --- | --- |
| `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/release-evidence.md` | 当前日期、branch、commit、package path、sha256、命令结果、manual smoke、privacy scan、caveat。 |
| `docs/release/ready-desktop-app.md` | Release dashboard 当前状态。 |
| `docs/release/sidecar-artifacts.md` | 若 sidecar provenance 政策或 checksum 变化，记录来源。 |
| `docs/release/privacy-audit.md` | 当前候选审计结果。 |
| `CHANGELOG.md` | 只有进入 release candidate 或 release notes 需要时更新。 |

建议提交：`补安装包发布验收证据`。package/release gates 完成或阻塞状态明确后提交并推送。

### Task 7：阻塞项小修复循环

目标：验收不是写报告后忽略问题；发现 P0/P1 blocker 时立即拆成小单元修复。

规则：

- 每个 blocker 单独写复现和失败测试。
- 修复只触碰必要文件。
- focused test 先通过，再运行对应全局 gate。
- 每个修复单元一个短中文提交并推送。
- 如果工作树有无关改动，先确认提交范围，只 stage 当前修复文件。

中文提交示例：

| blocker 类型 | 提交标题示例 |
| --- | --- |
| 隐私泄露 | `修复全局验收隐私泄露` |
| 窄屏溢出 | `修复全局验收窄屏溢出` |
| Tauri window | `修复桌面窗口控制验收问题` |
| Sidecar cleanup | `修复安装包退出清理问题` |
| Visual/a11y | `修复全局验收可访问性问题` |
| Release metadata | `补发布元数据验收证据` |

### Task 8：全局验收结论和 go/no-go

目标：最终输出可信结论，而不是泛泛总结。

最终报告必须包含：

| 部分 | 内容 |
| --- | --- |
| Build under test | 日期、branch、commit、package、operator、环境。 |
| Scope | Windows x64 是否纳入；macOS/Linux 是否 caveat；updater 是否启用。 |
| Command evidence | 每条命令、结果、失败/重跑记录。 |
| Route matrix | 每个 route 的 desktop/narrow/privacy/state 结果。 |
| Tauri/package smoke | window controls、sidecar、port conflict、diagnostics、quit/reopen。 |
| Privacy audit | DOM/aria/screenshots/logs/export/release notes 的扫描结果。 |
| Blockers | P0/P1 blocker、release blocker、deferred caveat 分开列。 |
| Decision | `PASS`、`BLOCKED` 或 `PASS WITH CAVEATS`，并说明条件。 |

建议提交：`记录全局验收结论`。提交前必须运行与结论匹配的最终命令；提交后推送。

## 9. 推荐执行顺序

| 顺序 | 单元 | 理由 |
| --- | --- | --- |
| 1 | 证据库存与台账重新分类 | 先确认当前状态，避免用过时 ledger 指导最终验收。 |
| 2 | 自动化治理补强 | 把可自动发现的问题先固化，减少人工 smoke 返工。 |
| 3 | 全 route 浏览器验收 | 先验证前端主路径和 synthetic data，不进入昂贵 packaging 前置。 |
| 4 | a11y/visual/responsive | 在 route 矩阵稳定后补 UI 证据和页面评分。 |
| 5 | `pnpm verify` 全量门禁 | 浏览器/UI 修复完成后跑完整 source gate。 |
| 6 | Tauri dev smoke | 验证真实桌面窗口、titlebar、sidecar 行为。 |
| 7 | `cargo test` + `pnpm tauri build` | 进入安装包 smoke 前先保证 Rust/Tauri 和 package build。 |
| 8 | release sidecar/updater checks | 先明确 artifact gate，再写 release 状态。 |
| 9 | packaged smoke + privacy audit | 当前安装包真实验收。 |
| 10 | 全局报告和 go/no-go | 基于证据做最终判断并提交推送。 |

## 10. 文件范围总表

| 类型 | 文件/模块 | 说明 |
| --- | --- | --- |
| 正式计划 | `docs/next-repair-baseline-step-10-global-acceptance-repair-plan.md` | 本文件。 |
| 验收报告 | `docs/next-repair-baseline-step-10-global-acceptance-evidence.md` | 建议新增，记录执行证据和 go/no-go。 |
| 问题账本 | `docs/next-repair-baseline-ux-ledger.md`、`docs/next-repair-baseline-inspector-architecture.md` | 更新过时状态和剩余证据。 |
| Release docs | `docs/release/ready-desktop-app.md`、`docs/release/release-governance.md`、`docs/release/privacy-audit.md`、`docs/release/sidecar-artifacts.md` | 只按当前候选证据更新。 |
| Productization evidence | `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/release-evidence.md` | 当前 candidate evidence。 |
| E2E/fixtures | `e2e/specs/*`、`e2e/utils/*`、`e2e/mock-chatlog-server/*`、`e2e/fixtures/*` | 补 synthetic route/state/privacy/a11y/visual 覆盖。 |
| Governance scripts | `scripts/ui-governance.test.mjs`、`scripts/architecture-boundary.test.mjs`、`scripts/validate-e2e-fixtures.mjs`、release check scripts | 仅在验收发现自动化缺口时修改。 |
| Source fixes | `src/**`、`src-tauri/**` | 只有验收发现 blocker 时触碰；必须小修、测试先行、单独提交。 |

避免触碰：

- 真实本地聊天数据、真实日志、sidecar binaries、`dist/`、`node_modules/`、`test-results/`、`output/`。
- `src-tauri/capabilities/*` 和 CSP，除非验收证明必须变更，并在 release evidence 中解释原因。
- `chatlog_alpha` backend contract，除非用户另开任务明确要求。

## 11. 验证命令

### 11.1 本计划文档验证

| 检查 | 命令/方法 |
| --- | --- |
| 文件存在 | `Test-Path docs/next-repair-baseline-step-10-global-acceptance-repair-plan.md` |
| 未完成标记 | 扫描常见英文和中文未完成占位词；阻塞项要写成明确状态，不写占位。 |
| 无代码倾倒 | 扫描 fenced code block；本文不应包含完整生产代码。 |
| 关键章节 | 扫描“目标结论、当前开发进度事实、证据分级、全局验收契约、推荐实现任务、验证命令、完成定义、提交与推送节奏”。 |
| 隐私 | 扫描 raw private markers、real path、key/token 示例；只允许明确 synthetic 或命令名。 |

### 11.2 代码/验收实现阶段命令

| 阶段 | 命令 |
| --- | --- |
| Focused unit/governance | 按变更运行对应 Vitest 或 `scripts/*.test.mjs`。 |
| Fixtures | `pnpm fixtures:check` |
| Browser core | `pnpm e2e` |
| Accessibility | `pnpm e2e:a11y` |
| Visual | `pnpm e2e:visual` |
| Frontend full gate | `pnpm verify` |
| Rust | `cd src-tauri && cargo test` |
| Package build | `pnpm tauri build` |
| Sidecar release gate | `pnpm release:check:sidecar:release` |
| Updater gate | `pnpm release:check:updater`，或记录 updater-disabled policy。 |
| Tauri dev smoke | `pnpm tauri dev` 后执行窗口控制、sidecar、quit/reopen、port conflict 检查。 |
| Packaged smoke | 安装当前 Windows x64 artifact 后执行 install/open/quit/reopen/diagnostics/unknown-port。 |

命令失败处理：

- 记录完整失败命令、退出码、错误摘要。
- 不重复同一失败动作超过一次；第二次必须变更策略。
- 如果失败是 release blocker 而非代码 bug，写入 release dashboard，不把它包装成通过。

## 12. 验收矩阵

| 验收项 | 通过标准 |
| --- | --- |
| 问题 ID closure | 原 P0/P1/P2 每项都有当前状态、证据等级、命令或 smoke 链接；旧事实不再误导。 |
| 用户主路径 | 首启连接服务、进入工作台、浏览会话、搜索定位、查看独立页面、设置/诊断都能完成主任务或清楚说明缺失前提。 |
| 状态覆盖 | loading、empty、error、disabled、success、partial、cancelled、timeout、stale、privacy、narrow 在适用模块中有证据。 |
| 信息架构 | primary workspace rail 唯一；toolbar 不回归滚动模块页；inspector 不承载完整一级模块；Settings/Developer 不进入普通 rail。 |
| 隐私 | DOM、aria、tooltip、diagnostics、copy/export、screenshots、logs、release notes 不含 raw path、`wxid`、key/token、private content。 |
| 微交互 | Icon commands 有 tooltip 或明确 label；disabled controls 有 reason；风险动作有确认和结果反馈。 |
| 可访问性 | axe serious/critical 无阻塞；关键键盘路径可达；dialog/sheet/drawer/safe-open 具备焦点生命周期。 |
| 响应式 | 390x844 和 1366x900 route matrix 无水平溢出，主操作可达，长文本不遮挡。 |
| 视觉 | 高可见页面 page score 不低于 16/20；visual snapshots 或人工截图只用 synthetic/privacy-safe 数据。 |
| 架构 | L1/L2/L3/L4 边界守住；无 L1/L3 raw network；无 L4 到 L2/L3 依赖；治理测试通过。 |
| Tauri dev | 当前分支真实窗口 controls、drag/no-drag、close cleanup、sidecar health、unknown port recovery 有证据。 |
| Packaged smoke | 当前 Windows x64 artifact install/open/quit/reopen/diagnostics/port conflict 有证据。 |
| Release artifact | sidecar provenance、updater policy/metadata、privacy audit、checksums、platform caveats、owner signoff 状态明确。 |

## 13. 完成定义

第十步完成必须同时满足：

1. 新增并提交本计划文档。
2. 若执行验收，新增或更新全局验收证据报告，且每条“通过”结论都有本轮命令或 smoke 证据。
3. `docs/next-repair-baseline-ux-ledger.md` 和 inspector architecture 相关结论不再保留明显过时的 Step 01-09 前源码事实。
4. 全 route 浏览器验收覆盖 Setup、Workbench、Search、Analytics、Media、SNS、AI、Graph、Settings 的 desktop/narrow/privacy 代表状态。
5. `pnpm fixtures:check`、`pnpm e2e`、`pnpm e2e:a11y`、`pnpm e2e:visual`、`pnpm verify` 按当前改动范围运行并记录结果。
6. Tauri/Rust/release 相关验收至少运行 `cd src-tauri && cargo test`、`pnpm tauri build`，并补 `pnpm tauri dev` smoke 或明确当前环境阻塞。
7. Windows x64 packaged smoke 对当前构建产物刷新；如果未运行，release status 必须是 `BLOCKED` 或 `needs-packaged-smoke`。
8. `pnpm release:check:sidecar:release` 和 updater policy/`pnpm release:check:updater` 状态明确；不能忽略失败。
9. 当前 candidate privacy audit 完成或明确阻塞；没有私密路径、密钥、真实聊天内容进入证据。
10. 所有验收中发现的 P0/P1 blocker 已拆小修复，短中文提交，验证后及时推送；未修复 blocker 有明确 owner/下一步/阻塞状态。
11. 最终结论写为 `PASS`、`PASS WITH CAVEATS` 或 `BLOCKED`，不能用模糊语言替代。

## 14. 提交、推送和 PR 节奏

第十步特别要求及时提交和推送，不允许最后一股脑提交或合并。

| 单元 | 中文提交标题示例 | 推送要求 |
| --- | --- | --- |
| 第十步计划 | `撰写全局验收修复计划` | 文档扫描通过后立即提交并推送。 |
| 证据库存 | `盘点全局验收证据` | ledger/report 更新扫描通过后立即提交并推送。 |
| 治理扫描 | `补全全局验收治理扫描` | focused governance + lint/typecheck 通过后提交并推送。 |
| Route/E2E | `补全全局路由验收` | fixtures + e2e 通过后提交并推送。 |
| A11y/visual | `补全全局视觉与可访问性验收` | a11y/visual 通过并人工确认 snapshots 后提交并推送。 |
| Tauri smoke | `补Tauri桌面壳验收证据` | Tauri dev smoke 记录后提交并推送；若有代码修复，单独提交。 |
| Packaged/release | `补安装包发布验收证据` | package/release gates 和 smoke 结果记录后提交并推送。 |
| Final decision | `记录全局验收结论` | 最终命令证据齐全后提交并推送。 |

如果已有修复基线 PR，需要在每次推送后更新 PR 说明或评论中的证据。没有 PR 时，只有在用户明确要求、远端 CI/协作审查需要、或 release governance 需要审查边界时创建或更新 PR。

如果工作树出现无关改动，先确认提交范围，只 stage 当前验收单元文件；不要回滚用户改动。

## 15. 风险和缓解

| 风险 | 表现 | 缓解 |
| --- | --- | --- |
| 历史证据误当当前证据 | release-evidence 中 2026-06-01/06-03 记录被当成当前通过。 | 所有 Step 10 结论必须写当前日期、branch、commit、package；历史证据只能作为参考。 |
| 验收变成大而全代码重构 | 发现多个 blocker 后一次性改许多模块。 | 每个 blocker 单独失败测试、单独小修、单独中文提交推送。 |
| Updater gate 模糊处理 | `latest.json` 缺失但仍写 release ready。 | 明确 updater-disabled policy 或生成并验证 metadata；失败即 release-blocked。 |
| Packaged smoke 环境不足 | 本地无法安装/启动当前产物。 | 记录环境阻塞，状态写 `needs-packaged-smoke`，不声明 release ready。 |
| 隐私扫描误伤 synthetic tests | redaction tests 需要 secret-like synthetic markers。 | 使用明确 `Synthetic` 命名和 test-data policy，扫描区分真实和 synthetic。 |
| Visual snapshot 变成形式主义 | snapshots 通过但页面任务仍不清楚。 | 同时做 page score、route matrix 和人工截图检查；低于 16/20 不标绿。 |
| Tauri smoke 只看窗口不看 sidecar | window controls 通过但 sidecar cleanup 未验。 | Tauri dev smoke 必须包含 `/health`、quit cleanup、unknown port。 |
| Release docs 与实际 scripts 不一致 | docs 写 blocked/pass 与 `scripts/release/*.json` 或命令结果冲突。 | 以命令输出为准更新 docs；不手写 updater manifest 或 checksum。 |

## 16. 后续步骤衔接

第十步执行后有三种可能：

| 结果 | 下一步 |
| --- | --- |
| `PASS` | 可按用户要求进入合并/PR/release candidate 流程；仍需遵守 release governance。 |
| `PASS WITH CAVEATS` | Windows x64 或 source/UI 可接受，但 macOS/Linux/updater/packaged smoke 等 caveat 明确不在当前交付范围。 |
| `BLOCKED` | 不进入 release；按 blocker 列表继续小步修复、提交、推送和复验。 |

无论哪种结果，都必须把剩余假设写入验收报告、release evidence 或 PR body。全局验收不能靠聊天上下文记忆延续。

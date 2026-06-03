# Findings: chatlogUI 审计

本文件记录本次 UI/功能审计中的源码、运行时和原始项目对照发现。

## 初始结论
- 目标：全面列出当前 UI 和功能问题，并给出按轻重缓急排序的补全修改规划。
- 重点：UI 设计质量、Apple 风格交互、与 chatlog_alpha 原始流程/能力的一致性、首次启动和本地配置流程。

## 仓库结构
- 当前 UI 仓库是 React 18 + Vite 6 + Tauri v2，入口在 `src/main.tsx` / `src/App.tsx`，Tauri 后端在 `src-tauri/src`。
- 前端使用自定义 L1/L2/L3/L4 分层，组件和 commander/store/network atom 数量较多。
- `vite.config.ts` 固定开发端口为 1420，Tauri/后端相关端口另在常量和 Rust sidecar 中定义。
- 项目根下已有 `chatlog/` 目录，外部 `E:\OneDrive - Default Directory\chatlog_alpha` 也存在完整 Go 项目与 `chatlog.exe`。

## 运行与集成发现
- `pnpm typecheck`、`pnpm lint`、`pnpm build` 均通过，但 `GraphCanvas` 构建 chunk 约 1,036 KB，存在首用加载和内存压力问题。
- 当前 Web 首屏停在“未找到微信数据目录”；`detectWxPath.ts` 直接返回空数组，自动检测未实现。
- “跳过”按钮会 `navigate("/dashboard")`，但 `DashboardView` 发现 `appPhase !== "ready"` 后立即重定向回 `/`，按钮实际无效。
- 项目已有 sidecar 运行日志显示 `start db failed: unsupported platform:  v0`。原因是 UI 调用 `chatlog serve --data-dir --data-key` 时没有传入/加载 `type/platform/version/full_version/img_key`；原始 `LoadServiceConfig` 只有在 `data_key` 为空时才会从 `dataDir/chatlog.json` 补充这些字段。
- `killPort()` 会无条件杀掉 5030 端口占用者，可能误杀用户手动启动的 chatlog_alpha 服务，且没有确认、归属判断或恢复方案。
- 当前 HTTP `/health` 在 DB 不可用时仍返回 `{status:"ok"}`，前端把“进程健康”和“数据可查询”分成两步是必要的，但 UI 没有清楚表达两者区别。

## API 合约发现
- 原始 HTTP API 默认输出 YAML；前端多数请求没有追加 `format=json`，但直接 `response.json()`，会在默认路径上解析失败。
- 前端 `contacts/history/stats/search/semantic` 类型大量使用 camelCase；原始 API 返回多为 snake_case 或完全不同字段：如 `total_count`、`is_group`、`sent_count`、`by_type`、`username`、`nickname`、`is_friend`。
- `/api/v1/contacts` 原始返回 `{count, contacts}`，`/api/v1/chatrooms` 返回 `{count, chatrooms}`，没有前端期望的 `sessions` 合并包；会话列表应来自 `/api/v1/sessions`。
- `/api/v1/history` 输出消息没有 `isSelf/seq/id/mediaUrl` 等前端期望字段，消息气泡左右方向、key、媒体渲染都会失真。
- `/api/v1/search` 参数是 `keyword/chats/time/since/until/msg_type/offset/format`，前端传 `chat/timeStart/timeEnd/type`，过滤基本不生效。
- `/api/v1/semantic/config` 原始返回扁平配置字段，前端期望 `data.config`；因此 AI 初始化会误判为未配置。
- `/api/v1/semantic/test` 返回 `{ok,error}`，前端读取 `{success,message}`；测试连接结果会显示错误状态或错误文案。
- `/api/v1/semantic/index/status` 返回 `ready/running/paused/processed/pending/progress_pct/last_error`，前端期望 `status/completed/error`；索引状态判断会失效。
- `/api/v1/semantic/qa/stream` SSE 事件名是 `delta/done/error`，数据为 `{text}` 或完整 payload；前端忽略 event name，只解析 `data` 为 `{type:"token"}`，流式问答无法稳定显示。

## UI/功能审计补充结论
- 当前 UI 的核心问题是信息架构与真实工作流错位：首屏没有呈现 chatlog_alpha 必需的本地配置、服务连接、数据库校验和索引构建步骤。
- 当前视觉是表面化的 Apple/macOS 风格：假窗口灯、emoji 图标、玻璃卡片和浮动 3D 面板较多，但缺少 Apple 式的清晰层级、稳定控件、渐进式引导和高质量状态反馈。
- Settings 默认进入 AI 模型设置，和首次启动最重要的数据/服务配置相冲突。
- Dashboard 把联系人、消息、统计、AI、图谱挤在一个固定三栏内；窄屏和半屏窗口不可用，也不适合长期浏览聊天记录。
- 图谱应从默认浮窗改成独立分析模块；3D 视图应作为可选模式，并提供表格/时间线替代视图。
- 隐私模式目前只是局部遮罩，未覆盖路径、key、日志、图谱标签、搜索结果、设置和导出。
- 原始 chatlog_alpha 的 sessions、SNS、hook/push、wx-cli 兼容、媒体、DB/SQL、语义索引、图谱 ingest/QA 等能力未完整覆盖。

## 产出文档
- 完整问题指南与重构规划已写入 `docs/ui-functional-audit-and-redesign-plan.md`。
- P0 单独修复规划已写入 `docs/superpowers/plans/2026-05-29-p0-startup-foundation-refactor.md`。
- P0 代码审查后确认：`detectWxPath.ts` 仍返回空数组，但 P0 已改为 Setup Center 的手动导入/高级配置路径，不再依赖自动检测。自动扫描微信目录更适合放入 P1 的“会话/数据接入完善”阶段处理。

## P1 规划发现
- `tsconfig.json` 已覆盖 `@l2/*` 到 `src/l2-coordinator/*`，因此 `@l2/data-clerk/types/setup` 不需要新增路径别名；P1 继续用 `pnpm typecheck` 验证即可。
- P0 后的 workbench 入口已经由 `WorkbenchShellView` 守卫，但 `DashboardView`、`ContactList`、`useChatCommander` 仍使用旧聊天数据模型，DB ready 后仍会进入旧 fetcher 契约问题。
- 原始 `/api/v1/sessions` 返回 `{sessions}`，字段为 `chat/username/is_group/chat_type/summary/timestamp/time` 等；当前 UI 没有调用该 endpoint，却把 sessions 当作 `/contacts` 响应的一部分。
- 原始 `/api/v1/contacts` 返回 `{count, contacts}`，`/api/v1/chatrooms` 返回 `{count, chatrooms}`；当前 `ContactsResponse` 和 `fetchChatRooms()` 的返回假设仍不匹配。
- 原始 `/api/v1/history`、`/api/v1/search`、`/api/v1/stats` 均返回 snake_case 字段；当前 UI 仍直接读取 camelCase 字段，且 search/stats 参数名仍与后端不一致。
- 原始 `/api/v1/dashboard/trend` 使用 `window/summary` 并返回 `daily/topics/mentions/summary`，当前 `fetchDashboardTrend()` 仍按 `chat/timeStart/timeEnd` 和 `points` 建模。
- 当前 `MessageBubble` 依赖 `isSelf`，但兼容 history/search 输出没有逐条 `is_self` 字段；P1 应改为可信的中性 transcript 或引入明确 self 来源后再做左右气泡。
- P1 独立修复规划已写入 `docs/superpowers/plans/2026-05-29-p1-core-chat-workbench-refactor.md`，并把 `detectWxPath.ts` 硬编码空数组、旧 fetcher 契约偏差、浏览器 smoke 未完成纳入 P1。

## P2 规划发现
- P1 后核心数据路径已可作为 UI 重构地基，但视觉结构仍保留旧问题：`DashboardView.tsx` 仍把会话、搜索、聊天、统计、AI、图谱放在一个固定三栏中，`dashboardLayout.ts` 在 980px 以下仍返回三栏 grid。
- `AppLayout.tsx` 仍使用假 macOS 窗口灯和 emoji 命令按钮，这与 Windows/Tauri 桌面语境和专业工具体验冲突。
- `SetupCenterView.tsx` 功能已经接近正确，但视觉仍是临时 Tailwind 灰白三栏，需要在 P2 作为正式 Setup Center 重构，而不是只做局部美化。
- `SettingsView.tsx` 仍返回 `/dashboard`，P2 应统一 canonical route 为 `/workbench`，保留 `/dashboard` 只作为兼容入口。
- `AppleButton.tsx`、`Typography.tsx` 和 `GlassPanel.tsx` 暴露出设计系统不足：硬编码颜色、默认 pill、负字距、过度 blur 和过大圆角。
- `GlassPanel` 已在 settings、stats、semantic 等组件中广泛使用。P2-A 应先禁止新增引用，并通过 `Surface` 等新 primitive 逐步替换。
- AI 和图谱在 P2 不应继续作为聊天右栏/浮层展示；P2 先做模块入口和状态隔离，后端合约完整修复留给 P3。
- P2 任务量明显大于单次安全改动，已拆成 P2-A 到 P2-E；第一阶段 P2-A 应优先完成 tokens、基础控件、App shell、WorkbenchFrame、Setup Center 与 Settings 地基。
- P2 独立修复规划已写入 `docs/superpowers/plans/2026-05-29-p2-apple-like-ui-system-refactor.md`。

## 2026-05-29 P2-A 执行前发现
- 当前工作树位于 `master`，但已经包含 P0/P1/P2 规划和实现相关的大量未提交/未跟踪文件；P2-A 必须基于这些当前文件继续，不能从干净 worktree 重新开始，否则会丢失现有上下文。
- `.worktrees` / `worktrees` 目录以及 `CLAUDE.md` / `GEMINI.md` / `AGENTS.md` 均未发现。鉴于当前未提交改动是本阶段上下文的一部分，执行前应优先在当前工作树切换到 `codex/p2-a-ui-foundation` 分支，而不是创建不含这些改动的新 worktree。
- P2 计划明确第一轮只执行 P2-A：视觉基线、图标能力、tokens、基础控件、App shell、WorkbenchFrame、Setup Center 第一轮、Settings 地基与验证。
- 已补读历史开发文档：`开发指南.md`、总体开发规划、Sprint 1/2/3 规划、Sprint 4/5a/5b/6 specs 与 plans、P0/P1/P2 独立计划。早期文档要求的假 macOS 交通灯、端口猎杀、大量 glassmorphism 与当前 P0/P2 修复方向冲突；以较新的 P0/P1/P2 审计和计划为准。
- P0/P1 已形成当前 P2 地基：安全端口策略、Setup Center、外部服务连接、完整配置保存、`requestJson(format=json)`、raw DTO adapter、conversation-first 数据模型、WorkbenchShell gate、`detectWxPath` Tauri 接入。

## 2026-05-29 P2-B 规划发现
- `task_plan.md` 已将 P2-A 标记为完成；P2-B 现在不需要重做 shell/foundation，应继承 P2-A 的 WorkbenchFrame、新 tokens、基础控件和 Settings/Setup 第一轮视觉地基。
- P2 总规划中 P2-B 的边界是 Core Workbench Polish：会话列表、聊天 transcript、搜索区、统计 inspector。AI/Graph 隔离仍归 P2-D，Settings/Diagnostics 归 P2-C。
- P1 handoff 提醒 P2 还需要 full responsive workbench refinement、AI/Graph 后续规划、bundle splitting 等，但 P2-B 只处理核心聊天工作台内容区，不能把 P3/P4 功能提前混入。
- `开发指南.md` 与旧总体规划中的四层 Mediator、聊天/搜索/统计 MVP 目标仍有效；但假 macOS 交通灯、前置端口猎杀和大面积 glassmorphism 已被后续 P0/P2 审计修正，P2-B 应以最新审计和 P2-A 结果为准。
- Sprint 2 的原始聊天/搜索/统计规划要求虚拟滚动、分页、搜索结果跳转和统计图表；P1 已修正真实 API 合约，P2-B 应把这些功能从“可用”推进到“稳定、可读、可键盘操作、响应式不挤压”。
- Sprint 3/4/5/6 文档中的 AI、图谱浮层、设置、隐私、开发者控制台、更新发布均是相邻阶段依赖；P2-B 仅保留现有入口，不扩展这些模块。
- 当前源码状态：`DashboardView.tsx` 已接入 `WorkbenchFrame`，但仍内联 `StatsInspector`，toolbar 内混放 `GlobalSearch`、`FilterBar`、`SearchResults`；`ContactList` 仍使用 per-row `framer-motion`；`MessageBubble` 对 unknown direction 仍会经 `isSelf=false` 渲染为对方气泡；`DashboardOverview`、`TrendChart`、`TopContactCard` 仍引用 `GlassPanel`。

## 2026-05-29 Code Review 修复发现
- `Code review.md` 提出 6 个 urgent issue：L1 仍承担业务编排、缺少 `WorkbenchView` 根组件、Graph 仍为浮层且仍有 emoji、single 模式无法返回会话列表、设计系统未统一进 Setup/Settings/Stats/Semantic、Workbench 全局导航 active 状态不稳定。
- 同一文件提出 3 个 improvement：触控目标过小、UI 回归测试缺口、GraphCanvas chunk 仍超过 Vite 500 kB warning。
- 本轮文档优先级：最新 `Code review.md`、P2-A/P2-B/P2 总规划和 `findings.md` 的 P2 结论优先于早期 Sprint 3/4/5 中 “AI/Graph 作为 Dashboard 右栏/浮层” 的旧集成方式；`开发指南.md` 的四层 Mediator 边界仍是硬约束。
- 已确认当前工作树存在既有计划文件修改和未跟踪 `Code review.md` / P2-B 计划文档；这些内容属于当前上下文，不应回滚。
- 修复后源码扫描确认：`DashboardView` 仅为 `WorkbenchView` 兼容 wrapper；`WorkbenchShellView` 在 `dbReady` 时渲染 `WorkbenchView`；Graph 不再通过 `graph.visible && <LazyGraphCanvas />` 从 L1 fixed overlay 渲染；Settings/Stats/Semantic 可见模块不再引用 `GlassPanel`。
- `pnpm build` 后 Graph 仍超过 500 kB，但 chunk 名称已变为 `GraphModule-*.js`，说明大依赖集中在按需 Graph 模块，不再并入普通 workbench 主 chunk。

## 2026-05-30 P2-B 计划二次复核发现
- 当前源码已经包含 Code Review Remediation 的结果：`DashboardView` 只作为 `WorkbenchView` wrapper，`WorkbenchShellView` 在 DB ready 时渲染 `WorkbenchView`，ready-workbench 编排已下沉到 `useWorkbenchCommander`。
- 因此 P2-B 计划中原本关于“抽出 inline StatsInspector、清理 stats GlassPanel、修正 WorkbenchFrame drawer scrim、补 single 模式返回会话列表”的部分已经不再是待实施起点，必须改为基线验证。
- P2-B 剩余核心风险集中在 chat/search/stats 内容层：`ContactList`/`ContactItem` 仍有 per-row motion 和旧命名；`MessageList` 仍有 `column-reverse`、scroll listener 和 unknown direction 误导；`SearchResults` 仍无 scope、active result、error/empty states；stats 还缺 helper 测试和更明确的 metric-row/table fallback 结构。
- `WorkbenchView` 目前向 `ContactList` 传入 `onConversationOpened` 以维持 single-pane list/detail 状态。P2-B 的 `ContactList` compatibility wrapper 必须继续透传该 prop，否则移动宽度下选择会话后状态不会切到 detail。
- `ContactItem.tsx` 在 `ConversationRow` 落地后应删除，避免旧 motion row 继续留在 workbench 会话列表路径中。
- P2-B 修订后的执行入口应改为 `WorkbenchView`，不是 `DashboardView`；`DashboardView` 只需要验证保持 wrapper。

## 2026-05-30 P2-B 实施发现
- 会话列表已可改为 `ConversationList`/`ConversationRow`，并保留 `ContactList` 兼容 wrapper；`onConversationOpened` 透传是 single-pane 移动宽度切到 detail 的关键路径。
- transcript 的旧 `isSelf=false` 默认会把 unknown direction 误渲为对方气泡；P2-B 通过 `getTranscriptTone()` 将 unknown 明确映射为 neutral，避免伪造方向。
- 搜索 scope 应在 L2 `createSearchRequest()` 转换为后端 `chats` 参数，UI 只暴露 all/current conversation；搜索结果 active state 可以先保持结果高亮，精确消息锚点仍需后续消息索引能力。
- stats inspector 在窄侧栏里更适合 metric rows；当趋势点超过 14 个或 inspector 宽度低于 300px 时应切换为表格 fallback，保证可读和可访问。
- ready-workbench 浏览器 mock 暴露一个独立运行时问题：`useAiCommander()` 的 current-chat reset effect 依赖整个 Zustand store 对象，`setSearchResults(null)` 会造成 store 对象变化并触发 maximum update depth。修复方式是只依赖 `currentChat`，并通过 `useAiStore.getState()` 取稳定 actions。
- 本轮浏览器 smoke 覆盖 `/`、`/workbench`、`/settings` 的 1440/1180/900/768/390 宽度；未观察到 horizontal overflow。mock DB ready 状态下桌面 workbench 渲染 2 条会话、3 条 neutral message、6 个 stats metric rows 和 18 行趋势表格 fallback；390 宽度先显示会话列表，选择后进入详情并保留返回会话列表路径。

## 2026-05-30 P2-B 综合审查发现
- P2-B 核心 workbench polish 已明显推进，但不能判定为满足所有阶段、项目、UI、产品化和发布要求。
- 隐私模式仍通过非可视 accessibility surface 泄露会话名：`ConversationRow` 的 `aria-label` 与 `Avatar alt` 使用 raw `displayName`，需要和可视文本使用同一 masking policy。
- 长历史仍只是分页追加，`MessageList` 渲染所有已加载消息；不满足 10,000-message conversation 的产品化验收，需要虚拟列表或等效 bounded-DOM 策略。
- 当前 L3 仍广泛读取 L2 store/commander，部分 L3 直接调用 L4 system atom；这符合部分既有实现习惯，但不符合 `开发指南.md`/总体规划最严格的 Mediator 边界。
- Stats 趋势表格 fallback 没有接入真实 inspector 宽度，`TrendChart` 默认使用 `320`，`StatsInspector` 未传入测量值。
- Setup Center 的 `选择微信数据目录` 仍是 raw Tailwind button，浏览器矩阵中实际目标高度约 20px，和新设计系统/触控目标要求不一致。
- 密码输入没有 form 语义，浏览器 smoke 输出 password-field-not-in-form 警告；需要修复设置、手动配置、AI/semantic credential 输入。
- semantic、graph、DevConsole、UpdateNotification 中仍有 legacy `AppleButton`/motion；这属于 P2-C/P2-D/P2-E 的全局 UI 一致性债务。
- 搜索已经有 scope 和 active result，但还缺 invalid/cancelled 状态，以及目标消息未加载时的诚实跳转说明。
- `GraphModule` 仍有 >500 kB build warning；当前为 lazy chunk，非 P2-B 阻塞，但需要 P2-D/P2-E 性能记录。
- Browser smoke 出现 `favicon.ico` 404，应作为 polish 项清理。
- `vite.config.ts` 与 Tauri devUrl 硬编码 1420/1421；本机 Windows excluded port range 包含 1420，导致 `pnpm dev` 在 canonical port 上失败，应制定 dev port 策略。
- 完整记录已写入 `docs/reviews/2026-05-30-p2-b-comprehensive-review.md`；完整修复计划已写入 `docs/superpowers/plans/2026-05-30-p2-b-comprehensive-remediation.md`。

## 2026-05-30 P2-B 修复后复核发现
- 用户表示已根据修复计划处理后，本轮复核发现源码层面的关键阻塞项仍存在；因此不删除综合审查记录和修复计划。
- `pnpm verify` 通过：Vitest 40 files / 256 tests passed，build 通过，但仍有 `GraphModule-BddO-upw.js` >500 kB warning。
- 隐私 accessibility 泄露仍存在：`ConversationRow` 的 `aria-label` 和 `Avatar alt` 仍使用 raw conversation displayName。
- 长历史虚拟化仍未实现：`transcriptRows.ts` 缺失，`MessageList` 仍直接 map 全量 message groups，`package.json` 未引入 `@tanstack/react-virtual`。
- Stats narrow fallback 仍未接入真实宽度：`StatsInspector` 仍调用 `<TrendChart data={trend} />`。
- Setup/credential UI 问题仍存在：`ConfigImportPanel` 仍使用 raw `<button>`，密码输入仍未完成 form-scoped remediation。
- 产品化证据仍缺失：`docs/release/ready-desktop-app.md` 与 `specs/001-ready-desktop-app/architecture-boundary-check.md` 不存在，Spec Kit tasks 仍为 42 unchecked / 0 checked。
- Dev port 问题仍存在：Vite/Tauri 仍配置 1420/1421。

## 2026-05-30 P2-B Suggested Fix 实施后发现
- 已按修复计划清理主要 P2-B 阻塞项：privacy accessibility masking、long-history transcript row virtualization、stats inspector actual-width fallback、setup raw button、password form semantics、search invalid/empty状态、dev port 1420/1421 和 release evidence/checklist 缺口。
- `@tanstack/react-virtual` 已引入并接入 `MessageList`；新增 `transcriptRows.ts` 与 10,000-message row-count 回归测试，避免长历史继续全量 DOM 渲染。
- `ConversationRow` 的 `aria-label` 与 avatar alt 已与隐私模式对齐；新增测试覆盖 privacy-on aria label masking。
- `ConfigImportPanel` 已迁移到 L4 `Button` primitive；设置/手动配置/semantic credential 密码输入已补 form scope 与 `autoComplete="off"`。
- Vite/Tauri canonical dev port 已迁移到 `5173`，HMR websocket 迁移到 `5174`，`AGENTS.md` 同步更新。
- 新增 `specs/001-ready-desktop-app/release-evidence.md`、`specs/001-ready-desktop-app/architecture-boundary-check.md` 与 `docs/release/ready-desktop-app.md`；Spec Kit tasks 中 T003/T009/T041 已标记完成。
- 完整验证通过：`pnpm verify` PASS（41 files / 262 tests），`cargo test` PASS（16 tests），`pnpm tauri build` PASS 并生成 MSI/NSIS x64 bundles。
- 仍保留后续债务：严格 Mediator 边界下 L1/L3 仍有 store/commander/system 直连需要后续 cleanup；semantic/graph/common legacy UI 仍归 P2-C/P2-D/P2-E；GraphModule lazy chunk 仍超过 500 kB；Windows 安装、退出、重开和端口冲突人工 smoke 仍未完成。

## 2026-05-30 P2-C 规划发现
- `specs/000-productization/*` 在当前仓库不存在；P2-C 产品化依据应以 `.specify/memory/constitution.md`、`specs/001-ready-desktop-app/*`、`docs/release/ready-desktop-app.md` 和 P2/P2-B 文档为准。
- P2-C 应继承 P2 总规划中的 Settings And Diagnostics 边界：设置中心、诊断面板、状态反馈、隐私表现统一；AI/Graph 的功能合约和模块隔离继续留给 P2-D/P3，发布安装 smoke 继续留给 P2-E/release gate。
- 当前 Settings 已有 `/settings`、`SettingsLayout`、data/appearance/ai/about 四分类和 `Surface` 基础，但 `SettingsView` 仍在 L1 读取 `useAppStore` 与 `useAiCommander`，`SettingsLayout`/settings molecules 仍直接调用 `useSettingsCommander`，需要在 P2-C 计划里定义可接受的 staged boundary cleanup。
- `DataSettings.tsx` 和 `ConfigImportPanel.tsx` 仍直接调用 L4 `openDirectoryPicker`，与 AGENTS/constitution 的“L3 通过 L2 Commander 接收回调”冲突；P2-C 应把目录选择收敛到 setup/settings commander。
- `DiagnosticPanel.tsx` 直接展示 `configDir`、`dataDir`、`workDir` 和 raw error；`DevConsole` 导出日志通过 `alert()` 反馈，Rust `export_logs_command` 直接写入传入日志，尚未统一 redaction/fail-closed 诊断包契约。P2-C 必须建立诊断摘要模型、copy/export 入口和 redaction tests。
- `maskSecrets.ts` 当前只覆盖 `data_key/img_key` 的少量 JSON/query 形态，不覆盖 API key、token、credential-like 值、message snippets 或敏感路径片段；这不满足 ready-desktop-app diagnostic package contract。
- `StatusIndicator` tone 仍是 `neutral/success/warning/danger/accent`，P2 总规划要求统一为 `neutral/info/success/warning/danger/ai`；`StatusBar` 仍使用旧 index status 字段 `building/completed/total`，需要兼容真实 semantic status 并避免误导。
- `ServiceControlPanel`、`ReadinessChecklist` 和部分 setup feedback 仍有 raw Tailwind button/status row；P2-C 可在不重做 Setup Center 的前提下，把服务控制、readiness、错误状态迁移到 tokenized Button/StatusIndicator/ReadinessStatePanel。
- `AboutSettings` 的 app 版本目前硬编码 `1.0.0`，未区分 package version、Tauri config version、sidecar version/source；P2-C About 应诚实展示可取得的版本和“不可用/待检测”状态。

## 2026-05-30 P2-C 二次复核发现
- `.specify/memory/constitution.md` 对 P2-C 最关键的约束是：本地私有数据不外泄、L1/L2/L3/L4 边界可执行、所有用户可见流程必须有 loading/empty/error/success/recovery、诊断与调试必须基于证据。
- `specs/001-ready-desktop-app/spec.md` 将 Settings/Privacy/Release Readiness 归为 US6/P1；P2-C 应优先覆盖 FR-017 到 FR-021、FR-020a 和 SC-008b，不能把 P2-D 语义或图谱能力混入本阶段。
- `specs/001-ready-desktop-app/contracts/diagnostics-package.md` 明确诊断包只能由用户触发，不能自动收集；导出必须排除 raw dataKey、API key、token、消息正文、未脱敏身份和敏感本地路径；脱敏失败时必须阻止导出。
- `specs/001-ready-desktop-app/contracts/app-readiness.md` 定义统一状态为 `idle/loading/empty/success/error/conflict/cancelled`，P2-C 计划中的 `ReadinessState` 和 `StatusIndicator` tone 迁移方向与此一致。
- `specs/001-ready-desktop-app/tasks.md` 的 US6 任务 T025-T030 仍未完成；P2-C 可处理 T025/T027/T028 的设置、诊断、隐私显示子集，但 T029/T030 的安装、退出、重开、端口冲突人工 smoke 仍必须留给 release gate/P2-E，不能在计划里误标完成。
- `docs/总体开发规划.md` 和 `开发指南.md` 的早期“前置端口猎杀”和假 macOS 视觉已被 P0/P2 后续规划修正；P2-C 应继承非破坏性端口策略和 token-driven 专业桌面工具方向。
- 当前源码确认 P2-C 计划点名的问题仍存在：`SettingsView.tsx` 直接读取 `useAppStore`/`useAiCommander`；`SettingsLayout.tsx`、settings/setup molecules 仍直接调用 commander/store；`DataSettings.tsx` 和 `ConfigImportPanel.tsx` 仍直接调用 `openDirectoryPicker`；`DiagnosticPanel.tsx` 直接展示 raw path/error；`DevConsole.tsx` 使用 `AppleButton`、`framer-motion` 和 `alert()`；`useDevConsoleCommander.ts` 直接 `invoke("export_logs")`；`StatusIndicator` 仍有 `accent` tone；`AboutSettings` 仍显示硬编码 `1.0.0`。
- P2-C 计划二次修订必须避免把 L4 `StatusIndicator` 反向依赖到 L2 `ReadinessTone`。L4 应保留独立 `StatusTone` union，L2 readiness 可以映射到同名 tone 字符串。
- 只新增安全 `export_diagnostics_report` 不足以满足隐私契约，因为现有 `export_logs` Rust 命令仍会写入传入日志。P2-C 计划已改为让 legacy `export_logs_command()` 也通过同一个 Rust fail-closed guard。
- `useDiagnosticsCommander` 不能用 `useMemo(..., [])` 从 Zustand `getState()` 取一次性快照，否则 setup/logs 变化后诊断摘要会陈旧；计划已改为使用 store selectors 和完整依赖。
- `SettingsLayout` 继续内部调用 `useSettingsCommander()` 会削弱 P2-C 的 L1 shell/L3 props 边界；计划已改为让 `SettingsView` 传入 `activeCategory` 和 `onCategoryChange`。
- AI 设置不能因为移除本地 `aiApiKey` 就假装凭据已保存。P2-C 计划已改为 Settings 只显示诚实凭据状态，不把 API key 写入 UI settings，也不把 `aiCredentialConfigured` 置为 true，除非后续从安全语义配置来源验证得到。

## 2026-05-30 P2-C 实施发现
- 当前 review suggested fixes 已转为源码修改，不再只是规划文件：新增 readiness model、diagnostics model、settings validation、diagnostic redaction 和 Rust log redaction 测试。
- `StatusIndicator` tone 已迁移到 `neutral/info/success/warning/danger/ai`，会话最近 badge 改用 `info`，`StatusBar` 对 semantic index 运行/暂停/错误/ready 使用更诚实的状态表达。
- 诊断导出改为用户触发的 `export_diagnostics_report`，前端 L4 `exportDiagnosticsReport()` 调 Rust command；legacy `export_logs` 也会经 `redact_log_payload()` 脱敏后写入，脱敏失败阻止导出。
- Setup 诊断面板现在使用 `DiagnosticsPanel`，默认脱敏本地路径、data/img key、API key、token、credential、Bearer 和 `wxid_*`。DevConsole 只导出脱敏摘要，不再 alert 或直接 invoke。
- UI settings 已移除 `aiApiKey` 字段；迁移旧 storage 时删除 `dataKey/aiApiKey` 并将 `aiCredentialConfigured` 置为 false。AI 设置只显示凭据状态，不保存 API key。
- `SettingsView` 不再直接读取 app store 或 AI commander；改为 `useSettingsPageCommander`。`DataSettings` 和 `ConfigImportPanel` 不再直接调用 L4 directory picker，统一经 setup/settings commander。
- Productization tasks T025-T028 已按当前实现标记完成；T029/T030 的 Windows install/quit/reopen/port conflict manual smoke 仍保持未完成。

## 2026-05-31 P2-D 规划启动发现
- 当前工作区位于 `codex/p2-c-settings-diagnostics-planning`，存在大量 P2-C 实施相关未提交改动；P2-D 规划应只追加/修改规划文档和工作记忆文件，不回滚或覆盖 P2-C 源码。
- `task_plan.md` 与 `progress.md` 均显示 P2-C planning 和 implementation 已完成；P2-D 的自然起点是 P2-A/P2-B/P2-C 后剩余的 semantic/graph containment、真实后端契约修复、GraphModule 性能记录和旧 AI/Graph UI 清理。
- `specs/000-productization/*` 在当前仓库不存在；P2-D 产品化依据继续使用 `.specify/memory/constitution.md`、`specs/001-ready-desktop-app/*`、`docs/release/ready-desktop-app.md`、P2 总计划、P2-B 综合审查/remediation 和 P2-C 计划/实施记录。

## 2026-05-31 P2-D 语义与图谱审计发现
- `chatlog_alpha` 的 `/api/v1/*` REST 默认需要 `format=json`；当前 semantic/graph 多数 L4 network atoms 仍直接 `fetch()` 并 `response.json()`，没有复用 `requestJson()` 的 JSON format/error normalization 路径。
- 真实 `GET /api/v1/semantic/config` 返回 flat snake_case 配置和 `has_api_key`/`has_deepseek_api_key`，不会返回 `{ config }` 或 raw saved key；当前 `semantic.ts`、`fetchSemanticConfig.ts`、`SetupWizard.tsx` 仍以旧 camelCase/包裹结构为主。
- 真实 `POST /api/v1/semantic/test` 返回 `{ ok, error? }`；当前 `testLLMConnection.ts` 与 UI 类型仍按 `{ success, message }` 处理，连接测试反馈可能误判。
- 真实 semantic index status 使用 `ready/running/paused/processed/pending/failed/progress_pct/last_error`；当前 UI 的 `idle/building/ready/error` 和 `completed/total` 假设不足以表达暂停、运行、进度和失败细节。
- 真实 QA stream 使用 SSE `event: delta|done|error`，其中 delta data 是 `{ text }`；当前 `streamQA.ts`/`sseParser.ts` 只解析 `data:` 的 JSON `type/content` 形态，且缺少明确 stop/cancel 状态。
- 当前 semantic L3 仍有 `AppleButton`、普通 motion、`dangerouslySetInnerHTML`、raw sender/snippet/evidence 展示和重复 `loadAnalysis()` 风险；P2-D 必须把 semantic module root 和 leaf components 分层收敛。
- 当前 graph L4 adapters 同样直接 fetch，缺少 `format=json`、malformed/empty/oversized 分类和客户端可视化上限策略。
- `GraphModule.tsx` 顶层导入 `GraphCanvas`，因此进入图谱模块即会加载 3D 依赖；P2-D 应把 summary/table 默认视图与 on-demand visualize path 拆开，并在 build evidence 中记录 Graph chunk 结果。
- `GraphCanvas.tsx` 在 loading/error/null data 时仍保留 canvas 渲染路径，`GraphEngine.tsx` 同步 force layout 且使用随机初始位置；大型或畸形数据存在卡顿、空白 canvas 和不可复现视觉状态风险。
- `GraphControlBar.tsx`、`GraphTimeline.tsx` 仍使用 `AppleButton`/emoji/小型 raw 控件，`GraphTooltip.tsx`、`GraphLabels.tsx`、timeline 行仍可能展示 raw node/source label；需要与 P2-B/P2-C privacy display policy 对齐。
- `WorkbenchView.tsx` 已把 semantic/graph 放入 lazy inspector module，是 P2-D 的正确起点；P2-D 不应恢复旧 Dashboard 右栏 AI 或 Graph 浮层模式。
- ready-desktop-app tasks 中 T031-T038 对应 P2-D，但只有在 semantic adapters/commander/UI/navigation 和 graph adapters/commander/UI/navigation 都完成并通过验证后才能勾选。

## 2026-05-31 P2-D 二次复核发现
- 本轮复核重新对照了 `chatlog_alpha` 源码：`GET /api/v1/semantic/config` 的真实字段包含 `enabled`、`base_url`、`ollama_base_url`、`deepseek_base_url`、`embedding_provider`、`rerank_provider`、`chat_provider`、`embedding_model`、`rerank_model`、`chat_model`、`embedding_dimension`、`recall_k`、`top_n`、`similarity_threshold` 等；P2-D 计划需要明确不能继续用单一 `provider` 模型覆盖 embedding/rerank/chat 三类配置。
- `POST /api/v1/semantic/config` 在 `api_key` 或 `deepseek_api_key` 为空时保留已保存凭据；计划需要把“空 key 不清空旧 key、UI 不回显 key、保存后以 `has_*` 字段判断凭据状态”写入适配器和 UI 任务。
- 真实 QA request 支持 `query/chat/chats/window/entity_override/retrieval_depth/source_limit/top_n/history`；计划原先只强调 query/chat，已需要补充 request builder 测试，避免 L2/L3 把 scope 参数直接传成后端不存在的语义。
- 真实 topics/profiles 响应不是旧 `TopicItem[]`/`ContactProfileData`：topics 返回 `window/window_label/from/to/count/truncated/topics/daily/summary/summary_error`，profiles 返回 `profiles/type_distribution/summary/summary_error`；P2-D 需要为这两个现有 L4 atom 增加 raw DTO 和 adapter 测试。
- Graph handler 还包含 `/api/v1/graph/timeline`、`POST /api/v1/graph/rebuild|pause|resume` 和 `/api/v1/graph/config`。P2-D MVP 可以暂不做 config UI，但必须为 timeline 和 actions 建立 L4 atom/adapter 计划，否则图谱状态、恢复和 evidence 不完整。
- 当前 `StatusBar.tsx` 仍接收 `IndexStatusResponse` 并主要读取 legacy `status` 字段；P2-D 计划需要把 StatusBar 或 compact semantic status view model 纳入改造，避免 semantic adapter 落地后全局状态栏继续显示不一致。

## 2026-05-31 P2-D 实施基线发现
- 已从 `codex/p2-c-settings-diagnostics-planning` 切到 `codex/p2-d-ai-graph-containment`，保留当前 P2-C 未提交源码和文档作为 P2-D 实施基线；不使用独立 worktree，因为普通 worktree 不会带入这些未提交基线。
- 已按 D0 读取 P2-D 计划列出的来源文档和产品化契约；`specs/000-productization/*` 仍不存在，实施依据继续是 `.specify/memory/constitution.md`、`specs/001-ready-desktop-app/*`、release runbook、P2/P2-B/P2-C 计划和当前源码。
- 当前库存扫描确认 semantic/graph 范围仍有直接 `fetch()`：`fetchSemanticConfig.ts`、`fetchIndexStatus.ts`、`fetchSemanticSearch.ts`、`fetchSemanticTopics.ts`、`fetchSemanticProfiles.ts`、`fetchSemanticQA.ts`、`streamQA.ts`、`testLLMConnection.ts`、`manageIndex.ts`、`fetchGraphStatus.ts`、`fetchGraphQuery.ts`、`fetchGraphVisualize.ts`。P2-D 必须迁移到 `requestJson()` 或 event-aware stream path。
- 当前 semantic UI 仍有 visible `AppleButton` 和 `dangerouslySetInnerHTML`：`AiPanel.tsx`、`SetupWizard.tsx`、`QAInput.tsx`、`QAMessage.tsx`。这些是 D4 的用户可见 UI debt。
- 当前 graph UI 仍有 `GraphModule.tsx` 顶层导入 `GraphCanvas`，`GraphControlBar.tsx`/`GraphTimeline.tsx` 使用 `AppleButton`，并且 label/tooltip/timeline 仍需隐私显示 helper。D7/D8 必须先让 summary/table 成为默认路径，再按需加载 3D。
- `specs/001-ready-desktop-app/tasks.md` 中 T031-T038 仍未勾选；只能在对应 adapter、commander、UI、navigation 和验证都完成后更新。

## 2026-05-31 P2-D 实施完成发现

- Semantic REST/SSE 合约已从 UI 假设迁移到 L4 adapters：flat snake_case config、credential flags、index status/actions、search/topics/profiles、QA payload 和 named SSE events 均有测试覆盖；`scope` 不再传到后端 QA body。
- Semantic optional state 已由 L2 view model 表达，缺 provider/index 不再阻塞 chat/search/stats；QA streaming 支持 connecting、streaming、completed、stopped、failed 和 empty。
- Semantic visible UI 已清理旧 `AppleButton` 和 unsafe HTML；QA message、semantic search sender/snippet、topics/profile summary/main topics 均接入 privacy masking。
- Graph REST 合约已建立 adapters/fetchers：status/query/visualize/timeline/actions 统一走 `requestJson(format=json)`，并在渲染前分类 loaded、empty、malformed、oversized、error/cancelled。
- Graph 默认模块现在是 summary/table；`GraphCanvas` 只在明确点击“打开可视化”后 lazy import。Build 证据显示 lightweight `GraphModule` chunk 与 heavy `GraphCanvas` chunk 已分离。
- Graph visible labels/tooltips/timeline rows 接入隐私 masking，旧 `AppleButton`/emoji/framer-motion 控件从 semantic/graph 可见路径移除。
- Browser acceptance 暴露并修复 390px 下图谱不可达：single layout 原本 `inspectorMode=hidden`，现改为 drawer，且 compact/single toolbar 提供图谱入口。
- 当前仍保留非 P2-D release-gate 待办：Windows installer manual smoke、quit/reopen、unknown `5030` port conflict 和完整隐私日志人工审查。

## 2026-05-31 P2-D 综合复核发现

- 已创建综合复核记录：`docs/reviews/2026-05-31-p2-d-comprehensive-review.md`。结论是 P2-D 有部分有效实现和自动化证据，但不能标记为完全满足阶段、项目、UI、架构、隐私和发布要求。
- Semantic search adapter 仍按前端假设读取 `result.chat`、`result.sender`、字符串 `time`、`local_id`、`rerank_enabled/rerank_provider`；真实 `chatlog_alpha` 返回的是 `talker/talker_name/sender/sender_name/seq/time` 和 `rerank/rerank_tried/rerank_applied/rerank_error`。当前测试也使用错误 fixture，不能保护真实后端契约。
- Semantic profile adapter/UI 仍按旧 profile 数据模型工作：真实 profiles 为 `sender/sender_name/messages/top_keywords`，`type_distribution` 是数组；当前 adapter 按 record 读取分布，`ContactProfile` 仍渲染 `activeHours/dailyFrequency/mainTopics`。
- Semantic module 状态覆盖不足：`initialize()` 对 paused/error/failed/unavailable 映射不完整，`AiPanel` 仍主要按 `ai.phase` 分支，search/profile 缺少本地 empty/error/retry 状态。
- 架构边界仍有明确违反：L4 system atoms 导入 L2 types；semantic/graph 多个 L3 leaf components 直接读取 L2 commander/store。该问题需要在 architecture checklist 中按文件记录，而不能只用 module root 例外概括。
- 可见 UI 仍不统一：`AiPanel` 和 `SetupWizard` 有 hard-coded `#007AFF` 与 inline tab/provider styles；`SetupWizard` 连接测试未等待结果即进入下一步；`GraphControlBar`/`GraphTimeline` 存在 11px 文本和 24-30px 控件。
- Productization/release evidence 仍不完整：T039/T040/T042 未完成；install、launch、quit、reopen、unknown port conflict smoke 仍为 Not run；GraphCanvas lazy chunk 仍超过 500 kB，只能说明默认路径被隔离，不能说明首次可视化体验已达标。
- 已创建完整修复计划：`docs/superpowers/plans/2026-05-31-p2-d-comprehensive-remediation.md`，覆盖真实后端 fixture、semantic adapters/UI state、L3/L4 边界、UI 统一、graph visualization evidence、release evidence 和最终验证矩阵。

## 2026-05-31 P2-D 综合修复执行发现

- 当前分支为 `codex/p2-d-ai-graph-containment`，工作树已有大量 P2-C/P2-D 源码和文档改动；本轮继续在当前分支修复，不能创建会丢失未提交上下文的普通 worktree，也不能回滚既有修改。
- 文档优先级确认：P2-D 综合复核记录和完整修复计划是本轮直接执行依据；constitution、ready-desktop-app spec/contracts/tasks、P2-D 原计划和 P2-A/P2-B/P2-C 记录是约束；早期开发指南/总体规划中的假 macOS、强制端口猎杀和重 glass 方向已被后续 P0/P2 文档修正，只保留四层架构、sidecar 核心和隐私本地化原则。
- 初始扫描确认复核记录仍成立：`SemanticSearch`/`ContactProfile`/`QAPanel`/`TopicView` 等 semantic leaf 仍直接导入 L2 commander/store；`GraphCanvas`/`GraphControlBar`/`GraphEngine`/`GraphTimeline`/`GraphTooltip`/`GraphNode3D` 等 graph leaf 仍直接导入 L2；`src/l4-atom/system/sidecarManager.ts` 和 `chatlogConfig.ts` 仍导入 L2 setup types。
- 初始 UI 扫描确认 P2-D visible debt 未完全清除：semantic/graph 默认路径已无 `dangerouslySetInnerHTML` 命中，但 `AiPanel`/`SetupWizard`/`GraphControlBar`/`GraphTimeline` 仍需要 tokenized controls、稳定命中区和 async test flow 修复。
- Semantic search/profile adapter tests 已改用真实 backend-shaped fixtures：search 覆盖 `talker/talker_name/sender/sender_name/seq/time` 和 `rerank/rerank_tried/rerank_applied/rerank_error`，profile 覆盖 `sender/sender_name/messages/top_keywords` 和数组 `type_distribution`。旧 adapter 在 RED 阶段失败于 `totalCount` 和 `senderName` 缺失，修复后目标测试通过。
- Semantic leaf components 已收敛为 props boundary：`QAPanel`、`QAMessage`、`SemanticSearch`、`TopicView`、`ContactProfile`、`SetupWizard` 不再导入 L2 commander/store；仅 `AiPanel.tsx` 作为语义模块根桥接 L2。
- Graph leaf components 已收敛为 props boundary：`GraphCanvas`、`GraphControlBar`、`GraphEngine`、`GraphTimeline`、`GraphTooltip`、`GraphNode3D`、`GraphLabels`、`GraphEdge3D` 和 summary/fallback/visualize panels 不再导入 L2；仅 `GraphModule.tsx` 作为图谱模块根桥接 L2。
- L4 upward dependency 已清理：system raw setup types 下沉到 `src/l4-atom/system/systemTypes.ts`，semantic SSE parser/types 下沉到 `src/l4-atom/network/semanticStreamParser.ts`，update manifest type 下沉到 `src/l4-atom/network/updateTypes.ts`；`rg -n "@l2|l2-coordinator" src/l4-atom` 无命中。
- Visible control polish 已完成：semantic tabs/step meter/provider cards 使用 CSS token classes，SetupWizard 连接测试必须 await 成功后才能进入下一步；GraphControlBar 和 GraphTimeline 使用 32px+ 控件、tokenized divider/background 和响应式 wrapping。
- Browser acceptance 使用 mocked local backend 验证 `/workbench`：1440px 下 semantic search/profile/settings 与 graph explicit visualization 通过；390px graph drawer 无 page-level horizontal overflow，默认 canvas count 为 0，点击可视化后 visible canvas bounding box 大于 180px。
- Release/productization evidence 已更新：T039/T040 标记完成并记录 architecture/privacy audit；T042 仍保持未完成，因为安装、无终端启动、退出、重开和未知端口冲突 manual smoke 未执行。

## 2026-05-31 P2-D 修复后复核发现

- 修复后的 semantic/graph 主路径已经覆盖此前大部分关键问题：真实 backend-shaped adapter fixtures、leaf props boundary、L4 independence、unsafe UI scan、raw network scan、target/full/Rust/Tauri build 验证均通过。
- `src/l3-molecule/semantic/AiPanel.tsx` 仍直接用 `ai.phase` 控制 loading/setup 分支；综合修复计划明确要求 `AiPanel` 从 `ai.moduleView` 渲染。该点应继续保留在修复计划中，避免以后出现 phase 与 module view 不一致的 UI 状态。
- fresh UI acceptance 本轮未完成：浏览器插件超时，headless Chrome 只能到达 `/workbench` 的 setup/db gate，无法实际进入 semantic/graph 模块复测桌面和 390px 布局。因此不能删除依赖 UI smoke 的计划记录。
- L1 架构债务仍存在：`SetupCenterView.tsx` 和 `WorkbenchShellView.tsx` 直接读取 setup/app stores；尤其 `WorkbenchShellView.tsx` 按 `dbReady` 在 L1 阻断工作台，使本轮浏览器烟测难以复现已记录的 mocked UI evidence。
- UI token debt 只剩低风险局部项：`SemanticSearch.tsx` 示例查询背景和 `SetupWizard.tsx` 连接测试结果背景仍有 raw rgba；不会阻塞核心功能，但与统一 tokenized UI 的目标不完全一致。
- 结论：当前不应删除 `docs/reviews/2026-05-31-p2-d-comprehensive-review.md` 或 `docs/superpowers/plans/2026-05-31-p2-d-comprehensive-remediation.md`。

## 2026-06-01 Suggested Fix 修复发现

- `AiPanel` 的直接 `ai.phase` 分支已移除，checking/setup/ready/error 等可见状态现在由 `ai.moduleView.kind` 决定；`phase` 仍留在 L2/store 内部用于 orchestration，不再作为 L3 渲染输入。
- `WorkbenchShellView` 的 setup/db gate 文案、状态 tone、StatusBar readiness 和 workbench render decision 已移入 `deriveWorkbenchShellView()` 与 `useWorkbenchShellCommander()`。
- 新增 dev-only `?codex-smoke=workbench-ready` 入口解决 fresh browser UI smoke 被 setup/db gate 阻断的问题；该入口只在 `import.meta.env.DEV` 下生效，不改变 production readiness gate。
- `SetupCenterView` 同源 L1 store debt 已一并收敛：页面现在使用 `useSetupCenterCommander()`，数据库状态标签、按钮样式/文案和 aria-live 文案由 `deriveSetupCenterView()` 提供。
- 复核扫描显示 `src/l1-entry` 不再直接读取 Zustand/setup/app stores，也没有 browser storage 访问；这关闭了上一轮 code review 中指出的 L1 readiness 边界问题。

## 2026-06-01 P2-E Planning Findings

- 本轮目标：撰写 P2-E 阶段规划，必须基于当前 P2-D suggested fix 后的真实进度、既有开发文档和当前源码，而不是重新解释早期 Sprint 计划。
- 已加载/采用技能：`using-superpowers`、`brainstorming`、`planning-with-files`、`writing-plans`、`app-productization`、`verification-before-completion`；P2-E 涉及视觉 QA、可访问性和 release smoke，因此也参考了 `frontend-design`、`ui-acceptance`、`release-gate`、`frontend-code-review` 的工作准则。
- 当前分支：`codex/p2-d-ai-graph-containment`。工作树已有大量 P2-C/P2-D/P2-D suggested fix 未提交改动，本轮只允许追加/修订规划与工作记忆文件，不回滚任何现有源码或文档改动。
- `task_plan.md` 当前最新阶段是 Phase 25: P2-D Suggested Fix Implementation，状态 complete；尚无独立 P2-E Phase。
- `progress.md` 记录 P2 总规划曾将 P2 拆为 P2-A 到 P2-E：P2-A tokens/shell/setup/settings 地基，P2-B chat/search/stats，P2-C settings/diagnostics，P2-D AI/Graph containment，P2-E visual QA/accessibility/release smoke。
- P2-D 完成记录显示 `pnpm verify`、`cargo test`、`pnpm tauri build` 与 mocked/headless UI acceptance 已通过，但保留 `GraphCanvas` lazy chunk >500 kB warning、Rust crate name warning，以及未完成的人工 installer/launch/quit/reopen/port-conflict smoke。
- `specs/000-productization/*` 在此前 P2-D 规划中已确认缺失；P2-E 应以 `.specify/memory/constitution.md`、`specs/001-ready-desktop-app/*`、`docs/release/ready-desktop-app.md`、P2/P2-B/P2-C/P2-D 计划和当前源码为事实来源。
- 首次读取 `using-superpowers` 时误用了 `C:\Users\15995\.agents\skills\superpowers\using-superpowers\SKILL.md`，该路径不存在；已改用项目内 `.agents\skills\superpowers\using-superpowers\SKILL.md`。
- 当前 ready-desktop-app task 状态确认：T039/T040/T041 已完成，T029/T030/T042 仍未完成；P2-E 不能在未执行 Windows x64 install/open/quit/reopen/unknown-port-conflict smoke 前勾选 T042。
- 架构扫描复核：L1/L3 raw network scan 无输出；L4-to-L2 scan 无输出；semantic/graph L2 scan 只剩 `AiPanel.tsx` 与 `GraphModule.tsx` 这类已记录 module-root exception；`ai.phase` 在 L1/L3 无命中。
- UI/a11y 扫描发现 `UpdateNotification.tsx` 仍是高优先级 P2-E 候选：当前 overlay 使用 inline hard-coded dark glass styles、backdrop dismissal，没有明确 `role=dialog`、`aria-modal`、打开时聚焦、关闭后焦点恢复或 Escape 行为。
- Workbench drawer 当前有 backdrop click close 和 close button，但没有显式 drawer/dialog 语义、打开后 focus close button、Escape close 或 focus restore；P2-E 应以此作为 keyboard/a11y remediation，而不是只做截图检查。
- Privacy 扫描发现新的候选缺口：`TopContactCard.tsx` 直接渲染 `item.display || item.sender` 到可见文本、avatar fallback 和 alt；`WorkbenchView.tsx` toolbar 直接渲染 `currentConversation.displayName`。P2-E 应补充 stats/workbench 隐私显示 helper 和测试。
- Inline style/hard-coded color 扫描仍然很吵，尤其 setup/semantic/graph/common UI atoms；P2-E 计划应按 release-visible blocker 分类修复，避免把阶段变成风险过大的全局样式重写。
- Graph 当前正确方向是“默认 summary/table 不挂载 canvas，用户显式打开可视化后才 lazy import GraphCanvas”；P2-E 应记录 nonblank canvas 和 chunk evidence，而不是把 >500 kB lazy chunk warning 误标为已解决。
- 第一次 role/focus 正则扫描命令写错导致 `rg` regex parse error；已用更简单的 `role="dialog"|aria-modal|focus\(|useRef|Escape|onKeyDown|tabIndex` 重新扫描并记录结果。
- 本轮二次复核确认 `specs/000-productization/*` 不存在；P2-E 不应引用缺失的 000 规格，而应继续以 `.specify/memory/constitution.md`、`specs/001-ready-desktop-app/*`、`docs/release/ready-desktop-app.md`、P2-A/P2-B/P2-C/P2-D 计划和当前源码为事实来源。
- `docs/总体开发规划.md` 与 `开发指南.md` 中关于假 macOS 交通灯、强制端口清理、大面积 glass 的早期方向已被后续 P0/P2 文档修正；P2-E 的验收重点应是成熟桌面工作台证据、可访问性、隐私、sidecar 生命周期和 Windows x64 release smoke。
- ready-desktop-app spec 明确 Windows x64 是首发平台、未知 `5030` 占用必须是可恢复冲突、语义功能不阻塞核心浏览、诊断必须用户触发且脱敏；当前 P2-E 草稿的 E0-E8 方向与这些约束一致。
- P2-E 源码复核：L1/L3 raw network scan 无输出，L4-to-L2 scan 无输出，semantic/graph L2 imports 只剩 `AiPanel.tsx` 和 `GraphModule.tsx` 两个已记录 module-root exception，`ai.phase` 在 L1/L3 无命中。
- `UpdateNotification.tsx` 当前仍使用 `AnimatePresence`/`motion.div`、inline dark glass styles、backdrop dismiss 和 hard-coded colors，且缺少 `role="dialog"`、`aria-modal`、初始 focus、Escape、focus restore 和 progressbar 语义；P2-E Task E2 需要保持为高优先级。
- `WorkbenchFrame.tsx` drawer 仅有 backdrop click 和 close button，role/focus scan 没有发现 drawer/dialog 语义、Escape 关闭或 focus restore；这验证了 P2-E drawer a11y remediation 的必要性。
- `TopContactCard.tsx` 和 `WorkbenchView.tsx` 分别直显 top sender 与当前 conversation displayName；P2-E privacy regression 应增加 stats sender helper、toolbar title helper 和测试，避免隐私模式只覆盖 conversation rows。
- `AGENTS.md` 的 sidecar launcher 地址仍写 `0.0.0.0:5030`，但当前 `sidecar_args.rs`、local-backend contract 和 release runbook 都使用 `127.0.0.1:5030`。P2-E 计划已修订为显式记录并判定该 contract drift，不能在 release evidence 中含糊跳过。

## 2026-06-01 P2-E Implementation Findings

- 本轮继续基于 `codex/p2-d-ai-graph-containment` 当前脏工作区执行。`.worktrees` 已存在且被 gitignore 忽略，但普通新 worktree 不会带入当前未提交的 P2-C/P2-D/P2-D suggested-fix 基线，因此按 P2-E 计划保留当前工作区执行。
- P2-E 执行依据确认：`AGENTS.md`、constitution、ready-desktop-app spec/research/data model/contracts 均要求本地优先、隐私默认保护、未知 `5030` 占用不可强杀、Windows x64 首发、四层架构边界、所有用户态有 loading/empty/error/success 和恢复提示。
- 早期 `开发指南.md` 与 `docs/总体开发规划.md` 中关于假 macOS 交通灯、强制端口猎杀和重 glass UI 的方向已被后续 P0/P2/constitution 修正；P2-E 采用较新的安全端口策略、tokenized workbench UI 和 release evidence 规则。
- 当前 P2-E 自动化优先修复三个代码阻塞面：Workbench/Stats 隐私泄漏、Workbench drawer focus/Escape/restore、UpdateNotification dialog/progressbar/focus。Windows x64 install/open/quit/reopen/unknown-port-conflict smoke 需要真实本机安装交互，不能用源码测试伪造。
- 文档读取/扫描中出现一次 PowerShell `rg` 正则转义错误（`role=\"dialog\"` 模式被解析为未闭合 group）。该错误不影响判断，后续使用拆分模式或固定字符串扫描。
- E1 privacy 修复事实：stats top sender 现在在隐私模式下统一显示 `已隐藏联系人`、avatar alt `已隐藏联系人头像`、fallback `隐`，但仍保留聚合计数；workbench toolbar 当前会话标题在隐私模式下显示 `已隐藏会话`，未选中时仍显示 `选择会话`。
- E2 a11y 修复事实：Workbench drawer 和 UpdateNotification 都有可测试的派生 helper/view-model；源码已接入 dialog/aria/progressbar/focus/Escape 行为。后续 browser acceptance 需要验证这些源码语义在真实 DOM 下可观察。
- UpdateNotification 进度条渲染已改用 clamp 后的 `view.progressValue`，避免后端或 updater 上报异常进度时把可视宽度撑出容器。
- P2-E browser acceptance 使用 synthetic/mock 数据，不使用真实私聊内容。证据显示 privacy-on 下 synthetic `Alice Private`、`Secret content` 不再出现在 visible text；aggregate stats、dates、counts 保持可读。
- Graph explicit visualization 的重 chunk 仍未“变小”，只是继续隔离在用户点击 `打开可视化` 之后。2026-06-01 final build 中 `GraphCanvas-BjdSMy5i.js` 仍为 1,034.92 kB（gzip 292.62 kB），这是已记录 caveat，不应表述成 chunk warning 被解决。
- T029/T030 可以按本轮配置/build/docs evidence 标记完成；T042 不能标记完成，因为安装器 install/open/quit/reopen/sidecar cleanup/未知 `5030` 冲突都没有被人工执行。

## 2026-06-01 P2-E 综合复核发现

- 已创建综合复核记录：`docs/reviews/2026-06-01-p2-e-comprehensive-review.md`。结论是 P2-E 自动化修复有效，但当前状态只能称为 “automated verification passed with caveats”，不能称为 release-ready 或项目要求全部完成。
- 发布门禁仍是最高优先级 blocker：`release-evidence.md` 中 install、launch、quit、reopen、unknown port conflict 仍为 Not run；`tasks.md` 的 T042 仍未勾选；release runbook 明确要求人工 Windows x64 packaged-app smoke。
- 架构审计存在漏扫方向：`useWorkbenchCommander.ts` 和 `workbenchViewModel.ts` 仍从 L3 `workbenchLayout` 导入实现/类型，说明当前 architecture checklist 的 “pass” 不覆盖 L2-to-L3 反向依赖。
- L3 props-only 规则仍未全局满足：`UpdateNotification.tsx` 直接使用 `useUpdateCommander`，`AppLayout.tsx` 直接读取 settings/dev-console stores。部分可作为 shell/module-root 例外，但必须按文件记录，而不能笼统声明架构完全清洁。
- UI 统一性仍是可用但未完成：semantic/setup/workbench/settings/common UI 仍有大量 inline styles、hard-coded colors 或 legacy atom exports；390px smoke 未溢出，但 setup header 和底部 status cluster 仍偏紧。
- Sidecar 合同存在文档漂移：`AGENTS.md` 写 `0.0.0.0:5030`，当前代码、local-backend contract 和 release docs 使用 `127.0.0.1:5030`。应以 local-private-data 安全目标做显式决策并统一文档/代码。
- 隐私证据仍有人工缺口：自动化 masking 与 synthetic Playwright smoke 通过，但生成的 diagnostics package、日志、截图和 release artifact 隐私审查仍未完整记录。
- Sidecar ownership 仍需 packaged runtime proof：未知 `5030` occupant 不得被强杀是产品合同要求，当前 manual smoke 未执行，且 `sidecar.rs` post-spawn `managed_pid` 赋值存在需要硬化的竞态风险。
- GraphCanvas heavy chunk warning 仍存在；当前正确表述是默认路径隔离了 3D chunk，不能说性能 warning 已解决。
- 已创建完整修复计划：`docs/superpowers/plans/2026-06-01-p2-e-comprehensive-remediation.md`，覆盖 release smoke、sidecar ownership、bind-address contract、L2/L3 架构边界、L3 shell exceptions、UI tokenization、update notification UX、privacy diagnostics、visual QA matrix、graph performance caveat 和最终验证。

## 2026-06-01 P2-E 综合修复执行发现

- 本轮继续在 `codex/p2-d-ai-graph-containment` 当前脏工作区执行；`git diff --stat` 显示已有 89 个 tracked 文件修改和大量未跟踪 P2-C/P2-D/P2-E 文件。这些是当前开发进度的一部分，不能用干净 worktree 或重置丢失。
- 已读取 P2-E 综合审查记录、综合修复计划、release evidence、architecture checklist、release runbook、constitution、开发指南和总体规划。文档优先级确认：最新 constitution/P0-P2 审查与 P2-E 计划优先于早期“端口猎杀”“0.0.0.0 绑定”“重 glass UI”方向；四层架构、本地隐私、sidecar lifecycle 和 release evidence 规则仍为硬约束。
- Task 0 evidence sanity scan 的 release-ready 命中均为阻塞/否定语境或计划说明；当前没有把 T042、Install、Launch、Quit、Reopen、Port conflict 误标为 Passed。P2-E 仍保持 “automated verification passed with caveats; release readiness blocked”。
- Sidecar ownership 已按 TDD 修复：新增 Rust 测试 `post_spawn_pid_tracking_only_claims_spawned_child`，并让 post-spawn `managed_pid` 只记录实际 spawned child PID，不再从端口检查结果认领未知占用进程。该修复降低竞态风险，但不能替代 packaged app 未知 `5030` 占用 manual smoke。
- Bind-address 合同已统一为 local-only `127.0.0.1:5030`：`AGENTS.md`、release runbook、release evidence、architecture checklist 和现有 `sidecar_args.rs` 对齐；历史 review/plan 中的 `0.0.0.0:5030` 只作为过去问题记录保留。
- L2-to-L3 反向依赖已修复：`workbenchLayout` 从 L3 moved to `src/l2-coordinator/commander/workbenchLayout.ts`，相关测试移动到 L2；`rg -n "@l3/|@/l3-molecule|l3-molecule" src/l2-coordinator src/l4-atom` 无命中。
- Common shell 例外已收敛：`AppLayout.tsx` 改为接收 shell/actions props，`useAppShellCommander()` 在 L2 负责 settings/dev-console stores、导航和 window material；`UpdateNotificationView.tsx` 改为 props view，`useUpdateNotificationCommander()` 和 L2 view model 负责 updater 状态/actions。状态切换不再重复恢复/重置焦点。
- 仍存在更宽的 L3 commander/store staged debt：semantic/graph module roots、DevConsole、setup workflow、chat/search legacy roots 和少量 type-only shell imports 已在 `architecture-boundary-check.md` 按文件/范围列出，不能表述为全局 L3 props-only 完成。
- Focused UI tokenization 已闭合 P2-E release-visible shell 范围：`SetupCenterView.tsx`、`SettingsView.tsx`、`WorkbenchShellView.tsx`、`WorkbenchView.tsx`、`UpdateNotificationView.tsx` 的 inline `style={{ ... }}` 扫描无命中。更广的 semantic/graph/setup legacy style cleanup 仍是 staged debt。
- Diagnostics privacy audit 增强已落地：前端 diagnostics/maskSecrets 测试覆盖 synthetic data key、API key、token、private message、local identity markers 和脱敏 false-positive；Rust `diagnostics_report_export_redacts_synthetic_release_audit_values` 生成临时诊断报告并确认 raw synthetic secrets/private text 不落盘。
- Graph performance 决策保持不变：heavy `GraphCanvas` chunk 继续只在用户显式可视化后加载，P2-E 不把 1MB lazy chunk warning 表述为已解决；后续若要进一步优化应作为 P3/performance work。
- 最终自动化验证通过：P2-E comprehensive target suite 9 files / 38 tests，`pnpm verify` 60 files / 336 tests，`cargo test` 19 tests，`pnpm tauri build` 产出 MSI/NSIS；`git diff --check` 无 whitespace error。剩余发布阻塞是人工 Windows packaged smoke 和真实 packaged diagnostics artifact review。

## 2026-06-01 P2-E 综合修复后复核发现

- 用户修复后，核心自动化链路通过：targeted P2-E/diagnostics tests 7 files / 24 tests；`pnpm typecheck` PASS；`cargo fmt --check` PASS；`pnpm verify` PASS（60 files / 336 tests）；`cargo test` PASS（19 tests）；`pnpm tauri build` PASS（MSI/NSIS 产出）；`git diff --check` 无 whitespace error。
- 关键架构扫描通过：`rg -n "@l3/|@/l3-molecule|l3-molecule" src/l2-coordinator src/l4-atom` 无命中；L1/L3 raw network 无命中；L4-to-L2 无命中；L1/L3 `ai.phase` 和 `dangerouslySetInnerHTML|AppleButton|GlassPanel` 无命中。
- 侧车合同与 ownership 修复方向正确：`AGENTS.md`、code、release docs 当前统一为 `127.0.0.1:5030`；`sidecar.rs` 已记录 spawned child PID 并通过 `post_spawn_pid_tracking_only_claims_spawned_child` 覆盖未知 occupant 不被认领的情况。
- Common shell 拆分方向正确：`AppLayout.tsx` 现在接收 shell/actions props，`useAppShellCommander()` 在 L2 处理 settings/dev-console/window material；`UpdateNotificationView.tsx` 是 props view，focus restore 不再随状态变化反复触发。
- 不应删除 P2-E 综合 review/plan：`release-evidence.md` 仍记录 Install/Launch/Quit/Reopen/Port conflict 为 Not run；T042 仍未勾选；真实 packaged diagnostics artifact review 仍 pending。
- L3 staged debt 仍真实存在且应保留计划追踪：semantic/graph module roots、DevConsole、setup workflow、chat/search legacy roots 仍直接接入 L2；此外 `WorkbenchRail.tsx` 从 L2 导入 `buildWorkbenchRailItems()`，这不是纯 type-only import，最好后续改为由 L2/WorkbenchView 传入 rail item props。
- UI smoke 结果可用但仍有 polish：Chrome/Playwright fallback 检查 `/`、`/settings`、`/workbench?codex-smoke=workbench-ready` 在 390px/1440px 无 page-level overflow、无小于 28px 的按钮；但 390px 底部状态栏仍只显示 `:5030`，语义不够清楚，属于可见 UI polish debt。
- P2-E 综合修复计划和综合审查记录应保留，直到 manual packaged app smoke、真实 packaged diagnostics artifact review、剩余 L3 exceptions 和状态栏/语义模块 UI polish 被关闭或明确降级到后续阶段。

## 2026-06-01 P2-E Suggested Fix Implementation Findings

- 已按上一轮 review 的 Suggested fix 修复两个可自动闭合问题：`WorkbenchRail.tsx` 不再从 L2 导入非 type-only helper，改为接收 L2 commander 生成的 `railItems` props；底部状态栏不再显示孤立 `:5030`，改为 `端口 5030`。
- TDD 覆盖新增：`workbenchBoundary.test.ts` 验证 WorkbenchRail 使用传入 item 渲染，不拥有 L2 rail item 构造职责；`statusBarDisplay.test.ts` 验证端口标签可读且不以裸冒号开头。
- 架构扫描确认 `rg -n "@l2|l2-coordinator" src/l3-molecule/workbench/WorkbenchRail.tsx` 无命中；UI smoke 确认 `/settings` 与 `/workbench?codex-smoke=workbench-ready` 在 390px 下均显示 `端口 5030`，不再显示孤立 `:5030`。
- 本轮重新运行 `pnpm verify` 通过（62 files / 338 tests，生产构建通过，仍保留 GraphCanvas lazy chunk >500 kB warning）；`git diff --check` 无 whitespace error，仅 CRLF 规范化提示。
- 不能删除 P2-E 综合 review/plan：Windows packaged install/open/quit/reopen/unknown-port-conflict smoke 仍未执行，真实 packaged diagnostics artifact review 仍 pending，T042 仍未完成；当前状态仍是 automated verification passed with manual release-smoke blocker。

## 2026-06-01 P2-E Packaged Release Gate Closure Findings

- 真实 packaged smoke 发现 `sidecar("binaries/chatlog_alpha")` 与 Tauri v2 安装布局不匹配：`externalBin` 源文件在 `src-tauri/binaries`，但 build/install 目标是安装根目录 `chatlog_alpha.exe`；运行时必须调用 `sidecar("chatlog_alpha")`。
- 真实 packaged quit smoke 发现主窗口关闭不会自动调用已有 `shutdown_sidecar` command；需要在 Tauri `CloseRequested` 生命周期里同步清理 `SidecarState` child，否则 app 退出后 app-managed sidecar 继续监听 `5030`。
- Graph warning 的根因不是 `GraphCanvas` UI 代码本身，而是 Three/R3F/D3 依赖进入同一个异步 chunk。拆分后 `GraphCanvas` 约 12.93 kB，重依赖集中在 explicit-click `vendor-graph-3d` lazy chunk；因为 Three 核心模块本身超过默认 500 kB，需设置明确 3D vendor budget。
- Rust crate warning 的根因是 `[lib] name = "chatlogUI_lib"`，已改为 `chatlog_ui_lib` 并同步 `main.rs`；`cargo test` 编译输出不再出现该 warning。
- Packaged diagnostics artifact 真实导出可用：14 lines / 433 bytes，`Data key` 记录为 `present`，未包含 raw 合成 data key、合成私密文本或完整 user profile path。
- Unknown `5030` occupant smoke 可自动化：外部 PowerShell `TcpListener` 作为 unknown owner，app 显示可恢复冲突文案，关闭 app 后 unknown listener 仍保持，证明 ownership cleanup 未误杀外部进程。
- Smoke 结束后已清理合成 `chatlog-server.json`、临时 data/work 目录、外部 listener，并确认无 `chatlog*` 进程或 `5030` listener。

## 2026-06-01 P4/P5 Planning Findings

- 本轮 P4/P5 规划以 P2-E 完成态作为基线：`release-evidence.md`、`p2-e-visual-qa-matrix.md` 和 release runbook 已记录 Windows x64 packaged install/open/quit/reopen、app-managed sidecar health、packaged diagnostics export、unknown `5030` conflict、GraphCanvas chunk warning closure 和最终验证通过。P4/P5 不应重复 P2-E release-smoke 闭合工作。
- 当前 `chatlogUI` 前端只覆盖 core chat/search/stats/setup/settings、semantic、graph MVP 和基础 diagnostics/privacy；`src/l4-atom/network/index.ts` 尚无 SNS、media resource、DB explorer、hook/push、favorites、members、unread/new_messages、MCP/wx-cli endpoint runner 的公开网络原子。
- 本地 `chatlog_alpha` 原始 HTTP 能力仍有大量 P4 缺口：`/image/*key`、`/video/*key`、`/file/*key`、`/voice/*key`、`/data/*path`、`/api/v1/sns_notifications`、`/api/v1/sns_feed`、`/api/v1/sns_search`、`/api/v1/sns/media/proxy`、`/api/v1/db/search`、`/api/v1/db/tables`、`/api/v1/db/data`、`/api/v1/db/query`、`/api/v1/cache/clear`、hook config/status/events/stream/Hermes endpoints、`/mcp`、`/sse`、`/message`、semantic index preview、graph ingest/QA。
- 当前 Workbench 模块只有 `chat | stats | ai | graph | settings`，导航尚未为 P4 的“媒体/收藏/朋友圈/数据库/接口调试/推送/诊断”提供明确分组入口。P4 UI 应避免继续堆叠到聊天主流程，而应采用 Apple-like desktop workbench 的分组 rail、inspector、sheet 和 data-dense table/detail 模式。
- 当前 `DevConsole` 主要记录 sidecar stdout/stderr 和基础导出；`httpClient.ts` 没有统一记录 HTTP request/response/error event，UI action、Tauri command、updater、privacy audit、E2E smoke summary 也没有统一事件模型。P4 developer diagnostics 需要先建立 redaction-first diagnostic event pipeline。
- 当前隐私模式已覆盖核心聊天、搜索、统计、语义、图谱和诊断的部分可见/aria/export 面，但 P4 新增媒体、SNS、DB rows、hook events、endpoint runner、raw response preview、screenshots、downloads 和 logs 都会重新扩大敏感面，必须为每个新模块定义 privacy-on 视图、aria label、copy/export 和 screenshot-safe 行为。
- `.github/workflows/build-check.yml` 与 `release.yml` 已存在并支持多平台构建、sidecar prepare、updater signing secret check 和 release updater artifacts；但仓库没有独立 `e2e/` 或 `tests/` 目录，现有可重复验证主要是 Vitest、Rust tests、shell smoke、临时 Playwright/Chrome evidence。P5 应把 launch/workbench/privacy/advanced modules/release smoke 固化为可重复 E2E 和 visual evidence。
- 当前仓库没有 `cmd/chatlog` sidecar 源码，`src-tauri/binaries/` 又被 `.gitignore` 忽略。`.github/scripts/prepare-sidecar.sh` 在 build-check 模式可生成 CI placeholder，但 release 模式需要已有非空目标 binary 或源码；因此真正的 GitHub release workflow 仍有 sidecar artifact acquisition/reproducibility 风险，必须在 P5 发布质量中显式关闭。
- `src-tauri/tauri.conf.json` 当前 CSP 允许 `img-src` 访问 `http://127.0.0.1:5030`，但未显式声明 `media-src`。P4 媒体模块支持视频/语音前，必须把 CSP/能力变更作为 sidecar/security 任务审查，不能靠浏览器默认行为碰运气。
- `ui-ux-pro-max` 设计系统脚本第一次在 Windows GBK 输出下触发 `UnicodeEncodeError`，且一次 search 参数写错；已用 `PYTHONIOENCODING=utf-8` 和正确参数重跑。可采用的设计结论是 data-dense developer/dashboard、privacy trust state、keyboard/a11y/error/empty/loading 规范；“landing/hero/单一夸张风格”不适合当前桌面工具。

## 2026-06-01 P4/P5-0 Planning Findings

- 当前已有 P4/P5 总路线图：`docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`，但用户本轮要求的是 P4/P5-0 独立阶段规划，应在总路线图之上补一份更窄、更可执行的计划。
- `specs/002-advanced-capabilities/` 尚不存在；`specs/001-ready-desktop-app/test-data-policy.md` 也不存在，虽然 `tasks.md` 的 T002 曾要求定义 sanitized fixture policy。P4/P5-0 应补齐新阶段能力矩阵、隐私/诊断契约、fixture/E2E 策略，并决定是否同步补 001 的历史缺口。
- 当前源码确认：`src/l4-atom/network/index.ts` 只导出 core chat/search/stats、semantic、graph、update fetchers；尚无 media、SNS、DB explorer、hook、MCP/API runner 的 L4 原子。
- 当前诊断确认：`DevConsole` 仍主要消费 `useDevConsoleStore` 的 sidecar stdout/stderr/system logs；`useDiagnosticsCommander` 只汇总 setup/profile/readiness/log count；没有统一 HTTP/UI/Tauri/updater/release diagnostic event pipeline。
- 当前 `httpClient.ts` 只负责 `format=json`、timeout、HTTP body/status preservation；没有 request/response diagnostic event emission，也没有 endpoint label/correlation id/duration metadata。
- 当前 E2E 基础确认：仓库无 `e2e/` 或 `tests/` 目录，`package.json` 没有 `pnpm e2e` 脚本；P2-E 浏览器证据主要来自临时 Playwright/Chrome/UIA smoke。
- `chatlog_alpha` 路由确认：原始能力覆盖 media (`/image/*key`、`/video/*key`、`/file/*key`、`/voice/*key`、`/data/*path`)、SNS、favorites/members/unread/new_messages、DB explorer/query/cache、hook/Hermes/SSE、MCP (`/mcp`、`/sse`、`/message`)、semantic index preview、graph ingest/QA。P4/P5-0 能力矩阵必须逐项定所有者、隐私风险、fixture 和 E2E 目标。
- `src-tauri/tauri.conf.json` 目前 CSP 有 `img-src ... http://127.0.0.1:5030`，但没有显式 `media-src`；P4/P5-0 计划应把媒体播放的 CSP/packaged smoke 作为后续 P4-B 的 release/security gate，而不是在 foundation 阶段贸然放宽。
- 已新建 P4/P5-0 专项计划 `docs/superpowers/plans/2026-06-01-p4-p5-0-capability-diagnostics-e2e-foundation.md`，将 foundation 范围明确为：建立 `specs/002-advanced-capabilities` 文档、补齐 test-data policy、建立 L4 diagnostic event atom、给 `httpClient` 增加可选脱敏诊断事件、建立 L2 diagnostic event store/view model、升级 DevConsole 基础过滤、建立 synthetic fixtures 和 mock backend 策略。
- 宽口径 P4/P5 总计划中早期写错的 `src/l3-molecule/dev/DevConsole.tsx` 已更正为当前真实路径 `src/l3-molecule/common/DevConsole.tsx`，并补充了专项计划链接。

## 2026-06-01 P4/P5-0 Implementation Findings

- `rg` 默认不支持 lookahead/lookbehind。P4/P5-0 文档中涉及 synthetic path/secret 的安全扫描命令必须使用 `rg --pcre2` 或拆成简单扫描；本轮已修正 ready desktop test-data policy 和 P4/P5-0 plan 中的建议命令。
- L4 diagnostic event foundation 可保持独立：`diagnosticEvents.ts` 只创建、脱敏、序列化、限制事件，不导入 L2/L3/Zustand/Tauri，不持久化状态；`requestJson` 通过可选 callback 发事件，避免 L4 直接耦合 store。
- 当前 HTTP 诊断事件是 opt-in foundation。现有 fetchers 默认行为不变，后续 P4-A/P4-B 应按 endpoint family 将 L2 commander/fetcher 调用接入 `onDiagnosticEvent`，才能在真实运行时看到 HTTP 事件。
- DevConsole 已从 L3 直接 commander 调用改为 props-driven view，`WorkbenchView` 在 L1 注入 L2 commander 数据。这关闭了 P4/P5-0 触碰范围内的 DevConsole L3-to-L2 耦合，但更宽的 L3 staged debt 仍以既有 architecture checklist 为准。
- `diagnostics-redaction.json` 故意包含 `C:\Users\Synthetic\WeChat Files\wxid_synthetic_redaction_case`、synthetic key/token/message markers，用于 redaction tests。扫描结果命中这些 synthetic values 时应视为预期测试输入，而不是泄漏。
- Browser plugin in-app connection timed out during UI acceptance even though Vite page returned 200。Fallback Playwright CLI succeeded and provided viewport/overflow/privacy evidence. This should remain a tooling caveat, not a product failure.

## 2026-06-02 P4/P5-0 Review Fix Findings

- `requestJson` 原先暴露 `RequestInit.signal`，但实际传给 `fetch` 的是内部 timeout `AbortController.signal`；调用方取消无法触发，只有 timeout 能结束请求。修复后 caller `AbortSignal` 会合并到内部 controller，并以 `http.abort`/`errorKind=abort` 记录，不再误报为 timeout。
- P4/P5-0 的初始 `capability-matrix.md` 只有能力族级别，不能直接作为后续 P4 实施清单。已补 endpoint-level inventory，列出每个 endpoint 的 desktop surface、L4/L2 owner、fixture target、E2E state target 和状态。
- 初始 E2E fixture plan 只列未来覆盖目标，没有 route/state/viewport/privacy fixture matrix。已新增 `e2e-matrix.md`，把 setup/workbench/settings/dev-console/advanced entries/packaged smoke 的宽度、隐私模式、fixture 来源和阶段 owner 固定下来。
- 宽口径 P4/P5 总计划中仍保留旧的 global subscribe/emit diagnostic event 描述和旧 fixture 文件名；已同步为当前 opt-in callback foundation 与 `advanced-capabilities.json`/`diagnostics-redaction.json`，避免后续按过时接口开发。

## 2026-06-02 P4-A Planning Findings

- 本轮在新 worktree `codex/p4a-diagnostics-privacy-plan` 中撰写规划；当前 master 领先远端 11 个提交，但工作区无未提交源码改动，适合用隔离分支处理文档。
- P4/P5 总路线图明确 P4-A 目标是 Developer Diagnostics 与 Privacy Mode 2.0：把 DevConsole 从 sidecar log viewer 升级为统一事件控制台，补 source/level/time/endpoint/privacy/failed filters、event detail drawer、screenshot-safe/privacy 扩展、diagnostics export manifest 和 leak scans。
- P4/P5-0 已完成基础能力：endpoint-level capability matrix、`privacy-diagnostics-contract.md`、`e2e-matrix.md`、L4 diagnostic event helpers、`httpClient` opt-in redacted diagnostics、L2 diagnostic event store/view model 和 DevConsole foundation。因此 P4-A 计划应落在“接入、扩展、导出、隐私模式和验证矩阵”，不能重复设计全局 emitter 或基础 atom。
- 旧开发指南和总体规划中关于强制 kill unknown port、假 macOS traffic lights、重 glass UI 的方向已被后续 AGENTS、P2-E release evidence 和 P4/P5 planning supersede；P4-A 应以 local-only `127.0.0.1:5030`、redaction-first diagnostics、L1/L2/L3/L4 边界和 data-dense desktop tool UI 为准。
- `ui-ux-pro-max` 检索对 P4-A 的适用结论是 data-dense dashboard / developer tool / real-time monitor，而不是 landing 或 hero。规划中应要求 DevConsole 使用表格/事件流/筛选/详情抽屉，保持中性工作台色系和语义状态色；避免大卡片堆叠、营销式布局、emoji 图标和装饰渐变。
- UI 验收重点应写入 P4-A：source/level/privacy filters 可键盘操作；error/export blocked 状态有 `aria-live` 或等效语义；状态不能只靠颜色表达；390px 与 1440px 均无 page-level overflow；privacy-on 下 visible text、alt/aria、tooltip、copy/export、diagnostic rows 和截图都不能泄漏 synthetic private markers。
- `specs/002-advanced-capabilities/e2e-matrix.md` 已把 Dev Console、diagnostics export、privacy-on/off、1440/390、`diagnostics-redaction.json` 和后续 P5-B/P5-C owner 固定下来。P4-A 计划应把这些 matrix row 转成实现验收与验证命令，而不是另起一套测试定义。
- 当前 `requestJson` 支持 `onDiagnosticEvent`，但 `rg` 确认生产代码没有任何 fetcher/commander 传入该 callback；HTTP diagnostic events 目前只在单测里真实产生。P4-A 必须规划核心 endpoint family 的接入方式，例如在 L2 传入 store-backed callback，或给 L4 fetchers 增加可选 diagnostics 参数，保持默认行为不变。
- 当前 DevConsole foundation 只有 source/level/privacy 三类筛选，未覆盖 P4-A 总计划要求的 time、endpoint group、failed-only、event detail drawer、suggested next action、screenshot-safe mode 或 diagnostics export manifest。
- `useDiagnosticsCommander` 当前报告项以 setup/readiness/log count/event summary 为主，缺少 app version、build channel、package readiness、sidecar lifecycle exit summary、update state、release smoke summary 等 P4-A manifest 字段。
- `fetchDbReady.ts` 和 `fetchDbStatus.ts` 仍使用原生 `fetch` 和内部 timeout，不走 `requestJson`。它们属于 L4 原子直接网络调用是允许的，但 P4-A 如果要求统一 HTTP 诊断，需要给这些 readiness atoms 增加同等脱敏事件能力或迁移到 `requestJson`。
- `createDeferredSubscription()` 在订阅失败时仍 `console.error("订阅初始化失败:", error)`；P4-A 可把订阅失败转换成 redacted `ui`/`tauri` diagnostic event，避免未来 Browser/Tauri event listener 失败只停留在浏览器控制台。
- 已新增 `docs/superpowers/plans/2026-06-02-p4-a-developer-diagnostics-privacy-mode-2.md` 并在 P4/P5 总路线图中接入。该计划不包含完整源码，重点是执行任务、文件边界、隐私契约、UI 验收、测试命令和风险登记。

## 2026-06-02 P4-A Implementation Findings

- 当前最相关的执行上下文在 `.worktrees/p4a-diagnostics-privacy-plan`，不是主工作区 `master`。该 worktree 保留了用户撰写的 P4-A 规划和工作记忆改动，应作为实现基线继续推进。
- P4-A 规划明确不重做 P4/P5-0 foundation，不实现 P4-B/P4-C/P4-D 高级模块，不改变 `chatlog_alpha` sidecar contract，也不放宽 Tauri CSP/capabilities。
- 本轮实现必须优先闭合当前真实 gap：生产 fetcher 尚未接入 `onDiagnosticEvent`；DevConsole 只有 foundation 级过滤；diagnostics manifest 不够完整；Privacy Mode 2.0 需要覆盖 visible/aria/tooltip/copy/export/detail drawer。
- AGENTS 中列出的 `specs/000-productization/` 在当前 worktree 不存在。当前可执行产品化依据是 `specs/001-ready-desktop-app/` 与 `specs/002-advanced-capabilities/`，二者均要求 local-only diagnostics、user-triggered export、fail-closed redaction、L1/L2/L3/L4 边界和 no real/private fixture policy。
- A1 实现中，`correlationId` 适合放在 event 顶层并限制为短安全字符集；`recoveryHint` 只允许固定枚举，未知值降级为 `none`。这比把任意建议文本放进 attributes 更符合 diagnostics contract 的“安全元数据”要求。
- A2 的低耦合形态是 L4 fetchers 只接受可选 diagnostic callback/options，仍不导入 store；L2 commander/bridge 持有 store-backed callback。这样可以把生产 HTTP 事件接进 DevConsole，同时保持 L4 独立和默认请求行为不变。
- 复合请求不能让 L2 默认 `endpointFamily` 覆盖具体 L4 endpoint。`fetchConversations()` 的 sessions/contacts/chatrooms 回归测试证明该风险真实存在；最终规则是 L4 endpoint family/method 是事实来源，L2 只提供 correlation/recovery 和 callback。
- `streamQA` 属于 SSE 增量流，不能靠 `requestJson()` 覆盖。P4-A 需要在 `streamQA` 内部记录 response ok、HTTP failure、abort/timeout/network 生命周期事件，同时保持 abort 不触发用户错误回调。
- A3 确认 L4 system atom 不应直接创建或存储 diagnostic events；它们只暴露 failure callback。由 L2 commander 将 Tauri/updater/subscription/export 状态翻译成统一诊断事件，符合四层边界。
- Runtime console logging 已从 production TS/TSX 路径移除。未来如果必须保留 console 输出，应先证明它不会携带 raw path/token/message，并同时记录 redacted diagnostic event。
- A4 的关键边界是“含义推断在 L2，渲染在 L3”：endpoint family、failure、time range、recovery hint 和详情字段都由 `diagnosticEventViewModel` 生成，`DevConsole` 不直接读取 store 或推断诊断语义。
- 对没有 `endpointFamily` attributes 的本地事件，按 `event.source` 作为端点族 fallback，可让 UI/Tauri/updater/release 事件参与同一个 endpoint filter，而不会把它们伪装成 HTTP endpoint。
- A5 发现 `maskDiagnosticText` 原先的 privacy field replacement 没有捕获组，可能把 `$1=[redacted]` 原样写入输出。已修复为显式捕获 key 并同时覆盖 JSON/key-value/line 形式。
- P4-A 不能只靠 diagnostic event attributes whitelist 防泄漏；diagnostics report/copy/export 路径仍可能收到 raw query、SQL、SNS proxy URL 或 media key label，因此 report model 也必须按 label fail-closed/redact。
- A6 选择不改变 Rust export payload shape。Manifest 2.0 作为 line-based safe report lines 写入现有 `{ redactionOk, lines }`，能复用 Rust fail-closed guard，避免不必要的 Tauri/Rust schema churn。
- Runtime manifest 不应包含 `configDir`、`dataDir`、`workDir` 等 raw path；这些仍作为普通 report items 经过 `maskDiagnosticText`，manifest 本身只记录 config source、mode、readiness、update 和 local-only backend base URL。
- A7 确认 setup/settings/workbench 可以共享一个 diagnostics model：setup 和 settings/about 使用 `DiagnosticsPanel`，workbench 使用 DevConsole，但两者的 copy/export 均来自同一个 manifest/report builder。
- A8 工具 caveat：不要把 headless Chromium `user-data-dir` 放进 Vite 项目目录，否则 Vite watcher 会监听浏览器 cache/session files 并持续 reload，导致验收脚本看到空 body。系统 temp 目录 profile 可正常验收。
- A8 发现并修复了 DevConsole 事件行作为 button 的 hit target 风险；`min-height: 28px` 后桌面/390px small-button scan 均为空。
- A9 文档证据必须区分 source/UI evidence 与 packaged release evidence。P4-A 没有改 Rust/Tauri/CSP/capabilities/sidecar startup，也没有产出新的 packaged artifact，因此 ready-desktop release docs 只能记录 P4-A source/UI extension，不能替代 2026-06-01 Windows x64 packaged gate。
- A9 后 DevConsole 架构状态已变更：旧 architecture checklist 中 “DevConsole 直接使用 useDevConsoleCommander” 的 staged debt 对当前文件不再准确；P4-A 后 `DevConsole.tsx` 是 props-driven L3 view，L2 commander/bridge 拥有 event recording、filter state、manifest export 和 recovery semantics。
- A9 操作发现：`apply_patch` 在当前桌面线程默认锚定主工作区路径，而 shell 命令可以通过 `workdir` 指向 P4-A worktree。后续所有补丁必须显式使用 `.worktrees/p4a-diagnostics-privacy-plan/...` 路径，避免误改主工作区。
- A10 验证发现：把 worktree 放在仓库子目录时，ESLint 会向上查找父目录配置；没有 `root: true` 时会同时加载父仓库和 worktree 的 `.eslintrc.cjs`，造成插件重复解析。分支内加入 `root: true` 后 lint/verify 均通过。
- A10 final leak-scan 解释：`src/utils/maskSecrets.ts` 中的 synthetic marker 命中是有意的 redaction denylist，不是泄漏。排除测试和该 redaction helper 后，生产 UI/业务源码没有 synthetic private marker 命中。

## 2026-06-02 P4-B Planning Findings

- P4/P5 总路线图已把 P4-B 定义为 “Media, Favorites, Members, Unread, And Incremental Messages”，但当前只是高层任务清单；缺少 backend shape 核验、L2/L3 状态拆分、媒体安全/CSP 决策、UI 验收矩阵和 staged TDD 任务。
- 当前源码仍只具备 P2 级媒体占位：`MessageBubble` 在 `mediaUrl/imageUrl` 存在时显示 `[媒体可用]`，`MediaPreview` 只支持简单图片 URL；尚无 typed media resource fetcher、blob/object URL 生命周期、视频/语音/文件下载、媒体库、收藏模块、成员 inspector、未读/new_messages 同步模块。
- `useChatStore` 已有 `Conversation.unread` 和历史消息分页状态，但这不等价于后端 `/api/v1/unread` 与 `/api/v1/new_messages` 的增量同步；P4-B 规划需要明确二者如何进入 L2 state、如何去重、如何避免扰动现有 session list 和 transcript pagination。
- P4-A 已完成 redaction/diagnostic bridge，因此 P4-B 网络原子和 commanders 必须复用 `onDiagnosticEvent` opt-in 路径，只记录 endpoint family/status/duration/error kind/recovery hint，不记录媒体 key、收藏内容、群成员身份、new message body 或完整 query/path。
- 本地 `chatlog_alpha` route 核验后，P4-B fixture 必须先按真实后端 shape 修正：`/api/v1/unread` 返回 `{ sessions, total }`，每项含 `chat/username/is_group/chat_type/unread/last_msg_type/last_sender/summary/timestamp/time`；当前 `advanced-capabilities.json` 的 `items` shape 与后端不一致。
- `/api/v1/members` 要求 `chat` 参数，返回 `{ chat, username, count, members }`，member 字段是 `username/display/is_owner`；当前 fixture 的 display name shape 需要重写为合成但后端一致的字段。
- `/api/v1/new_messages` 接收可选 `state` JSON map，返回 `{ count, messages, new_state }`；无 state 时后端从约 24 小时窗口开始。规划应避免后台常驻轮询，先采用显式刷新/进入视图刷新，并把 `new_state` 作为 L2 内存态。
- `/api/v1/favorites` 返回 `{ count, items }`，item 字段为 `id/type/type_num/time/timestamp/preview/from/chat`；`preview/from/chat` 都属于隐私敏感展示内容，privacy-on、aria、tooltip、copy/export 必须遮蔽。
- `historyMessageOut` 已暴露 `media_key/media_keys/media_path/media_url/image_key/image_keys/image_path/image_url` 等字段，但当前 `adaptHistoryMessage()` 只保留 `mediaType/mediaUrl/imageUrl`，未形成 typed attachment model，也没有把 raw key/path 约束在 L4/L2 内部。
- 媒体 endpoint 的 `info` 查询会返回 media metadata；无 `info` 时 `/image` 直接 serve，`/voice` 走音频，`/video`/`/file` 可能 redirect 到 `/data/*path`。P4-B 不能把 `/data/*path` 或 key 显示、日志化、写入诊断导出。
- `src-tauri/tauri.conf.json` 当前只有 `img-src` 允许 `http://127.0.0.1:5030`，没有显式 `media-src`。如果 P4-B 真正播放 `<video>` 或 `<audio>`，必须把 CSP 修改、packaged smoke 和 release evidence 作为本阶段任务，而不是只做源码 UI 验收。
- 当前聊天相关 L3 仍有历史债务：`MessageList`、`MessageBubble`、`ConversationList` 等存在直接 store/commander 依赖。P4-B 不应扩大该债务；新建媒体、收藏、成员 leaf 组件应 props-driven，必要时通过 L2 view model 给现有聊天入口注入回调。

## 2026-06-02 P4-B Implementation Findings

- 后端-shaped fixture 必须在实现前修正。旧 `advanced-capabilities.json` 的 chat extension `items` shape 会让 UI/adapter 测试偏离真实 sidecar；本轮把 unread/members/new_messages/favorites 改为 `/api/v1/*` 实际 response shape，并用 contract tests 固定。
- Raw media key/path 的安全边界应停在 L4/L2 内部。最终 UI attachment 只渲染 `图片/视频/语音/文件/表情/媒体` 标签和 blob object URL；raw `image_key/media_key` 不进入 visible text、alt、tooltip 或 diagnostic attributes。
- 视频/语音播放不应在没有 CSP/package 证据时上线。本轮实现保留图片 blob preview；视频、语音和文件只显示下载/占位说明，不渲染 `<video>`/`<audio>`，所以没有修改 `src-tauri/tauri.conf.json` 或 capabilities。
- `useMediaStore` 必须拥有 object URL revoke 生命周期。预览替换、关闭和 reset 都需要 revoke 旧 URL；这比让 L3 组件自行清理更符合 L2 state ownership，也避免隐私/内存风险。
- Media preview commander 还需要响应级 stale guard。单靠 store 在打开新预览时 revoke 旧 URL 不够；如果旧请求晚于新请求返回，它仍可能覆盖当前预览。最终实现按 attachment id 检查当前预览，过期响应生成的 blob URL 会立即 revoke。
- `new_messages` 的 `new_state` 适合先作为 L2 内存态，不做持久化或后台轮询。显式刷新/进入视图刷新能降低意外性能和隐私面；后续若加轮询应作为独立 P5/P4 polish 决策。
- 窄屏模块可达性需要跟随 Workbench rail 隐藏规则。P4-B 初版进入媒体模块后，单栏模式没有返回会话列表的按钮；复测后在单栏非 chat 模块按钮组加入 `会话` 入口，避免移动宽度下被困在媒体/统计/AI/图谱模块。
- Privacy-on 验收不能只查核心聊天。P4-B 需要同时查收藏预览/来源、成员 display/username、会话 raw id、增量消息正文、媒体 key 和附件 preview dialog；本轮 390px privacy-on Playwright scan 对这些 synthetic markers 返回空泄漏列表。
- Playwright CLI route mock 足以做 source/UI evidence，但不等同于持久 P5-B E2E suite。Browser plugin 当前不可用；`npx --package playwright node -` 在本机 PowerShell/npm 环境下无法 resolve `playwright` 包，`@playwright/cli playwright-cli` 可用并已记录为工具选择。
- P4-B 最终验证未要求 Rust/Tauri/package 路径，因为本轮未修改 Rust、Tauri CSP/capabilities、sidecar startup、bind address 或 Rust diagnostics payload shape。若后续启用 video/audio playback 或 native save/open-folder，再进入 `cargo test`、`pnpm tauri build` 和 packaged smoke。

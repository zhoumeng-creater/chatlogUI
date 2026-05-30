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

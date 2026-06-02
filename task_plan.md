# Task Plan: chatlog_alpha 桌面应用开发

## Goal
将开源项目 chatlog_alpha 封装为 Tauri v2 + Mediator 四层架构的跨平台桌面应用。

## Current Phase
**UI/功能审计与重构规划** → 分析当前 UI 与 chatlog_alpha 功能边界，产出问题清单和修改路线图

## Phases

### Phase 1: 开发规划制定
- [x] 理解开发指南全文内容
- [x] 确认技术栈
- [x] 确认架构模式 (Mediator 四层架构)
- [x] 撰写总体开发规划主文档
- [x] 撰写 Sprint 1 详细规划
- **Status:** complete

### Phase 2: Sprint 1 - 基础设施建设
- [x] 3.1 项目脚手架 (7 tasks)
- [x] 3.2 Rust Sidecar 生命周期 (8 tasks)
- [x] 3.3 L4 原子层 (9 atoms)
- [x] 3.4 L3 分子层 (2 molecules)
- [x] 3.5 L2 协调层 (4 roles)
- [x] 3.6 L1 入口层 (3 tasks)
- [x] 3.7 窗口配置 (3 tasks)
- **Status:** complete

### Phase 3: Sprint 2 - 聊天记录系统
- [x] 2.0 真实 Sidecar 集成 (T-0.1 ~ T-0.5)
- [x] 2.1 数据接入 & 启动剧本扩展 (T-1.1 ~ T-1.10)
- [x] 2.2 L4 网络原子 — 数据 API 封装 (T-2.1 ~ T-2.8)
- [x] 2.3 L2 协调层 — 业务模块扩展 (T-3.1 ~ T-3.8)
- [x] 2.4 L3 分子层 — 聊天组件 (T-4.1 ~ T-4.6)
- [x] 2.5 L3 分子层 — 搜索组件 (T-5.1 ~ T-5.3)
- [x] 2.6 L3 分子层 — 统计组件 (T-6.1 ~ T-6.3)
- [x] 2.7 L4 UI 原子新增 (T-7.1 ~ T-7.4)
- [x] 2.8 L1 入口层扩展 (T-8.1 ~ T-8.4)
- [x] 2.9 全局样式增强 (T-9.1)
- **Status:** complete
- **规划文档:** docs/Sprint2-聊天记录系统详细规划.md

### Phase 4: Sprint 3 - AI 聊天分析系统
- [x] 3.0 API 类型定义 + 常量 + 错误码 (T-0.1 ~ T-0.3)
- [x] 3.1 L4 UI 原子新增: CodeBlock, ProgressBar (T-1.1 ~ T-1.3)
- [x] 3.2 L4 网络原子 — 语义 API 封装 (T-2.1 ~ T-2.8)
- [x] 3.3 L2 外交官扩展: sseParser, overloadInterceptor (T-3.1 ~ T-3.2)
- [x] 3.4 L2 AiStore 状态管理 (T-4.1)
- [x] 3.5 L2 AiCommander 总指挥官 (T-5.1)
- [x] 3.6 L3 分子层 — AI Panel 容器 (T-6.1)
- [x] 3.7 L3 分子层 — QA 面板 (T-7.1 ~ T-7.3)
- [x] 3.8 L3 分子层 — 搜索 + 分析面板 (T-8.1 ~ T-8.3)
- [x] 3.9 L3 分子层 — SetupWizard 配置向导 (T-9.1)
- [x] 3.10 L1 入口层修改 (T-10.1 ~ T-10.2)
- [x] 3.11 全局样式增强 (T-11.1)
- **Status:** complete (all source files exist)
- **规划文档:** docs/Sprint3-AI聊天分析详细规划.md

### Phase 5: Sprint 4 - 3D 知识图谱系统
- [x] 4.0 依赖安装 + API 类型 + 常量 (T-0.1 ~ T-0.3)
- [x] 4.1 L4 网络原子 — 图谱 API 封装 (T-1.1 ~ T-1.4)
- [x] 4.2 L2 GraphStore 状态管理 (T-2.1)
- [x] 4.3 L2 GraphCommander 指挥官 (T-3.1)
- [x] 4.4 L3 分子层 — 3D 图谱组件 (T-4.1 ~ T-4.4)
- [x] 4.5 L3 分子层 — 浮动容器 (T-5.1)
- [x] 4.6 L1 DashboardView 集成 (T-6.1)
- **Status:** complete
- **Design Spec:** docs/superpowers/specs/2026-05-28-sprint4-knowledge-graph-design.md
- **规划文档:** docs/superpowers/plans/2026-05-28-sprint4-knowledge-graph.md

### Phase 6: Sprint 5a - 高级功能 Part A
- [ ] 5a.0 API 类型 + 常量 (T-0.1 ~ T-0.2)
- [ ] 5a.1 L2 设置模块 (T-1.1 ~ T-2.1)
- [ ] 5a.2 L3 设置分子 (T-3.1 ~ T-3.5)
- [ ] 5a.3 L1 SettingsView + 路由 (T-6.1 ~ T-6.3)
- [ ] 5a.4 图谱状态扩展 (T-4.1 ~ T-4.2)
- [ ] 5a.5 图谱交互增强 (T-4.3 ~ T-4.6)
- [ ] 5a.6 图谱-聊天联动 (T-4.7)
- [ ] 5a.7 窗口材质 (T-5.1 ~ T-5.4)
- [ ] 5a.8 最终验证 (T-7.1)
- **Status:** planned (Design + Implementation Plan complete)
- **Design Spec:** docs/superpowers/specs/2026-05-28-sprint5a-advanced-features-design.md
- **规划文档:** docs/superpowers/plans/2026-05-28-sprint5a-advanced-features.md

### Phase 7: Sprint 5b - 高级功能 Part B
- [ ] 隐私模式 (头像模糊 + 文本掩码)
- [ ] 开发者控制台 (实时日志 + 导出)
- [ ] 图谱控制栏 (筛选/布局切换/手动刷新)
- [ ] 时间轴叠加
- **Status:** planned (Design + Implementation Plan complete, source files exist)
- **Design Spec:** docs/superpowers/specs/2026-05-28-sprint5b-advanced-features-design.md
- **规划文档:** docs/superpowers/plans/2026-05-28-sprint5b-advanced-features.md

### Phase 8: Sprint 6 - 交付与发布
- [ ] CI/CD 流水线 (GitHub Actions: release.yml + build-check.yml)
- [ ] 安装包制作 (.dmg + .msi)
- [ ] GitHub Releases 自动发布 + update.json 生成
- [ ] 应用内更新机制 (tauri-plugin-updater + UpdateNotification)
- [ ] 关于页 "检查更新" 按钮
- **Status:** planned (Design + Implementation Plan complete)
- **Design Spec:** docs/superpowers/specs/2026-05-28-sprint6-release-design.md
- **规划文档:** docs/superpowers/plans/2026-05-28-sprint6-release.md

## Key Decisions
| Decision | Value |
|----------|-------|
| Package manager | pnpm (11.4.0) |
| Port | 5030 (not 8080 as in original spec) |
| Health endpoint | /health (not /api/v1/db) |
| Sidecar binary | Go mock (real chatlog_alpha integration in Sprint 2) |
| TDD approach | Deferred to Sprint 2 (Sprint 1 is infrastructure scaffold) |

### Phase 9: UI/功能审计与重构规划
- [x] 检查既有计划与仓库状态
- [x] 梳理当前 UI 仓库结构、运行方式和错误
- [x] 对照 chatlog_alpha 原始能力与 CLI/HTTP 接口
- [x] 审计 UI 信息架构、视觉设计、交互流程、可访问性与响应式问题
- [x] 审计功能实现缺口、数据流、sidecar/后端集成与错误处理
- [x] 输出按优先级排序的问题指南与完整修改规划
- **Status:** complete

### Phase 10: P0 启动基础重构规划
- [x] 读取 P0 相关源码与原始 chatlog_alpha 配置/API 证据
- [x] 明确 P0 目标、非目标、状态机、配置模型和安全边界
- [x] 撰写独立 P0 修复规划文档
- [x] 校验文档格式并记录最终结果
- **Status:** complete

### Phase 11: P1 核心聊天工作台重构实施
- [x] Task 1-2: 合约夹具 + Raw DTO + 适配器 (52 adapter tests)
- [x] Task 3: 重写网络 fetchers (fetchSessions/fetchContactsApi/fetchChatRoomsApi/fetchConversations + 修正参数名)
- [x] Task 4: 重建 Chat Store/Commander (Conversation/ChatMessage 模型)
- [x] Task 5-6: 重写会话侧边栏 + 消息转录面板
- [x] Task 7: 修复全局搜索和搜索结果
- [x] Task 8: 修复统计和趋势面板
- [x] Task 9: 实现 detectWxPath (P0 遗留)
- [x] Task 10-11: Workbench shell 清理 + 视觉质量
- [x] Task 12: 验证 (lint 0, typecheck 0, test 92/92, build OK, cargo test 16/16)
- **Status:** complete
- **规划文档:** docs/superpowers/plans/2026-05-29-p1-core-chat-workbench-refactor.md

### Phase 12: P2-A UI Foundation And Shell Implementation
- [x] A1: 捕获 P2-A 前基线，记录 Setup/Workbench/Settings 的桌面与窄屏问题
- [x] A2: 引入 lucide-react，替换 AppLayout 与 AI Panel 的 emoji/字符图标
- [x] A3: 建立 CSS token、布局与 motion 基线
- [x] A4: 建立 Button/IconButton/Tooltip/Surface/StatusIndicator 等 L4 UI primitives，并清理 Typography 负字距
- [x] A5: 拆分 AppLayout 为标题栏、全局命令区、状态区与语义 StatusBar
- [x] A6: 引入 WorkbenchFrame 与响应式 workbenchLayout 测试，替代旧固定三栏 Dashboard 布局
- [x] A7: 完成 Setup Center 第一轮视觉重构
- [x] A8: 完成 Settings 路由与视觉地基重构，移除 SettingsLayout 对 GlassPanel 的依赖
- [x] A9: 执行 lint/typecheck/test/build/cargo 与浏览器视觉验证
- **Status:** complete
- **规划文档:** docs/superpowers/plans/2026-05-29-p2-apple-like-ui-system-refactor.md

### Phase 13: P2-B Core Workbench Polish Planning
- [x] 读取并对齐 P2-A 完成状态、P2 总规划、P1 handoff、审计规划和历史 Sprint 文档
- [x] 核对当前 `DashboardView`、WorkbenchFrame、chat/search/stats 源码与测试结构
- [x] 明确 P2-B 范围：conversation list、transcript、search panel、stats inspector
- [x] 撰写独立 P2-B 实施计划文档
- [x] 完成计划文档占位词和范围自查
- [x] 二次对照 Code Review Remediation 后的当前源码，修订 P2-B 起点和执行步骤
- [x] 补充 `WorkbenchView`、`useWorkbenchCommander`、`StatsInspector`、`ContactList` 兼容 wrapper 和 `ContactItem` 删除等计划细节
- **Status:** complete
- **规划文档:** docs/superpowers/plans/2026-05-29-p2-b-core-workbench-polish.md

### Phase 14: Code Review Remediation
- [x] 加载本轮必需技能并恢复 planning-with-files 上下文
- [x] 读取 `Code review.md`、当前计划/发现/进度文件、开发文档目录和文档标题索引
- [x] 对照 P2-A/P2-B/P2-D 与四层架构要求核验 6 个 urgent item
- [x] 建立/更新实施计划，覆盖 WorkbenchView、L1 编排下沉、Graph 模块化、single 模式返回路径、设计系统补齐、导航 active 状态
- [x] 按 TDD 添加回归测试并确认失败
- [x] 实施代码修复并保持四层架构边界
- [x] 运行 lint/typecheck/test/build 与必要浏览器验证
- **Status:** complete
- **Review Source:** Code review.md
- **规划文档:** docs/superpowers/plans/2026-05-29-code-review-remediation.md

### Phase 15: P2-B Core Workbench Polish Implementation
- [x] B0: 基线验证、文档优先级和当前源码约束确认
- [x] B1-B2: 会话列表 helper、ConversationList/Row/Toolbar、ContactList wrapper、删除 ContactItem
- [x] B3-B4: transcript helper、TranscriptHeader、MessageMeta/Group、诚实渲染 unknown direction
- [x] B5: 搜索范围、搜索结果状态、active result 和当前会话 scope
- [x] B6: stats helper、metric rows、趋势表格 fallback
- [x] B7: WorkbenchView composition 和 single-pane flow 复核
- [x] B8: lint/typecheck/test/build 和浏览器 smoke
- **Status:** complete
- **规划文档:** docs/superpowers/plans/2026-05-29-p2-b-core-workbench-polish.md

### Phase 16: P2-B 综合审查与修复计划
- [x] 对照 P2-B、P2 总规划、开发指南、总体规划和 ready-desktop-app spec 审查当前代码
- [x] 记录 privacy、long-history、architecture、UI consistency、productization、release-gate 和 dev-port 问题
- [x] 新建综合审查记录：`docs/reviews/2026-05-30-p2-b-comprehensive-review.md`
- [x] 新建完整修复计划：`docs/superpowers/plans/2026-05-30-p2-b-comprehensive-remediation.md`
- **Status:** complete

### Phase 17: P2-B Suggested Fix Remediation
- [x] 添加 targeted regression tests 并确认 privacy/search/transcript RED
- [x] 修复 privacy aria/avatar accessibility masking
- [x] 为 transcript 接入 bounded virtual rows
- [x] 接入 stats inspector measured-width fallback
- [x] 修复 setup raw button 与 credential form semantics
- [x] 增加 search explicit status 和 invalid/empty rendering
- [x] 迁移 canonical dev port 到 5173/5174
- [x] 补 release evidence、architecture checklist 和 release runbook
- [x] 运行 pnpm verify、cargo test、pnpm tauri build 与 1440/390 UI smoke
- **Status:** complete
- **保留计划:** docs/superpowers/plans/2026-05-30-p2-b-comprehensive-remediation.md（仍有后续 architecture/legacy UI/release smoke 债务）

### Phase 18: P2-C Settings And Diagnostics Polish Planning
- [x] 恢复 planning-with-files 上下文并建立 `codex/p2-c-settings-diagnostics-planning` 分支
- [x] 读取 AGENTS、总体开发规划、开发指南、ready-desktop-app 规格、P2/P2-B 计划、审查记录和当前进度
- [x] 审计当前 Settings、Setup、diagnostics、status、redaction、Tauri export 和相关 L2/L3/L4 代码
- [x] 明确 P2-C 边界：settings center、diagnostics/export、readiness/status、privacy redaction；排除 P2-D AI/Graph 和 P2-E release gate
- [x] 撰写独立 P2-C 实施规划，按 TDD、架构边界、UI acceptance、productization 和 release-risk 顺序拆分任务
- [x] 完成规划文档占位词、范围、架构边界和验证清单自查
- [x] 二次复核当前源码和产品化契约，修订 P2-C 计划中的 L4/L2 依赖、诊断 fail-closed、SettingsLayout 边界、setup picker 下沉和 C0 基线问题
- **Status:** complete
- **规划文档:** docs/superpowers/plans/2026-05-30-p2-c-settings-diagnostics-polish.md

### Phase 19: P2-C Settings And Diagnostics Polish Implementation
- [x] 增加 RED/GREEN 测试覆盖 readiness model、diagnostic redaction、diagnostics report、settings validation/migration 和 Rust log redaction
- [x] 统一 `StatusIndicator` tone taxonomy 为 neutral/info/success/warning/danger/ai，并更新会话 badge 与 StatusBar 语义索引展示
- [x] 扩展前端 redaction helper，诊断摘要默认脱敏 path/key/token/credential/private id
- [x] 新增 user-triggered diagnostics report/export flow，并让 legacy `export_logs` 走 Rust fail-closed redaction guard
- [x] 移除 UI settings 中的 persisted `aiApiKey`，增加诚实的 AI credential 状态和设置验证反馈
- [x] 将 SettingsView 收敛到 L2 `useSettingsPageCommander`，将 settings/setup directory picking 下沉到 L2 commander
- [x] 迁移 Setup readiness/service controls、DevConsole、UpdateNotification 的 P2-C 范围 legacy UI 控件
- [x] 更新 ready-desktop-app tasks、release evidence、architecture boundary checklist 和 release runbook
- **Status:** complete

### Phase 20: P2-D AI And Graph Containment Planning
- [x] 恢复 planning-with-files 上下文并确认当前分支/脏工作区边界
- [x] 读取 AGENTS、总体开发规划、开发指南、ready-desktop-app 规格/契约、release runbook、P2/P2-B/P2-C 计划和当前进度记录
- [x] 对照 `chatlog_alpha` 实际 semantic/graph API 契约，确认当前 UI 的 config、index、test、SSE、graph status/query/visualize 适配风险
- [x] 审计当前 semantic、graph、workbench 源码，记录 legacy UI、隐私、状态、SSE、JSON format、Graph chunk 和 3D canvas 边界问题
- [x] 明确 P2-D 边界：语义/图谱模块 containment、真实契约适配、可取消状态、隐私遮蔽、图谱 bounded fallback 和按需 3D；排除 sidecar 改约、P3 深度功能和 P2-E release smoke
- [x] 撰写独立 P2-D 实施规划，按 TDD、L4 adapters、L2 view models、L3 UI containment、workbench navigation、productization evidence 和 verification matrix 拆分任务
- [x] 同步 `findings.md` 与 `progress.md`，记录 P2-D 审计结论和规划路径
- [x] 二次复核当前源码和 `chatlog_alpha` 合约，补充 semantic exact config fields、QA request body、topics/profiles adapters、graph timeline/actions 和 StatusBar compact semantic state
- **Status:** complete
- **规划文档:** docs/superpowers/plans/2026-05-31-p2-d-ai-graph-containment.md

### Phase 21: P2-D AI And Graph Containment Implementation
- [x] D0: 基线、文档和 semantic/graph 源码库存确认
- [x] D1: 语义 REST raw DTO、adapter tests、`requestJson()` 迁移和 semantic API 类型修正
- [x] D2: SSE event-name parser、QA stream payload、stop/cancel/empty/error 状态
- [x] D3: semantic store/commander/view-model 和 StatusBar compact semantic state
- [x] D4: semantic module UI containment、setup wizard、search/topics/profile/QA 隐私和状态修复
- [x] D5: graph REST raw DTO、adapter tests、timeline/actions atoms 和 `requestJson()` 迁移
- [x] D6: graph store/commander/view-model、optional failure 和 navigation state
- [x] D7: graph summary/table 默认视图、privacy display helpers 和 on-demand 3D lazy boundary
- [x] D8: graph canvas deterministic/reduced-motion/performance/cursor cleanup
- [x] D9: Workbench semantic/graph module navigation and leave/cancel recovery
- [x] D10: T031-T038、release evidence、architecture checklist 和 release runbook 更新
- [x] D11: targeted tests、full verification、browser UI acceptance 和 privacy scans
- **Status:** complete
- **规划文档:** docs/superpowers/plans/2026-05-31-p2-d-ai-graph-containment.md

### Phase 22: P2-D Comprehensive Review And Remediation Planning
- [x] 对照 P2-D 当前源码、`chatlog_alpha` 真实 semantic/profile contract、开发指南、总体规划、constitution、ready-desktop-app tasks/release evidence 和 UI 质量要求进行综合复核
- [x] 记录 semantic search/profile adapter fixture 与真实后端不一致、semantic state 覆盖不足、L3/L4 架构边界、visible UI consistency、release evidence 和 graph chunk/performance 风险
- [x] 新建综合审查记录：`docs/reviews/2026-05-31-p2-d-comprehensive-review.md`
- [x] 新建完整修复计划：`docs/superpowers/plans/2026-05-31-p2-d-comprehensive-remediation.md`
- [x] 同步 `findings.md` 与 `progress.md`，明确 P2-D 在修复计划执行前不能称为全面完成
- **Status:** complete

### Phase 23: P2-D Comprehensive Remediation Implementation
- [x] 加载并采用本轮必要技能：using-superpowers、planning-with-files、receiving-code-review、chatlog-debug、executing-plans、test-driven-development、app-productization、ui-acceptance、frontend-design、sidecar-integration、verification-before-completion；requesting-code-review 受当前工具约束不能派发 subagent，改为完成后执行本地 review/scan。
- [x] 确认当前分支为 `codex/p2-d-ai-graph-containment`，保留既有 P2-C/P2-D 未提交源码和文档上下文，不回滚已有改动。
- [x] 读取 P2-D 综合复核记录、完整修复计划、P2-D 原计划、P2 总规划、ready-desktop-app spec/tasks/contracts/release evidence/architecture checklist、constitution、开发指南、总体规划和文档标题索引。
- [x] 记录初始架构扫描：semantic/graph leaf 仍有 L2 imports，L4 system/network 仍有 L2 type imports，visible semantic/graph 控件仍需修复。
- [x] Task 0-2: 用真实后端-shaped semantic search/profile fixtures 做 RED/GREEN，修复 adapter 与 UI 展示。
- [x] Task 3-5: 收敛 semantic/graph leaf props 边界并移除 L4 upward type dependencies。
- [x] Task 6-8: polish semantic/graph visible controls，更新 architecture/release evidence/tasks。
- [x] Task 9: 运行 targeted tests、`pnpm verify`、必要 Rust/Tauri 验证、browser UI acceptance 和最终 scans。
- [x] Verification: target P2-D tests PASS（13 files / 57 tests）；`pnpm verify` PASS（56 files / 318 tests）；`cargo test` PASS（17 tests）；`pnpm tauri build` PASS；mocked Playwright desktop/390px acceptance PASS；final scans PASS with only recorded module-root L2 exceptions.
- **Status:** complete
- **规划文档:** docs/superpowers/plans/2026-05-31-p2-d-comprehensive-remediation.md

### Phase 24: P2-D Comprehensive Remediation Recheck
- [x] 复核用户修复后的 semantic adapter、profile adapter、leaf props boundary、L4 independence、unsafe UI 和 raw network scan。
- [x] 复跑 targeted P2-D tests、`pnpm verify`、`cargo test` 和 `pnpm tauri build`，均通过；保留 GraphCanvas chunk warning 和 Rust crate name warning。
- [x] 确认 `AiPanel.tsx` 仍有 `ai.phase` 分支，未完全满足综合修复计划 Task 3 的 `moduleView` 渲染要求。
- [x] 尝试 fresh browser UI smoke；browser-use 超时，headless Chrome 被 `/workbench` setup/db gate 阻断，未能重新进入 semantic/graph 模块完成 1440px/390px 复测。
- [x] 确认综合审查和修复计划不删除，直到上述剩余项被修复或明确记录为接受债务。
- **Status:** superseded by Phase 25
- **保留计划:** docs/reviews/2026-05-31-p2-d-comprehensive-review.md；docs/superpowers/plans/2026-05-31-p2-d-comprehensive-remediation.md

### Phase 25: P2-D Suggested Fix Implementation
- [x] TDD RED：新增 semantic module checking state、workbench shell L2 gate 和 setup center L2 readiness view-model 测试，并确认当前实现失败。
- [x] GREEN：`AiPanel` 改为从 `ai.moduleView.kind` 渲染，不再读取 `ai.phase`。
- [x] GREEN：新增 `useWorkbenchShellCommander`/`deriveWorkbenchShellView`，将 `/workbench` setup/db gate 收敛到 L2，并提供 dev-only browser smoke override。
- [x] GREEN：新增 `useSetupCenterCommander`/`deriveSetupCenterView`，移除 `SetupCenterView` 的 L1 store 读取。
- [x] 架构扫描：L1 不再命中 setup/app stores、browser storage 或 Zustand；L1/L3 不再命中 `ai.phase`。
- [x] Verification：targeted tests PASS（4 files / 21 tests）；`pnpm typecheck` PASS；`pnpm lint` PASS；`pnpm verify` PASS（57 files / 322 tests，build PASS，保留 GraphCanvas chunk warning）。
- [x] UI acceptance：headless Chrome 检查 `/workbench?codex-smoke=workbench-ready` 和 `/` 的 1440px/390px；workbench controls、graph panel、setup center 均渲染，page-level horizontal overflow 为 false。
- **Status:** complete

### Phase 26: P2-E Visual QA Accessibility And Release Gate Planning
- [x] 恢复 planning-with-files 上下文并确认当前分支/脏工作区边界。
- [x] 重新读取总体开发规划、开发指南、ready-desktop-app spec/plan/research/data-model/contracts/tasks/quickstart、release evidence、release runbook、P2-A/P2-B/P2-C/P2-D 计划与复核记录。
- [x] 对照当前源码扫描 P2-E 相关风险：UI inline/hard-coded styles、UpdateNotification dialog 语义、WorkbenchFrame drawer focus、Stats/Workbench privacy surface、GraphCanvas lazy chunk、release-gate 手工 evidence 缺口。
- [x] 明确 P2-E 边界：visual QA matrix、keyboard/accessibility、privacy diagnostics/screenshots、graph explicit visualization evidence、Windows x64 installer/launch/quit/reopen/port-conflict smoke；排除后端改约、macOS 发布、完整 updater release pipeline 和 P3 功能。
- [x] 撰写独立 P2-E 实施规划，按 baseline scans、privacy regression、drawer/update a11y、visual matrix、keyboard/privacy audit、graph evidence、Windows smoke、release docs closeout 和 final verification 拆分任务。
- [x] 同步 `findings.md` 与 `progress.md`，记录 P2-E 规划发现和后续执行入口。
- [x] 二次复核 P2-E 草稿与当前源码，补充 `127.0.0.1:5030` vs `0.0.0.0:5030` sidecar bind-address drift、当前架构扫描结果、drawer/update notification a11y 证据和 stats/workbench privacy regression 入口。
- **Status:** complete
- **规划文档:** docs/superpowers/plans/2026-06-01-p2-e-visual-qa-accessibility-release-gate.md

### Phase 27: P2-E Visual QA Accessibility And Release Gate Implementation
- [x] 加载并采用本轮必要技能：using-superpowers、planning-with-files、chatlog-debug、brainstorming（以既有 P2-E 计划作为已批准设计基线）、executing-plans、test-driven-development、app-productization、frontend-design、ui-acceptance、sidecar-integration、release-gate、verification-before-completion；requesting-code-review 受当前工具约束不能派发 subagent，将以本地 review/scans 替代。
- [x] 确认当前分支为 `codex/p2-d-ai-graph-containment`，不是 `master`；当前工作树已有大量 P2-C/P2-D/P2-D suggested-fix 未提交改动，P2-E 计划明确要求这些改动作为基线，不能用普通新 worktree 丢失上下文。
- [x] 重新读取核心开发文档：`AGENTS.md`、`开发指南.md`、`docs/总体开发规划.md`、`.specify/memory/constitution.md`、ready-desktop-app spec/plan/research/data-model/quickstart/contracts/tasks/release evidence/architecture checklist、release runbook 和 P2-E 计划。
- [x] 建立 P2-E 视觉 QA 矩阵骨架，覆盖 setup、workbench、dashboard alias、settings、update notification、dev console/diagnostics、privacy 和 release smoke 证据状态。
- [x] E1: 用 TDD 修复 stats/workbench privacy regression，覆盖 stats top sender 文本/avatar alt/fallback 和 toolbar conversation title。
- [x] E2: 用 TDD/源码验证修复 Workbench drawer 与 UpdateNotification 的 dialog/focus/Escape/progressbar 语义。
- [x] E3-E5: 执行可自动化的 visual/accessibility/privacy/graph evidence，并如实记录不能自动完成的 manual smoke blocker。
- [x] E6-E8: 运行 targeted/full verification，更新 release evidence、architecture checklist、release runbook，并完成本地 review/scans。
- **Status:** complete with manual release-smoke blocker
- **规划文档:** docs/superpowers/plans/2026-06-01-p2-e-visual-qa-accessibility-release-gate.md

### Phase 28: P2-E Comprehensive Review And Remediation Planning
- [x] 对照 P2-E 当前代码、release evidence、visual QA matrix、architecture checklist、release runbook、AGENTS、开发指南、总体规划、constitution 和 ready-desktop-app spec/contracts/tasks 进行综合复核。
- [x] 明确记录 P2-E 不能称为全量完成或 release-ready 的原因：Windows x64 packaged-app smoke 未执行、T042 未完成、完整隐私诊断包审计未完成、sidecar bind-address 合同漂移、L2-to-L3 架构依赖、L3 store/commander 例外、UI tokenization 和窄屏 polish 债务。
- [x] 新建综合审查记录：`docs/reviews/2026-06-01-p2-e-comprehensive-review.md`
- [x] 新建完整修复计划：`docs/superpowers/plans/2026-06-01-p2-e-comprehensive-remediation.md`
- [x] 同步 `findings.md` 与 `progress.md`，明确当前正确状态为 “P2-E automated verification passed with caveats; release readiness blocked”。
- **Status:** complete
- **后续执行入口:** docs/superpowers/plans/2026-06-01-p2-e-comprehensive-remediation.md

### Phase 29: P2-E Comprehensive Remediation Implementation
- [x] 加载并采用本轮必要技能：using-superpowers、planning-with-files、receiving-code-review、chatlog-debug、executing-plans、test-driven-development、app-productization、ui-acceptance、frontend-design、sidecar-integration、release-gate、systematic-debugging、verification-before-completion；brainstorming 以既有 P2-E 综合修复计划作为已批准设计基线，不重新发起设计询问。
- [x] 确认当前分支为 `codex/p2-d-ai-graph-containment`，不是 `master`；当前工作树已有大量 P2-C/P2-D/P2-E 未提交改动，本轮继续基于这些当前进度修复，不回滚既有文件。
- [x] 读取 P2-E 综合审查记录、综合修复计划、release evidence、architecture checklist、release runbook、constitution、开发指南、总体规划和当前工作记忆；确认 release-ready/T042 仍保持阻塞状态。
- [x] Task 0: 冻结基线和证据措辞，避免任何未验证 release-ready 声明。
- [x] Task 2-3: 通过 Rust 测试和文档统一修复 sidecar ownership 与 `127.0.0.1:5030` bind-address 合同。
- [x] Task 4-5: 修复 L2-to-L3 workbench layout 反向依赖，并明确或收敛 L3 shell/update commander/store 例外。
- [x] Task 6-10: 对可自动化的 UI token、a11y、privacy diagnostics、visual QA、graph performance caveat 逐项闭合或记录阻塞原因。
- [x] Task 11: 运行 targeted/full verification、最终架构扫描并更新 evidence；Windows x64 packaged-app manual smoke 如未实际执行则继续保持 T042 未完成。
- **Status:** complete with manual release-smoke blocker
- **规划文档:** docs/superpowers/plans/2026-06-01-p2-e-comprehensive-remediation.md

### Phase 30: P2-E Comprehensive Remediation Recheck
- [x] 复核用户按 P2-E 综合修复计划提交后的代码、release evidence、architecture checklist、visual QA matrix、Tauri sidecar ownership、common shell split、update notification focus 和 UI tokenization 状态。
- [x] 运行 targeted P2-E tests、`pnpm typecheck`、`cargo fmt --check`、`pnpm verify`、`cargo test`、`pnpm tauri build` 和 `git diff --check`；自动化验证均通过，保留 GraphCanvas lazy chunk warning、Rust crate-name warning 和 CRLF 规范化提示。
- [x] 运行最终架构扫描：L2/L4-to-L3、L1/L3 raw network、L4-to-L2、L1/L3 `ai.phase`、旧 unsafe UI 关键词均无命中；L3 commander/store 扫描仍有已记录 staged debt 和一个未完全理想的 `WorkbenchRail` L2 helper import。
- [x] 运行 Chrome/Playwright fallback UI smoke：`/`、`/settings`、`/workbench?codex-smoke=workbench-ready` 在 390px/1440px 无 page-level overflow；仍观察到底部状态栏独立显示 `:5030`，不够清晰。
- [x] 决策：不删除 `docs/reviews/2026-06-01-p2-e-comprehensive-review.md` 或 `docs/superpowers/plans/2026-06-01-p2-e-comprehensive-remediation.md`，因为 T042/manual packaged-app smoke、真实 packaged diagnostics artifact review、部分 L3 staged debt 和 UI polish 仍未关闭。
- **Status:** complete; remediation plan retained

### Phase 31: P2-E Suggested Fix Implementation
- [x] 用 TDD 复现并保护 `WorkbenchRail` 架构边界：L3 rail 必须由 props 驱动，不能导入 L2 helper。
- [x] 用 TDD 复现并保护状态栏端口文案：端口显示必须是可读标签，不能是孤立 `:5030`。
- [x] 修复 L2/L1/L3 数据流：`useWorkbenchCommander` 生成 `railItems`，`WorkbenchView` 传入 `WorkbenchRail`，`WorkbenchRail` 只负责渲染和回调。
- [x] 修复 UI polish：`StatusBar` 通过 `formatSidecarPortLabel()` 显示 `端口 5030`。
- [x] 验证：targeted tests PASS（2 files / 2 tests）；`pnpm typecheck` PASS；`pnpm verify` PASS（62 files / 338 tests）；`git diff --check` 无 whitespace error，仅 CRLF warning。
- [x] UI smoke：`/settings` 与 `/workbench?codex-smoke=workbench-ready` 在 390px 下无 overflow、无过小按钮，状态栏端口文案正确；本地 dev server 已停止。
- [x] 决策：保留 P2-E 综合 review/plan，因为 manual packaged app smoke、真实 packaged diagnostics artifact review 和 T042 仍未完成。
- **Status:** complete with manual release-smoke blocker

### Phase 32: P2-E Packaged Release Gate Closure
- [x] 复核 P2-E 综合修复计划中的 T042 条件，确认需要真实 Windows x64 packaged install/open/quit/reopen、app-managed sidecar health、unknown `5030` conflict 和 packaged diagnostics artifact review。
- [x] 修复 Rust crate warning：`chatlogUI_lib` 改为 `chatlog_ui_lib`，`main.rs` 同步引用；`cargo test` 不再出现 crate-name warning。
- [x] 修复 GraphCanvas chunk warning：`vite.config.ts` 将 3D graph vendor 拆成 explicit-click `vendor-graph-3d` lazy chunk，并设置明确 3D vendor budget；`GraphCanvas` chunk 降到 12.93 kB，build 不再报警。
- [x] 真实 packaged smoke 发现并修复 sidecar runtime path：Tauri build 将 `externalBin` 复制为安装根目录 `chatlog_alpha.exe`，Rust runtime 必须调用 `sidecar("chatlog_alpha")` 而不是 `sidecar("binaries/chatlog_alpha")`。
- [x] 真实 packaged quit smoke 发现并修复 app-exit cleanup：`on_window_event(CloseRequested)` 调用 `shutdown_sidecar_for_app_exit()`，关闭 app 后清理 app-managed child 和 managed PID。
- [x] 重打包并重装最新 NSIS artifact；验证安装 app 无终端启动、clean profile 进入 setup/config、合成保存配置重开进入 service controls。
- [x] 验证 app-managed sidecar：UIA 触发 `启动服务` 后 `/health` 返回 `{"status":"ok"}`，`5030` owner 为安装目录 `chatlog_alpha.exe`。
- [x] 验证 packaged diagnostics artifact：UIA 触发 `导出诊断`，`%TEMP%\chatlog_alpha_diagnostics.log` 为 14 lines / 433 bytes，无 raw 合成 key、无合成私密文本、无完整用户 profile path。
- [x] 验证 quit/reopen/unknown conflict：关闭 app 后无 `chatlog*` 和无 `5030` listener；reopen 恢复 service controls；外部 PowerShell `TcpListener` 占用 `5030` 时 UI 显示可恢复冲突且未杀掉外部 listener。
- [x] 清理 smoke 合成配置和临时数据目录，确认无残留 `chatlog*` 进程或 `5030` listener。
- [x] 更新 `release-evidence.md`、`p2-e-visual-qa-matrix.md`、`docs/release/ready-desktop-app.md`，并在证据满足后勾选 T042。
- [x] 最终验证通过：`pnpm verify` 62 files / 338 tests；`cargo fmt --check` PASS；`cargo test` 20 tests；`pnpm tauri build` PASS；`git diff --check` 无 whitespace error，仅 CRLF normalization warnings。
- **Status:** complete

### Phase 33: P4/P5 Advanced Capabilities, Diagnostics, Privacy, E2E, And Release Quality Planning
- [x] 加载并采用本轮必要技能：using-superpowers、planning-with-files、writing-plans、brainstorming、frontend-design、ui-ux-pro-max、frontend-code-review（作为审查视角）、ui-acceptance、sidecar-integration、app-productization、release-gate、playwright、verification-before-completion。
- [x] 复读当前开发进度：P2-E packaged Windows gate、release evidence、visual QA matrix、ready desktop release runbook、architecture checklist、当前 `task_plan.md` / `findings.md` / `progress.md`。
- [x] 对照当前源码确认 P4/P5 缺口：network exports 只覆盖 core/semantic/graph/update；Workbench 模块尚无 media/SNS/DB/hook/developer advanced grouping；DevConsole 仍主要是 sidecar logs；E2E 目录不存在。
- [x] 对照本地 `chatlog_alpha` 原始能力：media resources、SNS、DB explorer/search/query/cache、hook/Hermes/SSE、MCP/wx-cli、semantic preview、graph ingest/QA、favorites/members/unread/new_messages。
- [x] 复核 CI/release 现状：build-check/release workflow 已存在，但 `cmd/chatlog` 不在本仓库，`src-tauri/binaries/` 被忽略，真实 GitHub release 仍需要 sidecar artifact acquisition/reproducibility 方案。
- [x] 记录 P4/P5 规划发现到 `findings.md`，包括 CSP media-src 风险、diagnostic event pipeline、privacy/screenshot-safe 扩展、fixture/E2E 缺口和 ui-ux-pro-max Windows 输出注意事项。
- [x] 新建独立规划文档：`docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`。
- [x] 将 P4/P5 拆分为 P4/P5-0 foundation、P4-A diagnostics/privacy、P4-B media/favorites/members/unread、P4-C SNS、P4-D DB/API runner、P4-E hook/MCP/residuals、P5-A contract tests、P5-B E2E/visual/a11y、P5-C release pipeline、P5-D governance。
- [x] 在规划中给出第一分任务 P4/P5-0 的详细执行步骤、文件范围、验收标准和验证命令。
- **Status:** complete
- **规划文档:** docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md

### Phase 34: P4/P5-0 Dedicated Foundation Planning
- [x] 按用户要求单独开始 P4/P5-0（能力矩阵、诊断/隐私基座、E2E fixture 基础）阶段规划撰写，本轮限定为规划/文档，不执行源码功能实现。
- [x] 重新采用并检查本轮相关技能：using-superpowers、planning-with-files、writing-plans、app-productization、brainstorming、frontend-design、ui-acceptance、sidecar-integration、release-gate、test-driven-development、verification-before-completion、playwright、ui-ux-pro-max；using-git-worktrees 已评估但因当前 dirty branch 是必要上下文而不创建新 worktree。
- [x] 复核当前开发进度和证据基线：P2-E packaged release gate closure、ready-desktop-app release evidence、visual QA matrix、release runbook、architecture checklist、当前工作记忆文件和既有 P4/P5 总路线图。
- [x] 重新对照核心文档和源码：`AGENTS.md`、`开发指南.md`、`docs/总体开发规划.md`、`docs/ui-functional-audit-and-redesign-plan.md`、constitution、ready-desktop-app spec/contracts/tasks、L4 network/httpClient、DevConsole、diagnostics、maskSecrets、Tauri diagnostics/CSP、CI/release workflow、Workbench module model。
- [x] 对照本地 `chatlog_alpha` README、`cmd_http.go` 和 HTTP route registration，确认 P4/P5-0 能力矩阵需要覆盖 media、chat extensions、SNS、DB explorer/query/cache、hook/Hermes/SSE、MCP、semantic index preview、graph residuals。
- [x] 新建 P4/P5-0 专项实施计划，明确 scope、out-of-scope、文件落点、能力矩阵草案、诊断事件模型、隐私合同、synthetic fixture 策略、实施步骤、验收标准、风险和后续阶段入口。
- [x] 更新宽口径 P4/P5 总路线图，增加专项计划链接并修正 DevConsole 真实路径为 `src/l3-molecule/common/DevConsole.tsx`。
- **Status:** complete
- **规划文档:** docs/superpowers/plans/2026-06-01-p4-p5-0-capability-diagnostics-e2e-foundation.md

### Phase 35: P4/P5-0 Foundation Implementation
- [x] 用户已明确要求按 P4/P5-0 专项计划执行代码撰写；上一轮计划视为已批准设计，不再重新开启提问式设计流程。
- [x] 加载并采用执行所需技能：using-superpowers、executing-plans、test-driven-development、planning-with-files、app-productization、using-git-worktrees、brainstorming、frontend-design、ui-acceptance、sidecar-integration、release-gate、verification-before-completion、playwright、browser、ui-ux-pro-max；systematic-debugging 将在遇到失败时启用。
- [x] 执行分支基线确认：当前分支为 `codex/p2-d-ai-graph-containment`，不是 `master`；工作树包含大量既有 P2-E/P4-P5 未提交上下文，本轮不创建普通新 worktree，避免丢失当前开发进度。
- [x] 创建 `specs/002-advanced-capabilities/`、补齐 `specs/001-ready-desktop-app/test-data-policy.md`，并建立 E2E synthetic fixture 基础。
- [x] TDD 创建并实现 L4 diagnostic event atom。
- [x] TDD 扩展 `requestJson` 可选脱敏 HTTP diagnostic event。
- [x] TDD 创建 L2 diagnostic event store/view model，并接入 diagnostics/dev console commander。
- [x] 升级 DevConsole foundation UI，保留基础日志能力并新增统一事件摘要过滤。
- [x] 运行 targeted tests、typecheck、UI/browser acceptance、隐私/fixture scans、`pnpm verify`、`git diff --check`，并同步工作记忆。
- **Status:** complete
- **规划文档:** docs/superpowers/plans/2026-06-01-p4-p5-0-capability-diagnostics-e2e-foundation.md

### Phase 36: P4/P5-0 Review Fix Implementation
- [x] TDD 复现并修复 `requestJson` 外部 `AbortSignal` 被内部 timeout controller 覆盖的问题；caller cancel 现在产生 `http.abort` 诊断事件和 `请求已取消` 错误，不再等待 timeout。
- [x] 扩展 `diagnosticEvents` HTTP error kind，区分 `timeout` 与 caller `abort`，避免取消操作被误归类为超时。
- [x] 将 `capability-matrix.md` 从能力族概览补强为 endpoint-level inventory，覆盖 core、semantic、graph、media、chat extensions、SNS、DB、API runner、hook/Hermes/SSE、MCP、diagnostics 和 release quality。
- [x] 新增 `specs/002-advanced-capabilities/e2e-matrix.md`，明确 route/state/viewport/privacy/fixture/phase ownership；同步 README、fixture plan 和 P4/P5-0 专项计划。
- [x] 同步宽口径 P4/P5 总计划中过时的 diagnostic event 接口描述和 fixture 文件名，避免后续执行按旧全局 emitter 或旧 fixture 名称开发。
- [x] 验证通过：targeted diagnostic/http tests PASS（5 files / 22 tests）；`pnpm typecheck` PASS；`pnpm verify` PASS（65 files / 352 tests，build PASS）；placeholder/privacy/architecture/stale-interface scans 无输出；`git diff --check` 无 whitespace error，仅既有 LF/CRLF warning。
- **Status:** complete

### Phase 37: P4-A Developer Diagnostics And Privacy Mode 2.0 Planning
- [x] 加载并采用本轮规划所需技能：using-superpowers、planning-with-files、brainstorming、writing-plans、app-productization、using-git-worktrees；同时评估 UI、sidecar、release、verification 相关技能作为规划审查视角。
- [x] 创建隔离 worktree/分支 `codex/p4a-diagnostics-privacy-plan`，避免直接在 `master` 上撰写非平凡规划。
- [x] 读取当前工作记忆和 P4/P5 总路线图，确认 P4/P5-0 foundation 与 review fix 已完成，P4-A 不应重复能力矩阵和基础 event atom 工作。
- [x] 复读 P4/P5-0 专项计划、advanced capability specs、ready-desktop-app 契约、release evidence、architecture checklist 和 diagnostics package contract。
- [x] 审计当前 diagnostics、privacy、DevConsole、HTTP diagnostic、Tauri export 与相关测试代码。
- [x] 撰写独立 P4-A 实施规划，聚焦 Developer Diagnostics 与 Privacy Mode 2.0。
- [x] 完成规划文档占位词、范围、架构边界、隐私合同和验证矩阵自查。
- **规划文档:** docs/superpowers/plans/2026-06-02-p4-a-developer-diagnostics-privacy-mode-2.md
- **Status:** completed

### Phase 38: P4-A Developer Diagnostics And Privacy Mode 2.0 Implementation
- [x] 恢复 planning-with-files 上下文，确认当前分支为 `codex/p4a-diagnostics-privacy-plan`，不是 `master`。
- [x] 将既有 P4-A 实施规划作为用户已批准执行基线；不重新发起设计审批。
- [x] A0: 基线、边界扫描和当前红线记录。
- [x] A1: 扩展 diagnostic event model/store filters。
- [x] A2: L2 diagnostic event bridge 和核心 HTTP 事件接入。
- [x] A3: UI/Tauri/updater/subscription diagnostic events。
- [x] A4: DevConsole 2.0 view model 和 dense UI。
- [x] A5: Privacy Mode 2.0 和 redaction helpers。
- [x] A6: Diagnostics export manifest 2.0。
- [x] A7: setup/settings/workbench diagnostics surface integration。
- [x] A8: UI acceptance/browser evidence。
- [x] A9: 文档和证据收口。
- [x] A10: final verification。
- **规划文档:** docs/superpowers/plans/2026-06-02-p4-a-developer-diagnostics-privacy-mode-2.md
- **Status:** complete

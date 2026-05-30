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

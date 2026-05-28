# Task Plan: chatlog_alpha 桌面应用开发

## Goal
将开源项目 chatlog_alpha 封装为 Tauri v2 + Mediator 四层架构的跨平台桌面应用。

## Current Phase
**Sprint 4 Complete** → Sprint 5a Planning

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
- **Status:** planned (scope defined, pending design)

## Key Decisions
| Decision | Value |
|----------|-------|
| Package manager | pnpm (11.4.0) |
| Port | 5030 (not 8080 as in original spec) |
| Health endpoint | /health (not /api/v1/db) |
| Sidecar binary | Go mock (real chatlog_alpha integration in Sprint 2) |
| TDD approach | Deferred to Sprint 2 (Sprint 1 is infrastructure scaffold) |

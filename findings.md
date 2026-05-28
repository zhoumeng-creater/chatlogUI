# Findings & Decisions

## Requirements
- 封装 chatlog_alpha Go 后端，构建 Tauri 桌面应用壳
- 采用 Mediator 四层架构 (L1入口层 / L2协调层 / L3分子层 / L4原子层)
- Apple 风格高级 UI/UX 设计
- Sidecar 进程生命周期管理 (端口猎杀、健康检查、优雅退出)
- 双平台支持 (macOS + Windows)
- 核心功能：聊天记录浏览、AI语义问答、3D知识图谱
- 隐私保护与安全隔离
- 开箱即用，零配置体验

## Research Findings
- chatlog_alpha 基于 Go 语言，提供完整的 REST API 和 SSE 接口
- 核心 API 包括：/api/v1/history, /api/v1/search, /api/v1/stats, /api/v1/semantic/qa/stream, /api/v1/graph/visualize 等
- Tauri v2 的 Sidecar 机制专为捆绑外部二进制设计，通过 externalBin 声明和 shell:allow-execute 权限控制
- macOS 平台需处理 Gatekeeper 公证流程，需对 Sidecar 二进制执行深度签名
- Windows 平台 Mica/Acrylic 材质需通过 Tauri 原生窗口属性调用
- Zustand 适合 Mediator 模式中的数据员角色，实现状态规范化与分发
- Framer Motion 提供基于物理的弹簧动画，符合 Apple 动效设计规范
- L4 原子层三大分类：UI原子(纯渲染)、网络原子(纯HTTP/SSE调用)、系统原子(Tauri API封装)
- L2 协调层四大角色：指挥官(Commander)、数据员(Data Clerk)、外交官(Diplomat)、原子API文档(Atomic API Docs)

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Sidecar 生命周期在 Rust 层管理 | 提供系统级进程控制能力（lsof/netstat端口探查、kill信号发送），比JS层更可靠 |
| 前端仅通过 HTTP 与 Go 后端通信 | 保持松耦合，未来可替换后端为其他数据源或接入AI API |
| L3/L4 原子/分子间禁止相互调用 | 保证模块可独立开发、测试和替换，防止组件地狱 |
| 类型安全贯穿全链路 | 通过 Atomic API Docs 定义 TS Interface，从后端数据到前端渲染全链路类型检查 |
| Zustand 实现数据员 | 轻量、性能好、API简洁，避免Redux样板代码 |
| 核心先行，逐步迭代 | 先交付可用的基础版本，降低风险，每阶段可验收 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 项目从零开始，无现存代码 | 需先克隆/引用 chatlog_alpha 源码获取Go二进制，Tauri项目脚手架从零搭建 |
| 双平台 Sidecar 二进制管理 | 需在构建流水线中交叉编译 Go 后端为 macOS (darwin/amd64, darwin/arm64) 和 Windows (windows/amd64) |

## Resources
- chatlog_alpha 开源项目: https://github.com/sjzar/chatlog (参考)
- Tauri v2 文档: https://v2.tauri.app/
- Zustand 文档: https://docs.pmnd.rs/zustand
- Framer Motion 文档: https://www.framer.com/motion/
- Three.js 文档: https://threejs.org/
- 开发指南: E:\OneDrive - Default Directory\chatlogUI\开发指南.md

## Sprint 2 Research Findings

### chatlog_alpha 源码分析
- 原始 GitHub 仓库 (sjzar/chatlog) 已被版权方要求移除，代码无法公开访问
- 本地副本位置: `E:\OneDrive - Default Directory\chatlog_alpha`
- Go 版本: 1.24.0, 基于 Gin 框架, 需要 CGO (依赖 go-sqlite3)
- 默认端口: 5030 (与 Sprint 1 配置一致)
- 50+ API 端点，包括: /api/v1/history, /api/v1/contacts, /api/v1/sessions, /api/v1/search, /api/v1/stats, /api/v1/dashboard/trend 等
- DB 中间件: /api/v1/* 数据接口在 DB 初始化/解密期间返回 HTTP 503
- 健康检查: /health 无中间件，始终可用; /api/v1/db 需要通过 DB 中间件
- 启动两阶段: (1) 引擎就绪 /health→200, (2) DB 就绪 /api/v1/db→200 (中间可能 503)

### 关键数据模型
- Contact: { userName, alias, remark, nickName, isFriend }
- Message: { seq, id, time, talker, sender, isSelf, type, subType, content, mediaMsg }
- Session: { userName, nOrder, nickName, content, nTime }
- ChatRoom: { name, owner, users, remark, nickName }
- StatsResponse: { total, sentCount, receivedCount, activeSenders, activeDays, byType, topSenders, byHour }
- HistoryResponse: { chat, totalCount, count, limit, offset, messages[] }

### API 响应特性
- 所有 API 支持 JSON/YAML 两种输出格式 (通过 format 参数)
- 分页通过 limit + offset 参数
- 历史消息支持多类型: text, image, video, voice, file, card, system 等
- 媒体文件通过独立路径提供: /image/*key, /video/*key, /file/*key, /voice/*key

## Sprint 3 Research Findings

### chatlog_alpha 语义 API 分析
- 语义 QA: `/api/v1/semantic/qa` (非流式) 和 `/api/v1/semantic/qa/stream` (SSE 流式)，支持 query/chat/scope 参数
- 语义搜索: `/api/v1/semantic/search`，向量+关键词混合搜索，支持 rerank
- 话题提取: `/api/v1/semantic/topics`，按联系人提取热门讨论话题
- 联系人画像: `/api/v1/semantic/profiles`，AI 生成的角色/活跃模式/情绪分析
- 索引管理: `/api/v1/semantic/index/*` 系列 (status/preview/rebuild/pause/resume/clear)
- 语义配置: `/api/v1/semantic/config` (GET/POST)，支持 Ollama/GLM/DeepSeek 三选一
- 连接测试: `/api/v1/semantic/test`

### 技术决策
| 决策 | 理由 |
|------|------|
| SSE 流式为主，非流式为兜底 | SSE 提供打字机体验，非流式保证可用性 |
| 不引入第三方 Markdown 库 | 保持零依赖增量，简单正则解析满足需求 |
| AI 面板与统计面板共享右侧槽位 | 避免三栏布局在 900px 窗口中过于拥挤 |
| AI 状态独立 AiStore 管理 | 与 AppStore（应用生命周期）职责分离 |
| SetupWizard 引导式配置 | 降低 LLM 配置门槛，Ollama 自动检测 |

### 关键数据模型
- SSEChunk: `{ type: 'token'|'done'|'error', content?, error? }`
- IndexStatus: `{ status: 'idle'|'building'|'paused'|'ready'|'error', total, completed }`
- SemanticConfig: provider (ollama/glm/deepseek) + 各提供商专属配置
- QAMessage: `{ id, role: 'user'|'assistant', content, timestamp, isStreaming? }`

## Visual/Browser Findings
- Sprint 2 采用"先写规划，逐步实现"策略，UI 设计在各组件开发时逐一细化

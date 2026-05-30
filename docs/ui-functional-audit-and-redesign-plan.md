# chatlogUI 问题指南与重构规划

审计日期：2026-05-29  
范围：当前 `chatlogUI` React/Tauri 前端、Tauri sidecar 集成、项目内 `chatlog/` 运行痕迹、外部原始项目 `E:\OneDrive - Default Directory\chatlog_alpha` 的 CLI/HTTP 能力与配置流程。

## 1. 总结

当前项目的主要问题不是单个页面“不好看”，而是产品模型、原始后端能力、配置流程、API 合约和 UI 信息架构没有对齐。

最严重的问题有四类：

1. 首次启动流程错误。原始 `chatlog_alpha` 需要先完成本地微信数据、密钥、版本、平台、工作目录等配置，当前 UI 只暴露“选择目录 + data key”，没有把真实配置过程做成可理解、可验证、可恢复的向导。
2. sidecar 启动参数与原始服务配置逻辑冲突。当前 UI/Tauri 直接传 `--data-dir --data-key`，导致原始服务不会从 `chatlog.json` 加载 `platform/version/full_version/img_key`，日志中已经出现 `unsupported platform:  v0`。
3. HTTP API 合约大面积不匹配。原始 API 默认 YAML，很多字段是 snake_case，且接口结构与前端类型定义不同；当前前端多数请求直接 `response.json()` 并按 camelCase 读取，导致聊天、搜索、统计、AI、图谱等模块都存在隐藏或显性的运行错误。
4. UI 是“表面仿 Apple”，不是“Apple 式工作流”。当前界面大量使用玻璃卡片、假 macOS 红黄绿按钮、emoji 图标、浮动 3D 面板和固定三栏布局，但缺少清晰的信息架构、状态反馈、分步引导、可访问性、响应式和可恢复错误处理。

结论：应停止在当前视觉和数据流上继续堆功能，先做一次以“真实 chatlog_alpha 工作流”为核心的重构。UI 应优先重建为：启动设置向导 + 侧边栏式工作台 + 聊天/搜索/统计/AI/图谱/设置的清晰模块，而不是继续维护当前卡片式拼装页面。

## 2. 已验证的当前状态

- `pnpm typecheck` 通过。
- `pnpm lint` 通过。
- `pnpm build` 通过，但 `GraphCanvas` chunk 约 1 MB，存在首屏和懒加载压力。
- `pnpm test` 通过，当前测试只覆盖少量 helper/状态逻辑，不能证明业务流程可用。
- `cargo test` 通过，Rust 侧测试没有覆盖真实 sidecar 配置组合。
- 浏览器打开本地前端开发服务后停在“未找到微信数据目录”；P2-B 综合修复后 canonical dev URL 为 `http://localhost:5173`。
- “跳过”按钮会跳转 `/dashboard`，但 `DashboardView` 又因为 `appPhase !== "ready"` 重定向回 `/`，实际不可用。
- 设置页默认打开 AI 模型设置，而不是数据/服务初始化设置。
- 本地 sidecar 日志出现过 `start db failed: unsupported platform:  v0`，与配置参数缺失直接相关。

## 3. 设计目标

新的 UI 不应只是更换视觉皮肤，而应解决这些核心目标：

- 一打开应用就能理解当前处于哪一步：未配置、已找到配置、服务运行中、数据库可用、索引构建中、完全可用。
- 把原本需要终端完成的配置过程转成可视化流程，同时保留“使用已有终端配置/已有服务”的高级入口。
- 使用现代 Apple 软件常见的信息结构：稳定侧边栏、清晰内容区、必要时使用 inspector/detail 面板、原生质感控件、准确状态反馈、低噪声动效。
- 避免把所有功能压在一个 dashboard。聊天、搜索、统计、语义分析、知识图谱、开发者工具、设置应成为可导航的模块。
- 不伪装系统能力，不使用假窗口控件制造平台错觉。Windows 上应尊重 Windows 桌面语境，Apple 风格应体现在信息层次、控件一致性、动效节制和反馈质量上。

## 4. UI 与交互问题

### 4.1 信息架构问题

- 首屏没有“产品任务流”。用户不知道下一步是选择微信目录、导入配置、获取 data key、启动服务、检查 DB，还是构建索引。
- 主要功能没有清晰导航。当前 header 只放了隐私、控制台、设置按钮；聊天、搜索、统计、AI、图谱没有稳定的全局入口。
- Dashboard 试图把联系人、消息、统计、AI、图谱都挤在一个三栏工作台里，造成认知负担和布局拥堵。
- 设置页默认进入 AI 模型，和首次使用最关键的数据配置顺序相反。
- “开发者控制台”是悬浮工具性质，但当前放在全局 header 中，和普通用户主要任务同级。

### 4.2 启动与配置体验问题

- `detectWxPath.ts` 直接返回空数组，自动检测未实现，导致首屏几乎必然进入失败态。
- “未找到数据”文案过于笼统，没有说明缺少的是 WeChat 数据目录、chatlog 配置、data key、平台版本，还是数据库读取能力。
- 只有“手动选择”和“跳过”，没有分步解释，也没有校验结果。
- 没有“导入已有 chatlog.json / 使用已有 chatlog 服务 / 从原始项目配置迁移”的入口。
- 没有显示 account、platform、version、full_version、img_key、data_key 的完整配置状态。
- 没有区分“HTTP 服务健康”和“数据库可查询”。`/health` 为 ok 时，`/api/v1/db` 仍可能 503，但 UI 没有清楚表达。
- 没有显示真实 sidecar 命令、工作目录、配置来源、进程 PID、端口归属。

### 4.3 视觉设计问题

- 当前是大量玻璃卡片、圆角 panel、模糊背景的堆叠，不符合高效率桌面工具的工作台质感。
- 假 macOS 红黄绿窗口按钮在 Windows/Tauri 环境里容易误导。它只是装饰，且和真实窗口行为不一致。
- emoji 被当作功能图标使用，例如设置、隐私、控制台、图谱。这不稳定，也降低专业感。
- `GlassPanel` 默认白色半透明背景，在深色模式和复杂背景下对比度不可控。
- 圆角、阴影、模糊、边框没有形成层级系统，导致几乎所有元素都在争抢注意力。
- 按钮过度使用 pill 样式；工具栏、分段控件、开关、选择器、图标按钮没有按用途区分。
- 字体与字距策略不统一，部分组件使用负 letter spacing，不适合正文密集工具。
- 颜色没有建立语义系统。启动失败、服务中断、DB 不可用、索引构建、隐私模式等状态没有一致的颜色和图标语言。

### 4.4 布局与响应式问题

- 根节点 `overflow: hidden`，页面依赖多层局部滚动，容易造成滚动陷阱。
- Dashboard 使用固定三栏网格，窄屏、半屏窗口和移动宽度下不可用。
- 图谱浮窗默认固定 `600 x 450`，位置固定，可能遮挡主要内容。
- 浮窗拖拽/缩放只有鼠标路径，没有键盘或可访问替代。
- 许多区域缺少稳定尺寸约束，动态内容和错误文案容易挤压布局。
- 没有为长联系人名、长群名、长消息、长路径、长 API key 提供稳定截断和展开策略。

### 4.5 可访问性问题

- 视觉状态大量依赖颜色、模糊和 hover，缺少文本状态和 ARIA 描述。
- emoji 图标没有稳定语义。
- 自定义按钮/卡片控件的键盘焦点、disabled 状态、tooltip、可读名称不足。
- 图谱只有 3D canvas 表达，没有表格/列表替代视图。
- 隐私模式只做局部遮罩，没有系统性保护路径、key、日志、图谱标签、搜索结果和导出内容。

### 4.6 错误反馈问题

- 当前错误信息偏“程序内部状态”，不是“用户下一步应该做什么”。
- sidecar 日志和用户可见错误没有关联。用户看不到是哪条命令失败、哪个配置字段缺失、哪个接口返回 503。
- 没有可复制的诊断包，包括 app 版本、sidecar 版本、命令行、配置摘要、端口状态、最近日志。
- 许多 fetch 错误被上层 commander 包成泛型错误，UI 无法给出精确恢复建议。

### 4.7 数据可视化问题

- 统计图表过于简陋，主要是 div bar，没有坐标轴、tooltip、图例、空状态、数据表、导出。
- 3D 图谱作为浮层很抢眼，但不是核心任务入口，也没有解释数据来源、节点含义、边权重、筛选条件和查询语法。
- 时间知识图谱、事件、业务节点、timeline 等原始能力没有完整入口。
- 大图/长时间数据没有性能预算、分页、采样、加载骨架或取消请求。

## 5. 功能与代码问题

### 5.1 sidecar 与配置集成问题

- 当前 sidecar 只传 `serve --http-addr --work-dir --data-dir --data-key`，没有覆盖原始配置所需的完整元数据。
- 原始 `LoadServiceConfig` 只在 `data_key` 为空时读取 `dataDir/chatlog.json`。当前传入 `--data-key` 会绕过配置文件加载，导致 `platform/version` 缺失。
- 日志中的 `unsupported platform:  v0` 说明当前启动策略已经导致 DB 初始化失败。
- `killPort()` 会无条件杀掉 5030 端口占用进程，没有判断是否为本应用管理的 sidecar。
- 端口设置存在但未真正贯通：常量固定 5030，CSP 也固定允许 5030。
- 没有“连接已有服务”和“由应用托管服务”两种模式的区别。
- 没有 sidecar 版本检查、二进制路径检查、权限检查、工作目录清理策略。

### 5.2 API 合约问题

- 多数请求没有追加 `format=json`，但直接 `response.json()`；原始 API 默认 YAML。
- 类型定义没有建立原始 API DTO 与 UI domain model 的边界，导致 snake_case/camelCase 混用。
- `/api/v1/contacts`、`/api/v1/chatrooms`、`/api/v1/sessions` 被前端错误合并和读取。
- `/api/v1/history` 的消息结构与前端 `HistoryMessage` 不一致，影响消息方向、key、媒体类型、群聊发送者显示。
- `/api/v1/search` 参数名错误，过滤条件会失效。
- `/api/v1/stats` 参数和返回字段错误，统计面板读取不稳定。
- `/api/v1/dashboard/trend` 的参数和返回结构与前端假设不同。
- Semantic config/test/status/SSE 的返回结构与前端实现不一致，AI 功能基本处于不可依赖状态。
- Graph API 只被部分接入，状态、配置、重建、暂停、恢复、ingest、QA 等能力缺失。

### 5.3 原始功能覆盖缺口

原始 `chatlog_alpha` 已具备或暴露的能力，当前 UI 没有完整覆盖：

- 数据库状态与 DB 浏览。
- 最近会话 `/api/v1/sessions`。
- 联系人、群聊、群成员、群聊管理。
- 全局搜索、消息检索、类型过滤、时间过滤。
- 朋友圈/SNS 检索与资源代理。
- 媒体消息查看、图片/视频/文件/语音的正确渲染和导出。
- 收藏、未读、新消息、wx-cli 兼容接口。
- 推送/hook 配置、事件页面。
- SQL/实验性能力。
- 语义配置、索引构建、暂停/恢复、测试、检索、问答、stream QA。
- 时间知识图谱配置、重建、查询、可视化、timeline、business/event ingest、graph QA。

### 5.4 聊天核心体验问题

- 会话列表没有正确使用 `/api/v1/sessions`。
- 联系人和群聊数据结构没有适配，字段名不一致。
- 历史消息没有可靠分页和 total_count 适配。
- 搜索结果点击可能使用 display name 而不是 username，无法稳定跳转到真实会话。
- `isSelf` 不存在，消息左右方向会错误。
- 群聊消息没有清晰 sender/昵称映射。
- 媒体消息渲染只有粗略判断，缺少加载、预览、复制、打开、导出、失败态。
- 没有聊天内搜索、日期跳转、消息类型筛选、上下文定位。

### 5.5 AI 与语义功能问题

- 设置页保存的是本地 UI 设置，不等于后端 semantic config。
- Setup wizard 构造的配置对象与原始 API 不一致。
- 连接测试读取字段错误。
- 索引状态读取字段错误，无法准确显示 running/paused/progress/error。
- SSE 解析与原始事件协议不一致。
- 没有对 embedding/chat provider 的不同配置项做动态表单。
- 没有展示索引范围、已处理数量、错误日志、恢复动作。

### 5.6 图谱功能问题

- 图谱以浮动 3D canvas 出现，既不是稳定模块，也不是可解释的数据工具。
- 只接入可视化/查询/状态的一部分，未覆盖配置、重建、暂停、恢复、timeline、业务事件 ingest、QA。
- 没有节点类型图例、权重解释、筛选器、时间范围、数据来源说明。
- 没有列表/表格视图替代 3D 图。
- 构建 chunk 过大，应该懒加载并延迟到用户进入图谱模块后加载。

### 5.7 状态管理与数据流问题

- appPhase 作为路由门禁过于粗糙，导致“跳过”进入 dashboard 不可用。
- 联系人加载在多个组件中重复触发。
- 错误状态没有保留原始 HTTP status、body、endpoint、请求参数。
- localStorage 设置没有版本迁移和 schema 校验。
- 隐私模式、主题、字体、动效设置没有全局一致应用。
- Dev console、sidecar、API fetch、用户操作之间没有统一事件日志。

### 5.8 测试缺口

- 目前测试通过不代表功能可用，因为缺少 API 合约适配测试。
- 缺少 launch wizard 的状态机测试。
- 缺少 sidecar 参数组合测试。
- 缺少真实 YAML/JSON 响应 fixture。
- 缺少浏览器端关键路径测试：首次配置、启动服务、加载会话、打开消息、搜索、AI 配置、索引状态。
- 缺少视觉回归截图，当前 UI 问题只能靠人工发现。

## 6. 重构规划

优先级原则：

- UI 是第一优先，但 UI 必须围绕真实功能流设计。先重建启动、导航和状态模型，再做视觉精修。
- P0 解决“能启动、能解释、能恢复、不会误伤用户进程”。
- P1 解决“聊天、搜索、统计核心可用”。
- P2 解决“Apple-like 视觉系统和高质量交互”。
- P3/P4 再补齐 AI、图谱、媒体、开发者工具和发布质量。

### P0：重建产品骨架与首次启动流程

目标：用户首次打开应用时，不再看到模糊失败页，而是进入可操作的配置向导，并能安全启动或连接服务。

任务：

1. 新增“启动中心 / Setup Center”。
   - 步骤：选择模式 → 检测/导入配置 → 校验数据目录 → 校验密钥与平台版本 → 启动或连接服务 → 检查 DB → 进入工作台。
   - 模式：使用已有 `chatlog` 服务、由本应用托管 sidecar、仅离线查看已有导出。
   - 每步显示状态：未开始、进行中、成功、失败、可跳过、需要手动操作。

2. 配置模型重建。
   - 统一保存 `data_dir`、`work_dir`、`data_key`、`img_key`、`platform`、`version`、`full_version`、`type`、`http_addr`、`config_source`。
   - 支持导入 `chatlog.json`。
   - 支持读取当前项目或外部 `chatlog_alpha` 的已有配置。
   - 对敏感字段做 masking，不在日志/截图中明文暴露。

3. sidecar 管理重写。
   - 删除无确认的端口 kill 行为。
   - 判断端口占用者是否为本应用托管进程。
   - 新增“连接已有服务”而不是强制杀掉重启。
   - 显示 PID、命令、二进制路径、工作目录、端口和最近日志。
   - 启动前先验证配置完整性。

4. API 客户端基础修复。
   - 所有原始 API 默认追加 `format=json`。
   - 建立 `raw DTO -> UI model` adapter 层。
   - 保留原始错误信息和 response body。
   - 为 contacts/sessions/history/search/stats/semantic/graph 建 fixture 测试。

5. 路由状态重建。
   - 不再用单一 `appPhase !== "ready"` 阻断 dashboard。
   - 允许进入空工作台，但显示“尚未连接服务”的明确引导。
   - “跳过”应进入一个可浏览的空壳工作台，而不是跳回首页。

验收标准：

- 空机器首次打开时，用户能清楚知道下一步需要什么。
- 现有 `chatlog.json` 可导入并校验。
- 不会无提示杀掉已有 5030 服务。
- `/health` ok 但 `/api/v1/db` 失败时，UI 能明确显示“服务运行，数据库未就绪”。
- `unsupported platform: v0` 不再由 UI 的启动参数策略触发。

### P1：修复核心聊天工作台

目标：聊天记录浏览、会话列表、联系人、群聊、搜索、基础统计真正可用。

任务：

1. 重做主工作台布局。
   - 左侧 sidebar：总览、聊天、搜索、统计、AI、图谱、开发者、设置。
   - 聊天模块使用三层结构：会话列表 → 消息列表 → 详情/筛选 inspector。
   - 搜索和统计独立成模块，不挤在聊天页里。

2. 会话与联系人。
   - `/api/v1/sessions` 作为最近会话主数据源。
   - `/api/v1/contacts` 和 `/api/v1/chatrooms` 分别适配。
   - 支持收藏/固定/最近/群聊/联系人分类。
   - 使用 username 作为稳定 ID，display/nickname/remark 仅用于展示。

3. 消息历史。
   - 适配 `total_count`、`timestamp`、`sender`、`type`、`media_type`、`media_url`。
   - 构建稳定 `id`，例如 `local_id` 优先，缺失时用 chat+timestamp+sender hash。
   - 通过 sender 判断自己/对方，不依赖不存在的 `isSelf`。
   - 群聊显示 sender 和 display name。
   - 支持日期跳转、消息类型筛选、加载更多、复制内容、打开原始媒体。

4. 搜索。
   - 使用原始参数 `keyword/chats/since/until/msg_type/limit/offset`。
   - 搜索结果点击回到 username + timestamp 附近上下文。
   - 支持保存搜索条件和导出结果。

5. 统计。
   - 适配 `sent_count/active_senders/by_type` 等 snake_case。
   - 使用成熟图表库或轻量可访问 chart 组件。
   - 每个图表配 tooltip、图例、空状态、数据表和导出。

验收标准：

- 会话列表来自真实 sessions。
- 点击任意会话能加载消息。
- 搜索条件能传到后端并生效。
- 统计面板字段不再出现 undefined/空图。
- API 合约测试覆盖核心 endpoints。

### P2：Apple-like UI 系统重建

目标：做出真正现代、安静、专业、适合长时间使用的桌面工具，而不是玻璃卡片堆叠。

任务：

1. 设计系统。
   - 建立 tokens：颜色、语义色、间距、圆角、边框、阴影、字体、层级。
   - 减少 backdrop blur，优先使用清晰表面和分隔线。
   - 卡片只用于列表项、modal、独立工具；页面区域使用 split view 和 full-width band。
   - 替换 emoji 为 lucide 或等价图标。

2. Shell 设计。
   - Windows 上不显示假 macOS 窗口灯。
   - 使用平台一致的 title bar 或清晰自定义 title bar。
   - 左侧导航支持收起、tooltip、当前模块高亮。
   - 顶部状态区显示服务状态、DB 状态、索引状态、隐私状态。

3. 控件系统。
   - 分段控件用于模式切换。
   - toggle/checkbox 用于二元设置。
   - select/menu 用于 provider、时间范围、消息类型。
   - icon button 用于工具命令，带 tooltip。
   - primary button 只保留给当前流程最重要动作。

4. 状态与反馈。
   - 所有模块有 loading、empty、error、partial ready、permission required 状态。
   - 错误文案结构：发生了什么 → 为什么可能发生 → 下一步操作 → 复制诊断。
   - 长任务有进度、取消、暂停、恢复。

5. 响应式。
   - 桌面宽屏：sidebar + content + inspector。
   - 窄屏：sidebar 可收起，inspector 变为 drawer。
   - 移动宽度：列表/detail 分页切换，不保留三栏。

验收标准：

- 首屏不再是装饰性 glass page，而是可执行的 setup center。
- 所有主模块有稳定导航。
- 主要控件不再使用 emoji。
- 半屏窗口下不出现不可操作三栏挤压。
- 通过 Playwright 截图检查桌面、半屏、移动宽度。

### P3：补齐 AI 与知识图谱

目标：把 AI 和图谱从“浮动演示功能”变成可靠的分析模块。

任务：

1. Semantic 设置。
   - 使用后端真实 `semantic/config` schema。
   - 支持 provider 动态表单。
   - 显示 `has_api_key`，但不泄露密钥。
   - 连接测试读取 `{ok,error}`。

2. 索引管理。
   - 适配 `ready/running/paused/processed/pending/progress_pct/last_error`。
   - 支持开始、暂停、恢复、重建、查看错误。
   - 明确索引范围和预计耗时。

3. QA 与流式响应。
   - 按 SSE event name 解析 `delta/done/error`。
   - 支持中止生成、复制答案、查看引用消息。
   - 后端 429/overload 时有明确重试策略。

4. 图谱模块。
   - 从浮窗改为独立模块。
   - 默认提供列表/时间线/2D 图，3D 图作为可选视图。
   - 支持配置、重建、暂停、恢复、查询、timeline、visualize、QA、business/event ingest。
   - 图例、筛选、节点详情、边解释、导出。
   - `GraphCanvas` 懒加载，避免首屏 chunk 过大。

验收标准：

- AI 配置能真实写入后端。
- 索引状态与后端一致。
- 流式问答逐 token 显示且 done/error 正确结束。
- 图谱模块不再遮挡聊天主流程。

### P4：补齐原始功能与高级工具

目标：覆盖原始 chatlog_alpha 的主要 Web 能力，并提供桌面端更好的可用性。

任务：

1. 媒体与资源。
   - 图片、视频、文件、语音分别渲染。
   - 支持原图/预览/下载/打开所在位置。
   - 失败时显示代理 URL、错误原因和重试。

2. 朋友圈/SNS。
   - 独立 SNS 浏览与搜索模块。
   - 时间、用户、媒体类型筛选。
   - 图片瀑布流和详情查看。

3. Hook/推送。
   - 推送配置、事件列表、测试推送。
   - 失败日志和重放。

4. wx-cli 兼容与实验功能。
   - 提供“接口调试器”，可以选择 endpoint、参数和 format。
   - SQL/实验能力放到开发者模块，不打扰普通用户。

5. 隐私模式。
   - 统一遮罩：头像、昵称、消息、路径、key、日志、图谱标签、导出预览。
   - 支持截图安全模式。

6. 开发者控制台。
   - 统一事件日志：UI action、sidecar、HTTP request、error。
   - 支持复制诊断包。
   - 不使用 `alert()`。

验收标准：

- 原始内置 Web UI 的主要 tab 都在新 UI 中有对应入口或明确替代。
- 隐私模式覆盖所有敏感信息，不只是消息文本。
- 诊断包可以直接用于复现 sidecar/API 问题。

### P5：测试、发布与维护

目标：避免再次出现“类型通过但产品不可用”。

任务：

1. API contract tests。
   - 使用原始响应 fixture 测试 adapter。
   - JSON 和 YAML 默认行为都要覆盖。

2. Launch state machine tests。
   - 未配置、导入配置、服务占用、服务健康但 DB 失败、完全 ready。

3. Browser E2E。
   - 首次配置流程。
   - 进入聊天、打开会话、搜索、统计、AI 配置、索引状态。

4. Visual regression。
   - 桌面、半屏、移动宽度截图。
   - 明暗模式。
   - 长文本、空状态、错误状态。

5. Release hardening。
   - updater pubkey/endpoint 真实配置。
   - sidecar binary packaging 检查。
   - CSP 与可配置端口同步。
   - Windows/macOS/Linux 平台行为分别验证。

验收标准：

- CI 能在没有真实微信数据时验证 UI 合约和空状态。
- 有真实本地数据时能运行手动验收清单。
- 发布包不包含假 updater 或不可用 sidecar 配置。

## 7. 建议的实施顺序

第一阶段：P0 + P1 的最小闭环。

- 先做 setup center、sidecar 管理、安全端口策略、API adapter。
- 再修会话、历史、搜索、统计。
- 这一阶段不要继续扩展 3D 图谱和 AI 面板，因为基础数据读取不稳定。

第二阶段：P2 视觉系统。

- 基于已经稳定的工作流重建 UI，不在旧 glass panel 体系里继续改。
- 先做 shell、导航、setup、聊天，再做搜索/统计/设置。

第三阶段：P3/P4 高级能力。

- Semantic、graph、SNS、hook、media、developer console 逐一补齐。
- 每个高级模块必须有 API adapter、状态机、空/错/加载状态和测试。

第四阶段：P5 发布质量。

- E2E、视觉回归、打包、更新、平台差异。

## 8. 不建议继续做的事

- 不建议继续在当前 Dashboard 三栏布局里追加功能。
- 不建议继续使用 fake macOS traffic lights 作为品牌视觉。
- 不建议让图谱浮窗默认覆盖主工作区。
- 不建议继续把 AI 设置只保存在 localStorage。
- 不建议前端直接消费原始 API 响应而不经过 adapter。
- 不建议无确认 kill 5030 端口。
- 不建议把“跳过”做成进入不可用页面的按钮。

## 9. 最小可交付版本定义

一个真正可用的 MVP 应至少满足：

- 首次启动能完成配置或连接已有服务。
- 能清楚显示服务、数据库、索引三个状态。
- 能加载最近会话。
- 能打开单个会话并稳定分页浏览消息。
- 能搜索消息并跳转上下文。
- 能显示基础统计。
- 能进入设置查看/修改数据与服务配置。
- 所有失败态都有下一步操作。
- UI 在桌面和半屏窗口下不崩坏。

在这些完成前，AI、3D 图谱、发布更新都应该视为后续增强，而不是核心完成度证明。

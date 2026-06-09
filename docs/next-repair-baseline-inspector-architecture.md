# Inspector 与页面架构 UX 专题台账

> 日期：2026-06-09
> 分支：`codex/next-repair-baseline`
> 范围：源码、现有产品标准与官方布局资料核验；不包含当前运行截图、Tauri 真实窗口 smoke 或安装包 smoke。

## 结论摘要

用户提出的核心判断成立：当前 Workbench 的右侧 inspector 正在被错误地当成“一级功能容器”使用。

更准确地说，问题不是“有右侧 inspector”本身，而是三个层级被混在一起：

1. 一级页面：统计、媒体、朋友圈、AI、图谱、设置、开发者工具这类完整任务中心。
2. 上下文 inspector：只服务当前会话、当前消息、当前媒体、当前图谱节点、当前搜索命中。
3. 临时浮层/抽屉：确认、预览、证据、外链打开、设置向导、高级诊断。

当前代码把 `stats / media / sns / developer / ai` 放进 inspector，把 `graph` 特判为 Workbench 主区，把 `settings` 从 rail 跳到 `/settings`，同时又在 rail 和 toolbar 重复暴露多个同级模块。这个结构会让用户无法判断自己是在看聊天上下文、打开右侧详情，还是进入另一个产品模块。

Setup Center 的问题也成立，但需要准确表述：它已经有三栏结构和 readiness 分区雏形，不是完全没有布局；真正的问题是推荐配置、外部服务、高级手动配置、诊断/状态被放进同一个“设置中心大页面”中，用户路径没有被拆成清晰任务。

## 官方布局资料的项目化解释

本台账使用以下官方资料作为布局判断辅助，不把它们当作替代项目验收标准：

| 来源 | 官方条目 | 对 chatlogUI 的解释 |
| --- | --- | --- |
| Android Developers | [Layout basics](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-basics?hl=en) | 布局定义用户与应用交互的视觉结构；相关内容和动作应通过 containment 聚合；类似元素需要一致对齐；单个视图不应被过多动作淹没。用于判断 Workbench toolbar、rail、inspector 是否承担了过多层级。 |
| Android Developers | [Adapt layouts](https://developer.android.com/design/ui/mobile/guides/layout-and-content/adapt-layout) | 自适应布局应从 window class 出发，并用 panes/containers 组织相关内容。用于判断 Workbench 与 Setup Center 的多栏结构是否有稳定职责。 |
| Android Developers | [Canonical layouts](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts) | List-detail 适合消息/联系人这类“列表选择 -> 详情显示”；supporting pane 的 secondary content 只应支持 primary content，离开 primary content 后不应成为完整功能中心。用于定义 inspector 的边界。 |
| Android Developers | [Settings](https://developer.android.com/design/ui/mobile/guides/patterns/settings) | 设置页可使用 list-detail containment；设置标签应简短、直接、可理解；filters 是当前内容上下文，settings 是偏好/配置。用于判断 Setup Center、Settings、AI 设置、范围筛选是否混淆。 |
| 项目标准 | `docs/product-acceptance-standards.md` 与 `docs/ui-development-standards.md` | 最终验收以项目标准为准：真实用户任务、首次行动、重复入口、退出/恢复、相邻功能缺失、状态覆盖、隐私、可访问性和证据。 |

## 判断口径

| 标签 | 含义 |
| --- | --- |
| `存在` | 当前源码直接证明问题成立。 |
| `部分存在` | 方向成立，但源码已有局部合理结构或影响范围比原描述更窄。 |
| `需运行证据` | 源码可见风险或历史记录，但必须用运行、浏览器、Tauri 或安装包 smoke 确认实际体验。 |
| `建议方向` | 不是当前源码问题事实，而是后续信息架构目标。 |

证据等级沿用主 UX 台账：

| 等级 | 含义 |
| --- | --- |
| `S1 源码直接证据` | 当前源码能直接看到模块、布局、路由或组件行为。 |
| `S2 源码推断` | 多处源码组合后能推导风险，但缺少运行链路证据。 |
| `R1 当前运行证据` | 当前分支真实运行证据。本文件未新增 R1。 |

## 一、当前 Workbench 容器层级核验

### 1.1 当前模块分布事实

| 功能 | 左 rail | 顶部 toolbar 按钮 | 右 inspector | 主内容/独立 route | 判断 |
| --- | --- | --- | --- | --- | --- |
| 会话 | 有，`chat` | 无同名模块按钮 | `chat` 被映射为 `stats` inspector | Workbench 主内容 `ChatView` | `部分合理`：会话主舞台成立，但右侧默认是“统计数据”，不是完整“会话详情”。 |
| 统计 | 有，`stats` | 有“统计”按钮 | `StatsInspector` | 无独立 route | `存在`：统计作为一级模块，却只落在 inspector。 |
| 媒体 | 有，`media` | 有“媒体”按钮 | `MediaLibrary` | 无独立 route | `存在`：完整媒体库任务被放在 inspector。 |
| 朋友圈 | 有，`sns` | 有“朋友圈”按钮 | `SnsModule` | 无独立 route | `存在`：SNS feed/search/notifications 被放在 inspector。 |
| 开发 | 有，`developer` | 有“开发”按钮 | `DeveloperToolsModule` | 无独立 route；另有全局 DevConsole | `存在`：普通路径暴露调试工具且容器层级混乱。 |
| AI | 有，`ai` | 有“AI”按钮 | `AiPanel` | 无独立 route | `存在`：AI 工作台级功能被塞进 inspector。 |
| 图谱 | 有，`graph` | 有“图谱”按钮 | 不作为 inspector | Workbench 内部主区特判；无 `/graph` route | `部分合理`：源码承认图谱需要主舞台，但还不是独立页面，规则也与其他同级模块不一致。 |
| 设置 | 有，`settings` | 标题栏有设置 IconButton | 不作为 inspector | `/settings` 独立 route | `部分存在`：独立 route 合理，但 rail 与标题栏入口重复。 |

源码证据：

- `src/l2-coordinator/commander/workbenchViewModel.ts:43-51`：`RAIL_MODULES` 包含 `chat / stats / media / sns / developer / ai / graph / settings`。
- `src/l1-entry/pages/WorkbenchView.tsx:127-168`：toolbar 又渲染 `统计 / 媒体 / 朋友圈 / 开发 / AI / 图谱`。
- `src/l2-coordinator/commander/workbenchViewModel.ts:187-189`：`isInspectorModule()` 返回 `stats / media / sns / developer / ai`。
- `src/l2-coordinator/commander/useWorkbenchCommander.ts:100-102`：`chat / settings / graph` 的 inspector module 被映射为 `stats`，其他模块使用 active module。
- `src/l2-coordinator/commander/useWorkbenchCommander.ts:195-209`：`settings` navigate 到 `/settings`，`graph` 调 `openGraph()` 并关闭 inspector，其他 inspector module 打开右侧栏。
- `src/l1-entry/routes/index.tsx:8-14`：实际 route 只有 `/`、`/workbench`、`/dashboard`、`/settings`，没有 `/stats`、`/media`、`/sns`、`/ai`、`/graph`。

### 1.2 当前 inspector 标题暴露了职责错误

`getInspectorTitle()` 返回：

| 模块 | 当前标题 | 是否像“当前上下文详情” | 结论 |
| --- | --- | --- | --- |
| `stats` | 统计数据 | 勉强成立，但过宽 | 可保留为“当前会话统计”，不应代表统计中心。 |
| `media` | 媒体与扩展 | 否 | 是完整模块名，不是详情标题。 |
| `sns` | 朋友圈 | 否 | 是一级内容域，不是聊天详情。 |
| `developer` | 开发者工具 | 否 | 是高级工具中心，不应普通可见，更不应是 inspector。 |
| `ai` | AI 分析 | 否 | 是工作台级能力，不是对象详情。 |
| `chat/settings/graph` | 也可返回标题 | 不稳定 | `settings` 和 `graph` 不实际作为 inspector，但仍有标题分支，说明模型边界不干净。 |

准确判断：当前 inspector title 本身已经把完整模块名当成右侧栏标题，说明产品结构在 view model 层就把“功能中心”和“辅助侧栏”混为一谈。

### 1.3 Toolbar 与 rail 的重复不是“多入口方便”

同一批模块同时出现在 rail 和 toolbar，且点击后的容器行为不同：

- `stats / media / sns / developer / ai`：点击后打开 inspector。
- `graph`：点击后隐藏会话列表和 inspector，主区变成图谱。
- `settings`：在 rail 中存在，但点击后离开 Workbench 到 `/settings`。
- 标题栏也有设置按钮，全局还有开发者控制台按钮。

这违反了项目标准中的重复入口检查：同一任务可以有深链接或上下文入口，但主入口必须清楚。现在的重复不是“主入口 + 深链接”，而是多个看起来同级的入口分别触发不同容器。

### 1.4 Graph 特判说明代码已经承认“有些功能不能放 inspector”

`resolveWorkbenchLayoutForModule()` 对 `graph` 做了特殊处理：

- 非 graph：返回原 layout。
- graph + single：隐藏会话列表、隐藏 inspector、主区单列。
- graph + wider：只保留 rail + 主内容。

这个方向是对的：图谱需要主舞台。但它也暴露出规则不一致：AI、媒体、朋友圈、统计同样需要主舞台，却还在 inspector。

准确表述：Graph 不是“已经独立成页”，而是“在 Workbench 内部被主内容特判”。后续仍应明确 route、导航状态、返回语义和图谱内右侧详情。

## 二、正确的三层容器模型

### 2.1 一级页面

一级页面承载完整任务流，应有自己的主舞台、状态、筛选、结果、详情与恢复路径。建议形成以下页面：

| 页面 | 建议 route | 主任务 | 不应依赖右侧聊天 inspector 的原因 |
| --- | --- | --- | --- |
| 聊天工作台 | `/workbench` 或 `/workbench/chat` | 找会话、看聊天、加载历史、从搜索定位上下文 | 这是产品核心 list-detail 工作台。 |
| 搜索 | `/search` 或 Workbench 内稳定搜索页 | 搜索、过滤、结果、点击定位、返回结果 | 当前搜索结果塞在 toolbar；搜索任务需要稳定结果舞台。 |
| 统计分析 | `/analytics` 或 `/workbench/stats` | 全局/会话范围统计、趋势、排行、分布、导出 | 图表和范围筛选需要宽屏空间，不能挤在侧栏。 |
| 媒体库 | `/media` | 图片/视频/文件/语音/收藏/成员/未读/新消息管理 | 它是资源浏览和定位任务，不是当前会话的一个详情字段。 |
| 朋友圈 | `/sns` | timeline、搜索、通知、详情、文章/位置/互动 | SNS 是独立对象模型，不是会话附属信息。 |
| AI 工作台 | `/ai` | 配置、索引、问答、语义搜索、证据、预览、历史 | AI 有长任务、流式状态、证据和设置，侧栏承载不了。 |
| 知识图谱 | `/graph` | 摘要、筛选、画布、时间线、节点/边/事件详情、图谱 QA | 当前已主区特判，应升级为明确一级页面。 |
| 设置 | `/settings` | 偏好、服务配置入口、隐私、开发者模式开关 | 不应作为 Workbench rail 模块。 |
| 高级诊断/开发 | `/diagnostics/advanced` 或 `/settings/developer` | DB/API/Hook/MCP/本地诊断 | 默认隐藏，只作为高级恢复路径。 |

### 2.2 上下文 inspector

Inspector 的判断标准：

- 离开当前主内容后，这块内容是否仍能独立完成任务？
- 是否只解释当前选择对象？
- 是否能在 260-360px 侧栏中清楚表达？
- 是否有大量筛选、分页、长任务、配置、tabs、结果列表？

如果答案是“它能独立完成任务”或“有大量筛选/分页/配置/长任务”，就不应放 inspector。

适合 inspector 的内容：

| 主页面 | 合理 inspector | 说明 |
| --- | --- | --- |
| 聊天 | 会话详情、当前会话 quick stats、最近附件预览、当前联系人/群信息、当前选中消息详情 | 这些都依附当前会话/消息。 |
| 搜索 | 搜索命中上下文、当前命中消息详情、返回结果列表 | 依附当前搜索结果。 |
| 统计页 | 选中图表点/排行项解释、指标说明、隐私提示 | 依附当前图表或选中指标。 |
| 媒体页 | 选中媒体详情、文件元信息、来源消息、打开/定位动作 | 依附当前媒体对象。 |
| SNS 页 | 选中动态详情、文章/位置/互动详情、外链安全确认入口 | 依附当前动态。 |
| AI 页 | 证据详情、引用消息、当前答案来源、运行状态说明 | 依附当前问答/搜索结果。 |
| Graph 页 | 节点/边/事件详情、相关消息、过滤器解释 | 依附当前图谱对象。 |

不适合 inspector 的内容：

| 当前内容 | 原因 |
| --- | --- |
| 完整媒体库 | 有 tab、筛选、预览、成员、未读、新消息和跳转任务。 |
| 朋友圈 feed | 有 timeline、搜索、通知、详情和外链安全流程。 |
| AI Q&A/索引管理 | 有配置、索引构建、SSE、证据、历史、清空和恢复路径。 |
| 开发者工具 | 高风险、高密度，普通用户默认不应看到。 |
| 全局统计中心 | 需要图表、时间范围、分布、排行和解释空间。 |
| 设置页 | 是全局偏好/配置，不依附当前会话。 |

### 2.3 临时浮层/抽屉

临时浮层用于短时、可退出的任务，不是长期功能容器。

适合放浮层/抽屉：

- 媒体预览。
- AI 证据详情 drawer。
- 外部链接安全打开确认。
- 高风险索引/清库/重建确认。
- 高级诊断导出确认。
- AI 设置向导或模型连接测试向导。
- 窄屏下的上下文 inspector。

不适合放浮层/抽屉：

- 长时间停留的完整 AI 工作台。
- 完整媒体库。
- 完整朋友圈。
- 开发者工具主界面。
- 图谱画布。

## 三、逐模块重新划分

### 3.1 会话 / 聊天：保留为核心工作台

判断：`部分合理`。

当前合理点：

- `ChatView` 是 Workbench 主内容。
- `ContactList` 是列表 pane。
- `WorkbenchFrame` 的 rail/list/main/inspector 四区骨架适合聊天工作台。

当前问题：

- 默认 inspector 是 `StatsInspector`，标题为“统计数据”，不是“会话详情”。
- `StatsInspector` 内还有 `AI`、`图谱`按钮，会继续把用户推向 inspector/主区混合规则。
- 搜索结果在 toolbar，而不是会话主舞台或搜索主舞台。

建议目标：

```text
/workbench
  左 rail：一级页面导航，只保留真正主入口
  左 pane：会话列表
  主 pane：聊天记录
  右 inspector：会话详情 / 当前消息详情 / 当前会话 quick stats / 最近附件
```

聊天 inspector 应包含：

- 当前会话摘要：名称、类型、最近活跃、消息量。
- 当前会话 quick stats：消息数、媒体数、参与人数、活跃时间。
- 最近附件预览：最多 3-6 条。
- 当前选中消息详情。
- 深链接：`查看完整统计`、`打开媒体库`、`问这个会话`、`在图谱中查看`。

不应包含：

- 完整 AI 面板。
- 完整 MediaLibrary。
- 完整 SNS feed。
- 完整 DeveloperToolsModule。

验收问题：

- 第一次进入聊天页，用户是否知道先选会话？
- 右侧是否只解释当前会话，而不是改变成另一个产品？
- 点击深链接后，用户是否能进入独立页面并保留当前会话范围？

### 3.2 统计：独立成统计分析页

判断：当前 `stats` 作为 inspector 模块存在，一级页面缺失。

源码证据：

- `stats` 在 rail 和 toolbar 都是一级入口。
- `isInspectorModule("stats") === true`。
- `StatsInspector` 当前显示 `DashboardOverview`、`TrendChart`、`TopContactCard`，并依赖 `currentChat`。

准确表述：

- 当前 `StatsInspector` 适合降级为“当前会话统计摘要”。
- 当前项目缺少“统计分析中心”页面。
- 不应写成“统计完全不可用”，因为当前会话统计、趋势和活跃发送者已有侧栏实现。

建议页面：

```text
/analytics
  顶部：范围选择（全部聊天 / 当前会话 / 联系人或群聊 / 时间范围）
  主区：关键指标卡片
  主区：趋势图
  主区：排行和分布
  侧区：指标解释、空状态、隐私提示
```

修复原则：

- Workbench inspector 保留“当前会话小统计”。
- rail 的“统计”进入 `/analytics`。
- 聊天 inspector 的“查看完整统计”作为深链接，带 `scope=currentChat`。

### 3.3 媒体：独立成媒体库页面

判断：当前 `media` 作为 inspector 模块存在，一级页面缺失。

源码证据：

- `MediaLibrary` 有 `attachments / favorites / members / unread / newMessages` 五个 tab。
- 附件可预览，但收藏、成员、未读、新消息多为静态列表或摘要。
- `useMediaCommander()` 从当前 messages 和 chatlog API 拉取收藏、未读、成员、新消息。

准确表述：

- 媒体功能不是“完全不能用”，附件预览路径相对更完整。
- 问题是它的任务模型已经超过 inspector：资源浏览、筛选、预览、成员、未读、新消息定位都需要完整主舞台。

建议页面：

```text
/media
  顶部：范围选择（全部 / 当前会话 / 指定联系人群聊 / 时间范围）
  二级 tab：图片 / 视频 / 文件 / 语音 / 收藏 / 未读与新消息 / 群成员
  主区：网格或列表
  右侧：选中媒体、成员或消息详情
```

Workbench inspector 只保留：

- 最近附件。
- 当前会话媒体数量。
- `打开媒体库` 深链接，带 `scope=currentChat`。

验收失败点：

- 当前 tab 形态让用户以为收藏、成员、未读、新消息可完成任务，但多数没有完整动作。
- 侧栏宽度不适合媒体网格、成员搜索、分页和消息定位。

### 3.4 AI：独立成 AI 工作台

判断：当前 `ai` 作为 inspector 模块存在，一级页面缺失。

源码证据：

- `AiPanel` 包含 `SemanticSetupCenter`、`SemanticIndexCenter`、`QAPanel`、`SemanticSearch`、`TopicView`、`ContactProfile`、`SemanticIndexPreview`、`SetupWizard`。
- AI tab 包含 `问答 / 搜索 / 分析 / 预览`。
- `useAiCommander()` 管理 semantic config、索引状态、索引预览、语义搜索、QA stream、证据、复制、重试等。

准确表述：

- AI 已经不是“当前会话辅助信息”，而是一个完整工作台。
- 右侧 inspector 可以保留“问这个会话”的入口和当前答案证据详情，但不应承载整个 AI 配置/索引/Q&A/预览。

建议页面：

```text
/ai
  顶部：AI 状态条（模型配置、索引状态、当前范围、隐私模式）
  主 tabs：问答 / 语义搜索 / 索引管理 / 证据库 / 设置
  主区：当前任务
  右侧：证据详情或引用消息
```

从聊天页进入 AI：

- `问这个会话` 应跳转 `/ai?scope=currentChat&chat=...`。
- AI 页面显示当前范围，并允许改为全部聊天。
- 返回聊天页时保留来源会话。

验收失败点：

- AI 有长任务、SSE、配置、索引和证据，放在窄侧栏会破坏状态可见性和恢复路径。
- 用户看到 rail 的 AI 会以为进入 AI 模块，但实际只是右侧挤出面板。

### 3.5 图谱：方向正确，但要升级为明确一级页面

判断：`部分合理`。

当前合理点：

- `graph` 不在 `isInspectorModule()` 中。
- `resolveWorkbenchLayoutForModule()` 对 graph 隐藏会话列表和 inspector，给主区空间。
- `GraphModule` 自身已有筛选、时间范围、摘要、可视化、时间线、高级面板、Graph QA。

当前不足：

- 没有 `/graph` route。
- rail 与 toolbar 均有图谱入口。
- 图谱仍嵌在 Workbench route 中，返回语义和页面 identity 不清楚。
- 图谱内部右侧详情应是“节点/边/事件详情”，不是 Workbench inspector。

建议页面：

```text
/graph
  顶部：图谱范围、时间、实体类型、刷新/停止
  左侧：筛选与摘要
  中间：图谱画布或表格 fallback
  右侧：节点/边/事件详情
  底部或侧区：时间线
```

准确边界：

- 可以保留从聊天、搜索、AI 证据跳转图谱的深链接。
- 主入口只有一个：rail 或应用级导航中的“图谱”。
- Graph 的请求取消和旧响应覆盖问题仍按主 UX 台账 P1-08 修复。

### 3.6 朋友圈：独立成朋友圈页面

判断：当前 `sns` 作为 inspector 模块存在，一级页面缺失。

源码证据：

- `SnsModule` 有 `timeline / search / notifications` 三个 tab。
- `SnsModule` 有作者、类型、起止日期、仅媒体、含已读通知等筛选。
- `SnsDetailInspector` 是 SNS 模块内部详情，说明 SNS 自身已经需要“主内容 + 详情”的二级结构。

准确表述：

- SNS 不是当前会话的附属信息。
- 当前 SNS 组件本身已经证明它需要独立页面：feed、search、notifications、filters、selected post detail。

建议页面：

```text
/sns
  顶部：搜索、刷新、时间范围
  左侧：动态 / 通知 / 搜索结果
  中间：朋友圈 feed
  右侧：选中动态详情
```

聊天 inspector 只保留：

- 联系人的朋友圈摘要。
- `查看朋友圈` 深链接。

验收失败点：

- 把 SNS feed 放在聊天右栏，会让用户误以为朋友圈是当前聊天的补充信息。
- 文章、位置、评论、点赞、通知、搜索都需要比 inspector 更清楚的任务边界。

### 3.7 开发者工具：默认隐藏，作为高级诊断页面

判断：存在。

源码证据：

- `RAIL_MODULES` 默认包含 `developer`。
- toolbar 默认渲染“开发”按钮。
- `GlobalCommandCluster` 永远渲染“开发者控制台”。
- `DeveloperToolsModule` 覆盖 DB Explorer、Endpoint Runner、Hook、MCP 等高密度工具。

建议目标：

```text
/diagnostics/advanced
或
/settings/developer
```

显示条件：

- 设置中开启“开发者模式”。
- dev/beta 构建。
- 错误恢复流程提供“打开高级诊断”。
- 启动参数或环境变量开启。

准确边界：

- 开发者工具不应删除；对本地私密数据桌面 app，安全诊断很重要。
- 但它不能占普通用户主 rail，也不能在普通标题栏永远可见。

### 3.8 设置：保留独立页面，移出 Workbench rail

判断：部分存在。

源码证据：

- `settings` 是 `RAIL_MODULES` 的一项。
- `selectModule("settings")` 实际 navigate 到 `/settings`。
- `GlobalCommandCluster` 标题栏有设置 IconButton。
- 路由层已有 `/settings`。

建议目标：

- 设置只放标题栏右上角或应用级菜单。
- `/settings` 是独立页面。
- Workbench rail 不放 `settings`。
- AI 页面需要模型配置时，提供 AI 页面内设置 tab 或“前往 AI 设置”，不要让全局 Settings 的本地 AI 字段伪装成 semantic AI 配置。

准确边界：

- 设置有全局入口是合理的。
- 不合理的是同一个设置入口同时存在于 Workbench rail 和标题栏，并且 rail 点击后离开 Workbench。

## 四、推荐信息架构目标

### 4.1 应用级导航

建议一级导航只表示真正页面，不表示右侧栏：

```text
会话
搜索
统计
媒体
朋友圈
AI
图谱
```

标题栏保留：

```text
隐私模式
设置
```

默认不显示：

```text
开发者控制台
开发者工具
高级诊断
```

它们只能在开发者模式或错误恢复中出现。

### 4.2 Chat Workbench 内部结构

```text
左 rail：一级页面导航
左 pane：会话列表
主 pane：聊天记录
右 inspector：当前会话/消息详情
```

不要在 Chat Workbench toolbar 中继续放完整模块 tab。toolbar 只保留：

- 当前会话标题。
- 搜索入口或当前搜索状态。
- 少量上下文操作。
- 窄屏返回会话列表。

### 4.3 深链接不是重复入口

允许从上下文 inspector 提供深链接：

| inspector 内动作 | 跳转目标 | 携带上下文 |
| --- | --- | --- |
| 查看完整统计 | `/analytics` | `scope=currentChat` |
| 打开媒体库 | `/media` | `scope=currentChat` |
| 问这个会话 | `/ai` | `scope=currentChat` |
| 在图谱中查看 | `/graph` | `focus=contact/chat/entity` |
| 查看朋友圈 | `/sns` | `user=当前联系人` |

这些不是重复主入口，因为它们是“带上下文的深链接”。主入口只在应用级导航出现。

## 五、Setup Center 布局重构专题

### 5.1 当前 Setup Center 事实

当前结构：

```text
.setup-shell
  左侧：SetupStepper + brand
  中间：hero + 当前 step card
  右侧：状态 + 诊断信息 + 打开工作台按钮
```

源码证据：

- `src/l1-entry/pages/SetupCenterView.tsx:16-131`：Setup Center 使用 `setup-shell` 三栏。
- `src/styles/layout.css:1497-1504`：桌面三列为 `184-224px / main / 260-300px`。
- `src/styles/layout.css:3489-3498`：`max-width: 1120px` 时右侧 aside 变为跨列底部区域。
- `src/styles/layout.css:3501-3534`：`max-width: 720px` 时 Setup 变成纵向 flex。
- `SetupCenterView.tsx:42-55`：`config` step 同一张卡里同时渲染 `ConfigImportPanel` 和 `ManualAdvancedConfigPanel`。
- `SetupCenterView.tsx:57-78`：`service/database` step 渲染 `ServiceControlPanel`。
- `ServiceControlPanel.tsx:61-69`：外部模式只有“连接外部服务”按钮，使用 prop `externalBaseUrl`。
- `ConfigImportPanel.tsx:35-37`：导入后显示完整 picked path。
- `ManualAdvancedConfigPanel.tsx:56-145`：高级表单一次性暴露 dataDir、workDir、platform、version、fullVersion、dataKey、imgKey、httpAddr、media cache。

### 5.2 准确判断

Setup Center 不是“没有布局”，也不是“完全错误”。它的问题是任务路径与布局层级不匹配：

| 当前区域 | 已有价值 | 问题 |
| --- | --- | --- |
| 左 stepper | 用户能看到设置步骤 | stepper 只说明阶段，不帮用户选择推荐路径、外部服务路径或高级路径。 |
| 中间主卡 | 当前步骤有主任务区域 | config step 把推荐导入和高级手动配置放在同一张卡里，高级字段过早暴露。 |
| 右侧状态 | HTTP/DB readiness 可见 | 诊断信息和打开工作台按钮一直在右侧，容易让首次用户分心；窄屏下状态下移后主路径与状态关联变弱。 |
| 外部服务 | 有外部服务 mode 和连接动作 | 没有 URL 输入、保存和连接测试分层。 |
| 高级手动配置 | 能覆盖复杂场景 | 默认暴露大量字段，字段级提示/错误不足，placeholder 有真实路径/`wxid` 形态。 |

### 5.3 Setup Center 应拆成三条清晰路径

建议 Setup 不是按“所有配置字段”组织，而是按用户意图组织：

```text
设置中心
  路径 A：推荐 - 自动导入配置
  路径 B：连接已有 chatlog 服务
  路径 C：高级手动配置（排障/专家）
```

#### 路径 A：推荐 - 自动导入配置

主任务：

- 选择微信数据目录。
- 自动识别 platform/version/key readiness。
- 显示安全摘要，不显示完整路径。
- 引导启动/检测本地服务。

页面内容：

```text
主卡：
  标题：自动导入本机微信配置
  状态：未选择 / 识别中 / 识别成功 / 识别失败
  操作：选择目录、重新选择、继续
  摘要：已识别 Windows 微信数据目录、版本、密钥状态
```

不应出现：

- `E:\WeChat Files\wxid_xxx` placeholder。
- 完整本地路径。
- dataKey/imgKey 明文示例。
- 一整组高级字段。

#### 路径 B：连接已有 chatlog 服务

主任务：

- 输入服务 URL。
- 测试 HTTP health。
- 测试 DB readiness。
- 保存连接配置。
- 进入 Workbench 后所有主 API 使用同一个 base URL。

页面内容：

```text
主卡：
  URL 输入：例如 http://127.0.0.1:5030
  操作：测试连接、保存并继续
  状态：服务可达 / DB 就绪 / DB 未就绪 / 连接失败
  恢复：检查服务、复制诊断、回到推荐路径
```

准确边界：

- 默认 `http://127.0.0.1:5030` 可以作为建议值。
- 不能只有按钮而没有输入。
- 如果产品只支持本机服务，UI 必须明确“仅支持本机地址/本机端口”，并在 CSP/allowlist 中一致。

#### 路径 C：高级手动配置

主任务：

- 给排障或专家用户提供完整配置。
- 默认折叠。
- 每个字段有说明、示例、校验、字段级错误。
- 对 secrets 和路径脱敏。

页面内容：

```text
高级手动配置（默认折叠）
  基础路径：数据目录、工作目录
  版本：平台、版本号、完整版本
  密钥：dataKey、imgKey
  服务：HTTP 地址、媒体缓存
  操作：验证字段、保存并测试
```

不应出现：

- 对普通用户默认展示所有字段。
- 错误只集中在底部。
- 真实感强的私密路径 placeholder。

### 5.4 建议布局

#### 桌面宽屏

```text
左侧：步骤与路径
  1. 选择路径
  2. 配置数据
  3. 连接服务
  4. 数据库就绪
  5. 完成

中间：当前路径的主任务
  推荐导入 / 外部服务 / 高级配置

右侧：只放稳定状态摘要
  服务状态
  数据库状态
  当前配置安全摘要
  诊断入口（不是完整诊断面板）
```

#### 中等宽度

```text
顶部：当前步骤 + 状态摘要
主区：当前任务卡
下方：诊断折叠区
```

#### 窄屏

```text
步骤进度条
当前任务卡
状态摘要
诊断折叠
底部主操作
```

窄屏不能把“状态”完全推到很远的页面底部而不在主任务附近显示简短 readiness，因为用户需要知道为什么不能进入 Workbench。

### 5.5 Setup Center 验收标准

| 场景 | 必须通过 |
| --- | --- |
| 第一次打开 | 用户能在 3 秒内知道推荐操作是“自动导入配置”或“连接已有服务”。 |
| 选择推荐路径 | 高级字段不默认出现；路径展示为安全摘要。 |
| 连接外部服务 | 有 URL 输入、连接测试、HTTP/DB 两级状态、保存后全局生效。 |
| 服务未就绪 | 不进入空白坏 Workbench；说明是服务不可达还是 DB 未就绪。 |
| 高级配置 | 默认折叠；字段级错误和提示可被屏幕阅读器关联。 |
| 隐私模式 | 路径、`wxid`、key/token、诊断内容全部脱敏。 |
| 窄屏 | 主操作、状态和错误恢复仍在可理解的顺序中。 |
| 诊断 | 诊断是恢复路径，不抢主任务；成功文案不显示完整本地路径。 |

## 六、问题优先级与修复顺序

| 优先级 | 问题 | 原因 | 首个可交付修复 |
| --- | --- | --- | --- |
| P0 | Workbench 一级模块容器混乱 | 直接影响所有主任务入口和用户理解 | 定义 route/page/inspector 架构契约，移除 toolbar 模块 tabs。 |
| P0 | AI/Media/SNS 被放在 inspector | 功能体量与侧栏空间根本不匹配 | 先建独立 route shell，保留原组件但放到主舞台。 |
| P0 | Setup 外部服务路径不闭环 | 首次设置承诺与能力不一致 | 外部服务 URL 输入、测试、保存、主 API base URL 收敛。 |
| P1 | Developer 默认暴露 | 普通用户被调试概念干扰 | 加开发者模式开关，rail/toolbar/titlebar 默认隐藏。 |
| P1 | Settings 入口重复 | rail 点击离开 Workbench，标题栏也有设置 | 从 Workbench rail 移除 settings，保留标题栏入口。 |
| P1 | Graph 只有内部特判 | 方向正确但页面 identity 不清 | 新增 `/graph` route 或明确 Workbench 子 route。 |
| P1 | Chat inspector 缺少明确“会话详情”模型 | 右侧现在默认“统计数据” | 建 `ConversationInspector`，把 StatsInspector 降级为 quick stats 卡。 |
| P2 | Setup 三栏响应式语义不稳定 | 状态与主任务在中窄屏容易脱节 | 将状态摘要靠近主操作，完整诊断折叠。 |

## 七、后续 PR 拆分建议

### PR 1：信息架构契约与导航收敛

范围：

- 定义 `WorkbenchModule` 与 route 的新边界。
- 移除 Workbench toolbar 中 `统计 / 媒体 / 朋友圈 / 开发 / AI / 图谱` 模块按钮。
- rail 只表示一级页面；settings 移到标题栏；developer 默认隐藏。

验收：

- 用户不会在同一屏看到两套同级模块入口。
- Graph 不再是唯一特殊规则，其他一级模块有明确页面计划或路由。

### PR 2：Chat inspector 降级为上下文详情

范围：

- 新建 `ConversationInspector`。
- 当前会话 quick stats、最近附件、联系人/群信息、深链接。
- `StatsInspector` 改成 `ConversationStatsSummary` 或只作为其中一张卡。

验收：

- inspector 标题不再是“媒体与扩展 / 朋友圈 / AI 分析 / 开发者工具”。
- inspector 离开当前会话后不再像独立功能中心。

### PR 3：AI / Media / SNS / Analytics 页面壳

范围：

- 新增页面 route 和 L1 shells。
- 复用现有 L2 commander 和 L3 模块，但放入主舞台。
- 保持当前能力，不先大重写功能细节。

验收：

- rail 点击进入独立页面，而不是打开 Workbench 右侧栏。
- 每个页面有标题、范围、主状态、错误恢复和返回上下文。

### PR 4：Graph 页面化

范围：

- 将 Workbench 内部 graph 特判升级为明确 route 或子 route。
- Graph 内部保留自己的右侧节点/边/事件详情。

验收：

- `/graph` 或明确子路由可直接打开。
- 从聊天/搜索/AI 跳转图谱可携带 focus。

### PR 5：Setup Center 三路径重构

范围：

- 推荐自动导入、外部服务、高级手动配置拆成三条路径。
- 外部服务 URL 输入和测试。
- 高级配置默认折叠。
- 诊断从常驻大面板变为恢复入口。

验收：

- 首次用户不会被高级字段淹没。
- 外部服务连接有真实输入、测试、保存和主 API 生效路径。
- 隐私路径不暴露完整本地路径或 `wxid`。

## 八、准确表述边界

| 主题 | 准确表述 | 不应误写为 |
| --- | --- | --- |
| inspector 问题 | 当前多个一级模块被放进 Workbench inspector，容器层级混乱。 | “右侧 inspector 本身不应该存在”。 |
| WorkbenchFrame | 四区骨架适合聊天 list-detail 工作台，但不适合承载所有一级模块。 | “WorkbenchFrame 整体要废弃”。 |
| Graph | Graph 已在 Workbench 内部被主区特判，方向相对正确，但还不是独立 route。 | “Graph 已经完全独立成页”。 |
| Stats | 当前统计摘要可作为会话 inspector，但缺少完整统计分析页。 | “统计功能完全不可用”。 |
| Media | 附件预览已有基础能力，但完整媒体库不应放侧栏。 | “媒体模块全部失败”。 |
| AI | AI 具备多个工作台级子任务，应独立成页。 | “AI 面板没有任何可用功能”。 |
| SNS | SNS 有 feed/search/notifications/detail，应独立成页。 | “朋友圈只能在聊天页显示”。 |
| Developer | 开发者工具应保留为高级诊断，但默认隐藏。 | “删除开发者工具”。 |
| Settings | `/settings` 独立页面合理，rail 内 settings 入口不合理。 | “设置不应该有全局入口”。 |
| Setup Center | 三栏雏形存在，但任务路径需要重构。 | “设置中心完全没有结构”。 |

## 九、待补证据

本文档没有新增运行证据。后续实现前后需要补：

- Workbench 桌面与窄屏截图：移除 toolbar 模块 tabs 后，一级导航是否清楚。
- `/analytics`、`/media`、`/sns`、`/ai`、`/graph` 页面路由 smoke。
- 从聊天 inspector 深链接到完整页面，并携带 `currentChat` 范围的 smoke。
- 隐私模式下深链接参数、标题、摘要、诊断不暴露私密路径/`wxid`/聊天内容。
- Setup Center 三条路径在桌面、中等宽度、窄屏的截图与键盘流程。
- 外部服务 URL 保存后，Workbench 主 API 和 Tauri CSP/allowlist 的真实联通证据。

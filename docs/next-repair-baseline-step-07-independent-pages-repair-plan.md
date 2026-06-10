# Step 07 - 独立页面拆分与页面级任务收敛修复计划

日期：2026-06-11  
适用分支：`codex/next-repair-baseline` 当前工作树  
计划性质：代码修复计划，不包含完整生产代码；后续实现必须以测试、浏览器证据、及时中文提交和清晰记录收口。推送和 PR 只在用户明确要求、需要远端 CI/协作审查或发布治理证据时执行。

## 1. 结论

Step 07 的目标不是再重复 Step 05 已完成的路由壳搭建，而是把已经迁出 Workbench inspector 的模块页面修成真正的独立页面：

- `/search` 已在 Step 06 完成主任务闭环，本步骤只把它作为页面标准和回归保护参考。
- `/analytics`、`/media`、`/sns`、`/ai`、`/graph` 已有 canonical route 和 `ReadyWorkspaceShellView`，但当前多为薄壳，仍依赖旧模块组件和当前会话隐式状态。
- Step 07 要为每个独立页面补齐清晰的用户任务、首要动作、scope/focus/source 深链规则、加载/空/错误/成功/取消/隐私状态、滚动所有权、窄屏行为和页面级验收证据。
- Workbench inspector 必须继续只做上下文摘要和深链，不能把完整 Media、SNS、AI、Graph、Analytics 工作台塞回右侧栏。
- 每个模块页面是可独立交付的修复单元。实现时必须分单元完成 focused tests 和中文短提交；不能等所有页面都修完后一次性提交合并。只有在需要远端 CI、协作审查、发布证据或用户明确要求时才推送并创建或更新 draft PR。

本步骤容易和总体计划里的“阶段 7：Settings 与配置收敛”混淆。按当前分步骤顺序，Step 07 指“拆独立页面和页面级收敛”；Settings 配置归属收敛仍作为后续单独步骤处理，除非 AI 页面配置归属会直接影响本步骤验收。

## 2. 已参考资料

### 2.1 指定资料

- `docs/next-repair-baseline-overall-repair-plan.md`
- `docs/next-repair-baseline-ux-ledger.md`
- `docs/next-repair-baseline-inspector-architecture.md`
- `ux-micro-affordance-opportunities.md`
- `docs/product-acceptance-standards.md`
- `docs/ui-development-standards.md`

### 2.2 当前进度与前置计划

- `docs/next-repair-baseline-step-01-base-url-readiness-repair-plan.md`
- `docs/next-repair-baseline-step-02-privacy-developer-entry-repair-plan.md`
- `docs/next-repair-baseline-step-03-ui-foundation-components-repair-plan.md`
- `docs/next-repair-baseline-step-04-setup-center-repair-plan.md`
- `docs/next-repair-baseline-step-05-workbench-information-architecture-repair-plan.md`
- `docs/next-repair-baseline-step-06-search-closed-loop-repair-plan.md`
- 当前 scratch 记录：`task_plan.md`、`findings.md`、`progress.md`

### 2.3 产品化与历史资料

- `AGENTS.md`
- `docs/总体开发规划.md`
- `开发指南.md`
- `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/spec.md`
- `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/plan.md`
- `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/contracts/app-readiness.md`
- `specs/chatlogui-specs-hidden-for-ci-repro/002-advanced-capabilities/capability-matrix.md`
- `specs/chatlogui-specs-hidden-for-ci-repro/002-advanced-capabilities/privacy-diagnostics-contract.md`

当前工作树中 `specs/001-ready-desktop-app/*` 和 `specs/002-advanced-capabilities/*` 的直接文件路径不可读，可读镜像位于 `specs/chatlogui-specs-hidden-for-ci-repro/...`。这不是本步骤阻塞项，但实施报告要说明读取来源，避免把缺失路径当成未参考。

### 2.4 当前源码重点读取

- `src/l1-entry/routes/index.tsx`
- `src/l1-entry/pages/ReadyWorkspaceShellView.tsx`
- `src/l1-entry/pages/WorkbenchView.tsx`
- `src/l1-entry/pages/SearchView.tsx`
- `src/l1-entry/pages/AnalyticsView.tsx`
- `src/l1-entry/pages/MediaView.tsx`
- `src/l1-entry/pages/SnsView.tsx`
- `src/l1-entry/pages/AiWorkspaceView.tsx`
- `src/l1-entry/pages/GraphView.tsx`
- `src/l2-coordinator/commander/primaryWorkspaceNavigation.ts`
- `src/l2-coordinator/commander/workbenchInformationArchitecture.ts`
- `src/l2-coordinator/commander/useScopedWorkspaceConversation.ts`
- `src/l2-coordinator/commander/useMediaCommander.ts`
- `src/l2-coordinator/commander/useSnsCommander.ts`
- `src/l2-coordinator/commander/useAiCommander.ts`
- `src/l2-coordinator/commander/useGraphCommander.ts`
- `src/l3-molecule/workbench/ConversationInspector.tsx`
- `src/l3-molecule/media/MediaLibrary.tsx`
- `src/l3-molecule/sns/SnsModule.tsx`
- `src/l3-molecule/semantic/AiPanel.tsx`
- `src/l3-molecule/graph/GraphModule.tsx`
- `scripts/ui-governance.test.mjs`

### 2.5 技能使用

- `using-superpowers`：确认必须先考虑适用技能。
- `planning-with-files`：使用 scratch 文件组织本次多文档和源码调研。
- `writing-plans`：按可执行修复计划组织任务、文件范围、测试、验收和提交节奏。
- `app-productization`：把页面拆分约束到“非技术用户可用的桌面产品”，而不是开发态组件迁移。
- `brainstorming`：作为既有计划的设计取舍复核；本次用户已明确要求撰写第七步计划，不另开交互式审批。
- `ui-acceptance` 和 `frontend-design`：约束页面任务、状态、响应式、视觉层级和控件行为。
- `verification-before-completion`：文档完成、提交、推送和完成声明前必须有新鲜验证证据。
- `using-git-worktrees`：复核分支隔离。当前已在 `codex/next-repair-baseline`，不是 `master`，且该分支是现有修复基线，因此不新建工作树。

## 3. Step 07 覆盖的问题

| 问题编号 | 当前判断 | Step 07 处理方式 |
| --- | --- | --- |
| IA-01 | Workbench inspector 已从完整模块容器降级，但必须防回退 | 增加页面级治理和 inspector 深链规则 |
| IA-05 / P1-08 | Graph 已有 `/graph` 页面壳，但旧响应覆盖和取消仍有风险 | 保持 Graph 独立页面身份，补页面状态和最小 request guard 或明确降级 |
| P1-07 | AI 已有 `/ai` 页面壳和较多 commander 能力，但页面级配置、scope、SSE 生命周期证据仍需收敛 | AI 页面提供状态条、配置归属、scope 显示、离页取消和证据验收 |
| P1-09 | Media 已有 `/media` 页面壳，但当前会话、附件、收藏、成员、未读、新消息仍像一个迁出的组件 | 明确媒体页面任务和每个 tab 的状态、预览、安全打开、跳转边界 |
| P1-10 | SNS 已有 `/sns` 页面壳，但外部文章/URL 安全打开和 tab 状态闭环不足 | SNS 页面独立处理 feed、search、notifications、detail 和 safe-open |
| P1-06 | AI 配置入口可能仍与 Settings 产生认知冲突 | 本步骤只处理 AI 页面内配置归属和文案；全局 Settings 收敛后续单独做 |
| P1-11 | Settings 返回上下文属于后续步骤 | 本步骤只保证模块页深链和返回会话不把用户硬塞回错误上下文 |
| P2 页面质量 | 新页面壳需要窄屏、暗色、隐私、空错加载和滚动所有权证据 | 按页面补测试、Playwright smoke、a11y/visual 覆盖 |

## 4. 非目标

Step 07 不应该顺手吞并以下任务：

- 不改变 `chatlog_alpha` 后端 API、SSE、Graph、SNS、Media 资源路径或 sidecar 合同。
- 不重做 Step 05 的 `ReadyWorkspaceShellView`、`PrimaryWorkspaceRail`、canonical route 基础，除非发现回归。
- 不重做 Step 06 的 Search 闭环；Search 只作为回归保护和页面标准参照。
- 不把完整 Settings 收敛、Settings 返回上下文、AI 全局偏好命名等后续配置治理都塞进本步骤。
- 不一次性重写 AI、Graph、Media、SNS 的内部业务模块。页面级独立性优先，模块可靠性按页面暴露风险逐步处理。
- 不新增远程调用、泛用外部 URL 打开器、Tauri CSP/capability 放宽或任意本地路径打开。
- 不把原始搜索词、会话名、SNS URL、media key、local path、AI 问题、Graph QA 内容写入 URL、日志、诊断、截图或 aria label。
- 不在计划文档里粘贴完整生产代码；实现细节由后续代码任务和测试体现。

## 5. 当前代码事实

| 区域 | 当前事实 | 对 Step 07 的含义 |
| --- | --- | --- |
| 路由 | `routes/index.tsx` 已有 `/search`、`/analytics`、`/media`、`/sns`、`/ai`、`/graph`，并把 `/workbench/*` 兼容路径 redirect 到 canonical route | Step 07 不再规划“新建路由”为主任务，而是规划每个页面的完整体验 |
| Ready shell | `ReadyWorkspaceShellView` 统一 ready gate、primary rail、内容 slot、StatusBar、DevConsole gating | 所有独立页面应继续复用这个 shell，不新建第二套 rail |
| Primary rail | `primaryWorkspaceNavigation.ts` 只包含会话、搜索、媒体、朋友圈、统计、AI、图谱 | 保持 settings/developer 不进普通 ready rail |
| Workbench | `WorkbenchView` 已只承载会话、聊天、会话详情 inspector 和“搜索此会话/返回搜索结果”等上下文动作 | Step 07 要防止完整模块回到 Workbench |
| ConversationInspector | 当前只展示会话统计摘要和“搜索此会话 / 查看完整统计 / 打开媒体库 / 问这个会话 / 在图谱中查看”深链 | inspector 的深链文案方向正确，需要让目标页面真正吃下 scope/focus |
| Search | `SearchView` 已拥有 `search-workspace__results`，治理测试禁止 Workbench 渲染 `<SearchResults>` | Step 07 只保护 Search 不回退 |
| Analytics | `AnalyticsView` 只有 current chat 时调用 `loadAll(currentChat)`；无会话时显示选择会话；文案说明全局统计后续扩展 | 页面身份存在，但任务范围仍偏窄，必须把 current/global scope 说清楚并测试 |
| Media | `MediaView` 薄壳包 `MediaLibrary`；`useMediaCommander` 依赖当前选中会话和现有消息 attachments，同时请求 favorites/unread/members/new_messages | 需要页面级 scope、无会话状态、tab 状态、预览安全、跳转边界和加载保护 |
| SNS | `SnsView` 薄壳包 `SnsModule`；模块已有 timeline/search/notifications/filter/detail | 需要页面级状态隔离、safe-open、URL/domain 脱敏、搜索/load more request guard |
| AI | `AiWorkspaceView` lazy 包 `AiPanel`；`useAiCommander` 已有配置检查、索引、QA streaming、semantic search、preview、analysis | 需要页面级状态条、scope/source 显示、配置归属、离页取消、隐私和证据要求 |
| Graph | `GraphView` lazy 包 `GraphModule`；`useGraphCommander.cancelGraphLoad()` 只把 store 标记为 cancelled，没有 abort 或旧响应写入保护 | 需要 Graph 页面 request guard 或不再把 cancel 表现成真实取消 |
| Governance | `scripts/ui-governance.test.mjs` 已保护 Workbench toolbar/inspector 和 search surface | Step 07 应扩展到独立页面 route、shell、privacy 和 no-inspector-regression |

## 6. 用户视角五问

| 问题 | Step 07 的回答 |
| --- | --- |
| 这些页面帮助用户完成什么真实任务？ | Analytics 看统计趋势和范围摘要；Media 管理当前会话或后续全局媒体资源；SNS 浏览朋友圈动态、通知和搜索；AI 配置/索引/问答/语义检索；Graph 查看实体关系、时间线和节点/边详情。 |
| 用户第一眼该做什么？ | 进入页面后先确认当前范围和页面状态，再执行该页面主任务：选择范围、刷新/筛选、搜索、配置/提问、加载图谱或查看详情。 |
| 同一个任务是否有重复入口？ | 主入口只能是 ready workspace rail 的对应页面；Workbench inspector 只能是带 `scope=currentChat`、`chat` 或 `focus` 的上下文深链。 |
| 出错或走错时如何恢复？ | 每个页面都要有返回会话、清除范围/筛选、重试、停止/取消、去 Setup 或 AI 配置、复制安全诊断等恰当恢复；不能只留空白或 raw error。 |
| 是否因为相邻能力缺失而像坏了？ | 是。Analytics 全局统计、Media 未读跳转、SNS 外链打开、AI 配置归属、Graph request guard 都是相邻缺口。Step 07 要明确补齐、诚实降级或标记为后续可靠性任务，不能让薄壳页面假装完成。 |

## 7. 统一页面合同

### 7.1 路由和 shell

所有独立页面必须满足：

| 合同 | 要求 |
| --- | --- |
| Canonical route | 主入口只使用 `/analytics`、`/media`、`/sns`、`/ai`、`/graph`。兼容 `/workbench/*` 只 redirect，不作为第二主入口。 |
| Ready gate | 继续复用 `ReadyWorkspaceShellView` 或等价 ready-workspace gate。HTTP/DB 不就绪时回到 Setup 恢复路径。 |
| Primary rail | 普通 rail 只展示会话、搜索、媒体、朋友圈、统计、AI、图谱；settings/developer 不进入。 |
| Deep link | Workbench inspector 和搜索结果等上下文入口只能携带非私密 scope/focus/source。私密 query、消息正文、SNS 原 URL、media key 不进 URL。 |
| L1 职责 | 页面只组装布局和委托事件；scope 解析、错误翻译、请求防护、状态归一化在 L2。 |
| L3 职责 | L3 模块接收 props，不直接发网络请求，不读取跨模块 store。 |
| L4 职责 | L4 network/system atom 保持 raw 调用，不读取 Zustand，不做页面业务判断。 |

### 7.2 页面通用状态

每个页面至少定义以下状态，哪怕某些状态只是明确的非适用降级：

| 状态 | 必须表现 |
| --- | --- |
| `idle` | 说明第一步，例如选择会话、输入搜索、配置 AI、加载图谱。 |
| `loading` | 显示局部 loading，不清空有用上下文；重复点击被禁用或有 request guard。 |
| `empty` | 说明为什么没有数据，并给出选择范围、调整筛选、构建索引或返回会话等下一步。 |
| `success` | 主任务结果可扫读，范围、数量、当前筛选和隐私状态清楚。 |
| `error` | 普通语言说明原因和恢复动作，不显示 raw endpoint、`HTTP 500`、内部 enum 或私密值。 |
| `cancelled` | 用户停止/离页/切换范围后，有明确最终状态；旧响应不能覆盖新状态。 |
| `partial` | 部分数据可用时显示已加载和缺失部分，不把缺失字段渲染成 broken label。 |
| `privacy` | 隐私模式保留结构、计数、状态、范围提示，遮蔽会话名、正文、URL、key、路径和身份。 |

### 7.3 页面视觉和交互

- 每个页面 header 包含页面名、当前范围、主要状态和一个明确主动作区域；不要做营销式 hero。
- 页面主体必须有明确滚动所有权。`html/body/#root` 是 hidden 模型，页面内部列表、画布、详情面板需要自己管理滚动。
- 不使用卡片套卡片。重复项可以是小卡片，页面区块应是 unframed layout 或单层 surface。
- 页面级 tab、segmented、toolbar、filter 和图谱控制不得低于 `docs/ui-development-standards.md` 的目标尺寸。
- 图谱 canvas、媒体列表、SNS detail、AI streaming 输出必须有稳定尺寸，loading/empty/error 不造成布局跳动。
- 窄屏下 rail、filters、tab 和 detail 不得横向溢出；详情面板可以变成 drawer 或堆叠区。

### 7.4 隐私和诊断

| 内容 | 规则 |
| --- | --- |
| 会话名、联系人、群名 | privacyOn 时统一遮蔽；不能进入 aria label、title、tooltip、URL 或诊断。 |
| 消息正文、搜索片段、AI 问题、Graph QA 内容 | 普通截图和诊断不保留原文；copy/export 走既有脱敏规则。 |
| SNS URL / proxy key | 页面可显示安全域名或“外部文章”，不显示完整 URL/key；诊断只记录 endpoint family 和计数。 |
| Media key/path | 预览只使用受控资源 URL；UI 和诊断不显示 raw key、path 或 `/data/*path`。 |
| AI provider secret | 保存后不回显；测试连接、错误、诊断只显示 provider/model/状态，不显示 key。 |
| Graph ingest/QA | 只展示用户输入区和安全摘要；诊断不记录问题、答案、证据原文。 |

## 8. 模块页面目标

### 8.1 Analytics / 统计

当前事实：`AnalyticsView` 只有当前会话时加载统计，无会话时提示选择会话，页面文案承认全局统计后续扩展。

Step 07 目标：

- 明确 `/analytics` 的最小交付范围：当前会话统计优先；全局统计若后端/commander 已支持则可同时提供，但不能用“全局统计”文案伪装当前会话数据。
- 页面顶部必须显示当前范围：当前会话、全部会话或未选择范围。
- 没有当前会话时，提供两条恢复：返回会话选择、查看可用的全局统计或解释“当前版本需从会话进入”。
- 图表、TopContact、趋势、总览分别有 loading/empty/error/partial 状态，不能只在整体 error 时显示一块失败。
- 隐私模式下保留消息数、趋势、时间范围、百分比，隐藏联系人/群名。

建议任务：

| 单元 | 文件范围 | 验收 |
| --- | --- | --- |
| 统计 scope view model | `src/l2-coordinator/commander/*analytics*` 或 `useStatsCommander` 周边 | current/global/no-scope 三种状态可测试 |
| 页面文案和布局 | `src/l1-entry/pages/AnalyticsView.tsx`、stats L3 组件 | 页面首屏说明真实范围，错误可重试 |
| 图表状态 | `DashboardOverview`、`TrendChart`、`TopContactCard` | 空数据、部分数据、隐私遮蔽不破布局 |
| 证据 | Vitest、core/a11y/visual smoke | `/analytics` desktop/narrow 可用 |

建议提交：`收敛统计独立页范围状态`。提交后记录验证证据；如需远端 CI/协作审查或用户要求，再推送并更新 draft PR。

### 8.2 Media / 媒体

当前事实：`MediaView` 是 `MediaLibrary` 的独立页面壳；数据来源仍主要是当前选中会话和当前 messages 中的 attachments，同时并行请求 favorites、unread、members、new_messages。

Step 07 目标：

- 明确 Media 页面当前阶段是“当前会话媒体与扩展”，还是“全局媒体库”。如果后端能力尚不足，全局入口可以存在，但文案必须诚实说明当前范围。
- `scope=currentChat&chat=...` 深链必须能选中会话并加载媒体；没有 chat 时不要静默显示空库。
- attachments、favorites、members、unread、new messages 五个 tab 各自有 loading/empty/error/partial 语义；一个 endpoint 失败不能把整页变成不可用。
- 未读和增量消息如果展示为可点击任务入口，必须能跳转到会话或消息锚点；若暂不支持，显示非点击摘要和 disabled reason。
- 预览资源使用受控本地资源 URL，不显示 raw key/path；缺失资源、加载失败、隐私模式和关闭焦点恢复都要验证。
- 成员 tab 若数据量可能大，要明确搜索/分页或“当前仅展示前 N 个”的诚实 copy。

建议任务：

| 单元 | 文件范围 | 验收 |
| --- | --- | --- |
| Media scope contract | `useScopedWorkspaceConversation.ts`、`useMediaCommander.ts`、media store | deep link 能选择当前会话；无会话状态稳定 |
| Endpoint 状态拆分 | `useMediaStore`、`useMediaCommander`、`MediaLibrary` | favorites/members/unread/new_messages 独立错误和重试 |
| 预览安全 | `MediaPreviewSheet`、resource URL builder、privacy tests | 不显示 key/path；失败有普通语言 |
| 未读/新消息跳转边界 | media view model、chat anchor helper 复用点 | 可跳转则复用 Step 06 anchor；不可跳转则不做假按钮 |
| 浏览器证据 | Playwright core/a11y/visual | `/media` desktop/narrow，无横向溢出 |

建议提交：`收敛媒体独立页范围与状态`。预览安全和跳转可拆第二提交：`补媒体预览安全状态`。

### 8.3 SNS / 朋友圈

当前事实：`SnsView` 是 `SnsModule` 的独立页面壳；模块已有 timeline、search、notifications、filters、selected detail，但安全外链和请求可靠性仍需页面级约束。

Step 07 目标：

- SNS 页面必须明确三种主任务：浏览动态、搜索朋友圈、查看通知；tab 文案和状态不能互相污染。
- timeline、search、notifications 分别有 loading/empty/error/no-results，并保留已加载列表作为稳定上下文。
- filter apply、load more、search 都需要 request snapshot 或 abort/丢弃机制；快速改筛选不能让旧 feed 覆盖新状态。
- 文章、链接、位置等外部内容必须先保留安全域名/类型摘要，再走确认打开；不能直接暴露完整 URL 或把 proxy query 写入诊断。
- `SnsDetailInspector` 是 SNS 页面内部详情，不是 Workbench inspector；窄屏可变成页面内 drawer，但不能回到聊天右栏。
- privacyOn 时 feed、通知、搜索结果和 detail 都遮蔽身份和正文，同时保留类型、时间粒度、数量、是否有媒体/链接。

建议任务：

| 单元 | 文件范围 | 验收 |
| --- | --- | --- |
| SNS request guard | `useSnsCommander.ts`、sns store、SNS request helper tests | filter/search/load more 旧响应不能覆盖 |
| Tab 状态隔离 | `snsViewModel`、`SnsModule`、`SnsSearchPanel`、`SnsTimeline` | 三个 tab 独立空错加载 |
| Safe-open 合同 | `SnsDetailInspector`、L4 system open wrapper 或既有安全打开模块 | 显示域名/类型、确认、取消、失败 |
| Privacy/diagnostics | sns display helpers、privacy tests、diagnostic governance | 无 URL/key/raw content |
| 浏览器证据 | Playwright core/a11y/visual/privacy | `/sns` desktop/narrow，搜索和通知可用 |

建议提交：`收敛朋友圈独立页状态`；safe-open 若文件范围较大，拆为 `补朋友圈安全外链确认`。

### 8.4 AI / AI 工作台

当前事实：`AiWorkspaceView` lazy 加载 `AiPanel`；`useAiCommander` 已覆盖配置检查、索引管理、QA streaming、semantic search、analysis、preview、连接测试、复制答案等大量能力。

Step 07 目标：

- `/ai` 页面要先显示 AI 工作台状态条：provider/model 配置状态、索引状态、当前范围、隐私状态和是否正在 streaming。
- AI 配置入口在 AI 页面内是合理的；全局 Settings 中的 AI 字段若仍存在，不能让用户误以为有两套能影响 semantic 工作流的配置。Step 07 至少要在 AI 页面文案和入口上声明“这里是语义工作流配置”。
- 从 Workbench inspector 的“问这个会话”进入 `/ai?scope=currentChat&chat=...` 后，AI 页面必须显示当前范围并允许改回全部聊天。
- SSE QA 必须在页面切换、tab 切换、重复提问、停止按钮和 unmount 时进入明确 cancelled/stopped 状态；旧 stream 不能继续写入新问题。
- 问答、语义搜索、分析、索引预览分别有自己的 loading/empty/error/success；索引未就绪时不要把所有 tab 都显示成可用。
- 证据引用可以跳回聊天，但必须复用消息定位协议或显示降级说明；不能只 `selectAndLoad` 后让用户自己找。
- privacyOn 时问题、答案、证据、联系人、preview 原文都按隐私合同遮蔽；复制答案遵守现有 redaction 规则。

建议任务：

| 单元 | 文件范围 | 验收 |
| --- | --- | --- |
| AI page header/status | `AiWorkspaceView.tsx`、semantic view model | 配置、索引、范围、stream 状态可见 |
| Scope/deep link | `useScopedWorkspaceConversation.ts`、AI commander/view model | currentChat/all scope 可切换且隐私安全 |
| Stream lifecycle evidence | `useAiCommander.ts`、QA store/tests、`QAPanel` | stop、leave、retry、duplicate question 有状态和测试 |
| Config ownership copy | `AiPanel`、`SemanticSetupCenter`、Settings 后续边界说明 | 用户只看到一个语义工作流配置入口 |
| Evidence navigation | semantic discovery navigation、chat anchor helper 复用 | 证据跳转定位或明确降级 |
| 浏览器证据 | AI route mock/e2e、a11y/privacy | `/ai` desktop/narrow，configured/unconfigured/index states |

建议提交：`收敛AI工作台页面状态`；stream 生命周期可拆为 `补AI流式任务取消证据`。

### 8.5 Graph / 图谱

当前事实：`GraphView` lazy 加载 `GraphModule`；`GraphModule` 内部已有筛选、时间范围、图谱摘要、画布、时间线、高级配置、ingest、Graph QA；`cancelGraphLoad()` 当前只改 UI 状态，没有真实 abort 或旧响应 guard。

Step 07 目标：

- `/graph` 页面要明确是图谱主工作区，不是 Workbench 的特殊子状态。
- 页面顶部显示范围、筛选、图谱状态、节点/边/事件计数、最后构建或加载状态。
- `focus`、`chat`、`keyword` 等深链参数必须通过 L2 解析，不在 L1 中写业务判断；私密 focus 不写明文 URL，必要时使用安全短 token 或仅用非私密类型参数。
- 加载图谱、筛选、时间范围切换、重试、取消必须有 request id/AbortController 或旧响应丢弃。否则取消按钮必须降级为“停止等待显示”，不能让用户误解为后端请求已停止。
- 空图、超大图、malformed、canvas 不可用、WebGL 不可用、隐私模式都有状态；fallback table 是正式降级，不是失败残留。
- 节点/边/时间线详情属于 Graph 页面内部 detail，不进入 Workbench inspector。
- Advanced config、business/event ingest、Graph QA 保持高级/确认路径；普通图谱浏览不被高级表单淹没。

建议任务：

| 单元 | 文件范围 | 验收 |
| --- | --- | --- |
| Graph route focus contract | graph L2 view model、`GraphView.tsx` | focus/source 参数安全解析，页面显示范围 |
| Graph request guard | `useGraphCommander.ts`、graph fetch options、graph store/tests | 旧 visualize/query/timeline 响应不能覆盖新筛选 |
| Canvas/fallback states | `GraphModuleView`、canvas/fallback components | empty/oversized/malformed/WebGL fallback 可见 |
| Advanced containment | `GraphAdvancedPanel`、`GraphQAPanel`、confirm dialogs | 高级动作确认、隐私、错误恢复 |
| 浏览器证据 | Graph canvas pixel/e2e/a11y/visual | `/graph` desktop/narrow，canvas 非空或明确 fallback |

建议提交：`收敛图谱独立页状态`；request guard 可拆为 `补图谱请求防旧响应覆盖`。

## 9. 推荐实现任务顺序

### 任务 1：页面壳和治理基线

目标：保护当前已完成的独立 route、ready shell、primary rail 和 inspector 降级成果。

主要文件：

| 文件 | 修改方向 |
| --- | --- |
| `src/l1-entry/routes/index.tsx` | 只在需要时补 route alias 测试，不重建路线 |
| `src/l2-coordinator/commander/primaryWorkspaceNavigation.ts` | 保持普通主入口清单，不放 settings/developer |
| `src/l2-coordinator/commander/workbenchInformationArchitecture.ts` | 保持 inspector title 和 deep link 语义 |
| `scripts/ui-governance.test.mjs` | 增加独立页面 route、shell、no-full-module-inspector、no duplicate nav 保护 |
| `e2e/utils/workbench.ts` 或 route helper | 支持所有独立页面 smoke |

验收：

- `/workbench/*` 兼容路径只 redirect 到 canonical route。
- Workbench 不渲染完整 Media/SNS/AI/Graph/Analytics 模块。
- Primary rail 不出现 settings/developer。
- Search 结果不回到 Workbench toolbar。

建议提交：`保护独立页面导航基线`。完成 focused governance 后提交；如需远端 CI/协作审查或用户要求，再推送。

### 任务 2：通用页面状态和 scope 合同

目标：让所有模块页面共享一致的 scope、source、focus、状态和隐私表达，不靠每个 L1 页面临时拼。

主要文件：

| 文件 | 修改方向 |
| --- | --- |
| `src/l2-coordinator/commander/useScopedWorkspaceConversation.ts` | 明确 chat/scope/source 解析和 missing conversation 降级 |
| 可新增 `src/l2-coordinator/commander/workspaceRouteScope.ts` | 纯函数处理 scope/focus/source，不含 UI |
| 可新增 `src/l2-coordinator/commander/workspaceRouteScope.test.ts` | 覆盖 currentChat/all/missing/private focus |
| `src/l1-entry/pages/*View.tsx` | 页面只消费 L2 结果，不直接推断业务 |

验收：

- Workbench inspector 深链进入每个页面后，页面显示当前范围。
- missing chat 不泄露原始 chat id。
- privacyOn 时 scope label 不出现真实身份。

建议提交：`建立独立页范围合同`。

### 任务 3：Analytics 页面收敛

目标：统计页面不再只是“搬出来的卡片”，而是清楚表达统计范围、空错加载和隐私。

验收：

- 无会话、有当前会话、统计加载失败、统计为空、隐私模式都有稳定页面。
- 如果全局统计不在本步骤实现，文案明确“当前范围统计”，不把它称为全局 dashboard。
- 图表容器在 390px 和 1366px 都不溢出。

建议提交：`收敛统计独立页范围状态`。

### 任务 4：Media 页面收敛

目标：媒体页面明确当前会话/全局范围，五个 tab 不再共享一个粗糙错误态，预览和资源安全可验收。

验收：

- 无会话状态有下一步，不自动展示空库。
- attachments/favorites/members/unread/new 各有空态。
- 部分 endpoint 失败时，用户能看到哪部分失败并重试。
- 预览不显示 raw key/path，关闭后焦点恢复。

建议提交：`收敛媒体独立页范围与状态`。

### 任务 5：SNS 页面收敛

目标：朋友圈页面拥有独立的 feed/search/notifications/detail 任务闭环和安全外部打开边界。

验收：

- 三个 tab 的 loading/empty/error/no-results 不互相污染。
- 搜索、筛选、load more 有 request guard 或旧响应丢弃。
- 文章/链接只显示安全域名或类型摘要，打开前确认，失败可恢复。
- 隐私模式和诊断不暴露 URL、key、正文、身份。

建议提交：`收敛朋友圈独立页状态`；外链任务可拆 `补朋友圈安全外链确认`。

### 任务 6：AI 页面收敛

目标：AI 页面作为独立工作台，统一配置、索引、问答、语义搜索、分析、预览和证据导航。

验收：

- 未配置、配置失败、索引未建、索引运行、索引失败、索引就绪、streaming、stopped、empty answer、error 都有状态。
- 离开页面或切换任务不会让旧 stream 写入新上下文。
- “问这个会话”深链显示范围并可回到会话。
- 证据跳转复用消息锚点或显示降级说明。

建议提交：`收敛AI工作台页面状态`；流式取消可拆 `补AI流式任务取消证据`。

### 任务 7：Graph 页面收敛

目标：Graph 页面拥有独立 route identity、筛选状态、canvas/fallback 状态、节点详情和 request guard。

验收：

- 加载、空图、超大图、错误图、WebGL 不可用、隐私模式可区分。
- 筛选、时间窗口、刷新、取消不会被旧响应覆盖。
- Canvas 非空时有像素证据；不能渲染时有正式 fallback。
- 高级配置和写入动作在确认/高级路径内，不挤压普通图谱浏览。

建议提交：`收敛图谱独立页状态`；request guard 可拆 `补图谱请求防旧响应覆盖`。

### 任务 8：页面级浏览器和发布前证据

目标：每个独立页面都有 route、状态、响应式、隐私和可访问性证据。

验收：

- `/analytics`、`/media`、`/sns`、`/ai`、`/graph` desktop/narrow smoke 通过。
- `pnpm e2e:a11y` 覆盖新增页面或对应 focused a11y spec。
- `pnpm e2e:visual` 更新并审查有意变化。
- privacy spec 或 DOM snapshot 不出现 raw path、wxid、message body、SNS URL/key、media key、AI secret。

建议提交：`补独立页面验收证据`。

## 10. 建议文件改动清单

### 10.1 可能新增

| 文件 | 用途 |
| --- | --- |
| `src/l2-coordinator/commander/workspaceRouteScope.ts` | 统一解析 scope、chat、focus、source 和隐私安全 label |
| `src/l2-coordinator/commander/workspaceRouteScope.test.ts` | route scope 红绿测试 |
| `src/l2-coordinator/commander/analyticsWorkspaceViewModel.ts` | 统计页面范围和状态 view model |
| `src/l2-coordinator/commander/mediaWorkspaceViewModel.ts` | 媒体页面 tab 状态和跳转边界 |
| `src/l2-coordinator/commander/snsRequestGuard.ts` | SNS filter/search/load-more request snapshot |
| `src/l2-coordinator/commander/graphRequestGuard.ts` | Graph visualize/query/timeline request snapshot |
| `e2e/specs/workspace-pages.spec.ts` | 独立页面 route、desktop/narrow、privacy smoke |

### 10.2 需要修改

| 文件 | 修改方向 |
| --- | --- |
| `src/l1-entry/pages/AnalyticsView.tsx` | 范围、空错加载、隐私、返回会话和全局/当前范围文案 |
| `src/l1-entry/pages/MediaView.tsx` | scope 显示、无会话恢复、页面标题和滚动结构 |
| `src/l1-entry/pages/SnsView.tsx` | page header、tab 状态、safe-open 状态入口 |
| `src/l1-entry/pages/AiWorkspaceView.tsx` | AI 状态条、scope 显示、配置归属提示 |
| `src/l1-entry/pages/GraphView.tsx` | route focus、Graph 页面状态和 fallback 壳 |
| `src/l2-coordinator/commander/useMediaCommander.ts` | 分 endpoint 状态、部分失败、scope 参数 |
| `src/l2-coordinator/commander/useSnsCommander.ts` | request guard、tab 状态隔离、safe-open 事件 |
| `src/l2-coordinator/commander/useAiCommander.ts` | stream lifecycle、scope、证据导航降级 |
| `src/l2-coordinator/commander/useGraphCommander.ts` | request guard、cancel semantics、safe error translation |
| `src/l3-molecule/media/MediaLibrary.tsx` | 五个 tab 的状态、disabled reason、预览安全文案 |
| `src/l3-molecule/sns/SnsModule.tsx` | tab 状态、filter/search/load more 状态、detail safe-open |
| `src/l3-molecule/semantic/AiPanel.tsx` | 页面级状态、配置入口文案、tab 可用性 |
| `src/l3-molecule/graph/GraphModule.tsx` | 筛选状态、cancel/fallback/advanced containment |
| `src/styles/layout.css`、`src/styles/workbench-content.css` | 页面滚动所有权、窄屏布局、Graph/Media/SNS/AI 页面尺寸 |
| `scripts/ui-governance.test.mjs` | 独立页面和 inspector 防回退规则 |
| `e2e/specs/core.spec.ts`、`a11y.spec.ts`、`visual.spec.ts`、`privacy.spec.ts` | 新页面 route/state/privacy 证据 |

### 10.3 避免触碰或仅协商触碰

| 文件 | 原因 |
| --- | --- |
| `src-tauri/**` | Step 07 不改变 Tauri、sidecar、CSP、capabilities |
| `src/l4-atom/network/httpClient.ts` | 除非 Graph/SNS/Media/AI request guard 需要透传 signal；若触碰需单独小提交 |
| `src/l1-entry/pages/SetupCenterView.tsx` 和 `src/l3-molecule/setup/*` | SetupCenter 已由 Step 04 拥有，Step 07 不回改首次连接流程 |
| `src/l3-molecule/settings/*` | Settings 收敛后续单独做；本步骤只处理 AI 页面配置归属的必要文案 |
| `src/l3-molecule/developer/*` | Developer/Diagnostics 后续审计阶段处理，Step 07 只防默认入口回退 |

## 11. 并行与提交策略

### 11.1 可并行工作

| 可并行单元 | 条件 |
| --- | --- |
| Analytics 页面收敛 | 不改共享 shell 或 Settings |
| Media 页面收敛 | 只改 media commander/store/components 和页面样式 |
| SNS 页面收敛 | safe-open 使用共享 overlay/system 合同，不临时造一套 |
| AI 页面状态条和配置文案 | 不同时重写 Settings AI 字段 |
| Graph request guard 和 fallback | 若需要改 shared HTTP signal，先单独小提交后再并行 |
| E2E 页面 smoke | 页面 route 稳定后可并行补 |

### 11.2 不应并行工作

| 不应并行 | 原因 |
| --- | --- |
| 多个模块同时改 `ReadyWorkspaceShellView`、`primaryWorkspaceNavigation.ts`、`routes/index.tsx` | 容易重新制造多套主入口 |
| AI 配置页面化与 Settings 配置收敛分头做 | 容易形成两个互相不一致的模型配置入口 |
| Media 未读跳转和 Search/AI 证据跳转各写一套锚点 | 必须复用 Step 06 消息定位协议 |
| SNS safe-open 和其它外部打开各写临时确认 | 必须复用共享 overlay/focus 和系统打开策略 |
| Graph request guard 与通用 HTTP signal 大改混在页面样式提交里 | 容易难以 review 和回滚 |

### 11.3 提交、推送和 PR 节奏

必须执行：

| 时机 | 要求 |
| --- | --- |
| 每个 coherent repair unit 完成 focused tests 后 | 中文短提交，例如 `收敛媒体独立页范围与状态` |
| 每个提交完成后 | 记录验证证据；需要远端 CI、协作审查、发布证据或用户要求时再推送当前分支 |
| 第一段实现完成后 | 默认本地提交和记录；只有必要时创建或更新 draft PR |
| 后续每个模块完成后 | 更新任务记录或最终报告中的范围、验证、剩余风险；如已启用 PR，也同步更新 PR 描述 |
| 出现 unrelated tracked changes 时 | 只 stage 当前任务文件；不要 revert 用户或其它任务改动 |

不允许：

- 等 Analytics、Media、SNS、AI、Graph 全部修完后一次性提交。
- 用英文或含糊提交信息掩盖修复范围。
- 把 ignored scratch 文件、真实日志、截图、私密夹具、sidecar binary 或 build output 加入提交。

## 12. 验收矩阵

| 页面 | 正常 | Loading | Empty | Error | Cancel/Stale | Privacy | Narrow | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/analytics` | 当前或全局统计范围明确 | stats loading 不清空 header | 无会话/无数据有下一步 | 统计失败可重试 | 快速切换范围不写旧数据 | 隐藏名称保留计数 | 图表不溢出 | unit + route smoke + visual |
| `/media` | tab 内容和范围明确 | 分 endpoint loading | 每个 tab 空态 | 部分失败可局部恢复 | 预览/加载旧响应不污染 | 无 key/path/content | tab 可用不横滚 | unit + privacy + route smoke |
| `/sns` | feed/search/notification/detail 清晰 | tab loading 独立 | no-results 和 no-feed 区分 | feed/search 各自错误 | filter/search/load-more 防旧响应 | 无 URL/key/raw text | detail 不遮挡主任务 | unit + privacy + safe-open smoke |
| `/ai` | 配置/索引/QA/搜索/分析/预览分明 | checking/streaming/index running 可见 | 未配置/无结果/无证据清楚 | provider/index/SSE 错误可恢复 | stop/leave/retry 防旧 stream | 无 key/raw answer leak | tabs 和 QA 可用 | unit + SSE focused + route smoke |
| `/graph` | 摘要、筛选、画布/详情可用 | canvas/summary loading | 空图/无关系解释 | malformed/oversized/WebGL 错误可恢复 | cancel/filter 防旧响应 | 无 raw entity/evidence leak | canvas/fallback 可用 | unit + canvas pixel + visual |

## 13. 验证命令

规划文档验证：

| 验证 | 命令 |
| --- | --- |
| 文件存在和大小 | `Get-Item docs\next-repair-baseline-step-07-independent-pages-repair-plan.md` |
| 未完成标记扫描 | 使用 ripgrep 扫描常见英文和中文未完成标记；扫描结果必须为空 |
| 代码块扫描 | `rg -n "^```" docs\next-repair-baseline-step-07-independent-pages-repair-plan.md` |
| 关键章节扫描 | `rg -n "Analytics|Media|SNS|AI|Graph|及时|推送|按需|draft PR|隐私|窄屏|request guard" docs\next-repair-baseline-step-07-independent-pages-repair-plan.md` |

后续代码实现的基础验证：

| 场景 | 基础命令 | 额外证据 |
| --- | --- | --- |
| 页面 L1/L2/L3 改动 | `pnpm lint`、`pnpm typecheck`、focused `pnpm exec vitest run ...` | route smoke desktop/narrow |
| Media/SNS/AI/Graph request guard | focused store/commander/network tests | 慢请求或旧响应丢弃测试 |
| Graph canvas | focused graph tests、Playwright route smoke | canvas pixel 或 fallback 证据 |
| Privacy/diagnostics | `pnpm fixtures:check`、privacy spec 或 DOM scan | 无 raw path/key/URL/content |
| 页面视觉/a11y | `pnpm e2e:a11y`、`pnpm e2e:visual` | 审查截图并记录意图变化 |
| 完整阶段收口 | `pnpm verify` | 如改 Tauri/Rust 才加 `cd src-tauri && cargo test` 和 `pnpm tauri build` |

## 14. 完成定义

Step 07 规划文档完成条件：

- 本文件存在于 `docs/next-repair-baseline-step-07-independent-pages-repair-plan.md`。
- 文档覆盖当前进度、源码事实、五问、非目标、模块目标、任务拆分、文件范围、并行边界、验收矩阵、验证命令、提交/按需推送/按需 PR 节奏。
- 文档不包含完整生产代码和 markdown 代码块。
- 文档无未完成标记。
- 文档明确要求小步中文提交，并把推送、draft PR 创建或更新限定为用户要求、远端 CI、协作审查或发布治理需要时的按需动作。
- 文档被 force-add 到 git，因为当前 `.gitignore` 默认忽略 `docs/*`。
- 如本次文档工作需要远端审查或用户要求，提交已推送到 `origin/codex/next-repair-baseline`；否则保留本地提交和验证记录即可。

后续 Step 07 代码实现完成条件：

- Analytics、Media、SNS、AI、Graph 至少各有一个可独立验收的页面单元完成；若某模块能力暂缓，页面必须诚实降级且有测试保护。
- 每个页面覆盖 loading、empty、error、success、privacy、narrow 和必要的 cancel/stale 状态。
- Workbench inspector 未回退为完整模块容器。
- Search 闭环不回退。
- 无后端合同、Tauri CSP/capability、隐私诊断边界的非授权变化。
- focused tests、lint、typecheck、相关 E2E/a11y/visual/privacy 证据通过。
- 每个 coherent repair unit 已中文提交并记录验证证据；如果用户要求或需要远端 CI/协作审查/发布治理，已推送并更新 draft PR。

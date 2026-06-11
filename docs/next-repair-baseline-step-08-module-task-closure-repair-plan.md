# 第八步：补各模块任务闭环与可靠性修复计划

日期：2026-06-11

适用分支：`codex/next-repair-baseline`

计划性质：代码修复计划。本文只描述修复范围、顺序、验收和证据要求，不放完整生产代码，也不把代码片段当成实现方案。

## 1. 目标结论

第八步承接前七步的结果：服务/readiness、隐私展示、UI 基础控件、Setup、Workbench 信息架构、Search 闭环、独立页面壳已经成为当前基线。现在要补的是各模块真实任务能不能完成，以及长任务、旧响应、取消、跳转、外链和局部失败是否可靠。

本步骤主范围是：

| 模块 | 对应问题 | 本步目标 |
| --- | --- | --- |
| AI / Semantic | P1-07，兼顾 P1-06 的边界说明 | 补 SSE body 读取阶段 idle watchdog、问答清空入口、离页/切模块取消证据、semantic search/analysis/preview 旧响应防护，以及安全错误翻译。 |
| Graph | P1-08 | 在主 graph load 已有 request id 的基础上，补 timeline、status、advanced config、ingest、QA 等子任务的取消或旧响应丢弃，保证取消后旧响应不能写回 store。 |
| Media | P1-09 | 收藏、成员、未读、新消息从“像完整入口”收敛成真实闭环：能预览/打开/搜索/定位的补齐，接口不支持的明确降承诺并锁测试。 |
| SNS | P1-10 | 在已保留外链 URL 且只展示域名/协议的基础上，补外链确认焦点、失败恢复、通知到动态定位、feed/notification 局部状态和 load-more/filter/search 旧响应防护。 |
| Analytics | 第七步遗留范围承诺 | 不作为主修复模块，但必须处理当前“全局统计以后补”的承诺：要么实现当前接口能支持的全局统计，要么把页面能力边界写得足够诚实。 |

本步骤不改变 `chatlog_alpha` 后端契约，不改 sidecar 启动参数，不引入遥测，不新增远程调用，不扩大 Tauri CSP/capabilities，除非某个修复点无法在现有前端/L4 atom 契约内安全完成并经过单独说明。

## 2. 参考输入与工作流

本计划直接参考并采用以下文件的约束：

| 文件 | 本计划采用点 |
| --- | --- |
| `docs/next-repair-baseline-overall-repair-plan.md` | 阶段 6 定义：AI、Graph、Media、SNS 的任务闭环和可靠性；长请求必须覆盖 loading/success/empty/error/cancelled/timed out，旧响应不能破坏状态。 |
| `docs/next-repair-baseline-ux-ledger.md` | P1-07 到 P1-10 的问题描述和反夸大说明：不要说 AI/Graph 完全没有状态，也不要把 Media/SNS 说成全不可用，要针对剩余缺口修。 |
| `docs/next-repair-baseline-inspector-architecture.md` | 独立页面已经是主入口，Workbench inspector 只保留上下文入口和深链，不再承载完整模块。 |
| `ux-micro-affordance-opportunities.md` | 风险动作说明、禁用原因、状态详情、安全外链确认和隐私显示要求。 |
| `docs/product-acceptance-standards.md` | 任务覆盖、状态覆盖、隐私、安全、响应式、模块验收和证据要求。 |
| `docs/ui-development-standards.md` | 任务入口、相邻功能、异步状态、取消恢复、焦点/目标尺寸和开发时交互决策。 |
| `docs/next-repair-baseline-step-05-workbench-information-architecture-repair-plan.md` | 独立主页面和 inspector 分工，不允许把模块重新塞回 Workbench inspector。 |
| `docs/next-repair-baseline-step-06-search-closed-loop-repair-plan.md` | 搜索命中定位、message anchor、return-to-results、旧响应防护，可复用于 Media 未读/新消息定位。 |
| `docs/next-repair-baseline-step-07-independent-pages-repair-plan.md` | 当前页面壳和 scope/status 基线，本步不得重复造壳。 |
| `开发指南.md`、`docs/总体开发规划.md` | L1/L2/L3/L4 分层、桌面 app 产品目标和历史约束；过时的端口/视觉建议不重新引入。 |

本次规划按需使用和考虑的技能包括：`using-superpowers`、`planning-with-files`、`writing-plans`、`brainstorming`、`app-productization`、`ui-acceptance`、`frontend-design`、`chatlog-debug`、`sidecar-integration`、`verification-before-completion`、`requesting-code-review`、`using-git-worktrees`、`code-simplifier`、`release-gate`。`dispatching-parallel-agents`、`subagent-driven-development` 已考虑但本轮不启用，因为当前工具规则要求用户明确要求子代理委派后才可 spawn。`speckit-*` 不启用，因为这不是 Spec Kit 产物编写任务。

## 3. 当前开发进度事实

### 3.1 已完成的基线

| 步骤 | 当前可依赖结果 |
| --- | --- |
| Step 01 到 Step 04 | 服务 base URL、readiness、隐私展示、开发者入口、UI 基础控件、SetupCenter 主流程已经形成基线。 |
| Step 05 | `/search`、`/analytics`、`/media`、`/sns`、`/ai`、`/graph` 已是 ready workspace 主页面；Workbench inspector 不应再承载完整模块。 |
| Step 06 | Search 已有稳定结果页、旧响应防护、搜索命中到消息定位、命中高亮、返回结果。 |
| Step 07 | 独立页面已有 privacy-safe scope/status，Media 有 endpoint partial 状态，SNS feed/search 和 Graph 主 load 有 request id，AI 默认当前会话，scoped route 不再写 raw chat/focus。 |
| Step 07 复修 | SNS 外链只展示域名/协议、完整 URL 非枚举保存；Media 未读/新消息和成员上限有边界说明；Graph 普通错误不显示 raw `HTTP 500`；AI evidence 有 anchor 与降级区分。 |

第八步不能把上述成果当成未完成工作重复实现。它要在这些基线上补真实任务闭环和可靠性。

### 3.2 当前代码缺口快照

| 模块 | 已有能力 | 剩余缺口 |
| --- | --- | --- |
| AI | QA stream 有 `AbortController`、stop、retry、copy、evidence anchor；store 暴露 `clearQAMessages`；页面 scope 已修正。 | `streamQA.ts` headers 后清掉初始 timeout，body 读取阶段无 idle watchdog；`QAPanel` 没有清空入口；semantic search、analysis、preview 请求没有统一 stale guard；离页/切模块取消需要测试证据。 |
| Graph | 主 visualize/summary load 有 `activeLoadRequestId` 和 cancelled 状态；普通错误有安全翻译。 | `refreshStatus`、`loadGraphTimeline`、advanced config save、business/event ingest、graph QA 等子任务没有同等 request lifecycle；取消后旧子请求仍可能写 UI；高级写动作需要更清晰风险说明和恢复状态。 |
| Media | `loadMediaModule` 用 `Promise.allSettled` 分离 favorites/unread/members/newMessages；tab 级 loading/error/empty 已有；无法定位的未读/增量已有边界说明。 | 当前会话/范围切换时没有 request id 或 abort guard；favorites 行仍偏摘要展示；members 只有前 50 上限，没有本地搜索或更明确的分页策略；未读/新消息如果具备 anchor 需要接入 Step 06 定位，否则必须保持不可点击摘要。 |
| SNS | feed/search 有 request id；article URL 非枚举保存；确认框显示域名/协议；`openExternalUrl` 限 HTTP/HTTPS。 | feed 与 notification 是同一整体状态，局部失败不可见；notification 指向未加载动态时缺少恢复路径；外链确认框需要焦点/失败/重试验收；load-more/filter/search 需要请求快照而不是只靠新 limit。 |
| Analytics | 独立页面有 scope/status，当前以会话统计为主。 | 页面仍暗示全局统计以后补。第八步需决定实现现有接口可支持的全局统计，或把全局承诺移出当前任务表面，避免误导用户。 |

## 4. 用户视角验收问题

每个模块实现前必须回答并用测试或浏览器证据覆盖以下问题：

| 问题 | 第八步判断标准 |
| --- | --- |
| 用户进入页面后第一件可做的事是什么 | 页面必须有明确主任务，不把摘要伪装成完整工具。 |
| 用户能否完成“找到 -> 操作 -> 看到结果/恢复”的闭环 | AI 能问、停、清、看证据；Graph 能查、筛、取消、执行高级动作并恢复；Media 能预览/定位或诚实提示不能定位；SNS 能看、搜、定位通知、确认外链并处理失败。 |
| 慢请求、重复点击、切换页面会发生什么 | 旧响应丢弃或请求取消，不能覆盖新意图；UI 有 loading、cancelled、timeout 或 partial 状态。 |
| 空数据、局部失败、服务断开是否可理解 | 用户看到普通语言和下一步动作，不看到 raw stack、raw `HTTP 500`、私密路径、token、message body。 |
| 隐私模式和窄屏是否仍可用 | 不把 chat id、query、URL、local path、message content 写入 URL、日志、诊断、aria 或截图；390px 左右窄屏可操作且无横向溢出。 |

## 5. 非目标

- 不重构 Workbench IA，不把 AI/Media/SNS/Graph 迁回 inspector。
- 不重新设计 SetupCenter、Settings、Search 主流程。
- 不修改 `chatlog_alpha` API 返回结构，除非后续任务明确批准后端契约变化。
- 不新增远程 AI provider、遥测、自动诊断上传。
- 不放宽 Tauri CSP/capabilities。SNS 外链默认继续走受限 `openExternalUrl` 包装；如果需要 Tauri opener，必须单独说明能力增量和安全理由。
- 不把完整生产代码、长代码片段或实现草稿放进计划文档。

## 6. 共享闭环契约

### 6.1 分层边界

| 层级 | 第八步要求 |
| --- | --- |
| L1 `src/l1-entry` | 只做路由、页面壳、event delegation 和 route scope 传递；不得放 fetch、业务状态归一化或重试逻辑。 |
| L2 `src/l2-coordinator` | 负责 commander/store 的请求快照、取消、旧响应丢弃、错误翻译、深链决策和任务状态归一化。 |
| L3 `src/l3-molecule` | 通过 props 接收数据和 callbacks；可以渲染任务控件、空态、错误态、确认框，但不能直接调用 L4 network/system atoms。 |
| L4 `src/l4-atom` | network/system atoms 只做原始 HTTP/SSE/system 调用，可接收 `signal` 和 diagnostics options，不读取 Zustand，不知道页面状态。 |

### 6.2 请求生命周期

长请求或可能跨页面返回的请求必须满足以下任一策略：

| 策略 | 适用场景 | 验收 |
| --- | --- | --- |
| `AbortController` 真取消 | SSE、可传 `signal` 的 HTTP 请求、用户主动 stop/cancel | 用户取消后请求不继续写 store；错误态区分主动取消和失败。 |
| request id / snapshot 丢弃旧响应 | 后端或当前 L4 atom 暂不支持 abort 的请求 | 新请求开始后，旧请求晚返回不能覆盖最新状态；测试模拟旧响应晚返回。 |
| 降承诺 | 后端缺少定位锚点、分页游标或可打开资源 | UI 不渲染误导性按钮；显示短边界说明；测试确保不可点击或禁用原因存在。 |

每个模块至少覆盖：

- `idle`
- `loading`
- `success/ready`
- `empty`
- `partial`
- `error`
- `timeout`
- `cancelling/cancelled`
- `stale response discarded`

如果某个状态对某模块不可达，需要在实现记录或 PR 说明里写明原因。

### 6.3 隐私与诊断

第八步新增或修改的 UI、测试、日志、错误和诊断不得暴露：

- raw `dataKey`、API key、token、secret。
- 私密聊天内容、搜索 query、QA prompt、SNS 原始 URL、SNS proxy query、media key。
- raw local path、`wxid`、真实联系人名称。
- raw backend stack、raw SQL/result body、raw `HTTP 500` 这类普通用户不可理解错误。

可展示的是经过归一化的状态、数量、域名、协议、文件类型、时间范围、会话范围的安全摘要。

### 6.4 深链和定位

可定位到消息的地方优先复用 Step 06 的 message anchor 能力：`chat`、`localId`、`timestamp`、message id fallback、命中高亮、返回来源。

不可定位时必须降级为会话级打开或摘要展示，且 UI 文案不能暗示“点击即可到消息”。未读/新消息、AI evidence、Graph QA evidence 和 SNS notification 都要按这个规则检查。

### 6.5 风险动作与外链

风险动作包括 graph rebuild/reset/ingest、semantic index clear/rebuild、SNS 外链打开、diagnostics export、service stop。第八步触碰到这些动作时必须有：

- 清晰动作名，不用技术缩写当唯一说明。
- 风险说明和取消路径。
- loading/disabled/retry/failure recovery。
- 焦点进入、Escape 或取消、焦点恢复。
- 隐私模式下不显示 raw URL、路径、消息内容。

## 7. 模块修复计划

### 7.1 AI / Semantic

目标：AI 页面不再出现“连接已经建立但 body 卡住没有恢复”的长挂起；问答会话可清理；所有 semantic 子请求不会因为旧响应晚返回覆盖新状态。

| 任务 | 文件范围 | 修复要求 | 验收证据 |
| --- | --- | --- | --- |
| AI-1 SSE idle watchdog | `src/l4-atom/network/streamQA.ts` 及测试 | headers 返回后继续维护 idle timer；每次 chunk 或 heartbeat 重置；超时后 abort 并返回安全错误；用户主动 stop 不显示为失败。 | 单元测试模拟 headers 后无 chunk、chunk 后继续、用户 abort、服务断开。 |
| AI-2 清空问答入口 | `useAiCommander.ts`、`QAPanel.tsx`、相关 UI 测试 | `clearQAMessages` 作为可见任务；清空前若有 active stream，先 stop 或明确禁用；空态返回可继续提问。 | UI 测试覆盖有消息、有 active stream、清空后空态和焦点。 |
| AI-3 semantic search 旧响应防护 | `useAiCommander.ts`、AI store/测试 | search query、scope、filters 建立 request snapshot；晚返回不覆盖最新结果；取消或离页不写入。 | Vitest 模拟慢请求晚返回和快速二次搜索。 |
| AI-4 analysis/preview 请求防护 | `useAiCommander.ts`、preview/analysis tests | topics/profile/preview/kind/limit/page 切换时旧响应丢弃；partial 结果不伪装完整成功。 | 测试覆盖 kind/limit/page 快速切换和服务失败。 |
| AI-5 离页/切模块取消证据 | `AiWorkspaceView.tsx`、`AiPanel` 或 commander lifecycle | route change、module unmount、scope change 不留下 active stream 写回；停止状态可见。 | Browser 或 Vitest lifecycle 证据，覆盖 `/ai` 离开到其他 route。 |
| AI-6 配置边界说明 | AI 页面 copy 或 Settings 交接 | AI 页面只承载 semantic workflow 所需配置入口；全局 provider/settings 收敛留给第九步，不在本步假装完成。 | 页面文案和测试不出现重复或误导性配置入口。 |

建议提交拆分：

| 单元 | 中文提交标题示例 |
| --- | --- |
| SSE idle watchdog | `补AI流式空闲超时` |
| QA 清空和离页取消 | `补AI问答清空与离页取消` |
| semantic 子请求旧响应防护 | `补AI语义请求防旧响应` |

### 7.2 Graph

目标：Graph 不只是主图加载可靠，timeline、status、advanced writes、ingest、QA 这些真实任务也要能取消、恢复或丢弃旧响应。

| 任务 | 文件范围 | 修复要求 | 验收证据 |
| --- | --- | --- | --- |
| Graph-1 请求生命周期统一 | `useGraphCommander.ts`、`useGraphStore.ts`、测试 | 为 timeline、status、advanced config、business/event ingest、QA 建立 request id 或 abort guard；旧响应不能写回。 | 测试模拟 timeline/status/QA 旧响应晚返回。 |
| Graph-2 cancel 语义扩展 | Graph commander/store/UI | 当前 cancel 不能只影响主 visualize；涉及正在运行的子任务时，UI 需显示已取消或该任务不可取消的诚实状态。 | UI 测试覆盖 cancel 后旧任务不写 store。 |
| Graph-3 advanced 写动作风险说明 | Graph advanced panels、shared confirmation | rebuild/reset/ingest/save 前说明影响范围；执行中禁用重复提交；失败后可重试。 | 组件测试和浏览器证据覆盖确认、取消、失败、重试。 |
| Graph-4 QA 与 evidence 可靠性 | Graph QA 相关 commander/store/UI | QA 请求不被旧问题覆盖；answer/evidence 错误安全翻译；有 message anchor 才允许跳消息。 | 测试覆盖快速多问、错误翻译、anchor 降级。 |
| Graph-5 canvas 和 fallback 状态 | Graph page/module、可视化测试 | 保持 loading/empty/error/oversized/malformed/fallback 区分；窄屏和非 WebGL/异常状态可理解。 | Browser desktop/narrow 和必要的 canvas 非空/降级证据。 |

建议提交拆分：

| 单元 | 中文提交标题示例 |
| --- | --- |
| Graph 子请求防旧响应 | `补图谱子请求防旧响应` |
| Graph 高级动作恢复 | `补图谱高级任务恢复状态` |
| Graph QA 和证据闭环 | `补图谱问答证据闭环` |

### 7.3 Media

目标：媒体库各 tab 不再只是“看起来可做任务”。能做的补成闭环，不能做的降承诺。

| 任务 | 文件范围 | 修复要求 | 验收证据 |
| --- | --- | --- | --- |
| Media-1 scope/request guard | `useMediaCommander.ts`、`useMediaStore.ts`、测试 | 当前 chat、scope、isGroup 快速切换时，旧 endpoint 结果不能写到新会话；局部失败仍保留其他 tab。 | 测试模拟旧会话请求晚返回和一个 endpoint 失败。 |
| Media-2 favorites 预览/打开 | `MediaLibrary.tsx`、media adapters/preview 相关文件 | 如果 favorite 含可预览资源，接入现有 `MediaPreviewSheet` 或会话定位；如果没有资源，行只展示摘要和禁用原因。 | 测试覆盖可预览收藏、无资源收藏、隐私模式。 |
| Media-3 members 搜索/分页边界 | `MediaLibrary.tsx`、fetch members 能力核对 | 现有接口若只返回一次 members，就提供本地搜索和“当前仅前 50”边界；只有在接口支持 offset/limit/cursor 时才做后端分页。 | 测试覆盖本地搜索、上限提示、空搜索结果。 |
| Media-4 unread/new message 定位 | media adapters、commander、Step 06 anchor 复用 | raw/adapted 数据有 chat/localId/timestamp 时才渲染跳转；没有可靠 anchor 时保持摘要展示，不给伪点击。 | 测试覆盖有 anchor 跳消息、无 anchor 降级、隐私模式不泄漏内容。 |
| Media-5 resource 安全和失败态 | `MediaPreviewSheet`、media open/download 入口 | 预览失败、资源不存在、隐私模式、窄屏焦点恢复都要有状态；不显示 raw media key 或 local path。 | Browser desktop/narrow，组件测试覆盖失败恢复。 |

建议提交拆分：

| 单元 | 中文提交标题示例 |
| --- | --- |
| Media 请求防旧响应 | `补媒体库请求防旧响应` |
| 收藏和成员闭环 | `补媒体收藏与成员检索` |
| 未读和增量消息边界 | `补媒体消息定位边界` |

### 7.4 SNS / 朋友圈

目标：SNS 页面能安全完成 timeline/search/notification/external article 任务，并在失败时给出可恢复路径。

| 任务 | 文件范围 | 修复要求 | 验收证据 |
| --- | --- | --- | --- |
| SNS-1 feed/notification partial 状态 | `useSnsCommander.ts`、`useSnsStore.ts`、`SnsModule.tsx` | feed 与 notification 分别有 loading/ready/empty/error；一个失败不让另一个消失。 | 测试覆盖 feed 成功 notification 失败、反向失败。 |
| SNS-2 request snapshot | SNS commander/store tests | load-more、filter、search clear/search submit 都带 request snapshot；旧结果不覆盖最新 filter/limit/query。 | 测试模拟快速筛选、搜索、load-more 晚返回。 |
| SNS-3 notification 到动态定位 | `SnsModule.tsx`、commander/store | notification 指向已加载 post 时定位并高亮；未加载时提供加载更多、搜索或无法定位说明，不显示空详情。 | 组件测试覆盖已加载、未加载、隐私模式。 |
| SNS-4 外链确认焦点和恢复 | `SnsExternalOpenDialog.tsx` 或共享 overlay primitive | 确认框符合焦点进入/取消/恢复；外链失败可重试；只展示 domain/scheme/title 安全摘要；不展示完整 URL。 | UI 测试和 browser evidence 覆盖确认、取消、失败、重试。 |
| SNS-5 system open 策略边界 | `openExternalUrl.ts`、Tauri 相关文件仅在必要时 | 默认保留 HTTP/HTTPS 限制。若为打包 app 必须改成 Tauri shell opener，需单独说明 capability/CSP 影响并跑 Rust/Tauri 验证。 | 单元测试覆盖非法协议拒绝；如改 Tauri，补 `cargo test` 和 `pnpm tauri build`。 |

建议提交拆分：

| 单元 | 中文提交标题示例 |
| --- | --- |
| SNS 局部状态和旧响应防护 | `补朋友圈局部状态防旧响应` |
| SNS 通知定位 | `补朋友圈通知定位闭环` |
| SNS 安全外链恢复 | `补朋友圈外链确认恢复` |

### 7.5 Analytics 范围承诺清理

目标：不要让 Analytics 页面继续给用户“全局统计已经是完整任务”的错觉。

| 任务 | 文件范围 | 修复要求 | 验收证据 |
| --- | --- | --- | --- |
| Analytics-1 能力判定 | `AnalyticsView.tsx`、stats commander/fetcher | 核对当前 stats API 是否能安全支持 `scope=all`。能支持则补全局统计 request lifecycle；不能支持则移除误导承诺，只保留当前会话统计和明确边界。 | 测试覆盖 current chat、all scope、no chat、service error。 |
| Analytics-2 深链一致性 | inspector deep links、route scope | 从 conversation inspector 到 Analytics 的路径必须和实际能力一致，不传 raw chat；无会话时不显示伪数据。 | Governance 或 route-scope 测试。 |

建议提交标题：`收敛统计页面能力边界`。

## 8. 推荐执行顺序

| 顺序 | 单元 | 原因 |
| --- | --- | --- |
| 1 | 建立各模块 focused red tests | 先锁当前缺口，避免只改 UI 文案。 |
| 2 | AI SSE idle watchdog | 这是最容易造成用户长时间卡住的 P1-07 硬缺口。 |
| 3 | AI 清空、离页取消、semantic 子请求 guard | 继续收敛 AI 页面闭环，避免跨模块切换污染。 |
| 4 | Graph 子请求和 advanced/QA lifecycle | Graph 主 load 已修，剩余风险集中在子任务写回。 |
| 5 | Media request guard、favorites、members | 先补媒体库静态 tab 的真实操作能力。 |
| 6 | Media unread/new message 定位或降承诺 | 依赖数据字段核对和 Step 06 anchor 复用，放在收藏/成员之后。 |
| 7 | SNS partial 状态、request snapshot、notification 定位 | SNS 已有安全外链基础，先补数据流可靠性。 |
| 8 | SNS 外链确认焦点/失败恢复 | 依赖 overlay/focus 验收，最后统一跑浏览器检查。 |
| 9 | Analytics 范围承诺清理 | 小范围收尾，避免文案和入口留下假承诺。 |
| 10 | 全模块验收、隐私、窄屏、E2E、PR evidence | 模块之间共享 route/scope/privacy 约束，最后统一扫一遍。 |

如果多人或并行工作参与，AI、Graph、Media、SNS 可按模块拆分，但共享文件必须冻结 ownership：`RequestDiagnosticsOptions`、route scope、message anchor、overlay primitive、`openExternalUrl`、全局 CSS、E2E core fixtures 不可多人同时改。

## 9. 文件范围

| 模块 | 主要文件 |
| --- | --- |
| AI | `src/l4-atom/network/streamQA.ts`、`src/l2-coordinator/commander/useAiCommander.ts`、`src/l2-coordinator/data-clerk/stores/useAiStore.ts`、`src/l3-molecule/semantic/QAPanel.tsx`、`src/l1-entry/pages/AiWorkspaceView.tsx`、相关 tests。 |
| Graph | `src/l2-coordinator/commander/useGraphCommander.ts`、`src/l2-coordinator/data-clerk/stores/useGraphStore.ts`、`src/l3-molecule/graph/*`、`src/l1-entry/pages/GraphView.tsx`、Graph network atoms 和 tests。 |
| Media | `src/l2-coordinator/commander/useMediaCommander.ts`、`src/l2-coordinator/data-clerk/stores/useMediaStore.ts`、`src/l3-molecule/media/MediaLibrary.tsx`、media adapters/fetchers、preview sheet、tests。 |
| SNS | `src/l2-coordinator/commander/useSnsCommander.ts`、`src/l2-coordinator/data-clerk/stores/useSnsStore.ts`、`src/l3-molecule/sns/*`、`src/l4-atom/network/snsAdapters.ts`、`src/l4-atom/system/openExternalUrl.ts`、tests。 |
| Analytics | `src/l1-entry/pages/AnalyticsView.tsx`、stats commander/fetcher、inspector deep-link tests。 |
| Shared verification | `scripts/ui-governance.test.mjs`、`e2e/specs/core.spec.ts`、`e2e/specs/privacy.spec.ts`、a11y/visual specs、fixtures if anchor data must be aligned。 |

避免触碰：

- `src-tauri/`，除非 SNS 外链必须改 Tauri shell opener。
- sidecar binary、local data、logs、`.env`。
- Setup/Settings/Search/Workbench 主架构，除非修复深链一致性需要最小调整。

## 10. 测试优先要求

每个修复单元都应先写能失败的 focused 测试，再实现。最少覆盖：

| 类别 | 示例 |
| --- | --- |
| 旧响应 | 慢请求 A 晚于请求 B 返回，A 不写 store。 |
| 取消 | 用户 stop/cancel、route unmount、scope change 后不再写入 active state。 |
| timeout | SSE headers 后 body 不发 chunk，idle watchdog 触发并安全显示。 |
| partial | Media/SNS 某 endpoint 失败，其他可用数据继续显示。 |
| anchor | 有可靠 anchor 才跳消息；无 anchor 时显示会话级或摘要级降级。 |
| privacy | 隐私模式和错误态不显示 raw URL、query、message、path、key。 |
| focus | 外链确认、预览 sheet、风险确认支持取消、Escape、焦点恢复。 |
| responsive | 1366x900 和 390x844 左右检查无横向溢出，按钮/文本不重叠。 |

## 11. 验收矩阵

| 模块 | 正常任务 | 空态 | 错误/局部失败 | 取消/旧响应 | 隐私 | 窄屏 |
| --- | --- | --- | --- | --- | --- | --- |
| AI | 问答、停止、清空、证据、semantic search/preview/analysis | 无消息、无结果、无索引 | SSE 断开、idle timeout、服务错误 | stop、离页、快速切 query 不污染 | 不泄漏 prompt/query/evidence content | 输入区、消息、证据抽屉可用 |
| Graph | 加载图、timeline、status、advanced actions、QA | 无图、无时间线、无 QA 结果 | malformed/oversized/fallback/写动作失败 | cancel 和新请求后旧响应丢弃 | 不泄漏 private node/message/raw error | canvas/控制区不重叠 |
| Media | 附件预览、收藏、成员搜索、未读/增量定位或摘要 | 无附件/收藏/成员/未读 | 单 endpoint 失败仍可用其他 tab | 切会话后旧结果丢弃 | 不泄漏 media key/path/content | tab、列表、preview 可操作 |
| SNS | timeline、search、notification、external article | 无动态、无搜索、无通知 | feed/notification/search/open failure | filter/search/load-more 旧响应丢弃 | 只展示 domain/scheme，不展示 URL | 确认框、列表、详情可用 |
| Analytics | 当前会话统计或明确全局能力 | 无会话/无统计 | service/stat error | scope change 不写旧数据 | 不泄漏 raw chat/path | 图表/摘要不横溢 |

第八步完成时，每一行都需要有测试或浏览器证据。没有能力实现的格子必须以“降承诺 + 测试锁定不可误点”处理，不能留模糊入口。

## 12. 提交、推送和 PR 节奏

用户特别要求及时提交和推送，不能等代码修复结束后一股脑合并。因此第八步实现必须采用以下节奏：

1. 每个 coherent repair unit 开始前运行 `git status --short --branch`，确认当前修改范围。
2. 写 focused red test，确认失败原因与本单元目标一致。
3. 实现最小修复，跑 focused tests，再跑本单元必要的 `pnpm typecheck`、`pnpm lint` 或浏览器检查。
4. 只 stage 本单元相关文件。若出现无关 tracked changes，先确认提交范围，不得顺手纳入。
5. 用简短中文提交信息提交，例如 `补AI流式空闲超时`、`补图谱子请求防旧响应`、`补媒体收藏与成员检索`、`补朋友圈外链确认恢复`。
6. 每完成一个模块或一个高风险 coherent unit 后立即推送当前分支到 origin，让远端 CI/PR evidence 及时更新。不要把 AI、Graph、Media、SNS 全部攒到最后一次 push。
7. 如果已有 draft PR，推送后更新 PR 评论或描述中的本单元验证证据；如果需要新 PR，保持 draft 直到全量验收通过。
8. 提交和推送后继续下一单元，不用等所有模块修完才记录证据。

计划文档本身也按这个规则处理：写完、验证后单独中文提交并推送。

## 13. 验证命令

### 13.1 本计划文档验证

- 文件存在：`Get-Item docs\next-repair-baseline-step-08-module-task-closure-repair-plan.md`
- 临时标记扫描：使用 `rg` 扫描常见英文/中文未完成标记和 markdown 代码围栏标记，应无结果。
- 关键项扫描：`rg -n "P1-07|P1-08|P1-09|P1-10|AI|Graph|Media|SNS|idle watchdog|旧响应|取消|隐私|窄屏|中文提交|推送" docs\next-repair-baseline-step-08-module-task-closure-repair-plan.md`

### 13.2 代码实现阶段验证

每个模块单元：

- 对应 focused Vitest。
- `pnpm typecheck`
- `pnpm lint`

每个模块完成后：

- 相关 e2e 或 browser smoke。
- 桌面宽度约 1366x900 和窄屏约 390x844 的页面检查。
- 隐私模式或 privacy spec 覆盖本模块新增状态。

第八步整体完成后：

- `pnpm test`
- `pnpm build`
- `pnpm verify`
- `pnpm e2e`
- `pnpm e2e:a11y`
- `pnpm e2e:visual`
- `pnpm fixtures:check`

如果改动 `src-tauri/`、Tauri capabilities、外链系统打开或 sidecar 相关文件：

- `cd src-tauri && cargo test`
- `pnpm tauri build`

## 14. 完成定义

第八步计划完成定义：

- 本文档已写入 `docs/next-repair-baseline-step-08-module-task-closure-repair-plan.md`。
- 文档不包含完整生产代码或 markdown 代码块。
- 文档覆盖 AI、Graph、Media、SNS、Analytics 边界、当前进度事实、任务顺序、文件范围、验收矩阵、验证命令和提交/推送节奏。
- 文档验证扫描通过，并用中文提交、推送。

第八步代码实现完成定义：

- AI P1-07、Graph P1-08、Media P1-09、SNS P1-10 均有可运行任务闭环或明确降承诺。
- Analytics 不再留下误导性全局统计承诺。
- 长请求、旧响应、取消、timeout、partial、error、empty、success 均有证据。
- 隐私、焦点、窄屏、深链、外链安全和错误翻译通过验收。
- 每个模块或高风险单元都有独立中文提交和及时 push 记录。
- 最终全量验证命令通过，残余风险写入 PR 或最终报告。

## 15. 实现时决策点

以下点不阻塞本计划落地，但实现时需要用当前接口事实作出明确选择：

| 决策点 | 默认处理 |
| --- | --- |
| Media 未读/新消息是否有可靠 anchor | 有 chat/localId/timestamp 才接 Step 06 定位；没有就保持摘要，不给点击跳转。 |
| Members 后端是否支持分页 | 不支持就做本地搜索和前 50 上限说明；不伪造分页。 |
| SNS 外链是否必须用 Tauri opener | 默认不改能力；如打包体验必须改，先写安全理由并补 Rust/Tauri 验证。 |
| Graph advanced action 是否能真 abort | 能传 signal 就 abort；不能就 request id 丢弃旧响应，并把不可取消状态写清楚。 |
| AI provider/config 是否并入本步 | 只处理 AI 页面 workflow 所需配置边界；全局 Settings 收敛留给后续配置步骤。 |

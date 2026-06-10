# Step 06 - Search 搜索闭环修复计划

日期：2026-06-10
适用分支：`codex/next-repair-baseline` 当前工作树
计划性质：代码修复计划，不包含完整生产代码；后续实现必须以测试、浏览器证据、及时提交和清晰记录收口。推送和 PR 只在用户明确要求、需要远端 CI/协作审查或发布治理证据时执行。

## 1. 结论

Step 06 的目标不是再给搜索增加一个入口，而是把搜索从“能看到结果”修成“能完成找消息任务”的闭环：

- `/search` 已经在 Step 05 后成为稳定主工作区，不能再回退到 Workbench toolbar 里的结果列表。
- 搜索请求、筛选变更、当前会话范围变更和加载更多必须有 abort 或 request guard，旧响应不能覆盖新查询，也不能把旧分页结果合并进新结果集。
- 搜索结果点击必须携带命中锚点，进入正确会话，加载命中消息附近上下文，滚动定位并高亮命中消息。
- 如果后端当前无法精确定位，用户也必须看到明确降级说明，而不是误以为搜索坏了或消息丢了。
- 用户必须能从聊天上下文返回搜索结果，并保留选中的搜索结果状态。
- 隐私模式下继续遮蔽会话名、消息正文、搜索片段和辅助技术文本里的私密内容，但保留结构、时间、数量、状态和跳转能力。

这一步应作为独立修复单元或少量紧密修复单元推进。不能等搜索闭环全部修完才一次性提交。每个可验证的小单元完成后都要先跑 focused tests，再中文短提交；只有在需要远端 CI、协作审查、发布证据或用户明确要求时才推送并创建或更新 PR。

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
- 当前 scratch 记录：`task_plan.md`、`findings.md`、`progress.md`
- 当前提交进度：最近提交包含 Step 05 Workbench IA 合并，`/search`、`ReadyWorkspaceShellView`、`PrimaryWorkspaceRail`、`ConversationInspector` 等文件已经存在。

### 2.3 产品化与架构资料

- `AGENTS.md`
- `docs/总体开发规划.md`
- `开发指南.md`
- `.specify/memory/constitution.md`
- `specs/001-ready-desktop-app/spec.md`
- `specs/001-ready-desktop-app/plan.md`
- `specs/001-ready-desktop-app/tasks.md`
- `specs/001-ready-desktop-app/contracts/app-readiness.md`
- `specs/001-ready-desktop-app/contracts/local-backend.md`
- `specs/001-ready-desktop-app/contracts/diagnostics-package.md`
- `product-acceptance-issue-ledger.md`

### 2.4 技能使用

- `using-superpowers`：确认本次必须先考虑并加载相关技能。
- `planning-with-files`：使用 `task_plan.md`、`findings.md`、`progress.md` 管理本次多文件调研。
- `writing-plans`：按可执行修复计划组织任务、测试、文件范围、提交节奏和验收。
- `brainstorming`：用于梳理搜索闭环目标和取舍；本次用户已经明确指定输出为第六步计划，因此不额外等待交互式方案审批。
- `chatlog-debug`：按证据而不是猜测记录当前搜索缺口和失败层。
- `ui-acceptance`、`frontend-design`：约束搜索页面状态、响应式、辅助说明、控件和视觉层级。
- `app-productization`：确保搜索闭环面向普通桌面用户任务，而不是开发态片段。
- `test-driven-development`：后续代码执行必须先写能失败的测试，再改实现。
- `verification-before-completion`：提交、推送、PR 或完成声明前必须有新鲜验证证据。
- `requesting-code-review` 和 GitHub 发布流程：实现前后进行本地 review；只有需要远端审查、CI 或用户要求时才推送并开 draft PR。

## 3. Step 06 覆盖的问题

| 问题编号 | 当前判断 | Step 06 处理方式 |
| --- | --- | --- |
| P1-04 | 搜索结果能打开会话，但不能定位命中消息 | 建立搜索命中锚点、会话上下文加载、滚动定位、高亮和返回搜索路径 |
| P1-05 | 搜索和加载更多存在旧响应覆盖/污染风险 | 加 request id、request snapshot、AbortController 或等价丢弃机制 |
| P1-02 | 搜索结果原先在 toolbar，Step 05 已迁出 | 保持结果在 `/search` 主表面，并把 240px 小结果框升级为可承载搜索任务的稳定区域 |
| `Search jump` 验收 | 产品标准要求搜索能打开正确 session 并定位上下文 | 用 L2 锚点合同、L3 虚拟列表定位和 E2E 证据补齐 |
| 隐私模式 | 搜索片段和会话名不能泄露私密内容 | 搜索结果、跳转提示、返回路径、aria 文本全部遵守 privacy display |

## 4. 非目标

Step 06 不应顺手吞并以下任务：

- 不改变 `chatlog_alpha` 后端 API 契约，不要求新增 `/history/local_id` 或专门的 search-jump endpoint。
- 不重做 Step 05 的 Workbench IA、ready workspace rail、模块页面壳。
- 不完成 Media 未读/新消息跳转闭环；但需要把搜索的消息锚点协议写成可被后续 Media 复用。
- 不补 AI semantic search 的全部 stale/定位问题；但可以记录其已有 `localId` 导航思路，避免两套协议分裂。
- 不把完整生产代码或大段实现粘贴进计划文档。
- 不引入新的全局 router/store 架构。
- 不把搜索 query、命中正文或私密片段写进 URL、日志、诊断或截图证据。

## 5. 当前代码事实

| 区域 | 当前事实 | 对 Step 06 的含义 |
| --- | --- | --- |
| 路由和页面 | `src/l1-entry/routes/index.tsx` 已有 `/search`；`SearchView.tsx` 在 `ReadyWorkspaceShellView` 下渲染搜索工作区 | Step 06 可以基于稳定页面修闭环，不需要再迁移入口 |
| 搜索 UI | `SearchView.tsx` 渲染 `GlobalSearch`、`FilterBar`、`SearchResults`；结果不再挂在 Workbench toolbar | Step 06 应保持这个方向，并让结果区成为主任务区域 |
| 搜索请求 | `useSearchCommander.ts` 调用 `fetchSearch()` 后直接 `setResults()`；load more 后直接 `mergeSearchResults()` | 需要请求身份和 snapshot 验证，防止旧响应写入 |
| 搜索取消 | store 有 `cancelled` 状态，`clearSearchSession()` 只取消 debounce | 需要真正取消正在进行的 HTTP 请求或至少丢弃旧响应 |
| L4 HTTP | `requestJson()` 已支持 caller `AbortSignal` | 可扩展 `RequestDiagnosticsOptions` 保留 `signal`，再让 `fetchSearch`/`fetchHistory` 透传 |
| 搜索结果点击 | `SearchResults.tsx` 只用 `message.username || message.chat` 调 `onSelectAndLoad(chat, chat)` | 需要保留 `localId`、`timestamp`、`message.id`、query/filter/scope 和来源 |
| 会话加载 | `useChatCommander.loadHistory()` 固定请求 `{ chat, limit: 50, offset: 0 }` | 需要新增“围绕命中加载”或“加载后定位/降级”路径 |
| 消息列表 | `MessageList.tsx` 使用虚拟列表，行上只有 `data-index`，`MessageBubble` 不知道命中状态 | 需要 row anchor、scrollToIndex、highlight class、aria 状态和自动清除 |
| 数据适配 | `adaptHistoryMessage()` 基于 `local_id` 生成稳定 id；search/history raw message 都有 `local_id` 和 `timestamp` | 可以先用 `chat + localId + timestamp` 做前端定位协议 |
| E2E 夹具 | core fixture 中 search result `local_id: 2001`，history messages 是 `1001-1003` | 实现闭环 E2E 前需要调整合成数据或明确测试降级路径 |
| 视觉样式 | `.search-result-pane` 仍 `max-height: 240px` | 搜索主页面应提供更稳定的结果区和滚动所有权 |

## 6. 用户视角五问

| 问题 | Step 06 的回答 |
| --- | --- |
| 这个界面帮助用户完成什么真实任务？ | 从大量本地聊天记录中找到一条相关消息，并回到那条消息所在的聊天上下文。 |
| 用户第一眼该做什么？ | 在 `/search` 输入关键词，确认范围和类型筛选，然后查看结果列表。 |
| 同一个任务是否有重复入口？ | 主入口是 ready workspace rail 的“搜索”。Workbench 里的“搜索此会话”只是带 `scope=currentChat` 的深链接，必须进入同一 `/search` 工作区。 |
| 出错或走错时怎么恢复？ | 用户可以清除搜索、重试、调整筛选、返回搜索结果、回到会话列表；无法定位命中消息时有降级说明。 |
| 相邻功能是否缺失导致体验像坏了？ | 当前缺的是请求可靠性和消息锚点。Step 06 明确补齐这些，不把“打开会话但不定位”伪装成完成。 |

## 7. 目标搜索闭环

### 7.1 正常路径

1. 用户从 ready workspace rail 进入 `/search`，或在 Workbench 当前会话中点击“搜索此会话”进入 `/search?scope=currentChat&chat=...`。
2. 用户输入关键词，搜索进入 loading，旧请求被取消或标记为过期。
3. 结果列表展示会话、发送者、时间、片段、类型、当前筛选和总数。
4. 用户点击结果。
5. L2 解析出目标会话和命中锚点，保存返回搜索上下文。
6. Workbench 打开目标会话，并优先加载命中时间附近的消息窗口。
7. `MessageList` 滚动到命中消息附近，高亮命中消息 2 到 4 秒。
8. Workbench 显示轻量“返回搜索结果”动作，返回后仍能看到原搜索结果和 active result。

### 7.2 降级路径

| 场景 | 必须表现 |
| --- | --- |
| 搜索结果没有 `localId` 但有 `timestamp` | 使用 timestamp window 加载附近消息；若无法命中，显示“已打开会话，暂无法精确定位到原消息”。 |
| 搜索结果没有 `localId` 和可用时间 | 只打开会话，并显示无法精确定位原因。 |
| 会话列表找不到结果来源 | 留在搜索页或显示错误，不用私密 label 泄露；提示“未在当前会话列表中找到该结果来源”。 |
| 后端 history window 不返回目标消息 | 打开会话并显示降级提示，提供返回搜索结果和按时间继续浏览。 |
| 用户在定位过程中切换会话或再次搜索 | 旧定位请求不得覆盖新会话；旧高亮不得出现在新会话。 |
| 隐私模式开启 | 仍能定位和高亮结构，但不显示命中正文、会话真实名或私密片段。 |

## 8. 关键设计合同

### 8.1 Search request snapshot

每次搜索和加载更多都必须生成请求快照，至少包含：

| 字段 | 用途 |
| --- | --- |
| `requestId` | 判断响应是否仍是当前请求 |
| `kind` | 区分主搜索、加载更多、重试 |
| `query` | 写入前确认关键词仍匹配 |
| `filter` | 写入前确认类型筛选仍匹配 |
| `scope` | 写入前确认 all/current 仍匹配 |
| `scopeChat` | 写入前确认当前会话范围仍匹配 |
| `offset` / `limit` | 加载更多合并时确认分页位置 |

请求快照属于 L2/DataClerk 状态和纯 helper，不进入 L3。L4 只接收 raw fetch 参数和 optional signal。

### 8.2 Search hit anchor

搜索命中锚点采用前端可验证的最小合同，不要求后端新增接口：

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| `chat` | search result `username` 优先，fallback `chat` | 用于请求 `/api/v1/history` |
| `conversationId` | 前端会话列表 resolver | 用于选中会话 |
| `messageId` | adapted message `id` | 用于前端高亮 fallback |
| `localId` | raw/adapted `local_id` | 精确匹配首选 |
| `timestamp` | raw/adapted timestamp | 时间窗口加载和排序 fallback |
| `time` | raw/adapted time | 用户可见时间和降级文案 |
| `source` | `"search"` | 区分来自搜索、AI、Media 等后续锚点 |

如果后续后端提供更精确的 local id lookup，应该接入同一锚点模型，而不是另建一套 search-only 协议。

### 8.3 Chat anchor state

聊天 store 或 L2 commander 需要表达定位状态：

| 状态 | 含义 |
| --- | --- |
| `idle` | 没有定位任务 |
| `loading` | 正在打开会话或加载命中附近窗口 |
| `found` | 命中消息已进入当前消息列表并高亮 |
| `missing` | 已打开会话，但当前加载窗口没有目标消息 |
| `error` | 会话或历史加载失败 |
| `cancelled` | 用户切换会话、返回或清除定位 |

这些状态用于 UI 提示和测试，不应靠临时 boolean 散落在组件里。

### 8.4 Return-to-search context

返回搜索结果不能依赖浏览器地址栏暴露原始私密 query 或 snippet。推荐用 SearchStore 或 router `location.state` 保存：

| 字段 | 用途 |
| --- | --- |
| `returnRoute` | 回到 `/search`，可带非私密 scope/source 参数 |
| `activeResultId` | 恢复列表 active row |
| `querySnapshot` | 恢复当前 store 内结果，不写入日志或 URL |
| `sourceConversationId` | 从 Workbench 回到搜索时可恢复范围提示 |

如果实现选择把 query 写入 URL，必须额外通过隐私审查证明不会进入截图、日志、诊断和辅助技术文本；本计划默认不建议这样做。

## 9. 实施任务拆分

### 任务 1：搜索请求取消与 stale guard

目标：快速输入、切换筛选、切换范围、加载更多时，旧响应不能覆盖新意图。

主要文件：

| 文件 | 修改方向 |
| --- | --- |
| `src/l4-atom/network/httpClient.ts` | 让 `RequestDiagnosticsOptions` 可携带 `signal`，并在 `withRequestDiagnostics()` 中保留 |
| `src/l4-atom/network/fetchSearch.ts` | 透传 caller signal，不改变 endpoint 合同 |
| `src/l2-coordinator/commander/searchRequest.ts` | 新增 request snapshot / snapshot equality / pagination guard 纯函数 |
| `src/l2-coordinator/commander/searchRequest.test.ts` | 红绿覆盖主搜索过期、filter 变化、scope 变化、load more offset 不匹配 |
| `src/l2-coordinator/commander/useSearchCommander.ts` | 管理 active controller/request id；响应写入前校验 snapshot |
| `src/l2-coordinator/data-clerk/stores/useSearchStore.ts` | 保存 active request 元数据、取消状态和错误状态 |

验收要点：

- 新搜索开始时取消旧搜索或让旧响应被丢弃。
- abort 造成的旧请求失败不覆盖新搜索的 loading/results。
- load more 只在 query/filter/scope/scopeChat 和 offset 仍匹配时合并。
- 重复点击“加载更多”不会重复合并同一页。
- 清除搜索会取消 pending debounce 和 pending HTTP。

建议提交：`修搜索请求防旧响应覆盖`。完成 focused tests 后立刻提交；如需远端 CI/协作审查或用户要求，再推送并开 draft PR。

### 任务 2：搜索结果到会话的导航合同

目标：搜索结果点击不再只传 chat 字符串，而是生成可测试的定位目标。

主要文件：

| 文件 | 修改方向 |
| --- | --- |
| `src/l2-coordinator/commander/searchNavigation.ts` | 新增结果到会话/锚点的纯 resolver |
| `src/l2-coordinator/commander/searchNavigation.test.ts` | 覆盖 username 优先、chat fallback、conversation missing、privacy-safe missing message、localId/timestamp 保留 |
| `src/l3-molecule/search/SearchResults.tsx` | onOpenResult 传完整 result，不只传 chat |
| `src/l3-molecule/search/SearchResultsPane.tsx` | active row 继续保留，增加可访问的“当前选中结果”语义时不泄露私密内容 |
| `src/l1-entry/pages/SearchView.tsx` | 委托 L2 resolver 和 chat anchor action；L1 不做业务判断 |

验收要点：

- 结果来源使用 backend username/chat id，不使用展示 label 当请求 id。
- missing conversation 不把私密会话名写进错误文案。
- active result 在跳转前保存，返回搜索后可恢复。
- 结果 row 的可访问名称在 privacyOn 时不包含原文片段。

建议提交：`建立搜索命中定位合同`。该提交应跟随任务 1 的提交序列；如已启用远端审查，可追加到同一 PR，冲突风险较高时再拆成第二个 draft PR。

### 任务 3：聊天历史锚点加载

目标：Workbench 能围绕搜索命中加载上下文，而不是永远加载 offset 0。

主要文件：

| 文件 | 修改方向 |
| --- | --- |
| `src/l4-atom/network/fetchHistory.ts` | 透传 caller signal，复用已有 `time/since/until` 参数 |
| `src/l2-coordinator/commander/chatHistoryAnchor.ts` | 新增锚点请求构造、命中匹配、降级原因纯函数 |
| `src/l2-coordinator/commander/chatHistoryAnchor.test.ts` | 覆盖 localId 精确匹配、timestamp window、无锚点降级、命中缺失 |
| `src/l2-coordinator/commander/useChatCommander.ts` | 新增 `selectAndLoadAtAnchor()` 或等价 action；管理 anchor request id/abort |
| `src/l2-coordinator/data-clerk/stores/useChatStore.ts` | 保存 `anchorStatus`、`activeAnchor`、`highlightedMessageId`、`returnToSearch` |
| `src/l2-coordinator/data-clerk/stores/useChatStore.test.ts` | 覆盖选择会话、定位成功、定位缺失、切换会话清理旧 anchor |

实现方向：

- 有 `timestamp` 时优先请求一个有限时间窗口，例如命中前后若干分钟或按现有后端可接受的 `since/until`。
- 有 `localId` 时用 localId 匹配当前消息列表中的命中。
- 只有 message id 时用 adapted id 匹配。
- 无法构造窗口时退回普通 `loadHistory()`，但状态必须标为 `missing` 或降级，不假装定位成功。
- 不改变当前“加载更早消息”的分页语义；只新增搜索锚点路径。

建议提交：`补聊天命中锚点加载`。提交前必须跑 focused L2/L4 tests；如需远端 CI/协作审查或用户要求，再推送。

### 任务 4：消息列表滚动定位、高亮和返回搜索

目标：命中消息进入列表后，用户能看见自己被带到了哪里，并能回到搜索结果。

主要文件：

| 文件 | 修改方向 |
| --- | --- |
| `src/l3-molecule/chat/MessageList.tsx` | 接收 highlight anchor，找到 message row index，调用 virtualizer scroll，给 row/bubble 传高亮状态 |
| `src/l3-molecule/chat/MessageBubble.tsx` | 渲染 search-hit 高亮 class 和隐私安全 aria 状态 |
| `src/l3-molecule/chat/ChatView.tsx` | 透传 anchor/highlight/return props |
| `src/l3-molecule/chat/transcriptRows.ts` | 提供按 localId/messageId 找 row index 的 helper |
| `src/l3-molecule/chat/transcriptRows.test.ts` | 覆盖 date row 存在时仍能找准 message row |
| `src/l1-entry/pages/WorkbenchView.tsx` | 显示“返回搜索结果”动作和定位降级 banner；事件仍委托 L2 |
| `src/styles/workbench-content.css` | 增加 search-hit 高亮、减少 motion、窄屏稳定样式 |

验收要点：

- 定位成功后命中消息滚动到可见区域并高亮 2 到 4 秒。
- 高亮不改变消息内容，不在 privacyOn 时暴露正文。
- 找不到命中时显示普通语言提示，不让用户误以为当前会话就是搜索结果位置。
- 返回搜索结果后，搜索页面仍保留结果、筛选、范围和 active row。
- prefers-reduced-motion 下不使用强闪烁动画。

建议提交：`补搜索结果高亮和返回路径`。提交前跑 chat component/helper tests；如需远端 CI/协作审查或用户要求，再推送。

### 任务 5：搜索页面结果区和微交互补强

目标：搜索主页面不像嵌入式小面板，筛选和范围解释更清楚。

主要文件：

| 文件 | 修改方向 |
| --- | --- |
| `src/l1-entry/pages/SearchView.tsx` | 让搜索结果区成为页面主滚动区域，状态布局更稳定 |
| `src/l3-molecule/search/GlobalSearch.tsx` | 搜索中、结果数、当前范围保持可见 |
| `src/l3-molecule/search/FilterBar.tsx` | 过滤器 active 状态和键盘语义保持明确 |
| `src/l3-molecule/search/SearchScopeMenu.tsx` | 保留当前会话 unavailable disabled reason；必要时补范围说明 |
| `src/styles/workbench-content.css` 或 `src/styles/layout.css` | 调整 `.search-result-pane` 在搜索页面内的高度和滚动所有权 |

验收要点：

- 空 query 不发请求，显示输入提示。
- invalid/idle、loading、empty、error、results、loading more、cancelled 都有明确状态。
- 结果区域在 1366x900 和 390x844 下不横向溢出。
- 结果列表不是固定 240px 小框，除非页面整体布局明确需要内部滚动且用户任务仍清楚。
- 搜索/过滤解释短而隐私安全，不做大教程。

建议提交：`完善搜索页面结果区状态`。提交前跑 search component tests 和浏览器 smoke；如需远端 CI/协作审查或用户要求，再推送。

### 任务 6：E2E、视觉、隐私和治理证据

目标：用合成数据证明搜索闭环，而不是只证明 `/search` 路由能打开。

主要文件：

| 文件 | 修改方向 |
| --- | --- |
| `e2e/fixtures/core-ready.json` | 对齐 search result 和 history message 的 synthetic local_id/timestamp，或新增专门降级 fixture |
| `e2e/mock-chatlog-server/server.mjs` | 如需慢响应/乱序响应，增加本地合成控制，不使用真实数据 |
| `e2e/specs/core.spec.ts` | 增加搜索关键词、点击结果、Workbench 高亮、返回搜索的闭环测试 |
| `e2e/specs/a11y.spec.ts` | 覆盖键盘搜索、结果 row activation、返回搜索、降级 banner 可访问性 |
| `e2e/specs/privacy.spec.ts` | privacyOn 下搜索片段、会话名、aria 文本和截图扫描 |
| `e2e/specs/visual.spec.ts` | 搜索结果页、命中高亮、降级状态的代表性截图 |
| `scripts/ui-governance.test.mjs` | 防止 SearchResults 回到 Workbench toolbar；可加 message anchor/highlight 类名治理 |

验收要点：

- 当前分支合成数据能稳定复现搜索命中定位。
- 慢旧搜索响应不能覆盖新查询，有自动化测试证据。
- 点击搜索结果后，Workbench 出现目标会话、命中高亮或明确降级提示。
- “返回搜索结果”回到原结果列表并保留 active row。
- privacy scan 不发现私密 query、真实路径、`wxid` 样式非合成泄露、message body 泄露。

建议提交：`补搜索闭环验收证据`。提交说明或任务记录必须列出自动化和浏览器证据；如果本阶段使用 PR，PR 描述也必须同步这些证据。

## 10. 建议文件改动清单

### 10.1 可能新增

| 文件 | 用途 |
| --- | --- |
| `src/l2-coordinator/commander/searchNavigation.ts` | 搜索结果到会话/锚点的纯解析合同 |
| `src/l2-coordinator/commander/searchNavigation.test.ts` | 搜索结果导航合同红绿测试 |
| `src/l2-coordinator/commander/chatHistoryAnchor.ts` | history anchor request、命中匹配、降级原因 helper |
| `src/l2-coordinator/commander/chatHistoryAnchor.test.ts` | 聊天锚点加载红绿测试 |
| `src/l3-molecule/chat/messageAnchorDisplay.ts` | 命中高亮、降级文案、返回搜索文案的隐私安全格式化 |
| `src/l3-molecule/chat/messageAnchorDisplay.test.ts` | 隐私、安全文案和状态测试 |

### 10.2 需要修改

| 文件 | 修改方向 |
| --- | --- |
| `src/l4-atom/network/httpClient.ts` | `RequestDiagnosticsOptions` 保留 caller signal |
| `src/l4-atom/network/fetchSearch.ts` | 支持搜索请求 abort |
| `src/l4-atom/network/fetchHistory.ts` | 支持 history anchor 请求 abort |
| `src/l2-coordinator/commander/searchRequest.ts` | 请求 snapshot、分页 guard、去重/合并规则 |
| `src/l2-coordinator/commander/useSearchCommander.ts` | active request/controller 管理和过期响应丢弃 |
| `src/l2-coordinator/data-clerk/stores/useSearchStore.ts` | 搜索请求、active result、return context 状态 |
| `src/l2-coordinator/commander/useChatCommander.ts` | 搜索锚点打开会话和 history window 加载 |
| `src/l2-coordinator/data-clerk/stores/useChatStore.ts` | anchor/highlight/return 状态 |
| `src/l1-entry/pages/SearchView.tsx` | 结果点击委托锚点导航，不直接 `selectAndLoad(chat, chat)` |
| `src/l1-entry/pages/WorkbenchView.tsx` | 显示返回搜索和定位状态，继续只做事件委托 |
| `src/l3-molecule/search/*` | 搜索结果行、状态、范围/筛选微交互 |
| `src/l3-molecule/chat/ChatView.tsx` | 透传 anchor 状态 |
| `src/l3-molecule/chat/MessageList.tsx` | 虚拟列表定位和高亮 |
| `src/l3-molecule/chat/MessageBubble.tsx` | 命中高亮 class/aria |
| `src/l3-molecule/chat/transcriptRows.ts` | message row 查找 helper |
| `src/styles/workbench-content.css` | 搜索结果区和命中高亮样式 |
| `e2e/fixtures/core-ready.json` | 合成 search/history 命中对齐 |
| `e2e/specs/core.spec.ts`、`a11y.spec.ts`、`privacy.spec.ts`、`visual.spec.ts` | 闭环证据 |
| `scripts/ui-governance.test.mjs` | 防止旧 toolbar 搜索和缺失 anchor 治理回归 |

### 10.3 避免触碰或仅协商触碰

| 文件 | 原因 |
| --- | --- |
| `src-tauri/*` | Step 06 不改 sidecar/Tauri 合同 |
| `src/l1-entry/pages/SetupCenterView.tsx`、`src/l3-molecule/setup/*` | SetupCenter 已由 Step 04 收敛，不属于搜索闭环 |
| `src/l3-molecule/media/*` | Media 未读/新消息跳转后续可复用锚点协议，但本步不补完整 Media 闭环 |
| `src/l3-molecule/semantic/*` | AI semantic search 可参考同一锚点协议，但本步不重构 AI 工作台 |
| `src/l1-entry/routes/index.tsx` | `/search` 已存在；除非需要兼容 route，不应再大改 route map |

## 11. 状态验收矩阵

| 状态 | 搜索页要求 | Workbench 定位要求 |
| --- | --- | --- |
| idle | 不发请求，提示输入关键词 | 无定位 banner |
| invalid | 空白 query 不请求后端 | 不跳转 |
| loading | 显示当前查询搜索中，旧结果按设计保留或明确淡化 | 定位时显示正在打开会话/加载上下文 |
| ready | 结果列表、总数、范围、筛选清楚 | 目标消息高亮，返回搜索可见 |
| empty | 说明没有结果，建议改关键词/范围/筛选 | 不跳转 |
| error | 区分搜索失败、服务/DB 不可用、超时，可重试/清除 | history 加载失败可重试或返回搜索 |
| cancelled | 用户清除/切换后不显示旧错误 | 旧定位被取消，不污染新会话 |
| loading more | 只追加匹配同一 snapshot 的新页 | 不影响已打开会话 |
| stale discarded | 不改变 UI 或只记录安全诊断 | 不出现旧会话高亮 |
| anchor missing | 搜索结果仍 active | 打开会话但显示无法精确定位 |
| privacyOn | 遮蔽 snippet/name，保留数量/时间/结构 | 高亮结构可见，不暴露正文 |

## 12. 可访问性、响应式和视觉验收

- 搜索输入有明确 label，placeholder 不能是唯一可访问名称。
- 当前范围和筛选状态对键盘和屏幕阅读器可识别。
- 结果 row 是键盘可激活控件，focus ring 覆盖实际 target。
- “加载更多”“重试”“清除”“返回搜索结果”满足 target-size 标准。
- 命中高亮不只靠颜色；需要有结构或 aria 状态辅助说明。
- prefers-reduced-motion 下，高亮使用非闪烁的边框/背景变化。
- 390px 左右窄屏下搜索输入、范围、筛选、结果 row、返回动作不横向溢出。
- 1366x900 或 1440 宽度下搜索结果区占据主工作区，不像被塞在小工具栏。
- privacyOn、dark mode 下文字对比、边框和高亮仍清晰。

## 13. 隐私和诊断要求

- 不把原始搜索 query、命中正文、会话显示名、`wxid`、路径、token、API key 写进 URL、日志、诊断事件、截图说明或 PR 正文。
- 诊断事件只记录 endpoint family、状态、耗时、错误类别、correlation id 等安全摘要。
- 搜索结果 privacyOn 时可以显示时间、类型、序号、数量和“已隐藏内容”，不能显示正文片段。
- 返回搜索结果的 label 不能包含原始 query。
- E2E fixture 必须继续使用明确 synthetic 数据，不引入真实聊天内容或真实感私人标识。

## 14. 架构验收

- L1 只做页面布局、hook 调用和事件委托，不解析 search result 的业务细节。
- L2 负责 search request guard、结果导航、chat anchor、错误翻译和状态归一。
- L3 搜索/聊天组件只通过 props 接收数据、状态和 callbacks。
- L4 network atoms 不读取 Zustand，不知道 active search；只支持 raw request 参数、diagnostics 和 signal。
- 不新增第二套搜索 store 或独立 router 状态机。
- AI semantic search、Media 未读跳转等后续模块应复用同一 message anchor 思路，不各自定义不兼容协议。

## 15. 验证命令

实现后至少运行：

| 命令 | 目的 |
| --- | --- |
| `pnpm exec vitest run src/l2-coordinator/commander/searchRequest.test.ts` | 搜索请求 snapshot、分页 guard |
| `pnpm exec vitest run src/l2-coordinator/commander/searchNavigation.test.ts` | 结果到会话/锚点解析 |
| `pnpm exec vitest run src/l2-coordinator/commander/chatHistoryAnchor.test.ts` | history anchor 请求和降级 |
| `pnpm exec vitest run src/l2-coordinator/data-clerk/stores/useSearchStore.test.ts src/l2-coordinator/data-clerk/stores/useChatStore.test.ts` | store 状态 |
| `pnpm exec vitest run src/l3-molecule/chat/transcriptRows.test.ts src/l3-molecule/search/SearchScopeMenu.test.tsx` | message row 查找和搜索微交互 |
| `pnpm exec vitest run src/l4-atom/network/httpClient.test.ts src/l4-atom/network/fetchSearch.test.ts src/l4-atom/network/fetchHistory.test.ts` | signal、搜索 URL、history URL 和 diagnostics 回归；若测试文件尚不存在，本步实现时先补红测 |
| `pnpm exec vitest run scripts/ui-governance.test.mjs` | 搜索/Workbench 治理回归 |
| `pnpm lint` | 静态检查 |
| `pnpm typecheck` | 类型检查 |
| `pnpm test` | 全量单元测试 |
| `pnpm build` | 前端构建 |
| `pnpm verify` | 项目标准验证 |

如果只改前端 React/TS/CSS，不需要默认跑 `cargo test` 或 `pnpm tauri build`。如果触碰 Tauri、CSP、capabilities、native command 或 sidecar 配置，必须补跑 `cd src-tauri && cargo test` 和 `pnpm tauri build`。

## 16. 浏览器和 E2E 检查

| 路由/场景 | 视口 | 重点 |
| --- | --- | --- |
| `/search?codex-smoke=workbench-ready` | 1366x900 / 390x844 | 输入关键词、状态、结果区、筛选、范围 |
| `/search?scope=currentChat&chat=...&codex-smoke=workbench-ready` | 1366x900 / 390x844 | 当前会话范围可用且不误用 display label |
| 点击搜索结果到 `/workbench` | 1366x900 / 390x844 | 正确会话、命中高亮、返回搜索 |
| 慢旧搜索响应 | desktop | 旧响应不能覆盖新 query |
| load more 后切换 query/filter | desktop | 旧分页不能合并 |
| anchor missing 降级 | desktop/narrow | 文案明确、可返回搜索 |
| privacyOn 搜索闭环 | desktop/narrow | snippet/name/content/aria 隐私安全 |

检查项：

- console error count 为 0。
- 无横向 overflow。
- 搜索结果 row 可用键盘打开。
- 返回搜索结果后 active row 仍存在。
- 命中高亮可见但不刺眼。
- privacy scan 通过。
- 失败/降级状态有重试或返回路径。

## 17. 提交、推送和 PR 节奏

这部分是 Step 06 实施要求；PR 是按需动作，不再是默认硬要求：

- 不允许把所有搜索修复攒到最后一次提交。
- 每个任务或每个可验证小单元完成后，先跑 focused tests，再中文短提交。
- 第一段可运行代码完成并通过 focused tests 后，先本地提交并记录验证证据；需要远端 CI/协作审查/发布证据或用户明确要求时，再推送分支并创建 draft PR。
- 后续任务继续以中文短提交推进；如果已经使用 PR，按同一 PR 更新，只有任务文件范围独立且风险不同时才拆成多个 draft PR。
- 每次提交前只 stage 本任务相关文件；如果工作树包含 unrelated changes，必须确认提交范围。
- 文档在 `docs/*` 下被 `.gitignore` 忽略，计划文档或后续文档更新需要 `git add -f`。
- 提交说明、任务记录或 PR 描述必须按问题 ID 写清：P1-04、P1-05 覆盖范围，未覆盖范围，验证命令，浏览器视口，隐私检查和剩余风险。

建议提交拆分：

| 顺序 | 内容 | 中文提交名示例 | 远端审查行为 |
| --- | --- | --- | --- |
| 1 | 搜索请求 snapshot、abort、stale guard | `修搜索请求防旧响应覆盖` | 默认本地提交；需要远端 CI/协作时推送并开 draft PR |
| 2 | 搜索结果锚点导航合同 | `建立搜索命中定位合同` | 如已有 PR，更新 PR 描述；否则记录到任务/最终报告 |
| 3 | chat history anchor 加载 | `补聊天命中锚点加载` | 按需推送，补 focused tests 证据 |
| 4 | MessageList 高亮和返回搜索 | `补搜索结果高亮和返回路径` | 按需推送，补 UI/E2E 证据 |
| 5 | 搜索页面结果区和证据 | `补搜索闭环验收证据` | 按需准备 review；无 PR 时写入任务记录/最终报告 |

## 18. 风险和缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 后端 history window 对 `since/until` 支持与预期不同 | 无法精确定位 | 先写 adapter/commander 降级；E2E 覆盖 missing anchor；不改后端合同 |
| search result localId 与 history localId 不一致 | 高亮失败 | 使用 synthetic fixture 对齐；真实数据中 fallback 到 timestamp/message id |
| AbortError 被当作普通错误 | 用户看到无意义失败 | L2 判断 active request；旧请求 abort 不写 error |
| URL 泄露搜索 query | 隐私风险 | 默认用 store/location state 保存 return context，不把 query/snippet 写入 URL |
| 虚拟列表滚动定位不稳定 | 命中不在视口 | 使用 row helper 找 index，virtualizer scrollToIndex 后通过 DOM/data attribute 验证 |
| 高亮动画干扰阅读 | 视觉问题 | 限时 2 到 4 秒，支持 reduced motion，颜色/边框克制 |
| 与 AI semantic search 形成两套跳转 | 后续维护成本 | 把 message anchor helper 设计为通用，后续 AI/Media 可复用 |
| E2E 慢响应测试不稳定 | CI flaky | 使用 mock server 可控延迟和 correlation id，不依赖真实时间竞态 |

## 19. 完成定义

Step 06 只有在以下条件都满足时才算完成：

- 搜索请求和 load more 有 request snapshot、abort 或过期响应丢弃测试。
- 快速连续输入、切换筛选、切换范围不会让旧结果覆盖新结果。
- 搜索结果点击生成可测试的 `SearchHitAnchor`，并能解析到正确 conversation。
- Workbench 能围绕命中加载上下文，成功时滚动并高亮命中消息。
- 不能精确定位时有明确降级说明，且用户能返回搜索结果。
- 搜索结果 active row、query/filter/scope 状态在返回后仍可理解。
- privacyOn 下搜索结果、命中高亮、返回路径、aria 文本不泄露私密内容。
- `/search` 桌面和窄屏都可完成任务，无横向溢出。
- E2E 覆盖搜索、点击、定位/降级、返回和隐私模式。
- `pnpm verify` 通过；若改 Tauri/Rust，再通过 Rust/Tauri 验证。
- 已按任务小步中文提交，并记录验证证据；如果用户要求或需要远端 CI/协作审查/发布治理，已推送并创建或更新 PR。

## 20. 后续步骤衔接

Step 06 完成后，后续步骤可以复用本步的 message anchor 协议：

- Media 未读/新消息跳转到会话消息。
- AI semantic search 结果跳转到证据消息。
- Graph 节点/边/事件详情跳转相关聊天上下文。
- SNS 通知或评论来源跳转关联动态/消息。

不要把 Step 06 的搜索锚点实现写死成 search-only 私有协议；它应是后续任务闭环的通用前端定位基础。

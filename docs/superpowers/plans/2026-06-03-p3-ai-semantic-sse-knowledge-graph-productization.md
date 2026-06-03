# P3: AI 语义索引、SSE 问答和知识图谱模块产品化规划

> 日期：2026-06-03
> 状态：规划完成，等待实施拆分
> 阶段定位：承接 P2-D、P4-E、P5-A/B 已完成成果，对 AI/Graph 做完整产品化整合
> 首个建议实施子任务：P3-0 Contract And State Foundation

## 1. 结论摘要

P3 不是从零补一个 AI 或图谱模块。当前仓库已经完成了大量底层接入：

- P2-D 已接入 semantic config/status/actions/search/topics/profiles/QA/SSE，以及 graph status/query/timeline/visualize/rebuild/pause/resume。
- P4-E 已补 semantic index preview，以及 graph config/business ingest/event ingest/graph QA residuals。
- P5-A/B 已补 synthetic fixture、mock backend、Playwright E2E、visual、a11y、privacy evidence，其中覆盖 AI preview 和 graph visualization 基线路径。

因此 P3 的核心目标是：把这些能力从“可调用、可证明”提升到“可理解、可操作、可长期使用”的 Apple-like 本地桌面体验。最高优先级是 UI/交互与状态表达，其次是 SSE 问答证据链、图谱 drill-down、隐私/诊断边界和可重复测试。

## 2. 本轮使用的技能与依据

本规划使用并参考了以下技能或检查框架：

- `using-superpowers`：确认技能使用流程。
- `planning-with-files`：将发现写入 `findings.md`，阶段状态写入 `task_plan.md` / `progress.md`。
- `writing-plans`：按可执行任务、文件范围、测试门禁撰写计划。
- `brainstorming`：用于拆分 AI/Graph 产品化范围；用户已明确要求直接规划，因此不单独等待方案确认。
- `frontend-design`、`ui-acceptance`、`ui-ux-pro-max`：用于现代 UI、Apple-like、可访问、数据密集工具界面标准。
- `sidecar-integration`：用于真实 `chatlog_alpha` endpoint、SSE、Tauri/local sidecar 边界。
- `app-productization`、`release-gate`：用于把功能转成可发布桌面 app 的验收矩阵。
- `frontend-code-review`：作为当前 semantic/graph 代码的风险审计视角，而不是最终 review 输出格式。
- `verification-before-completion`：用于定义每阶段完成前必须跑的命令和证据。

## 3. 已阅读和引用的关键资料

### 当前产品与计划文档

- `task_plan.md`
- `findings.md`
- `progress.md`
- `docs/ui-functional-audit-and-redesign-plan.md`
- `docs/总体开发规划.md`
- `开发指南.md`
- `.specify/memory/constitution.md`
- `specs/000-productization/constitution.md`
- `specs/000-productization/spec.md`
- `specs/000-productization/plan.md`
- `specs/000-productization/tasks.md`
- `specs/000-productization/acceptance-checklist.md`
- `specs/001-ready-desktop-app/spec.md`
- `specs/001-ready-desktop-app/plan.md`
- `specs/001-ready-desktop-app/data-model.md`
- `specs/001-ready-desktop-app/release-evidence.md`
- `specs/002-advanced-capabilities/capability-matrix.md`
- `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`
- `specs/002-advanced-capabilities/e2e-matrix.md`

### 既有阶段计划

- `docs/Sprint3-AI聊天分析详细规划.md`
- `docs/superpowers/plans/2026-05-28-sprint4-knowledge-graph.md`
- `docs/superpowers/specs/2026-05-28-sprint4-knowledge-graph-design.md`
- `docs/superpowers/plans/2026-05-31-p2-d-ai-graph-containment.md`
- `docs/superpowers/plans/2026-05-31-p2-d-comprehensive-remediation.md`
- `docs/superpowers/plans/2026-06-03-p4-e-hook-mcp-semantic-preview-graph-residuals.md`
- `docs/superpowers/plans/2026-06-03-p5-a-b-contract-fixtures-e2e-visual-a11y.md`

### 原始后端资料

- `E:\OneDrive - Default Directory\chatlog_alpha\README.md`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\http\route.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\http\semantic_qa.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\http\graph.go`
- `E:\OneDrive - Default Directory\chatlog_alpha\internal\chatlog\http\static\index.htm`

## 4. 当前真实基线

### 4.1 已经做对的部分

- L4 semantic adapters 已按真实后端扁平 snake_case config、`has_api_key` / `has_deepseek_api_key`、index flags、search rerank metadata、topics/profiles、QA payload 做了适配。
- `streamQA.ts` 已用 `fetch` + `ReadableStream` 读取 POST SSE，并通过 `semanticStreamParser.ts` 解析 `event: delta`、`event: done`、`event: error`。
- `buildSemanticQARequestPayload()` 已去掉 UI-only `scope`，按后端需要发送 `query/chat/chats/window/entity_override/retrieval_depth/source_limit/top_n/history`。
- Graph baseline 已覆盖 status/query/timeline/visualize/actions，并且 GraphCanvas 是 lazy mount，不在默认路径加载 heavy canvas。
- Graph residuals 已有 config、business/event ingest、graph QA fetcher、store、commander、advanced panel。
- Semantic preview 已默认隐藏 raw content、identity、store path 和 vector store path，方向正确。
- `tsconfig.json` 已覆盖 `@l2/*`、`@l3/*`、`@l4/*`，P0/P1 留下的 `@l2` alias 风险已不再是 P3 blocker，但实施前仍需要 typecheck 确认。

### 4.2 仍然存在的主要问题

#### Semantic/AI 状态与契约问题

- `src/l2-coordinator/data-clerk/stores/useAiStore.ts` 的 `setError` 在清空错误时可能把 `phase` 置为 `undefined`，状态机不够硬。
- `src/l2-coordinator/api-docs/semantic.ts` 仍混有旧字段和新字段，例如旧 `provider`、旧 `{config}` 思路和当前 view model 字段并存，容易导致后续 UI 继续写错契约。
- 当前 `SemanticIndexStatus` 未完整消费后端新增状态字段：`indexed_count`、`entity_count`、`chunk_count`、`started_at`、`processing_rate_per_minute`、`estimated_seconds_left`、`last_incremental_*`、`last_rerank_*`。
- 配置保存后应 refetch 后端 config，以确认 credential flags 和 normalize 后默认值；当前规划中需要把这点设为硬要求。

#### SSE QA 问答问题

- QA message model 只保存 `content`，没有保存 final `evidence`、`reason`、`debug`、rerank metadata、entity candidates、source count、window/depth。
- 停止生成与 abort 语义需要重新审计：UI 必须区分用户停止、网络失败、后端 error event、空答案和正常完成。
- 问答缺少 Apple-like 的 source scope bar、证据抽屉、复制回答、重试、候选实体确认、引用跳转、overload/429 恢复路径。
- 诊断必须只记录 endpoint family/status/duration/error kind，不记录 query、answer、evidence、history、chat content。

#### Semantic UI 问题

- `src/l3-molecule/semantic/AiPanel.tsx`、`SetupWizard.tsx`、`QAPanel.tsx`、`QAMessage.tsx`、`QAInput.tsx`、`SemanticSearch.tsx` 仍有较多 inline style 和模块根部状态/commander 耦合。
- `SetupWizard.tsx` 仍偏旧式 provider card 表单，不能完整表达 embedding/rerank/chat 三类 provider、credential saved flags、local Ollama base URL、GLM/DeepSeek API key、retrieval/index advanced 参数。
- 语义搜索缺少建议、结果解释、rerank 状态、无结果建议、可恢复空状态、结果跳转后的明确上下文反馈。
- Topics/Profile 目前更像信息块拼装，缺少高质量分析视图：趋势、分布、摘要、截断状态、数据来源、隐私遮罩和移动宽度布局。

#### Graph 状态与交互问题

- `GraphStatusView` 未完整消费后端 `history_queued`、`enqueue_running`、`workers`、`enqueue_workers`、`started_at`、`processing_rate_per_minute`、`estimated_seconds_left`、`last_updated_at`。
- Graph 当前跨模块联动偏浅：search/chat 到 graph 多为 focus/pulse，缺少可靠的 graph-to-chat、chat-to-graph、node detail、edge explanation、timeline drill-down。
- `GraphAdvancedPanel.tsx` 仍偏 developer/debug 面板，部分标签是英文，风险操作和普通配置没有足够清晰的层级。
- Graph QA 当前是 summary/redaction-first 的 P4-E residual surface。P3 要设计可用的 QA 答案面板，但必须受 privacy mode、copy/export 和 diagnostics 约束。
- Network graph 可视化可访问性天然弱，不能作为唯一信息载体。必须保留 list/table、timeline、detail inspector 和 keyboard path。

#### 旧文档过时点

- `docs/Sprint3-AI聊天分析详细规划.md` 中 `data: {"type":"token"}` 的 SSE 假设已过时；真实后端是 `event: delta/done/error`。
- 早期 Sprint 3 把 AI 塞入 Dashboard 右侧面板，不适合当前 Workbench 模块化结构。
- 早期 Sprint 4 把 3D floating graph 作为核心，不符合当前 P2/P5 对 lazy visualization、可访问替代和数据密集工具界面的要求。
- 原始 `chatlog_alpha` static page 工作流更完整，但 preview tooltip 会展示 content 摘要，不能照搬到 chatlogUI。

## 5. P3 产品目标

### 5.1 总目标

让 AI/Graph 成为一个完整的本地智能分析工作台：

- 用户能清楚知道 semantic provider 是否配置好。
- 用户能清楚知道索引是否可用、正在做什么、还需多久、失败在哪里。
- 用户能用 SSE 问答获得可停止、可重试、可复制、可查证据的回答。
- 用户能用语义搜索、话题、画像、预览理解聊天数据，而不是只看到 raw API 结果。
- 用户能用知识图谱查看实体、关系、事件、事实、时间演变、证据摘要和可选网络图。
- 所有内容在 privacy mode 下可安全截图、测试、诊断和演示。

### 5.2 UI 目标

采用现代 macOS/Apple-like 的本地工具设计，而不是 landing page 或装饰型 AI 风格：

- 稳定的信息架构：顶部 context bar、左侧/中部主内容、右侧 inspector 或 bottom sheet。
- 视觉克制：高可读 neutral surface、清晰 separator、少量系统蓝/绿色状态色，不使用大面积渐变或装饰 blur。
- 控件符合预期：segmented controls、switch、checkbox、input、stepper、slider、menu、toolbar icon button、sheet/drawer。
- 单屏单主操作：配置页以“测试连接/保存配置/开始索引”为主线；问答页以“提问/停止/重试”为主线；图谱页以“筛选/加载可视化/查看详情”为主线。
- 数据密集但可扫描：状态卡、表格、时间线、证据列表、详情面板，而不是大卡片堆叠。
- 390px 窄宽可用：不出现水平滚动、按钮文字不挤压、时间线和详情面板转为 sheet。
- 所有 icon-only action 有 aria-label 和 tooltip；所有按钮最小命中区不低于 32px，重要触控路径建议 44px。

### 5.3 后端边界目标

- 不改变 `chatlog_alpha` 真实 API 契约，除非单独提出 sidecar contract change。
- 所有 HTTP/SSE 调用仍走 L4 network atoms，再由 L2 commander/store/view model 编排，L3 leaf 不直接 fetch。
- 语义和图谱失败不阻塞核心聊天、搜索、统计和设置。
- 不自动全量重建索引，不自动提交 graph ingest，不自动泄露 raw content。

## 6. 非目标

P3 不做以下事情：

- 不重写 `chatlog_alpha` 后端逻辑。
- 不把 graph/message ingest 做成 raw JSON 编辑器。
- 不提供 raw vector export、raw graph evidence export、raw QA transcript export。
- 不把 3D graph 作为唯一或默认的信息表达。
- 不引入远程 telemetry。
- 不把 API runner 扩展成任意远程 HTTP client。
- 不为了 UI 漂亮牺牲隐私模式和可访问替代。

## 7. 推荐实施顺序

P3 应拆成 6 个子阶段。建议先实施 P3-0 和 P3-A，因为 UI 改造依赖更完整的状态机和配置契约。

1. P3-0 Contract And State Foundation
2. P3-A Semantic Setup And Index Center
3. P3-B SSE QA With Evidence
4. P3-C Semantic Discovery And Preview
5. P3-D Knowledge Graph Workbench
6. P3-E Privacy, Diagnostics, E2E And Evidence

## 8. P3-0: Contract And State Foundation

### 8.1 目的

先把 semantic/graph 的真实状态、类型、store、view model 和 fixture 稳住。否则后续 UI 会继续基于不完整字段和临时状态做复杂交互。

### 8.2 主要文件

- `src/l2-coordinator/api-docs/semantic.ts`
- `src/l2-coordinator/api-docs/graph.ts`
- `src/l2-coordinator/data-clerk/stores/useAiStore.ts`
- `src/l2-coordinator/data-clerk/stores/useGraphStore.ts`
- `src/l2-coordinator/commander/useAiCommander.ts`
- `src/l2-coordinator/commander/useGraphCommander.ts`
- `src/l2-coordinator/commander/semanticViewModel.ts`
- `src/l2-coordinator/commander/graphViewModel.ts`
- `src/l4-atom/network/semanticAdapters.ts`
- `src/l4-atom/network/graphAdapters.ts`
- `src/l4-atom/network/streamQA.ts`
- `src/l4-atom/network/semanticStreamParser.ts`
- `e2e/fixtures/core-ready.json`
- `e2e/fixtures/advanced-capabilities.json`

### 8.3 任务清单

- [ ] 扩展 semantic config 类型，去掉旧单 provider 的主路径。
  - 保留兼容字段只作为迁移层，不再作为 UI 新开发依据。
  - 明确 embedding/rerank/chat 三组 provider。
  - 明确 credential saved flags，不保存也不显示 raw key。

- [ ] 扩展 semantic index status adapter。
  - 新增 `indexedCount`、`entityCount`、`chunkCount`。
  - 新增 `startedAt`、`processingRatePerMinute`、`estimatedSecondsLeft`。
  - 新增 `lastIncrementalAt`、`lastIncrementalAdded`、`lastIncrementalError`。
  - 新增 `lastRerankAt`、`lastRerankApplied`、`lastRerankError`。
  - 派生 `coverageSummary`、`etaLabel`、`rateLabel`、`lastActivityLabel`。

- [ ] 修复 `useAiStore.setError`。
  - 清空错误不能把 `phase` 置为 `undefined`。
  - error phase 必须保留 previous recoverable phase，或由 view model 派生。

- [ ] 扩展 QA message model。
  - assistant message 需要保存 `evidence`、`reason`、`metadata`、`sourceCount`、`window`、`depth`、`rerankTried`、`rerankApplied`、`rerankError`。
  - 用户消息保存 query 只存在 UI state，不进入 diagnostics/export。
  - 每次流有 `streamId`，done/error/abort 只能更新当前 stream，避免过期回调污染状态。

- [ ] 加固 `streamQA` 和 commander abort 语义。
  - 用户 stop -> `stopped`。
  - 网络失败 -> `failed`。
  - 后端 `event:error` -> `failed`。
  - done answer 为空 -> `empty`。
  - abort 后不再把状态改回 `failed`。

- [ ] 扩展 graph status adapter。
  - 新增 `historyQueued`、`enqueueRunning`、`workers`、`enqueueWorkers`。
  - 新增 `startedAt`、`processingRatePerMinute`、`estimatedSecondsLeft`、`lastUpdatedAt`。
  - 派生 `etaLabel`、`rateLabel`、`queueLabel`、`workerLabel`。

- [ ] 扩展 graph query/timeline/visualize view model。
  - 将 entities、relations、events、facts 统一转为可渲染 detail rows。
  - 保留 edge status、confidence、support_score、verified、conflict_group、valid_from/valid_to、evidence_count。
  - 对 privacy mode 生成 masked label，不能把 raw identity 放进 title/aria-label。

- [ ] 更新 synthetic fixtures。
  - semantic ready/running/paused/error/unconfigured 四类状态。
  - semantic QA stream done payload 包含 evidence/reason/rerank/debug safe fields。
  - graph running/paused/error/empty/oversized/loaded 状态。
  - graph query 含 entity/relation/event/fact 和 verified/conflict fields。

### 8.4 P3-0 验收标准

- `semanticAdapters.test.ts` 覆盖真实 README/handler 字段，不只覆盖旧字段。
- `graphAdapters.test.ts` 覆盖 ETA、rate、workers、queue、verified/conflict fields。
- `streamQA.test.ts` 覆盖 stop、timeout、done、error、unknown event、split chunks。
- `semanticViewModel.test.ts` 能区分 setup required、index running、paused、ready、failed、qa stopped、qa failed、qa empty。
- `graphViewModel.test.ts` 能区分 unavailable、running、paused、ready、empty、oversized、malformed、failed。
- `pnpm typecheck` 通过，证明 `@l2/*` alias 和新增类型路径没有回归。

### 8.5 P3-0 建议验证命令

```powershell
pnpm test src/l4-atom/network/semanticAdapters.test.ts src/l4-atom/network/streamQA.test.ts src/l4-atom/network/graphAdapters.test.ts
pnpm test src/l2-coordinator/commander/semanticViewModel.test.ts src/l2-coordinator/commander/graphViewModel.test.ts
pnpm typecheck
```

## 9. P3-A: Semantic Setup And Index Center

### 9.1 目的

把旧 `SetupWizard` 改成真正可用的 AI 设置与索引中心。这个阶段 UI 优先级最高，因为用户必须先配置 provider、测试连接、保存配置、构建索引，才谈得上搜索、问答和图谱。

### 9.2 目标用户流程

1. 打开 AI 模块或设置页的“智能分析”区域。
2. 看见 semantic readiness summary：Embedding、Rerank、Chat、Credential、Index。
3. 选择或编辑 provider：
   - Embedding：Ollama / GLM，模型、维度、本地 base URL。
   - Rerank：Ollama / GLM，模型、是否启用由后端固定能力表达，不让用户误以为可随意关核心能力。
   - Chat：GLM / DeepSeek / Ollama，模型、base URL、max tokens、temperature、thinking。
4. 输入 API key 时只显示临时输入，不回显已保存值。
5. 点击“测试连接”，测试 draft 配置，不保存、不启动索引。
6. 测试通过后点击“保存配置”，保存后立即 refetch config，显示 saved credential flags。
7. 根据状态点击“开始构建索引 / 继续索引 / 暂停 / 从头重建 / 删除索引”。
8. 索引过程显示进度、已处理、失败、待处理、实体数、chunk 数、速率、预计剩余、最近增量、最近 rerank。

### 9.3 UI 结构

建议将 `SetupWizard` 逐步替换为：

- `SemanticSetupCenter.tsx`
- `SemanticProviderSection.tsx`
- `SemanticCredentialField.tsx`
- `SemanticIndexStatusPanel.tsx`
- `SemanticIndexActionBar.tsx`
- `SemanticAdvancedConfigSheet.tsx`

视觉结构：

- 顶部：状态摘要条。
- 中部：三列或三段 provider sections，窄屏转为纵向。
- 底部：索引中心，包含进度与操作。
- 右侧或 bottom sheet：高级参数。

### 9.4 具体任务

- [ ] 替换旧 provider card 为三组 provider section。
- [ ] 所有表单字段必须有 visible label，不能只用 placeholder。
- [ ] Credential field 显示：
  - `已保存`
  - `未保存`
  - `本次将更新`
  - `留空将保留已保存 key`
- [ ] Test connection 必须返回 field-level 或 section-level 错误。
- [ ] Save config 后必须 refetch config。
- [ ] Index action 必须 confirmation-gated：
  - clear index
  - rebuild reset
  - high worker count
- [ ] Progress UI 必须展示：
  - processed / pending / failed / total
  - progress percent
  - ETA
  - rate
  - indexed/entity/chunk counts
  - last incremental
  - last rerank
- [ ] Privacy mode 下隐藏 base URL 中的本地路径或敏感主机细节，只保留 provider/status/count。
- [ ] 删除 inline style，使用 `src/styles/layout.css` 或更合适的 feature CSS class。

### 9.5 验收

- 未配置时，AI 模块第一屏不报错，不空白，不误导用户“可直接问答”。
- 测试失败不会进入下一步或保存配置。
- 保存配置不会展示 raw key。
- 索引 running/paused/error/ready 四态都有明确操作和恢复路径。
- 390px 宽度下表单不横向溢出，按钮不挤压。

## 10. P3-B: SSE QA With Evidence

### 10.1 目的

把当前“能流式显示文本”的 QA，升级为真正可用的证据驱动问答体验。

### 10.2 目标用户流程

1. 用户选择提问范围：
   - 当前会话
   - 多个最近会话
   - 全部最近会话
   - 时间窗
   - 检索深度 standard/deep/wide
2. 用户输入问题，点击发送。
3. UI 显示连接中、流式生成、停止按钮。
4. 用户可停止，停止后状态为“已停止”，保留已生成内容。
5. 完成后显示：
   - answer
   - source count
   - evidence count
   - window/depth
   - rerank applied/tried/error
   - reason 或 empty reason
6. 用户可打开证据抽屉。
7. 用户可复制回答，privacy mode 下复制 redacted answer 或禁用复制。
8. 后端 overload/429/timeout 显示可理解错误和 retry。

### 10.3 UI 组件建议

- `SemanticQASourceBar.tsx`
- `SemanticQAThread.tsx`
- `SemanticQAMessage.tsx`
- `SemanticQAEvidenceDrawer.tsx`
- `SemanticQAEvidenceRow.tsx`
- `SemanticEntityCandidateList.tsx`
- `SemanticQAStatusBar.tsx`
- `SemanticQAComposer.tsx`

### 10.4 具体任务

- [ ] QA composer 改为 textarea 或可多行输入，Enter/Shift+Enter 行为明确。
- [ ] Stop button 使用停止图标和文本，streaming 时唯一主操作。
- [ ] Assistant message 支持：
  - copy answer
  - retry same question
  - open evidence
  - show answer metadata
- [ ] Evidence drawer 支持：
  - masked chat/sender/content when privacy on
  - time
  - score/relevance
  - seq/local id
  - jump to chat result callback
  - entity candidate selection
- [ ] Markdown rendering 继续使用安全 segment renderer，不引入 `dangerouslySetInnerHTML`。
- [ ] Unknown SSE event 不展示给用户，但可计入 redacted diagnostics count。
- [ ] 空 evidence 与空 answer 要给出原因，不显示“成功但没内容”。
- [ ] QA history 限制长度，切换 scope/chat 时清楚提示 history 是否延续。

### 10.5 验收

- SSE done payload 的 evidence 能在 UI 中安全显示或遮罩。
- Stop 不会变成 failed。
- Retry 不会重复提交旧 stream callback。
- 后端 error event、HTTP error、network error、timeout 文案不同。
- Diagnostics/export 不含 query、answer、evidence、history、raw sender/talker。

## 11. P3-C: Semantic Discovery And Preview

### 11.1 目的

把语义搜索、主题、画像、索引预览统一成“发现与解释”能力，而不是四个孤立小面板。

### 11.2 Semantic Search

- [ ] 输入框提供 debounced search。
- [ ] 支持空 query 示例和最近搜索建议。
- [ ] No results 要给建议，例如扩大时间窗、切换全局范围、降低阈值、先检查索引状态。
- [ ] 结果展示 relevance score、rerank status、chat、sender、time、snippet。
- [ ] 点击结果跳转到聊天，并在聊天里定位或高亮对应 seq/local id。
- [ ] 结果列表超过阈值时使用 virtualization 或分页。
- [ ] Privacy mode 下隐藏 chat/sender/snippet，但保留 score/time/status。

### 11.3 Topics

- [ ] 显示 window、count、truncated、summary/summary_error。
- [ ] Daily trend 用简洁 line/bar 或表格替代，避免只给 chips。
- [ ] Topic list 显示 count 和 keywords。
- [ ] summary error 不应吞掉本地统计结果。
- [ ] 截断时提示“只分析前 N 条”。

### 11.4 Profiles

- [ ] 显示 sender profile rows、message count、top keywords。
- [ ] Type distribution 用表格或条形图展示。
- [ ] summary 与本地统计分开，避免 LLM 摘要失败导致整个画像失败。
- [ ] 支持从 profile row 设置 QA entity override。
- [ ] Privacy mode 下 senderName、keywords、summary 遮罩。

### 11.5 Semantic Preview

- [ ] 保留 P4-E 的 privacy-safe 方向：不显示 `store_path`、raw `content`、raw identity、talker/sender/user IDs、vector store path。
- [ ] 提供 kind、model、dimension、total、groups、outliers、coordinate summary。
- [ ] 可以展示 2D/3D projection，但必须有表格替代。
- [ ] Pagination、kind filter、session selector 要和 index status 联动。
- [ ] 不添加 raw vector export。

### 11.6 验收

- Search/topics/profiles/preview 都有 loading/empty/error/success/retry。
- 所有分析面板在未配置、索引 paused、索引 error 时显示正确 recovery path。
- `pnpm e2e` 增加 semantic search no-results、QA evidence、preview redaction 路径。

## 12. P3-D: Knowledge Graph Workbench

### 12.1 目的

把当前 graph 模块从“有 canvas 和 advanced panel”升级为可解释、可导航、可访问的知识图谱工作台。

### 12.2 信息架构

建议 Graph 模块结构：

- 顶部 status/context bar
  - ready/running/paused/error
  - entities/relations/events/facts/sources
  - pending/processing/processed/failed
  - ETA/rate/workers
- 筛选区
  - keyword
  - window
  - limit
  - entity/relation filter if supported
- 主内容
  - `列表`：entities/relations/events/facts
  - `时间线`：events/facts/relations by time
  - `可视化`：explicit lazy graph canvas
  - `问答`：graph QA
  - `高级`：config/ingest/rebuild
- 详情 inspector
  - node detail
  - edge detail
  - timeline entry detail
  - evidence summary
  - jump actions

### 12.3 Graph Status

- [ ] 展示后端完整状态：
  - `history_queued`
  - `enqueue_running`
  - `workers`
  - `enqueue_workers`
  - `source_count`
  - `pending`
  - `processing`
  - `processed`
  - `failed`
  - `progress_pct`
  - `started_at`
  - `processing_rate_per_minute`
  - `estimated_seconds_left`
  - `last_updated_at`
  - `last_error`
- [ ] Pause/resume 只说明控制 graph extraction queue，不影响 semantic vector index。
- [ ] Rebuild reset 必须有明确说明和 confirmation。

### 12.4 List/Timeline/Detail

- [ ] `GraphFallbackTable` 升级为分组列表，不只混排 node/edge/timeline。
- [ ] Relations 展示 subject、predicate、object、status、confidence、support_score、verified、conflict_group、valid_from/valid_to、evidence_count。
- [ ] Facts 展示 statement/canonical_statement、change_type、status、verified、support_score、conflict_group。
- [ ] Events 展示 title/event_type/actors/targets/time/source summary。
- [ ] Timeline 支持 keyboard select、detail inspector、jump to source if available。
- [ ] 所有 raw private labels 在 privacy mode 下遮罩。

### 12.5 Visualization

- [ ] 保持 lazy mount，不默认加载 GraphCanvas。
- [ ] Network graph 不作为唯一表达；列表和时间线必须完整。
- [ ] Canvas oversize 时提示缩小 limit/filter，而不是卡死。
- [ ] Node click 打开 detail inspector。
- [ ] Edge click 打开 relation explanation。
- [ ] Legend 说明 node type、edge status、confidence/evidence count。
- [ ] Tooltip 不泄露 privacy mode 下的 identity。
- [ ] 390px 下 canvas control bar 可换行，按钮不小于 32px。

### 12.6 Graph QA

- [ ] Graph QA 从 advanced/debug 区移到 Graph 工作台主 tab 或 inspector action。
- [ ] 支持 query/window/start/end。
- [ ] 正常模式可显示 answer；privacy mode 下 answer 隐藏或 summary-only。
- [ ] Evidence 只显示 counts、type、time、source summary，默认不显示 raw evidence text。
- [ ] Copy/export 按 privacy mode 禁用或 redacted。
- [ ] Diagnostics 不记录 graph query、answer、evidence、ingest content。

### 12.7 Graph Advanced

- [ ] 本地化所有英文标签。
- [ ] Config 与 ingest 分区，避免把高风险写入操作和普通状态混在一起。
- [ ] Workers 设置给出性能/费用提示，默认低并发。
- [ ] Business/event ingest 保持 structured form 和 confirmation。
- [ ] Message ingest visible UI 继续 deferred，除非另行证明 safe structured form。
- [ ] Ingest 后只显示 count/id count/status，不显示 raw content。

### 12.8 Cross-Linking

- [ ] Semantic search result -> open chat and optionally focus graph entity.
- [ ] QA evidence -> open chat at message/time.
- [ ] Profile sender -> set QA entity override and graph filter.
- [ ] Graph node -> search related messages.
- [ ] Graph edge/fact/event -> show evidence summary and open related chat if safe.
- [ ] All cross-links must no-op safely when target data is unavailable.

### 12.9 验收

- Graph ready/running/paused/error/empty/oversized/malformed 都有 UI。
- 不点击可视化时 `canvas` 数量为 0。
- 点击可视化后 canvas 非空，桌面和 390px 有稳定尺寸。
- Keyboard 用户可通过列表/时间线/详情完成核心图谱浏览。
- Privacy mode 下 graph labels、QA answer/evidence、ingest content 不泄露。

## 13. P3-E: Architecture, Privacy, Diagnostics And E2E

### 13.1 架构收束

- [ ] L3 leaf 不直接 import `@l4/network`、`fetch`、`EventSource`、`WebSocket`、`axios`。
- [ ] L3 leaf 不直接 import L2 store/commander，除非是明确记录的 module-root shell。
- [ ] 将 `AiPanel.tsx` 和 `GraphModule.tsx` 标记为过渡 shell，逐步把 leaf 拆成 props-driven views。
- [ ] L4 不 import L2。
- [ ] `@l2/*` alias 继续通过 typecheck 验证。

### 13.2 Privacy

- [ ] Semantic:
  - 不记录 raw query、answer、evidence、history、message content、sender/talker。
  - Preview 不显示 raw content/store path/vector path。
  - Copy/export 在 privacy mode 下 redacted 或 disabled。
- [ ] Graph:
  - 不记录 graph query、answer、evidence、ingest content、metadata、participants。
  - Node/edge/timeline title/aria-label 在 privacy mode 下也遮罩。
- [ ] Diagnostics:
  - 只记录 endpoint family、method、status、duration、errorKind、retryable、correlationId、safe recovery hint。

### 13.3 E2E/fixture

新增或扩展 P5-A/B 矩阵：

- semantic setup unconfigured -> test failed -> save success -> refetch credential flags。
- semantic index running -> progress/ETA/rate shown。
- semantic index paused -> resume action visible。
- semantic index error -> last error and rebuild path visible。
- QA streaming -> stop -> stopped, not failed。
- QA done -> evidence drawer opens, privacy redaction holds。
- QA backend error -> retry shown。
- Search no results -> suggestions shown。
- Topics summary error -> local stats still render。
- Graph running -> ETA/rate/workers visible。
- Graph list/timeline/detail keyboard path。
- Graph visualization explicit lazy mount and pixel nonblank check。
- Graph QA answer privacy behavior。
- Graph advanced ingest confirmation and summary-only output。

### 13.4 Browser acceptance

必须覆盖：

- Desktop 1440px。
- Narrow 390px。
- Privacy off/on。
- `/workbench?codex-smoke=workbench-ready`。
- AI module setup/search/QA/preview。
- Graph module list/timeline/visualize/advanced/QA。

## 14. 文件级变更建议

### 14.1 Semantic

建议新增：

- `src/l3-molecule/semantic/SemanticSetupCenter.tsx`
- `src/l3-molecule/semantic/SemanticProviderSection.tsx`
- `src/l3-molecule/semantic/SemanticCredentialField.tsx`
- `src/l3-molecule/semantic/SemanticIndexStatusPanel.tsx`
- `src/l3-molecule/semantic/SemanticQASourceBar.tsx`
- `src/l3-molecule/semantic/SemanticQAEvidenceDrawer.tsx`
- `src/l3-molecule/semantic/SemanticQAEvidenceRow.tsx`
- `src/l3-molecule/semantic/SemanticAnalysisPanel.tsx`

建议修改：

- `src/l3-molecule/semantic/AiPanel.tsx`
- `src/l3-molecule/semantic/SetupWizard.tsx`
- `src/l3-molecule/semantic/QAPanel.tsx`
- `src/l3-molecule/semantic/QAMessage.tsx`
- `src/l3-molecule/semantic/QAInput.tsx`
- `src/l3-molecule/semantic/SemanticSearch.tsx`
- `src/l3-molecule/semantic/TopicView.tsx`
- `src/l3-molecule/semantic/ContactProfile.tsx`
- `src/l3-molecule/semantic/SemanticIndexPreview.tsx`
- `src/l2-coordinator/commander/useAiCommander.ts`
- `src/l2-coordinator/commander/semanticViewModel.ts`
- `src/l2-coordinator/data-clerk/stores/useAiStore.ts`
- `src/l4-atom/network/semanticAdapters.ts`
- `src/l4-atom/network/streamQA.ts`
- `src/l4-atom/network/semanticStreamParser.ts`

### 14.2 Graph

建议新增：

- `src/l3-molecule/graph/GraphStatusBar.tsx`
- `src/l3-molecule/graph/GraphEntityList.tsx`
- `src/l3-molecule/graph/GraphRelationList.tsx`
- `src/l3-molecule/graph/GraphFactList.tsx`
- `src/l3-molecule/graph/GraphDetailInspector.tsx`
- `src/l3-molecule/graph/GraphQAPanel.tsx`
- `src/l3-molecule/graph/GraphLegend.tsx`

建议修改：

- `src/l3-molecule/graph/GraphModule.tsx`
- `src/l3-molecule/graph/GraphModuleView.tsx`
- `src/l3-molecule/graph/GraphSummaryPanel.tsx`
- `src/l3-molecule/graph/GraphFallbackTable.tsx`
- `src/l3-molecule/graph/GraphTimeline.tsx`
- `src/l3-molecule/graph/GraphVisualizePanel.tsx`
- `src/l3-molecule/graph/GraphCanvas.tsx`
- `src/l3-molecule/graph/GraphAdvancedPanel.tsx`
- `src/l2-coordinator/commander/useGraphCommander.ts`
- `src/l2-coordinator/commander/graphViewModel.ts`
- `src/l2-coordinator/data-clerk/stores/useGraphStore.ts`
- `src/l4-atom/network/graphAdapters.ts`
- `src/l4-atom/network/graphResidualAdapters.ts`

### 14.3 CSS 和测试

建议修改或新增：

- `src/styles/layout.css`
- `src/styles/workbench-content.css`
- `src/l4-atom/network/semanticAdapters.test.ts`
- `src/l4-atom/network/streamQA.test.ts`
- `src/l4-atom/network/semanticStreamParser.test.ts`
- `src/l4-atom/network/graphAdapters.test.ts`
- `src/l2-coordinator/commander/semanticViewModel.test.ts`
- `src/l2-coordinator/commander/graphViewModel.test.ts`
- `src/l3-molecule/semantic/semanticDisplay.test.ts`
- `src/l3-molecule/graph/graphDisplay.test.ts`
- `src/l3-molecule/graph/graphLayout.test.ts`
- `e2e/specs/advanced.spec.ts`
- `e2e/specs/privacy.spec.ts`
- `e2e/specs/visual.spec.ts`
- `e2e/specs/a11y.spec.ts`
- `e2e/fixtures/core-ready.json`
- `e2e/fixtures/advanced-capabilities.json`

## 15. 风险矩阵

| 风险 | 严重度 | 缓解 |
| --- | --- | --- |
| UI 基于旧 Sprint 3/4 文档重新写错契约 | Critical | P3-0 先扩展真实 handler/README fixture 和 adapter tests |
| QA stop 被误判为 failed | High | streamId + abort reason + commander stale callback guard |
| QA evidence 泄露聊天内容 | Critical | evidence drawer privacy-aware，diagnostics 永不记录 evidence text |
| Graph network graph 不可访问 | High | list/timeline/detail 是主路径，canvas 是显式可选路径 |
| Graph/semantic status 仍只显示粗略 ready/running | Medium | adapter/view model 消费 ETA/rate/coverage/worker fields |
| Provider setup 太复杂 | High | 基础字段默认展示，高级参数放 sheet/disclosure |
| 高并发索引/图谱带来费用和性能问题 | High | 默认低并发，worker 高值 confirmation，费用提示 |
| raw ingest 被误做成 JSON 编辑器 | Critical | message ingest visible UI 继续 deferred，business/event structured form only |
| 大范围 UI 改造引入 layout 回归 | High | 每个阶段都跑 1440px/390px Browser checks 和 E2E |

## 16. Verification Matrix

### 16.1 Targeted Unit Tests

```powershell
pnpm test src/l4-atom/network/semanticAdapters.test.ts src/l4-atom/network/streamQA.test.ts src/l4-atom/network/graphAdapters.test.ts
pnpm test src/l2-coordinator/commander/semanticViewModel.test.ts src/l2-coordinator/commander/graphViewModel.test.ts
pnpm test src/l3-molecule/semantic/semanticDisplay.test.ts src/l3-molecule/graph/graphDisplay.test.ts src/l3-molecule/graph/graphLayout.test.ts
```

### 16.2 Full Frontend Gates

```powershell
pnpm fixtures:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### 16.3 Browser Gates

```powershell
pnpm e2e
pnpm e2e:visual
pnpm e2e:a11y
```

必须串行运行 Playwright 命令，避免多个 mock backend 抢 `127.0.0.1:5030`。

### 16.4 Final Gate

```powershell
pnpm verify
```

如果改动 Tauri/Rust/sidecar：

```powershell
Push-Location src-tauri
cargo test
Pop-Location
```

## 17. Source Scans

每个子阶段完成前运行：

```powershell
rg -n "@l4/network|fetch\(|EventSource|WebSocket|axios" src\l1-entry src\l3-molecule
rg -n "@l2|l2-coordinator" src\l4-atom
rg -n "dangerouslySetInnerHTML|AppleButton|AnimatePresence|motion\.div" src\l3-molecule\semantic src\l3-molecule\graph
rg -n "api[_-]?key|token|credential|dataKey|imgKey|wxid_|sender_name|talker_name|store_path|vector_sample|graph evidence" src specs e2e
```

所有命中必须解释为：

- safe redacted display
- test-only synthetic fixture
- local-only diagnostics metadata
- accepted module-root exception
- blocker requiring fix

## 18. Definition Of Done

P3 完成必须满足：

- AI 设置中心能真实完成 provider 配置、测试、保存、refetch 和索引管理。
- Index running/paused/error/ready 都有清晰 UI 和恢复路径。
- SSE QA 支持 stop/retry/copy/evidence/reason/metadata，并正确区分 stopped/failed/empty/completed。
- Semantic search/topics/profiles/preview 都有可用的 loading/empty/error/success/retry。
- Graph 能通过列表、时间线、详情、可选可视化和 QA 完成主要分析流程。
- Graph advanced 的 config/ingest/rebuild 都有 confirmation、风险提示和 privacy behavior。
- 390px 和 1440px 下无水平溢出、无按钮文字截断、无内容重叠。
- Privacy mode 下 semantic/graph 的 raw content、identity、credentials、evidence 不出现在 DOM text、aria-label、title、diagnostics、fixture、screenshot。
- P5-A/B E2E/visual/a11y gates 已扩展覆盖 P3 路径。
- `pnpm verify` 通过；如触及 Tauri/Rust，`cargo test` 通过。

## 19. 建议第一张实施票

建议先开 P3-0，不直接做大 UI：

**标题：P3-0 Contract And State Foundation For Semantic SSE And Graph**

**范围：**

- semantic/graph adapter status 字段扩展。
- QA message model 和 abort/stale stream hardening。
- semantic/graph view model 扩展。
- fixture 状态补齐。
- targeted unit tests。

**不包含：**

- 不做完整 Setup UI 重构。
- 不做 Graph detail inspector。
- 不做 E2E 大改。
- 不改后端。

这样可以在最小 UI 震荡下先把后续所有 P3-A/P3-B/P3-D 依赖的数据基础补齐。

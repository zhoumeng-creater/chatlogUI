# codex/next-repair-baseline UX 修复基线台账

> 日期：2026-06-09
> 分支：`codex/next-repair-baseline`
> 范围：源码与现有文档证据核验，不包含真实 Tauri 窗口点击、安装包 smoke 或真实私有数据测试。

## 判断口径

本台账把用户反馈按当前源码证据分类：

- `存在`：当前源码直接证明问题成立。
- `部分存在`：问题方向成立，但已有局部修复或影响范围比原描述更窄。
- `未证实`：当前源码/文档没有证明该问题成立。
- `需运行证据`：源码有实现或历史记录，但必须通过真实运行、Tauri 窗口或安装包 smoke 才能确认。

审核判据以 `docs/product-acceptance-standards.md` 和 `docs/ui-development-standards.md` 为准；NN/G、Fluent 2、WCAG 2.2 的官方条目已沉淀到这两个标准文件中。

## 总体结论

“功能密度很高，但用户任务密度很低”这个核心判断成立。最主要的证据不是单个视觉瑕疵，而是几条主任务链断裂：

- Workbench 同时有左 rail 模块导航和 toolbar 模块按钮，且 toolbar 内塞入会话标题、模块切换、全局搜索、过滤器、搜索结果。
- 搜索能返回结果，但点击结果不能定位命中消息，也没有 stale response 防护。
- Setup Center 支持“外部服务”概念，但没有 URL 输入；Workbench 主 API 和 Tauri CSP 仍围绕固定 `127.0.0.1:5030`。
- Settings 的 AI 配置与 semantic AI 后端配置是两套入口。
- Media、SNS、Graph、Developer、Diagnostics 入口很多，但部分入口只是状态展示或调试能力，不是普通用户任务闭环。

## P0 问题

### P0-01 本地路径、wxid 和诊断路径暴露

**判断：部分存在。**

证据：

- `src/l3-molecule/settings/DataSettings.tsx:24-29` 直接把 `settings.wxDataPath` 渲染进只读输入框。
- `src/l3-molecule/setup/ConfigImportPanel.tsx:35-37` 在导入后显示完整 `picked` 目录。
- `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:57-64` 使用 `E:\WeChat Files\wxid_xxx` 作为数据目录 placeholder。
- `src/l3-molecule/common/DevConsole.tsx:99-101` 导出成功文案显示完整路径。
- 但 `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx` 的 `formatDiagnosticsExportSuccess()` 已只显示文件名，所以设置/Setup 诊断面板这条路径已有局部修复。

分析：隐私信任问题仍存在，但“所有诊断导出都暴露完整路径”不准确。当前更准确的表述是：设置页、导入配置和全局开发者控制台仍会暴露本地路径形态；主诊断面板已做过文件名级收敛。

下一步：统一路径显示策略。普通路径只显示安全摘要或文件名；完整路径仅在明确的高级诊断展开区显示，并受隐私模式和复制/导出脱敏策略约束。

### P0-02 外部服务模式不完整

**判断：存在。**

证据：

- `src/l1-entry/pages/SetupCenterView.tsx:73` 把 `setup.profile?.httpAddr ?? "http://127.0.0.1:5030"` 作为 `externalBaseUrl` 传入。
- `src/l3-molecule/setup/ServiceControlPanel.tsx:11` 只接收 `externalBaseUrl`，没有可编辑 URL 字段。
- `src/l3-molecule/setup/ServiceControlPanel.tsx:66-74` 外部模式只有“连接外部服务”按钮，并直接调用 `onConnectExternalService(externalBaseUrl)`。

分析：UI 承诺用户可以连接外部服务，但用户不能输入外部 URL。默认值又回到 5030，所以这是承诺与能力不一致的问题。

下一步：在外部服务路径加入 URL 输入、连接测试、HTTP/DB 两级状态和保存后的全局 base URL 生效路径。

### P0-03 主 API 仍使用固定端口

**判断：存在。**

证据：

- `src/utils/constants.ts:1-10` 定义 `SIDECAR_PORT = 5030` 和 `AI_BASE_URL = http://127.0.0.1:${SIDECAR_PORT}`。
- `src/utils/constants.ts:22-24` 定义 `GRAPH_BASE_URL = http://127.0.0.1:${SIDECAR_PORT}`。
- `src/l4-atom/network/fetchSearch.ts:1-10` 和 `src/l4-atom/network/fetchHistory.ts:1-10` 都从固定 `SIDECAR_PORT` 生成 base URL。
- `src-tauri/tauri.conf.json:26` 的 CSP `connect-src` 也只放行本地 5030 和 localhost 5030。

分析：即使 Setup Center 保存了外部服务地址，Workbench 主要 fetcher 仍可能继续请求本地 5030；打包后 CSP 也会阻止任意外部地址。这个问题会直接造成“设置成功但主功能失败”。

下一步：建立单一后端 base URL 来源，并让 L4 network atom、diagnostics、media/SNS proxy、semantic/graph endpoint 和 Tauri CSP 策略一起收敛。外部服务如果只允许本机端口，也要在 UI 中明确说清楚。

### P0-04 桌面壳完整性和安装包 smoke

**判断：需运行证据。**

证据：

- `src/l3-molecule/common/AppLayout.tsx:47-54` 已接入窗口控制 cluster。
- `src/l3-molecule/common/WindowControlCluster.tsx` 使用最小化、最大化/还原、关闭按钮。
- `src/l4-atom/system/windowControls.ts` 调用 Tauri window API。
- `specs/001-ready-desktop-app/release-evidence.md:238-239` 明确记录 native Tauri window-click smoke 和 packaged smoke 未运行。

分析：源码层面已经不是“没有窗口控制”。但真实 Tauri 窗口点击、拖拽、关闭、sidecar 清理、安装后启动/退出/重开没有当前证据，发布体验不能标绿。

下一步：保留为 release gate blocker，补真实 `pnpm tauri dev` 点击 smoke 和安装包 install/open/quit/reopen smoke。

## P1 问题

### P1-01 Workbench 导航重复，信息架构不清

**判断：存在。**

证据：

- `src/l2-coordinator/commander/workbenchViewModel.ts:43-51` rail 模块包含会话、统计、媒体、朋友圈、开发、AI、图谱、设置。
- `src/l1-entry/pages/WorkbenchView.tsx:105-110` 把 `WorkbenchRail` 作为主导航传给 `WorkbenchFrame`。
- `src/l1-entry/pages/WorkbenchView.tsx:127-168` 又在 toolbar 中手写统计、媒体、朋友圈、开发、AI、图谱按钮。

分析：同一模块族有两组一级入口，且名称/位置不同。用户无法判断左 rail 和顶部按钮的层级关系。

下一步：明确 IA。建议只保留一个一级模块入口；右 inspector 只承载当前上下文详情，不再承担一级导航。

### P1-02 Toolbar 被当成半个页面使用

**判断：存在。**

证据：

- `src/l1-entry/pages/WorkbenchView.tsx:113-205` toolbar 内包含标题、模块按钮、全局搜索、过滤器和搜索结果。
- `src/styles/layout.css:580-586` 给 `.workbench-frame__toolbar` 设置 `max-height: 260px` 和 `overflow: auto`。

分析：toolbar 从轻量控制区变成滚动页面区域，直接压缩主聊天内容，也让搜索结果没有稳定的任务舞台。

下一步：把搜索结果移出 toolbar，建立稳定搜索页面/面板；toolbar 只保留当前上下文标题、搜索入口和少量操作。

### P1-03 开发者工具暴露给普通用户

**判断：存在。**

证据：

- `src/l3-molecule/common/GlobalCommandCluster.tsx:27-33` 全局固定渲染“开发者控制台”按钮。
- `src/l2-coordinator/commander/workbenchViewModel.ts:48` rail 固定包含 `{ module: "developer", label: "开发" }`。
- `src/l1-entry/pages/WorkbenchView.tsx:148-154` toolbar 也固定渲染“开发”按钮。

分析：开发者工具没有渐进披露，会把普通用户带入 DB/API/Hook/MCP 等调试语境，降低主任务清晰度。

下一步：默认隐藏。只在开发者模式、dev/beta channel、错误恢复中的高级诊断、启动参数或环境变量启用时显示。

### P1-04 搜索缺少“找到并定位”的任务闭环

**判断：存在。**

证据：

- `src/l3-molecule/search/SearchResults.tsx:42-47` 点击结果只取 `message.username || message.chat`，然后 `onSelectAndLoad(chat, chat)`。
- `src/l2-coordinator/commander/useChatCommander.ts:49-54` `loadHistory()` 固定用 `offset: 0`。
- `src/l2-coordinator/commander/useChatCommander.ts:93-97` `selectAndLoad()` 只选择会话并加载历史，没有锚点信息。

分析：当前只能打开会话，不能定位命中消息，也不能高亮命中项。对聊天记录工具来说，这是核心任务失败。

下一步：搜索结果点击传递 `message.id`、`timestamp`、`localId` 或后端可用锚点；加载命中附近窗口；渲染后滚动并高亮 2-4 秒；保留“回到搜索结果”路径。

### P1-05 搜索 stale response 风险

**判断：存在。**

证据：

- `src/l2-coordinator/commander/useSearchCommander.ts:54-76` 只取消 debounce。
- `src/l2-coordinator/commander/useSearchCommander.ts:27-52` 普通搜索没有 `AbortController` 或 request id guard。
- `src/l2-coordinator/commander/useSearchCommander.ts:101-128` load more 会把新返回结果合并到当前 state，未检查 query/filter/scope 是否仍匹配。

分析：旧请求慢返回可能覆盖新查询；load more 也可能把旧结果合并到新结果集。

下一步：给每次搜索和 load more 加 request id 或 abortable fetch；结果写入前验证 query/filter/scope/offset。

### P1-06 Settings AI 与 Semantic AI 配置分裂

**判断：存在。**

证据：

- `src/l3-molecule/settings/AIModelSettings.tsx:25-63` 允许编辑 provider、endpoint、model。
- `src/l2-coordinator/commander/useAiCommander.ts:115-150` semantic AI 实际读取和保存 `fetchSemanticConfig` / `setSemanticConfig`。

分析：用户会把“设置 -> AI 模型”理解为实际 AI 工作流配置，但 semantic 模块使用的是后端 semantic config。

下一步：保留一个真实 AI 配置入口。要么 Settings 只跳转到 semantic 配置向导，要么把本地 AI 设置改名为不会误导的偏好项。

### P1-07 AI QA 长任务状态仍有恢复缺口

**判断：部分存在。**

证据：

- `src/l2-coordinator/commander/useAiCommander.ts` 已有 `AbortController`、active stream id、防 stale token、停止、重试、复制、证据入口。
- `src/l4-atom/network/streamQA.ts:31-66` 60 秒 timeout 在 response headers 成功后被清除。
- `src/l4-atom/network/streamQA.ts:80-85` 后续 body read 循环没有 idle watchdog。
- `src/l2-coordinator/data-clerk/stores/useAiStore.ts` 有 `clearQAMessages`，但 `src/l3-molecule/semantic/QAPanel.tsx` 没有暴露清空问答按钮。

分析：原反馈中“AI 基本没有停止/重试/证据能力”不准确；这些已有。仍成立的是 headers 后 idle timeout、模块切换/长任务恢复证据、清空问答 UI 暴露不足。

下一步：增加 SSE idle watchdog；模块切换时明确取消流；QA 面板暴露清空问答；错误继续走 `translateError`，不要显示 raw backend error。

### P1-08 Graph 取消不是真取消，旧响应可覆盖新状态

**判断：存在。**

证据：

- `src/l2-coordinator/commander/useGraphCommander.ts:81-96` `loadGraphSummary()` 并发请求 status/query/visualize/timeline，返回后无条件写 store。
- `src/l2-coordinator/commander/useGraphCommander.ts:111-113` `cancelGraphLoad()` 只写 `loading: false, loadStatus: "cancelled"`。
- `src/l4-atom/network/fetchGraphVisualize.ts` 和 `fetchGraphQuery.ts` 没有传入调用方 abort signal。

分析：取消只是视觉状态；请求仍在跑，晚返回仍可能覆盖用户的新筛选或新图谱。

下一步：Graph 请求统一加 `AbortController` 或 request id guard。取消和新筛选都必须让旧响应无法写 store。

### P1-09 Media / Favorites / Members / Unread / New Messages 任务不闭环

**判断：存在。**

证据：

- `src/l3-molecule/media/MediaLibrary.tsx:132-142` 暴露附件、收藏、成员、未读、增量 tab。
- `src/l3-molecule/media/MediaLibrary.tsx:220-246` 只有附件行是可点击预览。
- `src/l3-molecule/media/MediaLibrary.tsx:249-289` 收藏和成员只是静态行。
- `src/l3-molecule/media/MediaLibrary.tsx:292-315` 未读和增量消息只是静态列表，没有跳转会话/消息动作。

分析：用户看到 tab 会以为可以管理收藏、查成员、处理未读或跳到新消息，但当前只完成部分展示。

下一步：二选一。补任务闭环：收藏预览/打开、成员搜索/分页、未读/新消息跳转上下文；或降低承诺，把这些改成摘要/预览态。

### P1-10 SNS 外部链接没有安全打开流程

**判断：存在。**

证据：

- `src/l4-atom/network/snsAdapters.ts:46-50` `AdaptedSnsArticle` 只保留 title、description、`hasExternalUrl`。
- `src/l4-atom/network/snsAdapters.ts:222-228` adapter 根据 raw URL 得到 `hasExternalUrl`，但不保留可打开 URL。
- `src/l3-molecule/sns/SnsTimeline.tsx` 和 `SnsDetailInspector.tsx` 只展示文章摘要/chip，没有安全外部打开动作。

分析：丢弃实际 URL 可能是隐私安全防护，但产品任务没有闭环。用户能看到“文章”，却不能通过确认流程安全打开。

下一步：设计受控外部打开：显示域名/来源、确认、隐私提示、Tauri/system allowlist；如果暂不支持，UI 应降低承诺。

### P1-11 Settings 返回语义固定

**判断：存在。**

证据：

- `src/l1-entry/pages/SettingsView.tsx:68-75` 返回按钮固定 `navigate("/workbench", { replace: true })`。

分析：如果用户从首次 setup、错误恢复或诊断路径进入 Settings，固定返回工作台可能不符合上下文。

下一步：记录来源 route 或使用返回栈；至少在 service/db 未就绪时返回 Setup Center 或恢复入口。

## P2 问题

### P2-01 控件尺寸低于项目默认标准

**判断：部分存在。**

证据：

- `src/styles/layout.css:215-224` `.ui-button--sm` 28px，`.ui-button--md` 34px。
- `src/styles/layout.css:259-266` `.ui-icon-button--sm` 28px，`.ui-icon-button--md` 34px。
- `src/styles/layout.css:472-480` `.ui-segmented__item` 30px。
- `src/styles/layout.css:3549-3568` 窄屏媒体查询会把部分目标提升到 40/44px。

分析：不是所有视口都低于 WCAG 最小目标；窄屏有补救。但桌面默认 token 仍低于项目自己的 `sm >= 32`、form button `md = 40`、icon md `36`、segmented `>=32` 目标。

下一步：重设 size token，并给真正需要 28px 的密集场景建立例外记录和更大 hit area。

### P2-02 Field hint/error 未关联到输入控件

**判断：存在。**

证据：

- `src/l4-atom/ui/Field.tsx:12-30` 生成 hint/error id 并渲染文本，但直接渲染 `{children}`，没有注入 `aria-describedby`、`aria-invalid` 或 `aria-errormessage`。

分析：视觉上靠近输入框，不等于屏幕阅读器能可靠读到错误/提示。

下一步：让 `Field` 支持 render prop 或安全 clone 子控件注入 ARIA；对 Select/Input/SegmentedControl 保持一致。

### P2-03 Dialog / Sheet 焦点生命周期不一致

**判断：部分存在。**

证据：

- Workbench drawer 已有焦点保存/恢复和 Escape 处理：`src/l3-molecule/workbench/WorkbenchFrame.tsx`。
- `src/l4-atom/ui/SpringModal.tsx:9-38` 没有 `role="dialog"`、`aria-modal`、Escape、初始焦点、焦点恢复或焦点陷阱。
- `src/l3-molecule/semantic/SemanticIndexCenter.tsx:80-101` 视觉确认弹窗有 `role="dialog"`，但没有焦点生命周期。
- `src/l3-molecule/semantic/SemanticSetupCenter.tsx:242-265` 高并发确认弹窗同样缺少焦点生命周期。
- `src/l3-molecule/media/MediaPreviewSheet.tsx:24-36` 预览 sheet 是 dialog，但 `aria-modal="false"`，没有 Escape、初始焦点或恢复焦点。

分析：Workbench drawer 是较好的局部模式，但共享 modal、语义确认和媒体 sheet 没有统一焦点模型。

下一步：抽一个项目级 overlay/focus primitive，覆盖 initial focus、Escape、focus trap、restore focus、modal/non-modal 语义。

### P2-04 Setup 手动配置字段级体验不足

**判断：存在。**

证据：

- `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:56-145` 一次性暴露 dataDir、workDir、platform、version、fullVersion、dataKey、imgKey、httpAddr、media cache。
- 保存错误集中从 `error` 渲染在表单底部，没有字段级错误绑定。
- `Field` 本身也尚未把错误关联到输入控件，见 P2-02。

分析：首次用户会被高级字段淹没。当前更像排障表单，不适合默认配置路径。

下一步：自动导入、外部服务、高级手动配置分成三条清晰路径；高级默认折叠；每个字段提供说明、示例、校验、字段级错误。

## 页面级结论

### Setup Center

结构雏形存在：stepper、主区域、状态/诊断区域和 HTTP/DB readiness 区分已经有。但外部服务没有 URL 输入，自动导入显示完整目录，高级配置默认暴露过多字段。Setup 的首要修复是“推荐路径”和“外部服务路径”闭环，而不是继续增加字段。

### Workbench

当前 Workbench 的四区框架可以保留，但 IA 需要收敛。左 rail、会话列表、主内容和 inspector 是合理骨架；toolbar 里的模块按钮和搜索结果需要下沉或迁移。开发者入口应退出普通一级路径。

### Settings

Settings 应降级为偏好设置，不应承担服务连接和实际 AI provider/model 配置。数据路径、dataKey、外部服务 URL 应回到 Setup Center；AI provider/model 应回到 semantic 配置向导，或由 Settings 跳转过去。

### Search

Search 是最高优先级主流程之一。当前“显示结果”不等于“完成搜索任务”。优先修复搜索 stale 防护和命中消息定位。

### AI / Semantic

方向成立，局部实现已有停止、重试、复制、证据、防 stale stream。但配置入口分裂、SSE idle watchdog、清空问答 UI、语义搜索/预览 stale 防护仍要补。

### Graph

Graph 已经从“只渲染 canvas”进化到摘要、列表、时间线、显式可视化和 QA，但请求取消/旧响应覆盖是必须修的可靠性问题。默认摘要视图方向正确。

### Media / SNS

入口已经铺开，但任务闭环不足。当前应决定是补全任务，还是降低 UI 承诺，避免把未完成能力做成已完成 tab。

### Developer / Diagnostics

诊断能力重要，但应是恢复路径，不是普通主界面入口。DevConsole 的完整路径成功文案和全局固定入口需要收敛。

## 建议修复顺序

1. P0-02/P0-03：外部服务 URL 输入、保存、全局 base URL、CSP/允许策略统一。
2. P1-04/P1-05：搜索命中定位和 stale response 防护。
3. P1-01/P1-02/P1-03：Workbench 信息架构收敛，隐藏开发者入口。
4. P0-01：路径、wxid、诊断导出成功文案统一脱敏。
5. P2-01/P2-02/P2-03：控件尺寸、Field ARIA、Overlay 焦点 primitive。
6. P1-06/P1-07/P1-08：AI 配置统一、SSE idle watchdog、Graph abort/request guard。
7. P1-09/P1-10：Media/SNS 选择“补闭环”或“降承诺”。

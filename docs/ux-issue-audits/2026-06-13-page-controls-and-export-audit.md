# 2026-06-13 页面控制、范围选择与业务导出体验审计

## 背景

本文件记录用户在 2026-06-13 追加提出的页面级体验问题，并逐项核对当前代码是否支持这些判断。结论只表示“问题是否被当前代码证据支持”，不等同于已经完成修复。

审计分支：`codex/dev`

参考标准：

- `docs/product-acceptance-standards.md`
- `docs/ui-development-standards.md`
- `docs/ux-issue-audits/2026-06-13-first-use-and-chat-reading-audit.md`

结论标记：

- `成立`：当前代码直接证明问题存在。
- `部分成立`：代码证明存在风险或局部问题，但完整体验强弱还需要运行时视觉、真实数据或后端契约验证。
- `待验证`：需要真实后端、真实数据或视觉回归证据才能下结论。

## 摘要

| 编号 | 问题 | 结论 | 优先级 | 主要证据 |
| --- | --- | --- | --- | --- |
| 1 | “显示范围/当前范围”只是状态说明，不是范围控制器 | 成立 | P1 | `WorkspaceScopeStatus` 只展示文案、chip、状态项和可选 actions；范围模型只有 `currentChat/all` |
| 2 | 业务导出缺失，当前导出主要是诊断导出 | 成立 | P1 | 全局搜索只发现 Setup/Settings 接入诊断导出；业务页面没有会话、搜索、统计、朋友圈、媒体、AI、图谱导出 |
| 3 | 一级导航隐藏文字后仍占 192px | 成立 | P1 | shell grid 固定 `--sidebar-expanded`；`useShowRailLabels()` 只控制 label 显隐 |
| 4 | 工作台顶部操作偏少，核心业务操作沉到详情入口 | 成立 | P1 | toolbar 只有“搜索此会话/会话详情”；详情里才有统计、媒体、AI、图谱入口 |
| 5 | 搜索页可用但筛选与导出不足，搜索框缺少可见标签 | 成立 | P1 | 可见输入只有 placeholder；过滤器只有全部/文本/图片/视频/文件；无搜索结果导出 |
| 6 | 统计页范围不可调整，控制维度严重不足 | 成立 | P1 | 默认 currentChat；全局统计文案提示未接入；趋势窗口硬编码 `7d` |
| 7 | 朋友圈筛选区域抢占主内容，且即时/接口筛选混杂 | 部分成立 | P1 | Summary、Filter、Tabs 固定在列表前；作者/日期进接口，类型/仅媒体在 view model 过滤 |
| 8 | 朋友圈内容与详情布局不适合宽屏阅读 | 成立 | P1 | 动态正文单行省略；body 是纵向 flex；详情区排在列表之后 |
| 9 | 媒体页边界说明较好，但缺少常见媒体操作 | 成立 | P2 | 有摘要、tab、边界说明和预览；预览 sheet 只有关闭和预览内容 |
| 10 | AI 页功能分层不清，首次进入缺少单一主任务 | 部分成立 | P1 | 同一 panel 内有设置、索引中心、问答/搜索/分析/预览；证据只支持打开和复制答案，不支持导出证据 |
| 11 | 图谱页筛选过多平铺，解释层不够产品化 | 成立 | P1 | header 平铺关键词、实体、关系、数量、日期、按钮、时间 tabs；摘要缺筛选条件、来源、生成时间和过期说明 |
| 12 | 设置/诊断导出模式值得复用，但不能替代业务导出 | 成立 | P1 | 诊断导出有脱敏 gate、导出中状态、成功摘要；Rust 写入临时目录固定文件名，用户不能选择位置 |

## 1. 范围状态不是范围控制器

结论：成立。

`WorkspaceScopeStatus` 当前承担的是“告诉用户当前范围是什么”，不是“让用户在这里改变范围”。用户看到“当前范围/显示范围”却无法直接切换，确实会形成可操作性误导。

代码证据：

- `src/l3-molecule/workspace/WorkspaceScopeStatus.tsx:18` 到 `src/l3-molecule/workspace/WorkspaceScopeStatus.tsx:55` 只渲染 `scopeLabel`、`scopeDescription`、来源/focus chip、状态项和可选 `actions`。
- `src/l2-coordinator/commander/workspaceRouteScope.ts:3` 到 `src/l2-coordinator/commander/workspaceRouteScope.ts:4` 的范围模式只有 `currentChat | all`，状态也只有当前会话、全部、缺失会话、未选择会话。
- `src/l1-entry/pages/AnalyticsView.tsx:43`、`src/l1-entry/pages/MediaView.tsx:40`、`src/l1-entry/pages/AiWorkspaceView.tsx:34`、`src/l1-entry/pages/GraphView.tsx:42` 都把它当作状态条复用。

建议记录为 P1：升级为统一范围选择条。范围条应支持查看、修改、清除当前会话、全部会话、指定联系人/群聊、日期范围、来源页面、焦点消息。短期也应让“不可改”的范围状态明确显示为只读，而不是像一个可交互控件。

## 2. 诊断导出存在，但业务导出缺失

结论：成立。

当前项目已经有较谨慎的诊断导出，但它不是用户真正要的业务数据导出。业务导出应出现在结果产生的位置，而不是被设置页或诊断页替代。

代码证据：

- `src/l2-coordinator/commander/useDiagnosticsCommander.ts:80` 调用 `exportDiagnosticsReport(report)`，导出对象是诊断报告。
- `src/l4-atom/system/exportDiagnostics.ts:13` 到 `src/l4-atom/system/exportDiagnostics.ts:18` 在前端先检查 `redactionOk`，再调用 Tauri `export_diagnostics_report`。
- `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx:44` 到 `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx:126` 包含脱敏阻止、导出中禁用、失败文案和导出成功摘要。
- `src/l1-entry/pages/SetupCenterView.tsx:154` 与 `src/l1-entry/pages/SettingsView.tsx:62` 是当前业务页面范围内仅有的“导出”入口，均指向诊断导出。
- 对 `src/l1-entry/pages` 和 `src/l3-molecule/chat|search|stats|sns|media|semantic|graph|workbench` 搜索“导出/Export/Download/CSV/csv”，没有发现当前会话、搜索结果、统计、朋友圈、媒体、AI 证据或图谱导出入口。
- `src-tauri/src/sidecar.rs:235` 到 `src-tauri/src/sidecar.rs:262` 将诊断写到 `std::env::temp_dir().join("chatlog_alpha_diagnostics.log")`，不是用户自选位置。

建议记录为 P1：设计业务导出能力与统一导出安全模型。至少需要当前会话导出、搜索结果导出、统计 CSV/图片导出、朋友圈筛选结果导出、媒体清单导出、AI 问答与证据导出、图谱节点/关系导出。导出前复用脱敏检查，导出中禁用重复点击，导出后显示保存位置摘要，并允许用户选择位置。

## 3. 一级导航隐藏标签但不释放宽度

结论：成立。

窄屏时隐藏文字却仍保留 192px 侧栏，会造成空白和主体挤压。导航项 tooltip 和选中态已经存在，缺的是 rail 宽度跟随标签状态切换。

代码证据：

- `src/styles/tokens.css:47` 到 `src/styles/tokens.css:48` 已定义 `--sidebar-expanded: 192px` 和 `--sidebar-collapsed: 64px`。
- `src/styles/layout.css:552` 将 `.ready-workspace-shell` 固定为 `grid-template-columns: var(--sidebar-expanded) minmax(0, 1fr)`。
- `src/l1-entry/pages/ReadyWorkspaceShellView.tsx:98` 到 `src/l1-entry/pages/ReadyWorkspaceShellView.tsx:110` 的 `useShowRailLabels()` 只在宽度小于 1280 时返回 false。
- `src/l1-entry/pages/ReadyWorkspaceShellView.tsx:70` 到 `src/l1-entry/pages/ReadyWorkspaceShellView.tsx:74` 只把 `showLabels` 传给 rail，没有改变 shell grid 宽度。
- `src/l3-molecule/workspace/PrimaryWorkspaceRail.tsx:65` 到 `src/l3-molecule/workspace/PrimaryWorkspaceRail.tsx:81` 已有 tooltip、active class 和 `aria-current`。

建议记录为 P1：当 `showRailLabels=false` 时 shell grid 应切到 `--sidebar-collapsed`；宽屏才使用 `--sidebar-expanded`。导航 hover tooltip 和当前项选中态可继续沿用。

## 4. 工作台顶部核心操作不足

结论：成立。

工作台是核心入口，但顶部只暴露“搜索此会话”和“会话详情”。统计、媒体、AI、图谱等入口被放到详情 inspector 内，导出、复制摘要、跳转日期等会话级操作不存在。

代码证据：

- `src/l1-entry/pages/WorkbenchView.tsx:83` 到 `src/l1-entry/pages/WorkbenchView.tsx:101` 的 toolbar 只有返回会话列表、搜索此会话、会话详情。
- `src/l3-molecule/workbench/ConversationInspector.tsx:88` 到 `src/l3-molecule/workbench/ConversationInspector.tsx:113` 把“搜索此会话、查看完整统计、打开媒体库、问这个会话、在图谱中查看”放在详情入口里。
- `src/l3-molecule/chat/TranscriptHeader.tsx:14` 到 `src/l3-molecule/chat/TranscriptHeader.tsx:35` 只显示会话身份、username 和私聊/群聊/条数状态。

建议记录为 P1：工作台顶部应有常用会话操作入口，例如导出当前会话、跳转日期、复制摘要、搜索当前会话、打开详情。详情 inspector 适合承载上下文和次级入口，不应成为核心操作的唯一入口。

## 5. 搜索页缺少可见输入标签、深层筛选和导出

结论：成立。

搜索页状态处理相对完整，但主搜索框只有可见 placeholder，筛选维度过窄，也没有“导出当前搜索结果”。

代码证据：

- `docs/ui-development-standards.md:143` 明确要求输入需要可见标签或无障碍标签，placeholder-only labeling 不可接受。
- `docs/product-acceptance-standards.md:206` 要求输入有 label 或 `aria-label`，placeholder 只能辅助。
- `src/l3-molecule/search/GlobalSearch.tsx:53` 到 `src/l3-molecule/search/GlobalSearch.tsx:54` 设置了 `aria-label="搜索聊天记录"` 和 `placeholder="搜索聊天记录"`，但没有可见字段标签。
- `src/l2-coordinator/api-docs/search.ts:3` 的类型筛选只有 `all | text | image | video | file`。
- `src/l3-molecule/search/FilterBar.tsx:4` 到 `src/l3-molecule/search/FilterBar.tsx:10` UI 只对应“全部、文本、图片、视频、文件”。
- `src/l2-coordinator/api-docs/search.ts:18` 到 `src/l2-coordinator/api-docs/search.ts:19` 接口类型已有 `timeStart/timeEnd` 参数，但 `useSearchCommander` 当前创建请求时没有接入可见日期筛选。
- `src/l3-molecule/search/SearchResultsPane.tsx:93`、`src/l3-molecule/search/SearchResultsPane.tsx:106`、`src/l3-molecule/search/SearchResultsPane.tsx:168` 分别覆盖未搜索、无结果和加载更多状态，但没有导出操作。

建议记录为 P1：搜索页应增加可见“搜索内容”标签，补齐日期、发送者、群成员、是否有附件、是否收藏、当前会话/全部会话等筛选；搜索结果列表顶部应提供导出当前结果，并显示导出范围与隐私状态。

## 6. 统计页范围与时间控制缺失

结论：成立。

统计页目前更像“当前会话统计摘要”，不是可调整分析面板。用户说“显示范围不能点击、无法调整范围”与代码一致。

代码证据：

- `src/l1-entry/pages/AnalyticsView.tsx:19` 默认范围是 `currentChat`。
- `src/l1-entry/pages/AnalyticsView.tsx:36` 直接提示“全局统计暂未接入本地接口”。
- `src/l1-entry/pages/AnalyticsView.tsx:43` 使用 `WorkspaceScopeStatus` 展示范围状态，但没有提供控制器。
- `src/l1-entry/pages/AnalyticsView.tsx:61` 到 `src/l1-entry/pages/AnalyticsView.tsx:63` 只渲染概览、趋势、TopContactCard。
- `src/l2-coordinator/commander/useStatsCommander.ts:39` 趋势窗口硬编码 `{ window: "7d" }`。

建议记录为 P1：新增统计控制条。最小可用结构应包含范围、时间、粒度、对象、消息类型、刷新、导出 CSV、导出图片、重置。第一屏应是指标卡、趋势图和范围控制，而不是只读图表。

建议控制条模型：

```text
范围：当前会话 / 全部会话 / 指定联系人 / 指定群聊
时间：近7天 / 近30天 / 近90天 / 自定义
粒度：日 / 周 / 月
对象：全部成员 / 我 / 对方 / 指定成员
操作：刷新 / 导出 CSV / 导出图片 / 重置
```

## 7. 朋友圈筛选抢占主内容，筛选生效方式混杂

结论：部分成立。代码结构支持这个判断，视觉“抢占程度”仍应通过截图验收确认。

朋友圈主任务应是阅读动态、看图片/文章、看通知和定位动态。当前结构中摘要、筛选、标签都固定在内容前面，且不同筛选项的生效机制不一致。

代码证据：

- `src/l3-molecule/sns/SnsModule.tsx:169` 到 `src/l3-molecule/sns/SnsModule.tsx:183` 先渲染 SummaryStrip、FilterPanel、SegmentedControl，再进入 `sns-module__body`。
- `src/styles/workbench-content.css:768` 到 `src/styles/workbench-content.css:864` 中 header、summary、filters 都是 `flex: 0 0 auto`，`sns-module__body` 才是 `flex: 1` 且 `overflow: auto` 的主体。
- `src/l2-coordinator/commander/useSnsCommander.ts:52` 到 `src/l2-coordinator/commander/useSnsCommander.ts:58` 仅将 `limit/user/since/until/media/replace` 传给 feed 接口。
- `src/l2-coordinator/commander/snsViewModel.ts:101` 到 `src/l2-coordinator/commander/snsViewModel.ts:105` 中 `contentType` 与 `mediaOnly` 是对已加载 posts 的本地过滤。
- `src/l3-molecule/sns/SnsModule.tsx:313` 到 `src/l3-molecule/sns/SnsModule.tsx:355` 的类型和仅媒体改动即时写入 filter state；作者、开始、结束依赖“应用”按钮触发刷新。

建议记录为 P1：默认只显示轻量筛选摘要，例如“全部动态 · 全部类型 · 不限日期 · 50条”。右侧放“筛选”按钮，展开抽屉或折叠面板。已生效筛选以 chip 展示并可单独清除；“重置筛选”常驻；需要接口刷新的作者/日期应显示“有未应用更改”，避免和即时过滤混在一起。

## 8. 朋友圈内容密度和详情布局不适合实际阅读

结论：成立。

当前朋友圈列表偏“表格摘要”，不适合真正阅读动态内容。详情区在列表之后，宽屏没有发挥横向空间优势。

代码证据：

- `src/styles/workbench-content.css:997` 到 `src/styles/workbench-content.css:1001` 将 `.sns-post-row__content` 设置为单行省略。
- `src/styles/workbench-content.css:864` 到 `src/styles/workbench-content.css:872` 中 `.sns-module__body` 是纵向 flex。
- `src/styles/workbench-content.css:873` 到 `src/styles/workbench-content.css:879` 中 `.sns-module__primary` 是纵向内容区，`src/styles/workbench-content.css:1097` 到 `src/styles/workbench-content.css:1108` 的 `.sns-detail` 排在同一纵向流里。
- `src/l3-molecule/sns/SnsModule.tsx:183` 到 `src/l3-molecule/sns/SnsModule.tsx:222` 先渲染列表/搜索/通知，再渲染 `SnsDetailInspector`。

建议记录为 P1：朋友圈至少提供两种密度。紧凑列表保留单行摘要；卡片模式显示 2 到 3 行正文、媒体缩略图、评论/点赞摘要。宽屏改为左侧动态列表、右侧详情 Inspector；窄屏再使用 bottom sheet 或抽屉。

## 9. 媒体页缺少媒体用户自然期待的操作

结论：成立。

媒体页已经有较好的边界说明，但媒体操作能力不足。当前更像只读预览面板，缺少打开、导出、复制摘要、筛选和批量操作。

代码证据：

- `src/l3-molecule/media/MediaLibrary.tsx:138` 到 `src/l3-molecule/media/MediaLibrary.tsx:170` 有摘要、tab 和边界说明入口。
- `src/l3-molecule/media/MediaLibrary.tsx:282` 与 `src/l3-molecule/media/MediaLibrary.tsx:285` 明确说明成员搜索只筛选已加载成员、未读/增量消息没有可定位锚点。
- `src/l3-molecule/media/MediaLibrary.tsx:157` 到 `src/l3-molecule/media/MediaLibrary.tsx:166` 的 tab 是附件、收藏、成员、未读、增量，并非图片/视频/语音/文件等媒体类型筛选。
- `src/l3-molecule/media/MediaLibrary.tsx:403` 到后续附件列表仅点击预览附件。
- `src/l3-molecule/media/MediaPreviewSheet.tsx:60` 到 `src/l3-molecule/media/MediaPreviewSheet.tsx:84` 的预览 sheet header 只有标题和关闭按钮。
- `src/l3-molecule/media/MediaPreviewSheet.tsx:90` 到 `src/l3-molecule/media/MediaPreviewSheet.tsx:111` 只渲染图片、视频、语音或“不支持直接预览”的文案。

建议记录为 P2：补齐打开原文件、定位来源、复制文件信息、导出媒体清单、按媒体类型筛选、按日期筛选、只看图片/视频/语音/文件、批量操作。复制路径要受隐私模式约束，隐私模式下只能复制脱敏摘要或提示关闭隐私模式后再操作。

## 10. AI 页状态有基础区分，但首屏主任务不够明确

结论：部分成立。

AI 页已经按配置、索引、可用状态做了一些分支，但整体仍把设置、索引中心、发现面板和问答/搜索/分析/预览压在同一 panel 内。用户首次进入时，容易不确定下一步是配置、建索引、提问、选择会话还是刷新发现。

代码证据：

- `src/l1-entry/pages/AiWorkspaceView.tsx:30` 文案说明“语义索引、问答、语义搜索和证据都在这个主工作区完成”。
- `src/l3-molecule/semantic/AiPanel.tsx:79` 到 `src/l3-molecule/semantic/AiPanel.tsx:83` 同一 panel 内有“问答、搜索、分析、预览”四个 tab。
- `src/l3-molecule/semantic/AiPanel.tsx:94` 到 `src/l3-molecule/semantic/AiPanel.tsx:95` 只有一个 AI 设置图标按钮。
- `src/l3-molecule/semantic/AiPanel.tsx:128` 到 `src/l3-molecule/semantic/AiPanel.tsx:139` 未配置时渲染设置中心；非检查/未配置状态渲染索引中心。
- `src/l3-molecule/semantic/AiPanel.tsx:143` 到 `src/l3-molecule/semantic/AiPanel.tsx:228` 可用状态下用发现面板承载问答、搜索、分析、预览。
- `src/l3-molecule/semantic/QAMessage.tsx:115` 到 `src/l3-molecule/semantic/QAMessage.tsx:128` 支持打开证据和复制答案。
- `src/l3-molecule/semantic/SemanticQAEvidenceDrawer.tsx:104` 到 `src/l3-molecule/semantic/SemanticQAEvidenceDrawer.tsx:127` 证据 drawer 支持打开到证据/打开会话，但没有导出问答和证据。

建议记录为 P1：AI 页第一屏应按状态显示单一主任务。未配置显示“配置 AI”；已配置未索引显示“建立语义索引”；索引中显示进度、暂停、取消；可用时默认展示“问当前会话”的输入框，搜索/分析/预览作为次级 tab。问答结果和证据应支持跳回原文、导出问答和证据、复制引用摘要。

## 11. 图谱控制层级过平，解释信息不足

结论：成立。

图谱是高复杂度页面，当前把大量筛选直接塞入 header。画布控制虽另有 `GraphControlBar`，但页面没有把“搜索/时间/刷新”“高级筛选”“画布控制”分层，也没有足够解释当前图谱来源与可信度。

代码证据：

- `src/l3-molecule/graph/GraphModule.tsx:104` 到 `src/l3-molecule/graph/GraphModule.tsx:180` 的 header 表单平铺关键词、实体、关系、数量上限、开始日期、结束日期、筛选、清空和时间范围 tabs。
- `src/l3-molecule/graph/GraphControlBar.tsx:80` 到 `src/l3-molecule/graph/GraphControlBar.tsx:182` 另有实体类型、时间、布局、刷新、自动旋转、时间轴控制，形成第二套控制层。
- `src/l3-molecule/graph/GraphSummaryPanel.tsx:63` 到 `src/l3-molecule/graph/GraphSummaryPanel.tsx:70` 只显示实体、关系、事件、事实、来源、待处理、处理中、失败等数字。
- `src/l3-molecule/graph/GraphSummaryPanel.tsx:105` 到 `src/l3-molecule/graph/GraphSummaryPanel.tsx:111` 只补充队列、worker、ETA、速率等技术状态，缺少筛选条件、图谱来源、生成时间和是否过期的用户解释。
- `src/l2-coordinator/commander/useGraphCommander.ts:535` 到 `src/l2-coordinator/commander/useGraphCommander.ts:545` 会把 keyword、window、start、end、limit、entity、relation 发到请求里，但这些条件没有被统一产品化展示成“当前正在看什么”。

建议记录为 P1：图谱控制分三层。第一层是搜索实体/关系、时间范围、刷新；第二层是筛选抽屉，包括实体类型、关系类型、数量、日期、自定义条件；第三层是画布控制，包括布局、自动旋转、时间线、显示类型、重置视图。摘要区应解释当前节点数、关系数、筛选条件、图谱来源、生成时间和是否过期。

## 12. 设置、诊断与导出边界需要重整

结论：成立。

设置页和 Setup 页中的诊断导出链路值得复用，但不能替代业务导出。导出入口应放在用户产生结果的位置，且让用户知道导出了什么、保存到哪里、是否受隐私模式限制。

代码证据：

- `src/l3-molecule/settings/AboutSettings.tsx:54` 到 `src/l3-molecule/settings/AboutSettings.tsx:60` 在关于页接入 `SettingsDiagnosticsDisclosure`。
- `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx:37` 到 `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx:39` 会把导出路径转成安全摘要。
- `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx:44` 到 `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx:126` 包含脱敏阻止、导出中禁用、重复点击控制和失败普通语言转换。
- `docs/product-acceptance-standards.md:64` 要求导出前校验并禁用重复提交。
- `docs/product-acceptance-standards.md:92` 把“Export or diagnose problems”列为任务家族。
- `docs/product-acceptance-standards.md:108` 要求隐私模式覆盖 copy/export。

建议记录为 P1：业务导出应沿用诊断导出的安全模式，但入口必须前移到业务页面：

- 当前会话导出：工作台顶部。
- 搜索结果导出：搜索结果列表顶部。
- 统计导出：统计页控制条或图表卡片右上角。
- 朋友圈导出：朋友圈筛选摘要条右侧。
- 媒体导出：媒体页 header 或预览 sheet。
- AI 导出：答案和证据区。
- 图谱导出：图谱摘要区或节点/关系列表。

## 后续建议

1. 先做统一范围选择条和业务导出框架，因为它们会影响统计、搜索、朋友圈、媒体、AI、图谱多个页面。
2. 统计页和工作台导出属于高频核心路径，建议作为第一批实现。
3. 朋友圈与图谱控制层改造涉及布局和状态模型，建议单独设计验收截图和响应式检查。
4. AI 页先明确状态主任务，不急于一次性重做全部语义能力。
5. 所有导出都必须从一开始纳入隐私模式、脱敏、位置选择、失败恢复和重复点击防护。

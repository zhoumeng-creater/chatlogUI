# 2026-06-13 朋友反馈的生产力与产品闭环问题审计

## 背景

本文件记录用户朋友在 2026-06-13 提出的第三批体验问题，并基于当前仓库源码、项目验收标准、可核对的 GitHub 远端状态进行逐项审计。它与前两份问题文档并列存在，避免不同来源的问题混在一起后丢失验收细节。

审计分支：`codex/dev`

已有相关文档：

- `docs/ux-issue-audits/2026-06-13-first-use-and-chat-reading-audit.md`
- `docs/ux-issue-audits/2026-06-13-page-controls-and-export-audit.md`

参考标准与外部资料：

- `docs/product-acceptance-standards.md`
- `docs/ui-development-standards.md`
- NN/g 10 usability heuristics：`https://www.nngroup.com/articles/ten-usability-heuristics/`
- WCAG 2.2：`https://www.w3.org/TR/WCAG22/`
- Ant Design design values：`https://ant.design/docs/spec/values/`
- Ant Design design patterns overview：`https://ant.design/docs/spec/overview/`
- GitHub repository API：`https://api.github.com/repos/zhoumeng-creater/chatlogUI`

结论标记：

- `成立`：当前代码直接证明问题存在。
- `部分成立`：代码证明存在风险或局部问题，但完整体验强弱还需要运行时视觉、真实数据或后端契约验证。
- `待验证`：需要真实后端、真实数据或视觉回归证据才能下结论。

## 覆盖清单

| 优先级 | 编号 | 朋友提出的问题 | 结论 | 工作量 | 是否已有前文重叠 |
| --- | --- | --- | --- | --- | --- |
| 高 | H1 | 搜索与筛选路径过浅，难以支撑发现型任务 | 成立 | 中到大 | 与第二份搜索问题重叠，但补充发现型任务、排序、分组、高亮、验收标准 |
| 高 | H2 | 工作台入口重复，信息架构不够任务导向 | 成立 | 大 | 与第二份工作台入口问题重叠，但补充三套入口心智模型 |
| 高 | H3 | 朋友圈页面信息量过密，筛选缺乏渐进披露 | 成立 | 中到大 | 与第二份 SNS 问题重叠，但补充字段字号、搜索 tab 与统一提交 |
| 高 | H4 | 导出能力几乎缺位，产品闭环不完整 | 成立 | 中 | 与第二份业务导出问题重叠，但补充 Markdown/CSV/JSON/图片格式和统一面板 |
| 中 | M1 | 统计页面可看但不够可解释、可比较、可行动 | 成立 | 中 | 与第二份统计范围问题相邻，新增解释、比较、分享 |
| 中 | M2 | 字体、字号、按钮与提示的可读性还有优化空间 | 部分成立 | 小到中 | 新增 |
| 中 | M3 | 错误态与空状态已有基础，但还不够可操作 | 成立 | 小到中 | 与第一份空状态问题相邻，扩展到搜索/SNS/统计 |
| 中 | M4 | 响应式与移动端已有基础，但仍显著偏桌面优先 | 部分成立 | 中 | 新增 |
| 低 | L1 | 国际化与本地化能力需要抽离 | 成立 | 中 | 新增 |
| 低 | L2 | KPI 与埋点体系不像产品级能力 | 部分成立 | 中 | 新增 |
| 低 | L3 | 性能优化更适合按模块懒加载 | 部分成立 | 小到中 | 新增 |
| 低 | L4 | 用户反馈闭环几乎为空，建议转为可追踪 Issue | 成立 | 小 | 新增 |

## H1. 搜索与筛选路径过浅，难以支撑发现型任务

结论：成立。当前搜索适合“我知道关键词，快速点查”的任务，但难以支撑“某人、某段时间、某类附件、某个主题”的发现型检索。

影响范围：定位消息、回溯证据、查找媒体/文件、复盘某会话。

复现路径记录：

1. 工作台打开一个会话。
2. 点击“搜索此会话”。
3. 输入关键词。
4. 只能通过范围菜单和“全部/文本/图片/视频/文件”继续收窄。
5. 结果区是单层列表与“加载更多搜索结果”。

代码证据：

- `src/l1-entry/pages/WorkbenchView.tsx:91` 提供“搜索此会话”入口。
- `src/l3-molecule/search/GlobalSearch.tsx:53` 到 `src/l3-molecule/search/GlobalSearch.tsx:65` 只有搜索框、loading spinner 和 `SearchScopeMenu`。
- `src/l2-coordinator/api-docs/search.ts:3` 将 `SearchFilterType` 限定为 `all | text | image | video | file`。
- `src/l3-molecule/search/FilterBar.tsx:4` 到 `src/l3-molecule/search/FilterBar.tsx:10` 只渲染五个类型按钮。
- `src/l2-coordinator/commander/searchRequest.ts:15` 到 `src/l2-coordinator/commander/searchRequest.ts:22` 只把五个类型映射成 msgType。
- `src/l3-molecule/search/SearchResultsPane.tsx:112` 到 `src/l3-molecule/search/SearchResultsPane.tsx:171` 以线性 list 渲染结果，仅提供加载更多。
- `src/l3-molecule/search/SearchResultsPane.tsx:132` 到 `src/l3-molecule/search/SearchResultsPane.tsx:154` 直接显示 `message.content`，没有命中片段高亮结构。

补充判断：

- NN/g 的“recognition rather than recall”和“flexibility and efficiency of use”在项目标准中已经被采用；搜索页当前没有让 active filters、排序、结果组织模式足够可见。
- `docs/product-acceptance-standards.md:269` 到 `docs/product-acceptance-standards.md:278` 已要求搜索支持筛选、结果片段、分页、隐私和错误恢复。当前实现只满足其中一部分。

改进建议：

- 升级为“两层筛选模型”：第一层保留快速搜索，第二层提供“高级筛选/筛选器”抽屉。
- 高级筛选包含作者、日期区间、会话范围、消息类型、是否含附件、是否仅命中标题/正文、是否收藏等条件。
- 已生效条件显示为可关闭 chips，并支持一键清除。
- 结果支持相关性/时间排序切换，支持按会话分组/按时间分组。
- 结果项显示命中片段高亮。
- 首屏在结果数较大时明确展示命中总数、当前筛选条件和排序方式。
- 窄屏下“更多筛选”做成底部弹层，而不是把所有条件铺在正文上。

开发验收标准：

- 用户可在不离开搜索页的情况下组合至少 5 类过滤条件。
- 已生效条件始终可见，并可单独清除或一键清除。
- 结果区支持“相关性/时间”切换。
- 结果项显示命中高亮片段。
- 支持按会话分组/按时间分组。
- 窄屏下筛选器不挤压结果列表。
- 隐私模式下命中内容仍脱敏展示。

测试用例：

- 空查询不发送请求。
- 仅类型筛选。
- 作者 + 日期联合筛选。
- 切换排序后结果稳定。
- 清除某个 filter chip 后结果即时更新。
- 隐私模式下内容脱敏但结构与计数稳定。

估算工作量：中到大。涉及搜索 store、过滤状态模型、结果渲染、窄屏交互、测试快照，并可能需要后端搜索契约扩展。

## H2. 工作台入口重复，信息架构不够任务导向

结论：成立。当前存在主模块 rail、toolbar、inspector 三套入口，功能可达但入口语义不收敛。

影响范围：所有中高频任务，尤其是第一次使用者。

复现路径记录：

1. 进入工作台。
2. 选择会话。
3. toolbar 看到“搜索此会话”和“会话详情”。
4. 打开会话详情后，再看到“搜索此会话、查看完整统计、打开媒体库、问这个会话、在图谱中查看”。
5. 旁边 rail 还可以切换 `chat/stats/media/sns/ai/graph`。

代码证据：

- `src/l1-entry/pages/WorkbenchView.tsx:83` 到 `src/l1-entry/pages/WorkbenchView.tsx:101` 的 toolbar 包含返回会话列表、搜索此会话、会话详情。
- `src/l3-molecule/workbench/ConversationInspector.tsx:88` 到 `src/l3-molecule/workbench/ConversationInspector.tsx:113` 再次提供搜索、统计、媒体、AI、图谱入口。
- `src/l3-molecule/workbench/WorkbenchRail.tsx:7` 定义 `chat | stats | media | sns | ai | graph` 六个模块。
- `src/l2-coordinator/commander/workbenchViewModel.ts:44` 到 `src/l2-coordinator/commander/workbenchViewModel.ts:48` 定义统计、媒体、朋友圈、AI、图谱模块项。
- `src/l2-coordinator/commander/primaryWorkspaceNavigation.ts:1` 和 `src/l2-coordinator/commander/primaryWorkspaceNavigation.ts:19` 到 `src/l2-coordinator/commander/primaryWorkspaceNavigation.ts:23` 又在一级工作区 rail 提供搜索、媒体、朋友圈、统计、AI、图谱路由。

改进建议：

- 约定“rail 管去哪，toolbar 管当前页做什么，inspector 管摘要和下一步建议”。
- rail 成为唯一主模块导航。
- toolbar 保留当前任务相关的 1 到 2 个动作，例如搜索、导出、跳转日期。
- inspector 缩减为会话摘要 + 推荐下一步，避免 5 个等权按钮。
- 会话详情中不再重复所有入口，只保留最强主动作或情境化建议。

设计稿建议：

- 左侧固定一级导航。
- 标题区显示当前会话与当前模块。
- 右侧 inspector 显示摘要、最近活跃时间、近 30 天消息数、一个主 CTA。
- 任意模块保持同一心智模型：左边切模块，上面做动作，右边看摘要。

开发验收标准：

- 一级导航入口唯一。
- 同一功能不再同时出现在三个不同区域。
- 会话详情中按钮数量减少 40% 以上。
- 首屏用户可以在 5 秒内说出“去哪里切模块、去哪里执行动作”。
- 窄屏 drawer 模式下入口语义仍一致。

测试用例：

- 首次用户路径测试。
- 从聊天页进入统计页路径测试。
- 从搜索结果返回原会话路径测试。
- 窄屏 drawer 模式导航一致性测试。

估算工作量：大。它影响布局、状态管理、导航逻辑、视觉层级和文案。

## H3. 朋友圈页面信息量过密，筛选方式缺乏渐进披露

结论：成立。朋友圈模块控件完整但默认全展开，造成内容理解任务被筛选与摘要控件挤压。

影响范围：浏览动态、按条件找朋友圈内容、处理通知。

复现路径记录：

1. 工作台选择 `sns` 模块。
2. 页面立即展示标题、刷新按钮、摘要条、完整筛选面板、分段切换和主体内容。
3. 搜索 tab 内还有搜索输入、搜索按钮、清空按钮和结果流。

代码证据：

- `src/l3-molecule/sns/SnsModule.tsx:123` 到 `src/l3-molecule/sns/SnsModule.tsx:170` 在同一页面连续渲染 header、错误/部分错误、SummaryStrip、FilterPanel。
- `src/l3-molecule/sns/SnsModule.tsx:172` 到 `src/l3-molecule/sns/SnsModule.tsx:222` 随后渲染 SegmentedControl、timeline/search/notifications 和详情 inspector。
- `src/l3-molecule/sns/SnsModule.tsx:288` 到 `src/l3-molecule/sns/SnsModule.tsx:365` 的 FilterPanel 包含作者、类型、开始、结束、应用、仅媒体、含已读通知。
- `src/styles/workbench-content.css:833` 到 `src/styles/workbench-content.css:839` 的 `.sns-module__field` 字号为 11px。
- `src/styles/workbench-content.css:864` 到 `src/styles/workbench-content.css:872` 的主体是纵向 flex，详情与主内容仍在同一纵向流中。

改进建议：

- 默认精简：第一屏只保留标题、摘要条、视图切换和一个“筛选”按钮。
- 作者、日期、包含已读等进入可折叠面板或筛选抽屉。
- 默认只保留关键词搜索和类型筛选。
- 摘要条收敛为“可见动态/通知/媒体”三项核心指标。
- 页面右上角加入“导出当前视图”和“重置筛选”。
- “应用筛选”应作为整个筛选区统一提交动作，而不是让用户猜作者、日期、媒体筛选各自何时生效。
- 搜索 tab 与 timeline 共享同一数据容器，顶部切换浏览/搜索/通知，避免每个 tab 独立堆控件。

设计稿建议：

- 桌面端：摘要栏 + 内容区 + 折叠筛选抽屉 + 右侧详情 inspector。
- 窄屏：筛选与详情降级为底部 sheet。
- 已生效筛选用 chips 展示，chip 可单独清除。

开发验收标准：

- 默认进入页面时筛选区收起。
- 任意筛选状态都能在摘要 chips 中可见。
- “重置筛选”清空全部条件。
- “导出当前视图”至少支持 CSV/Markdown。
- 移动端下详情不再与筛选并列挤压。

测试用例：

- 默认进入页面。
- 作者 + 类型 + 日期联合筛选。
- 通知 tab 与 timeline tab 切换后状态保留。
- 导出当前筛选结果。
- 窄屏下筛选弹层可关闭且不丢状态。

估算工作量：中到大。布局、状态收纳、筛选提交语义和导出入口都要调整。

## H4. 导出能力几乎缺位，产品闭环不完整

结论：成立。当前导出主要是诊断导出，不是业务结果导出。

影响范围：复盘、汇报、归档、协作。

复现路径记录：

- 搜索页查看结果：没有导出。
- 统计页查看概览与趋势：没有导出。
- 朋友圈页查看筛选后内容：没有导出。
- 设置页 About：可以导出诊断报告。

代码证据：

- `src/l1-entry/pages/SettingsView.tsx:62` 将 `onExportDiagnostics` 暴露给 About 设置页。
- `src/l1-entry/pages/SetupCenterView.tsx:154` 接入设置中心诊断导出。
- 对 `src/l1-entry/pages` 和 `src/l3-molecule/search|stats|sns|workbench|media|semantic|graph` 搜索“导出/Export/Download/CSV/csv”，仅发现 Setup 与 Settings 的诊断导出入口。
- `src/l3-molecule/search/SearchResultsPane.tsx`、`src/l3-molecule/stats/StatsInspector.tsx`、`src/l3-molecule/sns/SnsModule.tsx` 的关键动作区没有业务导出按钮。
- `docs/product-acceptance-standards.md:341` 到 `docs/product-acceptance-standards.md:344` 已经要求诊断/导出/隐私有明确验收。

改进建议：

- 新增统一“信息导出模块”，但不要做成孤立页面，而是作为所有内容页统一动作规范。
- 搜索页导出“当前结果集”和“选中结果所在会话上下文”。
- 统计页导出 CSV 与 PNG。
- 朋友圈页导出当前可见列表、当前筛选条件和选中详情。
- 统一导出面板包含格式、范围、敏感信息处理、文件名预览。
- 支持 Markdown、CSV、JSON、图片快照。Markdown 应优先，因为知识工作流最通用。

设计稿建议：

- 搜索、统计、朋友圈右上角统一放“导出”按钮。
- 点击后弹出统一面板：格式、范围、敏感信息处理、文件名预览、保存位置。
- 导出完成后显示保存位置摘要，隐私模式默认脱敏。

开发验收标准：

- 搜索/统计/朋友圈三处均存在统一导出入口。
- Markdown 导出默认包含时间、筛选条件和来源说明。
- CSV 字段名一致。
- 隐私模式下导出默认脱敏。
- 失败时提供重试与错误原因。

测试用例：

- 空结果导出。
- 隐私开/关导出。
- 中文文件名。
- 超大结果集导出。
- 导出取消。
- 中断后恢复。

估算工作量：中。若只做前端导出与统一面板是中等；若加服务端大文件导出则上升为大。

## M1. 统计页面可看但不够可解释、可比较、可行动

结论：成立。当前统计页能展示基础数字和趋势，但缺少时间预设、周期对比、指标解释和导出。

影响范围：复盘和洞察提炼。

复现路径记录：

1. 选中会话。
2. 打开统计页或会话详情中的“查看完整统计”。
3. 看到概览、趋势和活跃发送者。
4. 没有时间预设、同比/环比、指标解释、导出。

代码证据：

- `src/l3-molecule/stats/StatsInspector.tsx:56` 到 `src/l3-molecule/stats/StatsInspector.tsx:61` 只有 AI 和图谱两个动作。
- `src/l3-molecule/stats/StatsInspector.tsx:88` 到 `src/l3-molecule/stats/StatsInspector.tsx:90` 主内容只有 DashboardOverview、TrendChart、TopContactCard。
- `src/l3-molecule/stats/DashboardOverview.tsx:11` 到 `src/l3-molecule/stats/DashboardOverview.tsx:24` 是轻量 MetricRow 容器。
- `src/l3-molecule/stats/TrendChart.tsx:12` 到 `src/l3-molecule/stats/TrendChart.tsx:47` 只渲染趋势或 fallback table，没有解释、比较和导出。
- `src/l2-coordinator/commander/useStatsCommander.ts:39` 趋势窗口固定为 `7d`。

改进建议：

- 顶部增加“7 天/30 天/全部/自定义”时间预设。
- 增加“与上一周期比较”。
- 趋势图峰值支持 tooltip 解释。
- 指标右上角增加口径说明，例如消息数、活跃发送者如何计算。
- 增加“导出图表/导出 CSV”。
- 使用千分位、单位清晰、对齐明确的数据表达规则。

设计稿建议：

- 统计页采用“顶部控制条 + 核心指标 + 趋势图 + 解释卡片 + 导出”。
- inspector 宽度不足时，把解释卡片折叠为抽屉，而不是压缩图表。

开发验收标准：

- 支持日期预设与自定义时间段。
- 支持上一周期对比。
- 所有关键指标都有释义与口径说明。
- 图表支持导出。
- 空数据、加载失败、隐私模式都有稳定显示。

测试用例：

- 切换时间预设。
- 上一周期对比计算正确。
- 数据为空。
- 加载失败。
- 隐私脱敏状态下 top sender 展示。
- 图表容器宽度变化后的重绘。

估算工作量：中。

## M2. 字体、字号、按钮与提示可读性还有优化空间

结论：部分成立。代码能证明存在大量 11px 到 13px 的密集 UI 和 32px 小按钮；但是否已经“不舒适”需要实际截图、缩放比例和长时阅读测试进一步验证。

影响范围：全产品长时间阅读和筛选体验。

代码证据：

- `src/styles/globals.css:8` 定义全局字体栈。
- `src/styles/tokens.css:2` 定义 `--font-sans`。
- `src/styles/layout.css:216` 到 `src/styles/layout.css:224` 中 `ui-button--sm` 是 32px 高、12px 字号，`ui-button--md` 是 40px 高、13px 字号。
- `src/styles/layout.css:261` 到 `src/styles/layout.css:269` 中 `ui-icon-button--sm` 是 32px。
- `src/styles/layout.css:645` 到 `src/styles/layout.css:658` 的 rail item 最小高度 36px、字号 13px。
- `src/styles/workbench-content.css:833` 到 `src/styles/workbench-content.css:839` 的朋友圈筛选字段标签为 11px。
- 全局样式扫描显示 `src/styles/layout.css` 和 `src/styles/workbench-content.css` 中存在多处 11px/12px/13px 字号。

补充判断：

- 当前很多控件仍满足项目最低目标尺寸，例如小按钮 32px 高、rail item 36px 高；问题重点不是“完全不合规”，而是阅读型产品的舒适性和高频操作层级。
- `docs/ui-development-standards.md:67` 到 `docs/ui-development-standards.md:80` 要求常规表单按钮至少 40px，toolbar/icon button 至少 32px，窄屏高频控件偏向 40px。

改进建议：

- 正文保持 14 到 16px。
- 辅助标签不低于 12px。
- 朋友圈筛选标签从 11px 提升到 12px 或 13px。
- 高频动作如“搜索/应用/导出”使用 40 到 44px 高按钮。
- `sm` 尺寸保留给低频次级操作。
- 不把 `--text-tertiary` 用作长段正文。
- 保留 tooltip，但宽屏优先显示 rail 文本标签。

验收标准：

- 筛选标签与次级说明不低于 12px。
- 主按钮高度不少于 40px。
- hover/focus/disabled 状态可区分。
- 正文与交互控件满足对比度要求。

测试用例：

- 暗色模式。
- 系统缩放 125% 与 150%。
- 键盘 tab 导航。
- 窄桌面宽度。
- 长中文文案折行。

估算工作量：小到中。

## M3. 错误态与空状态已有基础，但还不够可操作

结论：成立。项目已经覆盖 loading/empty/error 的基础状态，但很多状态只说明发生了什么，下一步动作不够具体。

影响范围：恢复能力和新手引导。

代码证据：

- `src/l3-molecule/search/SearchResultsPane.tsx:41` 到 `src/l3-molecule/search/SearchResultsPane.tsx:111` 覆盖 invalid、cancelled、error、未搜索、无结果。
- `src/l3-molecule/search/SearchResultsPane.tsx:73` 到 `src/l3-molecule/search/SearchResultsPane.tsx:83` 搜索失败只提供重试和清除，没有错误原因分类。
- `src/l3-molecule/search/SearchResultsPane.tsx:91` 到 `src/l3-molecule/search/SearchResultsPane.tsx:111` 空态只提示输入关键词或换关键词/放宽范围，没有推荐关键词、最近搜索或自动放宽策略。
- `src/l3-molecule/sns/SnsModule.tsx:143` 到 `src/l3-molecule/sns/SnsModule.tsx:165` 覆盖 error 和 partial，但 partial 仍是整体刷新。
- `src/l3-molecule/stats/StatsInspector.tsx:72` 到 `src/l3-molecule/stats/StatsInspector.tsx:84` 统计失败显示错误和重试。
- `src/l1-entry/pages/AnalyticsView.tsx:66` 到 `src/l1-entry/pages/AnalyticsView.tsx:68` 完整统计页失败只显示“请稍后重试”和重试。

改进建议：

- 空状态给出最近动作、示例查询或直接推荐下一步。
- 错误状态按网络、权限、无数据、解析失败、服务未就绪分组。
- 部分成功状态提供“刷新缺失部分”，不要只给全量刷新。
- 表单/筛选错误靠近字段显示，使用字段级 help 与 validateStatus 类似模式。

验收标准：

- 每类空状态至少给出一个下一步动作。
- 每类错误至少包含“原因 + 恢复动作”。
- 字段级错误靠近字段显示。
- 部分成功可针对缺失部分恢复。

测试用例：

- 空结果。
- 非法日期范围。
- 网络超时。
- 部分数据返回成功。
- 权限不足或服务不可用。

估算工作量：小到中。

## M4. 响应式与移动端已有基础，但仍显著偏桌面优先

结论：部分成立。代码确实有窄屏基础，但还没有形成完整移动任务策略。考虑到 chatlogUI 是 Tauri 桌面 app，这个问题应先定产品边界：移动端是只读/轻操作，还是完整支持。

影响范围：窄窗口、平板、未来移动 Web。

代码证据：

- `src/l2-coordinator/commander/workbenchLayout.ts:15` 到 `src/l2-coordinator/commander/workbenchLayout.ts:24` 在 `<720px` 下切为 `single`、隐藏标签、inspector 使用 drawer。
- `src/l2-coordinator/commander/workbenchLayout.ts:26` 到 `src/l2-coordinator/commander/workbenchLayout.ts:38` 在 `<980px` 下 conversation list + main，inspector 使用 drawer。
- `src/l3-molecule/workbench/WorkbenchFrame.tsx:34` 到 `src/l3-molecule/workbench/WorkbenchFrame.tsx:51` 对 drawer 做焦点进入与恢复。
- `src/l3-molecule/workbench/WorkbenchFrame.tsx:89` 到 `src/l3-molecule/workbench/WorkbenchFrame.tsx:120` 对 drawer 做 backdrop、dialog props、关闭按钮。
- `src/styles/workbench-content.css:440` 到 `src/styles/workbench-content.css:449` 搜索区在 `max-width: 720px` 下改成一列，并把范围/筛选按钮提升到 40px。
- `src/styles/workbench-content.css:864` 到 `src/styles/workbench-content.css:872` 朋友圈主体仍是纵向 flex，筛选和详情没有统一 sheet 策略。

改进建议：

- 明确移动端策略：如果主场景是桌面/Tauri，就在需求中声明“移动端为只读/轻操作”。
- 如果要支持移动端，搜索高级筛选、朋友圈详情、导出确认都应改为底部 sheet 或全屏子页。
- 不继续沿用桌面并排/纵向堆叠布局硬压到窄屏。

验收标准：

- 明确移动端支持级别。
- 关键任务在 `<720px` 下没有水平溢出。
- 筛选、详情、导出确认在窄屏不互相挤压。
- drawer/sheet 可关闭、不丢状态、焦点恢复。

估算工作量：中。

## L1. 国际化与本地化能力需要抽离

结论：成立。大量中文字符串直接写在组件和 commander 中，未见专门的 locale/messages 结构。

代码证据：

- `src/l1-entry/pages/WorkbenchView.tsx:91` 和 `src/l1-entry/pages/WorkbenchView.tsx:100` 直接写“搜索此会话”“会话详情”。
- `src/l1-entry/pages/SnsView.tsx:30` 与 `src/l3-molecule/sns/SnsModule.tsx:123` 直接写“朋友圈”。
- `src/l1-entry/pages/AnalyticsView.tsx:66` 到 `src/l1-entry/pages/AnalyticsView.tsx:68` 直接写“统计加载失败”“请稍后重试”“重试”。
- `src/l3-molecule/settings/SettingsLayout.tsx:23`、`src/l1-entry/pages/SettingsView.tsx:19`、`src/l1-entry/pages/SettingsView.tsx:82` 直接写“设置”相关文案。
- 文件扫描未发现专门的 `i18n`、`locale` 或 `messages.zh-CN.ts/messages.en.ts` 结构；匹配到的 `fetchNewMessages.ts` 只是业务文件名。

改进建议：

- 先抽离核心模块文案：工作台、搜索、统计、朋友圈。
- 新增 `messages.zh-CN.ts` 和 `messages.en.ts` 或等价的 typed message map。
- 先不做完整运行时切换也可以，但要把可见文案从组件里解耦出来。

估算工作量：中。

## L2. KPI 与埋点体系目前不像产品级能力

结论：部分成立。代码有大量诊断事件与 endpoint 事件，但当前审阅范围内没有看到面向任务完成率、点击路径、时间成本、导出成功率、错误恢复率的产品级 KPI 事件模型。由于项目有“避免 telemetry by default”的隐私原则，该问题应被设计为本地可选、隐私安全的 UX 质量事件，而不是远程遥测。

代码证据：

- `src/l4-atom/network/diagnosticEvents.ts` 定义诊断事件、durationMs 和脱敏序列化。
- `src/l2-coordinator/data-clerk/stores/useDiagnosticEventStore.ts` 存储诊断事件。
- `src/l3-molecule/common/DevConsole.tsx` 显示诊断事件数量和 duration。
- `src/l4-atom/network/endpointRunner.ts` 为 endpoint 调用记录 duration。
- 全局搜索未发现 `task completion`、`export.success`、`search.executed`、`timeToResult` 等产品任务级事件模型。

改进建议：

- 建立本地 UX KPI 事件模型，默认不外发。
- 事件围绕任务：搜索执行、筛选变更、打开结果、导出成功/失败、错误恢复、首次导入完成、AI 问答停止/完成。
- 事件只记录结构化状态与耗时，不记录聊天正文、路径、密钥。
- 未来若要远程同步，必须显式用户授权。

估算工作量：中。

## L3. 性能优化更适合做按模块懒加载，而不是泛泛优化

结论：部分成立。项目已经对 AI、图谱和图谱 canvas 做了懒加载，说明方向正确；但尚未看到首个结果可见时间、模块加载成本或长列表性能 KPI 的系统性计划。

代码证据：

- `package.json:31` 到 `package.json:44` 包含 `@react-three/drei`、`@react-three/fiber`、`@tanstack/react-virtual`、`d3-force-3d`、`three` 等较重依赖。
- `src/l1-entry/pages/AiWorkspaceView.tsx:1` 到 `src/l1-entry/pages/AiWorkspaceView.tsx:9` 使用 `lazy` 和 `Suspense` 加载 AI panel。
- `src/l1-entry/pages/GraphView.tsx:1` 到 `src/l1-entry/pages/GraphView.tsx:9` 使用 `lazy` 和 `Suspense` 加载 Graph module。
- `src/l3-molecule/graph/GraphVisualizePanel.tsx:1` 到 `src/l3-molecule/graph/GraphVisualizePanel.tsx:8` 懒加载 GraphCanvas。
- `src/l3-molecule/graph/GraphEngine.tsx:5` 使用 `d3-force-3d`，`src/l3-molecule/graph/GraphCanvas.tsx:1` 使用 Three/Fiber canvas。

改进建议：

- 延续按模块懒加载，而不是做抽象泛化优化。
- 把图谱、复杂统计、长列表、媒体预览作为性能重点。
- 设定首个结果可见时间、模块 JS chunk、长列表滚动稳定性、图谱 canvas 首帧时间作为跟踪指标。
- 对搜索结果、消息列表、媒体列表统一核对虚拟滚动和分页策略。

估算工作量：小到中。如果引入性能预算和 CI 报告则会上升。

## L4. 用户反馈闭环几乎为空，建议把 UX 改进转成可追踪 Issue

结论：成立。GitHub 当前没有 open issue 和 open PR。对仍在打磨中的产品，这意味着 UX 改进目前没有被远端 issue/PR 系统结构化追踪。

核对证据：

- 2026-06-13 通过 GitHub API 查询 `zhoumeng-creater/chatlogUI`：`open_issues_count = 0`。
- 2026-06-13 通过 GitHub Search API 查询 `repo:zhoumeng-creater/chatlogUI type:issue state:open`：`total_count = 0`。
- 2026-06-13 通过 GitHub Search API 查询 `repo:zhoumeng-creater/chatlogUI type:pr state:open`：`total_count = 0`。
- 远端 URL：`https://github.com/zhoumeng-creater/chatlogUI`。

改进建议：

- 把三份审计文档中的高优先级问题转成 GitHub issue。
- 建立 UX issue 模板，至少包含：用户任务、影响范围、代码证据、验收标准、隐私风险、验证方式。
- 建立 milestone，例如“搜索与导出闭环”“首次体验与阅读模型”“朋友圈/图谱控制层”。
- 每个 issue 保留文档反链，避免聊天记录成为唯一上下文。

估算工作量：小。主要是 issue 模板、milestone 和首批 issue 拆分。

## 汇总建议

第一批建议优先拆分为 4 个主线：

1. 搜索生产力：高级筛选、结果高亮、排序/分组、搜索结果导出。
2. 工作台信息架构：rail/toolbar/inspector 职责重新定义，减少重复入口。
3. 业务导出闭环：统一导出面板，先覆盖搜索、统计、朋友圈。
4. SNS 渐进披露：默认精简、筛选抽屉、chips、统一应用/重置/导出。

第二批作为并行质量线：

1. 统计解释与比较。
2. 字号与按钮密度调整。
3. 空/错状态下一步动作。
4. 响应式策略声明。

第三批作为基础建设线：

1. 文案国际化抽离。
2. 本地 UX KPI 事件模型。
3. 性能预算与按模块懒加载策略。
4. GitHub issue 模板和 milestone。

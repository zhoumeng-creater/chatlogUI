# 2026-07-15 搜索页布局与功能实施证据

## 结论

本轮实现按 `2026-07-11-search-page-layout-function-plan.md` 和
`2026-07-14-search-page-implementation-contract.md` 完成搜索页正式代码收口，覆盖搜索完整性、统一草稿、请求快照、三种浏览模式、精确上下文、业务导出、隐私、响应式、可访问性、性能与 sidecar 发布契约。

本文只把真实执行过的自动化、真实 React 路由和真实 Go/Rust 构建作为实施证据。HTML 原型、JS mock、合成 fixture、真实 sidecar 引擎测试和用户设备上的真实聊天数据库分别标注，不互相替代。

## 输入与裁决

- 产品与 UI 门槛：`docs/product-acceptance-standards.md`、`docs/ui-development-standards.md`。
- 用户批准计划：`docs/ux-issue-audits/2026-07-11-search-page-layout-function-plan.md`。
- 最终冲突裁决：`docs/ux-issue-audits/2026-07-14-search-page-implementation-contract.md`。
- 架构边界：L1 仅组合与委托；L2 独占状态和跨模块编排；L3 仅接收数据和回调；L4 仅封装原始 HTTP/Tauri 能力。
- sidecar 固定实现：`chatlog_alpha` 分支 `codex/search-contract-v2`，提交 `be771738055a3cd65f62f167bd4534f5c843444c`。

原计划副本与用户工作区文件的 SHA-256 均为
`4B42C22CA1CC5A381C545152DB7829A1D6487ADAE3231D4BD75DFC1E44D87204`，实施期间未改写用户计划。

## SEARCH-C01 至 SEARCH-C18 追踪矩阵

| 编号 | 已实现路径 | 自动化与浏览器证据 | 结论 |
| --- | --- | --- | --- |
| `SEARCH-C01` | `useSearchStore.ts`、`useSearchRequest.ts`、`useSearchWorkspaceCommander.ts`、`searchRequestSubmission.ts` | store/request 覆盖 draft、pending、applied、snapshot、replacement、取消、迟到响应和 last-known-good；状态矩阵覆盖 replacement error/cancel | 成功后才原子替换 applied/snapshot；失败、取消和迟到响应不污染稳定结果。 |
| `SEARCH-C02` | `GlobalSearch.tsx`、`useSearchRequest.ts`、`searchRequestRecoveryModel.ts`、`SearchReadinessNotice.tsx` | readiness E2E 证明 HTTP/DB 恢复期间搜索 POST 为 0；历史填入、偏好切换和零结果建议均不隐式请求 | 搜索、刷新和重试只由用户显式触发；自动累积错误后停止自动触发。 |
| `SEARCH-C03` | `searchDraftModel.ts`、`searchRequestSubmission.ts`、`workspaceRouteScope.ts` | unresolved current、空 selected、route loading/missing-chat 单元与 E2E | 当前会话无法确认时 fail-closed；加载中的可信 route ID 可暂时约束，确认缺失后只允许选择会话或显式改为全部。 |
| `SEARCH-C04` | `searchDraftModel.ts`、`unicodeCaseFold.ts`；sidecar `matcher.go` | NFKC、空白折叠、Unicode case fold、多词 AND、200 grapheme、20 unique term；Go/TS 全码点探针检查 `1,112,064` 个标量，case-fold 差异为 0 | 当前 Tauri 路径发送前冻结规范化关键词。Node Unicode 16 与 sidecar 固定 Unicode 表对新字符的 NFKC 版本差异属于跨入口版本风险；前端发送已规范化值，因此本路径不会发生二次请求漂移。 |
| `SEARCH-C05` | `api-docs/search.ts`、`fetchSearch.ts`、`fetchSearchDirectories.ts`、`useSearchDirectoryCommander.ts`、`SearchConditionBar.tsx`；sidecar contract/taxonomy/directory | 九类 taxonomy、type/subtype 精确映射、结构化 sender ID/display name、目录 cursor/revision、能力降级 | sender 只在 filter+directory 双能力就绪时出现；会话范围实质变化会清空依赖旧范围的 senderIds，同一语义范围不会误清。 |
| `SEARCH-C06` | `searchDateRange.ts`、`IntegratedDateRangeInput.tsx`、`searchRequestSubmission.ts` | 本机自然日、春秋 DST、Havana 跳过午夜、闰日、单边范围、反向范围、四快捷项、8/16 位粘贴 | 以 IANA 时区找到自然日第一个真实瞬间，并以次日边界减一秒形成 inclusive 请求；不使用固定 UTC 午夜或 24 小时加法。 |
| `SEARCH-C07` | sidecar engine/snapshot/cursor/database reader/HTTP；前端 v2 adapter/result window | sidecar 测试扫描 305 个会话并命中旧窗口外消息；inclusive since/until；121 条真实 total 的 50 条双向 cursor 页；sourceIndex、revision/stale、预算和 HTTP JSON | `exactTotal/completeScope` 由真实 Go 引擎证明，不由 mock E2E 推断；前端只有显式 v2 capability 满足时才作完整性承诺。 |
| `SEARCH-C08` | `searchResultWindowModel.ts`、`searchScrollAnchor.ts`、`SearchBrowseToolbar.tsx`、`SearchResultsPane.tsx` | 50 条窗口、range/gap 合并、前后/缺口局部错误、手动/自动/分页模式、缓存淘汰；返回与分页 A→B→A 的身份/焦点/像素偏差不超过 2px | 三种模式共享 applied snapshot；累积模式不用 `messages.length` 推导 cursor；分页保留页级阅读位置。 |
| `SEARCH-C09` | `useSearchRequest.ts`、`useSearchStore.ts`、`searchResultWindowModel.ts`；sidecar snapshot | revision conflict、stale snapshot、迟到 continuation/replacement、导出 revision conflict | revision 变化保留显式 stale 结果，不混入新数据；继续加载与全部导出暂停，只有用户刷新才 replacement。 |
| `SEARCH-C10` | `searchHistoryPreference.ts`、`useSearchPreferenceStore.ts`、`GlobalSearch.tsx` | 成功后记录、最多 5 条、30 天边界、选中只填 draft、关闭记忆清除、privacy 暂停但不永久删除 | 历史不是搜索触发器；隐私开启时不进入 DOM/可访问树且不新增持久化记录。 |
| `SEARCH-C11` | `searchResultPresentation.ts`、`searchHitIdentity.ts`、`searchNavigation.ts`、`SearchResultsPane.tsx` | 连续行、稳定 opaque identity、Enter/Space 单次激活、鼠标/触摸拖选不导航、文本可选 | 每行固定会话、发送者、分类、时间、安全片段、命中来源和媒体槽；箭头只作提示。 |
| `SEARCH-C12` | `searchNavigation.ts`、`searchReturnSnapshot.ts`、`searchScrollAnchor.ts`、`useChatCommander.ts` | 精确 history context、会话未在列表时按 ID 解析、missing anchor 近时恢复、行级错误重试、返回/分页像素锚点 | 导航失败只影响当前行；返回恢复 draft、applied、snapshot、ranges、active、焦点和滚动位置。 |
| `SEARCH-C13` | `searchExportTaskModel.ts`、`useSearchExportCommander.ts`、`SearchExportDialog.tsx`、`exportBusinessFile.ts`、Rust `business_export.rs` | 部分/当前页/全部快照、进度、取消、重试、revision、超量阈值、CSV formula 防护；Rust 路径预留、原子发布/备份恢复、清理重试、终态竞态与关闭恢复 | 全部导出独立读取冻结后端基线；部分导出冻结当前展示；相同目标路径互斥，一次性与流式导出共用事务；提交/取消保持线性化。 |
| `SEARCH-C14` | `searchRequestRecoveryModel.ts`、`useSearchRequest.ts`、`SearchReadinessNotice.tsx`、`ReadyWorkspaceShellView.tsx` | 33 个聚焦 readiness 测试；真实 `/search` 路由在 HTTP/DB 未就绪时仍可编辑，恢复后零自动 POST；状态矩阵覆盖首次、replacement、direction/gap/page/navigation/export 错误 | 服务未配置/启动中/启动失败、HTTP、DB、capability、timeout/参数/取消使用独立安全文案和就近恢复。 |
| `SEARCH-C15` | `SearchView.tsx`、搜索 L3 组件、`search.css`、`layout.css`、`AppTitleBar.tsx` | 1440/1280/980/720/390/320、root font 2×、dark、privacy、长中英文 visual snapshots；无水平溢出断言 | 320px 起可用；窄屏条件区重排且高频操作仍可达；200% 下使用 reflow 而不是缩小字体。 |
| `SEARCH-C16` | 条件栏、日期、浏览工具栏、结果行、弹层/对话框与帮助层 | IME、roving focus、Enter/Space、Ctrl+F、分层 Escape、焦点进入/返回、严格 axe 零违规矩阵 | 所有菜单/弹层由真实语义和焦点模型驱动；Tooltip 隐藏态不进入 axe 对比度计算。 |
| `SEARCH-C17` | privacy presentation/history/error/export 路径 | DOM 全属性/form-value canary；a11y；console/pageerror/requestfailed guard；无 copy action 且 Selection 只含脱敏文本；privacy visual 与导出测试 | 关键词、会话名、发送者、正文、路径不会进入普通 DOM、可访问名称、错误、日志或导出；页面无独立复制命令，用户选择到的也只是脱敏呈现。 |
| `SEARCH-C18` | 性能预算脚本、release provenance、Rust/Tauri、sidecar benchmark | 前端全门禁、搜索/运行时预算、visual/a11y、Go full/race/vet/bench、Cargo、Tauri build、sidecar 检查与安装包证据 | 当前代码质量和 Windows 本机构建可复现；正式 release 仍受远端 sidecar pin/校验来源约束，见“发布边界”。 |

## 后端完整性证明

### 完整范围与窗口

- `TestEngineSearchScansCompleteScopeAndOldMessages` 构造 305 个合成会话，只在第 305 个会话的旧消息中放置命中；引擎扫描全部 305 个会话并返回该命中。
- `TestEngineSearchCombinesScopeCategorySenderAndInclusiveDates` 同时验证会话、九类 taxonomy、sender 和 inclusive since/until；起点与终点消息均保留，边界外消息排除。
- 冻结快照保存 `totalCount`、`sourceIndex`、revision 和双向 opaque cursor；后续页不重扫、不受新数据插入影响。
- 搜索语料只使用明确可见、安全字段；原始 XML、本机路径、URL、MD5、坐标和身份字段不作为 fallback 搜索正文。

### 本轮 Go 验证

| 命令 | 结果 |
| --- | --- |
| `go test ./... -count=1` | 通过 |
| `go vet ./...` | 通过 |
| `go test -race ./... -count=1` | 通过 |

### 本轮 Go benchmark

环境：Windows amd64，13th Gen Intel Core i7-13700HX。

| Benchmark | 结果 |
| --- | --- |
| `BenchmarkSearchFirstPage50-24` | `27,847,218 ns/op`，完整扫描并冻结 1,280 个命中，只返回前 50 条 |
| `BenchmarkSearchPage50JSON-24` | `350,114 ns/op` |
| `BenchmarkSearchV2Response50-24` | `261,997 ns/op` |

benchmark 是本机证据，不是跨设备 SLA。发布门槛由浏览器 fail-closed 性能预算和 sidecar 测试共同承担。

## 状态、交互和真实路由证据

搜索浏览器套件覆盖：

- idle、首次 loading、success、empty、first error、replacement error、cancelled、dirty draft；
- direction/gap/page error 与局部 retry；
- stale revision、navigation error、export progress/error/cancel；
- 当前会话 route loading、确认缺失和显式恢复；
- 手动累积、自动累积、替换分页、前后/缺口、浏览偏好记忆；
- IME、历史填入、Enter/Space、Escape 分层、焦点恢复、文本拖选和像素锚点；
- 隐私、深色、200%、390px、320px 和长内容。

最终冻结源使用单 worker 串行复跑，避免共享 5030/5173 fixture 服务相互污染：搜索主套件、状态矩阵、readiness、privacy、语义发现和隐私诊断合计 `50 / 50`；跨页 core 为 `28 / 28`；无障碍为 `16 / 16`；视觉快照在非 update 模式为 `7 / 7`。

浏览器使用合成消息和 JS mock server，不含真实聊天数据。它证明 React/L2/L4 的状态与 wire adapter；Go 引擎/HTTP 的完整性由独立 sidecar 测试证明。当前仓库没有把真实用户数据库复制进 fixture 或日志。

本轮没有把 JS mock 误写成“真实 sidecar E2E”。可行性审计确认：若未来需要补可执行文件接缝 smoke，可用隔离目录、64 位全零合成 key 和明文 v4 SQLite fixture 启动真实 `serve`，再由 `fetchSearchV2({ serviceBaseUrl })` 读取；这不需要真实微信数据或真实密钥。现有 runner 固定占用 mock 5030，且仓库尚无该 opt-in fixture runner，因此本轮用“真实 Go reader/engine/HTTP + 前端 adapter/真实 React 路由 + 真实二进制/Tauri 构建”的分层证据关闭核心正确性，不宣称已执行真实进程搜索接缝。

## 视觉与页面评分

最终快照包括：

- `search-success-desktop-chromium-win32.png`
- `search-default-390-chromium-win32.png`
- `search-default-320-chromium-win32.png`
- `search-dirty-draft-desktop-chromium-win32.png`
- `search-loading-desktop-chromium-win32.png`
- `search-empty-desktop-chromium-win32.png`
- `search-first-error-desktop-chromium-win32.png`
- `search-privacy-on-desktop-chromium-win32.png`
- `search-success-dark-desktop-chromium-win32.png`
- `search-long-content-200-percent-chromium-win32.png`
- `search-long-content-200-percent-result-chromium-win32.png`

按产品验收标准 10 项各 0–2 分评分：

| 项目 | 分数 | 依据 |
| --- | ---: | --- |
| 主目标清楚 | 2 | 标题、说明、关键词和唯一主按钮在首屏形成稳定路径。 |
| 视觉层级 | 2 | 关键词、统一条件栏、结果工具栏、连续结果行四层明确。 |
| 留白稳定 | 2 | 使用项目 token rhythm，无装饰性卡片堆叠。 |
| 对齐 | 2 | 桌面和窄屏均有一致轴线；条件按断点重排。 |
| 控件密度 | 1 | 桌面克制；200% 下工具栏主动纵向展开，信息密度仍偏高但可操作。 |
| 按钮层级 | 2 | 每区最多一个主动作，其余使用 ghost/弱边框命令。 |
| 产品文案 | 2 | 不暴露 endpoint、原始 HTTP 或内部错误；原因与下一步并列。 |
| 状态设计 | 2 | loading/empty/error/disabled/success/stale/local error 均有专用位置。 |
| 滚动 | 1 | 列表拥有内部滚动和像素锚点；200% 下首屏可见结果数量有限但无不可达操作。 |
| 深色/隐私 | 2 | 结构不塌陷，隐私遮罩和对比度保持完整。 |
| **总分** | **18 / 20** | 高于 `16 / 20` 门槛，主任务、隐私和错误态均非 0。 |

## 最终复审与基础设施收口

- 独立导出复审发现 `commit_pending` 仍保留 ACK 重试摘要时，页面会把非空 `result` 误报为“导出完成”。现只有 `task.status === "completed"` 才发布成功提示；真实 `SearchView` 组合测试同时覆盖 pending 不显示和 completed 正常显示。
- 不可逆提交期间开启隐私模式时，可编辑 selection 会被锁闩清零，但已经写入文件的真实策略仍在冻结 `task.selection`。Dialog 现按冻结任务如实显示“未脱敏导出”，并明确隐私模式不会追溯修改当前文件；真实 Coordinator + 生产 Dialog 组合测试覆盖该分歧状态。
- 搜索重构遗漏的 `workspace-scope` coach anchor 已恢复；core 浏览器测试覆盖引导出现、关闭持久化，以及引导关闭后筛选/分页仍可操作。
- 精确导航终审把闭环断言收紧到目标 `data-message-id=history-context:1101`，不再只接受任意命中行高亮；core、Enter 和 Space 三条真实路由用例定向复跑 `3 / 3` 通过。
- Playwright HTML 报告曾写入 Vite 监听目录并触发测试页面 reload，造成组件在断言后消失的伪失败。`vite.config.ts` 现忽略 `output`、`test-results` 和 `playwright-report`，并有 governance 回归测试；修复后 core `28 / 28`、visual 非 update `7 / 7`。
- 媒体“打开原始资源”原先虽然拥有 `role="dialog"`，却内联排在多条媒体记录之后，窄屏点击首项时不在视口。现复用统一 `SpringModal`，视觉测试增加 `toBeInViewport`，无障碍套件验证焦点捕获/恢复和 Escape，最终快照显示居中且不暴露本地路径。

## 隐私与导出安全

- 所有浏览器数据使用 `Synthetic`/唯一 canary，不使用真实聊天内容。
- 搜索历史只在成功快照后记录；隐私模式暂停新增并从 DOM、可访问树和表单值隐藏关键词。
- 安全错误只传枚举/固定文案，不回显关键词、cursor、路径或后端原文。
- CSV 对 `= + - @` 等公式前缀做防护；Markdown/JSON 也使用安全 presentation，而不是原始私密结构。
- Rust 导出使用同目标规范化 reservation、partial、backup、atomic rename 和显式 commit；取消、异常和应用关闭尝试恢复原文件。
- 清理失败保留 `CleanupPending`，关闭窗口被阻止并向 UI 只发送固定安全代码；用户可关闭占用文件后重试。
- 终态幂等历史最多 64 条，淘汰后 fail-closed；未知 session 不会误删文件。

## 性能与构建产物

搜索浏览器预算：

- 默认首个结果预算：`1,200 ms`。
- 搜索性能 fixture：50 条可见结果，独立运行时指标文件由 `perf:search:capture` 生成并由脚本 fail-closed 校验。
- 运行时性能同时覆盖 1,000 条消息虚拟列表和图谱基线；搜索预算不以缩减结果数通过。

最终本机捕获：

| 指标 | 实测 | 预算 |
| --- | ---: | ---: |
| 综合运行时搜索首结果 | `65 ms` | `1,200 ms` |
| 独立 50-hit 搜索首结果 | `76 ms` | `1,200 ms` |
| 1,000 条消息初始渲染 | `203 ms` | `1,600 ms` |
| 图谱画布首个可见帧 | `1,050 ms` | `2,500 ms` |

最终 Search lazy chunk 为 JS `152,260 B` / gzip `45,294 B`，CSS `51,781 B` / gzip `6,497 B`；主应用 JS 为 `811,310 B` / gzip `239,966 B`。所有体积门禁通过。

Vite 会单独生成 Search chunk；最终 chunk 大小和首结果实测写入“最终源冻结门禁”表。bundle 体积警告不等于搜索页性能失败，图谱/Three.js 大 chunk 仍按独立产品化门槛治理。

## 发布边界

本地使用 `be771...` 后端根包重建的忽略二进制：

- 文件：`chatlog_alpha-x86_64-pc-windows-msvc.exe`
- 长度：`37,366,272` bytes
- PE header：`MZ`
- SHA-256：`D3FF763D3ADC919073502BF40B2D37146C36EB0F1EFBE930CC821964EBF1CBC0`
- `serve --help` 明确公开无界面服务和默认 `127.0.0.1:5030`；缺少 dataKey 时 fail-closed，不写入私密配置。

该本地二进制被 `.gitignore` 排除，且 manifest 故意不把它当发布证据。

`pnpm release:check:sidecar` 的 check mode 可检查本地 Windows 二进制并为其他平台使用占位，因此只用于编译检查。`pnpm release:check:sidecar:release` 必须取得 manifest 声明的干净 Git checkout 或有 SHA-256 的批准 artifact；当前 checkout 缺失且 manifest 没有本地 artifact SHA，因此按设计失败。不得把 check mode、任意 `SIDECAR_SOURCE_DIR` 或未校验本地二进制描述为正式 release provenance。

macOS Intel、macOS Apple Silicon 和 Linux x64 仍未获得 sidecar provenance、签名/公证和平台 smoke；本轮只验证 Windows x64 本机构建，不作跨平台发布承诺。

最终 Windows 本机构建产生并盘点两个未提交安装包：

| 类型 | 大小 | SHA-256 |
| --- | ---: | --- |
| MSI | `19,947,520` bytes | `21729ECC9D3BA3D1CFB8E15E03653C6DBE4F8D0D58E27DA7BCD7FE41242F468E` |
| NSIS | `14,174,686` bytes | `E96BE71198A1F114C2E8E2AD710D2F4DE81D587F021BA7301B47E5B8F9F66E6B` |

这证明 Windows x64 本机构建链和 bundle inventory 可用，不等同于正式签名发布或跨平台 smoke。

## 最终源冻结门禁

本节只记录所有代码修复完成后的最后一次运行；较早的局部绿结果不替代这里。

| 门禁 | 最终结果 |
| --- | --- |
| `git diff --check` | 通过；只有 Git 的 CRLF 未来转换提示，无 whitespace error |
| `pnpm fixtures:check` | 通过，检查 `76` 条 route entries |
| `pnpm lint` | 通过，`0` warning / `0` error |
| `pnpm typecheck` | 通过 |
| `pnpm test` | `297 / 297` files，`1,549 / 1,549` tests |
| `pnpm build` | 通过，`3,123` modules；Search JS/CSS 均在预算内 |
| `pnpm verify` | 通过（lint + typecheck + test + build） |
| 搜索页、状态矩阵、readiness、privacy、语义/诊断浏览器套件 | `50 / 50` 通过 |
| `core.spec.ts` | `28 / 28` 通过 |
| `pnpm e2e:a11y` | `16 / 16` 通过 |
| `pnpm e2e:visual`（非 update） | `7 / 7` 通过；搜索、长内容、Setup、AI 和媒体模态框快照均匹配 |
| `advanced.spec.ts` | `4 / 6`；两条仅因既有 AI `SemanticIndexCenter` ready-state 基线冲突失败，见下节 |
| `pnpm perf:runtime:capture` / `pnpm perf:search:capture` / `pnpm perf:budget` | 通过；`65 / 203 / 1,050 ms`，独立 50-hit 为 `76 ms`，全部 bundle 预算通过 |
| sidecar `go test` / `go vet` / `go test -race` / benchmark | 通过；完整性、cursor、inclusive date、HTTP JSON 和竞态证明见上文 |
| `cargo fmt --check` / `cargo test` | 通过，`57 / 57` tests |
| `pnpm tauri build` / `pnpm release:collect:tauri-smoke` | 通过；MSI + NSIS 共 `2` 个 Windows x64 bundle |
| `pnpm release:check:sidecar` | check mode 通过；Windows SHA 匹配，本模式不是发布证据 |
| `pnpm release:check:sidecar:release` | 按设计退出 `1`：source path/checkout 缺失且 manifest 无 release SHA-256 |

## 已知非搜索基线

完整 `advanced.spec.ts` 最终运行 `4 / 6`。两条失败均停在相同前置断言：当前 AI ready 状态按 `AiPanel` 主任务设计隐藏 `SemanticIndexCenter`，旧测试仍要求它在 ready 时可见；其中一条随后还承担重建/删除的唯一破坏性覆盖。搜索实现没有删除这些断言或用跳过/弱化制造全绿。该问题单独记录为 AI 模块基线与索引管理可达性回归，不改变搜索页 C01–C18 结论，但在全产品 release gate 中仍应作为 AI 模块待办处理。

## 隔离与提交边界

- 前端实现位于 `codex/search-page-plan-implementation`，未直接写入 `dev/master`。
- sidecar 实现位于 `codex/search-contract-v2`，未修改原后端工作区中用户的未跟踪 `cmd/chatlog/cmd_serve.go`。
- 原后端工作区该用户文件最终仍为未跟踪状态，SHA-256 保持 `F19203A557DFB90B4C4C531B325445A3C5CD86FE5B5769ADCD100D985CB82B47`。
- `task_plan.md`、`findings.md`、`progress.md`、`output/`、本地 sidecar 二进制和构建目录保持忽略，不进入提交。
- 不推送远端、不创建 PR；远端动作需要用户明确授权。

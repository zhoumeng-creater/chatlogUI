# 第九步：Settings 与配置收敛修复计划

计划性质：代码修复计划。本文只描述修复范围、顺序、文件边界、测试、验收和证据要求，不放完整生产代码，也不把代码片段当成实现方案。

## 1. 目标结论

第九步承接前八步的当前基线：服务 base URL/readiness、隐私展示、UI 基础控件、SetupCenter 三路径、Workbench 信息架构、Search 闭环、独立页面、模块任务可靠性已经完成到可以依赖的程度。现在要收敛的是 Settings 本身的产品职责。

Settings 的目标定位是：应用级偏好、隐私/诊断入口和配置状态摘要。它不再承担服务连接主流程，不再提供一套与 AI 工作台不同步的模型配置表单，也不再把返回动作固定到 Workbench。

本步骤覆盖问题：

| 问题 ID | 本步骤处理方式 |
| --- | --- |
| P1-06 Settings AI 与 Semantic AI 配置分裂 | 取消或降级 Settings 内可编辑的全局 AI provider/endpoint/model 表单；真实 semantic provider、endpoint、model、API key、索引参数由 AI 工作台的 `SemanticSetupCenter` 负责。Settings 只展示安全摘要和前往 AI 配置的入口。 |
| P1-11 Settings 返回语义固定 | 建立来源感知的 Settings 返回契约：从 Setup、AI、Graph、更新/错误恢复、标题栏或直接 URL 进入时，返回到合理上下文，而不是一律 `/workbench`。 |
| IA-08 Settings 不应进入 Workbench rail | 保护当前 Step 05/07 基线：Settings 仍是 `/settings` 应用级页面，不进入 ready workspace rail，不作为 Workbench inspector 或 toolbar 模块。 |
| P0-01 Settings 隐私展示 | 保护 Step 02 的路径/key 脱敏成果，并覆盖 Settings/About/diagnostics/AI 配置入口新增展示面，确保不泄露 raw path、`wxid`、API key、token、聊天内容、诊断原文。 |
| P1-03 / SC-02 Developer/Diagnostics 默认密度 | Settings 可保留高级诊断和开发者模式开关，但诊断明细要渐进披露；普通 Settings 首屏不应像开发者控制台。 |

第九步完成后，用户应能回答：

- 我在 Settings 里改的是应用偏好还是服务/AI 工作流配置。
- 我从哪里进入 Settings，就能回到哪里继续任务。
- 如果要重连本地聊天服务，应该回 Setup；如果要配置语义 AI，应该去 AI 工作台。
- 隐私模式、开发者模式、诊断导出和更新检查都能看懂状态和恢复动作。

## 2. 参考输入与工作流

| 输入 | 本计划使用方式 |
| --- | --- |
| `docs/next-repair-baseline-overall-repair-plan.md` | 阶段 7 定义 Settings 与配置收敛，覆盖 P1-06、P1-11、IA-08、P0-01。 |
| `docs/next-repair-baseline-ux-ledger.md` | P1-06、P1-11 和 Settings 页面级结论的事实来源。 |
| `docs/next-repair-baseline-inspector-architecture.md` | Settings 是应用级页面，不属于 Workbench rail；AI 配置应由 AI 页面内设置或深链承载。 |
| `ux-micro-affordance-opportunities.md` | Settings/Privacy/Developer 全局控件必须有隐私安全 tooltip、disabled reason、键盘可读状态和短文案。 |
| `docs/product-acceptance-standards.md` | Settings 必须覆盖 loading/empty/error/disabled/success，不能暴露私密信息，页面评分最低 16/20。 |
| `docs/ui-development-standards.md` | Settings 表单、分类、按钮、诊断 disclosure、窄屏布局必须满足 target size、Field ARIA、焦点和响应式要求。 |
| Step 01 到 Step 08 计划与进度 | 当前基线来源，避免把已完成的服务连接、隐私、UI atoms、Workbench/route、Search、module closure 重复写成本步骤主任务。 |
| `.specify/memory/constitution.md` | 本步骤不得改写 sidecar 契约，不得破坏 L1/L2/L3/L4 边界，必须记录验证证据。 |
| `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/*` | Settings/privacy/readiness、semantic optional、diagnostics package 和测试数据策略的产品化约束。 |
| `docs/release/privacy-audit.md` | 后续实现不能引入发布隐私审计阻塞项。 |

使用的工作流要求：

- 规划与实现必须保留 `planning-with-files` 记录。
- 实现阶段必须先写红灯测试或等价失败证据，再做修复。
- 每个独立修复单元必须短中文提交，并在通过对应验证后及时推送，不等到全部代码修完再一次性提交/推送。
- 若实现触碰 `src-tauri/`、CSP、capabilities、sidecar 启动、updater release 配置，必须升级为 sidecar/release 验证；本计划默认不需要触碰这些文件。

## 3. 当前开发进度事实

### 3.1 可依赖基线

| 前置步骤 | 当前可依赖结果 |
| --- | --- |
| Step 01 | 服务地址和 readiness 已收敛为 Setup/active connection 真源。Settings 不能再另存一套 base URL 或 sidecar port 配置。 |
| Step 02 | 普通 UI 隐私展示、开发者入口默认隐藏、Settings 数据路径安全摘要、Rust 配置错误脱敏、诊断 fail-closed 已有基础。 |
| Step 03 | L4 UI atoms、Field ARIA、overlay/focus、Tooltip、DisabledReason 具备可复用基础；Settings 不能新增 ad hoc 控件模式。 |
| Step 04 | SetupCenter 拥有服务连接、数据目录、高级手动配置、HTTP/DB readiness、诊断 disclosure 的主流程。Settings 只能链接或摘要，不复制流程。 |
| Step 05 | Settings 和 Developer 不属于 ready workspace rail；Settings 保持应用级入口。 |
| Step 06 | Search 已有上下文返回能力和 privacy-safe route 约束，可作为 Settings return context 的参考。 |
| Step 07 | `/search`、`/analytics`、`/media`、`/sns`、`/ai`、`/graph` 已是 canonical primary workspace routes；Settings 不在这些 primary routes 中。 |
| Step 08 | AI/Graph/Media/SNS/Analytics 的任务闭环与请求可靠性已补齐；Settings 不应重新打开这些模块可靠性问题，只处理配置入口和返回上下文。 |

### 3.2 当前源码缺口快照

| 区域 | 当前源码事实 | 第九步应处理 |
| --- | --- | --- |
| Settings 返回 | `SettingsView.tsx` 的返回按钮固定 `navigate("/workbench", { replace: true })`，文案固定“返回工作台”。 | 建立 L2 source-aware return view model，L1 只渲染返回动作。 |
| 标题栏进入 Settings | `useAppShellCommander()` 使用 `navigate("/settings")`，不记录来源。 | 标题栏、错误恢复、AI/Graph/Update 深链都应带安全来源，不序列化 private chat/focus。 |
| Settings 分类 | `SettingsLayout` 仍有 `AI 模型` 分类。 | 调整为不会误导的分类，例如“AI 与语义”摘要或移至相关入口；不能继续作为实际 semantic 配置表单。 |
| Settings AI 表单 | `AIModelSettings.tsx` 可编辑 `aiProvider`、`aiEndpoint`、`aiModel`，但 AI 工作台真实配置由 `SemanticSetupCenter` 和后端 semantic config 负责。 | 用摘要/跳转替代编辑表单；迁移或清理 legacy UI-only AI fields。 |
| Settings state | `SettingsState` 仍包含 `aiProvider`、`aiModel`、`aiEndpoint`、`aiCredentialConfigured`。 | 明确 legacy 迁移策略，不能把旧 UI settings 当 semantic 后端配置。 |
| Data settings | `DataSettings` 已显示 safe path summary，data key disabled，目录选择仍通过 setup commander 写入 `wxDataPath`。 | 收敛为数据/服务摘要和“前往设置中心修改”，避免形成第二条服务连接流程。 |
| Advanced settings | `AdvancedSettings` 已有 developerMode toggle 和“诊断仍脱敏”说明。 | 保留并强化状态、恢复、默认隐藏和测试；developerMode 不得关闭 redaction。 |
| About/Diagnostics | `AboutSettings` 直接渲染完整 `DiagnosticsPanel`。Setup 已有 `SetupDiagnosticsDisclosure`。 | Settings/About 默认只显示简短安全摘要；诊断明细、复制、导出由用户主动展开。 |
| E2E 覆盖 | 现有 E2E 只验证 `/settings` 渲染、About/diagnostics copy、无明显隐私泄露。 | 新增返回上下文、AI 配置归属、诊断 disclosure、窄屏/键盘/a11y/visual 验收。 |

## 4. 用户视角验收问题

| 问题 | 第九步验收答案 |
| --- | --- |
| 这个页面帮用户完成什么真实任务？ | 改应用偏好、查看配置安全摘要、开启/关闭隐私和高级诊断入口、进入正确的 Setup 或 AI 配置流程、导出脱敏诊断。 |
| 第一次进入 Settings 应先做什么？ | 用户能看见当前分类、当前配置状态和下一步入口；不会被完整诊断表或无效 AI provider 表单淹没。 |
| 同一任务是否有重复入口？ | 服务连接只有 Setup 主流程；semantic AI 配置只有 AI 工作台主流程；Settings 只做摘要和入口。 |
| 出错或后悔时能否恢复？ | 返回动作恢复进入来源；保存失败、更新失败、诊断阻止导出都有普通语言原因和下一步。 |
| 是否因为缺相邻功能而像坏了？ | Settings 的每个分类都有 loading/empty/error/disabled/success 或明确“请前往 Setup/AI 工作台”的恢复入口。 |
| 隐私模式是否仍可理解？ | 隐私模式遮蔽路径、身份、endpoint 和诊断敏感值，但保留 aggregate status、配置是否存在、索引/服务 readiness。 |

## 5. 非目标

- 不重做 SetupCenter 服务连接、外部服务 URL、HTTP/DB readiness 或高级手动配置主流程。
- 不修改 `chatlog_alpha` API 契约，不改 sidecar 启动参数，不扩大 CSP/capabilities。
- 不把 Settings 放回 Workbench rail、toolbar 或 inspector。
- 不把 Settings 做成 DeveloperTools 或 DevConsole 的替代主页。
- 不新增远程 telemetry、自动诊断上传或默认远程 AI 调用。
- 不在本计划里实现完整视觉抛光阶段；Settings 视觉问题只修到职责收敛所需的可用、可访问、响应式和隐私标准。
- 不把完整生产代码粘到计划文档中。

## 6. 目标产品契约

### 6.1 Settings 页面职责

| 分类/区域 | 目标职责 | 禁止职责 |
| --- | --- | --- |
| 数据与服务 | 展示当前服务/数据配置的隐私安全摘要；提供“前往设置中心修改/重新连接”的入口。 | 直接保存第二套 base URL、sidecar port、data key，或绕过 Setup readiness。 |
| 外观 | 主题、字体、窗口材质、减少动画等应用偏好。 | 修改业务数据源、AI provider、诊断 redaction 策略。 |
| AI 与语义 | 展示 semantic 配置/索引状态摘要；提供进入 AI 工作台配置或打开语义设置的入口。 | 编辑 UI-only `aiProvider/aiEndpoint/aiModel` 并暗示会影响 semantic QA/search。 |
| 隐私与诊断 | 展示隐私模式状态、开发者入口开关、安全诊断 disclosure、复制/导出脱敏诊断。 | 默认展示完整诊断明细，或让 developerMode 关闭脱敏。 |
| 关于与更新 | 版本、更新检查、开源/许可、release caveat 简述。 | 把 release/debug 细节扩展成普通用户首屏主要任务。 |

实际实现可以保持现有五个大类，也可以合并为“数据与服务 / 外观 / AI 与语义 / 隐私与诊断 / 关于”。无论采用哪种 UI 分类，必须满足上面的职责边界。

### 6.2 来源感知返回契约

Settings 返回动作由 L2 计算，L1 只渲染 `label`、`target`、`replace` 和 `onBack`。

允许的来源必须是安全枚举，不允许把 raw chat id、contact name、message text、focus label、local path、query、token 写进 URL 或诊断。

| 进入来源 | 推荐进入方式 | 返回目标 |
| --- | --- | --- |
| 标题栏设置按钮 | `/settings?source=app-shell&return=<safe-route-key>` 或 location state | 返回最近 primary/workbench route；没有安全来源时回 `/workbench` 或 Setup gate。 |
| Setup/首次配置 | `/settings?source=setup` | 返回 `/`，保留 Setup 当前路径和 readiness，不进入空 Workbench。 |
| AI 工作台 | `/settings?source=ai` 或 `/settings?source=ai&section=semantic` | 返回 `/ai`，若实现支持则回到 semantic setup/summary 位置。 |
| Graph 或其他模块错误恢复 | `/settings?source=graph`、`source=media` 等安全枚举 | 返回对应 canonical route，不把上下文私有值写入 URL。 |
| 更新/关于 | `/settings?section=about&source=update` | 返回进入前页面，或停留在 Settings About；更新失败不强迫打开开发工具。 |
| 直接打开 `/settings` | 无来源 | 返回到当前 ready gate 允许的默认页面；DB 未就绪时回 Setup。 |

若实现决定使用 `location.state` 而不是 query，也必须有刷新后的安全 fallback。不要依赖浏览器 history 中的私密 URL 参数。

### 6.3 AI 配置归属契约

真实 semantic workflow 配置只属于 AI 工作台：

- `SemanticSetupCenter` 负责 Embedding、Rerank、Chat、base URL、Ollama URL、DeepSeek/GLM key、连接测试、保存、索引参数和高风险确认。
- Settings 只显示“语义配置状态”和“前往 AI 工作台配置/打开语义设置”的入口。
- Settings 不再保存或展示会让用户误解为 semantic 生效的 `aiProvider`、`aiEndpoint`、`aiModel` 编辑表单。
- 旧的 browser settings 中的 `aiProvider`、`aiEndpoint`、`aiModel`、`aiCredentialConfigured` 必须有迁移策略：要么清理为 legacy fields 并停止展示，要么改名为不影响 semantic 的 UI 偏好。不能静默写入后端 semantic config。
- API key 和 provider credential 仍不得保存在 UI settings localStorage。连接测试和保存仍走 semantic 后端契约。

### 6.4 数据与服务归属契约

服务连接、数据目录、data key、外部服务 URL、HTTP/DB readiness 属于 Setup 主流程。Settings 只可：

- 展示“已选择微信数据目录 / 未配置 / 本机服务已连接 / DB 未就绪”等安全摘要。
- 提供“前往设置中心修改”“重新检查服务状态”这类入口。
- 显示当前 active service 的安全摘要，如本机服务端口，不显示 path/query/key。

Settings 不可：

- 保存第二套 base URL、sidecar port、data key 或外部服务地址。
- 绕过 `deriveWorkbenchAccess()` 或 ready workspace gate。
- 在 DB 未就绪时提供“打开空工作台”的替代入口。

### 6.5 诊断与开发者入口契约

- `developerMode=false` 是默认状态；标题栏开发者控制台、开发者模块、高级 DB/API 工具默认不可见。
- `developerMode=true` 只打开本机高级诊断入口，不关闭 redaction，不允许复制/导出未脱敏诊断。
- Settings/About 默认不展开完整 `DiagnosticsPanel` 明细。默认状态只显示“脱敏诊断可用/已阻止导出/最近错误数量/更新状态”等简短摘要。
- 用户主动展开后，复用现有 `DiagnosticsPanel` 的 copy/export/redaction gate。
- 诊断展开控件必须支持键盘、`aria-expanded`、焦点可见和 disabled reason。

## 7. 推荐实现任务

### Task 1：先写红灯契约测试

目标：固定当前待修复事实，防止实现时只改 UI copy 而没有闭环。

优先测试：

| 测试文件 | 断言 |
| --- | --- |
| `src/l2-coordinator/commander/settingsNavigation.test.ts` | 根据 `source`、当前 route、ready gate 计算返回 label/target；不允许 raw chat/focus/query/path 进入目标 URL。 |
| `src/l2-coordinator/commander/settingsConfigOwnership.test.ts` | Settings AI 摘要不把 legacy `aiEndpoint` 当 semantic config；Data/service 只产生 Setup 入口，不产生独立 base URL。 |
| `src/l2-coordinator/data-clerk/stores/settingsMigration.test.ts` | 旧 UI AI fields 被安全迁移或停止展示；secret stripping 和 developer default false 不回退。 |
| `src/l3-molecule/settings/AIModelSettings.test.tsx` 或替代新组件测试 | Settings 不渲染 provider/endpoint/model 编辑表单；渲染语义配置状态和前往 AI 设置动作。 |
| `src/l3-molecule/settings/DataSettings.test.tsx` | 数据路径仍不泄露；入口文案指向 Setup；不显示 data key 或 sidecar URL 明文。 |
| `src/l3-molecule/settings/AboutSettings.test.tsx` | 默认不显示完整诊断 lines；展开后出现复制/导出；redaction blocked 时按钮有 disabled reason。 |
| `e2e/specs/core.spec.ts` 或新 settings spec | `/settings` 从 Setup、AI、Graph、标题栏进入后返回正确上下文。 |
| `e2e/specs/a11y.spec.ts` | Settings 分类、返回、诊断 disclosure、AI 配置入口键盘可达且无严重 a11y 问题。 |

验收：红灯测试在当前源码下能失败在真实缺口上：固定返回 Workbench、AI 模型表单仍可编辑、诊断默认展开等。

### Task 2：建立 L2 Settings navigation / return context

文件范围：

| 文件 | 责任 |
| --- | --- |
| 新增 `src/l2-coordinator/commander/settingsNavigation.ts` | 纯 view model：解析安全来源、当前 location、ready gate，输出 return label/route/replace 和 Settings 初始分类。 |
| 新增 `src/l2-coordinator/commander/settingsNavigation.test.ts` | 覆盖 Setup、AI、Graph、Update、titlebar、direct URL、unsafe params、DB not ready fallback。 |
| 修改 `src/l2-coordinator/commander/useAppShellCommander.ts` | `openSettings` 带安全来源或 location state；不序列化私密上下文。 |
| 修改 `src/l2-coordinator/commander/useSettingsPageCommander.ts` | 返回 L2 计算的 `returnAction`、初始分类、来源说明；L1 不写业务路径。 |
| 修改 `src/l1-entry/pages/SettingsView.tsx` | 返回按钮使用 commander 输出；文案随来源变化，例如“返回 AI 工作台”“返回设置中心”“返回上一页”。 |

要求：

- 允许的 return route 只包括 `/`、`/workbench`、`/search`、`/analytics`、`/media`、`/sns`、`/ai`、`/graph` 和 `/settings` 内部 section。
- 禁止把 `chat`、`focus`、message id、query、路径、API key、local service URL query 写入 return 参数。
- 直接打开 `/settings` 时必须安全 fallback：如果 DB ready，返回 `/workbench`；如果未配置或 DB 未就绪，返回 `/`。
- browser history 可用时可以使用 `navigate(-1)`，但必须有 deterministic fallback，测试不能依赖不可控 history。

建议提交：`收敛设置返回上下文`。提交前至少运行 `settingsNavigation` focused tests、`pnpm typecheck`、`pnpm lint`，然后及时推送。

### Task 3：收敛 Settings 分类与页面信息架构

文件范围：

| 文件 | 责任 |
| --- | --- |
| `src/l2-coordinator/api-docs/settings.ts` | 调整 `SettingsCategory`，或新增兼容 category/view type；不要让类型继续鼓励错误职责。 |
| `src/l3-molecule/settings/SettingsLayout.tsx` | 分类标签和图标收敛；当前分类有 `aria-current` 或等价语义；分类按钮 target size 达标。 |
| `src/l1-entry/pages/SettingsView.tsx` | 渲染新分类，不直接写每个业务判断；保留 L1 layout/event delegation。 |
| `src/styles/layout.css` | Settings 分类、内容区、窄屏顺序和间距；不要新增 Tailwind 原子类拼贴。 |

推荐目标分类：

| 分类 | 内容 |
| --- | --- |
| 数据与服务 | 当前数据/服务安全摘要，前往 Setup 修改。 |
| 外观 | 主题、字体、窗口材质、减少动画。 |
| AI 与语义 | semantic 配置状态摘要，前往 AI 工作台配置。 |
| 隐私与诊断 | 隐私模式状态、开发者入口开关、脱敏诊断 disclosure。 |
| 关于与更新 | 版本、更新检查、开源/许可、release caveat。 |

验收：

- Settings 首屏不会同时呈现完整诊断表和高密度 AI provider 表单。
- 分类按钮桌面和窄屏目标尺寸达标；长中文标签不挤压或换行破坏布局。
- `/settings` 桌面 1366x900 与窄屏 390x844 无水平溢出。

建议提交：`收敛设置页面分类`。提交前运行相关 Settings component tests、CSS/governance tests、`pnpm typecheck`、`pnpm lint`，然后及时推送。

### Task 4：数据与服务设置降级为摘要和 Setup 入口

目标：Settings 不再成为第二个服务连接页面。

文件范围：

| 文件 | 责任 |
| --- | --- |
| `src/l3-molecule/settings/DataSettings.tsx` | 展示 safe data/service summary、Setup action、readiness hint；不直接展示 raw path/key。 |
| `src/l2-coordinator/commander/useSettingsPageCommander.ts` | 从 setup store/active service summary 派生数据服务视图；不在 Settings 里独立保存 base URL。 |
| `src/l2-coordinator/commander/settingsDataViewModel.ts` | 可选纯 view model：把 setup profile/readiness/settings path 转成安全展示。 |
| `src/l2-coordinator/commander/chatlogRequestContext.ts` | 仅复用已有 active service summary，不因 Settings 产生第二来源。 |
| `src/l3-molecule/settings/DataSettings.test.tsx` | 覆盖未配置、已配置、HTTP ready、DB not ready、privacy on、Setup action。 |

要求：

- `wxDataPath` 只显示安全摘要，不显示 `C:\`、`WeChat Files`、`wxid_synthetic_*` 以外的身份形态。
- `dataKey` 只能显示“已配置/未配置/请在设置中心配置”，不出现 reveal 或保存到 UI localStorage。
- 如果保留“选择目录”入口，动作必须清楚说明它会进入 Setup/导入流程，而不是在 Settings 页面完成独立配置。
- `sidecarPort` 不作为普通 Settings 表单字段；旧字段只能作为迁移兼容，不作为 UI truth source。

建议提交：`收敛设置数据服务摘要`。提交前运行 DataSettings tests、settings migration tests、`pnpm typecheck`、`pnpm lint`，然后及时推送。

### Task 5：AI 与语义配置入口收敛

目标：用户只看到一个真实影响 semantic workflow 的 AI 配置入口。

文件范围：

| 文件 | 责任 |
| --- | --- |
| 替换或改造 `src/l3-molecule/settings/AIModelSettings.tsx` | 从可编辑 provider/endpoint/model 表单改为 semantic 配置摘要和“前往 AI 工作台配置”入口。可重命名为 `AiSemanticSettings.tsx`。 |
| `src/l2-coordinator/commander/useSettingsPageCommander.ts` | 提供 semantic config/index summary、AI route action、隐私安全 label。 |
| `src/l1-entry/pages/AiWorkspaceView.tsx` | 可选支持 `?source=settings&panel=semantic` 或类似安全 query，进入后聚焦/open semantic setup。 |
| `src/l3-molecule/semantic/AiPanel.tsx` | 如果需要从 route 自动打开设置向导，动作必须由 L1/L2 传入，不让 L3 自己解析 location。 |
| `src/l2-coordinator/api-docs/settings.ts`、`settingsValidation.ts`、`useSettingsStore.ts` | legacy UI AI fields 的迁移/清理。 |
| 相关 tests | 覆盖旧 localStorage AI fields 不再渲染为 Settings 表单，不进入后端 semantic config，不泄露 endpoint/key。 |

推荐产品形态：

- Settings 显示“语义配置：已配置/需要配置/检查中/索引就绪/索引异常”。
- 主动作是“前往 AI 工作台配置”或“打开语义设置”。
- 如果实现打开 AI 工作台设置向导，URL 只含安全枚举，例如 `panel=semantic`、`source=settings`，不含 provider endpoint 或 key。
- 旧 `aiEndpoint` 不显示在 DOM、aria label、diagnostics、E2E screenshot 中。

迁移策略：

| 旧字段 | 处理 |
| --- | --- |
| `aiProvider` | 不再作为 Settings 可编辑表单展示；保存后可从 localStorage 清理，或保留为 legacy ignored field。 |
| `aiEndpoint` | 不显示，不复制到 semantic config；保存/迁移时清理或忽略。 |
| `aiModel` | 不显示为 semantic model；迁移后由 AI 工作台真实 semantic config 决定。 |
| `aiCredentialConfigured` | 始终不能表示真实后端 credential；迁移时保持 false 或清理。 |

验收：

- 用户不会在 Settings 和 AI 工作台看到两套互相不一致的 AI 模型配置。
- Semantic 配置缺失不阻塞浏览、搜索、统计；Settings 只说明 AI 功能需要配置。
- 隐私模式下不显示 endpoint、provider credential、prompt、answer 或 evidence 文本。

建议提交：`收敛AI语义配置入口`。提交前运行 AI settings focused tests、semantic setup view model tests、`pnpm typecheck`、`pnpm lint`，然后及时推送。

### Task 6：隐私、诊断和开发者入口收敛

目标：Settings 能作为隐私/诊断入口，但不把普通用户推入开发工具密度。

文件范围：

| 文件 | 责任 |
| --- | --- |
| `src/l3-molecule/settings/AdvancedSettings.tsx` | 可合并/重命名到隐私与诊断分类；保留 developerMode toggle，补状态说明、禁用理由、保存反馈。 |
| `src/l3-molecule/settings/AboutSettings.tsx` | 将直接渲染的 `DiagnosticsPanel` 改为 disclosure 或摘要 + 展开明细。 |
| 可复用 `src/l3-molecule/setup/SetupDiagnosticsDisclosure.tsx` 或抽 `DiagnosticsDisclosure` | 设置和 Setup 共用渐进披露模式，文案按上下文区别。 |
| `src/l2-coordinator/commander/useDiagnosticsCommander.ts` | 确认 report/copy/export 仍 fail-closed，不因 Settings disclosure 改动而改变 redaction gate。 |
| `src/l3-molecule/settings/AboutSettings.test.tsx`、`AdvancedSettings.test.tsx` | 覆盖默认折叠、展开、copy/export、redaction blocked、developer mode 保存。 |

要求：

- 默认 Settings 页面不显示 `Export manifest version`、`Backend base URL` 等诊断 line。用户展开后可以看到脱敏诊断。
- 复制/导出诊断必须继续使用 `DiagnosticsPanel` 的 fail-closed 行为。
- Developer mode 开关文案明确“只显示高级诊断入口；不关闭脱敏”。
- 开启 developer mode 后仍不把 Developer 放回 ready workspace rail。

建议提交：`收敛设置诊断与开发者入口`。提交前运行 diagnostics/settings tests、developerEntryViewModel tests、`pnpm typecheck`、`pnpm lint`，然后及时推送。

### Task 7：保存状态、错误翻译和微交互收尾

目标：Settings 的保存/更新/跳转不是“点击后静默变化”。

文件范围：

| 文件 | 责任 |
| --- | --- |
| `src/l2-coordinator/commander/useSettingsCommander.ts` | 保存状态的 idle/saving/saved/error 可持续显示；失败不吞掉 localStorage/storage unavailable。 |
| `src/l2-coordinator/commander/settingsValidation.ts` | 更新字段验证范围，移除不再属于 Settings 的 AI endpoint validation 或保留为 legacy guard。 |
| `src/l3-molecule/settings/*Settings.tsx` | 每个可操作分类显示 save feedback、disabled reason、plain-language error。 |
| `src/l4-atom/ui` 已有 Tooltip/DisabledReason/Field | 只复用，不新增重复 primitive。 |

要求：

- 保存中的 repeated submit 被禁用或自然不可重复。
- storage 不可用时显示“设置暂时无法保存，请检查浏览器/桌面存储权限后重试”或等价普通语言。
- 更新检查失败不显示 raw updater/Tauri error；提供重试或查看脱敏诊断。
- Settings 中的 IconButton 和紧凑按钮都有 tooltip/aria label。

建议提交：`补设置保存状态与微交互`。提交前运行 settings commander/validation tests、UI governance、`pnpm typecheck`、`pnpm lint`，然后及时推送。

### Task 8：浏览器、隐私、可访问性和视觉证据

目标：Settings 收敛不是只在单元测试里成立，必须通过真实页面验证。

必须检查：

| 路由/场景 | 视口 | 验收 |
| --- | --- | --- |
| `/settings` direct | 1366x900 / 390x844 | 分类清楚，默认分类可理解，返回 fallback 安全，无水平溢出。 |
| `/settings?source=setup` | 1366x900 / 390x844 | 返回设置中心，不进入坏 Workbench。 |
| `/settings?source=ai&section=semantic` | 1366x900 / 390x844 | AI 语义摘要或跳转入口明确，不显示旧 AI endpoint 表单。 |
| `/ai?source=settings&panel=semantic` | 1366x900 / 390x844 | 能到真实 SemanticSetupCenter 或 AI 配置入口，返回 Settings/AI 语义合理。 |
| `/settings` + privacy on | 1366x900 / 390x844 | 不显示 raw path、`wxid`、endpoint、key、chat content、diagnostic sensitive lines。 |
| `/settings` About diagnostics | 1366x900 / 390x844 | 默认折叠；展开后 copy/export 可操作；blocked 状态有 reason。 |
| keyboard/a11y | desktop/narrow | 分类、返回、设置动作、diagnostics disclosure、AI 配置入口可 Tab/Enter/Escape 操作，无严重 axe 问题。 |

建议提交：`补设置收敛验收证据`。提交前运行 focused E2E/a11y/visual，再执行 full verification，最后推送。

## 8. 推荐执行顺序

| 顺序 | 单元 | 理由 |
| --- | --- | --- |
| 1 | 红灯测试与 return context helper | P1-11 是明确源码缺口，先固定返回契约，减少后续分类改造时的路由混乱。 |
| 2 | Settings 分类 IA | 先把页面职责分清，再迁移具体分类内容。 |
| 3 | Data/service summary | 依赖 Step 01/04，风险较低，可先解除第二服务入口风险。 |
| 4 | AI semantic 配置入口 | P1-06 主问题，涉及 Settings state 和 AI route，需要单独提交和验证。 |
| 5 | Diagnostics/developer disclosure | 依赖 Settings 分类和现有 diagnostics redaction；需要隐私/a11y 证据。 |
| 6 | 保存状态和微交互 | 收尾所有 Settings 分类状态和错误翻译。 |
| 7 | 浏览器/a11y/visual/full verification | 统一确认 Settings 在桌面、窄屏、隐私、diagnostics、AI 跳转下成立。 |

如果多人并行，允许 Task 2 的纯分类布局、Task 3 的 Data summary、Task 6 的 diagnostics disclosure 在不同文件范围内并行，但下面文件必须冻结 ownership，不能多人同时改：

- `src/l1-entry/pages/SettingsView.tsx`
- `src/l2-coordinator/api-docs/settings.ts`
- `src/l2-coordinator/data-clerk/stores/useSettingsStore.ts`
- `src/l2-coordinator/commander/useSettingsPageCommander.ts`
- `src/l3-molecule/settings/SettingsLayout.tsx`
- `src/styles/layout.css`
- Settings 相关 E2E specs

## 9. 文件范围总表

| 层级 | 文件/模块 | 预期改动 |
| --- | --- | --- |
| L1 | `src/l1-entry/pages/SettingsView.tsx` | 只做布局和事件委托；返回、分类内容、导航目标来自 commander。 |
| L1 | `src/l1-entry/pages/AiWorkspaceView.tsx` | 可选支持安全 query 打开 semantic setup；不在 L1 写 semantic 业务逻辑。 |
| L2 | `settingsNavigation.ts`、`useSettingsPageCommander.ts` | Settings return context、分类 view model、data/service/AI/diagnostics summary。 |
| L2 | `settingsValidation.ts`、`useSettingsCommander.ts`、`useSettingsStore.ts` | Settings field migration、saving/error states、legacy AI fields cleanup。 |
| L2 | `primaryWorkspaceNavigation.ts`、`workbenchInformationArchitecture.ts` | 只加保护测试，防止 Settings/Developer 回到 primary rail。 |
| L3 | `SettingsLayout.tsx` | 分类渲染、active/current 语义、target size 相关 class 使用。 |
| L3 | `DataSettings.tsx` | 数据/服务安全摘要和 Setup 入口。 |
| L3 | `AIModelSettings.tsx` 或新 `AiSemanticSettings.tsx` | 从编辑表单改为 semantic 配置摘要和 AI 工作台入口。 |
| L3 | `AdvancedSettings.tsx`、`AboutSettings.tsx` | 隐私/诊断/developer disclosure、更新状态、about 信息。 |
| L3 | `DiagnosticsPanel` / disclosure wrapper | 复用现有 redaction gate，避免默认展开完整明细。 |
| L4 UI | Button、IconButton、Field、Tooltip、DisabledReason、Surface、StatusIndicator | 只复用；除非测试证明原子层 bug，否则不要改 L4。 |
| CSS | `src/styles/layout.css` | Settings 分类和内容响应式、target size、spacing。 |
| Tests | Settings unit tests、commander tests、E2E core/a11y/visual/privacy | 新增并更新验收证据。 |

避免触碰：

- `src-tauri/`、`src-tauri/capabilities/*`、`tauri.conf.json`。
- L4 network semantic fetchers，除非 AI deep link 暴露了现有 bug。
- Media/SNS/Graph/Search 任务闭环代码，除非只加 Settings return/source 保护。

## 10. 测试优先要求

实现阶段必须优先写测试或失败证据。推荐命令按修复单元逐步运行：

| 范围 | 命令/证据 |
| --- | --- |
| Settings navigation | `pnpm exec vitest run src/l2-coordinator/commander/settingsNavigation.test.ts` |
| Settings migration/validation | `pnpm exec vitest run src/l2-coordinator/data-clerk/stores/settingsMigration.test.ts src/l2-coordinator/commander/settingsValidation.test.ts` |
| Settings UI components | `pnpm exec vitest run src/l3-molecule/settings/*.test.tsx` |
| AI semantic ownership | `pnpm exec vitest run src/l2-coordinator/commander/semanticSetupViewModel.test.ts src/l3-molecule/semantic/*.test.tsx`，按实际改动收窄 |
| Architecture/governance | `pnpm exec vitest run scripts/ui-governance.test.mjs scripts/architecture-boundary.test.mjs --pool=threads --no-file-parallelism --maxWorkers=1 --exclude "**/.worktrees/**" --exclude "e2e/specs/**"` |
| Frontend gates | `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` |
| Integrated gate | `pnpm verify` |
| Browser core | `pnpm e2e` 或至少包含 Settings/AI/diagnostics 的 focused Playwright spec |
| Accessibility | `pnpm e2e:a11y` |
| Visual | `pnpm e2e:visual`，如 Settings 截图新增/更新则先人工检查再 update snapshots |
| Privacy fixtures | `pnpm fixtures:check` |

如果未来实现改到 Rust/Tauri/capabilities/updater release 配置，追加：

- `cd src-tauri && cargo test`
- `pnpm tauri build`
- 对应 release/privacy audit 证据更新

## 11. 验收矩阵

| 验收项 | 通过标准 |
| --- | --- |
| Settings 职责 | 页面明确是应用偏好和配置摘要，不是服务连接主流程或 AI 后端配置主表单。 |
| 返回上下文 | 从 Setup、AI、Graph、更新/错误恢复、标题栏、直接 URL 进入 Settings 后，返回动作符合来源；无 raw 私密参数。 |
| AI 配置归属 | Settings 不再显示可编辑的 provider/endpoint/model 表单；真实 semantic 配置入口在 AI 工作台。 |
| Legacy settings migration | 旧 `aiProvider`/`aiEndpoint`/`aiModel` 不再误导 UI，不写入 semantic 后端，不泄露 endpoint/key。 |
| Data/service | Settings 只显示安全摘要和 Setup 入口；不存第二套 base URL/port/data key。 |
| Privacy | DOM、aria、tooltip、diagnostics、copy/export、screenshots 不包含 raw path、`wxid`、key/token、private content、endpoint secret。 |
| Diagnostics | 默认折叠或摘要；展开后 copy/export 用户触发，redaction fail-closed，blocked reason 可读。 |
| Developer entry | 默认隐藏；developerMode 只显示高级入口，不关闭 redaction，不回到 ready workspace rail。 |
| State coverage | 每个 Settings 分类有 loading/empty/error/disabled/success 或明确 next step；保存和更新检查不静默失败。 |
| Accessibility | Field hint/error 关联，分类/返回/disclosure 可键盘操作，目标尺寸符合标准，无严重 axe 问题。 |
| Responsive | 1366x900 和 390x844 可用，无横向溢出，按钮文字不截断。 |
| Architecture | L1 不写业务逻辑；L2 owns navigation/config summary；L3 props-only rendering；L4 不引入状态依赖。 |

## 12. 完成定义

第九步实现完成必须同时满足：

1. `SettingsView` 不再固定返回 `/workbench`。
2. Settings 不再向用户提供一套会被理解为 semantic 生效的 AI provider/endpoint/model 编辑表单。
3. 数据/服务配置入口回到 Setup 主流程，Settings 不存第二套连接真源。
4. Settings/About 诊断默认不以完整明细占据普通页面，复制/导出仍 fail-closed。
5. Developer mode 仍默认关闭，开启后也不关闭脱敏，不把 Developer 放回 primary rail。
6. Settings 所有新增文案、tooltip、aria label、诊断、E2E screenshot 均通过隐私扫描。
7. Settings 桌面与窄屏 browser checks 通过，页面设计评分不低于 16/20。
8. Focused tests、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm verify` 通过。
9. UI 改动涉及 Settings/AI/diagnostics 时，`pnpm e2e`、`pnpm e2e:a11y`、`pnpm e2e:visual` 按影响范围运行并记录结果。
10. 每个已完成修复单元都有短中文提交，并在通过该单元验证后及时推送。

## 13. 建议提交与推送拆分

本步骤特别要求不要等到 Settings 全部修完后再一次性提交/推送。推荐节奏如下：

| 单元 | 中文提交标题示例 | 推送要求 |
| --- | --- | --- |
| 红灯测试与返回契约 | `固定设置返回上下文契约` | focused tests + lint/typecheck 通过后立即推送。 |
| Settings 分类 IA | `收敛设置页面分类` | component tests + UI governance + lint/typecheck 通过后立即推送。 |
| Data/service summary | `收敛设置数据服务摘要` | Data/settings tests + lint/typecheck 通过后立即推送。 |
| AI semantic 入口 | `收敛AI语义配置入口` | AI/settings/semantic focused tests + lint/typecheck 通过后立即推送。 |
| Diagnostics/developer disclosure | `收敛设置诊断入口` | diagnostics/developer tests + privacy focused checks 通过后立即推送。 |
| Settings state/micro-affordance | `补设置保存状态与提示` | settings commander/UI tests + lint/typecheck 通过后立即推送。 |
| 全量验收收尾 | `补设置收敛验收证据` | `pnpm verify`、相关 E2E/a11y/visual 通过后推送。 |

如果出现无关工作树改动，先确认提交范围，只 stage 当前 Settings 单元文件。不要回滚用户改动。

PR 策略：如果已有修复基线 PR，就在每个推送单元后更新 PR 说明或评论中的验证证据；如果没有 PR，只有在用户明确要求、远端 CI/协作审查需要、或 release governance 需要审查边界时创建/更新 PR。

## 14. 风险和缓解

| 风险 | 表现 | 缓解 |
| --- | --- | --- |
| AI Settings 删除/替换后用户找不到配置 | 用户习惯从 Settings 找 AI。 | Settings 保留“AI 与语义”摘要和明确入口，AI 工作台显示真实配置状态；return context 支持回 Settings。 |
| 旧 localStorage AI fields 引发迁移回归 | 旧 endpoint 继续显示或被错误保存。 | migration tests 覆盖旧字段；实现不能把旧字段写入 semantic backend。 |
| Return context 泄露私密信息 | URL 包含 chat、focus、query、path。 | 只用安全枚举 route key；测试扫描 forbidden markers。 |
| Diagnostics disclosure 折叠后恢复能力变弱 | 用户找不到复制/导出。 | 默认摘要必须有“查看脱敏诊断”；错误状态提供 next step。 |
| Settings 分类改动影响 E2E 选择器 | 旧测试找不到“AI 模型”或“关于”。 | 测试更新为用户语义，不依赖内部类名；必要时保留兼容 label 过渡。 |
| 过度修改 shared CSS | 影响 Setup/workspace 布局。 | Settings CSS 修改局限在 `.settings-*`；视觉/E2E 回归检查 Setup/Workbench。 |
| 误触 sidecar/Tauri | 使文档任务变成 release-risk task。 | 默认不改 Tauri；若必须改，单独提交并运行 Rust/Tauri/release checks。 |

## 15. 后续步骤衔接

第九步完成后，后续阶段应进入总体计划中的可访问性、视觉一致性、诊断/开发工具隐私审计和 release evidence。第九步不替代最终 release gate，但会减少后续 audit 中 Settings、diagnostics、AI config、return path 的高风险项。

若第九步实现后仍保留任何 legacy AI settings field 或 Settings 内直接诊断明细，应在任务记录中写明：

- 为什么暂时保留。
- 用户是否还能看到它。
- 它是否影响 semantic backend。
- 后续在哪个阶段删除。

没有这些记录，不应把第九步视为完成。

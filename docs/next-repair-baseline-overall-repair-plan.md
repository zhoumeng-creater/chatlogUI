# codex/next-repair-baseline 总体代码修复计划

> 日期：2026-06-09
> 分支：`codex/next-repair-baseline`
> 文件性质：总体修复计划，不是分步骤代码实现计划。本文不包含代码。
> 计划目标：把当前已记录的 UX、产品结构、可靠性、隐私、可访问性、发布证据问题纳入同一条修复路线，明确优先级、依赖关系、可并行范围和验收证据。

## 1. 总体目标

`chatlogUI` 下一阶段修复的目标不是继续增加入口，而是把已经暴露出来的能力组织成普通用户能完成真实任务的桌面应用。总体修复必须同时满足下面五个目标：

1. 首次用户能理解如何连接本地 chatlog 服务、确认数据库可用，并安全进入工作台。
2. Workbench 回到“看会话、找消息、理解上下文”的主舞台，不再把右侧 inspector 当成一级功能容器。
3. 搜索、媒体、朋友圈、AI、图谱、统计等任务族形成闭环，而不是只渲染 tab、按钮或结果片段。
4. 私密路径、`wxid`、密钥、内部错误、开发者工具、诊断信息默认不暴露给普通用户。
5. 所有高风险路径都有状态、取消、恢复、窄屏、暗色、隐私模式、键盘和焦点证据。

本计划只负责总体拆解和排序。SetupCenter、Workbench、AI、Media、SNS、Graph 等页面会涉及重新设计，但具体视觉布局、组件构成、交互文案和实现细节应在后续对应阶段的分步骤代码修复计划中展开，避免在总体计划中过早消耗上下文。

## 2. 依据与边界

本计划依据以下项目资料：

| 资料 | 用途 |
| --- | --- |
| `docs/product-acceptance-standards.md` | 用户任务、NN/G 启发式、状态覆盖、隐私、诊断、模块验收、发布证据的主合同。 |
| `docs/ui-development-standards.md` | UI 开发时的控件尺寸、可访问性、交互状态、响应式和设计质量标准。 |
| `docs/next-repair-baseline-ux-ledger.md` | P0/P1/P2 问题事实账本和源码证据边界。 |
| `docs/next-repair-baseline-inspector-architecture.md` | 右侧 inspector 被误用为功能容器、模块页面化、SetupCenter 布局重构的专题台账。 |
| `specs/001-ready-desktop-app/spec.md` | Ready-to-use desktop app 的产品化目标和用户故事参考。 |
| `specs/001-ready-desktop-app/plan.md` | 桌面应用产品化架构和执行参考。 |
| `specs/001-ready-desktop-app/tasks.md` | 既有产品化任务拆解参考。 |
| `specs/001-ready-desktop-app/release-evidence.md` | 历史发布证据参考，不能替代当前分支的最新 smoke。 |

边界说明：

- 不改变 `chatlog_alpha` 既有后端契约，除非后续用户明确要求变更 sidecar contract。
- 不把源码推断当成当前运行证据。涉及 Tauri 窗口、安装包、CSP、真实 sidecar、外部服务连接的内容，必须在对应阶段补运行证据。
- `specs/000-productization/*` 在当前工作区未找到，本计划不依赖缺失文件；后续若恢复该目录，应再做一次交叉核对。
- 本计划不放代码，也不提前定稿页面设计。页面重设计只在对应修复阶段进入设计和实现。

## 3. 问题全集归并

| 问题 ID | 优先级 | 用户任务族 | 必须修复的核心问题 | 总体处理方向 | 所属阶段 |
| --- | --- | --- | --- | --- | --- |
| P0-01 | P0 | 隐私、设置、诊断 | 设置、导入、手动配置、DevConsole 成功文案仍可能暴露完整本地路径或 `wxid` 形态。 | 建立统一隐私展示策略，默认脱敏路径、身份标识、密钥和诊断输出。 | 阶段 1、2、7、9 |
| P0-02 | P0 | 连接 chatlog 服务 | 外部服务模式没有 URL 输入，用户无法真正配置已有服务。 | SetupCenter 增加外部服务路径，包含 URL 输入、测试、保存、HTTP/DB readiness。 | 阶段 1、2 |
| P0-03 | P0 | 服务连接、主 API | Setup 的外部服务 readiness 不能可靠驱动 Workbench 主 API，多个 fetcher 仍围绕固定本地端口。 | 收敛为单一 base URL/readiness 来源，所有 L4 网络请求遵守同一配置。 | 阶段 1、2 |
| P0-04 | P0 | 桌面壳、发布 | 源码已有窗口控制，但真实 native click、拖拽、关闭、安装包 smoke 缺少当前证据。 | 最后阶段补 Tauri dev 和 packaged app smoke，不能用历史证据冒充当前分支证据。 | 阶段 10 |
| P1-01 | P1 | Workbench IA | rail 和 toolbar 重复一级模块入口，层级语义不清。 | 定义一级页面、上下文 inspector、临时浮层三层容器；移除重复主导航。 | 阶段 3 |
| P1-02 | P1 | Workbench 搜索/工具栏 | toolbar 被塞入标题、模块按钮、搜索、过滤器、搜索结果，成为可滚动混合页面。 | toolbar 回到轻量控制区；搜索结果迁移到稳定区域或独立搜索页面。 | 阶段 3、4 |
| P1-03 | P1 | Developer/Diagnostics | 普通用户默认看到开发者控制台、开发模块和调试能力。 | 开发者工具默认隐藏，只在开发者模式、dev/beta、错误恢复、高级诊断中出现。 | 阶段 1、9 |
| P1-04 | P1 | 搜索聊天 | 搜索结果点击只能打开会话，不能定位命中消息上下文。 | 建立命中消息锚点、上下文窗口、滚动定位、高亮和返回搜索结果路径。 | 阶段 4 |
| P1-05 | P1 | 搜索聊天 | 搜索和 load more 存在旧响应覆盖新结果的风险。 | 所有搜索请求和分页合并都有取消或 request guard。 | 阶段 4、6 |
| P1-06 | P1 | AI 配置 | Settings AI 与 semantic AI 后端配置是两个用户可见配置面。 | 合并或重命名配置入口，确保用户可见的“模型设置”真实影响 semantic 工作流。 | 阶段 5、7 |
| P1-07 | P1 | AI Q&A/SSE | AI 长连接 headers 后缺少 idle watchdog，清空入口和模块切换取消证据不足。 | AI 工作台页面化，补停止、重试、清空、复制、证据、超时、取消和错误恢复。 | 阶段 5、6 |
| P1-08 | P1 | Knowledge Graph | Graph cancel 只改状态，旧请求可能晚返回覆盖新状态。 | Graph 请求可取消或可丢弃旧响应，页面化后明确范围、筛选、摘要和详情。 | 阶段 5、6 |
| P1-09 | P1 | Media | attachments、favorites、members、unread、new messages 任务完整度不一致。 | Media 独立成媒体库页面；聊天 inspector 只保留当前会话最近附件摘要。 | 阶段 5、6 |
| P1-10 | P1 | SNS/朋友圈 | SNS 识别外部链接但不保留 URL，也没有安全外部打开流程。 | SNS 独立成朋友圈页面；保留 URL，增加域名展示、确认、系统打开和失败恢复。 | 阶段 5、6 |
| P1-11 | P1 | Settings | Settings 返回动作固定到 Workbench，不能恢复进入上下文。 | Settings 保留独立页面，返回路径依据来源上下文恢复。 | 阶段 7 |
| P2-01 | P2 | 通用 UI | 默认按钮、图标按钮、segmented control 尺寸低于项目目标。 | 更新尺寸 token 和例外规则，关键任务路径保证可点击目标和视觉密度平衡。 | 阶段 1、8 |
| P2-02 | P2 | Field/Input | hint/error 渲染出来但没有可靠关联到子 input/select。 | Field 系统注入或约束 ARIA 关系，错误状态可被辅助技术识别。 | 阶段 1、8 |
| P2-03 | P2 | Dialog/Sheet | modal/sheet 焦点、Escape、关闭后恢复不一致。 | 建立统一 overlay/focus primitive，再迁移语义确认、媒体预览、设置 sheet。 | 阶段 1、8 |
| P2-04 | P2 | Setup 高级配置 | 高级字段暴露过早，字段说明、示例、校验、字段级错误不足。 | SetupCenter 分三条路径，高级手动配置默认折叠并字段级校验。 | 阶段 2 |
| IA-01 | P1 | Workbench 容器模型 | stats/media/sns/developer/ai 被当成 inspector 模块，graph 却是主区特判。 | 统一模块级页面规则，inspector 只服务当前上下文。 | 阶段 3、5 |
| IA-02 | P1 | 统计 | 统计需要趋势、排行、分布、范围选择，不适合挤在右侧。 | 建立统计分析页；聊天 inspector 只留当前会话小统计。 | 阶段 5 |
| IA-03 | P1 | 媒体 | 媒体库是资源管理任务，不是会话右栏附属信息。 | 建立媒体库页面和媒体详情区；聊天页只提供最近附件深链接。 | 阶段 5、6 |
| IA-04 | P1 | AI | AI 包含配置、索引、语义搜索、Q&A、证据和历史，不适合右栏。 | 建立 AI 工作台；聊天页只提供带范围的轻量入口。 | 阶段 5、6、7 |
| IA-05 | P1 | 图谱 | 图谱已有主区特判，但入口规则和其他模块不一致。 | 升级为明确一级图谱页，保留节点/边/事件详情侧栏。 | 阶段 5、6 |
| IA-06 | P1 | 朋友圈 | 朋友圈有 timeline、媒体、链接、位置、评论点赞和通知，不是会话附属信息。 | 建立朋友圈页面；聊天页只放联系人朋友圈摘要深链接。 | 阶段 5、6 |
| IA-07 | P1 | 开发者工具 | 开发者工具不应在 rail、toolbar、全局标题栏同时出现。 | 默认隐藏，纳入设置开发者模式或高级诊断。 | 阶段 1、9 |
| IA-08 | P1 | 设置 | 设置不应同时在 rail 和标题栏出现。 | 设置只作为应用级入口，移出 Workbench rail。 | 阶段 3、7 |
| SC-01 | P1 | SetupCenter 首启 | 步骤、主操作、状态、诊断、工作台入口同时出现，主次不清。 | 首启页只突出“连接聊天数据服务并进入工作台”。 | 阶段 2 |
| SC-02 | P1 | SetupCenter 诊断 | 诊断默认占据右栏，像调试后台。 | 正常状态只显示简洁 readiness；错误或高级展开时才显示诊断详情。 | 阶段 2、9 |
| SC-03 | P1 | SetupCenter CTA | “打开工作台”可能在中间和右侧重复，未就绪时也容易造成误解。 | 只保留一个主 CTA；未就绪时显示不可进入原因和下一步。 | 阶段 2 |
| SC-04 | P2 | SetupCenter 视觉语言 | Setup 模式选择和导入面板混用 Tailwind 原子类与项目组件。 | 全部迁移到项目 L4 atoms 和统一 ChoiceCard、ReadinessCard、ErrorState。 | 阶段 1、2、8 |

## 4. 总体依赖顺序

修复顺序必须遵守一个原则：先稳定基础契约，再重排页面，再补任务闭环，最后补发布证据。原因是当前问题不是单个页面样式问题，而是基础状态来源、容器职责和任务边界同时混乱。

| 顺序 | 必须先稳定的内容 | 为什么不能跳过 |
| --- | --- | --- |
| 1 | 单一服务 base URL、readiness、隐私展示、开发者模式、UI 基础控件 | SetupCenter、Workbench、Search、AI、Graph、Media、SNS 都依赖这些基础能力。 |
| 2 | SetupCenter 首启与服务连接 | 如果连接状态和 API 地址不可信，后续页面即使重设计也会出现“设置成功但主功能失败”。 |
| 3 | Workbench 信息架构和路由边界 | 模块页面化、search 结果位置、inspector 降级都依赖明确的容器规则。 |
| 4 | 搜索闭环 | 搜索是聊天记录工具的核心任务，应在大模块补全前优先解决“搜到但找不到”。 |
| 5 | 统计、媒体、SNS、AI、Graph 页面化 | 这些模块需要大面积主区和自己的任务状态，不能继续塞进 inspector。 |
| 6 | 各模块可靠性和任务闭环 | 页面边界稳定后，再补 stale guard、abort、跳转、外链、清空、证据等具体任务。 |
| 7 | Settings、Diagnostics、Accessibility、Release evidence | 设置与诊断要根据页面化后的入口收敛；发布证据必须基于最终形态补齐。 |

## 5. 阶段 0：修复治理与证据账本

目的：让后续每个修复单元都能追溯到问题、验收标准和证据，不再靠口头判断；PR 只在明确需要远端审查、协作、CI 或发布治理证据时使用。

主要工作：

- 保持 `docs/next-repair-baseline-ux-ledger.md` 作为主问题账本。
- 保持 `docs/next-repair-baseline-inspector-architecture.md` 作为 Workbench 和 SetupCenter 页面结构专题账本。
- 本文件作为总体计划入口，后续每个分步骤代码修复计划必须引用本文件的阶段编号和问题 ID。
- 后续每个修复提交、任务记录或 PR 必须说明修复了哪些 ID、没有覆盖哪些 ID、需要哪些运行证据。
- 官方 NN/G、Fluent 2、WCAG 2.2 条目已经进入项目验收标准和 UI 开发标准；后续若补充新条目，应只放到标准文件，不散落在业务代码注释里。

可并行性：

- 可与任何阶段并行维护。
- 不应与具体页面实现混在同一个提交里，除非只是补对应修复的证据链接。

验收证据：

- 文档链接完整。
- 每个修复提交、任务记录或 PR 都能回链到问题 ID。
- 没有把源码推断写成运行事实。

## 6. 阶段 1：共享基础修复

阶段 1 是后续所有页面修复的地基。若跳过本阶段，页面重构会不断遇到外部服务不生效、隐私展示反复漏、控件尺寸反复修改、modal 焦点重复修的问题。

### 1A. 服务 base URL 与 readiness 单一来源

覆盖问题：P0-02、P0-03、SC-01、SC-03。

分步骤计划：`docs/next-repair-baseline-step-01-base-url-readiness-repair-plan.md`。

修复方向：

- 明确“内置 sidecar 服务”和“外部 chatlog 服务”是两个可保存的连接模式。
- 建立统一的服务地址来源，所有 L4 网络请求、readiness 检查、semantic、graph、media、SNS、developer API 都从同一来源读取。
- HTTP ready 和 DB ready 继续分层，不把服务进程可达误写成数据库可查询。
- Tauri CSP、capabilities、外部 URL allowlist 的策略必须与外部服务能力一致。
- 错误信息必须解释“服务不可达”“数据库未就绪”“地址无效”“CSP/桌面权限限制”等用户能理解的区别。

主要影响区域：

| 区域 | 可能涉及 |
| --- | --- |
| L4 网络 | `src/l4-atom/network/*` 中所有 chatlog API fetcher、SSE、readiness、semantic、graph、media、SNS、developer endpoints。 |
| L2 协调 | setup commander、app boot、workbench commander、readiness view model、settings migration。 |
| Tauri | CSP、capabilities、sidecar launcher、外部服务 allowlist，仅在确有必要时修改。 |
| 测试 | network atom、readiness、setup machine、app boot、workbench API smoke。 |

依赖：

- 必须早于 SetupCenter 外部服务 UI。
- 必须早于 Workbench 页面化后对 API 状态的验收。

可并行性：

- 可以与隐私展示策略、开发者模式 gating、部分 UI token 工作并行。
- 不适合与 SetupCenter 外部服务表单实现并行，除非先明确 base URL 存取接口。

验收标准：

- 内置 sidecar 模式下主路径仍默认指向本地服务。
- 外部服务模式保存后，搜索、历史、统计、媒体、SNS、semantic、graph、readiness 读取同一配置。
- 服务地址变更后不会出现“Setup 显示成功但 Workbench 请求旧地址”的状态。
- 旧配置迁移有明确 fallback，不能把用户带到空白坏页面。

### 1B. 隐私展示与诊断脱敏策略

覆盖问题：P0-01、P1-03、SC-02。

修复方向：

- 建立统一的 display-safe helper 或等价策略，用于路径、`wxid`、密钥、token、完整导出路径、数据库路径、工作目录、媒体缓存目录。
- 设置页、SetupCenter、DiagnosticPanel、DevConsole、导出成功文案、错误状态、日志复制都必须使用同一脱敏规则。
- 对用户需要确认的本地目录，只展示安全摘要、文件名或末级目录，不默认展示完整路径。
- 对密钥类字段，只允许空、已配置、需要重新输入等状态，不出现真实感强的 placeholder。
- 隐私模式下保留结构和操作，不暴露聊天内容、联系人标识、完整路径和敏感片段。

依赖：

- 应早于 SetupCenter、Settings、Diagnostics、Developer 修复。

可并行性：

- 可以与 1A 并行。
- 若同时改 Settings 或 DiagnosticPanel，需要明确文件所有权，避免同一组件反复改。

验收标准：

- 全局搜索源码和 UI 文案中不再出现真实感路径示例和 `wxid_synthetic_xxx` 风格示例作为普通用户文案。
- 诊断导出成功只显示安全文件名或“诊断目录”，不显示完整路径。
- 复制诊断前用户能知道内容已脱敏。

### 1C. L4 UI atoms 与可访问性基础

覆盖问题：P2-01、P2-02、P2-03、SC-04。

修复方向：

- 重新定义按钮、图标按钮、segmented control 的默认尺寸 token，使普通表单按钮默认满足项目标准，toolbar/icon button 满足高频桌面操作标准。
- 明确 28px 级别控件只能作为低频密集例外，并且需要更大 hit area 或明确上下文理由。
- Field 组件必须能把 hint/error 与输入控件建立可访问关系。
- 建立统一 overlay/focus primitive，覆盖打开时初始焦点、Escape、焦点 trap、关闭后恢复焦点。
- SetupCenter 的 ChoiceCard、ReadinessCard、ErrorState 等统一组件应基于项目 atoms，不再用零散 Tailwind demo 风格。

依赖：

- 应早于 SetupCenter 重设计和大量 modal/sheet 修复。
- Field ARIA 需要先梳理现有表单组件使用方式，避免破坏自定义 input/select。

可并行性：

- 可以与 1A、1B 并行。
- 不适合与大量表单页面重构同时进行，除非先完成 atoms API 并冻结。

验收标准：

- 核心控件尺寸符合 `docs/ui-development-standards.md`。
- 表单错误可被屏幕阅读器关联到具体输入。
- modal/sheet/drawer 关闭后焦点回到触发点。
- 窄屏、键盘、暗色模式没有因尺寸调整产生溢出。

### 1D. 开发者模式与高级诊断入口

覆盖问题：P1-03、IA-07。

修复方向：

- 普通用户默认不看到开发者控制台、DB Explorer、API Runner、Hook、MCP 等调试入口。
- 开发者入口只在开发者模式、dev/beta channel、启动参数、环境变量或错误恢复高级路径出现。
- 错误页可提供“复制安全诊断”和“打开高级诊断”，但不要求普通用户进入开发工具完成恢复。

依赖：

- 依赖隐私展示策略，避免高级诊断继续泄露私密内容。

可并行性：

- 可以与 SetupCenter 重构并行，但要避免同时改全局标题栏和 rail 导航。

验收标准：

- 默认启动后的标题栏、Workbench rail、toolbar 不出现开发者主入口。
- 开发者模式开启和关闭都有可见状态。
- 错误恢复路径仍能进入高级诊断。

## 7. 阶段 2：SetupCenter 首启与服务连接重构

阶段 2 是 P0 主路径修复。它必须优先于大规模 Workbench 改造，因为 Workbench 的所有主功能都依赖连接状态和 API 地址可信。

覆盖问题：P0-01、P0-02、P0-03、P2-04、SC-01、SC-02、SC-03、SC-04。

目标体验：

- 首次页面只让用户理解一个主任务：连接本地聊天数据服务，然后进入工作台。
- 页面不再像后台配置面板，也不默认把诊断、步骤、状态、主操作同时摆成三栏同级内容。
- 诊断是错误恢复和高级排障，不是首屏常驻功能。
- “打开工作台”只有一个主 CTA，并且只在满足进入条件时变成主操作。

主要修复范围：

| 子任务 | 修复内容 | 依赖 |
| --- | --- | --- |
| 2A 首启布局重构 | 从三栏后台面板调整为主任务优先的引导布局，状态摘要降低视觉权重，诊断默认收起。 | 1B、1C |
| 2B 三条连接路径 | 推荐自动导入配置、连接已有 chatlog 服务、高级手动配置三条路径清晰分流。 | 1A、1B |
| 2C 外部服务路径 | URL 输入、连接测试、HTTP ready、DB ready、保存配置、错误恢复。 | 1A |
| 2D 高级手动配置 | 默认折叠，字段级说明、示例、校验、字段级错误，密钥类字段安全展示。 | 1B、1C |
| 2E CTA 规则 | 单一主 CTA，未就绪时解释下一步，ready 后进入工作台。 | 2B、2C |
| 2F 视觉语言收敛 | SetupModeChooser、ConfigImportPanel、状态和错误统一使用项目组件。 | 1C |

不可并行项：

- 外部服务 URL 保存逻辑不能与 1A base URL 单一来源同时各自设计。
- CTA 规则必须等 readiness 条件定义完成后再实现。
- 高级配置字段级校验应等 Field ARIA 和错误组件约定稳定后做。

可并行项：

- 三条路径的信息架构设计可以与视觉语言组件准备并行。
- 诊断折叠规则可以与外部服务表单实现并行，但需要共享 readiness 状态。

验收标准：

- 默认首屏没有完整诊断面板。
- 未 ready 时不出现误导性的“打开工作台”主按钮。
- 外部服务 URL 可以输入、测试、保存，并驱动 Workbench 主请求。
- 自动导入和手动配置不显示真实感 `wxid` 或完整路径示例。
- 服务未启动、服务不可达、DB 未就绪、配置无效都有 loading/empty/error/disabled/success 状态。
- 窄屏下步骤、主内容、状态不会三栏挤压，按顺序 reflow。

## 8. 阶段 3：Workbench 信息架构与路由边界

阶段 3 是页面结构修复的核心。它决定哪些是一级页面，哪些是当前上下文 inspector，哪些是临时浮层。

覆盖问题：P1-01、P1-02、IA-01、IA-07、IA-08。

目标结构：

| 层级 | 应承担的职责 | 不应承担的职责 |
| --- | --- | --- |
| 一级页面 | 聊天、搜索、统计、媒体、朋友圈、AI、图谱等完整任务工作区。 | 作为另一个一级页面的右栏 tab。 |
| 上下文 inspector | 当前会话、当前消息、当前搜索命中、当前媒体、当前图谱节点的详情和摘要。 | 完整媒体库、完整 AI 问答、朋友圈 feed、开发者工具。 |
| 临时浮层/抽屉 | 确认、预览、快速设置、短暂辅助任务。 | 长任务工作台或主导航页面。 |

主要修复范围：

- Workbench rail 只保留真实一级页面入口。
- toolbar 不再手写 stats/media/sns/developer/AI/graph 模块按钮。
- Settings 从 Workbench rail 移出，保留为应用级入口。
- Developer 默认隐藏，进入高级诊断或开发者模式。
- Graph 不再是唯一特殊规则；所有同级模块遵守同一页面化原则。
- Workbench chat 页面保留会话列表、聊天主内容、当前会话 inspector。
- inspector title 从“媒体与扩展”“AI 分析”“朋友圈”“开发者工具”改回上下文含义，例如会话详情、消息详情、附件预览、当前会话统计。

建议页面边界：

| 页面 | 页面定位 | 与 Workbench 的关系 |
| --- | --- | --- |
| Workbench chat | 看会话和聊天上下文。 | 核心工作台。 |
| Search | 搜索聊天、筛选、结果列表、命中定位。 | 可从 Workbench 搜索入口进入，结果可跳回聊天上下文。 |
| Analytics | 全局或范围统计分析。 | Workbench inspector 只放当前会话小统计。 |
| Media | 媒体库、收藏、成员、未读、新消息等资源管理。 | Workbench inspector 只放最近附件摘要和深链接。 |
| SNS | 朋友圈 timeline、通知、搜索和详情。 | Workbench inspector 只放联系人朋友圈摘要。 |
| AI | AI 问答、语义搜索、索引管理、证据、设置。 | Workbench 只提供“问这个会话”的带范围入口。 |
| Graph | 图谱画布、范围、筛选、节点详情、时间线。 | Workbench 可深链接到相关实体。 |
| Settings | 偏好设置和入口跳转。 | 不作为 Workbench rail 模块。 |
| Advanced Diagnostics | 高级诊断和开发者工具。 | 默认隐藏，只从错误恢复或开发者模式进入。 |

不可并行项：

- route map、rail 模块、workbench layout、toolbar 删除应作为一个集中改造完成，避免中途出现多个入口规则并存。
- inspector 降级和模块页面化壳的迁移需要先确定页面边界。

可并行项：

- 页面边界确定后，Analytics、Media、SNS、AI、Graph 的页面壳可以拆成多个独立任务并行。
- Developer gating 如果阶段 1 已完成，可与本阶段导航收敛并行整合。

验收标准：

- 同一一级模块不再同时出现在 rail 和 toolbar。
- toolbar 不滚动展示搜索结果或模块工作区内容。
- inspector 不再承载完整一级模块。
- Graph、AI、Media、SNS、Stats 的入口规则一致。
- Settings 和 Developer 不再干扰普通聊天主路径。

## 9. 阶段 4：搜索任务闭环修复

搜索是聊天记录工具的核心任务，优先级高于媒体、SNS、AI、Graph 的完整补全。用户能搜到但找不到命中消息时，会把整个搜索视为不可用。

覆盖问题：P1-02、P1-04、P1-05。

主要修复范围：

| 子任务 | 修复内容 |
| --- | --- |
| 4A 搜索结果区域稳定 | 搜索结果从 toolbar 混合区移出，成为稳定页面区域或搜索页主区。 |
| 4B 请求可靠性 | 查询、分页、过滤器变更都使用取消或 request guard，旧响应不能覆盖新结果。 |
| 4C 命中锚点模型 | 搜索结果携带足够定位信息，例如命中消息时间、local id、message id 或后端可支持的等价字段。 |
| 4D 打开上下文 | 点击结果后加载命中消息附近窗口，而不是只从 offset 0 打开会话。 |
| 4E 高亮与恢复 | 命中消息滚动定位并高亮 2 到 4 秒，保留返回搜索结果路径。 |
| 4F 降级文案 | 后端暂不支持精确定位时，明确告诉用户已打开会话但无法定位到原消息。 |
| 4G 隐私模式 | 隐私模式隐藏内容但保留会话、时间、命中结构和跳转能力。 |

依赖：

- 依赖阶段 3 的搜索页面或搜索结果区域决定。
- 依赖聊天消息列表能暴露稳定锚点或可滚动定位接口。

可并行性：

- 请求可靠性可以与搜索页面视觉迁移并行，但最终必须在同一状态模型下合并。
- 命中锚点和聊天窗口加载应集中处理，避免 Search 和 Chat 各自定义定位协议。

验收标准：

- 空查询、搜索中、无结果、多结果、错误、过滤器、分页、隐私模式都有状态。
- 快速连续输入不会让旧结果覆盖新查询。
- 点击搜索结果能定位到命中上下文；无法精确定位时有明确降级说明。
- 用户能从聊天上下文返回搜索结果。

## 10. 阶段 5：一级模块页面化

阶段 5 只负责把模块从 inspector 容器中迁移为合理页面，并建立每个页面的主任务框架。具体业务闭环可以在阶段 6 继续补。

### 5A. 统计分析页

覆盖问题：IA-02。

页面目标：

- 提供范围选择：全部聊天、当前会话、联系人/群聊、时间范围。
- 主区展示关键指标、趋势、排行、分布。
- 右侧或底部提供解释、空状态、隐私提示。
- Workbench inspector 只保留当前会话小统计和“查看完整统计”深链接。

验收重点：

- 用户能明确当前统计范围。
- 空数据、服务未就绪、DB 未就绪、隐私模式、加载失败都有状态。

### 5B. 媒体库页面

覆盖问题：P1-09、IA-03。

页面目标：

- 媒体成为完整资源管理页面，支持范围、时间、类型筛选。
- 图片、视频、文件、语音、收藏、未读、新消息、群成员等二级任务有清晰能力边界。
- 右侧详情只服务当前选中媒体、成员或消息。
- Workbench inspector 只展示当前会话最近媒体缩略图和媒体库深链接。

验收重点：

- 不完整功能不能伪装成可完成任务。
- 收藏、成员、未读、新消息若保留入口，必须有预览、搜索/分页或跳转闭环。

### 5C. SNS / 朋友圈页面

覆盖问题：P1-10、IA-06。

页面目标：

- 朋友圈作为独立 timeline 页面，包含动态、通知、搜索结果和详情。
- 支持文本、图片、视频、链接、位置、评论/点赞通知等对象类型。
- 外部链接保留 URL，默认不直接跳出应用，采用安全确认流程。
- Workbench inspector 只展示联系人朋友圈摘要和深链接。

验收重点：

- 外链显示域名或来源，用户确认后才打开。
- 无 URL、URL 无效、系统打开失败都有可理解文案。

### 5D. AI 工作台

覆盖问题：P1-06、P1-07、IA-04。

页面目标：

- AI 作为独立工作台，包含问答、语义搜索、索引管理、证据库和设置。
- 顶部或上下文区域显示模型配置、索引状态、当前范围、隐私模式状态。
- 右侧详情服务证据引用和消息上下文，不再让完整 QA 挤在 Workbench inspector。
- Workbench 只提供“问这个会话”入口，并带上当前范围进入 AI 页面。

验收重点：

- 用户只看到一个能影响 semantic 工作流的模型配置入口。
- 问答有连接中、流式输出、停止、失败、空答案、超时、服务断开、重复问题、模块切换取消、清空历史、复制答案、查看证据。

### 5E. 图谱页面

覆盖问题：P1-08、IA-05。

页面目标：

- 图谱作为明确一级页面，包含范围、时间、实体类型、刷新/停止、摘要、画布、节点/边详情、时间线。
- 默认不只展示复杂 canvas，应有摘要视图和可解释过滤器。
- Workbench 或搜索可深链接到图谱实体，但主入口保持唯一。

验收重点：

- 空图、超大图、错误图、隐私模式有明确状态。
- 节点详情、边详情、事件详情清楚服务当前选中对象。

不可并行项：

- 阶段 5 必须等阶段 3 的 route map 和 nav contract 稳定后开始。
- AI 配置页面化不能与 Settings 配置合并各自为政。

可并行项：

- 5A、5B、5C、5D、5E 可以在页面边界稳定后并行拆分。
- 每个模块应拥有独立文件范围，避免多个任务同时修改 `WorkbenchView`、rail、route map。

## 11. 阶段 6：模块任务闭环与可靠性修复

阶段 6 在页面壳稳定后补齐各模块真实任务，重点处理 stale response、取消、跳转、长任务恢复、安全外部打开等可靠性问题。

| 模块 | 覆盖问题 | 修复重点 | 可并行条件 |
| --- | --- | --- | --- |
| Search | P1-05 | 请求取消或 request guard、分页合并保护、过滤器切换保护。 | 若阶段 4 未完成，可独立补测试。 |
| AI | P1-07 | SSE idle watchdog、heartbeat 重置、停止、清空、模块切换取消、服务断开恢复、错误翻译。 | AI 页面和 semantic store 文件独立时可并行。 |
| Graph | P1-08 | graph query、visualize、timeline 请求可取消或丢弃旧响应，取消后旧响应不能写 store。 | Graph store/network 文件独立时可并行。 |
| Media | P1-09 | 收藏可预览/打开，成员搜索/分页，未读/新消息可跳会话/消息，无法支持的能力降承诺。 | Media 页面壳稳定后可并行。 |
| SNS | P1-10 | adapter 保留 URL，安全外部打开确认，域名展示，失败恢复，隐私模式。 | 依赖 overlay/focus primitive 和 Tauri/system open 策略。 |
| Diagnostics | P0-01、P1-03 | 复制/导出安全诊断，高级诊断入口，开发者模式下显示更多但仍脱敏。 | 依赖隐私策略和 developer gating。 |

不可并行项：

- 若多个模块同时修改同一个通用 network client、error translator 或 route state，必须先合并共享契约。
- SNS 安全打开与 overlay primitive 未稳定时不应单独实现临时 confirm。
- Media 未读跳转和 Search 命中跳转需要共享聊天消息定位协议，不能各自实现两套。

验收标准：

- 所有长请求都有 loading、success、empty、error、cancelled 或 timed out 状态。
- 重复点击、快速切换、慢请求晚返回不会破坏当前状态。
- 安全外链、诊断、隐私模式不会泄露私密路径或聊天内容。

## 12. 阶段 7：Settings 与配置收敛

覆盖问题：P1-06、P1-11、IA-08、P0-01。

修复方向：

- Settings 明确定位为偏好设置，不承担服务连接主流程。
- 服务地址、data key、chatlog 连接状态归 SetupCenter 或连接管理入口。
- AI provider、endpoint、model 如果影响 semantic 工作流，就归 AI 工作台配置；如果只是 UI 偏好，必须改名避免误导。
- Settings 返回行为应基于进入来源恢复，而不是固定跳回 Workbench。
- 数据路径、密钥状态、隐私模式、关于页面中的诊断信息都遵守隐私展示策略。

依赖：

- 依赖阶段 2 的服务连接归属。
- 依赖阶段 5D 的 AI 工作台配置归属。
- 依赖阶段 3 的 Settings 应用级入口决定。

可并行性：

- Settings 视觉和返回路径可以与模块可靠性并行。
- AI 配置收敛不能与 AI 工作台配置设计分开做。

验收标准：

- 用户不会在两个地方看到互相不一致的 AI 模型配置。
- 从 Setup、AI、Graph、错误恢复进入 Settings 后，返回路径符合上下文。
- Settings 不展示私密路径或密钥明文。

## 13. 阶段 8：可访问性、视觉一致性与响应式抛光

覆盖问题：P2-01、P2-02、P2-03、SC-04，以及所有页面的响应式和暗色模式质量。

修复方向：

- 用项目 L4 atoms 统一按钮、图标、segmented control、输入、错误、empty、loading、status、dialog、sheet。
- 清理高可见页面中的 Tailwind demo 风格类，尤其是 SetupCenter、模式选择、导入、状态、错误。
- 所有 dialog/sheet/drawer 检查焦点进入、Tab 顺序、Escape、点击遮罩、关闭后焦点恢复。
- 所有主页面检查桌面、窄屏、暗色、隐私模式。
- 文字不得在按钮、卡片、toolbar、状态区内溢出或遮挡。
- 色彩对比和非文本状态指示符合项目标准，不能只靠颜色表达。

依赖：

- 依赖阶段 1C 的 atoms 和 overlay/focus primitive。
- 最好在页面结构基本稳定后统一做，否则会重复返工。

可并行性：

- 可按页面并行做视觉和可访问性验收。
- 共享 atoms 修复必须集中合并后再开始页面级清理。

验收标准：

- `docs/ui-development-standards.md` 中尺寸、状态、焦点、reflow、对比度要求有当前证据。
- SetupCenter、Workbench、Search、AI、Media、SNS、Graph、Settings 在窄屏和暗色下可用。
- 不出现隐藏滚动工具栏、文字重叠、按钮过小、焦点丢失。

## 14. 阶段 9：诊断、开发工具与隐私审计

覆盖问题：P0-01、P1-03、SC-02、IA-07。

修复方向：

- 诊断成为恢复路径，而不是主界面常驻内容。
- 默认错误状态提供“重试”“复制安全诊断”“查看诊断详情”等普通用户可理解动作。
- 高级诊断和开发者工具仅在开发者模式、dev/beta、启动参数或错误恢复中出现。
- 诊断导出必须用户触发，可见成功/失败，并明确脱敏。
- 复制内容、导出内容、DevConsole 事件、错误 toast、日志行、路径文案做隐私审计。

依赖：

- 依赖隐私展示策略。
- 依赖 developer gating。
- 依赖 SetupCenter 和 Settings 入口收敛。

可并行性：

- 可与阶段 8 页面级可访问性一起做最终 audit。
- 不应早于默认开发者入口隐藏规则。

验收标准：

- 普通用户主路径不需要进入开发者工具。
- 所有诊断复制/导出都可说明脱敏范围。
- 成功文案不显示完整本地路径。
- 错误文案不显示 `HTTP 500` 或内部错误码作为用户主文案。

## 15. 阶段 10：桌面壳、发布证据与最终验收

覆盖问题：P0-04，以及所有涉及发布 readiness 的标准。

修复方向：

- 在当前分支和最终实现上补 Tauri dev smoke。
- 补 packaged app smoke：安装、启动、关闭、重启、窗口拖拽、窗口控制、sidecar 启停、端口占用、服务未就绪、DB 未就绪。
- 若涉及外部服务 URL，补桌面 CSP/capabilities 证据。
- 若涉及自动更新、签名、sidecar provenance、bundle 配置，使用 release-gate 流程重新验收。

依赖：

- 必须在主要 UX 和可靠性修复后执行。
- 不能用历史 `release-evidence` 替代当前分支证据。

验收标准：

- `pnpm verify` 通过。
- Rust/Tauri 相关测试通过。
- `pnpm tauri build` 或对应 release build 通过。
- 当前安装包 smoke 记录完整。
- 没有私密路径、密钥、真实聊天内容进入日志、截图或发布证据。

## 16. 并行工作总表

| 可以并行的工作 | 前置条件 | 注意事项 |
| --- | --- | --- |
| 隐私展示策略、控件尺寸 token、开发者模式 gating | 无需等待页面重构。 | 不要同时改同一全局标题栏或同一 Settings 区块。 |
| SetupCenter 视觉组件准备与诊断折叠设计 | 阶段 1C 的 atoms 约定明确。 | 外部服务 URL 保存必须等待 1A。 |
| Analytics、Media、SNS、AI、Graph 页面壳 | 阶段 3 route map 和 nav contract 稳定。 | 每个任务拥有独立文件范围，不重复改 Workbench 主 shell。 |
| AI SSE、Graph abort、Media task closure、SNS safe open | 页面壳稳定，共享 network/error/overlay 契约稳定。 | 若都需要改通用 http client，应先做共享契约提交；需要远端审查时再开 PR。 |
| 页面级响应式检查 | 对应页面结构稳定。 | 共享 atoms 已经合并，否则会重复调整。 |

| 不应并行的工作 | 原因 |
| --- | --- |
| base URL 单一来源与 SetupCenter 外部 URL 表单各自独立实现 | 容易形成两套配置来源，重复制造 P0-03。 |
| route map/rail/toolbar/inspector 契约与各模块页面迁移同时抢改 | 容易产生中间态导航混乱和冲突。 |
| Field ARIA primitive 与大量表单页面改造同时进行 | primitive API 未稳定时页面会重复返工。 |
| overlay/focus primitive 与 SNS 外链确认、semantic confirm、media sheet 临时实现同时进行 | 容易留下多套焦点行为。 |
| Search 命中跳转和 Media 未读跳转各自定义消息定位 | 必须共用聊天消息锚点和上下文加载模型。 |

## 17. 建议提交与远端审查拆分

后续每个修复单元都应短中文提交，并在需要远端 CI、协作审查、发布证据或用户明确要求时及时推送。PR 不再是默认收口动作；只有在需要远端审查边界时才创建或更新。建议拆分如下：

| 修复单元 | 建议内容 | 远端审查建议 |
| --- | --- | --- |
| A | base URL/readiness 单一来源、外部服务契约、迁移和测试。 | P0 阻塞项，建议远端 CI 或 review；不强制 PR。 |
| B | 隐私展示策略、诊断脱敏、开发者模式 gating 基础。 | 可与 A 并行但需避免同文件冲突；协作时再开 PR。 |
| C | L4 UI atoms 尺寸、Field ARIA、overlay/focus primitive。 | 后续页面重构前置；需要共享审查时再开 PR。 |
| D | SetupCenter 三路径重构和外部服务 UI。 | 依赖 A/C；可本地完成后按需推送审查。 |
| E | Workbench route/nav/toolbar/inspector 契约收敛。 | 依赖 C，最好作为独立提交序列；按需 PR。 |
| F | Search 页面/区域重构、stale guard、命中定位、高亮和返回路径。 | 依赖 E 和消息锚点方案；需要 CI 证据时推送/PR。 |
| G | Analytics、Media、SNS、AI、Graph 页面壳。 | 可按模块拆提交；多人并行或高冲突时再拆 PR。 |
| H | AI、Graph、Media、SNS 任务闭环和可靠性。 | 可按模块拆提交；高风险模块按需 PR。 |
| I | Settings 配置收敛和返回上下文。 | 依赖 AI/Setup 归属决策；按需 PR。 |
| J | 全局可访问性、视觉、响应式、隐私和诊断 audit。 | 可按页面拆提交，最终需要统一验收记录。 |
| K | Tauri dev、packaged smoke、release evidence。 | 发布候选或 release gate 通常需要远端审查；按发布要求决定 PR。 |

## 18. 分阶段验证命令与证据

后续每个代码修复阶段至少需要按风险运行对应验证。总体计划本身是文档，不要求构建命令替代代码验证。

| 场景 | 基础验证 | 额外验证 |
| --- | --- | --- |
| 文档或计划 | 检查链接、问题 ID、无代码、无私密信息。 | 无需 `pnpm build`，除非同时改代码。 |
| L4 network/base URL | lint、typecheck、相关 unit tests。 | sidecar 内置模式、外部服务模式、CSP/Tauri smoke。 |
| UI atoms/Field/overlay | lint、typecheck、component tests。 | 键盘 Tab、Escape、焦点恢复、窄屏、暗色。 |
| SetupCenter | lint、typecheck、setup tests、browser route checks。 | 内置 sidecar、外部 URL、DB 未就绪、导入失败、隐私模式。 |
| Workbench/Search | lint、typecheck、search/chat tests、browser checks。 | 慢请求、快速输入、命中跳转、返回结果、窄屏。 |
| AI/Semantic | lint、typecheck、semantic tests、SSE tests。 | idle timeout、stop、retry、clear、evidence、module switch cancel。 |
| Graph | lint、typecheck、graph tests。 | 慢请求取消、旧响应丢弃、空图、超大图、隐私模式。 |
| Media/SNS | lint、typecheck、adapter/store/component tests。 | 预览、跳转、外链确认、系统打开失败、隐私模式。 |
| Tauri/发布 | `pnpm verify`、Rust tests、Tauri build。 | 安装包 smoke、窗口控制、sidecar 启停、端口占用。 |

## 19. 后续分步骤代码修复计划的建议顺序

后续用户要求“分步骤代码修复计划”时，建议按下面顺序展开，每份计划只处理一个可交付修复单元，且必须列出具体文件、测试和验收路径：

1. base URL/readiness 单一来源与外部服务契约。
2. 隐私展示策略、诊断脱敏、开发者入口 gating。
3. L4 UI atoms、Field ARIA、overlay/focus primitive。
4. SetupCenter 三路径重构。
5. Workbench route/nav/toolbar/inspector 收敛。
6. Search 稳定结果区、stale guard、命中定位。
7. Analytics/Media/SNS/AI/Graph 页面壳拆分。
8. AI、Graph、Media、SNS 的任务闭环和可靠性。
9. Settings 配置归属和返回上下文。
10. 全局可访问性、响应式、隐私 audit。
11. Tauri/package smoke 和 release evidence。

## 20. 当前无阻塞疑问

当前总体计划不需要用户额外确认即可作为后续分步骤计划的上位依据。真正需要在后续阶段再确认的是具体产品取舍，例如：

- AI 配置最终是完全迁入 AI 工作台，还是 Settings 保留一个跳转入口。
- Media 的 favorites、members、unread/new messages 是全部补全，还是对暂不支持的任务降承诺。
- SNS 外链安全打开是否需要 allowlist、一次性确认、域名风险提示或系统级打开限制。
- Developer 模式入口放在 Settings 的哪个层级，以及 dev/beta 构建是否默认显示。
- SetupCenter 最终视觉设计应在进入阶段 2 分步骤计划时再定稿。

这些问题不影响总体修复顺序，但会影响对应阶段的详细代码计划。

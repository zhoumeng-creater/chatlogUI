# P2 Apple-like UI 系统重构修复规划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to execute this plan. This plan is intentionally split because P2 touches the design system, app shell, workbench, setup/settings surfaces, accessibility, and visual verification.

## 1. 目标

P2 的目标不是给现有页面套一层 Apple 风格皮肤，而是把 chatlogUI 重构成一个安静、稳定、可长期使用的桌面工作台：

- 首屏 Setup Center 保持 P0/P1 的真实配置能力，但视觉和交互质量达到正式产品水平。
- Workbench 从固定三栏 Dashboard 改为 Apple-like 桌面信息架构：sidebar、toolbar、content、inspector/drawer。
- 所有主模块都使用统一设计系统，移除假 macOS 窗口灯、emoji 命令图标、过度 glass panel 和不稳定 pill 控件。
- 半屏、窄屏、移动宽度下不再出现三栏挤压、文字重叠或关键操作不可达。
- AI 和图谱在 P2 中先完成入口和布局隔离，避免继续遮挡聊天主流程；真实后端合约修复仍归 P3。
- 建立视觉验证流程，避免再次出现“build 通过但打开不可用”的状态。

## 2. 当前前置状态

P0/P1 已经完成的部分：

- `SetupCenterView.tsx` 已替代旧启动页，并保留托管 sidecar、外部服务连接、配置导入、readiness 检查。
- `killPort.ts` 和无确认杀端口行为已经移除。
- `useAppCommander.ts` 已简化为 setup commander 兼容层。
- `@l2/*` 路径别名已覆盖 `@l2/data-clerk/types/setup`。
- `detectWxPath.ts` 不再返回硬编码空数组，已通过 Tauri 命令接入 Windows 微信数据目录检测。
- 核心 API fetcher、raw DTO、adapter、conversation-first chat store 已完成 P1 修复。

P2 仍必须处理的遗留 UI/体验问题：

- [ ] `AppLayout.tsx` 仍有假 macOS 红黄绿窗口灯和 emoji 工具按钮。
- [ ] `DashboardView.tsx` 仍是一个过大的页面，把会话、搜索、聊天、统计、AI、图谱混在固定三栏中。
- [ ] `dashboardLayout.ts` 在 980px 以下仍返回三栏 grid，半屏窗口会挤压。
- [ ] `SetupCenterView.tsx` 功能存在，但视觉仍是普通 Tailwind 灰白布局，没有形成正式 Setup Center 体验。
- [ ] `SettingsView.tsx` 的返回路径仍指向 `/dashboard`，应统一到 `/workbench`。
- [ ] `SettingsLayout.tsx` 和多个设置/统计/语义组件仍依赖 `GlassPanel`。
- [ ] `AppleButton.tsx` 使用 rounded-full、硬编码颜色和负字距，不适合密集桌面工具。
- [ ] `Typography.tsx` 全局使用负 letter spacing，应清理为稳定系统字体排版。
- [ ] `StatusBar.tsx` 对 index status 的字段仍有旧语义痕迹，如 `building`、`completed/total`；P2 至少要把 UI 状态表现改成兼容且不误导。
- [ ] `GraphCanvas` 仍作为浮层从 Dashboard 触发，视觉和信息架构都不合适。
- [ ] P1 计划要求的真实浏览器/截图 smoke 尚未形成稳定记录流程。

## 3. 范围切分

P2 涉及大量 UI 代码，直接一次性改完整个前端风险很高。建议拆成五个子阶段：

| 阶段 | 名称 | 目标 | 是否本计划重点 |
| --- | --- | --- | --- |
| P2-A | UI Foundation And Shell | tokens、基础控件、AppLayout、Workbench frame、Setup Center 第一轮视觉重构 | 是 |
| P2-B | Core Workbench Polish | 会话列表、聊天 transcript、搜索区、统计 inspector 的高质量重构 | 是，提供完整任务清单 |
| P2-C | Settings And Diagnostics | 设置中心、诊断面板、状态反馈、隐私表现统一 | 是，提供完整任务清单 |
| P2-D | AI And Graph Containment | AI/图谱从浮层演示变成独立模块入口，减少干扰和 bundle 压力 | 是，限制到 P2 边界 |
| P2-E | Visual QA And Accessibility | 响应式、键盘、截图、可访问性、深浅色验证 | 是 |

第一轮实施应只执行 P2-A。P2-A 完成后再进入 P2-B/P2-C/P2-D，否则很容易在旧 Dashboard 上堆新样式，最后仍然不可维护。

## 4. 非目标

P2 不做这些事情：

- 不重写 P1 已修复的 chatlog API adapter 和 conversation 数据模型，除非 UI 需要新增 display-only 字段。
- 不在 P2 修复 semantic/graph 的全部后端合约；AI/图谱真实功能修复属于 P3。
- 不新增 SNS、hook、SQL、媒体导出等 P4 功能。
- 不做营销式 landing page、hero section、装饰性 3D 首屏或大面积渐变背景。
- 不用假 macOS 控件制造平台错觉。Apple-like 应体现在清晰信息架构、控件一致性、反馈质量和动效克制。

## 5. 设计原则

### 5.1 Apple-like 的落点

本项目是 Windows/Tauri 桌面工具，不应照搬 macOS 窗口装饰。P2 的 Apple-like 应落实为：

- 侧边栏导航稳定、层级清晰。
- Toolbar 放当前上下文最常用操作，不把全局设置、隐私、开发者按钮堆成 emoji。
- 内容区优先展示真实聊天记录和检索结果，不使用大面积装饰卡片。
- Inspector 用于上下文详情、过滤器、统计和状态说明；窄屏时变成 drawer。
- 错误和空状态必须说明下一步动作。
- 动效短、轻、可关闭，不对列表做大规模 stagger。

参考方向：

- Apple Human Interface Guidelines 的 navigation/search 思路：稳定导航、清晰搜索入口、结果可恢复。
- 桌面 productivity 工具的信息密度：左侧导航、主内容、右侧 detail inspector。
- macOS System Settings/Finder/Mail 的结构感，而不是网页 landing page。

### 5.2 视觉系统

- 背景用清晰 surface 和 separator，不再依赖 blur/glass 表达层级。
- repeated item 的圆角不超过 `8px`；modal 可以到 `12px`；头像和状态点允许圆形。
- 不使用全局负字距。
- 主色不只用一套蓝色变体。蓝色用于主操作，绿色用于 ready/success，黄色用于 pending/warning，红色用于 error/danger，紫色只保留给 AI 语义模块的局部标识。
- primary button 只用于当前流程最重要动作；工具命令用 icon button + tooltip。
- 所有可点击元素都有 hover、active、focus-visible、disabled 状态。

### 5.3 功能诚实性

- HTTP ready、DB ready、index ready、privacy mode 必须分开显示。
- 如果 AI/图谱后端未完整适配，不在 UI 中暗示它们完全可用。
- 如果 graph 只有可视化 demo，不让它遮挡聊天主流程；给出独立模块入口和可恢复空状态。
- 如果窄屏无法同时展示三栏，就改成 list/detail/drawer，而不是强行缩小三栏。

## 5.4 2026-05-30 P2-B Remediation Handoff

P2-B comprehensive remediation closed the core workbench privacy, virtualization, architecture-boundary, search-state, setup-form, favicon, and dev-port gaps tracked in the 2026-05-30 review.

Remaining P2 work is intentionally split:

- P2-C: settings, setup diagnostics, credential UX, and redaction consistency.
- P2-D: AI and graph containment, including the lazy `GraphModule` chunk-size warning.
- P2-E: repeatable browser visual QA and accessibility evidence.

Do not fold those cross-module cleanups back into P2-B unless a bug directly blocks the core chat/search/stats workbench path.

## 6. 新设计系统规格

### 6.1 CSS token 文件

新增：

- `src/styles/tokens.css`
- `src/styles/layout.css`
- `src/styles/motion.css`

修改：

- `src/styles/globals.css`

建议 token：

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;

  --bg-app: #f5f5f7;
  --surface-base: #ffffff;
  --surface-sidebar: #f2f2f4;
  --surface-subtle: #fafafa;
  --surface-hover: rgba(0, 0, 0, 0.045);
  --surface-active: rgba(0, 122, 255, 0.12);
  --separator: rgba(0, 0, 0, 0.10);

  --text-primary: rgba(0, 0, 0, 0.88);
  --text-secondary: rgba(0, 0, 0, 0.62);
  --text-tertiary: rgba(0, 0, 0, 0.42);
  --text-placeholder: rgba(0, 0, 0, 0.30);
  --text-on-accent: #ffffff;

  --accent: #0a84ff;
  --accent-hover: #006fe6;
  --success: #2f9e44;
  --warning: #b26a00;
  --danger: #d92d20;
  --info: #2563eb;
  --ai: #7c3aed;

  --radius-control: 6px;
  --radius-item: 8px;
  --radius-panel: 10px;
  --radius-modal: 12px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  --titlebar-height: 42px;
  --statusbar-height: 28px;
  --sidebar-expanded: 224px;
  --sidebar-compact: 64px;
  --conversation-list-width: 296px;
  --inspector-width: 320px;

  --shadow-popover: 0 12px 32px rgba(0, 0, 0, 0.16);
  --focus-ring: 0 0 0 3px rgba(10, 132, 255, 0.28);
}
```

深色模式必须提供同名 token，不允许组件自己硬编码另一套深色颜色。

### 6.2 排版

修改 `src/l4-atom/ui/Typography.tsx`：

- 删除所有 `tracking-[-...]`。
- 保留 `h1/h2/h3/body/label/caption/code`，但限定用于真实层级。
- 添加 `truncate`、`tone`、`as` 支持，减少组件里硬编码 `color`。
- 中英文混排使用系统字体，不引入远程 web font。

建议尺寸：

| Token | 用途 | 尺寸 |
| --- | --- | --- |
| `title` | 页面或模块标题 | 20px/28px semibold |
| `headline` | panel 标题 | 15px/22px semibold |
| `body` | 正文、消息 | 14px/21px regular |
| `label` | 表单和 toolbar | 13px/18px medium |
| `caption` | 辅助状态 | 12px/16px regular |
| `mono` | 日志、路径、诊断 | 12px/18px monospace |

### 6.3 基础控件

新增或重写：

- `src/l4-atom/ui/Button.tsx`
- `src/l4-atom/ui/IconButton.tsx`
- `src/l4-atom/ui/ToolbarButton.tsx`
- `src/l4-atom/ui/SegmentedControl.tsx`
- `src/l4-atom/ui/Switch.tsx`
- `src/l4-atom/ui/SelectField.tsx`
- `src/l4-atom/ui/TextField.tsx`
- `src/l4-atom/ui/SearchField.tsx`
- `src/l4-atom/ui/Surface.tsx`
- `src/l4-atom/ui/StatusIndicator.tsx`
- `src/l4-atom/ui/Notice.tsx`
- `src/l4-atom/ui/EmptyState.tsx`
- `src/l4-atom/ui/ErrorState.tsx`
- `src/l4-atom/ui/Tooltip.tsx`
- `src/l4-atom/ui/SplitView.tsx`
- `src/l4-atom/ui/InspectorPanel.tsx`

兼容策略：

- 保留 `AppleButton` export，但内部改为调用 `Button`，避免一次性改坏所有引用。
- 保留 `GlassPanel` export，但标记为 legacy。P2-A 后新代码不得新增 `GlassPanel` 引用；P2-B/C 逐步清理旧引用。
- 图标建议新增依赖 `lucide-react`，用真实 icon 替代 emoji。导入时优先明确图标，不创建大 barrel。

```powershell
pnpm add lucide-react
```

必要图标：

- `Settings`
- `Shield`
- `TerminalSquare` 或 `Monitor`
- `Search`
- `MessageSquare`
- `BarChart3`
- `Brain`
- `Network`
- `Database`
- `RefreshCw`
- `ChevronLeft`
- `ChevronRight`
- `PanelLeft`
- `PanelRight`
- `AlertTriangle`
- `CheckCircle2`
- `Circle`
- `Copy`
- `ExternalLink`

## 7. Shell 信息架构

### 7.1 AppLayout

修改：

- `src/l3-molecule/common/AppLayout.tsx`

新增：

- `src/l3-molecule/common/AppTitleBar.tsx`
- `src/l3-molecule/common/GlobalCommandCluster.tsx`
- `src/l3-molecule/common/AppStatusCluster.tsx`

要求：

- 删除假 macOS 红黄绿按钮。
- Title bar 左侧显示产品名和当前模块名；中间可留空或显示连接摘要；右侧放隐私、开发者、设置等 icon button。
- Tauri window 操作如果需要保留，应放到平台中性的 `WindowControls`，并只在 Tauri runtime 可用时出现。
- 每个 icon button 必须有 `aria-label` 和 tooltip。
- privacy 状态不仅用颜色，也显示 `StatusIndicator` 或 tooltip 文案。
- titlebar drag region 和按钮 no-drag 区域要保留。

### 7.2 WorkbenchFrame

新增：

- `src/l1-entry/pages/WorkbenchView.tsx`
- `src/l3-molecule/workbench/WorkbenchFrame.tsx`
- `src/l3-molecule/workbench/WorkbenchSidebar.tsx`
- `src/l3-molecule/workbench/WorkbenchToolbar.tsx`
- `src/l3-molecule/workbench/WorkbenchContent.tsx`
- `src/l3-molecule/workbench/WorkbenchInspector.tsx`
- `src/l3-molecule/workbench/workbenchLayout.ts`
- `src/l3-molecule/workbench/workbenchLayout.test.ts`

迁移策略：

- `WorkbenchShellView.tsx` 继续作为 readiness gate。
- DB ready 时从 `<DashboardView />` 改成 `<WorkbenchView />`。
- `DashboardView.tsx` 可短期保留为 compatibility wrapper，最终只做 redirect 或 re-export。
- `/dashboard` 保留兼容，但 canonical route 是 `/workbench`。
- `SettingsView.tsx` 的返回路径改为 `/workbench`。

Workbench layout modes：

```ts
export type WorkbenchLayoutMode = "wide" | "standard" | "compact" | "single";

export interface WorkbenchLayout {
  mode: WorkbenchLayoutMode;
  showSidebarLabels: boolean;
  showConversationList: boolean;
  inspectorMode: "inline" | "drawer" | "hidden";
  gridTemplateColumns: string;
}
```

断点建议：

| Width | Mode | Structure |
| --- | --- | --- |
| `>= 1360` | `wide` | expanded sidebar + conversation list + transcript + inline inspector |
| `1120-1359` | `standard` | compact/expanded sidebar + conversation list + transcript + inline inspector |
| `800-1119` | `compact` | compact sidebar + conversation list + transcript, inspector as drawer |
| `< 800` | `single` | one major pane at a time, navigation/list/detail controlled by state |

P2-A 先做 layout helper 和 CSS 结构；P2-B 再细化每个模块内容。

### 7.3 主导航

主导航模块：

- Setup Center
- Workbench
- Search
- Statistics
- AI
- Graph
- Settings
- Diagnostics

P2-A 中，Search/Statistics 可以作为 Workbench 内 tab 或 sidebar module。AI/Graph 可显示为 module entry，但具体功能提示“需要 P3 适配”或进入现有 lazy panel。

## 8. P2-A 详细实施计划

P2-A 是第一轮必须执行的子任务。目标是建立新的 UI 地基，避免后续继续改旧 Dashboard。

### Task A1: 建立视觉基线和截图基线

目的：在改 UI 前记录当前问题，后续可以对照。

操作：

- [ ] 启动开发服务器。
- [ ] 打开 `/`、`/workbench`、`/settings`。
- [ ] 记录当前 1440、1180、900、768、390 宽度下是否重叠、是否不可操作。
- [ ] 保存或记录截图结论到 `progress.md`。

命令：

```powershell
pnpm dev
```

如果使用浏览器自动化：

```powershell
pnpm build
pnpm preview -- --host 127.0.0.1
```

验收：

- [ ] `progress.md` 有 P2-A 前截图/观察记录。
- [ ] 明确记录当前最严重视觉断点，至少包括固定三栏挤压和 Setup Center 普通灰白布局。

### Task A2: 添加图标能力并替换全局 emoji 命令

目的：移除会影响专业感和可访问性的 emoji 命令按钮。

文件：

- 修改 `package.json`
- 修改 lockfile
- 修改 `src/l3-molecule/common/AppLayout.tsx`
- 修改 `src/l3-molecule/semantic/AiPanel.tsx`
- 后续 P2-B/C 清理其他页面

步骤：

- [ ] 添加 `lucide-react`。
- [ ] 创建 icon button primitive。
- [ ] 替换 AppLayout 中的锁、解锁、显示器、齿轮 emoji。
- [ ] 替换 AiPanel 中的齿轮 emoji。
- [ ] 使用 tooltip 和 `aria-label` 描述每个 icon button。

验收：

- [ ] `rg "⚙|🔒|🔓|🖥" src` 不再命中主 shell 和 AI panel。
- [ ] 所有替换后的 icon button 有键盘 focus 样式。

### Task A3: 建立 token CSS 和全局基础样式

目的：让所有后续组件有统一颜色、间距、排版、层级。

文件：

- 新增 `src/styles/tokens.css`
- 新增 `src/styles/layout.css`
- 新增 `src/styles/motion.css`
- 修改 `src/styles/globals.css`
- 修改 `src/App.tsx` 或入口样式 import 位置

步骤：

- [ ] 将现有 globals 中的颜色变量迁移到 token 文件。
- [ ] 保留旧变量别名，如 `--color-accent`，短期映射到新 token，避免一次性破坏旧组件。
- [ ] 定义 light/dark token。
- [ ] 添加 `:focus-visible` 通用 focus ring。
- [ ] 添加 `@media (prefers-reduced-motion: reduce)`，关闭不必要 animation/transition。
- [ ] 将 `html/body/#root overflow: hidden` 保留给 app shell，但内部 pane 必须显式负责滚动，避免 body 滚动陷阱变成不可滚动。

验收：

- [ ] 新组件不再硬编码常见颜色。
- [ ] 深色模式 token 名称与浅色一致。
- [ ] `pnpm typecheck` 通过。

### Task A4: 重写基础控件第一批

目的：替换 `AppleButton`、`GlassPanel` 风格依赖，建立可复用控件。

文件：

- 新增 `src/l4-atom/ui/Button.tsx`
- 新增 `src/l4-atom/ui/IconButton.tsx`
- 新增 `src/l4-atom/ui/Tooltip.tsx`
- 新增 `src/l4-atom/ui/Surface.tsx`
- 新增 `src/l4-atom/ui/StatusIndicator.tsx`
- 修改 `src/l4-atom/ui/AppleButton.tsx`
- 修改 `src/l4-atom/ui/index.ts`

Button variants：

- `primary`
- `secondary`
- `tertiary`
- `danger`
- `ghost`

Button sizes：

- `sm`: 28px height
- `md`: 32px height
- `lg`: 36px height

要求：

- [ ] 不使用 `rounded-full` 作为默认按钮形状。
- [ ] loading 时保留按钮宽度，不造成 layout shift。
- [ ] disabled 使用真实 `disabled` attribute，不只靠 `pointer-events-none`。
- [ ] focus-visible 明确可见。
- [ ] `AppleButton` 兼容旧 props，但内部转发到新 `Button`。

Surface variants：

- `plain`
- `sidebar`
- `panel`
- `popover`
- `modal`

要求：

- [ ] 新代码使用 `Surface`，不新增 `GlassPanel`。
- [ ] `GlassPanel` 暂时保留，但后续 P2-B/C 清理旧引用。

验收：

- [ ] AppLayout、Setup Center 第一轮可使用新控件。
- [ ] `pnpm lint` 不出现 unused exports。

### Task A5: 重构 AppLayout 和全局状态区

目的：让应用 shell 成为稳定桌面产品外壳。

文件：

- 修改 `src/l3-molecule/common/AppLayout.tsx`
- 新增 `src/l3-molecule/common/AppTitleBar.tsx`
- 新增 `src/l3-molecule/common/GlobalCommandCluster.tsx`
- 新增 `src/l3-molecule/common/AppStatusCluster.tsx`
- 修改 `src/l3-molecule/common/StatusBar.tsx`

步骤：

- [ ] 将 AppLayout 拆成 titlebar、main、statusbar。
- [ ] 删除假 macOS window lights。
- [ ] 将 privacy/dev/settings 放入 `GlobalCommandCluster`。
- [ ] `StatusBar` 改为低噪声状态条：service、DB、index、port、last error。
- [ ] `StatusBar` 不再假设 index status 只有 `ready/building`，应能显示 unknown/not configured/running/paused/error。
- [ ] AppTitleBar 保留 Tauri drag region。

验收：

- [ ] App 首屏不再出现假 macOS 交通灯。
- [ ] shell icon button 均有 tooltip、aria-label、focus state。
- [ ] HTTP ready 和 DB ready 不再只靠两个无说明小圆点表达。

### Task A6: 引入 WorkbenchFrame，逐步替代 Dashboard 三栏

目的：为 P2-B 内容重构建立结构地基。

文件：

- 新增 `src/l1-entry/pages/WorkbenchView.tsx`
- 新增 `src/l3-molecule/workbench/WorkbenchFrame.tsx`
- 新增 `src/l3-molecule/workbench/WorkbenchSidebar.tsx`
- 新增 `src/l3-molecule/workbench/WorkbenchToolbar.tsx`
- 新增 `src/l3-molecule/workbench/WorkbenchInspector.tsx`
- 新增 `src/l3-molecule/workbench/workbenchLayout.ts`
- 新增 `src/l3-molecule/workbench/workbenchLayout.test.ts`
- 修改 `src/l1-entry/pages/WorkbenchShellView.tsx`
- 修改 `src/l1-entry/routes/index.tsx` 如有需要
- 修改 `src/l1-entry/pages/DashboardView.tsx`

步骤：

- [ ] 写 `getWorkbenchLayout(width)` 纯函数测试，覆盖 1440、1180、900、768、390。
- [ ] `WorkbenchShellView` 在 `dbReady` 时渲染 `WorkbenchView`。
- [ ] `WorkbenchView` 先复用 P1 的 ContactList、ChatView、GlobalSearch、FilterBar、SearchResults、统计组件，但放入新 frame。
- [ ] 右侧 stats/AI 从固定第三栏改为 `WorkbenchInspector`。
- [ ] 小于 1120px 时 inspector 改 drawer/hidden，不继续挤三栏。
- [ ] `DashboardView` 暂时成为兼容 wrapper 或迁移后的旧名 re-export。

验收：

- [ ] 900px 宽度下不显示三栏挤压。
- [ ] 768px 宽度下主聊天区可操作，inspector 不占固定宽度。
- [ ] 390px 宽度下至少可以进入会话列表和消息详情，不出现关键按钮重叠。
- [ ] `dashboardLayout.ts` 不再作为主 workbench layout 使用。

### Task A7: Setup Center 视觉重构第一轮

目的：保留 P0/P1 功能，做成真正可用的桌面设置中心。

文件：

- 修改 `src/l1-entry/pages/SetupCenterView.tsx`
- 修改 `src/l3-molecule/setup/SetupStepper.tsx`
- 修改 `src/l3-molecule/setup/SetupModeChooser.tsx`
- 修改 `src/l3-molecule/setup/ConfigImportPanel.tsx`
- 修改 `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx`
- 修改 `src/l3-molecule/setup/ServiceControlPanel.tsx`
- 修改 `src/l3-molecule/setup/ReadinessChecklist.tsx`
- 修改 `src/l3-molecule/setup/DiagnosticPanel.tsx`

布局：

- 左侧：步骤导航，宽度 240 左右，可滚动。
- 中间：当前步骤表单，最大宽度 720，内容密度适中。
- 右侧：readiness + diagnostics inspector，宽度 320；窄屏下折叠为 drawer 或在主内容下方。

要求：

- [ ] 不使用 hero、装饰大图、玻璃背景。
- [ ] 每步主操作清晰：导入配置、选择目录、启动服务、连接已有服务、进入工作台。
- [ ] 错误状态使用 `Notice` 或 `ErrorState`，说明发生了什么、下一步做什么、是否可复制诊断。
- [ ] 敏感字段默认 mask，复制诊断遵守 privacy mode。
- [ ] “稍后配置，打开空工作台”弱化为 secondary/tertiary，不和主操作抢层级。

验收：

- [ ] `/` 首屏不再是普通灰白 Tailwind 三栏。
- [ ] Ready 状态主按钮使用统一 Button。
- [ ] 右侧 diagnostics 不在窄屏挤压主表单。

### Task A8: 设置页路由和视觉地基修复

目的：修复 P0/P1 遗留路径和 Settings 的视觉方向。

文件：

- 修改 `src/l1-entry/pages/SettingsView.tsx`
- 修改 `src/l3-molecule/settings/SettingsLayout.tsx`
- 修改 `src/l3-molecule/settings/DataSettings.tsx`
- 修改 `src/l3-molecule/settings/AIModelSettings.tsx`
- 修改 `src/l3-molecule/settings/AppearanceSettings.tsx`
- 修改 `src/l3-molecule/settings/AboutSettings.tsx`

步骤：

- [ ] 返回路径从 `/dashboard` 改为 `/workbench`。
- [ ] Settings 分类顺序调整为：数据与服务、外观、AI、关于。
- [ ] Settings sidebar 使用新 `Surface` 和 nav row，不再使用 `GlassPanel`。
- [ ] Data settings 明确链接到 Setup Center，而不是复制一套配置流程。
- [ ] Settings 内容区域使用稳定表单 section，不再 card 套 card。

验收：

- [ ] 设置页返回不会进入旧 Dashboard 语义。
- [ ] `SettingsLayout.tsx` 不再使用 `GlassPanel`。
- [ ] 默认分类和 P0/P1 的数据配置优先级一致。

### Task A9: A 阶段验证

自动验证：

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

如果 P2-A 没有修改 Rust：

```powershell
cd src-tauri
cargo test
```

浏览器/截图验证：

- [ ] `/` at 1440、1180、900、768、390。
- [ ] `/workbench` not ready state at 1440、900、390。
- [ ] `/workbench` ready state with available DB at 1440、1180、900、768、390。
- [ ] `/settings` at 1440、900、390。
- [ ] 深色模式或系统深色偏好下至少检查 `/workbench`。
- [ ] reduced motion 下无明显功能丢失。
- [ ] keyboard only 可以切换 sidebar、toolbar、设置返回、主要表单按钮。

验收：

- [ ] 所有自动命令通过。
- [ ] 截图观察结果写入 `progress.md`。
- [ ] P2-A 后没有新增 `GlassPanel` 引用。

## 9. P2-B Core Workbench Polish

P2-B 在 P2-A 的 WorkbenchFrame 上重构内容组件。

### Task B1: 会话列表重构

文件：

- `src/l3-molecule/chat/ContactList.tsx`
- 新增 `src/l3-molecule/chat/ConversationList.tsx`
- 新增 `src/l3-molecule/chat/ConversationRow.tsx`
- 新增 `src/l3-molecule/chat/ConversationListToolbar.tsx`

要求：

- [ ] 命名从 ContactList 逐步迁移到 ConversationList。
- [ ] 行高固定，避免 hover/loading 改变布局。
- [ ] 支持最近、联系人、群聊、搜索结果来源的 visual badges。
- [ ] 长昵称、长群名、长摘要稳定截断。
- [ ] 选中状态、hover、focus-visible 三者清晰区分。
- [ ] loading 显示 skeleton rows。
- [ ] empty state 说明“没有最近会话”或“数据库未返回 sessions”。
- [ ] error state 提供 retry 和复制诊断。
- [ ] 移除 per-row stagger 动画。

验收：

- [ ] 500+ conversations 时滚动仍流畅；如需要，再引入轻量 virtualization。
- [ ] 键盘可以在会话行之间移动并打开选中会话。

### Task B2: 聊天 transcript 重构

文件：

- `src/l3-molecule/chat/ChatView.tsx`
- `src/l3-molecule/chat/MessageList.tsx`
- `src/l3-molecule/chat/MessageBubble.tsx`
- 新增 `src/l3-molecule/chat/TranscriptHeader.tsx`
- 新增 `src/l3-molecule/chat/MessageGroup.tsx`
- 新增 `src/l3-molecule/chat/MessageMeta.tsx`

要求：

- [ ] 消息方向未知时使用 neutral transcript，不伪造左右气泡。
- [ ] 群聊消息显示 sender label，缺失昵称时显示稳定 username。
- [ ] 日期分隔、加载更早、滚动锚点要稳定。
- [ ] 搜索结果跳入时高亮目标消息，但不遮挡。
- [ ] 媒体消息在 P2 只做诚实占位状态，真实媒体预览留给 P4。
- [ ] 错误态显示 endpoint/status/body 摘要和 retry。
- [ ] 空会话显示明确说明，不用大卡片。

验收：

- [ ] 私聊和群聊 transcript 都能读。
- [ ] 不再出现 message key 不稳定导致的跳动。
- [ ] 390px 宽度下消息文本不会超出容器。

### Task B3: 搜索区重构

文件：

- `src/l3-molecule/search/GlobalSearch.tsx`
- `src/l3-molecule/search/FilterBar.tsx`
- `src/l3-molecule/search/SearchResults.tsx`
- 新增 `src/l3-molecule/search/SearchScopeMenu.tsx`
- 新增 `src/l3-molecule/search/SearchResultsPane.tsx`

要求：

- [ ] SearchField 放在 toolbar 或 dedicated search panel，不挤压 transcript。
- [ ] filters 使用 segmented/select/menu，不用一排不稳定 text buttons。
- [ ] 结果列表有 loading、empty、error、partial result 状态。
- [ ] 搜索结果点击使用 backend conversation id/username，不使用 display label。
- [ ] 搜索结果跳转后保持结果上下文，可返回结果列表。
- [ ] 支持 keyboard submit、clear、result navigation。

验收：

- [ ] 搜索结果多时不把聊天内容推没。
- [ ] 窄屏下搜索结果作为独立 pane 或 overlay drawer。

### Task B4: 统计 inspector 重构

文件：

- `src/l3-molecule/stats/DashboardOverview.tsx`
- `src/l3-molecule/stats/TrendChart.tsx`
- `src/l3-molecule/stats/TopContactCard.tsx`
- 新增 `src/l3-molecule/stats/StatsInspector.tsx`
- 新增 `src/l3-molecule/stats/MetricRow.tsx`
- 新增 `src/l3-molecule/stats/ChartFallbackTable.tsx`

要求：

- [ ] 统计从 card pile 改为 inspector 信息组。
- [ ] 指标行支持 label、value、delta、description。
- [ ] chart 有坐标/label/legend/table fallback。
- [ ] 不只靠颜色表达趋势和分类。
- [ ] group/private 的 top sender 语义区分清楚。
- [ ] loading 和 error 不影响聊天 transcript。

验收：

- [ ] stats empty/error 不导致右侧空白。
- [ ] 图表在窄 inspector 下仍可读；不可读时切换 table fallback。

## 10. P2-C Settings And Diagnostics

### Task C1: 设置中心统一

文件：

- `src/l1-entry/pages/SettingsView.tsx`
- `src/l3-molecule/settings/*`
- `src/l2-coordinator/data-clerk/stores/useSettingsStore.ts` 如需迁移默认分类

要求：

- [ ] 数据与服务分类排第一。
- [ ] AI 设置明确标记为高级或 P3 可用性依赖，不误导用户。
- [ ] Appearance 只保留真实生效设置；未实现的外观选项删除或禁用并说明。
- [ ] About 展示 app 版本、Tauri 版本、chatlog sidecar 版本来源。

### Task C2: 诊断面板统一

文件：

- `src/l3-molecule/setup/DiagnosticPanel.tsx`
- `src/l3-molecule/common/DevConsole.tsx`
- 新增 `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx`
- 新增 `src/l3-molecule/diagnostics/DiagnosticCopyButton.tsx`

要求：

- [ ] 同一套诊断摘要服务于 Setup Center、Workbench status、Dev Console。
- [ ] 默认 mask path/key/token；privacy mode 下更严格。
- [ ] copy diagnostics 不包含 message content。
- [ ] 错误状态都能跳转或展开相关诊断。

### Task C3: 状态反馈统一

文件：

- `src/l3-molecule/common/StatusBar.tsx`
- `src/l4-atom/ui/StatusIndicator.tsx`
- `src/l4-atom/ui/Notice.tsx`
- `src/l4-atom/ui/ErrorState.tsx`

要求：

- [ ] status tone 只有 neutral、info、success、warning、danger、ai。
- [ ] 错误文案统一结构：发生了什么、可能原因、下一步操作、复制诊断。
- [ ] loading 超过 300ms 显示 skeleton/spinner；按钮 loading 不改变布局。

## 11. P2-D AI And Graph Containment

P2-D 不修复全部 AI/Graph 后端合约，只先解决信息架构和干扰问题。

### Task D1: AI 入口隔离

文件：

- `src/l3-molecule/semantic/AiPanel.tsx`
- 新增 `src/l3-molecule/semantic/AiModuleView.tsx`
- 修改 `src/l3-molecule/workbench/WorkbenchSidebar.tsx`

要求：

- [ ] AI 不再默认占据聊天右栏。
- [ ] AI 入口在 sidebar 或 inspector tab 中，状态标记为 not configured/indexing/ready/error。
- [ ] `AiPanel` 内部按钮使用新控件和 icon，不使用 emoji。
- [ ] P3 前不能把 AI 状态包装成完全可用；错误和未配置要明确。

### Task D2: Graph 从浮窗改为模块入口

文件：

- `src/l1-entry/pages/DashboardView.tsx`
- `src/l3-molecule/graph/GraphCanvas.tsx`
- 新增 `src/l3-molecule/graph/GraphModuleView.tsx`
- 新增 `src/l3-molecule/graph/GraphSummaryPanel.tsx`
- 新增 `src/l3-molecule/graph/GraphFallbackTable.tsx`

要求：

- [ ] 移除 `DashboardView` 中 `graph.visible && <LazyGraphCanvas />` 的浮窗模式。
- [ ] Graph 作为独立 workbench module 或 inspector drawer 打开。
- [ ] 默认展示 summary/list/table；3D canvas 放到“Visualize” tab 并延迟加载。
- [ ] GraphCanvas 必须有关闭、返回、错误、空状态。
- [ ] 大图数据必须有 loading 状态和数据规模说明。

验收：

- [ ] graph 不再遮挡聊天主流程。
- [ ] 进入普通聊天不会加载 three/r3f graph chunk。

## 12. P2-E Visual QA And Accessibility

### Task E1: 响应式截图矩阵

必须检查：

- `/`
- `/workbench`
- `/settings`
- AI module entry
- Graph module entry
- not-ready workbench
- error state

宽度：

- 1440
- 1180
- 900
- 768
- 390

验收：

- [ ] 无核心文本重叠。
- [ ] 无关键按钮超出容器。
- [ ] 无 fixed panel 遮挡主内容。
- [ ] inspector/drawer 在窄屏可关闭。

### Task E2: 键盘和可访问性

检查：

- [ ] Tab 顺序从 titlebar 到 sidebar 到 content 到 inspector 合理。
- [ ] 所有 icon button 有 accessible name。
- [ ] Sidebar 当前项有 `aria-current`。
- [ ] Modal/drawer 有 focus trap 或至少打开后 focus 到容器，关闭后返回触发按钮。
- [ ] 不仅用颜色表达 ready/warning/error。
- [ ] reduced motion 下没有依赖动画才能理解的交互。

### Task E3: 隐私模式视觉验证

检查：

- [ ] 会话名、头像、消息正文、路径、key、诊断日志、图谱标签、搜索结果都按 privacy mode 处理。
- [ ] 隐私模式下状态和布局不改变尺寸。
- [ ] 复制诊断默认 mask 敏感信息。

## 13. 文件级修改总表

第一轮 P2-A 必改：

| Path | Action |
| --- | --- |
| `package.json` | add `lucide-react` |
| `src/styles/globals.css` | import tokens/layout/motion, keep compatibility aliases |
| `src/styles/tokens.css` | add semantic color/spacing/radius/type tokens |
| `src/styles/layout.css` | add app pane/layout utility classes |
| `src/styles/motion.css` | add motion tokens and reduced motion behavior |
| `src/l4-atom/ui/Button.tsx` | new primitive |
| `src/l4-atom/ui/IconButton.tsx` | new primitive |
| `src/l4-atom/ui/Tooltip.tsx` | new primitive |
| `src/l4-atom/ui/Surface.tsx` | new primitive |
| `src/l4-atom/ui/StatusIndicator.tsx` | new primitive |
| `src/l4-atom/ui/AppleButton.tsx` | compatibility wrapper |
| `src/l4-atom/ui/Typography.tsx` | remove negative tracking and align variants |
| `src/l4-atom/ui/index.ts` | export new primitives |
| `src/l3-molecule/common/AppLayout.tsx` | split and remove fake controls |
| `src/l3-molecule/common/AppTitleBar.tsx` | new titlebar |
| `src/l3-molecule/common/GlobalCommandCluster.tsx` | new global actions |
| `src/l3-molecule/common/AppStatusCluster.tsx` | new status summary |
| `src/l3-molecule/common/StatusBar.tsx` | semantic status rendering |
| `src/l1-entry/pages/WorkbenchView.tsx` | new ready workbench root |
| `src/l3-molecule/workbench/*` | new frame/sidebar/toolbar/inspector |
| `src/l1-entry/pages/WorkbenchShellView.tsx` | render new WorkbenchView |
| `src/l1-entry/pages/SetupCenterView.tsx` | visual shell redesign |
| `src/l1-entry/pages/SettingsView.tsx` | route and header cleanup |
| `src/l3-molecule/settings/SettingsLayout.tsx` | remove GlassPanel, reorder categories |

第二轮 P2-B/C/D 必改：

| Path | Action |
| --- | --- |
| `src/l3-molecule/chat/ContactList.tsx` | migrate to conversation list |
| `src/l3-molecule/chat/ChatView.tsx` | transcript frame polish |
| `src/l3-molecule/chat/MessageList.tsx` | stable transcript states |
| `src/l3-molecule/chat/MessageBubble.tsx` | neutral/group-safe rendering |
| `src/l3-molecule/search/*` | search panel polish |
| `src/l3-molecule/stats/*` | inspector/chart/table fallback polish |
| `src/l3-molecule/setup/*` | finish setup component polish |
| `src/l3-molecule/settings/*` | remove old glass card surfaces |
| `src/l3-molecule/semantic/*` | isolate AI module and update controls |
| `src/l3-molecule/graph/*` | move graph out of floating overlay |

## 14. 测试和验证策略

### Unit tests

必须新增或更新：

- `src/l3-molecule/workbench/workbenchLayout.test.ts`
- 如果新增 display helper，再加对应 pure tests。
- 保留 P1 adapter/fetcher tests，P2 不允许使它们退化。

重点断言：

- `getWorkbenchLayout(1440)` returns wide inline inspector。
- `getWorkbenchLayout(1180)` returns standard inline inspector 或明确宽度策略。
- `getWorkbenchLayout(900)` returns compact drawer inspector。
- `getWorkbenchLayout(768)` returns single/compact without three-column grid。
- `getWorkbenchLayout(390)` returns single pane。

### Automated commands

每个 P2 子阶段完成后运行：

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

如果改到 Tauri/Rust：

```powershell
cd src-tauri
cargo test
```

### Browser checks

P2 每个子阶段都必须在真实浏览器或 Codex in-app browser 中检查：

- Setup Center first run。
- Workbench not ready。
- Workbench ready。
- Settings。
- Sidebar collapse/expand。
- Inspector open/close。
- Dark mode。
- Privacy mode。

### Build performance checks

关注：

- 普通 workbench chunk 不应加载 3D graph 依赖。
- GraphCanvas chunk 警告如果仍存在，必须确认只有进入 Graph visualize 时才触发。
- 不通过全量 icon barrel 导入导致 bundle 膨胀。

## 15. 验收标准

P2 完成后必须同时满足：

- [ ] 首屏 Setup Center 视觉和交互达到正式桌面应用水平，不再像临时 Tailwind 表单。
- [ ] Workbench 主结构不再使用固定三栏 Dashboard。
- [ ] 半屏和 390px 宽度下无关键重叠、不可点击、不可滚动。
- [ ] 假 macOS 窗口灯移除。
- [ ] 主 shell 和主要模块不再使用 emoji 作为命令图标。
- [ ] 新代码不再新增 `GlassPanel` 引用。
- [ ] Settings 返回 `/workbench`，不再指向 `/dashboard`。
- [ ] AI 和 Graph 不再默认挤在聊天右栏或浮层遮挡主流程。
- [ ] 所有主要 loading、empty、error、not-ready 状态都能恢复或给出下一步。
- [ ] 键盘可访问路径覆盖 sidebar、toolbar、setup、settings、主要 workbench 操作。
- [ ] `pnpm lint/typecheck/test/build` 通过。
- [ ] 截图/浏览器 smoke 结果记录到 `progress.md`。

## 16. 风险与应对

- **Risk:** P2 同时改基础组件和业务页面，容易产生大量视觉回归。  
  **Response:** 先执行 P2-A，只替换 shell 和 frame；P2-B/C/D 分阶段迁移内容组件。

- **Risk:** `AppleButton` 被大量引用，直接删除会造成大面积改动。  
  **Response:** 先把 `AppleButton` 改成 `Button` wrapper，后续逐步替换名称。

- **Risk:** `GlassPanel` 在 settings、stats、semantic 中大量使用。  
  **Response:** P2-A 禁止新增引用，P2-B/C 逐模块清理。

- **Risk:** Graph/AI 合约仍不完整，视觉重构可能掩盖功能问题。  
  **Response:** P2 只隔离入口和状态表达，不宣称功能完整；P3 修合约。

- **Risk:** 图标库增加 bundle。  
  **Response:** 使用明确图标导入，build 后检查 chunk；必要时改成本地小图标集合。

- **Risk:** Setup Center 改视觉时破坏 P0/P1 的配置流程。  
  **Response:** P2-A 不改 setup commander 和 setup store 的业务逻辑，只改布局和组件。

- **Risk:** 响应式 single pane 会影响用户从搜索结果回到消息的路径。  
  **Response:** WorkbenchFrame 保存 active pane 和 return target，搜索结果跳转后保留返回按钮。

## 17. 建议提交顺序

1. `style: add p2 design tokens and primitives`
2. `refactor: rebuild app shell titlebar and status cluster`
3. `feat: introduce responsive workbench frame`
4. `style: redesign setup center foundation`
5. `style: refresh settings shell`
6. `style: polish conversation workbench`
7. `style: polish search and stats inspector`
8. `refactor: contain ai and graph modules`
9. `test: add p2 responsive and visual verification`

## 18. 执行顺序建议

实际实施时按这个顺序：

1. P2-A Task A1-A5：tokens、primitives、AppLayout。
2. P2-A Task A6：WorkbenchFrame 替代 Dashboard 主结构。
3. P2-A Task A7-A9：Setup Center、Settings、验证。
4. P2-B：chat/search/stats 内容区精修。
5. P2-C：settings/diagnostics/status 系统一致化。
6. P2-D：AI/Graph 入口隔离和 GraphCanvas 浮窗移除。
7. P2-E：完整截图矩阵、键盘、隐私、深浅色验证。

P2-A 是第一份可独立执行的修复计划。P2-A 完成并验证后，再开始 P2-B；不要在旧 Dashboard 上继续堆 P2-B 的视觉细节。

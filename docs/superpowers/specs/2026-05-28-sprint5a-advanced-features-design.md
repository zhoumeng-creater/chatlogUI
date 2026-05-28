# Sprint 5a: 高级功能 (Part A) — Design Spec

> **日期**: 2026-05-28
> **状态**: Draft
> **架构模式**: Mediator 四层架构 (L1-L4)
> **全量依赖**: Sprint 1-4 已完成

---

## 一、目标

Sprint 5 拆分为 5a + 5b。5a 聚焦三个核心交付物：

| 交付物 | 详细内容 | 验收标准 |
|--------|---------|---------|
| **设置系统 (SettingsView)** | 独立 `/settings` 路由页面，左侧导航 + 右侧内容，4 个子项 | 四个子项正常切换，AI 配置保存生效 |
| **图谱 Tooltip** | 悬浮详情卡片，3D 坐标→屏幕坐标映射，毛玻璃背景 | Tooltip 内容正确，定位无偏移 |
| **图谱↔聊天双向联动** | 双击节点→加载聊天 / 选中联系人→图谱高亮 / 搜索→图谱搜索 | 三个方向联动均可正确触发 |
| **系统材质集成** | macOS Vibrancy / Windows Mica，Rust 层实现 | 各平台材质效果正确 |

---

## 二、架构设计

### 2.1 SettingsView 页面

```
┌──────────────────────────────────────────────────────────────┐
│  ← 返回仪表盘    [标题栏: -webkit-app-region:drag]    [○□×]  │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│  AI 模型     │  根据左侧选中项，展示对应的配置表单            │
│              │                                               │
│  外观        │  · AI 模型：提供商选择 + 参数配置              │
│              │    （Ollama/GLM/DeepSeek，复用 SetupWizard）   │
│  数据        │                                               │
│              │  · 外观：明/暗/跟随系统、字体大小              │
│  关于        │    布局偏好、动画开关、窗口材质选择            │
│              │                                               │
│              │  · 数据：微信数据路径、缓存管理                │
│              │                                               │
│              │  · 关于：版本号、许可协议、日志导出            │
│              │                                               │
├──────────────┴───────────────────────────────────────────────┤
│                    状态栏                                      │
└──────────────────────────────────────────────────────────────┘
```

- 左侧导航栏宽度 180px，`GlassPanel` 毛玻璃背景
- 右侧内容区可滚动，各子项按分组卡片排列
- AI 模型配置复用 Sprint 3 的 `useAiCommander.saveConfig` / `testConnection`

### 2.2 图谱 Tooltip

```
╭─────────────────────╮
│ 张三                │  ← 实体名称（粗体）
│ 🧑 人物 · 提到 47 次 │  ← EntityKind + value
│                     │
│ 最近活跃：5月20日   │  ← last_seen
│ 关联关系：8 条       │  ← 关联边数量
│                     │
│ [双击查看聊天记录]   │  ← 操作提示
╰─────────────────────╯
```

- 使用 R3F `useThree` 将 3D 坐标转屏幕坐标，HTML `<div>` overlay 定位
- 毛玻璃效果：`backdrop-filter: blur(16px)` + 半透明深色背景
- 入场动画：弹簧放大 + 淡入

### 2.3 图谱↔聊天双向联动

**方向1：图谱 → 聊天（双击节点）**
```
双击节点 → GraphCommander.selectNode(nodeId)
         → 解析 node.name 匹配联系人 userName
         → ChatCommander.loadHistory(contactId)
         → 侧边栏高亮 + 加载聊天记录
```

**方向2：聊天 → 图谱（选中联系人时）**
```
选中联系人 → 检查图谱是否已打开
         → 已打开：以 node.name === contactName 匹配节点
         → 匹配节点：发光脉冲动画 + 相机飞向该节点
         → 未匹配/未打开：无操作
```

**方向3：搜索 → 图谱（全局搜索时）**
```
GlobalSearch 输入 → 原有消息搜索
                 → 若图谱已打开，同步调用 GraphCommander.searchGraph(keyword)
                 → 匹配节点高亮脉冲
```

### 2.4 系统材质集成

| 平台 | 材质 | 实现方式 |
|------|------|---------|
| macOS | Vibrancy | Rust 命令调用 `NSVisualEffectView` |
| Windows 11 | Mica | Tauri v2 `Window::set_effect` |
| Windows 10 | Acrylic | Tauri v2 `Window::set_effect` 自动降级 |
| Linux | 降级纯色 | no-op |

---

## 三、目录结构

```
src/
├── l1-entry/
│   ├── pages/
│   │   ├── DashboardView.tsx          # 修改：标题栏加⚙️入口 + 图谱联动集成
│   │   └── SettingsView.tsx           # 新增：设置页面
│   └── routes/
│       └── index.tsx                   # 修改：增加 /settings 路由
├── l2-coordinator/
│   ├── commander/
│   │   ├── useGraphCommander.ts       # 修改：+hoverNode + selectNode + focusOnChat + onDblClick
│   │   └── useSettingsCommander.ts    # 新增：设置模块指挥官
│   ├── data-clerk/
│   │   └── stores/
│   │       ├── useGraphStore.ts       # 修改：+hoveredNodeId + selectedNodeId + tooltipCoord
│   │       └── useSettingsStore.ts    # 新增：设置状态
│   └── api-docs/
│       └── settings.ts                # 新增：设置类型定义
├── l3-molecule/
│   ├── graph/
│   │   ├── GraphEngine.tsx            # 修改：+hover检测 + click/dblClick回调 + pulse动画 + camera飞动
│   │   ├── GraphNode3D.tsx            # 修改：+onPointerEnter/Leave + selected/pulse状态样式
│   │   └── GraphTooltip.tsx           # 新增：悬浮详情卡片
│   ├── settings/
│   │   ├── SettingsLayout.tsx         # 新增：左侧导航 + 右侧内容区
│   │   ├── AIModelSettings.tsx        # 新增：LLM 提供商配置
│   │   ├── AppearanceSettings.tsx     # 新增：主题/字体/材质设置
│   │   ├── DataSettings.tsx           # 新增：数据路径/缓存管理
│   │   └── AboutSettings.tsx          # 新增：版本/许可信息
│   └── common/
│       └── AppLayout.tsx              # 修改：标题栏增加设置齿轮入口
├── l4-atom/
│   └── system/
│       └── applyWindowMaterial.ts     # 新增：调用 Tauri 设置窗口材质
└── src-tauri/src/
    ├── lib.rs                         # 修改：注册 apply_window_material 命令
    └── material.rs                    # 新增：平台原生材质应用
```

---

## 四、数据模型

### 4.1 设置类型 (`settings.ts`)

```typescript
export type ThemeMode = 'system' | 'light' | 'dark';
export type WindowMaterial = 'vibrancy' | 'mica' | 'acrylic' | 'none';

export type SettingsCategory = 'ai' | 'appearance' | 'data' | 'about';

export interface SettingsState {
  // AI
  aiProvider: string;
  aiModel: string;
  aiEndpoint: string;
  aiApiKey?: string;
  // Appearance
  theme: ThemeMode;
  fontSize: 'small' | 'medium' | 'large';
  reduceAnimations: boolean;
  windowMaterial: WindowMaterial;
  // Data
  wxDataPath: string;
  sidecarPort: number;
  // About
}

export interface SettingsActions {
  setCategory: (category: SettingsCategory) => void;
  updateSettings: (partial: Partial<SettingsState>) => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  reset: () => void;
}
```

### 4.2 图谱 Store 新增字段 (`useGraphStore`)

```typescript
// 在现有 GraphState 中追加：
hoveredNodeId: string | null;
selectedNodeId: string | null;
tooltipCoord: { x: number; y: number } | null;

// 新增 actions:
setHoveredNode: (id: string | null, coord?: { x: number; y: number }) => void;
setSelectedNode: (id: string | null) => void;
pulseNode: (id: string | null) => void;

// 新增字段用于联动
pulsedNodeId: string | null;
```

### 4.3 GraphCommander 新增方法

```typescript
// useGraphCommander 追加：
hoverNode: (nodeId: string | null, pos?: THREE.Vector3, canvasBounds?: DOMRect) => void;
selectNode: (nodeId: string) => void;
focusOnChat: (contactName: string) => void;       // 聊天→图谱
focusOnGraphFromSearch: (keyword: string) => void; // 搜索→图谱
```

---

## 五、关键设计决策

| 决策 | 理由 |
|------|------|
| SettingsView 独立 `/settings` 路由 | 架构干净，不污染 DashboardView，符合 macOS 系统设置风格 |
| AI 配置复用 SetupWizard 逻辑 | 避免重复实现，useAiCommander 已有 saveConfig/testConnection |
| Tooltip 用 HTML div overlay | R3F 内 HTML/CSS 渲染毛玻璃比 WebGL 内 UI 更自然，drei `<Html>` 组件支持 |
| 图谱联动通过 L2 Commander 桥接 | 跨模块（graph → chat / chat → graph）必须经 L2，符合架构铁律 |
| 窗口材质在 Rust 层实现 | 平台 API（NSVisualEffectView/Mica）只有原生层可调用 |
| SettingsStore 独立管理 | 与 App/Chat/AI/Graph 状态职责分离 |
| 外观设置中的材质选项持久化到本地 | localStorage 存储，重启后恢复，兜底自动检测平台最优材质 |

---

## 六、不在 Sprint 5a 范围内

延后到 Sprint 5b：

- 隐私模式（头像模糊 + 文本掩码）
- 开发者控制台（实时日志 + 一键导出）
- 图谱控制栏（类型/时间筛选、布局切换、手动刷新）
- 时间轴叠加
- 径向/层级布局切换

---

## 七、验收清单

| # | 验收项 | 方法 |
|---|--------|------|
| 1 | `pnpm typecheck` 零错误 | 命令 |
| 2 | `pnpm lint` 零警告 | 命令 |
| 3 | `pnpm build` 成功 | 命令 |
| 4 | `cargo build` 成功 | 命令 |
| 5 | 标题栏齿轮图标点击 → `/settings` 页面 | 操作 |
| 6 | 设置四个子项（AI/外观/数据/关于）正常切换 | 操作 |
| 7 | AI 配置保存后回调生效（LLM 连接可测试） | 操作 |
| 8 | 外观设置（主题/字体/材质）变更即时生效 | 操作 |
| 9 | 图谱节点 hover → Tooltip 显示正确信息 | 操作 |
| 10 | 双击节点 → 侧边栏高亮联系人 + 加载聊天记录 | 操作 |
| 11 | 选中联系人 → 图谱对应节点脉冲高亮 + 相机飞向 | 操作 |
| 12 | 全局搜索 → 图谱同步搜索并高亮匹配节点 | 操作 |
| 13 | macOS 毛玻璃 / Windows Mica 窗口材质生效 | 肉眼 |
| 14 | L4 原子间无相互 import | 代码审查 |
| 15 | L3 分子间无相互 import | 代码审查 |
| 16 | L1 页面无业务逻辑 | 代码审查 |

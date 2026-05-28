# Sprint 4: 3D 知识图谱系统 — Design Spec

> **日期**: 2026-05-28
> **状态**: Approved
> **架构模式**: Mediator 四层架构 (L1-L4)
> **技术栈**: React Three Fiber + @react-three/drei + d3-force-3d
> **全量依赖**: Sprint 1-3 已完成

---

## 一、目标

在 DashboardView 上添加一个**浮动 3D 知识图谱**窗口，基于 chatlog_alpha 的 `/api/v1/graph/visualize` API，以三维力导向图可视化聊天记录中提取的实体与关系网络。

| 交付物 | 详细内容 | 验收标准 |
|--------|---------|---------|
| **浮动图谱容器** | DashboardView 内浮动叠加，可拖拽/缩放/最小化，毛玻璃半透明背景 | 浮动层显示/隐藏/移动流畅 |
| **3D 节点渲染** | React Three Fiber 发光球体，按 entity kind 分 6 色，大小由 value 决定 | 全部 6 种实体类型颜色正确 |
| **3D 连线渲染** | 粒子流光线，3 种关系状态区分（active/ended/conflict），label 悬浮 | 3 种状态视觉可区分 |
| **力导向布局** | d3-force-3d 物理模拟，节点自动分散聚拢 | 节点布局稳定不抖 |
| **相机控制** | OrbitControls 拖拽旋转/缩放/平移，可开关自动旋转 | 交互流畅，60fps |

---

## 二、架构设计

### 2.1 浮动图谱容器定位

浮动层在 DashboardView 的 CSS `position: fixed/absolute` 中实现，默认位于窗口中央偏右，初始尺寸 600x450px，可拖拽标题栏移动，可拖拽右下角缩放，最小化按钮收缩为浮动圆形图标。

```
┌──────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐   │
│  │  自定义标题栏                    [交通灯按钮]      │   │
│  ├──────────┬──────────────────────┬─────────────────┤   │
│  │  联系人  │                      │  统计/AI 面板   │   │
│  │  侧边栏  │    聊天消息区        │                 │   │
│  │          │                      │                 │   │
│  │          │     ┌──────────────┐ │                 │   │
│  │          │     │  浮动图谱    │ │                 │   │
│  │          │     │  (R3F 3D)   │ │                 │   │
│  │          │     │              │ │                 │   │
│  │          │     └──────────────┘ │                 │   │
│  ├──────────┴──────────────────────┴─────────────────┤   │
│  │                状态栏                              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                [○ 图谱] │
└──────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

Sprint 4 在现有文件基础上新增/修改：

```
src/
├── l1-entry/
│   └── pages/
│       └── DashboardView.tsx          # 修改：引入 GraphCanvas 浮动层
├── l2-coordinator/
│   ├── commander/
│   │   └── useGraphCommander.ts       # 新增：图谱模块指挥官
│   ├── data-clerk/
│   │   └── stores/
│   │       └── useGraphStore.ts       # 新增：图谱状态 (Zustand)
│   └── api-docs/
│       └── graph.ts                   # 新增：图谱 API 类型定义
├── l3-molecule/
│   ├── semantic/                      # 已有，不修改
│   └── graph/                         # 新增目录 **
│       ├── GraphCanvas.tsx            # 新增：浮动容器 + R3F Canvas 挂载
│       ├── GraphEngine.tsx            # 新增：R3F 场景管理（灯光/相机/后处理）
│       ├── GraphNode3D.tsx            # 新增：3D 节点组件
│       ├── GraphEdge3D.tsx            # 新增：3D 连线组件
│       └── GraphLabels.tsx            # 新增：节点名称标签 (drei Text)
├── l4-atom/
│   ├── network/
│   │   ├── index.ts                   # 修改：新增图谱 API 导出
│   │   ├── fetchGraphVisualize.ts     # 新增：GET /api/v1/graph/visualize
│   │   ├── fetchGraphQuery.ts         # 新增：GET /api/v1/graph/query
│   │   └── fetchGraphStatus.ts        # 新增：GET /api/v1/graph/status
│   └── ui/
│       └── index.ts                   # 不修改（复用已有 UI 原子）
```

### 2.3 依赖引入

```json
// package.json 新增
{
  "@react-three/fiber": "^8.x",
  "@react-three/drei": "^9.x",
  "three": "^0.160.x",
  "@types/three": "^0.160.x",
  "d3-force-3d": "^3.x"
}
```

---

## 三、数据模型

### 3.1 API 输入 (`GET /api/v1/graph/visualize`)

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `keyword` | string | 空 | 模糊搜索关键词 |
| `start` | RFC3339 | 空 | 开始时间 |
| `end` | RFC3339 | 空 | 结束时间 |
| `window` | string | 空 | today / 1d / 7d / 30d / 90d / 1y |
| `limit` | int | 80 (max 300) | 返回结果上限 |

### 3.2 API 输出 (`VisualizeResult`)

```typescript
export interface VisualizeResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  timeline: GraphTimeline[];
  generated_at: number; // unix timestamp
}

export interface GraphNode {
  id: string;       // "entity:123"
  name: string;     // entity display name
  kind: EntityKind; // person|organization|project|product|customer|group|topic|keyword|event|unknown
  value: number;    // mention count (for sizing)
  last_seen: number; // unix timestamp
}

export type EntityKind =
  | 'person' | 'organization' | 'project' | 'product'
  | 'customer' | 'group' | 'topic' | 'keyword' | 'event' | 'unknown';

export interface GraphEdge {
  id: string;         // "relation:456"
  source: string;     // "entity:123"
  target: string;     // "entity:789"
  label: string;      // predicate name
  status: EdgeStatus; // active|ended|conflict
  confidence: number; // 0-1
  last_seen: number;
  evidence_count: number;
}

export type EdgeStatus = 'active' | 'ended' | 'conflict';

export interface GraphTimeline {
  time: number;
  type: 'event' | 'fact' | 'relation';
  title: string;
  description: string;
  source?: string;
}
```

### 3.3 GraphStore 状态

```typescript
export interface GraphState {
  data: VisualizeResult | null;
  loading: boolean;
  error: string | null;
  // 可视化参数
  keyword: string;
  timeWindow: string;
  // 相机状态
  autoRotate: boolean;
  // 操作
  setData: (data: VisualizeResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setKeyword: (keyword: string) => void;
  setTimeWindow: (window: string) => void;
  toggleAutoRotate: () => void;
  reset: () => void;
}
```

---

## 四、视觉规范

### 4.1 节点 (GraphNode3D)

| 属性 | 规格 |
|------|------|
| 几何体 | `sphereGeometry(1, 32, 32)` |
| 材质 | `meshStandardMaterial` + emissive 发光，metalness: 0.3, roughness: 0.4 |
| 半径 | `0.5 + Math.log2(Math.max(value, 1)) * 0.25` (clamp 0.5-3.0) |

| Entity Kind | 颜色 (HEX) | 发光强度 |
|-------------|------------|---------|
| person | #FF6B6B | 0.4 |
| organization | #74B9FF | 0.4 |
| project | #FFEAA7 | 0.4 |
| topic / keyword | #A29BFE | 0.4 |
| event | #55EFC4 | 0.4 |
| unknown / others | #999999 | 0.2 |

### 4.2 连线 (GraphEdge3D)

| Edge Status | 颜色 | 样式 | 粒子速度 |
|-------------|------|------|---------|
| active | #4A9EFF | 实线 | 1.0x (快) |
| ended | #888888 | 虚线 (dashOffset 动画) | 0.3x (慢) |
| conflict | #FF6B6B | 虚线 + 脉冲发光 | 0.6x |

- 线宽: `0.5 + confidence * 1.5` px
- 粒子密度: 随 evidence_count 增加（每 5 份证据增加 1 个粒子）
- Label: drei `<Text>` 组件悬浮于连线中点，字体大小 0.3，颜色 #cccccc

### 4.3 布局

- **算法**: d3-force-3d 力导向模拟
  - `forceLink`: distance = 2.5, strength = 0.3
  - `forceCharge`: strength = -nodes.length * 2
  - `forceCenter`: (0, 0, 0)
  - `forceCollide`: radius = node_radius + 0.5
- **运行**: 初始 300 tick 快速收敛，之后持续低速模拟

### 4.4 相机

- **OrbitControls**: enableDamping: true, dampingFactor: 0.08
- **初始位置**: `position: [0, 0, 8]`, `lookAt: [0, 0, 0]`
- **缩放范围**: minDistance: 3, maxDistance: 20
- **自动旋转**: 默认开启，speed: 0.3，用户交互时暂停

### 4.5 场景环境

- **背景**: 深色渐变 `color: #0a0a1a`（用 R3F `<color>` 或 scene.background）
- **灯光**: 
  - AmbientLight: intensity 0.4
  - PointLight: position [5, 5, 5], intensity 0.8
  - PointLight: position [-5, -3, -3], intensity 0.4
- **粒子背景**: 200 个随机散布的微小星星粒子（PointMaterial），营造深空感

---

## 五、关键设计决策

| 决策 | 理由 |
|------|------|
| R3F 而非原生 Three.js | 与 React 组件树天然集成，Zustand 状态直通 `<Canvas>` 内组件 |
| d3-force-3d 布局 | 成熟稳定的 3D 力导向库，无需自行实现 |
| 浮动层而非页面级 | 用户可在查图同时浏览聊天记录 |
| 图谱独立 GraphStore | 与 App/Chat/AI 状态职责分离 |
| 节点只用球体 | 简单视觉语言，kind 以颜色区分，避免过于复杂的自定义几何体 |
| 暂时不做 tooltip 和联动 | 核心渲染优先，交互增强留到后续 Sprint |

---

## 六、验收清单

| # | 验收项 | 方法 |
|---|--------|------|
| 1 | `pnpm typecheck` 零错误 | 运行 `pnpm typecheck` |
| 2 | `pnpm lint` 零警告 | 运行 `pnpm lint` |
| 3 | `pnpm build` 成功 | 运行 `pnpm build` |
| 4 | 浮动图谱按钮在 DashboardView 上可见 | 肉眼 |
| 5 | 点击打开浮动窗口，R3F Canvas 渲染 | 肉眼 |
| 6 | `/api/v1/graph/visualize` 数据正常拉取 | 检查网络请求 |
| 7 | 6 种 entity kind 节点颜色正确 | 肉眼 + 对比色表 |
| 8 | active/ended/conflict 连线视觉可区分 | 肉眼 |
| 9 | 力导向布局节点不重叠 | 肉眼 |
| 10 | OrbitControls 旋转/缩放/平移流畅 | 鼠标操作 |
| 11 | 浮动层拖拽标题栏移动正常 | 鼠标操作 |
| 12 | 最小化/关闭按钮功能正常 | 点击操作 |
| 13 | L4 原子间无相互 import | 代码审查 |
| 14 | L3 分子间无相互 import | 代码审查 |
| 15 | L1 页面无 graph 业务逻辑 | 代码审查 |
| 16 | 60fps，无卡顿（<200 节点 + <500 连线时） | Chrome DevTools Performance |

---

## 七、不在 Sprint 4 范围内

以下功能延迟到 Sprint 5（高级功能）：

- 节点点击 Tooltip 详情卡片
- 双击节点 → 侧边栏高亮 → 聊天跳转
- 图谱控制栏（类型/时间筛选、布局切换、搜索）
- 时间轴叠加
- 径向/层级布局切换
- 图谱数据手动刷新按钮（自动刷新保留）

---

> **下一步**: 写 implementation plan → 执行

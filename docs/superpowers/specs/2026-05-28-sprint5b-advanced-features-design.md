# Sprint 5b: 高级功能 (Part B) — Design Spec

> **日期**: 2026-05-28
> **状态**: Draft
> **架构模式**: Mediator 四层架构 (L1-L4)
> **前置依赖**: Sprint 5a 已完成并验证

---

## 一、目标

Sprint 5b 是 Sprint 5 高级功能阶段的后半部分，聚焦 4 个交付物：

| 交付物 | 详细内容 | 验收标准 |
|--------|---------|---------|
| **隐私模式** | 全局开关，头像高斯模糊 + 联系人名称/消息文本掩码 | 开关切换即时生效，刷新/重启后保持 |
| **开发者控制台** | 实时显示 Sidecar stdout/stderr 日志，一键导出 | 日志实时滚动，导出文件内容正确 |
| **图谱控制栏** | 节点类型筛选 + 时间窗口 + 布局切换 + 自动旋转 + 刷新 | 筛选/布局即时生效 |
| **时间轴叠加** | 图谱底部时间轴面板，展示事件/事实/关系时间线 | 条目正确渲染，点击可联动高亮 |

---

## 二、架构设计

### 2.1 隐私模式 (Privacy Mode)

```
用户点击 🔒 → SettingsStore.togglePrivacy()
                    ↓
          SettingsStore.privacyOn = true
                    ↓
     ┌──────────────┼──────────────┐
     ↓              ↓              ↓
  ContactItem    MessageBubble   AppLayout
  (头像 blur)    (文本掩码)      (图标切换 🔒→🔓)
```

**实现细节：**

| 层级 | 组件 | 变更 |
|------|------|------|
| L2 API | `settings.ts` | `SettingsState` 新增 `privacyOn: boolean`，默认 `false` |
| L2 Store | `useSettingsStore.ts` | 新增 `togglePrivacy()` action，`saveToStorage` 自动持久化 |
| L3 | `AppLayout.tsx` | 标题栏右侧新增隐私开关按钮 (🔒/🔓)，位于设置齿轮左侧 |
| L3 | `ContactItem.tsx` | 订阅 `privacyOn`，头像 `filter: blur(8px)`，`displayName` 替换为 `"***"` |
| L3 | `MessageBubble.tsx` | 订阅 `privacyOn`，文本内容替换为等长 `"*"` 掩码 |

**头像模糊:** 通过 CSS `filter: blur(8px)` 实现，不影响布局
**文本掩码:** `content.replace(/[^\s]/g, '*')` 替换所有非空白字符，保留空格和换行结构

### 2.2 开发者控制台 (Dev Console)

```
Rust spawn Sidecar with stdout/stderr piped
        ↓
   thread::spawn read lines → emit "sidecar-log" event
        ↓
   Frontend listenSidecarLogs() (L4 系统原子)
        ↓
   DevConsoleStore.addLog(entry) (L2 Store)
        ↓
   DevConsole 组件渲染 (L3)
        ↓
   用户点击导出 → invoke("export_logs") → Rust 写文件 → 返回路径
```

**Rust 层改造 (`sidecar.rs`):**

```rust
// Sidecar 启动时使用 .stdout(Stdio::piped()).stderr(Stdio::piped())
// spawn 两个线程分别读取 stdout/stderr 行
// 每读取一行通过 app_handle.emit("sidecar-log", LogPayload { ... }) 推送到前端
```

**前端实现：**

| 层级 | 文件 | 职责 |
|------|------|------|
| L4 系统原子 | `listenSidecarLogs.ts` | 调用 `listen("sidecar-log")` 注册 Tauri event 监听，返回 `Promise<UnlistenFn>` |
| L2 Store | `useDevConsoleStore.ts` | `logs: LogEntry[]` (最多保留 5000 条), `visible: boolean`, `addLog()`, `clear()`, `toggle()` |
| L2 Commander | `useDevConsoleCommander.ts` | 封装 store 操作 + 导出功能（`invoke("export_logs")` 获取保存路径） |
| L3 | `DevConsole.tsx` | 底部可折叠面板，深色终端风格 (`background: #1e1e2e`)，等宽字体 12px，自动滚动到底部，最大高度 200px |
| L3 | `AppLayout.tsx` | 标题栏增加控制台开关按钮 (🖥) |
| L1 | `DashboardView.tsx` | 在 StatusBar 上方集成 DevConsole |

**日志数据结构:**
```typescript
interface LogEntry {
  id: number;
  time: string;       // "10:23:45"
  level: "stdout" | "stderr";
  message: string;
}
```

**导出功能:**
- Rust `export_logs` command 将全部日志写入临时文件，返回文件路径
- 前端通过 `@tauri-apps/plugin-dialog` 弹出保存对话框

### 2.3 图谱控制栏 (Graph Control Bar)

```
┌──────────────────────────────────────────────────┐
│  知识图谱 · 42 节点 · 87 连线   [_]  [×]         │  ← 原有标题栏
├──────────────────────────────────────────────────┤
│ [👤 🏢 📁][时间:全部 ▼][布局:力导向 ▼][🔄][◎]   │  ← 新增控制栏
├──────────────────────────────────────────────────┤
│                                                  │
│              3D Canvas                           │
│                                                  │
├──────────────────────────────────────────────────┤
│  [时间轴面板 (可折叠)]                            │  ← 模块 2.4
└──────────────────────────────────────────────────┘
```

**控制栏组成：**

| 控件 | 类型 | 功能 | 对应 Store 状态 |
|------|------|------|----------------|
| 实体类型筛选 | 按钮组 (toggle) | person/organization/project/product/group/topic+keyword+event/unknown，6 个分组 | `visibleEntityKinds: EntityKind[]` |
| 时间窗口 | 下拉选择 | 全部 / 近7天 / 近30天 / 近90天 | `timeWindow: string` (已有) |
| 布局切换 | 按钮组 | 力导向 / 径向 | `layoutMode: 'force' \| 'radial'` |
| 自动旋转 | 复选框 | 开关相机自动旋转 | `autoRotate: boolean` (已有) |
| 刷新 | 图标按钮 | 重新加载图谱数据 | `refreshGraph()` (已有) |

**L2 扩展:**
- `useGraphStore` 新增字段: `visibleEntityKinds: EntityKind[]` (默认全部), `layoutMode: 'force' | 'radial'`, `radialRadius: number`
- `useGraphCommander` 新增方法: `setVisibleKinds(kinds)`, `setLayoutMode(mode)`

**L3 新组件:**
- `GraphControlBar.tsx`: 紧凑单行，高度 32px，按钮使用 small variant

**径向布局实现:**
- 修改 `GraphEngine.tsx` 的 `runForceLayout`，当 `layoutMode === 'radial'` 时使用环形排列替代力导向
- 径向布局: 节点按 value 排序，均匀分布在不同半径的同心圆环上
- 不再运行动态力模拟，直接静态布局

**筛选实现:**
- 节点筛选: 在 GraphEngine 中过滤 `data.nodes.filter(n => visibleEntityKinds.includes(n.kind))`
- 连线筛选: 只渲染两端节点都可见的边

### 2.4 时间轴叠加 (Timeline Overlay)

```
┌─────────────────────────────────────┐
│  时间轴                          [−] │
├─────────────────────────────────────┤
│ ● 2026-05-20  📅 event               │
│   项目启动会议                        │
│   与张三、李四讨论新项目方案           │
│                                     │
│ ● 2026-05-18  📋 fact                │
│   张三担任项目经理                    │
│                                     │
│ ● 2026-05-15  🔗 relation            │
│   张三-李四: 同事关系                 │
│   来源: 群聊"技术讨论组"              │
│                                     │
│ ...更多条目...                       │
└─────────────────────────────────────┘
```

**位置:** GraphCanvas 底部，位于 3D Canvas 下方，可折叠
**数据源:** `VisualizeResult.timeline: GraphTimeline[]`
**渲染:** 垂直滚动时间轴，每条目时间标签 + 类型图标 + 标题 + 描述

**交互:**
- 点击条目 → `useGraphStore.setHighlightedTimeline(timelineId)` → 在 GraphEngine 中通过 source 字段匹配节点名 → 脉冲高亮 + 相机飞动
- 折叠/展开按钮 (与 GraphControlBar 中切换)

**L2 扩展:**
- `useGraphStore` 新增: `timelineVisible: boolean`, `highlightedTimelineId: string | null`

**L3 新组件:**
- `GraphTimeline.tsx`: 固定高度 150px，`overflow-y: auto`，深色半透明背景

**联动逻辑:**
```
点击时间轴条目 → highlightedTimelineId 设置
              → GraphEngine useEffect 中检测到变化
              → 匹配 source 字段查找节点 name
              → 找到节点 → setPulsedNode(id) + 相机飞动
```

---

## 三、目录结构变更

```
src/
├── l1-entry/
│   └── pages/
│       └── DashboardView.tsx               # 修改：引入 DevConsole
├── l2-coordinator/
│   ├── api-docs/
│   │   └── settings.ts                      # 修改：SettingsState +privacyOn
│   ├── commander/
│   │   ├── useDevConsoleCommander.ts        # 新增
│   │   └── useGraphCommander.ts             # 修改：+setVisibleKinds +setLayoutMode
│   └── data-clerk/
│       └── stores/
│           ├── useDevConsoleStore.ts         # 新增
│           ├── useGraphStore.ts              # 修改：+visibleEntityKinds +layoutMode +timelineVisible +highlightedTimelineId
│           └── useSettingsStore.ts           # 修改：+privacyOn +togglePrivacy
├── l3-molecule/
│   ├── chat/
│   │   ├── ContactItem.tsx                  # 修改：隐私模式 avatar blur + 名称掩码
│   │   └── MessageBubble.tsx                # 修改：隐私模式文本掩码
│   ├── common/
│   │   ├── AppLayout.tsx                    # 修改：标题栏 +隐私开关 +控制台按钮
│   │   └── DevConsole.tsx                   # 新增
│   └── graph/
│       ├── GraphCanvas.tsx                  # 修改：集成控制栏 + 时间轴
│       ├── GraphControlBar.tsx              # 新增
│       ├── GraphEngine.tsx                  # 修改：实体筛选 + 径向布局
│       └── GraphTimeline.tsx                # 新增
├── l4-atom/
│   └── system/
│       ├── listenSidecarLogs.ts             # 新增
│       └── index.ts                         # 修改：新导出
└── src-tauri/src/
    ├── sidecar.rs                           # 修改：stdout/stderr 捕获 + event emit
    ├── commands.rs                          # 修改：+export_logs command
    └── lib.rs                               # 修改：注册新 command
```

---

## 四、数据模型

### 4.1 Settings 扩展

```typescript
// settings.ts SettingsState 追加:
privacyOn: boolean;  // 默认 false

// SETTINGS_DEFAULTS 追加:
privacyOn: false,
```

### 4.2 DevConsole 类型

```typescript
// useDevConsoleStore.ts
interface LogEntry {
  id: number;
  time: string;
  level: "stdout" | "stderr";
  message: string;
}

interface DevConsoleState {
  logs: LogEntry[];
  visible: boolean;
  autoScroll: boolean;
}

interface DevConsoleActions {
  addLog: (level: "stdout" | "stderr", message: string) => void;
  clear: () => void;
  toggle: () => void;
  exportLogs: () => Promise<string | null>;
}
```

### 4.3 GraphStore 扩展

```typescript
// useGraphStore GraphState 追加:
visibleEntityKinds: EntityKind[];       // 默认全部 9 种
layoutMode: "force" | "radial";        // 默认 "force"
radialRadius: number;                   // 默认 4
timelineVisible: boolean;              // 默认 false
highlightedTimelineId: string | null;  // 默认 null

// GraphActions 追加:
setVisibleEntityKinds: (kinds: EntityKind[]) => void;
setLayoutMode: (mode: "force" | "radial") => void;
setTimelineVisible: (visible: boolean) => void;
setHighlightedTimeline: (id: string | null) => void;
```

### 4.4 GraphCommander 新增方法

```typescript
// useGraphCommander 追加:
setVisibleKinds: (kinds: EntityKind[]) => void;
setLayoutMode: (mode: "force" | "radial") => void;
setTimelineVisible: (visible: boolean) => void;
highlightTimelineEntry: (timelineId: string) => void;
```

---

## 五、关键设计决策

| 决策 | 理由 |
|------|------|
| 隐私模式通过 SettingsStore 管理 | 与现有设置系统一致，自动持久化到 localStorage |
| DevConsole 日志捕获在 Rust 层实现 | Sidecar 进程由 Rust 管理，stdout/stderr 也只有 Rust 能捕获 |
| 日志通过 Tauri event 推送而非轮询 | 实时性要求，event 机制开销远低于 HTTP 轮询 |
| 控制台最大高度 200px 且可折叠 | 不抢占聊天区主空间，用户按需查看 |
| 实体筛选在 GraphEngine 中通过数组过滤 | 简单高效，不改变 force layout 计算逻辑 |
| 径向布局作为 layoutMode 切换 | 力导向保持不变，径向作为备选方案，共享同一套节点渲染 |
| 时间轴从现有 API 数据渲染 | `VisualizeResult.timeline` 已存在于 API 类型中，无需新增网络请求 |
| Sprint 5b 文件均与现有代码共存扩展 | 不新创建目录，在各已有模块中增量添加 |

---

## 六、验收清单

| # | 验收项 | 方法 |
|---|--------|------|
| 1 | `pnpm typecheck` 零错误 | 命令 |
| 2 | `pnpm lint` 零警告 | 命令 |
| 3 | `pnpm build` 成功 | 命令 |
| 4 | `cargo build` 成功 | 命令 |
| 5 | 隐私开关点击 → 头像模糊 + 名称/消息变星号 | 操作 |
| 6 | 隐私设置刷新后保持 (localStorage) | 操作 |
| 7 | 开发者控制台打开 → 实时显示 Sidecar 日志 | 操作 |
| 8 | 点击导出按钮 → 日志文件保存成功 | 操作 |
| 9 | 图谱控制栏实体类型筛选 → 对应节点显示/隐藏 | 操作 |
| 10 | 图谱控制栏时间窗口切换 → 图谱数据刷新 | 操作 |
| 11 | 图谱布局切换 (力导向 ↔ 径向) → 节点重新排列 | 操作 |
| 12 | 时间轴面板打开 → 条目正确显示 | 操作 |
| 13 | 点击时间轴条目 → 关联节点脉冲高亮 | 操作 |
| 14 | L4 原子间无相互 import | 代码审查 |
| 15 | L3 分子间无相互 import | 代码审查 |
| 16 | L1 页面无业务逻辑 | 代码审查 |

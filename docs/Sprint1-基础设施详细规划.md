# Sprint 1: 基础设施建设 — 详细开发规划

> **所属项目**: chatlog_alpha 桌面应用  
> **架构模式**: Mediator 四层架构  
> **优先级**: P0（最高优先级，所有后续 Sprint 的前置依赖）  
> **预估工期**: 2-3 周  
> **状态**: 规划阶段  

---

## 一、Sprint 1 目标

搭建一个**可运行、可验证**的 Tauri 桌面应用骨架，完成三大基石：

| 基石 | 交付物 | 验收标准 |
|------|--------|---------|
| **Sidecar 生命周期管理** | Go 后端进程的启动/守护/退出全闭环 | 连开连关 10 次无僵尸进程残留 |
| **Mediator 四层架构骨架** | L1-L4 的完整目录结构和核心组件接口 | 各层编译通过，目录结构符合规范 |
| **Apple 风格基础 UI** | 无边框窗口 + 骨架屏启动页 + 基础布局 | 视觉效果符合 Apple HIG 规范 |

---

## 二、Sprint 1 唯一交付页面

仅交付一个可运行的页面，承载所有基础设施:

```
┌──────────────────────────────────────┐
│  ┌──────────────────────────────┐   │
│  │      自定义标题栏 (无边框)      │   │
│  │   [交通灯按钮]  chatlog_alpha   │   │
│  ├──────────────────────────────┤   │
│  │                              │   │
│  │    启动加载页 (LaunchView)    │   │
│  │                              │   │
│  │   [骨架屏动画 - 正在启动引擎]   │   │
│  │   [健康检查状态指示器]          │   │
│  │                              │   │
│  │  · 端口清理: ✓               │   │
│  │  · 引擎启动: ⏳              │   │
│  │  · 数据库连接: 等待中...      │   │
│  │                              │   │
│  │  ┌─────────────────────────┐ │   │
│  │  │  引导选择数据目录 (按需)   │ │   │
│  │  └─────────────────────────┘ │   │
│  │                              │   │
│  ├──────────────────────────────┤   │
│  │      状态栏 (Sidecar状态)     │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

---

## 三、任务分解

### 阶段 3.1: 项目脚手架搭建

| 任务 ID | 任务 | 详情 | 产出 |
|---------|------|------|------|
| **T-1.1** | 初始化 Tauri 项目 | `npm create tauri-app@latest`，选择 React + TypeScript + Vite 模板 | 项目目录骨架 |
| **T-1.2** | 配置 TypeScript 严格模式 | tsconfig.json: strict=true, noUnusedLocals=true, noUnusedParameters=true, paths 别名配置 | tsconfig.json |
| **T-1.3** | 配置 ESLint + Prettier | 安装 eslint, prettier, @typescript-eslint/*, eslint-plugin-react-hooks | .eslintrc.cjs, .prettierrc |
| **T-1.4** | 安装运行时依赖 | react@18, react-dom@18, react-router-dom@6, zustand, framer-motion, three, @tauri-apps/api, @tauri-apps/plugin-shell, @tauri-apps/plugin-dialog | package.json |
| **T-1.5** | 配置 Vite Path Alias | `@/` 映射到 `src/`，`@l1/` -> `src/l1-entry/`，`@l2/` -> `src/l2-coordinator/` ... | vite.config.ts |
| **T-1.6** | 创建四层目录结构 | 按约定创建完整的 l1-l4 目录树（见下文目录结构） | 目录结构 |
| **T-1.7** | 验证构建 | `npm run tauri dev` 能启动默认 Tauri 窗口 | 可运行的空窗口 |

#### 目录结构 (本 Sprint 创建)

```
src/
├── l1-entry/
│   ├── pages/
│   │   └── LaunchView.tsx        # 启动加载页（本 Sprint 唯一页面）
│   ├── routes/
│   │   └── index.tsx             # 路由配置（本 Sprint 仅 "/" 路由）
│   └── layouts/
│       └── AppShell.tsx          # 全局壳布局（无边框标题栏 + 内容区 + 状态栏）
├── l2-coordinator/
│   ├── commander/
│   │   └── useAppCommander.ts    # 应用启动指挥官
│   ├── data-clerk/
│   │   ├── stores/
│   │   │   └── useAppStore.ts    # 全局应用状态 (appPhase, sidecarStatus)
│   │   └── types/
│   │       └── app.ts            # 应用状态类型定义
│   ├── diplomat/
│   │   └── errorTranslator.ts    # 错误翻译器
│   └── api-docs/
│       └── sidecar.ts            # Sidecar 相关 API 类型
├── l3-molecule/
│   └── common/
│       ├── AppLayout.tsx         # 应用整体布局分子
│       └── StatusBar.tsx         # 底部状态栏分子
├── l4-atom/
│   ├── ui/
│   │   ├── AppleButton.tsx       # 苹果风格按钮
│   │   ├── GlassPanel.tsx        # 毛玻璃面板
│   │   ├── Typography.tsx        # 排版组件
│   │   ├── SkeletonLoader.tsx    # 骨架屏
│   │   ├── Spinner.tsx           # 加载旋转器
│   │   └── index.ts              # UI 原子统一导出
│   ├── network/
│   │   ├── fetchDbStatus.ts      # 健康检查探针
│   │   └── index.ts              # 网络原子统一导出
│   └── system/
│       ├── spawnSidecar.ts       # 启动 Sidecar (调用 Tauri Shell API)
│       ├── killPort.ts           # 端口猎杀 (调用 Tauri Command)
│       └── index.ts              # 系统原子统一导出
├── styles/
│   ├── globals.css               # 全局 CSS 变量与重置
│   ├── typography.css            # 字体排版
│   └── theme.css                 # 明暗主题变量
└── utils/
    └── constants.ts              # 常量定义 (端口号、超时时间等)
```

---

### 阶段 3.2: Rust 原生层 — Sidecar 生命周期

这是 Sprint 1 中**最关键**的部分，所有代码在 Rust 层实现。

| 任务 ID | 任务 | 详情 | 关键代码 |
|---------|------|------|---------|
| **T-2.1** | Sidecar 二进制挂载 | 将 chatlog_alpha 编译产物放入 `src-tauri/binaries/`，在 `tauri.conf.json` 的 `bundle.externalBin` 中声明 | tauri.conf.json |
| **T-2.2** | 权限配置 | 在 `src-tauri/capabilities/default.json` 中添加 `shell:allow-execute` 权限，限制只能执行声明的 Sidecar | capabilities/default.json |
| **T-2.3** | **端口猎杀 (Kill Port)** | 在 `main.rs` 的 `setup` 钩子中，通过系统命令探查端口占用并清理——macOS: `lsof -ti :8080` → `kill -TERM <PID>`，Windows: `netstat -ano | findstr :8080` → `taskkill /PID <PID> /F`，等待 500ms 确认释放 | src-tauri/src/port_killer.rs |
| **T-2.4** | Sidecar 启动 | 使用 Tauri `Command::sidecar("chatlog_alpha")` 启动子进程，捕获 stdout/stderr 并转发到前端 | src-tauri/src/sidecar.rs |
| **T-2.5** | **健康检查轮询** | Sidecar 启动后，Rust 层每 2 秒向 `http://127.0.0.1:8080/api/v1/db` 发 HTTP GET，连续 3 次成功 (200) 后通知前端"就绪"，最多等待 30 秒超时则报错 | src-tauri/src/health.rs |
| **T-2.6** | **优雅退出** | 通过 `WindowEvent::CloseRequested` 拦截关闭事件：1) 向 Go 后端发 `/shutdown` 信号 (如有) 2) 调用 `child.kill()` 发送 SIGTERM 3) 等待最多 5 秒确认退出 4) 关闭主窗口 | src-tauri/src/main.rs |
| **T-2.7** | Tauri Commands 暴露 | 将 `kill_port`、`spawn_sidecar`、`check_health`、`shutdown_sidecar` 封装为 `#[tauri::command]`，通过 Tauri IPC 暴露给前端 L4 系统原子 | src-tauri/src/commands.rs |
| **T-2.8** | 系统主题检测 | Rust 层读取当前系统明/暗主题，通过 Tauri Event 通知前端 | src-tauri/src/theme.rs |

#### 端口猎杀算法伪代码

```
fn kill_port_if_occupied(port: u16) -> Result<(), String> {
    // 1. 查找占用进程
    let pid = if cfg!(target_os = "macos") || cfg!(target_os = "linux") {
        exec("lsof", ["-ti", &format!(":{}", port)])
    } else if cfg!(target_os = "windows") {
        exec("netstat", ["-ano"])
            .filter(line => line.contains(&format!(":{}", port)))
            .extract_pid()
    };

    // 2. 杀进程
    if let Some(pid) = pid {
        send_signal(pid, SIGTERM);
        sleep(500ms);
        // 3. 确认端口已释放，否则 SIGKILL
        if port_still_occupied(port) {
            send_signal(pid, SIGKILL);
            sleep(300ms);
        }
    }

    // 4. 最后防线——仍然被占用则报错
    if port_still_occupied(port) {
        return Err("端口无法释放");
    }
    Ok(())
}
```

---

### 阶段 3.3: L4 原子层搭建

#### 3.3.1 UI 原子

| 任务 ID | 原子 | 接口 (Props/API) | 实现要点 |
|---------|------|-----------------|---------|
| **T-3.1** | `AppleButton` | `variant: 'primary'\|'secondary'\|'ghost'`, `size: 'sm'\|'md'\|'lg'`, `onClick`, `disabled`, `loading`, `children` | framer-motion 弹簧动画 (onTap: scale 0.97→1.0)，Squircle 圆角，扩散阴影，hover 微浮起效果 |
| **T-3.2** | `GlassPanel` | `blur: number`, `opacity: number`, `borderRadius: number`, `children`, `className` | CSS backdrop-filter: blur()，macOS 下透底桌面壁纸色，Windows 下 Mica/Acrylic 效果（后续通过 Tauri 原生属性增强） |
| **T-3.3** | `Typography` | `variant: 'h1'\|'h2'\|'h3'\|'body'\|'caption'\|'label'`, `weight`, `color`, `align`, `children` | 统一控制字体族 (macOS: SF Pro, Windows: Segoe UI)，行高 (body: 1.5)，字距 |
| **T-3.4** | `SkeletonLoader` | `width`, `height`, `variant: 'text'\|'circle'\|'rect'`, `count`, `animated` | CSS shimmer 动画 (渐变从左到右扫过)，支持多行骨架屏排列 |
| **T-3.5** | `Spinner` | `size`, `color`, `label` | SVG 旋转动画，支持辅助文本 "正在初始化本地引擎..." |
| **T-3.6** | `Avatar` | `src`, `alt`, `size`, `fallback`, `status` | 图片加载失败自动显示首字母占位符，支持在线状态小圆点 |

#### 3.3.2 网络原子

| 任务 ID | 原子 | 输入 | 输出 | 实现 |
|---------|------|------|------|------|
| **T-3.7** | `fetchDbStatus` | 无 | `Promise<{ok: boolean, message: string}>` | GET `http://127.0.0.1:8080/api/v1/db`，超时 5 秒，返回连接状态 |
> 注：其余网络原子 (fetchHistory, fetchSearch, fetchStats 等) 留待 Sprint 2，本 Sprint 仅需这一枚。

#### 3.3.3 系统原子

| 任务 ID | 原子 | 输入 | 输出 | 实现 |
|---------|------|------|------|------|
| **T-3.8** | `spawnSidecar` | 无 | `Promise<void>` | 调用 Tauri Command `spawn_sidecar`，通过 `@tauri-apps/plugin-shell` 创建 Sidecar 子进程 |
| **T-3.9** | `killPort` | `port: number` | `Promise<void>` | 调用 Tauri Command `kill_port` |
> 注：其余系统原子 (detectWxPath, readOsTheme 等) 留待 Sprint 2，本 Sprint 仅需 Sidecar 控制原子。

#### L4 原子统一导出口

```typescript
// src/l4-atom/ui/index.ts
export { AppleButton } from './AppleButton';
export { GlassPanel } from './GlassPanel';
export { Typography } from './Typography';
export { SkeletonLoader } from './SkeletonLoader';
export { Spinner } from './Spinner';
export { Avatar } from './Avatar';

// src/l4-atom/network/index.ts
export { fetchDbStatus } from './fetchDbStatus';

// src/l4-atom/system/index.ts
export { spawnSidecar } from './spawnSidecar';
export { killPort } from './killPort';
```

---

### 阶段 3.4: L3 分子层基础组件

| 任务 ID | 分子 | 组装原子 | 功能描述 | Props |
|---------|------|---------|---------|-------|
| **T-4.1** | `AppLayout` | `GlassPanel`, `Typography` | 应用全局壳布局，包含自定义标题栏（交通灯按钮）、主内容区、底部状态栏 | `children: ReactNode` |
| **T-4.2** | `StatusBar` | `Typography`, `Spinner` | 底部状态栏，展示 Sidecar 运行状态（启动中/运行中/已停止/错误）、端口号、引擎版本 | `status: AppStatus`, `error?: string` |

---

### 阶段 3.5: L2 协调层核心搭建

#### 3.5.1 指挥官 (Commander)

| 任务 ID | 任务 | 函数 | 职能 |
|---------|------|------|------|
| **T-5.1** | 应用生命周期指挥官 | `useAppCommander()` | 返回 `{ status, error, retry, shutdown }`。内部编排完整的启动剧本：killPort → spawnSidecar → 轮询健康检查 → 更新 DataClerk 状态 |

```typescript
// 指挥官启动剧本
async function bootSequence(): Promise<void> {
  // 步骤 1: 前置端口清理
  DataClerk.setPhase('killing_port');
  await SystemAtoms.killPort(8080);

  // 步骤 2: 启动 Sidecar
  DataClerk.setPhase('spawning_sidecar');
  await SystemAtoms.spawnSidecar();

  // 步骤 3: 轮询健康检查
  DataClerk.setPhase('health_check');
  await pollHealthCheck();  // 最多 30 秒

  // 步骤 4: 就绪
  DataClerk.setPhase('ready');
}
```

#### 3.5.2 数据员 (Data Clerk)

| 任务 ID | 任务 | Store | 状态字段 |
|---------|------|-------|---------|
| **T-5.2** | 应用状态 Store | `useAppStore` (Zustand) | `appPhase: 'idle'\|'killing_port'\|'spawning_sidecar'\|'health_check'\|'ready'\|'error'`, `errorMessage: string\|null`, `sidecarStatus: 'stopped'\|'starting'\|'running'\|'error'`, `portNumber: number`, `engineVersion: string\|null` |

#### 3.5.3 外交官 (Diplomat)

| 任务 ID | 任务 | 文件 | 职能 |
|---------|------|------|------|
| **T-5.3** | 错误翻译器 | `errorTranslator.ts` | 将底层错误码翻译为用户友好文本。例：`EADDRINUSE` → "端口被占用，正在自动清理..."，`ECONNREFUSED` → "引擎未启动，请稍后重试"，超时 → "引擎启动超时，请检查系统资源" |

#### 3.5.4 原子 API 文档 (API Docs)

| 任务 ID | 任务 | 文件 | 内容 |
|---------|------|------|------|
| **T-5.4** | Sidecar API 类型定义 | `api-docs/sidecar.ts` | TypeScript 类型：`DbStatusResponse { ok: boolean; message: string }`，`HealthCheckResult` |



AppPhase 和 SidecarStatus 怎么定义待确认

#### 3.5.5 其他待实现的类型定义

以下类型需根据后续 Sprint 需求补充，本 Sprint 仅定义接口签名：

| 类型域 | 文件 | 状态 |
|--------|------|------|
| `HistoryTypes` | `api-docs/history.ts` | Sprint 2 实现 |
| `ContactTypes` | `api-docs/contacts.ts` | Sprint 2 实现 |
| `SearchTypes` | `api-docs/search.ts` | Sprint 2 实现 |

---

### 阶段 3.6: L1 入口层

| 任务 ID | 任务 | 文件 | 内容 |
|---------|------|------|------|
| **T-6.1** | 路由配置 | `l1-entry/routes/index.tsx` | 仅一个路由 `"/"` → `LaunchView` |
| **T-6.2** | 启动加载页 | `l1-entry/pages/LaunchView.tsx` | 页面上半部分展示应用 Logo 和启动进度（使用 `SkeletonLoader` + 各个阶段的检查项状态），下半部分展示引擎日志输出区域 |
| **T-6.3** | App 入口 | `App.tsx` | 包裹 `AppLayout` + 路由 + 主题 Provider |

---

### 阶段 3.7: Rust 窗口配置

| 任务 ID | 任务 | 详情 |
|---------|------|------|
| **T-7.1** | 无边框窗口配置 | tauri.conf.json 中 `windows[0].decorations = false`，设置最小窗口尺寸 900x600 |
| **T-7.2** | 自定义标题栏 CSS | 前端 CSS 实现可拖拽区域 (`-webkit-app-region: drag`)，按钮区域设为 `no-drag` |
| **T-7.3** | 交通灯按钮 | 左侧绘制 macOS 风格红黄绿按钮（仅视觉，功能由 Tauri 窗口 API 实现） |

---

## 四、Sprint 1 依赖关系图

```
T-1.x (项目脚手架)
    │
    ├──→ T-2.x (Rust Sidecar ── 可与前端并行开发)
    │
    ├──→ T-3.x (L4 原子层)
    │       │
    │       ├──→ T-4.x (L3 分子层)
    │       │       │
    │       │       └──→ T-6.x (L1 入口层)
    │       │
    │       └──→ T-5.x (L2 协调层) ──→ T-6.x
    │
    └──→ T-7.x (窗口配置)
```

- T-1.x (脚手架) 是所有任务的前置条件
- T-2.x (Rust 层) 和 T-3.x~T-6.x (前端层) 可部分并行开发
- T-5.x (L2) 需要 T-3.x (L4 原子) 的接口定义完成后才能实现
- T-6.x (L1) 需要所有下层组件就绪后集成

---

## 五、验收清单

| # | 验收项 | 验收方法 |
|---|--------|---------|
| 1 | `npm run build` 成功，零 TS 类型错误 | 运行构建命令 |
| 2 | `npm run lint` 零警告 | 运行 Lint |
| 3 | 双击应用图标启动，无需任何手动操作 | 手动测试 |
| 4 | 启动页展示端口清理 → 引擎启动 → 健康检查的完整进度 | 肉眼观察启动页状态变化 |
| 5 | 健康检查通过后，启动页自动切换为"就绪"状态 | 等待 Sidecar 启动后观察 |
| 6 | 关闭应用窗口后，进程列表无 chatlog_alpha 残留 PID | 打开任务管理器/活动监视器确认 |
| 7 | 连续启动-关闭 10 次，每次都能成功启动 | 脚本自动化测试 |
| 8 | L4 原子间无相互 import | 运行依赖检查脚本 |
| 9 | L3 分子间无相互 import | 运行依赖检查脚本 |
| 10 | L1 页面文件不含 `useState` / `useEffect` 业务逻辑 | 代码审查 |
| 11 | 无边框窗口可正常拖拽和关闭 | 手动测试 |
| 12 | macOS 和 Windows 均能正常构建运行 | 分别构建测试 |

---

## 六、Sprint 1 执行顺序建议

```
第 1 周:
  Day 1-2:  T-1.x 脚手架 (全)
  Day 2-3:  T-2.x Rust 层开始  +  T-3.x L4 UI 原子开始
  Day 3-4:  T-2.x 端口猎杀实现  +  T-3.x L4 网络/系统原子
  Day 4-5:  T-2.x 健康检查 + 优雅退出

第 2 周:
  Day 6-7:  T-4.x L3 分子组件
  Day 7-8:  T-5.x L2 协调层
  Day 8-9:  T-6.x L1 入口层 + T-7.x 窗口配置
  Day 9-10: 集成测试 + 验收清单逐项检查

第 3 周 (缓冲):
  Day 11-13: Bug 修复 + macOS/Windows 交叉验证
  Day 14-15: 文档整理 + Sprint 回顾
```

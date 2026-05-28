# Sprint 2: 聊天记录系统 — 详细开发规划

> **所属项目**: chatlog_alpha 桌面应用
> **架构模式**: Mediator 四层架构
> **优先级**: P0（最高优先级，MVP 版本的核心交付）
> **预估工期**: 2-3 周
> **状态**: 规划阶段
> **前置依赖**: Sprint 1（基础设施建设）已完成

---

## 一、Sprint 2 目标

在 Sprint 1 的应用骨架之上，集成真实的 chatlog_alpha Go 引擎，搭建完整的聊天记录浏览体验，交付 **MVP 版本**。

| 交付物 | 详细内容 | 验收标准 |
|--------|---------|---------|
| **真实 Sidecar 集成** | 编译并挂载 chatlog_alpha 源码，替换 mock 二进制 | `/api/v1/history` 等接口返回真实数据 |
| **智能数据接入** | 自动探测微信数据目录 + 手动选择器兜底 | 用户无需手动配置路径即可使用 |
| **联系人侧边栏** | 联系人/群聊列表 + 搜索过滤 + 会话预览 | 点击联系人可切换聊天视图 |
| **消息展示系统** | 消息气泡 + 虚拟滚动 + 分页加载 + 媒体预览 | 流畅展示 10 万+ 条消息无卡顿 |
| **全局搜索** | 全局搜索栏 + 实时联想 + 搜索结果分类 | 300ms 防抖搜索，结果 <500ms 返回 |
| **统计仪表盘** | 概览卡片 + 趋势图 + 活跃联系人排行 | 数据可视化清晰直观 |

---

## 二、Sprint 2 页面架构

Sprint 2 交付两个页面：

### 2.1 LaunchView（改进）
- 扩展启动序列：端口清理 → 引擎启动 → 健康检查 → **DB 就绪检查**
- 增加数据目录探测状态
- DB 就绪后自动跳转 DashboardView

### 2.2 DashboardView（新增 — 主面板）
```
┌──────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  自定义标题栏 (无边框)                [交通灯按钮]          │ │
│  ├────────────┬───────────────────────────┬───────────────────┤ │
│  │  联系人     │                           │                  │ │
│  │  侧边栏     │      消息展示区             │   统计面板        │ │
│  │  ┌───────┐ │                           │   (可折叠)        │ │
│  │  │ 搜索栏  │ │  ┌─────────────────────┐ │                  │ │
│  │  └───────┘ │  │ MessageBubble (对方)  │ │  · 总消息数       │ │
│  │            │  │ MessageBubble (自己)  │ │  · 活跃人数       │ │
│  │  联系人A   │  │ MessageBubble (图片)  │ │  · 活跃天数       │ │
│  │  联系人B   │  │ ...                   │ │  · 趋势图         │ │
│  │  群聊C    │  │                       │ │                  │ │
│  │  联系人D   │  │ [上拉加载更多...]      │ │  · Top联系人     │ │
│  │            │  └─────────────────────┘ │                  │ │
│  │            │                           │                  │ │
│  │            │  ┌─────────────────────┐ │                  │ │
│  │            │  │   全局搜索栏 (顶部)    │ │                  │ │
│  │            │  └─────────────────────┘ │                  │ │
│  ├────────────┴───────────────────────────┴───────────────────┤ │
│  │                    状态栏 (Sidecar状态)                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、Sprint 2 关键设计决策

### 3.1 启动阶段扩展

Sprint 1 的启动剧本为：`killPort → spawnSidecar → pollHealth → ready`

Sprint 2 扩展为两阶段就绪：

```
Phase A: 引擎就绪 (已有)
  killPort → spawnSidecar → /health 200 → 引擎就绪

Phase B: 数据就绪 (新增)
  引擎就绪 → 探测微信数据目录 → 通知 chatlog_alpha 加载数据
  → 轮询 /api/v1/db (需处理 503 DB初始化中) → DB就绪 → 跳转主面板

如果探测失败 → 弹出目录选择器 → 用户手动指定 → 重新加载
```

### 3.2 消息分页策略

chatlog_alpha 的 `/api/v1/history` 接口支持 `limit` 和 `offset` 参数：
- 首次加载：`limit=50, offset=0`
- 上拉加载更多：`offset += 50`
- 虚拟滚动：仅渲染可视区域内的消息 DOM 节点

### 3.3 搜索架构

```
用户输入 → L1 GlobalSearch (触发 onChange)
                ↓
         L2 Diplomat (300ms 防抖)
                ↓
         L4 fetchSearch(query, offset, limit)
                ↓
         返回 searchResponse → L2 DataClerk 更新
                ↓
         L3 SearchResults 重新渲染
```

---

## 四、目录结构变更

Sprint 2 在 Sprint 1 基础上新增以下文件（**表示新建目录）：

```
src/
├── l1-entry/
│   ├── pages/
│   │   ├── LaunchView.tsx        # 修改：扩展启动序列
│   │   └── DashboardView.tsx     # 新增：主面板
│   └── routes/
│       └── index.tsx              # 修改：增加 /dashboard 路由
├── l2-coordinator/
│   ├── commander/
│   │   ├── useAppCommander.ts     # 修改：扩展启动剧本
│   │   ├── useChatCommander.ts    # 新增：聊天模块指挥官
│   │   ├── useSearchCommander.ts  # 新增：搜索模块指挥官
│   │   └── useStatsCommander.ts   # 新增：统计模块指挥官
│   ├── data-clerk/
│   │   ├── stores/
│   │   │   ├── useAppStore.ts     # 修改：增加 DB 状态字段
│   │   │   ├── useChatStore.ts    # 新增：聊天状态
│   │   │   ├── useSearchStore.ts  # 新增：搜索状态
│   │   │   └── useStatsStore.ts   # 新增：统计状态
│   │   └── types/
│   │       └── app.ts             # 修改：增加 DB 状态类型
│   ├── diplomat/
│   │   ├── errorTranslator.ts     # 修改：新增错误码
│   │   ├── debounce.ts            # 新增：通用防抖工具
│   │   └── retryPolicy.ts         # 新增：通用重试策略
│   └── api-docs/
│       ├── sidecar.ts             # 修改：新增 DB 状态类型
│       ├── history.ts             # 新增：聊天历史 API 类型
│       ├── contacts.ts            # 新增：联系人 API 类型
│       ├── search.ts              # 新增：搜索 API 类型
│       └── stats.ts               # 新增：统计 API 类型
├── l3-molecule/
│   ├── common/                    # 已有
│   │   ├── AppLayout.tsx          # 修改：增加主面板布局支持
│   │   └── StatusBar.tsx          # 修改：增加 DB 状态显示
│   ├── chat/                      # 新增目录 **
│   │   ├── ContactList.tsx        # 新增：联系人列表
│   │   ├── ContactItem.tsx        # 新增：联系人条目
│   │   ├── ChatView.tsx           # 新增：聊天主视图
│   │   ├── MessageList.tsx        # 新增：消息列表 (虚拟滚动)
│   │   ├── MessageBubble.tsx      # 新增：消息气泡
│   │   └── MediaPreview.tsx       # 新增：媒体预览弹窗
│   ├── search/                    # 新增目录 **
│   │   ├── GlobalSearch.tsx       # 新增：全局搜索栏
│   │   ├── SearchResults.tsx      # 新增：搜索结果列表
│   │   └── FilterBar.tsx          # 新增：筛选栏
│   └── stats/                     # 新增目录 **
│       ├── DashboardOverview.tsx  # 新增：概览统计卡片
│       ├── TrendChart.tsx         # 新增：趋势图
│       └── TopContactCard.tsx     # 新增：活跃联系人排行
├── l4-atom/
│   ├── ui/
│   │   ├── AppleButton.tsx        # 已有
│   │   ├── Avatar.tsx             # 已有
│   │   ├── Badge.tsx              # 新增：徽章/未读数
│   │   ├── GlassPanel.tsx         # 已有
│   │   ├── Input.tsx              # 新增：输入框原子
│   │   ├── SkeletonLoader.tsx     # 已有
│   │   ├── Spinner.tsx            # 已有
│   │   ├── SpringModal.tsx        # 新增：弹簧动画模态框
│   │   └── Typography.tsx         # 已有
│   ├── network/
│   │   ├── fetchDbStatus.ts       # 已有
│   │   ├── fetchHistory.ts        # 新增：聊天历史网络原子
│   │   ├── fetchContacts.ts       # 新增：联系人网络原子
│   │   ├── fetchSearch.ts         # 新增：搜索网络原子
│   │   ├── fetchStats.ts          # 新增：统计网络原子
│   │   └── fetchDbReady.ts        # 新增：DB 就绪检查网络原子
│   └── system/
│       ├── killPort.ts            # 已有
│       ├── spawnSidecar.ts        # 已有
│       ├── detectWxPath.ts        # 新增：智能路径探测系统原子
│       └── openDirectoryPicker.ts # 新增：目录选择器系统原子
```

---

## 五、任务分解

---

### 阶段 2.0: 真实 chatlog_alpha Sidecar 集成

> **说明**: 将 Sprint 1 的 Go mock 二进制替换为真实的 chatlog_alpha 编译产物。

| 任务 ID | 任务 | 详情 | 产出 |
|---------|------|------|------|
| **T-0.1** | 确认构建环境 | 检查 Go 1.24+ 和 GCC (CGO 需要) 是否可用。Windows 下需安装 MinGW 或 TDM-GCC。 | 环境就绪 |
| **T-0.2** | 编译 chatlog_alpha | `cd E:\OneDrive - Default Directory\chatlog_alpha && CGO_ENABLED=1 go build -o chatlog.exe main.go`。可选：通过 `-ldflags "-X ...version.Version=0.1.0"` 注入版本号。 | `chatlog.exe` 二进制 |
| **T-0.3** | 挂载 Sidecar | 将编译产物 `chatlog.exe` 复制到 `src-tauri/binaries/` 目录，确保文件名匹配 `tauri.conf.json` 中 `externalBin` 的声明。 | Sidecar 二进制就位 |
| **T-0.4** | 验证启动 | 手动运行 `chatlog.exe` 确认能正常启动，`curl http://127.0.0.1:5030/health` 返回 `{"status":"ok"}`，`curl http://127.0.0.1:5030/api/v1/ping` 返回 `{"pong":true}`。 | 真实引擎可运行 |
| **T-0.5** | 清理 mock | 删除 Sprint 1 的 mock 二进制文件 `chatlog_alpha-x86_64-pc-windows-msvc.exe`。 | 无旧残留 |

---

### 阶段 2.1: 扩展启动剧本 — 数据接入

> **目标**: 扩展 L2 Commander 的 bootSequence，加入数据就绪检测和智能路径探测。

#### 2.1.1 状态类型扩展

**任务 T-1.1: 扩展 AppPhase 类型**

文件：`src/l2-coordinator/data-clerk/types/app.ts`

```typescript
// 新增 DB 状态相关类型
export type AppPhase =
  | 'idle'
  | 'killing_port'
  | 'spawning_sidecar'
  | 'health_check'        // 引擎健康检查 (Sprint 1 已有)
  | 'db_connecting'       // 新增：等待 DB 就绪
  | 'db_not_found'        // 新增：未探测到微信数据目录
  | 'db_decrypting'       // 新增：DB 解密中
  | 'ready'               // 全部就绪
  | 'error';

export type SidecarStatus = 'stopped' | 'starting' | 'running' | 'error';

// 新增 DB 状态
export type DbStatus = 'disconnected' | 'connecting' | 'decrypting' | 'ready' | 'error';

export interface AppState {
  appPhase: AppPhase;
  errorMessage: string | null;
  sidecarStatus: SidecarStatus;
  dbStatus: DbStatus;           // 新增
  portNumber: number;
  engineVersion: string | null;
  wxDataPath: string | null;    // 新增：微信数据目录路径
}

export interface AppActions {
  setPhase: (phase: AppPhase) => void;
  setError: (error: string) => void;
  clearError: () => void;
  setSidecarStatus: (status: SidecarStatus) => void;
  setDbStatus: (status: DbStatus) => void;        // 新增
  setEngineVersion: (version: string) => void;
  setWxDataPath: (path: string | null) => void;   // 新增
  reset: () => void;
}
```

**任务 T-1.2: 更新 useAppStore**

文件：`src/l2-coordinator/data-clerk/stores/useAppStore.ts`

在初始状态中加入新字段，实现新的 actions。

```typescript
import { create } from 'zustand';
import type { AppState, AppActions, AppPhase, SidecarStatus, DbStatus } from '../types/app';

type AppStore = AppState & AppActions;

const initialState: AppState = {
  appPhase: 'idle',
  errorMessage: null,
  sidecarStatus: 'stopped',
  dbStatus: 'disconnected',       // 新增
  portNumber: 5030,
  engineVersion: null,
  wxDataPath: null,               // 新增
};

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,
  setPhase: (phase: AppPhase) => set({ appPhase: phase }),
  setError: (error: string) =>
    set({ appPhase: 'error', errorMessage: error, sidecarStatus: 'error' }),
  clearError: () => set({ appPhase: 'idle', errorMessage: null }),
  setSidecarStatus: (status: SidecarStatus) => set({ sidecarStatus: status }),
  setDbStatus: (status: DbStatus) => set({ dbStatus: status }),
  setEngineVersion: (version: string) => set({ engineVersion: version }),
  setWxDataPath: (path: string | null) => set({ wxDataPath: path }),
  reset: () => set(initialState),
}));
```

#### 2.1.2 L4 系统原子新增

**任务 T-1.3: detectWxPath — 智能路径探测**

文件：`src/l4-atom/system/detectWxPath.ts`

```typescript
/**
 * 探测操作系统默认的微信数据存储目录。
 * - Windows: 遍历 Documents\WeChat Files\ 下各用户目录
 * - macOS: 遍历 ~/Library/Containers/com.tencent.xinWeChat/ 相关路径
 * 返回候选路径列表供用户选择，或返回单个路径自动使用。
 */
export interface WxPathCandidate {
  path: string;
  label: string;     // 如 "WeChat Files\wxid_abc123"
  exists: boolean;
}

export async function detectWxPath(): Promise<WxPathCandidate[]> {
  // 暂时返回常量路径，后续通过 Tauri 文件系统 API 实现真实探测
  const candidates: WxPathCandidate[] = [];

  // Windows 默认路径模式
  if (typeof window !== 'undefined') {
    // 通过 Tauri FS API 检查常见路径
    try {
      const { readDir } = await import('@tauri-apps/plugin-fs');
      const homePath = await getHomeDir();
      const wechatFilesDir = `${homePath}\\Documents\\WeChat Files`;
      const entries = await readDir(wechatFilesDir);
      for (const entry of entries) {
        if (entry.name) {
          const fullPath = `${wechatFilesDir}\\${entry.name}`;
          candidates.push({
            path: fullPath,
            label: entry.name,
            exists: true,
          });
        }
      }
    } catch {
      // 默认路径不可达，返回空列表
    }
  }

  return candidates;
}

async function getHomeDir(): Promise<string> {
  if (typeof window !== 'undefined') {
    // 通过 Tauri API 获取
    try {
      const { homeDir } = await import('@tauri-apps/api/path');
      return await homeDir();
    } catch {
      return '';
    }
  }
  return '';
}
```

**任务 T-1.4: openDirectoryPicker — 目录选择器**

文件：`src/l4-atom/system/openDirectoryPicker.ts`

```typescript
/**
 * 打开系统原生目录选择器，供用户手动指定微信数据目录。
 */
export async function openDirectoryPicker(): Promise<string | null> {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择微信数据目录',
    });
    return typeof selected === 'string' ? selected : null;
  } catch {
    return null;
  }
}
```

**任务 T-1.5: 更新系统原子导出口**

文件：`src/l4-atom/system/index.ts`

```typescript
export { spawnSidecar } from './spawnSidecar';
export { killPort } from './killPort';
export { detectWxPath } from './detectWxPath';
export { openDirectoryPicker } from './openDirectoryPicker';
```

#### 2.1.3 L4 网络原子新增

**任务 T-1.6: fetchDbReady — DB 就绪检查**

文件：`src/l4-atom/network/fetchDbReady.ts`

```typescript
import { SIDECAR_PORT } from '@/utils/constants';

export interface DbReadyResponse {
  ready: boolean;
  message: string;
  dbCount?: number;
}

/**
 * 调用 /api/v1/db 接口检查数据库是否就绪。
 * 注意：chatlog_alpha 在 DB 初始化/解密期间会返回 HTTP 503，
 * 此时 DB 尚未就绪，需继续轮询。
 */
export async function fetchDbReady(): Promise<DbReadyResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `http://127.0.0.1:${SIDECAR_PORT}/api/v1/db`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (response.status === 503) {
      // DB 正在初始化/解密，未就绪
      return { ready: false, message: '数据库正在初始化...' };
    }

    if (response.ok) {
      const data = await response.json();
      const dbCount = Array.isArray(data) ? data.length : 0;
      return { ready: true, message: `已连接 ${dbCount} 个数据库`, dbCount };
    }

    return { ready: false, message: `数据库连接异常: HTTP ${response.status}` };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ready: false, message: '数据库连接超时' };
    }
    return { ready: false, message: `网络错误: ${String(error)}` };
  }
}
```

**任务 T-1.7: 更新网络原子导出口**

文件：`src/l4-atom/network/index.ts`

```typescript
export { fetchDbStatus } from './fetchDbStatus';
export { fetchDbReady } from './fetchDbReady';
export { fetchHistory } from './fetchHistory';
export { fetchContacts } from './fetchContacts';
export { fetchSearch } from './fetchSearch';
export { fetchStats } from './fetchStats';
```

#### 2.1.4 L2 协调层扩展

**任务 T-1.8: 扩展 APIDocs — DB 类型**

文件：`src/l2-coordinator/api-docs/sidecar.ts`

```typescript
export interface DbStatusResponse {
  ok: boolean;
  message: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  attempts: number;
  elapsedMs: number;
  lastError?: string;
}

// 新增 DB 就绪相关类型
export interface DbReadyResult {
  ready: boolean;
  message: string;
  dbCount: number;
}

// /api/v1/db 返回结构（chatlog_alpha 实际返回）
export interface DbInfo {
  name: string;
  path: string;
  tables: string[];
}
```

**任务 T-1.9: 扩展 useAppCommander — 增加数据就绪剧本**

文件：`src/l2-coordinator/commander/useAppCommander.ts`

在现有 `boot()` 函数中加入 DB 就绪检测阶段。主要变更：
- 在 health check 通过后，调用 `detectWxPath()` 探测数据目录
- 如探测成功，通知引擎加载数据，轮询 `fetchDbReady()` 检查 DB 就绪
- 如探测失败，设置 phase 为 `db_not_found`，等待用户通过目录选择器指定
- DB 就绪后设置 phase 为 `ready`

**核心新增逻辑：**

```typescript
// 在 bootSequence 中 health check 通过后：
async function detectAndConnectData(): Promise<void> {
  // 步骤 1: 智能路径探测
  set({ appPhase: 'db_connecting' });
  let candidates = await detectWxPath();

  // 步骤 2: 如果探测失败，弹出目录选择器
  if (candidates.length === 0) {
    set({ appPhase: 'db_not_found' });
    const manualPath = await openDirectoryPicker();
    if (!manualPath) {
      set({ appPhase: 'error', errorMessage: '未选择数据目录' });
      return;
    }
    setWxDataPath(manualPath);
  } else {
    // 使用第一个探测到的路径
    setWxDataPath(candidates[0].path);
  }

  // 步骤 3: 轮询 DB 就绪
  set({ appPhase: 'db_connecting', dbStatus: 'connecting' });
  await pollDbReady();
  set({ appPhase: 'ready', dbStatus: 'ready' });
}

async function pollDbReady(): Promise<void> {
  const startTime = Date.now();
  const maxWaitMs = 120000; // 2 分钟超时（解密大数据库可能需要时间）

  while (Date.now() - startTime < maxWaitMs) {
    if (abortRef.current) return;

    const result = await fetchDbReady();

    if (result.ready) {
      return; // DB 就绪
    }

    // 检查是否是解密中状态 (503)
    if (result.message.includes('初始化')) {
      set({ dbStatus: 'decrypting' });
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error('EDB_TIMEOUT');
}
```

**任务 T-1.10: 扩展 errorTranslator**

文件：`src/l2-coordinator/diplomat/errorTranslator.ts`

新增错误码翻译：

```typescript
// 在现有 translateError 的 errorCodeMap 中新增：
'EDB_TIMEOUT': '数据库初始化超时，请检查微信数据目录是否正确',
'EDB_NOT_FOUND': '未找到微信数据目录，请手动指定路径',
'EDB_DECRYPT_FAIL': '数据库解密失败，当前微信版本可能不支持',
'EPATH_NOT_FOUND': '数据目录不存在，请重新选择',
```

---

### 阶段 2.2: L4 网络原子 — 数据 API 封装

> **目标**: 封装 chatlog_alpha 的核心数据 API 为纯网络原子，每个函数只负责发起请求并返回数据。

#### 2.2.1 API 类型定义

**任务 T-2.1: contacts API 类型**

文件：`src/l2-coordinator/api-docs/contacts.ts`

```typescript
// 联系人信息（对应 model.Contact）
export interface Contact {
  userName: string;
  alias: string;
  remark: string;
  nickName: string;
  isFriend: boolean;
}

// 会话信息（对应 model.Session）
export interface Session {
  userName: string;
  nOrder: number;
  nickName: string;
  content: string;
  nTime: string;       // ISO 时间字符串
}

// 群聊信息（对应 model.ChatRoom）
export interface ChatRoom {
  name: string;
  owner: string;
  users: ChatRoomUser[];
  remark: string;
  nickName: string;
}

export interface ChatRoomUser {
  userName: string;
  displayName: string;
}

// 联系人列表 API 响应
export interface ContactsResponse {
  contacts: Contact[];
  sessions: Session[];
  chatRooms: ChatRoom[];
}
```

**任务 T-2.2: history API 类型**

文件：`src/l2-coordinator/api-docs/history.ts`

```typescript
export interface HistoryMessage {
  timestamp: number;
  time: string;
  sender: string;
  type: string;
  content: string;
  localId: number;
  mediaType?: string;
  mediaKey?: string;
  mediaKeys?: string[];
  mediaPath?: string;
  mediaUrl?: string;
  imageKey?: string;
  imageKeys?: string[];
  imagePath?: string;
  imageUrl?: string;
  chat?: string;
  username?: string;
  isGroup?: boolean;
  chatType?: string;
}

export interface HistoryResponse {
  chat: string;
  username: string;
  isGroup: boolean;
  chatType: string;
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  messages: HistoryMessage[];
}

export interface HistoryQueryParams {
  chat: string;         // 联系人 userName
  limit?: number;       // 默认 50
  offset?: number;       // 默认 0
}
```

**任务 T-2.3: search API 类型**

文件：`src/l2-coordinator/api-docs/search.ts`

```typescript
export interface SearchResult {
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  messages: HistoryMessage[];
}

export interface SearchQueryParams {
  keyword: string;
  limit?: number;
  offset?: number;
  chat?: string;          // 可选，限定在指定对话中搜索
  timeStart?: number;     // 可选，开始时间戳
  timeEnd?: number;       // 可选，结束时间戳
  type?: string;          // 可选，消息类型过滤
}
```

**任务 T-2.4: stats API 类型**

文件：`src/l2-coordinator/api-docs/stats.ts`

```typescript
export interface StatsCountByType {
  type: string;
  count: number;
}

export interface StatsCountBySender {
  sender: string;
  count: number;
}

export interface StatsCountByHour {
  hour: number;
  count: number;
}

export interface StatsResponse {
  chat: string;
  username: string;
  isGroup: boolean;
  chatType: string;
  total: number;
  sentCount: number;
  receivedCount: number;
  activeSenders: number;
  activeDays: number;
  firstMessageTime: number;
  lastMessageTime: number;
  querySince: number;
  queryUntil: number;
  queryRangeLabel: string;
  byType: StatsCountByType[];
  topSenders: StatsCountBySender[];
  byHour: StatsCountByHour[];
}

export interface StatsQueryParams {
  chat: string;
  timeStart?: number;
  timeEnd?: number;
}

// 聊天趋势（用于折线图）
export interface TrendDataPoint {
  date: string;
  count: number;
  sentCount: number;
  receivedCount: number;
}

export interface TrendResponse {
  chat: string;
  username: string;
  points: TrendDataPoint[];
}
```

#### 2.2.2 L4 网络原子实现

**任务 T-2.5: fetchContacts**

文件：`src/l4-atom/network/fetchContacts.ts`

```typescript
import { SIDECAR_PORT } from '@/utils/constants';
import type { ContactsResponse } from '@/l2-coordinator/api-docs/contacts';

const BASE = `http://127.0.0.1:${SIDECAR_PORT}`;

export async function fetchContacts(): Promise<ContactsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const [contactsRes, sessionsRes] = await Promise.all([
      fetch(`${BASE}/api/v1/contacts`, { signal: controller.signal }),
      fetch(`${BASE}/api/v1/sessions`, { signal: controller.signal }),
    ]);

    clearTimeout(timeoutId);

    if (!contactsRes.ok) {
      throw new Error(`获取联系人失败: HTTP ${contactsRes.status}`);
    }
    if (!sessionsRes.ok) {
      throw new Error(`获取会话失败: HTTP ${sessionsRes.status}`);
    }

    const contacts = await contactsRes.json();
    const sessions = await sessionsRes.json();

    // 注意：chatlog_alpha 可能将 contacts/sessions 封装在不同结构中，
    // 这里根据实际 API 响应结构进行适配
    return {
      contacts: Array.isArray(contacts) ? contacts : (contacts.data || []),
      sessions: Array.isArray(sessions) ? sessions : (sessions.data || []),
      chatRooms: [], // chatrooms 需要单独调用 /api/v1/chatrooms
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('获取联系人超时');
    }
    throw error;
  }
}

export async function fetchChatRooms(): Promise<ContactsResponse['chatRooms']> {
  const response = await fetch(`${BASE}/api/v1/chatrooms`);
  if (!response.ok) {
    throw new Error(`获取群聊列表失败: HTTP ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : (data.data || []);
}
```

**任务 T-2.6: fetchHistory**

文件：`src/l4-atom/network/fetchHistory.ts`

```typescript
import { SIDECAR_PORT } from '@/utils/constants';
import type { HistoryResponse, HistoryQueryParams } from '@/l2-coordinator/api-docs/history';

const BASE = `http://127.0.0.1:${SIDECAR_PORT}`;

export async function fetchHistory(params: HistoryQueryParams): Promise<HistoryResponse> {
  const { chat, limit = 50, offset = 0 } = params;
  const url = new URL(`${BASE}/api/v1/history`);
  url.searchParams.set('chat', chat);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`获取聊天记录失败: HTTP ${response.status}`);
    }

    const data: HistoryResponse = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('获取聊天记录超时');
    }
    throw error;
  }
}
```

**任务 T-2.7: fetchSearch**

文件：`src/l4-atom/network/fetchSearch.ts`

```typescript
import { SIDECAR_PORT } from '@/utils/constants';
import type { SearchResult, SearchQueryParams } from '@/l2-coordinator/api-docs/search';

const BASE = `http://127.0.0.1:${SIDECAR_PORT}`;

export async function fetchSearch(params: SearchQueryParams): Promise<SearchResult> {
  const { keyword, limit = 50, offset = 0, chat, timeStart, timeEnd, type } = params;
  const url = new URL(`${BASE}/api/v1/search`);
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  if (chat) url.searchParams.set('chat', chat);
  if (timeStart) url.searchParams.set('time_start', String(timeStart));
  if (timeEnd) url.searchParams.set('time_end', String(timeEnd));
  if (type) url.searchParams.set('type', type);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`搜索失败: HTTP ${response.status}`);
    }

    const data: SearchResult = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('搜索超时');
    }
    throw error;
  }
}
```

**任务 T-2.8: fetchStats**

文件：`src/l4-atom/network/fetchStats.ts`

```typescript
import { SIDECAR_PORT } from '@/utils/constants';
import type { StatsResponse, StatsQueryParams, TrendResponse } from '@/l2-coordinator/api-docs/stats';

const BASE = `http://127.0.0.1:${SIDECAR_PORT}`;

export async function fetchStats(params: StatsQueryParams): Promise<StatsResponse> {
  const { chat, timeStart, timeEnd } = params;
  const url = new URL(`${BASE}/api/v1/stats`);
  url.searchParams.set('chat', chat);
  if (timeStart) url.searchParams.set('time_start', String(timeStart));
  if (timeEnd) url.searchParams.set('time_end', String(timeEnd));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`获取统计数据失败: HTTP ${response.status}`);
    }

    const data: StatsResponse = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('获取统计数据超时');
    }
    throw error;
  }
}

export async function fetchDashboardTrend(
  chat: string,
  timeStart?: number,
  timeEnd?: number
): Promise<TrendResponse> {
  const url = new URL(`${BASE}/api/v1/dashboard/trend`);
  url.searchParams.set('chat', chat);
  if (timeStart) url.searchParams.set('time_start', String(timeStart));
  if (timeEnd) url.searchParams.set('time_end', String(timeEnd));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`获取趋势数据失败: HTTP ${response.status}`);
  }

  const data: TrendResponse = await response.json();
  return data;
}
```

---

### 阶段 2.3: L2 协调层 — 业务模块扩展

#### 2.3.1 聊天模块

**任务 T-3.1: 聊天状态 Store**

文件：`src/l2-coordinator/data-clerk/stores/useChatStore.ts`

```typescript
import { create } from 'zustand';
import type { HistoryMessage, HistoryQueryParams } from '@/l2-coordinator/api-docs/history';
import type { Contact, Session } from '@/l2-coordinator/api-docs/contacts';
import type { ChatRoom } from '@/l2-coordinator/api-docs/contacts';

interface ChatState {
  // 联系人数据
  contacts: Contact[];
  sessions: Session[];
  chatRooms: ChatRoom[];
  contactsLoading: boolean;

  // 当前聊天
  selectedContact: Contact | null;
  selectedChatRoom: ChatRoom | null;

  // 消息数据
  messages: HistoryMessage[];
  messagesLoading: boolean;
  messagesTotalCount: number;
  messagesOffset: number;

  // 操作
  setContacts: (contacts: Contact[], sessions: Session[], chatRooms: ChatRoom[]) => void;
  setContactsLoading: (loading: boolean) => void;
  selectContact: (contact: Contact | null) => void;
  selectChatRoom: (chatRoom: ChatRoom | null) => void;
  setMessages: (messages: HistoryMessage[], totalCount: number, offset: number) => void;
  appendMessages: (messages: HistoryMessage[], offset: number) => void;
  setMessagesLoading: (loading: boolean) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  contacts: [],
  sessions: [],
  chatRooms: [],
  contactsLoading: false,

  selectedContact: null,
  selectedChatRoom: null,

  messages: [],
  messagesLoading: false,
  messagesTotalCount: 0,
  messagesOffset: 0,

  setContacts: (contacts, sessions, chatRooms) =>
    set({ contacts, sessions, chatRooms, contactsLoading: false }),

  setContactsLoading: (loading) => set({ contactsLoading: loading }),

  selectContact: (contact) =>
    set({ selectedContact: contact, selectedChatRoom: null, messages: [], messagesOffset: 0 }),

  selectChatRoom: (chatRoom) =>
    set({ selectedChatRoom: chatRoom, selectedContact: null, messages: [], messagesOffset: 0 }),

  setMessages: (messages, totalCount, offset) =>
    set({ messages, messagesTotalCount: totalCount, messagesOffset: offset, messagesLoading: false }),

  appendMessages: (newMessages, offset) =>
    set((state) => ({
      messages: [...newMessages, ...state.messages],
      messagesOffset: offset,
      messagesLoading: false,
    })),

  setMessagesLoading: (loading) => set({ messagesLoading: loading }),

  resetChat: () =>
    set({
      selectedContact: null,
      selectedChatRoom: null,
      messages: [],
      messagesTotalCount: 0,
      messagesOffset: 0,
    }),
}));
```

**任务 T-3.2: 聊天 Commander**

文件：`src/l2-coordinator/commander/useChatCommander.ts`

```typescript
import { useCallback } from 'react';
import { useChatStore } from '@/l2-coordinator/data-clerk/stores/useChatStore';
import { fetchContacts, fetchChatRooms } from '@l4/network/fetchContacts';
import { fetchHistory } from '@l4/network/fetchHistory';

export function useChatCommander() {
  const store = useChatStore();

  const loadContacts = useCallback(async () => {
    store.setContactsLoading(true);
    try {
      const contactsData = await fetchContacts();
      const chatRooms = await fetchChatRooms();
      store.setContacts(
        contactsData.contacts,
        contactsData.sessions,
        chatRooms
      );
    } catch (error) {
      store.setContactsLoading(false);
      throw error;
    }
  }, [store]);

  const loadHistory = useCallback(
    async (chat: string, isGroup: boolean = false) => {
      store.setMessagesLoading(true);
      try {
        const result = await fetchHistory({
          chat,
          limit: 50,
          offset: 0,
        });
        store.setMessages(result.messages, result.totalCount, 0);
      } catch (error) {
        store.setMessagesLoading(false);
        throw error;
      }
    },
    [store]
  );

  const loadMoreHistory = useCallback(
    async (chat: string) => {
      const currentOffset = store.messagesOffset + 50;
      store.setMessagesLoading(true);
      try {
        const result = await fetchHistory({
          chat,
          limit: 50,
          offset: currentOffset,
        });
        store.appendMessages(result.messages, currentOffset);
      } catch (error) {
        store.setMessagesLoading(false);
        throw error;
      }
    },
    [store]
  );

  const selectAndLoad = useCallback(
    async (userName: string, nickName: string, isGroup: boolean) => {
      if (isGroup) {
        store.selectChatRoom({ name: userName, nickName, owner: '', users: [], remark: '' });
      } else {
        store.selectContact({
          userName,
          nickName,
          alias: '',
          remark: '',
          isFriend: true,
        });
      }
      await loadHistory(userName, isGroup);
    },
    [store, loadHistory]
  );

  return {
    contacts: store.contacts,
    sessions: store.sessions,
    chatRooms: store.chatRooms,
    contactsLoading: store.contactsLoading,
    selectedContact: store.selectedContact,
    selectedChatRoom: store.selectedChatRoom,
    messages: store.messages,
    messagesLoading: store.messagesLoading,
    messagesTotalCount: store.messagesTotalCount,
    messagesOffset: store.messagesOffset,
    loadContacts,
    loadHistory,
    loadMoreHistory,
    selectAndLoad,
    resetChat: store.resetChat,
  };
}
```

#### 2.3.2 搜索模块

**任务 T-3.3: 搜索状态 Store**

文件：`src/l2-coordinator/data-clerk/stores/useSearchStore.ts`

```typescript
import { create } from 'zustand';
import type { SearchResult } from '@/l2-coordinator/api-docs/search';

interface SearchState {
  query: string;
  results: SearchResult | null;
  loading: boolean;
  error: string | null;

  setQuery: (query: string) => void;
  setResults: (results: SearchResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: null,
  loading: false,
  error: null,

  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clear: () => set({ query: '', results: null, loading: false, error: null }),
}));
```

**任务 T-3.4: 搜索 Commander + Diplomat 防抖**

文件：`src/l2-coordinator/commander/useSearchCommander.ts`

```typescript
import { useCallback, useRef, useEffect } from 'react';
import { useSearchStore } from '@/l2-coordinator/data-clerk/stores/useSearchStore';
import { fetchSearch } from '@l4/network/fetchSearch';
import { debounce } from '@/l2-coordinator/diplomat/debounce';

export function useSearchCommander() {
  const store = useSearchStore();
  const debouncedSearchRef = useRef<ReturnType<typeof debounce>>();

  const executeSearch = useCallback(
    async (keyword: string) => {
      if (!keyword.trim()) {
        store.clear();
        return;
      }

      store.setLoading(true);
      store.setQuery(keyword);

      try {
        const results = await fetchSearch({ keyword, limit: 50, offset: 0 });
        store.setResults(results);
      } catch (error) {
        store.setError(String(error));
      }
    },
    [store]
  );

  // 创建防抖搜索函数
  useEffect(() => {
    debouncedSearchRef.current = debounce(executeSearch, 300);
    return () => {
      debouncedSearchRef.current?.cancel();
    };
  }, [executeSearch]);

  const search = useCallback(
    (keyword: string) => {
      debouncedSearchRef.current?.(keyword);
    },
    []
  );

  const loadMoreResults = useCallback(async () => {
    if (!store.results || store.loading) return;
    const newOffset = store.results.offset + 50;
    store.setLoading(true);
    try {
      const more = await fetchSearch({
        keyword: store.query,
        limit: 50,
        offset: newOffset,
      });
      store.setResults({
        ...more,
        messages: [...store.results.messages, ...more.messages],
        offset: newOffset,
      });
    } catch (error) {
      store.setError(String(error));
    }
  }, [store]);

  return {
    query: store.query,
    results: store.results,
    loading: store.loading,
    error: store.error,
    search,
    loadMoreResults,
    clear: store.clear,
  };
}
```

**任务 T-3.5: 防抖工具**

文件：`src/l2-coordinator/diplomat/debounce.ts`

```typescript
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delayMs: number
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delayMs);
  };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced as T & { cancel: () => void };
}
```

**任务 T-3.6: 重试策略工具**

文件：`src/l2-coordinator/diplomat/retryPolicy.ts`

```typescript
export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * 带指数退避的重试执行器。
 * 用于网络请求等可能临时失败的异步操作。
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  policy: Partial<RetryPolicy> = {}
): Promise<T> {
  const p = { ...DEFAULT_POLICY, ...policy };
  let lastError: unknown;

  for (let attempt = 1; attempt <= p.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < p.maxAttempts) {
        const delay = Math.min(
          p.baseDelayMs * Math.pow(p.backoffMultiplier, attempt - 1),
          p.maxDelayMs
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

#### 2.3.3 统计模块

**任务 T-3.7: 统计状态 Store**

文件：`src/l2-coordinator/data-clerk/stores/useStatsStore.ts`

```typescript
import { create } from 'zustand';
import type { StatsResponse, TrendDataPoint } from '@/l2-coordinator/api-docs/stats';

interface StatsState {
  stats: StatsResponse | null;
  trend: TrendDataPoint[];
  loading: boolean;
  error: string | null;

  setStats: (stats: StatsResponse) => void;
  setTrend: (trend: TrendDataPoint[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  stats: null,
  trend: [],
  loading: false,
  error: null,

  setStats: (stats) => set({ stats, loading: false, error: null }),
  setTrend: (trend) => set({ trend }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clear: () => set({ stats: null, trend: [], loading: false, error: null }),
}));
```

**任务 T-3.8: 统计 Commander**

文件：`src/l2-coordinator/commander/useStatsCommander.ts`

```typescript
import { useCallback } from 'react';
import { useStatsStore } from '@/l2-coordinator/data-clerk/stores/useStatsStore';
import { fetchStats, fetchDashboardTrend } from '@l4/network/fetchStats';

export function useStatsCommander() {
  const store = useStatsStore();

  const loadStats = useCallback(
    async (chat: string) => {
      store.setLoading(true);
      try {
        const stats = await fetchStats({ chat });
        store.setStats(stats);
      } catch (error) {
        store.setError(String(error));
      }
    },
    [store]
  );

  const loadTrend = useCallback(
    async (chat: string) => {
      try {
        const trend = await fetchDashboardTrend(chat);
        store.setTrend(trend.points);
      } catch (error) {
        // 趋势数据加载失败不阻塞主统计
        console.error('趋势数据加载失败:', error);
      }
    },
    [store]
  );

  const loadAll = useCallback(
    async (chat: string) => {
      store.setLoading(true);
      try {
        const [stats] = await Promise.all([
          fetchStats({ chat }),
          loadTrend(chat),
        ]);
        store.setStats(stats);
      } catch (error) {
        store.setError(String(error));
      }
    },
    [store, loadTrend]
  );

  return {
    stats: store.stats,
    trend: store.trend,
    loading: store.loading,
    error: store.error,
    loadStats,
    loadTrend,
    loadAll,
    clear: store.clear,
  };
}
```

---

### 阶段 2.4: L3 分子层 — 聊天组件

#### 2.4.1 联系人系统

**任务 T-4.1: ContactItem — 单个联系人条目**

文件：`src/l3-molecule/chat/ContactItem.tsx`

```typescript
import { motion } from 'framer-motion';
import { Avatar } from '@l4/ui/Avatar';
import { Typography } from '@l4/ui/Typography';

interface ContactItemProps {
  userName: string;
  displayName: string;    // 优先 remark > nickName
  lastMessage?: string;
  lastTime?: string;
  isGroup?: boolean;
  isSelected?: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export function ContactItem({
  userName,
  displayName,
  lastMessage,
  lastTime,
  isGroup,
  isSelected,
  unreadCount,
  onClick,
}: ContactItemProps) {
  return (
    <motion.div
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        cursor: 'pointer',
        borderRadius: 10,
        background: isSelected ? 'rgba(0,122,255,0.12)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <Avatar
        alt={displayName}
        size={44}
        status="offline"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body" weight={600}>
            {displayName}
          </Typography>
          {lastTime && (
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ flexShrink: 0 }}>
              {lastTime}
            </Typography>
          )}
        </div>
        <Typography
          variant="caption"
          color="var(--color-text-secondary)"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: 2,
          }}
        >
          {lastMessage || '暂无消息'}
        </Typography>
      </div>
    </motion.div>
  );
}
```

**任务 T-4.2: ContactList — 联系人列表**

文件：`src/l3-molecule/chat/ContactList.tsx`

```typescript
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Typography } from '@l4/ui/Typography';
import { SkeletonLoader } from '@l4/ui/SkeletonLoader';
import { Input } from '@l4/ui/Input';
import { ContactItem } from './ContactItem';
import { useChatCommander } from '@l2/commander/useChatCommander';
import type { Contact, Session } from '@/l2-coordinator/api-docs/contacts';

// 合并 contacts 和 sessions 为统一列表条目
interface ContactListItem {
  userName: string;
  displayName: string;
  lastMessage: string;
  lastTime: string;
  isGroup: boolean;
}

function mergeContactsAndSessions(
  contacts: Contact[],
  sessions: Session[]
): ContactListItem[] {
  const sessionMap = new Map<string, Session>();
  for (const s of sessions) {
    sessionMap.set(s.userName, s);
  }

  return contacts.map((c) => {
    const session = sessionMap.get(c.userName);
    const displayName = c.remark || c.nickName || c.userName;
    const lastTime = session?.nTime
      ? new Date(session.nTime).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return {
      userName: c.userName,
      displayName,
      lastMessage: session?.content || '',
      lastTime,
      isGroup: c.userName?.includes('@chatroom') || false,
    };
  });
}

export function ContactList() {
  const { contacts, sessions, chatRooms, contactsLoading, selectedContact, selectAndLoad } =
    useChatCommander();
  const [filterText, setFilterText] = useState('');

  const items = useMemo(() => {
    const merged = mergeContactsAndSessions(contacts, sessions);
    // 也加入群聊
    const groups = chatRooms.map((cr) => ({
      userName: cr.name,
      displayName: cr.remark || cr.nickName || cr.name,
      lastMessage: '',
      lastTime: '',
      isGroup: true,
    }));
    const all = [...merged, ...groups];

    if (!filterText.trim()) return all;

    const lower = filterText.toLowerCase();
    return all.filter(
      (item) =>
        item.displayName.toLowerCase().includes(lower) ||
        item.userName.toLowerCase().includes(lower)
    );
  }, [contacts, sessions, chatRooms, filterText]);

  if (contactsLoading) {
    return (
      <div style={{ padding: 16 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
            <SkeletonLoader variant="circle" width={44} height={44} />
            <div style={{ flex: 1 }}>
              <SkeletonLoader variant="rect" width="60%" height={16} />
              <SkeletonLoader variant="rect" width="80%" height={12} style={{ marginTop: 6 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12 }}>
        <Input
          placeholder="搜索联系人..."
          value={filterText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterText(e.target.value)}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.userName}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ContactItem
                userName={item.userName}
                displayName={item.displayName}
                lastMessage={item.lastMessage}
                lastTime={item.lastTime}
                isGroup={item.isGroup}
                isSelected={selectedContact?.userName === item.userName}
                onClick={() => selectAndLoad(item.userName, item.displayName, item.isGroup)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <Typography variant="body" align="center" color="var(--color-text-tertiary)" style={{ marginTop: 40 }}>
            暂无联系人
          </Typography>
        )}
      </div>
    </div>
  );
}
```

#### 2.4.2 消息展示系统

**任务 T-4.3: MessageBubble — 消息气泡**

文件：`src/l3-molecule/chat/MessageBubble.tsx`

```typescript
import { motion } from 'framer-motion';
import { Typography } from '@l4/ui/Typography';
import { Avatar } from '@l4/ui/Avatar';
import type { HistoryMessage } from '@/l2-coordinator/api-docs/history';

interface MessageBubbleProps {
  message: HistoryMessage;
  isSelf: boolean;
  showAvatar: boolean;
}

// 检测消息是否包含媒体
function hasMedia(msg: HistoryMessage): boolean {
  return !!(
    msg.mediaType ||
    msg.mediaKey ||
    msg.imageKey ||
    (msg.mediaKeys && msg.mediaKeys.length > 0) ||
    (msg.imageKeys && msg.imageKeys.length > 0)
  );
}

// 检测消息类型标签
function getTypeLabel(msg: HistoryMessage): string | null {
  if (msg.mediaType === 'image' || msg.imageKey) return '[图片]';
  if (msg.mediaType === 'video') return '[视频]';
  if (msg.mediaType === 'voice') return '[语音]';
  if (msg.mediaType === 'file') return '[文件]';
  if (msg.type === 'card') return '[名片]';
  if (msg.type === 'system') return '[系统消息]';
  return null;
}

export function MessageBubble({ message, isSelf, showAvatar }: MessageBubbleProps) {
  const typeLabel = getTypeLabel(message);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        display: 'flex',
        flexDirection: isSelf ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 8,
        padding: '4px 16px',
      }}
    >
      {showAvatar ? (
        <Avatar alt={message.sender} size={32} />
      ) : (
        <div style={{ width: 32 }} />
      )}

      <div style={{ maxWidth: '65%' }}>
        {!isSelf && showAvatar && (
          <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginBottom: 2 }}>
            {message.sender}
          </Typography>
        )}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: isSelf ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            background: isSelf
              ? 'var(--color-bubble-self, #007AFF)'
              : 'var(--color-bubble-other, rgba(255,255,255,0.9))',
            color: isSelf ? '#fff' : 'var(--color-text-primary)',
            wordBreak: 'break-word',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          {typeLabel ? (
            <Typography variant="caption" color={isSelf ? 'rgba(255,255,255,0.85)' : 'var(--color-text-secondary)'}>
              {typeLabel}
            </Typography>
          ) : (
            <Typography variant="body" style={{ lineHeight: 1.5 }}>
              {message.content}
            </Typography>
          )}
        </div>
        <Typography
          variant="caption"
          color="var(--color-text-tertiary)"
          align={isSelf ? 'right' : 'left'}
          style={{ marginTop: 2 }}
        >
          {message.time}
        </Typography>
      </div>
    </motion.div>
  );
}
```

**任务 T-4.4: MessageList — 虚拟滚动消息列表**

文件：`src/l3-molecule/chat/MessageList.tsx`

```typescript
import { useRef, useCallback, useEffect } from 'react';
import { Typography } from '@l4/ui/Typography';
import { Spinner } from '@l4/ui/Spinner';
import { MessageBubble } from './MessageBubble';
import { useChatCommander } from '@l2/commander/useChatCommander';

export function MessageList() {
  const {
    selectedContact,
    selectedChatRoom,
    messages,
    messagesLoading,
    messagesTotalCount,
    messagesOffset,
    loadMoreHistory,
  } = useChatCommander();

  const listRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const currentChat = selectedContact?.userName || selectedChatRoom?.name;

  // 滚动到顶部时加载更多
  const handleScroll = useCallback(() => {
    if (!listRef.current || !currentChat || loadingRef.current) return;
    const { scrollTop } = listRef.current;

    // 滚动到顶部 50px 以内时，加载更多
    if (scrollTop < 50 && messagesOffset + 50 < messagesTotalCount) {
      loadingRef.current = true;
      loadMoreHistory(currentChat).finally(() => {
        loadingRef.current = false;
      });
    }
  }, [currentChat, messagesOffset, messagesTotalCount, loadMoreHistory]);

  // 新消息进入时滚动到底部
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      const shouldScroll = listRef.current.scrollHeight - listRef.current.scrollTop < 600;
      if (shouldScroll || messagesOffset === 0) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }
  }, [messages.length]);

  if (!currentChat) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <Typography variant="h3" color="var(--color-text-tertiary)">
          chatlog_alpha
        </Typography>
        <Typography variant="body" color="var(--color-text-quaternary)">
          选择左侧联系人开始浏览聊天记录
        </Typography>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      style={{
        height: '100%',
        overflowY: 'auto',
        paddingBottom: 20,
      }}
    >
      {/* 顶部加载指示器 */}
      {messagesLoading && messagesOffset > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
          <Spinner size={20} />
        </div>
      )}

      {/* 所有消息已加载提示 */}
      {messagesOffset + 50 >= messagesTotalCount && messages.length > 0 && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <Typography variant="caption" color="var(--color-text-quaternary)">
            — 已加载全部 {messagesTotalCount} 条消息 —
          </Typography>
        </div>
      )}

      {/* 消息列表 */}
      {messages.map((msg, index) => {
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const isSelf = msg.sender === 'self' || msg.sender === selectedContact?.userName;
        // 当前消息的发送者与上一条不同，或时间间隔 >5分钟时显示头像
        const showAvatar =
          !prevMsg ||
          prevMsg.sender !== msg.sender ||
          Math.abs(msg.timestamp - prevMsg.timestamp) > 300;

        return (
          <MessageBubble
            key={`${msg.localId}-${index}`}
            message={msg}
            isSelf={isSelf}
            showAvatar={showAvatar}
          />
        );
      })}

      {/* 首次加载中 */}
      {messagesLoading && messages.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner size={28} label="加载消息中..." />
        </div>
      )}
    </div>
  );
}
```

**任务 T-4.5: ChatView — 聊天主视图**

文件：`src/l3-molecule/chat/ChatView.tsx`

```typescript
import { MessageList } from './MessageList';
import { useChatCommander } from '@l2/commander/useChatCommander';
import { Typography } from '@l4/ui/Typography';

export function ChatView() {
  const { selectedContact, selectedChatRoom } = useChatCommander();
  const title = selectedContact?.remark || selectedContact?.nickName ||
    selectedChatRoom?.nickName || '';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部聊天标题栏 */}
      {title && (
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Typography variant="h3">{title}</Typography>
          {selectedChatRoom && (
            <Typography variant="caption" color="var(--color-text-tertiary)">
              ({selectedChatRoom.users?.length || 0} 人)
            </Typography>
          )}
        </div>
      )}

      {/* 消息列表区域 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MessageList />
      </div>
    </div>
  );
}
```

**任务 T-4.6: MediaPreview — 媒体预览弹窗**

文件：`src/l3-molecule/chat/MediaPreview.tsx`

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { SpringModal } from '@l4/ui/SpringModal';
import { Typography } from '@l4/ui/Typography';
import type { HistoryMessage } from '@/l2-coordinator/api-docs/history';

interface MediaPreviewProps {
  message: HistoryMessage | null;
  onClose: () => void;
}

export function MediaPreview({ message, onClose }: MediaPreviewProps) {
  return (
    <AnimatePresence>
      {message && (
        <SpringModal onClose={onClose}>
          <div
            style={{
              maxWidth: '80vw',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {message.imageUrl || message.mediaUrl ? (
              <img
                src={message.imageUrl || message.mediaUrl}
                alt="预览"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  borderRadius: 12,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Typography variant="body" color="var(--color-text-secondary)">
                无法预览此媒体
              </Typography>
            )}

            <Typography variant="caption" color="var(--color-text-tertiary)">
              {message.time}
            </Typography>
          </div>
        </SpringModal>
      )}
    </AnimatePresence>
  );
}
```

---

### 阶段 2.5: L3 分子层 — 搜索组件

**任务 T-5.1: GlobalSearch — 全局搜索栏**

文件：`src/l3-molecule/search/GlobalSearch.tsx`

```typescript
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@l4/ui/Input';
import { Typography } from '@l4/ui/Typography';
import { Spinner } from '@l4/ui/Spinner';
import { useSearchCommander } from '@l2/commander/useSearchCommander';

export function GlobalSearch() {
  const { search, results, loading } = useSearchCommander();
  const [inputValue, setInputValue] = useState('');

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      search(value);
    },
    [search]
  );

  return (
    <div style={{ position: 'relative' }}>
      <Input
        placeholder="全局搜索聊天记录..."
        value={inputValue}
        onChange={handleChange}
        style={{ paddingRight: 40 }}
      />
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <Spinner size={16} />
          </motion.div>
        )}
      </AnimatePresence>
      {results && (
        <div
          style={{
            marginTop: 4,
            padding: '4px 8px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="caption" color="var(--color-text-secondary)">
            找到 {results.totalCount} 条匹配记录
          </Typography>
        </div>
      )}
    </div>
  );
}
```

**任务 T-5.2: SearchResults — 搜索结果列表**

文件：`src/l3-molecule/search/SearchResults.tsx`

```typescript
import { Typography } from '@l4/ui/Typography';
import { useSearchCommander } from '@l2/commander/useSearchCommander';
import { useChatCommander } from '@l2/commander/useChatCommander';

export function SearchResults() {
  const { results, loadMoreResults } = useSearchCommander();
  const { selectAndLoad } = useChatCommander();

  if (!results || results.messages.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {results.messages.map((msg, i) => (
        <div
          key={i}
          onClick={() => selectAndLoad(msg.username || msg.chat || '', msg.sender, !!msg.isGroup)}
          style={{
            padding: '10px 12px',
            cursor: 'pointer',
            borderRadius: 8,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Typography variant="label" weight={600}>
              {msg.sender}
            </Typography>
            <Typography variant="caption" color="var(--color-text-tertiary)">
              {msg.time}
            </Typography>
          </div>
          <Typography
            variant="body"
            color="var(--color-text-secondary)"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {msg.content}
          </Typography>
        </div>
      ))}

      {results.count + results.offset < results.totalCount && (
        <div
          onClick={loadMoreResults}
          style={{
            textAlign: 'center',
            padding: 12,
            cursor: 'pointer',
          }}
        >
          <Typography variant="caption" color="var(--color-text-secondary)">
            加载更多...
          </Typography>
        </div>
      )}
    </div>
  );
}
```

**任务 T-5.3: FilterBar — 筛选栏**

文件：`src/l3-molecule/search/FilterBar.tsx`

```typescript
import { AppleButton } from '@l4/ui/AppleButton';

type FilterType = 'all' | 'text' | 'image' | 'video' | 'file';

interface FilterBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'text', label: '文本' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'file', label: '文件' },
];

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 0' }}>
      {FILTER_OPTIONS.map((opt) => (
        <AppleButton
          key={opt.value}
          variant={activeFilter === opt.value ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onFilterChange(opt.value)}
        >
          {opt.label}
        </AppleButton>
      ))}
    </div>
  );
}
```

---

### 阶段 2.6: L3 分子层 — 统计组件

**任务 T-6.1: DashboardOverview — 概览统计卡片**

文件：`src/l3-molecule/stats/DashboardOverview.tsx`

```typescript
import { GlassPanel } from '@l4/ui/GlassPanel';
import { Typography } from '@l4/ui/Typography';
import { SkeletonLoader } from '@l4/ui/SkeletonLoader';
import type { StatsResponse } from '@/l2-coordinator/api-docs/stats';

interface DashboardOverviewProps {
  stats: StatsResponse | null;
  loading: boolean;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
      <div style={{ padding: '16px 20px', textAlign: 'center' }}>
        <Typography variant="label" color="var(--color-text-secondary)">
          {label}
        </Typography>
        <Typography variant="h2" style={{ marginTop: 4 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
      </div>
    </GlassPanel>
  );
}

export function DashboardOverview({ stats, loading }: DashboardOverviewProps) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassPanel key={i} blur={12} borderRadius={16}>
            <div style={{ padding: 16 }}>
              <SkeletonLoader variant="rect" height={14} width="60%" />
              <SkeletonLoader variant="rect" height={28} width="80%" style={{ marginTop: 8 }} />
            </div>
          </GlassPanel>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <StatCard label="消息总数" value={stats.total} />
      <StatCard label="活跃人数" value={stats.activeSenders} />
      <StatCard label="活跃天数" value={stats.activeDays} />
      <StatCard label="查询范围" value={stats.queryRangeLabel} />
    </div>
  );
}
```

**任务 T-6.2: TrendChart — 趋势图（纯 CSS 简化柱状图）**

文件：`src/l3-molecule/stats/TrendChart.tsx`

```typescript
import { GlassPanel } from '@l4/ui/GlassPanel';
import { Typography } from '@l4/ui/Typography';
import type { TrendDataPoint } from '@/l2-coordinator/api-docs/stats';

interface TrendChartProps {
  data: TrendDataPoint[];
}

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
      <div style={{ padding: 16 }}>
        <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
          消息趋势
        </Typography>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 4,
            height: 120,
          }}
        >
          {data.map((point, i) => (
            <div
              key={i}
              title={`${point.date}: ${point.count}`}
              style={{
                flex: 1,
                height: `${(point.count / maxCount) * 100}%`,
                background: 'linear-gradient(180deg, #007AFF 0%, rgba(0,122,255,0.3) 100%)',
                borderRadius: '3px 3px 0 0',
                minHeight: 2,
                transition: 'height 0.3s ease',
              }}
            />
          ))}
        </div>
        {/* 简化日期标签 */}
        {data.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <Typography variant="caption" color="var(--color-text-quaternary)">
              {data[0]?.date}
            </Typography>
            <Typography variant="caption" color="var(--color-text-quaternary)">
              {data[data.length - 1]?.date}
            </Typography>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
```

**任务 T-6.3: TopContactCard — 活跃联系人排行**

文件：`src/l3-molecule/stats/TopContactCard.tsx`

```typescript
import { GlassPanel } from '@l4/ui/GlassPanel';
import { Typography } from '@l4/ui/Typography';
import { Avatar } from '@l4/ui/Avatar';
import type { StatsCountBySender } from '@/l2-coordinator/api-docs/stats';

interface TopContactCardProps {
  topSenders: StatsCountBySender[];
}

export function TopContactCard({ topSenders }: TopContactCardProps) {
  if (topSenders.length === 0) return null;

  return (
    <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
      <div style={{ padding: 16 }}>
        <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
          活跃联系人
        </Typography>
        {topSenders.slice(0, 10).map((sender, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 0',
              borderBottom:
                i < Math.min(topSenders.length - 1, 9)
                  ? '1px solid var(--color-border)'
                  : 'none',
            }}
          >
            <Typography variant="caption" weight={600} color="var(--color-text-tertiary)" style={{ width: 20 }}>
              {i + 1}
            </Typography>
            <Avatar alt={sender.sender} size={28} />
            <Typography variant="body" style={{ flex: 1 }}>
              {sender.sender}
            </Typography>
            <Typography variant="caption" color="var(--color-text-secondary)">
              {sender.count.toLocaleString()} 条
            </Typography>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
```

---

### 阶段 2.7: L4 UI 原子新增

**任务 T-7.1: Badge — 徽章组件**

文件：`src/l4-atom/ui/Badge.tsx`

```typescript
import type { ReactNode } from 'react';

interface BadgeProps {
  count: number;
  max?: number;
  children?: ReactNode;
}

export function Badge({ count, max = 99, children }: BadgeProps) {
  if (count <= 0 && !children) return null;

  const displayText = count > max ? `${max}+` : String(count);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        background: '#FF3B30',
        color: '#fff',
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 9,
        lineHeight: 1,
      }}
    >
      {children || displayText}
    </span>
  );
}
```

**任务 T-7.2: Input — 输入框原子**

文件：`src/l4-atom/ui/Input.tsx`

```typescript
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'search';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        {...props}
        style={{
          width: '100%',
          height: variant === 'search' ? 36 : 32,
          padding: '0 12px',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: variant === 'search' ? 18 : 10,
          color: 'var(--color-text-primary)',
          fontSize: 14,
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0,122,255,0.5)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.15)';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          e.currentTarget.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
      />
    );
  }
);

Input.displayName = 'Input';
```

**任务 T-7.3: SpringModal — 弹簧动画模态框**

文件：`src/l4-atom/ui/SpringModal.tsx`

```typescript
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SpringModalProps {
  children: ReactNode;
  onClose: () => void;
}

export function SpringModal({ children, onClose }: SpringModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface)',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
```

**任务 T-7.4: 更新 UI 原子导出口**

文件：`src/l4-atom/ui/index.ts`

```typescript
export { AppleButton } from './AppleButton';
export { GlassPanel } from './GlassPanel';
export { Typography } from './Typography';
export { SkeletonLoader } from './SkeletonLoader';
export { Spinner } from './Spinner';
export { Avatar } from './Avatar';
export { Badge } from './Badge';
export { Input } from './Input';
export { SpringModal } from './SpringModal';
```

---

### 阶段 2.8: L1 入口层扩展

**任务 T-8.1: DashboardView — 主面板页面**

文件：`src/l1-entry/pages/DashboardView.tsx`

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/l2-coordinator/data-clerk/stores/useAppStore';
import { AppLayout } from '@l3/common/AppLayout';
import { StatusBar } from '@l3/common/StatusBar';
import { ContactList } from '@l3/chat/ContactList';
import { ChatView } from '@l3/chat/ChatView';
import { GlobalSearch } from '@l3/search/GlobalSearch';
import { SearchResults } from '@l3/search/SearchResults';
import { FilterBar } from '@l3/search/FilterBar';
import { DashboardOverview } from '@l3/stats/DashboardOverview';
import { TrendChart } from '@l3/stats/TrendChart';
import { TopContactCard } from '@l3/stats/TopContactCard';
import { useChatCommander } from '@l2/commander/useChatCommander';
import { useStatsCommander } from '@l2/commander/useStatsCommander';
import { Typography } from '@l4/ui/Typography';
import { AppleButton } from '@l4/ui/AppleButton';
import { useState } from 'react';

export function DashboardView() {
  const navigate = useNavigate();
  const appPhase = useAppStore((s) => s.appPhase);
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const errorMessage = useAppStore((s) => s.errorMessage);

  const { loadContacts, selectedContact, selectedChatRoom } = useChatCommander();
  const { stats, trend, loadAll, loading: statsLoading } = useStatsCommander();
  const [showStats, setShowStats] = useState(true);

  // 如果应用未就绪，跳回启动页
  useEffect(() => {
    if (appPhase !== 'ready') {
      navigate('/', { replace: true });
    }
  }, [appPhase, navigate]);

  // 加载联系人列表
  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // 选中联系人时加载统计
  const currentChat = selectedContact?.userName || selectedChatRoom?.name;
  useEffect(() => {
    if (currentChat) {
      loadAll(currentChat);
    }
  }, [currentChat, loadAll]);

  // 错误状态
  if (appPhase === 'error') {
    return (
      <AppLayout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
          <Typography variant="h2" color="#FF3B30">
            应用错误
          </Typography>
          <Typography variant="body" color="var(--color-text-secondary)">
            {errorMessage}
          </Typography>
          <AppleButton variant="primary" onClick={() => navigate('/')}>
            返回启动页
          </AppleButton>
        </div>
        <StatusBar status={sidecarStatus} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* 左侧：联系人侧边栏 */}
        <div
          style={{
            width: 280,
            minWidth: 280,
            borderRight: '1px solid var(--color-border)',
            backgroundColor: 'rgba(0,0,0,0.03)',
            flexShrink: 0,
          }}
        >
          <ContactList />
        </div>

        {/* 中间：聊天主区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* 搜索栏 */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)' }}>
            <GlobalSearch />
            <FilterBar activeFilter="all" onFilterChange={() => {}} />
            <SearchResults />
          </div>

          {/* 聊天消息区域 */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatView />
          </div>
        </div>

        {/* 右侧：统计面板（可折叠） */}
        {showStats && currentChat && (
          <div
            style={{
              width: 260,
              minWidth: 260,
              borderLeft: '1px solid var(--color-border)',
              padding: 12,
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Typography variant="label" weight={600}>统计数据</Typography>
              <AppleButton variant="ghost" size="sm" onClick={() => setShowStats(false)}>
                隐藏
              </AppleButton>
            </div>
            <DashboardOverview stats={stats} loading={statsLoading} />
            <div style={{ marginTop: 12 }}>
              <TrendChart data={trend} />
            </div>
            {stats && (
              <div style={{ marginTop: 12 }}>
                <TopContactCard topSenders={stats.topSenders} />
              </div>
            )}
          </div>
        )}

        {!showStats && (
          <AppleButton variant="ghost" size="sm" onClick={() => setShowStats(true)} style={{ position: 'absolute', right: 8, top: 8 }}>
            显示统计
          </AppleButton>
        )}
      </div>

      <StatusBar status={sidecarStatus} />
    </AppLayout>
  );
}
```

**任务 T-8.2: 更新路由配置**

文件：`src/l1-entry/routes/index.tsx`

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LaunchView } from '@l1/pages/LaunchView';
import { DashboardView } from '@l1/pages/DashboardView';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LaunchView />} />
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**任务 T-8.3: 更新 LaunchView — 加入自动跳转**

在现有 `LaunchView.tsx` 中，当 `appPhase === 'ready'` 时自动跳转到 `/dashboard`：

```typescript
// 在 LaunchView 组件中添加：
useEffect(() => {
  if (appPhase === 'ready') {
    navigate('/dashboard');
  }
}, [appPhase, navigate]);
```

并改进展示：当 phase 为 `db_not_found` 时显示目录选择引导，当 phase 为 `db_connecting`/`db_decrypting` 时显示对应状态。

**任务 T-8.4: 更新 StatusBar — 加入 DB 状态**

在现有 `StatusBar.tsx` 中增加 DB 状态的显示：

```typescript
// 新增属性：
interface StatusBarProps {
  status: SidecarStatus;
  dbStatus?: DbStatus;    // 新增
  error?: string;
}
// 在渲染中加入 DB 状态指示器
```

---

### 阶段 2.9: 全局样式增强

**任务 T-9.1: 增加全局 CSS 变量**

在 `src/styles/globals.css` 中新增变量：

```css
:root {
  /* 已有变量保持不变 */

  /* Sprint 2 新增 */
  --color-bubble-self: #007AFF;
  --color-bubble-other: rgba(255, 255, 255, 0.9);
  --color-border: rgba(0, 0, 0, 0.08);
  --color-surface: #ffffff;
  --color-text-quaternary: rgba(0, 0, 0, 0.25);
  --color-text-tertiary: rgba(0, 0, 0, 0.40);
  --color-text-secondary: rgba(0, 0, 0, 0.60);
  --color-text-primary: rgba(0, 0, 0, 0.85);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bubble-self: #0A84FF;
    --color-bubble-other: rgba(255, 255, 255, 0.1);
    --color-border: rgba(255, 255, 255, 0.08);
    --color-surface: #1c1c1e;
    --color-text-quaternary: rgba(255, 255, 255, 0.18);
    --color-text-tertiary: rgba(255, 255, 255, 0.35);
    --color-text-secondary: rgba(255, 255, 255, 0.55);
    --color-text-primary: rgba(255, 255, 255, 0.85);
  }
}
```

---

## 六、Sprint 2 依赖关系图

```
T-0.x (真实 Sidecar 集成)
    │
    └──→ T-1.x (数据接入 & 启动剧本扩展)
              │
              ├──→ T-2.x (L4 网络原子 — API 类型 + 实现)
              │       │
              │       └──→ T-3.x (L2 协调层 — 业务模块)
              │               │
              │               ├──→ T-4.x (L3 分子 — 聊天)
              │               ├──→ T-5.x (L3 分子 — 搜索)
              │               ├──→ T-6.x (L3 分子 — 统计)
              │               │
              │               └──→ T-7.x (L4 UI 原子新增)
              │                         │
              │                         └──→ T-8.x (L1 入口层 — 页面组装)
              │
              └──→ T-9.x (全局样式增强)
```

**并行建议：**
- T-2.x（API 类型定义）可在 T-0.x/T-1.x 进行中提前完成
- T-3.x（状态管理）可在 T-2.x 实现的同时并行开发
- T-4.x/T-5.x/T-6.x（L3 分子组件）依赖 T-3.x 完成，但三个模块之间可并行开发
- T-7.x（新增 UI 原子）可与 T-4.x 并行

---

## 七、Sprint 2 执行顺序建议

```
第 1 周:
  Day 1:    T-0.x (真实 Sidecar 集成 — 编译/挂载/验证)
  Day 1-2:  T-1.x (状态扩展 + 系统原子 + 启动剧本)
  Day 2-3:  T-2.x (API 类型定义 + 网络原子实现)
  Day 3-4:  T-3.1-T-3.8 (L2 协调层 — 全部 8 个文件)
  Day 4-5:  T-7.x (L4 UI 原子新增 — Badge, Input, SpringModal)

第 2 周:
  Day 6-7:  T-4.1-T-4.6 (L3 聊天分子组件)
  Day 7-8:  T-5.1-T-5.3 (L3 搜索分子组件)
  Day 8-9:  T-6.1-T-6.3 (L3 统计分子组件)
  Day 9:    T-9.1 (全局样式增强)

第 3 周:
  Day 10-11: T-8.1-T-8.4 (L1 页面组装 + 路由 + StatusBar改进)
  Day 12:    Integration test — 全部组件联动测试
  Day 13:    手动测试: 启动 → 探测数据 → 浏览聊天 → 搜索 → 统计
  Day 14-15: Bug 修复 + 代码审查 + Sprint 验收
```

---

## 八、验收清单

| # | 验收项 | 验收方法 |
|---|--------|---------|
| 1 | `pnpm typecheck` 零错误 | 运行 `pnpm typecheck` |
| 2 | `pnpm lint` 零警告 | 运行 `pnpm lint` |
| 3 | `pnpm build` 成功 | 运行 `pnpm build` |
| 4 | 真实 chatlog_alpha 引擎启动成功，端口 5030 | 启动应用后检查 `/health` 返回 200 |
| 5 | 智能路径探测能找到微信数据目录（如有） | 观察启动日志/状态 |
| 6 | 探测失败时可弹出目录选择器手动指定 | 删除微信数据目录后启动测试 |
| 7 | DB 就绪后自动跳转主面板 | 观察启动流程 |
| 8 | 联系人列表正确显示（昵称、最后消息、时间） | 肉眼比对实际微信数据 |
| 9 | 点击联系人可加载并显示聊天记录 | 点击任意联系人 |
| 10 | 消息气泡区分发送/接收样式（颜色、位置） | 肉眼观察气泡 |
| 11 | 消息入场有弹簧动画 | 肉眼观察动画 |
| 12 | 上拉加载更早消息功能正常 | 滚动到顶部触发加载 |
| 13 | 全局搜索 300ms 防抖搜索正常 | 快速输入搜索词观察请求频率 |
| 14 | 搜索结果可点击跳转到对应聊天 | 点击搜索结果条目 |
| 15 | 统计面板数据正确（总数、人数、排行） | 与真实数据比对 |
| 16 | 趋势图正常渲染 | 肉眼观察 |
| 17 | 连续启动-关闭 5 次无僵尸进程 | 任务管理器检查 |
| 18 | L4 原子间无相互 import | code review |
| 19 | L3 分子间无相互 import | code review |
| 20 | L1 页面不包含业务逻辑 (useState/useEffect 仅限导航/布局) | code review |

---

## 九、风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| chatlog_alpha 编译失败 (CGO 环境问题) | 阻断性 | 提前验证 Go + GCC 环境；如 CGO 问题短时无法解决，降级为提取预编译 Release |
| 微信数据库版本不匹配导致解密失败 | 功能性 | L2 Diplomat 拦截 503 错误，翻译友好提示；预留降级为 Demo 数据模式 |
| 大量消息导致虚拟滚动性能问题 | 体验性 | 消息列表采用 CSS overflow + 防抖加载，后续 Sprint 可引入 react-window |
| API 接口与文档不一致 | 功能性 | 所有网络原子以实际 chatlog_alpha 响应为准，类型定义后置适配 |

---

> **下一步**: 待用户审阅并确认本 Sprint 2 详细规划后，即可进入执行阶段。

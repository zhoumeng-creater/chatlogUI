# Sprint 3: AI 聊天分析系统 — 详细开发规划

> **所属项目**: chatlog_alpha 桌面应用
> **架构模式**: Mediator 四层架构
> **优先级**: P2（增强功能，依赖 Sprint 2 完成）
> **预估工期**: 1-2 周
> **状态**: 规划阶段
> **前置依赖**: Sprint 2（聊天记录系统）已完成

---

## 一、Sprint 3 目标

在 Sprint 2 的聊天记录浏览系统之上，接入 chatlog_alpha 后端的语义分析引擎，实现基于本地/云端 LLM 的智能问答与分析功能。

| 交付物 | 详细内容 | 验收标准 |
|--------|---------|---------|
| **流式 AI 问答** | 基于选中联系人的 RAG 流式问答，支持打字机逐字渲染 | SSE 流正常接收，打字机动画流畅 |
| **语义搜索** | 自然语言搜索聊天记录，带相关度评分 | 向量+关键词混合搜索，结果相关度可排序 |
| **话题分析** | 提取对话热门话题，展示话题趋势 | 话题列表正确反映对话内容 |
| **联系人画像** | AI 生成的联系人角色、活跃模式、情绪倾向分析 | 画像数据正确渲染 |
| **模型配置向导** | 引导式步骤化配置 LLM 提供商（Ollama/GLM/DeepSeek） | OOTB 体验：自动检测 Ollama，云端填写 API Key |
| **索引管理** | 语义索引构建、进度展示、重建/清空 | 进度条实时更新，构建可暂停/恢复 |

---

## 二、Sprint 3 页面架构

### 2.1 AI 面板在 DashboardView 中的集成

Sprint 2 的 DashboardView 右侧面板当前仅展示统计数据。Sprint 3 将右侧面板改为带顶层切换的容器：

```
┌──────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  自定义标题栏 (无边框)                    [交通灯按钮]          │   │
│  ├──────────────┬──────────────────────────┬─────────────────────┤   │
│  │  联系人     │                          │  [ 📊 统计 | 🤖 AI ] │   │
│  │  侧边栏     │      消息展示区             │  ┌───┬───┬───┐     │   │
│  │             │                          │  │QA │搜索│分析│     │   │
│  │  联系人A   │  MessageBubble           │  ├───────────────┤     │   │
│  │  联系人B   │  MessageBubble           │  │              │     │   │
│  │  群聊C    │  ...                      │  │  AI 内容区域  │     │   │
│  │             │                          │  │              │     │   │
│  │             │  全局搜索 + 搜索结果       │  │              │     │   │
│  ├──────────────┴──────────────────────────┴─────────────────────┤   │
│  │                    状态栏 (Sidecar + AI 状态)                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

- **顶层切换**：`📊 统计` | `🤖 AI` — 两组标签互斥，切换时保持各子标签的滚动状态
- **AI 子标签**：QA（问答）、搜索（语义搜索）、分析（话题+画像）
- **统计面板**：保持 Sprint 2 的 `DashboardOverview` + `TrendChart` + `TopContactCard`

### 2.2 AI 状态机（AiStore 核心）

```
                    ┌─────────┐
         首次访问 → │ CHECKING │
                    └────┬────┘
                         │
              ┌──────────┴──────────┐
              ↓                     ↓
     ┌──────────────┐      ┌──────────────┐
     │ NOT_CONFIGURED│      │  CONFIGURED  │
     │ (无提供商设置) │      │  (有提供商)   │
     └──────┬───────┘      └──────┬───────┘
            │                     │
            ↓                     ↓
     ┌──────────────┐      ┌──────────────┐
     │ CONFIGURING  │      │ INDEX_CHECKING│
     │ (向导进行中) │      └──────┬───────┘
     └──────────────┘             │
                    ┌─────────────┴──────────────┐
                    ↓                            ↓
           ┌──────────────┐             ┌──────────────┐
           │ INDEX_NOT_   │             │ INDEX_READY  │
           │ BUILT        │             │ (全部可用)    │
           └──────┬───────┘             └──────────────┘
                  │
                  ↓
           ┌──────────────┐
           │ INDEX_BUILDING│ ←→ 可暂停/恢复
           │ (进度 0-100%) │
           └──────┬───────┘
                  │
         ┌────────┴────────┐
         ↓                 ↓
  ┌──────────────┐  ┌──────────────┐
  │ INDEX_READY  │  │ INDEX_ERROR  │
  └──────────────┘  └──────────────┘

  所有状态均可转入: ERROR (恢复路径: retry/重新配置)
```

### 2.3 启动序列扩展

Sprint 2 启动完成后，AI 模块延迟初始化：

```
Sprint 2: killPort → spawnSidecar → /health 200 → detectWxPath → /api/v1/db ready
                                                                         ↓
Sprint 3 (新增):                                        DashboardView 加载后
                                                        → AiStore 检查 /api/v1/semantic/config
                                                        → 有配置 → 检查索引状态
                                                        → 无配置 → 显示"配置 AI"引导入口
```

---

## 三、关键设计决策

### 3.1 SSE 流式连接管理

- 使用浏览器原生 `EventSource` API（不支持 POST），改用 `fetch` + `ReadableStream` 读取 SSE 数据
- 切换联系人时自动 abort 当前 SSE 连接
- 组件卸载时 cleanup abort
- 连接断开自动重试（最多 3 次，指数退避 1s/2s/4s）
- SSE 数据格式：`data: {"type":"token","content":"..."}\n\n` → Diplomat.sseParser 解析并缓冲

### 3.2 索引进度轮询

- 轮询 `/api/v1/semantic/index/status`，间隔 1s
- 后端返回结构体含 `total`/`completed`/`status` 字段
- ProgressBar 实时更新百分比
- 索引构建期间，QA/Search 按钮灰色不可用 + 提示"索引构建中...(%d%%)"
- 索引构建超时上限 30 分钟，超时后显示警告

### 3.3 Markdown 渲染

- 不引入第三方 Markdown 库（保持零依赖增量）
- L4 UI 原子 `CodeBlock` 处理代码块：暗色背景，等宽字体，可选复制按钮
- QA 消息体内联渲染：加粗、斜体、列表、链接、代码块
- 使用简单正则解析，安全转义 HTML 防 XSS

### 3.4 搜索去抖策略

- 复用 Sprint 2 的 `diplomat/debounce.ts`（300ms）
- 语义搜索额外加 500ms（向量搜索耗时更长）
- 用户停止输入 800ms 后发起请求

---

## 四、目录结构变更

Sprint 3 在 Sprint 2 基础上新增/修改以下文件（`**` 表示新建目录）：

```
src/
├── l1-entry/
│   ├── pages/
│   │   └── DashboardView.tsx       # 修改：右侧面板 Stats/AI 切换 + AI Panel 集成
│   └── routes/
│       └── index.tsx                # 保持已有路由，无需修改
├── l2-coordinator/
│   ├── commander/
│   │   └── useAiCommander.ts        # 新增：AI 模块总指挥官
│   ├── data-clerk/
│   │   ├── stores/
│   │   │   └── useAiStore.ts        # 新增：AI 状态存储
│   │   └── types/
│   │       └── app.ts               # 保持已有，无需修改（AI 状态在 AiStore 中独立管理）
│   ├── diplomat/
│   │   ├── errorTranslator.ts       # 修改：新增 AI 错误码
│   │   ├── sseParser.ts             # 新增：SSE 流数据解析器
│   │   └── overloadInterceptor.ts   # 新增：503 过载拦截与提示
│   └── api-docs/
│       └── semantic.ts              # 新增：语义分析 API 完整类型定义
├── l3-molecule/
│   ├── chat/                        # 已有，不修改
│   ├── search/                      # 已有，不修改
│   ├── stats/                       # 已有，不修改
│   ├── common/                      # 已有
│   │   └── StatusBar.tsx            # 修改：增加 AI 状态指示
│   └── semantic/                    # 新增目录 **
│       ├── AiPanel.tsx              # 新增：AI 面板容器（Stats/AI 顶层切换 + 子标签）
│       ├── QAPanel.tsx              # 新增：问答面板（消息列表 + 输入区）
│       ├── QAMessage.tsx            # 新增：单条问答消息（用户/AI 气泡 + Markdown 渲染）
│       ├── QAInput.tsx              # 新增：问题输入区 + 上下文选择器
│       ├── SemanticSearch.tsx       # 新增：语义搜索面板
│       ├── TopicView.tsx            # 新增：话题分析视图
│       ├── ContactProfile.tsx       # 新增：联系人画像视图
│       └── SetupWizard.tsx          # 新增：AI 配置引导向导
├── l4-atom/
│   ├── ui/
│   │   ├── index.ts                 # 修改：新增 CodeBlock, ProgressBar 导出
│   │   ├── CodeBlock.tsx            # 新增：代码块渲染（暗色背景 + 等宽字体）
│   │   └── ProgressBar.tsx          # 新增：进度条（0-100%，带动画）
│   ├── network/
│   │   ├── index.ts                 # 修改：新增所有语义 API 原子导出
│   │   ├── streamQA.ts              # 新增：SSE 流式问答 API（POST /api/v1/semantic/qa/stream）
│   │   ├── fetchSemanticQA.ts       # 新增：非流式问答 API（POST /api/v1/semantic/qa, 兜底）
│   │   ├── fetchSemanticSearch.ts   # 新增：语义搜索 API（GET /api/v1/semantic/search）
│   │   ├── fetchSemanticTopics.ts   # 新增：话题提取 API（GET /api/v1/semantic/topics）
│   │   ├── fetchSemanticProfiles.ts # 新增：联系人画像 API（GET /api/v1/semantic/profiles）
│   │   ├── fetchSemanticConfig.ts   # 新增：获取语义配置 API（GET /api/v1/semantic/config）
│   │   ├── setSemanticConfig.ts     # 新增：设置语义配置 API（POST /api/v1/semantic/config）
│   │   ├── testLLMConnection.ts     # 新增：测试 LLM 连接 API（POST /api/v1/semantic/test）
│   │   ├── fetchIndexStatus.ts      # 新增：索引状态查询 API（GET /api/v1/semantic/index/status）
│   │   └── manageIndex.ts           # 新增：索引管理 API（rebuild/pause/resume/clear）
│   └── system/
│       └── 不修改（复用 Sprint 1/2 的 system atoms）
├── utils/
│   └── constants.ts                 # 修改：新增 AI 相关常量
```

---

## 五、任务分解

---

### 阶段 3.0: API 类型定义 + 常量 + 错误码

> **目标**: 先铺好类型基础，让所有后续任务有明确的数据契约。

#### 任务 T-0.1: 语义 API 类型定义

文件：`src/l2-coordinator/api-docs/semantic.ts`（新建）

```typescript
// ========== 配置相关 ==========

export type LLMProvider = 'ollama' | 'glm' | 'deepseek';

export interface SemanticConfig {
  provider: LLMProvider;
  // Ollama
  ollamaBaseUrl?: string;
  ollamaEmbeddingModel?: string;
  ollamaChatModel?: string;
  ollamaRerankModel?: string;
  // GLM
  glmApiKey?: string;
  glmBaseUrl?: string;
  glmChatModel?: string;
  // DeepSeek
  deepseekApiKey?: string;
  deepseekBaseUrl?: string;
  deepseekChatModel?: string;
}

export interface SemanticConfigResponse {
  config: SemanticConfig;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

// ========== 索引相关 ==========

export type IndexStatus = 'idle' | 'building' | 'paused' | 'ready' | 'error';

export interface IndexStatusResponse {
  status: IndexStatus;
  total: number;
  completed: number;
  error?: string;
  startedAt?: string;
}

// ========== QA 相关 ==========

export interface QARequest {
  query: string;
  chat?: string;       // 限定联系人 userName
  scope?: 'contact' | 'all';  // 搜索范围
}

export interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;  // AI 消息是否正在流式输出中
}

// SSE 数据块格式 (chatlog_alpha 实际返回)
export interface SSEChunk {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
}

// ========== 语义搜索相关 ==========

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  chat?: string;        // 可选：限定在指定聊天中搜索
  scope?: 'contact' | 'all';
}

export interface SemanticSearchResultItem {
  chat: string;
  sender: string;
  time: string;
  content: string;
  relevanceScore: number;  // 0-100
  localId: number;
}

export interface SemanticSearchResponse {
  query: string;
  totalCount: number;
  results: SemanticSearchResultItem[];
}

// ========== 话题相关 ==========

export interface TopicItem {
  topic: string;
  count: number;
  percentage: number;
}

export interface TopicsResponse {
  chat: string;
  username: string;
  topics: TopicItem[];
  timeRange?: string;
}

// ========== 联系人画像相关 ==========

export interface ContactProfileData {
  chat: string;
  username: string;
  role?: string;
  activeHours?: string;
  dailyFrequency?: number;
  mainTopics?: string[];
  sentiment?: string;
  summary?: string;
}

// ========== AI 模块状态 ==========

export type AiPhase =
  | 'idle'
  | 'checking_config'
  | 'not_configured'
  | 'configuring'
  | 'configured'
  | 'index_checking'
  | 'index_not_built'
  | 'index_building'
  | 'index_ready'
  | 'index_error'
  | 'error';

export interface AiState {
  phase: AiPhase;
  config: SemanticConfig | null;
  indexStatus: IndexStatusResponse | null;
  // QA
  qaMessages: QAMessage[];
  qaLoading: boolean;
  qaStreaming: boolean;
  // 语义搜索
  searchQuery: string;
  searchResults: SemanticSearchResponse | null;
  searchLoading: boolean;
  // 分析
  topics: TopicsResponse | null;
  topicsLoading: boolean;
  profile: ContactProfileData | null;
  profileLoading: boolean;
  // 错误
  error: string | null;
}

export interface AiActions {
  setPhase: (phase: AiPhase) => void;
  setConfig: (config: SemanticConfig) => void;
  setIndexStatus: (status: IndexStatusResponse) => void;
  // QA
  addQAMessage: (msg: QAMessage) => void;
  appendQAToken: (msgId: string, token: string) => void;
  setQALoading: (loading: boolean) => void;
  setQAStreaming: (streaming: boolean) => void;
  clearQAMessages: () => void;
  // Search
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SemanticSearchResponse | null) => void;
  setSearchLoading: (loading: boolean) => void;
  // Analysis
  setTopics: (topics: TopicsResponse | null) => void;
  setTopicsLoading: (loading: boolean) => void;
  setProfile: (profile: ContactProfileData | null) => void;
  setProfileLoading: (loading: boolean) => void;
  // Error
  setError: (error: string | null) => void;
  reset: () => void;
}
```

#### 任务 T-0.2: AI 相关常量

文件：`src/utils/constants.ts`（修改，追加）

```typescript
// ========== Sprint 3: AI 语义分析常量 ==========

// API 基础路径
export const AI_BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

// SSE 流式连接
export const SSE_RECONNECT_MAX_ATTEMPTS = 3;
export const SSE_RECONNECT_BASE_DELAY_MS = 1000;
export const SSE_TIMEOUT_MS = 60000; // 单个 QA 请求最长 60 秒无响应则超时

// 索引状态轮询
export const INDEX_POLL_INTERVAL_MS = 1000;
export const INDEX_BUILD_TIMEOUT_MS = 30 * 60 * 1000; // 30 分钟

// 语义搜索
export const SEMANTIC_SEARCH_DEBOUNCE_MS = 800;
export const SEMANTIC_SEARCH_DEFAULT_LIMIT = 20;

// QA 历史限制
export const QA_MAX_HISTORY = 100; // 单次会话最多保留 100 条 QA 记录
```

#### 任务 T-0.3: AI 错误码

文件：`src/l2-coordinator/diplomat/errorTranslator.ts`（修改，在 ERROR_MAP 中追加）

```typescript
// Sprint 3 新增 AI 错误码:
'ESEMANTIC_NOT_CONFIGURED': 'AI 功能尚未配置，请在右侧面板中完成配置',
'ESEMANTIC_INDEX_NOT_BUILT': '语义索引尚未构建，请先构建索引',
'ESEMANTIC_INDEX_BUILDING': '索引正在构建中 ({{progress}}%)，请耐心等待',
'ESEMANTIC_OVERLOAD': 'AI 引擎处理繁忙，请稍后重试',
'ESEMANTIC_SSE_ERROR': 'AI 回答中断，请重新提问',
'ESEMANTIC_SEARCH_FAIL': '语义搜索失败，请检查索引状态',
'ESEMANTIC_CONNECTION_FAIL': 'LLM 连接测试失败，请检查配置',
'ESEMANTIC_TIMEOUT': 'AI 回答超时，请尝试简化问题或更换模型',
```

---

### 阶段 3.1: L4 UI 原子新增

#### 任务 T-1.1: CodeBlock — 代码块渲染

文件：`src/l4-atom/ui/CodeBlock.tsx`（新建）

```typescript
import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        margin: '8px 0',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--color-code-bg, #1e1e2e)',
        border: '1px solid var(--color-border)',
      }}
    >
      {language && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 12px',
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <span>{language}</span>
          <button
            onClick={handleCopy}
            style={{
              background: 'transparent',
              border: 'none',
              color: copied ? '#34C759' : 'var(--color-text-tertiary)',
              fontSize: 12,
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: '12px',
          overflow: 'auto',
          fontSize: 13,
          lineHeight: 1.5,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          color: 'var(--color-text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
```

#### 任务 T-1.2: ProgressBar — 进度条

文件：`src/l4-atom/ui/ProgressBar.tsx`（新建）

```typescript
import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'indeterminate';
}

export function ProgressBar({
  progress,
  label,
  size = 'md',
  variant = 'default',
}: ProgressBarProps) {
  const height = size === 'sm' ? 4 : 6;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div style={{ width: '100%' }}>
      {(label || variant === 'indeterminate') && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          {label && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-secondary)',
              }}
            >
              {label}
            </span>
          )}
          {variant === 'default' && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
              }}
            >
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height,
          borderRadius: height / 2,
          background: 'var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={
            variant === 'indeterminate'
              ? { x: ['-100%', '400%'] }
              : { width: `${clampedProgress}%` }
          }
          transition={
            variant === 'indeterminate'
              ? { repeat: Infinity, duration: 1.5, ease: 'linear' }
              : { type: 'spring', stiffness: 200, damping: 25 }
          }
          style={{
            height: '100%',
            borderRadius: height / 2,
            background: 'linear-gradient(90deg, #007AFF, #5856D6)',
            ...(variant === 'indeterminate' && { width: '25%' }),
          }}
        />
      </div>
    </div>
  );
}
```

#### 任务 T-1.3: 更新 UI 原子导出口

文件：`src/l4-atom/ui/index.ts`（修改）

```typescript
export { AppleButton } from './AppleButton';
export { Avatar } from './Avatar';
export { Badge } from './Badge';
export { CodeBlock } from './CodeBlock';       // 新增
export { GlassPanel } from './GlassPanel';
export { Input } from './Input';
export { ProgressBar } from './ProgressBar';   // 新增
export { SkeletonLoader } from './SkeletonLoader';
export { Spinner } from './Spinner';
export { SpringModal } from './SpringModal';
export { Typography } from './Typography';
```

---

### 阶段 3.2: L4 网络原子 — 语义 API 封装

> **目标**: 封装 chatlog_alpha 的全部语义 API 为纯网络原子，只负责请求/返回。

#### 任务 T-2.1: streamQA — SSE 流式问答

文件：`src/l4-atom/network/streamQA.ts`（新建）

```typescript
import { AI_BASE_URL, SSE_TIMEOUT_MS } from '@/utils/constants';
import type { QARequest, SSEChunk } from '@/l2-coordinator/api-docs/semantic';

type ChunkCallback = (chunk: SSEChunk) => void;
type ErrorCallback = (error: Error) => void;

export function streamQA(
  params: QARequest,
  onChunk: ChunkCallback,
  onError: ErrorCallback,
  signal?: AbortSignal
): void {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SSE_TIMEOUT_MS);

  const combinedSignal = signal
    ? combineSignals(signal, controller.signal)
    : controller.signal;

  fetch(`${AI_BASE_URL}/api/v1/semantic/qa/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: combinedSignal,
  })
    .then((response) => {
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`QA 流请求失败: HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';

      function processStream() {
        reader!.read().then(({ done, value }) => {
          if (done) {
            onChunk({ type: 'done' });
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // 保留最后一个不完整的行
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: SSEChunk = JSON.parse(line.slice(6));
                onChunk(data);
              } catch {
                // 非 JSON 行，跳过
              }
            }
          }

          processStream();
        }).catch((err) => {
          if (err.name !== 'AbortError') {
            onError(err instanceof Error ? err : new Error(String(err)));
          }
        });
      }

      processStream();
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    });
}

function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason));
  }
  return controller.signal;
}
```

#### 任务 T-2.2: fetchSemanticQA — 非流式 QA（兜底）

文件：`src/l4-atom/network/fetchSemanticQA.ts`（新建）

```typescript
import { AI_BASE_URL } from '@/utils/constants';
import type { QARequest, QAMessage } from '@/l2-coordinator/api-docs/semantic';

export async function fetchSemanticQA(params: QARequest): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${AI_BASE_URL}/api/v1/semantic/qa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`QA 请求失败: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.answer || data.content || JSON.stringify(data);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('QA 请求超时');
    }
    throw error;
  }
}
```

#### 任务 T-2.3: fetchSemanticSearch — 语义搜索

文件：`src/l4-atom/network/fetchSemanticSearch.ts`（新建）

```typescript
import { AI_BASE_URL, SEMANTIC_SEARCH_DEFAULT_LIMIT } from '@/utils/constants';
import type { SemanticSearchRequest, SemanticSearchResponse } from '@/l2-coordinator/api-docs/semantic';

export async function fetchSemanticSearch(
  params: SemanticSearchRequest
): Promise<SemanticSearchResponse> {
  const { query, limit = SEMANTIC_SEARCH_DEFAULT_LIMIT, chat, scope } = params;
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('limit', String(limit));
  if (chat) url.searchParams.set('chat', chat);
  if (scope) url.searchParams.set('scope', scope);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`语义搜索失败: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('语义搜索超时');
    }
    throw error;
  }
}
```

#### 任务 T-2.4: fetchSemanticTopics — 话题提取

文件：`src/l4-atom/network/fetchSemanticTopics.ts`（新建）

```typescript
import { AI_BASE_URL } from '@/utils/constants';
import type { TopicsResponse } from '@/l2-coordinator/api-docs/semantic';

export async function fetchSemanticTopics(
  chat: string
): Promise<TopicsResponse> {
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/topics`);
  url.searchParams.set('chat', chat);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`话题提取失败: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('话题提取超时');
    }
    throw error;
  }
}
```

#### 任务 T-2.5: fetchSemanticProfiles — 联系人画像

文件：`src/l4-atom/network/fetchSemanticProfiles.ts`（新建）

```typescript
import { AI_BASE_URL } from '@/utils/constants';
import type { ContactProfileData } from '@/l2-coordinator/api-docs/semantic';

export async function fetchSemanticProfiles(
  chat: string
): Promise<ContactProfileData> {
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/profiles`);
  url.searchParams.set('chat', chat);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`联系人画像获取失败: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('联系人画像获取超时');
    }
    throw error;
  }
}
```

#### 任务 T-2.6: 语义配置 CRUD + 连接测试

文件：`src/l4-atom/network/fetchSemanticConfig.ts`（新建）

```typescript
import { AI_BASE_URL } from '@/utils/constants';
import type { SemanticConfig, SemanticConfigResponse } from '@/l2-coordinator/api-docs/semantic';

export async function fetchSemanticConfig(): Promise<SemanticConfig | null> {
  const response = await fetch(`${AI_BASE_URL}/api/v1/semantic/config`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`获取语义配置失败: HTTP ${response.status}`);
  }

  const data: SemanticConfigResponse = await response.json();
  return data.config || null;
}

export async function setSemanticConfig(
  config: SemanticConfig
): Promise<void> {
  const response = await fetch(`${AI_BASE_URL}/api/v1/semantic/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error(`保存语义配置失败: HTTP ${response.status}`);
  }
}
```

文件：`src/l4-atom/network/testLLMConnection.ts`（新建）

```typescript
import { AI_BASE_URL } from '@/utils/constants';
import type { ConnectionTestResult } from '@/l2-coordinator/api-docs/semantic';

export async function testLLMConnection(
  provider: string,
  config: Record<string, string>
): Promise<ConnectionTestResult> {
  const startTime = Date.now();

  const response = await fetch(`${AI_BASE_URL}/api/v1/semantic/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, ...config }),
  });

  const data = await response.json();
  const latencyMs = Date.now() - startTime;

  return {
    success: response.ok && data.success !== false,
    message: data.message || (response.ok ? '连接成功' : '连接失败'),
    latencyMs,
  };
}
```

#### 任务 T-2.7: 索引状态 + 管理

文件：`src/l4-atom/network/fetchIndexStatus.ts`（新建）

```typescript
import { AI_BASE_URL } from '@/utils/constants';
import type { IndexStatusResponse } from '@/l2-coordinator/api-docs/semantic';

export async function fetchIndexStatus(): Promise<IndexStatusResponse> {
  const response = await fetch(`${AI_BASE_URL}/api/v1/semantic/index/status`);

  if (!response.ok) {
    throw new Error(`获取索引状态失败: HTTP ${response.status}`);
  }

  return await response.json();
}
```

文件：`src/l4-atom/network/manageIndex.ts`（新建）

```typescript
import { AI_BASE_URL } from '@/utils/constants';

type IndexAction = 'rebuild' | 'pause' | 'resume' | 'clear';

export async function manageIndex(action: IndexAction): Promise<void> {
  const endpoints: Record<IndexAction, string> = {
    rebuild: `${AI_BASE_URL}/api/v1/semantic/index/rebuild`,
    pause: `${AI_BASE_URL}/api/v1/semantic/index/pause`,
    resume: `${AI_BASE_URL}/api/v1/semantic/index/resume`,
    clear: `${AI_BASE_URL}/api/v1/semantic/index/clear`,
  };

  const response = await fetch(endpoints[action], { method: 'POST' });

  if (!response.ok) {
    throw new Error(`索引操作 (${action}) 失败: HTTP ${response.status}`);
  }
}
```

#### 任务 T-2.8: 更新网络原子导出口

文件：`src/l4-atom/network/index.ts`（修改）

```typescript
export { fetchDbStatus } from './fetchDbStatus';
export { fetchDbReady } from './fetchDbReady';
export { fetchContacts, fetchChatRooms } from './fetchContacts';
export { fetchHistory } from './fetchHistory';
export { fetchSearch } from './fetchSearch';
export { fetchStats, fetchDashboardTrend } from './fetchStats';
// Sprint 3 新增
export { streamQA } from './streamQA';
export { fetchSemanticQA } from './fetchSemanticQA';
export { fetchSemanticSearch } from './fetchSemanticSearch';
export { fetchSemanticTopics } from './fetchSemanticTopics';
export { fetchSemanticProfiles } from './fetchSemanticProfiles';
export { fetchSemanticConfig, setSemanticConfig } from './fetchSemanticConfig';
export { testLLMConnection } from './testLLMConnection';
export { fetchIndexStatus } from './fetchIndexStatus';
export { manageIndex } from './manageIndex';
```

---

### 阶段 3.3: L2 外交官扩展

#### 任务 T-3.1: sseParser — SSE 流解析器

文件：`src/l2-coordinator/diplomat/sseParser.ts`（新建）

```typescript
import type { SSEChunk } from '@/l2-coordinator/api-docs/semantic';

export interface ParsedToken {
  type: 'token' | 'done' | 'error';
  content: string;
  error?: string;
}

/**
 * 将 raw SSE Chunk 解析为统一的 ParsedToken。
 * 处理 chatlog_alpha 后端实际返回的各种 SSE 格式变体。
 */
export function parseSSEChunk(chunk: SSEChunk): ParsedToken {
  if (chunk.type === 'done') {
    return { type: 'done', content: '' };
  }

  if (chunk.type === 'error') {
    return {
      type: 'error',
      content: '',
      error: chunk.error || 'AI 引擎返回错误',
    };
  }

  // token 类型：逐字返回
  if (chunk.type === 'token' && chunk.content) {
    return { type: 'token', content: chunk.content };
  }

  // 兜底：尝试从原始对象中提取内容
  const content =
    chunk.content ||
    (chunk as unknown as Record<string, string>).text ||
    (chunk as unknown as Record<string, string>).message ||
    '';

  if (content) {
    return { type: 'token', content };
  }

  return { type: 'token', content: '' };
}

/**
 * 将 tokens 缓冲并以完整词语输出。
 * 中日文字符逐字输出，英文/数字按词边界缓冲。
 */
export function createTokenBuffer(flushIntervalMs = 50) {
  let buffer = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  // 判断是否需要立即 flush（CJK 字符）
  function isCJK(char: string): boolean {
    const code = char.charCodeAt(0);
    return (
      (code >= 0x4E00 && code <= 0x9FFF) ||  // CJK
      (code >= 0x3400 && code <= 0x4DBF) ||  // CJK Extension A
      (code >= 0xF900 && code <= 0xFAFF) ||  // CJK Compatibility
      (code >= 0x3040 && code <= 0x309F) ||  // Hiragana
      (code >= 0x30A0 && code <= 0x30FF) ||  // Katakana
      (code >= 0xAC00 && code <= 0xD7AF)     // Hangul
    );
  }

  return {
    feed(token: string, onFlush: (text: string) => void): void {
      // CJK 字符立即 flush
      if (token.length === 1 && isCJK(token)) {
        if (buffer) {
          onFlush(buffer);
          buffer = '';
        }
        onFlush(token);
        return;
      }

      // 其他字符按词边界缓冲
      buffer += token;

      // 遇到空格或标点时 flush
      if (/[\s，。！？；：、\n]/.test(token)) {
        if (timer) clearTimeout(timer);
        onFlush(buffer);
        buffer = '';
        return;
      }

      // 定时 flush（防单词中间长时间无输出）
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (buffer) {
          onFlush(buffer);
          buffer = '';
        }
      }, flushIntervalMs);
    },
    flush(onFlush: (text: string) => void): void {
      if (timer) clearTimeout(timer);
      if (buffer) {
        onFlush(buffer);
        buffer = '';
      }
    },
  };
}
```

#### 任务 T-3.2: overloadInterceptor — 过载拦截器

文件：`src/l2-coordinator/diplomat/overloadInterceptor.ts`（新建）

```typescript
/**
 * 处理 chatlog_alpha 503 (引擎过载) 和 429 (限流) 响应。
 * 用于在 Diplomat 层拦截这些错误并翻译为友好提示。
 */

export interface OverloadInfo {
  overloaded: boolean;
  message: string;
  retryAfterMs: number;
}

export function checkOverload(status: number, body?: string): OverloadInfo {
  if (status === 503) {
    return {
      overloaded: true,
      message: 'AI 引擎处理繁忙，请稍后重试',
      retryAfterMs: 5000,
    };
  }

  if (status === 429) {
    // 尝试解析 Retry-After
    return {
      overloaded: true,
      message: '请求过于频繁，请稍后重试',
      retryAfterMs: 3000,
    };
  }

  return { overloaded: false, message: '', retryAfterMs: 0 };
}

/**
 * 包装异步操作，自动处理 503/429 过载响应，
 * 按指示等待后重试（最多 2 次）。
 */
export async function withOverloadRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 检查是否是 HTTP 错误
      if (error instanceof Error && error.message.includes('HTTP 503')) {
        if (i < maxRetries) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
      }

      if (error instanceof Error && error.message.includes('HTTP 429')) {
        if (i < maxRetries) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
      }

      throw error;
    }
  }

  throw lastError;
}
```

---

### 阶段 3.4: L2 状态管理 (AiStore)

#### 任务 T-4.1: useAiStore — AI 模块状态存储

文件：`src/l2-coordinator/data-clerk/stores/useAiStore.ts`（新建）

```typescript
import { create } from 'zustand';
import type { AiState, AiActions, AiPhase, SemanticConfig, IndexStatusResponse, QAMessage, TopicsResponse, ContactProfileData, SemanticSearchResponse } from '@/l2-coordinator/api-docs/semantic';
import { QA_MAX_HISTORY } from '@/utils/constants';

type AiStore = AiState & AiActions;

const initialState: AiState = {
  phase: 'idle',
  config: null,
  indexStatus: null,
  qaMessages: [],
  qaLoading: false,
  qaStreaming: false,
  searchQuery: '',
  searchResults: null,
  searchLoading: false,
  topics: null,
  topicsLoading: false,
  profile: null,
  profileLoading: false,
  error: null,
};

export const useAiStore = create<AiStore>((set) => ({
  ...initialState,

  setPhase: (phase: AiPhase) => set({ phase, error: phase === 'error' ? undefined : undefined }),

  setConfig: (config: SemanticConfig) => set({ config, phase: 'configured' }),

  setIndexStatus: (status: IndexStatusResponse) => set({ indexStatus: status }),

  // QA
  addQAMessage: (msg: QAMessage) =>
    set((state) => ({
      qaMessages: [...state.qaMessages.slice(-QA_MAX_HISTORY + 1), msg],
    })),

  appendQAToken: (msgId: string, token: string) =>
    set((state) => ({
      qaMessages: state.qaMessages.map((m) =>
        m.id === msgId ? { ...m, content: m.content + token } : m
      ),
    })),

  setQALoading: (loading: boolean) => set({ qaLoading: loading }),
  setQAStreaming: (streaming: boolean) => set({ qaStreaming: streaming }),

  clearQAMessages: () => set({ qaMessages: [] }),

  // Search
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSearchResults: (results: SemanticSearchResponse | null) =>
    set({ searchResults: results, searchLoading: false }),
  setSearchLoading: (loading: boolean) => set({ searchLoading: loading }),

  // Analysis
  setTopics: (topics: TopicsResponse | null) => set({ topics, topicsLoading: false }),
  setTopicsLoading: (loading: boolean) => set({ topicsLoading: loading }),
  setProfile: (profile: ContactProfileData | null) => set({ profile, profileLoading: false }),
  setProfileLoading: (loading: boolean) => set({ profileLoading: loading }),

  // Error
  setError: (error: string | null) => set({ error, phase: error ? 'error' : undefined }),

  reset: () => set(initialState),
}));
```

---

### 阶段 3.5: L2 总指挥官 (AiCommander)

#### 任务 T-5.1: useAiCommander — AI 模块总指挥官

文件：`src/l2-coordinator/commander/useAiCommander.ts`（新建）

```typescript
import { useCallback, useRef, useEffect } from 'react';
import { useAiStore } from '@/l2-coordinator/data-clerk/stores/useAiStore';
import { useChatCommander } from '@/l2-coordinator/commander/useChatCommander';
import { translateError } from '@/l2-coordinator/diplomat/errorTranslator';
import { parseSSEChunk, createTokenBuffer } from '@/l2-coordinator/diplomat/sseParser';
import { withOverloadRetry } from '@/l2-coordinator/diplomat/overloadInterceptor';
import { debounce } from '@/l2-coordinator/diplomat/debounce';
import {
  streamQA,
  fetchSemanticSearch,
  fetchSemanticTopics,
  fetchSemanticProfiles,
  fetchSemanticConfig,
  setSemanticConfig,
  testLLMConnection,
  fetchIndexStatus,
  manageIndex,
} from '@l4/network';
import {
  INDEX_POLL_INTERVAL_MS,
  INDEX_BUILD_TIMEOUT_MS,
  SEMANTIC_SEARCH_DEBOUNCE_MS,
} from '@/utils/constants';
import type { SemanticConfig, QARequest, SemanticSearchRequest, IndexAction } from '@/l2-coordinator/api-docs/semantic';

export function useAiCommander() {
  const store = useAiStore();
  const { selectedContact, selectedChatRoom } = useChatCommander();
  const sseAbortRef = useRef<AbortController | null>(null);
  const indexPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentChat = selectedContact?.userName || selectedChatRoom?.name;

  // ========== 初始化 ==========

  const initialize = useCallback(async () => {
    store.setPhase('checking_config');
    try {
      const config = await fetchSemanticConfig();
      if (!config) {
        store.setPhase('not_configured');
        return;
      }
      store.setConfig(config);
      store.setPhase('index_checking');
      const status = await fetchIndexStatus();
      store.setIndexStatus(status);
      if (status.status === 'ready') {
        store.setPhase('index_ready');
      } else if (status.status === 'building') {
        store.setPhase('index_building');
        startIndexPolling();
      } else {
        store.setPhase('index_not_built');
      }
    } catch (error) {
      store.setPhase('not_configured');
    }
  }, []);

  // ========== 配置 ==========

  const saveConfig = useCallback(async (config: SemanticConfig) => {
    try {
      await setSemanticConfig(config);
      store.setConfig(config);
      store.setPhase('index_not_built');
    } catch (error) {
      store.setError(translateError(String(error)));
    }
  }, []);

  const testConnection = useCallback(async (provider: string, cfg: Record<string, string>) => {
    try {
      return await testLLMConnection(provider, cfg);
    } catch (error) {
      return { success: false, message: String(error) };
    }
  }, []);

  // ========== 索引管理 ==========

  const startIndexPolling = useCallback(() => {
    if (indexPollRef.current) clearInterval(indexPollRef.current);
    const startTime = Date.now();

    indexPollRef.current = setInterval(async () => {
      try {
        const status = await fetchIndexStatus();
        store.setIndexStatus(status);

        if (status.status === 'ready') {
          clearInterval(indexPollRef.current!);
          store.setPhase('index_ready');
        } else if (status.status === 'error') {
          clearInterval(indexPollRef.current!);
          store.setPhase('index_error');
          store.setError(status.error || '索引构建失败');
        } else if (Date.now() - startTime > INDEX_BUILD_TIMEOUT_MS) {
          clearInterval(indexPollRef.current!);
          store.setError('索引构建超时，请检查系统资源后重试');
        }
      } catch {
        // 轮询失败不中断，继续尝试
      }
    }, INDEX_POLL_INTERVAL_MS);
  }, []);

  const doIndexAction = useCallback(async (action: IndexAction) => {
    try {
      await manageIndex(action);
      if (action === 'rebuild') {
        store.setPhase('index_building');
        startIndexPolling();
      } else if (action === 'clear') {
        store.setPhase('index_not_built');
        store.setIndexStatus({ status: 'idle', total: 0, completed: 0 });
      }
    } catch (error) {
      store.setError(translateError(String(error)));
    }
  }, [startIndexPolling]);

  useEffect(() => {
    return () => {
      if (indexPollRef.current) clearInterval(indexPollRef.current);
      if (sseAbortRef.current) sseAbortRef.current.abort();
    };
  }, []);

  // ========== QA ==========

  const askQuestion = useCallback((query: string, scope?: 'contact' | 'all') => {
    if (!query.trim()) return;

    // Abort 之前的流
    sseAbortRef.current?.abort();
    const abortController = new AbortController();
    sseAbortRef.current = abortController;

    // 添加用户消息
    const userMsgId = `user-${Date.now()}`;
    store.addQAMessage({
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    });

    // 添加 AI 消息占位
    const aiMsgId = `ai-${Date.now()}`;
    store.addQAMessage({
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    });

    store.setQAStreaming(true);

    const params: QARequest = {
      query,
      chat: scope === 'all' ? undefined : (currentChat || undefined),
      scope: scope || undefined,
    };

    const tokenBuffer = createTokenBuffer(50);

    streamQA(
      params,
      (chunk) => {
        const parsed = parseSSEChunk(chunk);
        if (parsed.type === 'token') {
          tokenBuffer.feed(parsed.content, (text) => {
            store.appendQAToken(aiMsgId, text);
          });
        } else if (parsed.type === 'done') {
          tokenBuffer.flush((text) => {
            if (text) store.appendQAToken(aiMsgId, text);
          });
          store.setQAStreaming(false);
          // 标记流式输出结束
          const msgs = useAiStore.getState().qaMessages;
          const finalMsgs = msgs.map((m) =>
            m.id === aiMsgId ? { ...m, isStreaming: false } : m
          );
          useAiStore.setState({ qaMessages: finalMsgs, qaStreaming: false });
        } else if (parsed.type === 'error') {
          tokenBuffer.flush((text) => {
            if (text) store.appendQAToken(aiMsgId, text);
          });
          store.setQAStreaming(false);
          store.setError(translateError(parsed.error || 'ESEMANTIC_SSE_ERROR'));
        }
      },
      (error) => {
        store.setQAStreaming(false);
        if (error.name !== 'AbortError') {
          store.setError(translateError(error.message || 'ESEMANTIC_SSE_ERROR'));
        }
      },
      abortController.signal
    );
  }, [currentChat, store]);

  // ========== 语义搜索 ==========

  const semanticSearch = useCallback(async (query: string, scope?: 'contact' | 'all') => {
    if (!query.trim()) {
      store.setSearchResults(null);
      return;
    }
    store.setSearchLoading(true);
    try {
      const params: SemanticSearchRequest = {
        query,
        chat: scope === 'all' ? undefined : (currentChat || undefined),
        scope,
      };
      const results = await withOverloadRetry(() => fetchSemanticSearch(params));
      store.setSearchResults(results);
    } catch (error) {
      store.setError(translateError(String(error)));
    }
  }, [currentChat, store]);

  // 防抖搜索
  const debouncedSearchRef = useRef<ReturnType<typeof debounce>>();
  useEffect(() => {
    debouncedSearchRef.current = debounce(semanticSearch, SEMANTIC_SEARCH_DEBOUNCE_MS);
    return () => { debouncedSearchRef.current?.cancel(); };
  }, [semanticSearch]);

  const debouncedSearch = useCallback((query: string, scope?: 'contact' | 'all') => {
    debouncedSearchRef.current?.(query, scope);
  }, []);

  // ========== 分析：话题 + 画像 ==========

  const loadAnalysis = useCallback(async () => {
    if (!currentChat) return;

    store.setTopicsLoading(true);
    store.setProfileLoading(true);

    try {
      const topics = await withOverloadRetry(() => fetchSemanticTopics(currentChat));
      store.setTopics(topics);
    } catch (error) {
      store.setTopicsLoading(false);
      store.setError(translateError(String(error)));
    }

    try {
      const profile = await withOverloadRetry(() => fetchSemanticProfiles(currentChat));
      store.setProfile(profile);
    } catch (error) {
      store.setProfileLoading(false);
      // 画像失败不阻塞
    }
  }, [currentChat, store]);

  // ========== 切换联系人时清理 ==========

  useEffect(() => {
    if (currentChat) {
      // 切换联系人时清理搜索和画像
      store.setSearchResults(null);
      store.setSearchQuery('');
      store.setTopics(null);
      store.setProfile(null);
    }
  }, [currentChat]);

  return {
    // State
    phase: store.phase,
    config: store.config,
    indexStatus: store.indexStatus,
    qaMessages: store.qaMessages,
    qaLoading: store.qaLoading,
    qaStreaming: store.qaStreaming,
    searchQuery: store.searchQuery,
    searchResults: store.searchResults,
    searchLoading: store.searchLoading,
    topics: store.topics,
    topicsLoading: store.topicsLoading,
    profile: store.profile,
    profileLoading: store.profileLoading,
    error: store.error,
    // Actions
    initialize,
    saveConfig,
    testConnection,
    doIndexAction,
    askQuestion,
    debouncedSearch,
    semanticSearch,
    loadAnalysis,
    clearError: () => store.setError(null),
    clearQAMessages: store.clearQAMessages,
    reset: store.reset,
  };
}
```

---

### 阶段 3.6: L3 分子层 — AI Panel 容器

#### 任务 T-6.1: AiPanel — AI 面板主容器

文件：`src/l3-molecule/semantic/AiPanel.tsx`（新建）

```typescript
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Typography } from '@l4/ui/Typography';
import { AppleButton } from '@l4/ui/AppleButton';
import { GlassPanel } from '@l4/ui/GlassPanel';
import { ProgressBar } from '@l4/ui/ProgressBar';
import { Spinner } from '@l4/ui/Spinner';
import { QAPanel } from './QAPanel';
import { SemanticSearch } from './SemanticSearch';
import { TopicView } from './TopicView';
import { ContactProfile } from './ContactProfile';
import { SetupWizard } from './SetupWizard';
import { useChatCommander } from '@l2/commander/useChatCommander';
import { useAiCommander } from '@l2/commander/useAiCommander';

type PanelMode = 'stats' | 'ai';
type AiTab = 'qa' | 'search' | 'analysis';

interface AiPanelProps {
  mode: PanelMode;
  onModeChange: (mode: PanelMode) => void;
}

export function AiPanel({ mode, onModeChange }: AiPanelProps) {
  const [activeTab, setActiveTab] = useState<AiTab>('qa');
  const [showWizard, setShowWizard] = useState(false);
  const ai = useAiCommander();
  const { selectedContact, selectedChatRoom } = useChatCommander();
  const currentChat = selectedContact?.userName || selectedChatRoom?.name;

  useEffect(() => {
    if (mode === 'ai') {
      ai.initialize();
    }
  }, [mode]);

  const tabs: { key: AiTab; label: string }[] = [
    { key: 'qa', label: '问答' },
    { key: 'search', label: '搜索' },
    { key: 'analysis', label: '分析' },
  ];

  const indexProgress =
    ai.indexStatus && ai.indexStatus.total > 0
      ? (ai.indexStatus.completed / ai.indexStatus.total) * 100
      : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶层切换：Stats | AI */}
      <div
        style={{
          display: 'flex',
          padding: '8px 12px',
          borderBottom: '1px solid var(--color-border)',
          gap: 4,
        }}
      >
        <AppleButton
          variant={mode === 'stats' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('stats')}
        >
          统计
        </AppleButton>
        <AppleButton
          variant={mode === 'ai' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('ai')}
        >
          AI
        </AppleButton>
        {mode === 'ai' && ai.phase !== 'not_configured' && (
          <div style={{ flex: 1 }} />
        )}
        {mode === 'ai' && ai.phase !== 'not_configured' && (
          <AppleButton
            variant="ghost"
            size="sm"
            onClick={() => setShowWizard(true)}
            style={{ padding: '0 6px' }}
          >
            ⚙
          </AppleButton>
        )}
      </div>

      {/* AI 子标签 */}
      {mode === 'ai' && ai.phase !== 'not_configured' && ai.phase !== 'configuring' && (
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 400,
                color:
                  activeTab === tab.key
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-tertiary)',
                borderBottom:
                  activeTab === tab.key
                    ? '2px solid #007AFF'
                    : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          {mode === 'ai' && (
            <motion.div
              key="ai-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ height: '100%' }}
            >
              {/* 未配置状态 */}
              {(ai.phase === 'idle' || ai.phase === 'checking_config') && (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Spinner size={24} label="正在检查 AI 配置..." />
                </div>
              )}

              {/* 未配置 — 引导配置 */}
              {ai.phase === 'not_configured' && (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Typography variant="h3" style={{ marginBottom: 8 }}>
                    AI 功能尚未配置
                  </Typography>
                  <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 20 }}>
                    配置 AI 服务后即可体验智能问答、语义搜索和联系人分析
                  </Typography>
                  <AppleButton variant="primary" onClick={() => setShowWizard(true)}>
                    开始配置
                  </AppleButton>
                </div>
              )}

              {/* 索引未构建 */}
              {ai.phase === 'index_not_built' && !currentChat && (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 12 }}>
                    选择左侧联系人后即可使用 AI 功能
                  </Typography>
                </div>
              )}

              {ai.phase === 'index_not_built' && currentChat && (
                <div style={{ padding: 24 }}>
                  <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 12 }}>
                    语义索引尚未构建，AI 功能需要索引后才能使用
                  </Typography>
                  <AppleButton variant="primary" size="sm" onClick={() => ai.doIndexAction('rebuild')}>
                    构建索引
                  </AppleButton>
                </div>
              )}

              {/* 索引构建中 */}
              {ai.phase === 'index_building' && (
                <div style={{ padding: 24 }}>
                  <ProgressBar
                    progress={indexProgress}
                    label="正在构建语义索引..."
                    variant={indexProgress === 0 ? 'indeterminate' : 'default'}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <AppleButton variant="secondary" size="sm" onClick={() => ai.doIndexAction('pause')}>
                      暂停
                    </AppleButton>
                  </div>
                </div>
              )}

              {/* 就绪 — 显示功能标签 */}
              {ai.phase === 'index_ready' && (
                <>
                  {activeTab === 'qa' && !!currentChat && <QAPanel />}
                  {activeTab === 'qa' && !currentChat && (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                      <Typography variant="body" color="var(--color-text-secondary)">
                        选择左侧联系人后即可开始 AI 问答
                      </Typography>
                    </div>
                  )}
                  {activeTab === 'search' && <SemanticSearch />}
                  {activeTab === 'analysis' && !!currentChat && (
                    <div style={{ padding: 12 }}>
                      <TopicView />
                      <ContactProfile />
                    </div>
                  )}
                  {activeTab === 'analysis' && !currentChat && (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                      <Typography variant="body" color="var(--color-text-secondary)">
                        选择左侧联系人后即可查看分析
                      </Typography>
                    </div>
                  )}
                </>
              )}

              {/* 错误状态 */}
              {ai.phase === 'error' && (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Typography variant="body" color="#FF3B30" style={{ marginBottom: 12 }}>
                    {ai.error || '发生未知错误'}
                  </Typography>
                  <AppleButton variant="secondary" size="sm" onClick={() => { ai.clearError(); ai.initialize(); }}>
                    重试
                  </AppleButton>
                </div>
              )}

              {/* 索引就绪 + 分析 Tab 显示索引状态 */}
              {ai.phase === 'index_ready' && activeTab === 'analysis' && (
                <div style={{ padding: '4px 12px', borderTop: '1px solid var(--color-border)', marginTop: 8 }}>
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    索引已就绪 · {ai.indexStatus?.completed?.toLocaleString() || 0} 条已索引
                  </Typography>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <AppleButton variant="ghost" size="sm" onClick={() => ai.doIndexAction('rebuild')}>
                      重建索引
                    </AppleButton>
                    <AppleButton variant="ghost" size="sm" onClick={() => ai.doIndexAction('clear')}>
                      清空索引
                    </AppleButton>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 配置向导弹窗 */}
      {showWizard && <SetupWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
}
```

---

### 阶段 3.7: L3 分子层 — QA 面板组件

#### 任务 T-7.1: QAMessage — 问答消息气泡

文件：`src/l3-molecule/semantic/QAMessage.tsx`（新建）

核心设计：
- 用户消息：蓝色气泡，右侧对齐
- AI 消息：灰色毛玻璃气泡，左侧对齐，支持 Markdown 渲染
- 流式输出中：光标闪烁动画
- Markdown 解析：粗体、斜体、列表、链接、行内代码、代码块

```typescript
import { motion } from 'framer-motion';
import { Typography } from '@l4/ui/Typography';
import { CodeBlock } from '@l4/ui/CodeBlock';
import type { QAMessage as QAMessageType } from '@/l2-coordinator/api-docs/semantic';

interface QAMessageProps {
  message: QAMessageType;
}

// 简化的 Markdown 渲染器（不引入第三方库）
function renderMarkdown(content: string): React.ReactNode[] {
  if (!content) return [];
  const nodes: React.ReactNode[] = [];

  // 按代码块分割
  const parts = content.split(/(```[\s\S]*?```)/g);
  let k = 0;

  for (const part of parts) {
    if (part.startsWith('```')) {
      const codeMatch = part.match(/```(\w+)?\n?([\s\S]*?)```/);
      if (codeMatch) {
        nodes.push(
          <CodeBlock
            key={k++}
            code={codeMatch[2].trim()}
            language={codeMatch[1] || undefined}
          />
        );
      }
    } else {
      // 行内渲染
      const lines = part.split('\n');
      for (const line of lines) {
        if (!line.trim()) {
          nodes.push(<div key={k++} style={{ height: 8 }} />);
          continue;
        }
        // 处理行内格式
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:13px">$1</code>');
        nodes.push(
          <div
            key={k++}
            style={{ lineHeight: 1.6, wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        );
      }
    }
  }
  return nodes;
}

export function QAMessage({ message }: QAMessageProps) {
  const isUser = message.role === 'user';
  const timeStr = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        padding: '6px 12px',
      }}
    >
      <div
        style={{
          maxWidth: '90%',
          padding: '10px 14px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser
            ? 'var(--color-bubble-self, #007AFF)'
            : 'var(--color-bubble-other, rgba(255,255,255,0.9))',
          color: isUser ? '#fff' : 'var(--color-text-primary)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {isUser ? (
          <Typography variant="body">{message.content}</Typography>
        ) : (
          <div>
            {renderMarkdown(message.content)}
            {message.isStreaming && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                style={{
                  display: 'inline-block',
                  width: 2,
                  height: 16,
                  background: 'var(--color-text-primary)',
                  marginLeft: 2,
                  verticalAlign: 'text-bottom',
                }}
              />
            )}
          </div>
        )}
      </div>
      <Typography variant="caption" color="var(--color-text-quaternary)" style={{ marginTop: 2, padding: '0 4px' }}>
        {timeStr}
      </Typography>
    </motion.div>
  );
}
```

#### 任务 T-7.2: QAInput — 问题输入区

文件：`src/l3-molecule/semantic/QAInput.tsx`（新建）

```typescript
import { useState } from 'react';
import { Input } from '@l4/ui/Input';
import { AppleButton } from '@l4/ui/AppleButton';

interface QAInputProps {
  onSend: (query: string, scope: 'contact' | 'all') => void;
  disabled: boolean;
  currentContact?: string;
}

export function QAInput({ onSend, disabled, currentContact }: QAInputProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'contact' | 'all'>('contact');

  const handleSend = () => {
    if (!query.trim() || disabled) return;
    onSend(query.trim(), scope);
    setQuery('');
  };

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input
          placeholder={
            scope === 'contact'
              ? `基于 ${currentContact || '当前联系人'} 提问...`
              : '基于全部聊天记录提问...'
          }
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
        />
        <AppleButton
          variant="primary"
          size="sm"
          onClick={handleSend}
          disabled={disabled || !query.trim()}
          style={{ flexShrink: 0 }}
        >
          发送
        </AppleButton>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
          <input
            type="radio"
            checked={scope === 'contact'}
            onChange={() => setScope('contact')}
            style={{ marginRight: 4 }}
          />
          当前联系人
        </label>
        <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
          <input
            type="radio"
            checked={scope === 'all'}
            onChange={() => setScope('all')}
            style={{ marginRight: 4 }}
          />
          全部联系人
        </label>
      </div>
    </div>
  );
}
```

#### 任务 T-7.3: QAPanel — 问答面板总成

文件：`src/l3-molecule/semantic/QAPanel.tsx`（新建）

```typescript
import { useRef, useEffect } from 'react';
import { QAMessage } from './QAMessage';
import { QAInput } from './QAInput';
import { Spinner } from '@l4/ui/Spinner';
import { useAiCommander } from '@l2/commander/useAiCommander';
import { useChatCommander } from '@l2/commander/useChatCommander';

export function QAPanel() {
  const { qaMessages, qaStreaming, askQuestion } = useAiCommander();
  const { selectedContact, selectedChatRoom } = useChatCommander();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentContact =
    selectedContact?.remark || selectedContact?.nickName || selectedChatRoom?.nickName || '';

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qaMessages]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 消息列表 */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 8 }}>
        {qaMessages.map((msg) => (
          <QAMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <QAInput
        onSend={askQuestion}
        disabled={qaStreaming}
        currentContact={currentContact}
      />
    </div>
  );
}
```

---

### 阶段 3.8: L3 分子层 — 语义搜索 + 分析面板

#### 任务 T-8.1: SemanticSearch — 语义搜索面板

文件：`src/l3-molecule/semantic/SemanticSearch.tsx`（新建）

```typescript
import { useState } from 'react';
import { Typography } from '@l4/ui/Typography';
import { Input } from '@l4/ui/Input';
import { Spinner } from '@l4/ui/Spinner';
import { useAiCommander } from '@l2/commander/useAiCommander';
import { useChatCommander } from '@l2/commander/useChatCommander';

export function SemanticSearch() {
  const { debouncedSearch, searchResults, searchLoading } = useAiCommander();
  const { selectAndLoad } = useChatCommander();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'contact' | 'all'>('contact');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    debouncedSearch(v, scope);
  };

  const exampleQueries = [
    '上个月和老板讨论了什么',
    '关于预算的会议记录',
    '谁提到了项目上线时间',
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12 }}>
        <Input
          placeholder="用自然语言搜索聊天记录..."
          value={query}
          onChange={handleChange}
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
            <input type="radio" checked={scope === 'contact'} onChange={() => setScope('contact')} style={{ marginRight: 4 }} />
            当前联系人
          </label>
          <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
            <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} style={{ marginRight: 4 }} />
            全部联系人
          </label>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 12px' }}>
        {searchLoading && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spinner size={20} />
          </div>
        )}

        {!query && !searchResults && (
          <div style={{ padding: 16 }}>
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginBottom: 8 }}>
              示例查询:
            </Typography>
            {exampleQueries.map((eq, i) => (
              <div
                key={i}
                onClick={() => { setQuery(eq); debouncedSearch(eq, scope); }}
                style={{
                  padding: '8px 12px',
                  marginBottom: 6,
                  borderRadius: 8,
                  background: 'rgba(0,122,255,0.06)',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#007AFF',
                }}
              >
                {eq}
              </div>
            ))}
          </div>
        )}

        {searchResults && (
          <div>
            <Typography variant="caption" color="var(--color-text-secondary)" style={{ marginBottom: 8 }}>
              找到 {searchResults.totalCount} 条结果
            </Typography>
            {searchResults.results.map((r, i) => (
              <div
                key={i}
                onClick={() => selectAndLoad(r.chat, r.sender, false)}
                style={{
                  padding: '8px 10px',
                  marginBottom: 6,
                  borderRadius: 8,
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Typography variant="caption" weight={600}>
                    {r.sender}
                  </Typography>
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    {r.time}
                  </Typography>
                </div>
                <Typography variant="caption" color="var(--color-text-secondary)" style={{ marginBottom: 4 }}>
                  {r.content.length > 100 ? r.content.slice(0, 100) + '...' : r.content}
                </Typography>
                {/* 相关度条 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      background: 'var(--color-border)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${r.relevanceScore}%`,
                        background: 'linear-gradient(90deg, #34C759, #007AFF)',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    {Math.round(r.relevanceScore)}%
                  </Typography>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 任务 T-8.2: TopicView — 话题分析视图

文件：`src/l3-molecule/semantic/TopicView.tsx`（新建）

```typescript
import { useEffect } from 'react';
import { GlassPanel } from '@l4/ui/GlassPanel';
import { Typography } from '@l4/ui/Typography';
import { SkeletonLoader } from '@l4/ui/SkeletonLoader';
import { Spinner } from '@l4/ui/Spinner';
import { useAiCommander } from '@l2/commander/useAiCommander';

export function TopicView() {
  const { topics, topicsLoading, loadAnalysis } = useAiCommander();

  useEffect(() => {
    loadAnalysis();
  }, []);

  if (topicsLoading) {
    return (
      <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
        <div style={{ padding: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            热门话题
          </Typography>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              <SkeletonLoader variant="rect" width="60%" height={14} />
              <SkeletonLoader variant="rect" width="40%" height={14} />
            </div>
          ))}
        </div>
      </GlassPanel>
    );
  }

  if (!topics || topics.topics.length === 0) {
    return (
      <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
        <div style={{ padding: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 8 }}>
            热门话题
          </Typography>
          <Typography variant="caption" color="var(--color-text-tertiary)">
            暂无话题数据，请确保索引已构建
          </Typography>
        </div>
      </GlassPanel>
    );
  }

  const maxCount = Math.max(...topics.topics.map((t) => t.count), 1);

  return (
    <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
      <div style={{ padding: 16 }}>
        <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
          热门话题
        </Typography>
        {topics.topics.map((topic, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <Typography variant="caption">
                {topic.topic}
              </Typography>
              <Typography variant="caption" color="var(--color-text-tertiary)">
                {topic.count} 条
              </Typography>
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: 'var(--color-border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(topic.count / maxCount) * 100}%`,
                  background: `hsl(${220 + i * 30}, 70%, 55%)`,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
```

#### 任务 T-8.3: ContactProfile — 联系人画像视图

文件：`src/l3-molecule/semantic/ContactProfile.tsx`（新建）

```typescript
import { useEffect } from 'react';
import { GlassPanel } from '@l4/ui/GlassPanel';
import { Typography } from '@l4/ui/Typography';
import { SkeletonLoader } from '@l4/ui/SkeletonLoader';
import { useAiCommander } from '@l2/commander/useAiCommander';

export function ContactProfile() {
  const { profile, profileLoading, loadAnalysis } = useAiCommander();

  useEffect(() => {
    loadAnalysis();
  }, []);

  if (profileLoading && !profile) {
    return (
      <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
        <div style={{ padding: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            联系人画像
          </Typography>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <SkeletonLoader variant="rect" width="30%" height={12} />
              <SkeletonLoader variant="rect" width="70%" height={14} style={{ marginTop: 4 }} />
            </div>
          ))}
        </div>
      </GlassPanel>
    );
  }

  if (!profile) return null;

  const fields = [
    { label: '角色', value: profile.role },
    { label: '活跃时段', value: profile.activeHours },
    { label: '沟通频率', value: profile.dailyFrequency ? `日均 ${profile.dailyFrequency} 条` : undefined },
    { label: '情绪倾向', value: profile.sentiment },
  ].filter((f) => f.value);

  return (
    <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
      <div style={{ padding: 16 }}>
        <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
          联系人画像
        </Typography>
        {fields.map((f, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginBottom: 1 }}>
              {f.label}
            </Typography>
            <Typography variant="body">
              {f.value}
            </Typography>
          </div>
        ))}
        {profile.mainTopics && profile.mainTopics.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginBottom: 4 }}>
              主要话题
            </Typography>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {profile.mainTopics.map((t, i) => (
                <span
                  key={i}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: 'rgba(0,122,255,0.1)',
                    fontSize: 12,
                    color: '#007AFF',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {profile.summary && (
          <div style={{ marginTop: 8 }}>
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginBottom: 2 }}>
              总结
            </Typography>
            <Typography variant="caption" color="var(--color-text-secondary)">
              {profile.summary}
            </Typography>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
```

---

### 阶段 3.9: L3 分子层 — 配置向导

#### 任务 T-9.1: SetupWizard — AI 配置引导向导

文件：`src/l3-molecule/semantic/SetupWizard.tsx`（新建）

核心设计：
- 3 步骤向导：选择提供商 → 填写配置 → 测试连接
- 使用 `SpringModal` 作为容器
- 每个步骤有独立的 Loading/Error/Success 状态
- Auto-detect Ollama：调用 `/api/v1/semantic/test` 检查 localhost:11434
- 完成后提示"是否立即构建索引？"

```typescript
import { useState } from 'react';
import { SpringModal } from '@l4/ui/SpringModal';
import { Typography } from '@l4/ui/Typography';
import { AppleButton } from '@l4/ui/AppleButton';
import { Input } from '@l4/ui/Input';
import { Spinner } from '@l4/ui/Spinner';
import { ProgressBar } from '@l4/ui/ProgressBar';
import { useAiCommander } from '@l2/commander/useAiCommander';
import type { LLMProvider, SemanticConfig, ConnectionTestResult } from '@/l2-coordinator/api-docs/semantic';

interface SetupWizardProps {
  onClose: () => void;
}

type WizardStep = 1 | 2 | 3;

export function SetupWizard({ onClose }: SetupWizardProps) {
  const ai = useAiCommander();
  const [step, setStep] = useState<WizardStep>(1);
  const [provider, setProvider] = useState<LLMProvider>('ollama');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [buildingIndex, setBuildingIndex] = useState(false);

  // Config fields
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const buildConfig = (): SemanticConfig => {
    if (provider === 'ollama') {
      return { provider: 'ollama', ollamaBaseUrl: ollamaUrl };
    } else if (provider === 'glm') {
      return { provider: 'glm', glmApiKey: apiKey, glmBaseUrl: baseUrl || undefined };
    } else {
      return { provider: 'deepseek', deepseekApiKey: apiKey };
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const cfg = buildConfig();
    const result = await ai.testConnection(provider, {
      ...(provider === 'ollama' ? { base_url: cfg.ollamaBaseUrl || '' } : { api_key: apiKey }),
    });
    setTestResult(result);
    setTesting(false);
  };

  const handleSaveAndBuild = async () => {
    setBuildingIndex(true);
    await ai.saveConfig(buildConfig());
    await ai.doIndexAction('rebuild');
    setBuildingIndex(false);
    onClose();
  };

  const handleSaveOnly = async () => {
    await ai.saveConfig(buildConfig());
    onClose();
  };

  const indexProgress =
    ai.indexStatus && ai.indexStatus.total > 0
      ? (ai.indexStatus.completed / ai.indexStatus.total) * 100
      : 0;

  return (
    <SpringModal onClose={onClose}>
      <div style={{ width: 480, maxWidth: '90vw' }}>
        {/* 步骤条 */}
        <Typography variant="h3" style={{ marginBottom: 8 }}>
          配置 AI 功能
        </Typography>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {([1, 2, 3] as WizardStep[]).map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: s <= step ? '#007AFF' : 'var(--color-border)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Step 1: 选择提供商 */}
        {step === 1 && (
          <div>
            <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 16 }}>
              选择 AI 服务提供商
            </Typography>
            {[
              {
                key: 'ollama' as LLMProvider,
                name: 'Ollama (本地)',
                desc: '完全本地运行，无需网络，隐私安全',
                note: '需要自行安装 Ollama',
              },
              {
                key: 'glm' as LLMProvider,
                name: 'GLM (智谱AI)',
                desc: '云端服务，需 API Key，效果优秀',
                note: '需要填写 API Key',
              },
              {
                key: 'deepseek' as LLMProvider,
                name: 'DeepSeek',
                desc: '云端服务，性价比高',
                note: '需要填写 API Key',
              },
            ].map((opt) => (
              <div
                key={opt.key}
                onClick={() => setProvider(opt.key)}
                style={{
                  padding: '12px 16px',
                  marginBottom: 8,
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: provider === opt.key ? '2px solid #007AFF' : '1px solid var(--color-border)',
                  background: provider === opt.key ? 'rgba(0,122,255,0.06)' : 'transparent',
                }}
              >
                <Typography variant="body" weight={600}>
                  {opt.name}
                </Typography>
                <Typography variant="caption" color="var(--color-text-tertiary)">
                  {opt.desc}
                </Typography>
                <Typography variant="caption" color="var(--color-text-quaternary)">
                  {opt.note}
                </Typography>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
              <AppleButton variant="ghost" onClick={onClose}>
                取消
              </AppleButton>
              <AppleButton variant="primary" onClick={() => setStep(2)}>
                下一步
              </AppleButton>
            </div>
          </div>
        )}

        {/* Step 2: 填写配置 */}
        {step === 2 && (
          <div>
            <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 16 }}>
              填写连接配置
            </Typography>
            {provider === 'ollama' && (
              <div style={{ marginBottom: 12 }}>
                <Typography variant="caption" style={{ marginBottom: 4 }}>
                  Ollama 服务地址
                </Typography>
                <Input
                  value={ollamaUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>
            )}
            {(provider === 'glm' || provider === 'deepseek') && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <Typography variant="caption" style={{ marginBottom: 4 }}>
                    API Key
                  </Typography>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                    placeholder="输入 API Key"
                  />
                </div>
                {provider === 'glm' && (
                  <div style={{ marginBottom: 12 }}>
                    <Typography variant="caption" style={{ marginBottom: 4 }}>
                      Base URL (可选)
                    </Typography>
                    <Input
                      value={baseUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseUrl(e.target.value)}
                      placeholder="https://open.bigmodel.cn/api/paas/v4"
                    />
                  </div>
                )}
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <AppleButton variant="ghost" onClick={() => setStep(1)}>
                上一步
              </AppleButton>
              <div style={{ display: 'flex', gap: 8 }}>
                <AppleButton variant="secondary" onClick={handleTest} disabled={testing}>
                  {testing ? <Spinner size={14} /> : '测试连接'}
                </AppleButton>
                <AppleButton variant="primary" onClick={() => { handleTest(); setStep(3); }} disabled={testing}>
                  下一步
                </AppleButton>
              </div>
            </div>
            {testResult && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: testResult.success ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.1)',
                }}
              >
                <Typography variant="caption" color={testResult.success ? '#34C759' : '#FF3B30'}>
                  {testResult.success ? '✓ ' : '✗ '}
                  {testResult.message}
                  {testResult.latencyMs ? ` (${testResult.latencyMs}ms)` : ''}
                </Typography>
              </div>
            )}
          </div>
        )}

        {/* Step 3: 确认 & 构建索引 */}
        {step === 3 && (
          <div>
            <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 16 }}>
              配置已完成，是否立即构建语义索引？
            </Typography>
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginBottom: 16 }}>
              索引构建可能需要几分钟时间，构建期间将无法使用 AI 问答和搜索功能。
            </Typography>

            {buildingIndex && (
              <div style={{ marginBottom: 16 }}>
                <ProgressBar
                  progress={indexProgress}
                  label="正在构建索引..."
                  variant={indexProgress === 0 ? 'indeterminate' : 'default'}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <AppleButton variant="ghost" onClick={onClose}>
                稍后再说
              </AppleButton>
              <AppleButton variant="secondary" onClick={handleSaveOnly}>
                仅保存配置
              </AppleButton>
              <AppleButton variant="primary" onClick={handleSaveAndBuild} disabled={buildingIndex}>
                保存并构建索引
              </AppleButton>
            </div>
          </div>
        )}
      </div>
    </SpringModal>
  );
}
```

---

### 阶段 3.10: L1 入口层修改

#### 任务 T-10.1: DashboardView — 集成 AI Panel 切换

文件：`src/l1-entry/pages/DashboardView.tsx`（修改）

核心变更：将现有的 `showStats` boolean 切换改为 `PanelMode: 'stats' | 'ai'` 双模式。右侧面板占位区由 `AiPanel` 组件替换统计组件的条件渲染。

具体修改：
1. 删除 `useState(true)` 的 `showStats` → 改为 `useState<'stats'|'ai'>('stats')` 的 `rightPanelMode`
2. 右侧面板区域（原 99-126 行）替换为：
   - 当 `rightPanelMode === 'stats'` 时：渲染原有的 `DashboardOverview` + `TrendChart` + `TopContactCard`（保持原有隐藏按钮）
   - 当 `rightPanelMode === 'ai'` 时：渲染 `<AiPanel mode="ai" onModeChange={setRightPanelMode} />`
3. 隐藏/显示统计的按钮改为 `AiPanel` 内部管理

#### 任务 T-10.2: StatusBar — 增加 AI 状态指示

文件：`src/l3-molecule/common/StatusBar.tsx`（修改）

在 StatusBar 中增加可选的 AI 索引状态显示：
- 当 `indexStatus.status === 'building'` 时显示 "索引构建中 {progress}%"
- 当 `indexStatus.status === 'ready'` 时显示 "AI 就绪"

---

### 阶段 3.11: 全局样式增强

#### 任务 T-11.1: 增加 AI 相关 CSS 变量

文件：`src/styles/globals.css`（修改）

```css
:root {
  /* ... existing variables ... */

  /* Sprint 3: AI 语义分析新增 */
  --color-code-bg: #1e1e2e;
  --color-link: #007AFF;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-code-bg: #16162a;
    --color-link: #0A84FF;
  }
}
```

---

## 六、Sprint 3 依赖关系图

```
T-0.x (API 类型 + 常量 + 错误码)
    │
    ├──→ T-1.x (L4 UI 原子: CodeBlock, ProgressBar)
    │
    ├──→ T-2.x (L4 网络原子: 10 个语义 API)
    │
    └──→ T-3.x (L2 外交官: sseParser, overloadInterceptor)
              │
              └──→ T-4.x (L2 AiStore 状态管理)
                        │
                        └──→ T-5.x (L2 AiCommander 总指挥官)
                                  │
                                  ├──→ T-6.x (L3 AiPanel 容器)
                                  ├──→ T-7.x (L3 QA 面板组件)
                                  ├──→ T-8.x (L3 搜索+分析面板)
                                  └──→ T-9.x (L3 配置向导)
                                            │
                                            └──→ T-10.x (L1 DashboardView + StatusBar 修改)
                                                      │
                                                      └──→ T-11.x (全局样式增强)
```

**并行建议：**
- T-1.x（UI 原子）、T-2.x（网络原子）和 T-3.x（外交官）可完全并行开发
- T-4.x 依赖 T-0.x 类型定义完成
- T-5.x 依赖 T-2.x + T-3.x + T-4.x 全部完成
- T-6.x ~ T-9.x（L3 分子组件）依赖 T-5.x，但四个模块之间可以并行
- T-10.x 依赖 T-6.x

---

## 七、Sprint 3 执行顺序建议

```
第 1 周:
  Day 1:    T-0.x（API 类型定义 + 常量 + 错误码）
  Day 1-2:  T-1.x（CodeBlock + ProgressBar）+ T-3.x（sseParser + overloadInterceptor）
  Day 2-3:  T-2.x（10 个网络原子全部实现）
  Day 3-4:  T-4.x（AiStore）→ T-5.x（AiCommander）
  Day 4-5:  T-6.x（AiPanel 容器，含全部状态分支）

第 2 周:
  Day 6-7:  T-7.x（QA 面板: QAMessage + QAInput + QAPanel）
  Day 7-8:  T-8.x（SemanticSearch + TopicView + ContactProfile）
  Day 8:    T-9.x（SetupWizard 配置向导）
  Day 9:    T-10.x（DashboardView + StatusBar 修改）
  Day 10:   T-11.x（全局样式）+ 集成联调
  Day 11-12: 全链路测试 + 手动验证 + Bug 修复
```

---

## 八、验收清单

| # | 验收项 | 验收方法 |
|---|--------|---------|
| 1 | `pnpm typecheck` 零错误 | 运行 `pnpm typecheck` |
| 2 | `pnpm lint` 零警告 | 运行 `pnpm lint` |
| 3 | `pnpm build` 成功 | 运行 `pnpm build` |
| 4 | AI 面板在 DashboardView 右侧正确渲染，Stats/AI 切换正常 | 肉眼观察 |
| 5 | 未配置 AI 时显示引导按钮，点击弹出 SetupWizard | 首次启动观察 |
| 6 | SetupWizard 3 步向导完整走通（选提供商 → 填配置 → 测试连接） | 逐步操作 |
| 7 | Ollama 自动检测功能正常（如本地已安装） | 点击 Ollama 选项观察 |
| 8 | 连接测试成功/失败均有明确 UI 反馈 | 输入错误 API Key 测试 |
| 9 | 配置保存后提示构建索引，ProgressBar 实时更新 | 观察构建进度 |
| 10 | QA 流式问答：输入问题 → AI 逐字输出 → 打字机动画流畅 | 输入问题观察 |
| 11 | QA 历史消息保留，切换联系人不清除 QA 历史 | 切换联系人后观察 |
| 12 | QA 上下文范围切换正常（当前联系人/全部联系人） | 切换 radio 按钮测试 |
| 13 | 语义搜索 800ms 防抖正常 | 快速输入观察 |
| 14 | 搜索结果显示相关度评分条，点击可跳转到对应聊天 | 搜索并点击结果 |
| 15 | 话题分析正确展示话题条和百分比 | 切换到分析标签页观察 |
| 16 | 联系人画像字段正确渲染（角色/活跃/频率/情绪/话题标签） | 观察画像卡片 |
| 17 | 索引管理按钮（重建/清空/暂停）功能正常 | 点击按钮并观察状态变化 |
| 18 | AI 错误状态有友好中文提示（配置未完成/索引未构建/超时等） | 模拟各种错误场景 |
| 19 | L4 原子间无相互 import | code review |
| 20 | L3 分子间无相互 import | code review |
| 21 | L1 页面不含 AI 业务逻辑 | code review |
| 22 | Markdown 代码块正确渲染（暗色背景 + 复制按钮） | AI 问答中触发代码输出 |
| 23 | 切换联系人时当前 SSE 流自动 abort | 快速切换联系人测试 |
| 24 | Dark mode 下所有新组件视觉效果正确 | 切换到暗色主题观察 |

---

## 九、风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| chatlog_alpha 语义 API 实际响应结构与预期不同 | 功能不可用 | T-0.1 类型定义是占位，实际响应以真实 API 测试为准，sseParser 需适配多种格式 |
| Ollama 未安装导致本地模型不可用 | 用户体验差 | SetupWizard 提供云端备选（GLM/DeepSeek），并给出 Ollama 安装引导 |
| 索引构建耗时过长（大数据库） | 用户焦虑 | ProgressBar 实时反馈进度，支持暂停/恢复，超时提示 |
| SSE 流在某些网络环境下不稳定 | 回答中断 | 非流式 QA (fetchSemanticQA) 作为兜底方案，自动重试 3 次 |
| 向量索引消耗大量磁盘空间 | 磁盘满 | 显示索引状态（已索引条数），提供清空索引按钮 |
| Markdown 渲染 XSS 风险 | 安全 | 使用 `dangerouslySetInnerHTML` 前对用户输入做 HTML 实体转义 |

---

> **下一步**: 待用户审阅并确认本 Sprint 3 详细规划后，即可进入执行阶段。

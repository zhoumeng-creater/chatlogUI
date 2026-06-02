# P4/P5-0 能力矩阵、诊断/隐私基座、E2E Fixture 基础实施计划

> For agentic workers: REQUIRED SKILL: Use `executing-plans` to execute this plan step-by-step.

## 目标

在不改变 `chatlog_alpha` 后端契约、不引入真实聊天数据、不扩展完整 P4 功能 UI 的前提下，为后续 P4 高级能力和 P5 质量门建立三类基础资产：

1. 能力矩阵：把原始 `chatlog_alpha` Web/API 能力逐项登记为桌面端产品能力、隐私等级、诊断需求、测试策略和交付批次。
2. 诊断/隐私基座：建立可复用的本地诊断事件模型、红线、脱敏规则和导出约束，让后续媒体、SNS、DB、Hook、MCP、API Runner 功能都先接入同一套安全诊断通道。
3. E2E fixture 基础：建立无真实微信数据、可被 CI/本地复用的 synthetic fixture 策略和 mock 后端基础，让后续浏览器 E2E、视觉回归、契约测试有可重复输入。

本阶段是 P4/P5 的第 0 步，只交付“基础和规则”，不实现媒体/SNS/DB/Hook/MCP 的完整用户功能。

## 当前基线

### 已完成

- P2-E Windows x64 packaged smoke gate 已通过，证据在 `specs/001-ready-desktop-app/release-evidence.md` 和 `specs/001-ready-desktop-app/p2-e-visual-qa-matrix.md`。
- `pnpm verify`、`src-tauri cargo test`、`pnpm tauri build` 在 P2-E 证据中已有通过记录。
- packaged sidecar 启动、退出清理、未知 5030 端口冲突、诊断导出、MSI/NSIS 产物均有人工烟测记录。
- `src-tauri` 侧已有诊断导出命令和基础脱敏测试。
- 前端已有 `DiagnosticsPanel`、`useDiagnosticsCommander`、`useDevConsoleCommander`、`maskSecrets` 和基础 diagnostics 单测。

### 当前缺口

- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md` 是宽口径总计划，但 P4/P5-0 需要一份更窄、更可执行的计划。
- `specs/002-advanced-capabilities/` 尚不存在。
- `specs/001-ready-desktop-app/tasks.md` 的 T002 期望 `specs/001-ready-desktop-app/test-data-policy.md`，但文件当前缺失。
- `src/l4-atom/network/index.ts` 当前只导出 core、semantic、graph、update 相关能力，没有 media、SNS、DB explorer、hook、MCP、API runner。
- `src/l4-atom/network/httpClient.ts` 只处理 `format=json`、timeout、HTTP body/status 保留，不发出本地诊断事件。
- `src/l2-coordinator/data-clerk/stores/useDevConsoleStore.ts` 当前只保留 sidecar 日志，没有 HTTP/UI/Tauri/update/release 来源统一模型。
- `src/l3-molecule/common/DevConsole.tsx` 当前直接使用 commander，并且没有来源、等级、请求、隐私状态过滤。
- 仓库没有 `e2e/`、没有持久 Playwright E2E suite、`package.json` 没有 `pnpm e2e`。
- `src-tauri/tauri.conf.json` 当前允许 `img-src ... http://127.0.0.1:5030`，但没有 `media-src`。P4 媒体能力后续需要单独安全评审，P4/P5-0 不直接放宽 CSP。

### 关键约束

- 后端 sidecar 契约保持为 `chatlog_alpha serve --http-addr 127.0.0.1:5030`。
- 所有后端通信仍必须按 L4 network/system atom -> L2 Diplomat/Commander -> state/UI 流动。
- L1 只做布局和事件转发。
- L3 molecule 不直接访问 L4 network atom，不直接执行网络请求。
- L4 atom 不能导入 L2/L3/L1，不持久化业务状态。
- 不记录 raw `dataKey`、API key、token、secret、private message、真实本地路径、真实联系人/群名/微信 ID。
- 所有 fixtures 必须 synthetic、可公开提交、不能从真实用户数据裁剪。
- 诊断包只能由用户显式导出，不能自动上传或自动收集。

## 架构原则

### 能力矩阵先于功能 UI

P4 功能很多，不能直接散点实现。每个能力必须先在矩阵里登记：

- 后端 endpoint 或命令入口
- 用户可见目标
- 数据敏感等级
- UI 入口批次
- L4 atom 拆分
- L2 orchestration 责任
- L3 展示组件边界
- 诊断事件需求
- fixture/mock 策略
- E2E/contract 测试策略
- 发布或 CSP 风险

矩阵是后续 P4-A 到 P4-E 的入口清单，不是一次性 UI 规格。

### 诊断事件是本地、脱敏、有限保留的产品能力

诊断事件用于帮助用户和开发者理解本地桌面应用状态，不是 telemetry。

- 默认本地内存保留。
- 导出必须用户显式触发。
- 所有 payload 必须在进入 store 或导出前可脱敏。
- HTTP 事件记录 endpoint family、method、status、duration、error category，不记录 query 原文、request body、response body。
- 对高风险字段使用 fail-closed：无法确认安全时不导出原值。

### E2E fixture 不模拟真实私人聊天

P5 需要自动化质量门，但不能依赖真实微信数据。

- fixture 只覆盖状态、数量、错误类别、synthetic 文案和 synthetic ID。
- fixture 可以包含刻意构造的 synthetic secret marker，用来验证脱敏，但必须标明是测试字符串。
- 测试不需要证明真实数据内容展示正确，只证明 UI 状态、请求路径、错误恢复、隐私遮罩、诊断导出和发布门行为正确。

## 范围

### In Scope

- 编写 P4/P5-0 专项规格和计划落点。
- 创建高级能力目录和能力矩阵文档。
- 补齐 ready-desktop-app 的测试数据政策缺口，或建立指向高级能力 fixture policy 的明确桥接。
- 设计并实现本地诊断事件基础模型。
- 让 `requestJson` 可选地发出脱敏 HTTP 诊断事件。
- 建立 L2 诊断事件 store/view model，并把 Dev Console 和 Diagnostics export 接上统一事件摘要。
- 建立 synthetic E2E fixture 目录和 mock 后端策略。
- 增加针对诊断事件、脱敏、fixture policy 的单测和文档验证。

### Out Of Scope

- 不实现媒体播放/下载 UI。
- 不实现 SNS feed UI。
- 不实现 DB explorer/API runner 的完整交互。
- 不实现 hook/MCP 控制台。
- 不修改 `chatlog_alpha` 后端行为。
- 不添加真实聊天 fixture。
- 不自动上传诊断。
- 不在本阶段放宽 Tauri CSP 或 capabilities。
- 不在本阶段要求跨平台安装包全量发布。

## 计划文件和代码落点

### 新增文档

- `specs/002-advanced-capabilities/README.md`
- `specs/002-advanced-capabilities/capability-matrix.md`
- `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`
- `specs/002-advanced-capabilities/test-data-policy.md`
- `specs/002-advanced-capabilities/e2e-matrix.md`
- `specs/002-advanced-capabilities/e2e-fixture-plan.md`
- `specs/001-ready-desktop-app/test-data-policy.md`

`specs/001-ready-desktop-app/test-data-policy.md` 用于补齐 T002 的 ready-desktop-app 缺口。它应保持短文档，说明 ready-desktop-app 和 advanced-capabilities 共用 synthetic fixture 原则，并指向 `specs/002-advanced-capabilities/test-data-policy.md` 作为后续扩展版本。

### 新增或修改前端基础代码

- `src/l4-atom/network/diagnosticEvents.ts`
- `src/l4-atom/network/diagnosticEvents.test.ts`
- `src/l4-atom/network/httpClient.ts`
- `src/l4-atom/network/httpClient.test.ts`
- `src/l4-atom/network/index.ts`
- `src/l2-coordinator/data-clerk/stores/useDiagnosticEventStore.ts`
- `src/l2-coordinator/data-clerk/stores/index.ts`
- `src/l2-coordinator/commander/diagnosticEventViewModel.ts`
- `src/l2-coordinator/commander/diagnosticEventViewModel.test.ts`
- `src/l2-coordinator/commander/useDevConsoleCommander.ts`
- `src/l2-coordinator/commander/useDiagnosticsCommander.ts`
- `src/l2-coordinator/commander/diagnostics.ts`
- `src/l2-coordinator/commander/diagnostics.test.ts`
- `src/l3-molecule/common/DevConsole.tsx`

`src/l3-molecule/common/DevConsole.tsx` 是当前真实路径。不要使用宽口径总计划里早期提到的 `src/l3-molecule/dev/DevConsole.tsx`。

### 新增 E2E 基础资产

- `e2e/README.md`
- `e2e/fixtures/core-ready.json`
- `e2e/fixtures/advanced-capabilities.json`
- `e2e/fixtures/diagnostics-redaction.json`
- `e2e/mock-chatlog-server/README.md`

如果实施时决定加入可运行 mock server，再新增：

- `e2e/mock-chatlog-server/server.mjs`
- `e2e/mock-chatlog-server/routes.mjs`
- `e2e/mock-chatlog-server/package-notes.md`

本阶段可以先建立 fixture 和 mock 约束，不强制引入 `@playwright/test`。如果实现时需要可运行 smoke，再单独评审依赖和 `package.json` 脚本。

## 能力矩阵草案

`capability-matrix.md` 至少包含这些分组：

| 分组 | 后端能力 | 初始桌面产品批次 | 隐私等级 | P4/P5-0 动作 |
| --- | --- | --- | --- | --- |
| Core query | sessions, history, search, stats, contacts, chatrooms | 已有/P4 polish | 高 | 登记现有覆盖和 fixture 策略 |
| Media | image, video, file, voice, data path, SNS media proxy | P4-B | 极高 | 只建矩阵、隐私规则、CSP 风险，不做 UI |
| Chat extensions | unread, members, new_messages, favorites | P4-B | 高 | 登记 L4 atom 和 E2E fixture |
| SNS | sns_notifications, sns_feed, sns_search, sns media proxy | P4-C | 极高 | 登记脱敏、fixture、诊断红线 |
| DB explorer | db status/search/tables/data/query/cache clear | P4-D | 极高 | 登记只读默认、query 风险和诊断红线 |
| API runner/wx-cli | http list/call style API discovery | P4-D | 高 | 登记安全默认和 no-secret logging |
| Hook/Hermes | hook config/status/events/stream, Hermes weixin/qq | P4-E | 高 | 登记 SSE cancellation 和 event redaction |
| MCP | /mcp, /sse, /message | P4-E | 高 | 登记 contract fixture 和 tool list privacy |
| Semantic residuals | index preview/pause/resume residuals | P4-E | 高 | 登记 current coverage gap |
| Graph residuals | ingest message/business/event, config, QA | P4-E | 高 | 登记 current coverage gap |
| Diagnostics | local logs, HTTP events, release smoke, updater | P4-A/P5 | 中到高 | 本阶段建基础 |
| Release quality | E2E, visual, contract fixtures, CI gates | P5 | 中 | 本阶段建 fixture 基础 |

矩阵每行需要有状态字段：

- `not-started`
- `documented`
- `foundation-ready`
- `implemented`
- `verified`
- `deferred`

P4/P5-0 完成时，大多数 P4 功能应停在 `documented`，诊断和 fixture 基础应达到 `foundation-ready`。

## 诊断事件模型

### L4 类型建议

`src/l4-atom/network/diagnosticEvents.ts` 应保持独立，不导入 L2/L3。

建议类型：

```ts
export type DiagnosticEventSource =
  | "http"
  | "sidecar"
  | "tauri"
  | "ui"
  | "updater"
  | "release";

export type DiagnosticEventLevel = "debug" | "info" | "warn" | "error";

export type DiagnosticEventPrivacy = "safe" | "redacted" | "blocked";

export interface DiagnosticEvent {
  id: string;
  timestamp: string;
  source: DiagnosticEventSource;
  level: DiagnosticEventLevel;
  privacy: DiagnosticEventPrivacy;
  category: string;
  summary: string;
  attributes?: Record<string, string | number | boolean | null>;
}
```

约束：

- `summary` 必须先经过 `maskDiagnosticText` 或等价安全函数。
- `attributes` 只能放有限白名单字段。
- HTTP URL 只允许保存 `endpointFamily`、`pathTemplate` 或 redacted path，不保存 query 原文。
- `id` 可用本地递增或注入式 id generator，测试必须可确定。

### HTTP 事件建议

`requestJson` 可接受可选配置：

```ts
type RequestJsonOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
  diagnostics?: {
    source?: "http";
    category?: string;
    endpointFamily?: string;
    method?: string;
  };
};
```

事件字段：

- 成功：`level=info`, `category=http.request`, `status`, `durationMs`, `endpointFamily`
- HTTP 错误：`level=warn`, `category=http.error`, `status`, `endpointFamily`, `errorKind=http-status`
- 超时/abort：`level=warn`, `category=http.timeout`, `endpointFamily`, `errorKind=timeout`
- network error：`level=error`, `category=http.network`, `endpointFamily`, `errorKind=network`

禁止字段：

- request body
- response body
- raw query
- `dataKey`
- media key
- API key/token
- private message content

### L2 Store 建议

`useDiagnosticEventStore` 负责有限保留和 view-friendly 查询，不负责脱敏核心规则。

建议能力：

- `items`
- `addEvent`
- `addEvents`
- `clear`
- `setFilters`
- `maxItems = 1000`
- selector 支持最近 N 条、按 source、level、privacy 筛选。

Dev Console 可继续承载 sidecar stdout/stderr，但应开始统一展示：

- sidecar log
- HTTP request summary
- Tauri command summary
- update check summary
- release smoke/import summary

## 隐私和诊断合同

`privacy-diagnostics-contract.md` 必须明确：

- 诊断包只由用户点击导出。
- 默认不包含真实消息内容。
- 默认不包含真实联系人、群名、微信 ID、文件路径。
- 不包含 raw request body、raw response body。
- 不包含 query 中的 key/url/path。
- 对媒体和 SNS proxy 只记录 endpoint family，不记录 `url` 和 `key`。
- 任何检测到敏感 marker 的值导出为 `[redacted]` 或整行 blocked。
- 如果 redaction 不能成功完成，导出失败，而不是导出半脱敏内容。

需要覆盖这些已有实现：

- 前端 `src/utils/maskSecrets.ts`
- 前端 `src/l2-coordinator/commander/diagnostics.ts`
- Rust `src-tauri/src/sidecar.rs` 的 diagnostic export redaction
- `specs/001-ready-desktop-app/contracts/diagnostics-package.md`

## Fixture 策略

### fixture 文件原则

所有 `e2e/fixtures/*.json` 必须：

- 使用 `synthetic: true`
- 使用固定 synthetic timestamp，不使用当前时间。
- 使用固定 synthetic IDs，例如 `session_synthetic_001`。
- 文案必须是明显 synthetic，例如 `Synthetic message for UI state only`。
- 不使用真实 `wxid_`，除非作为脱敏测试 marker，并且值应为 `wxid_synthetic_redaction_case`。
- 不使用真实 Windows 用户目录。
- 不使用真实图片、语音、视频、数据库路径。
- 包含 `fixturePurpose` 和 `privacyNotes`。

### 核心 fixture

`core-ready.json` 覆盖：

- `/health`
- `/api/v1/db`
- `/api/v1/sessions`
- `/api/v1/contacts`
- `/api/v1/chatrooms`
- `/api/v1/history`
- `/api/v1/search`
- `/api/v1/stats`

### 高级 fixture

`advanced-capabilities.json` 覆盖 endpoint shape，不覆盖真实内容：

- unread
- members
- new_messages
- favorites
- media synthetic metadata
- SNS feed/notifications/search synthetic rows
- DB tables/data/query synthetic rows
- hook events synthetic rows
- MCP tool list synthetic rows
- semantic index preview synthetic rows
- graph ingest/status synthetic rows

### 脱敏 fixture

`diagnostics-redaction.json` 覆盖：

- synthetic `dataKey`
- synthetic `apiKey`
- synthetic `Bearer` token
- synthetic Windows path
- synthetic WeChat Files path
- synthetic wxid marker
- synthetic private message string

这些值只能用于 redaction tests，不能出现在 UI 默认截图和 release evidence。

## 实施步骤

### Step 0: 建立实施分支和基线

当前工作区在 `codex/p2-d-ai-graph-containment` 上且包含大量未提交 P2/P4 相关改动。实施 P4/P5-0 时先确认是否继续沿用当前分支。

命令：

```powershell
git status --short --branch
```

验收：

- 不在 `master` 直接做非平凡实现。
- 不回滚当前未提交改动。
- 若用户决定新建 worktree，必须先确认要迁移哪些当前文档上下文。

### Step 1: 创建 `specs/002-advanced-capabilities/` 文档骨架

新增：

- `README.md`
- `capability-matrix.md`
- `privacy-diagnostics-contract.md`
- `test-data-policy.md`
- `e2e-fixture-plan.md`

同时新增：

- `specs/001-ready-desktop-app/test-data-policy.md`

要求：

- `README.md` 说明本目录是 P4/P5 高级能力和质量门的产品化规格，不替代 `specs/001-ready-desktop-app/`。
- `capability-matrix.md` 引用当前 `chatlog_alpha` endpoint family，并标记初始状态。
- `privacy-diagnostics-contract.md` 与 ready desktop diagnostics contract 保持一致。
- `test-data-policy.md` 明确 synthetic-only 原则。
- `e2e-matrix.md` 明确 route/state/viewport/privacy/fixture/phase ownership，不用单纯的宽泛覆盖清单替代。
- `e2e-fixture-plan.md` 明确 mock server 和 E2E 路线，不强制本阶段引入 Playwright runner。

验证：

```powershell
rg -n "TODO|TBD|fill in|待补|待定" specs\002-advanced-capabilities specs\001-ready-desktop-app\test-data-policy.md
rg -n "真实聊天|真实微信|private chat|C:\\Users\\[^\\]+|sk-[A-Za-z0-9]" specs\002-advanced-capabilities specs\001-ready-desktop-app\test-data-policy.md
```

### Step 2: 先写诊断事件单测

新增 `src/l4-atom/network/diagnosticEvents.test.ts`。

至少覆盖：

1. 创建 HTTP 成功事件时只保留 safe endpoint family、status、duration。
2. 含 query 的 URL 不进入事件 attributes。
3. 含 `dataKey`、token、Windows path 的 summary 被 redacted 或 blocked。
4. blocked 事件不会被序列化为可导出明文。
5. retention helper 不超过指定 max items。

验证：

```powershell
pnpm test src\l4-atom\network\diagnosticEvents.test.ts
```

预期：先失败，再实现。

### Step 3: 实现 L4 诊断事件 atom

新增 `src/l4-atom/network/diagnosticEvents.ts`。

实现内容：

- `DiagnosticEvent` 类型。
- `createDiagnosticEvent(input, options?)`。
- `createHttpDiagnosticEvent(input, options?)`。
- `sanitizeDiagnosticAttributes(attributes)`。
- `serializeDiagnosticEvents(events)`。
- `limitDiagnosticEvents(events, maxItems)`。

架构约束：

- 不导入 L2/L3/L1。
- 不访问 Zustand。
- 不调用 Tauri invoke。
- 不执行网络请求。
- 可以复用 `src/utils/maskSecrets.ts`，如果路径规则允许；若不允许 L4 引用 utils，则把 redaction helper 放在更低层共享位置并同步更新引用。

验证：

```powershell
rg -n "l2-coordinator|l3-molecule|l1-entry|zustand|@tauri-apps" src\l4-atom\network\diagnosticEvents.ts
pnpm test src\l4-atom\network\diagnosticEvents.test.ts
```

### Step 4: 让 `requestJson` 发出可选 HTTP 诊断事件

修改：

- `src/l4-atom/network/httpClient.ts`
- `src/l4-atom/network/httpClient.test.ts`
- `src/l4-atom/network/index.ts`

实现策略：

- `requestJson` 默认行为不变。
- 通过 options 注入 `onDiagnosticEvent?: (event: DiagnosticEvent) => void`，避免 L4 直接持有 store。
- 成功、HTTP error、timeout、network error 都发出摘要事件。
- 事件不包含 raw URL query、request body、response body。
- 现有 `ChatlogHttpError` 行为和测试保持兼容。

验收：

- 现有 `httpClient` 测试全部通过。
- 新增测试证明默认不需要 subscriber。
- 新增测试证明 subscriber 收到 redacted event。
- 新增测试证明 `format=json` 行为不变。

命令：

```powershell
pnpm test src\l4-atom\network\httpClient.test.ts src\l4-atom\network\diagnosticEvents.test.ts
```

### Step 5: 建立 L2 诊断事件 store 和 view model

新增：

- `src/l2-coordinator/data-clerk/stores/useDiagnosticEventStore.ts`
- `src/l2-coordinator/commander/diagnosticEventViewModel.ts`
- `src/l2-coordinator/commander/diagnosticEventViewModel.test.ts`

修改：

- `src/l2-coordinator/data-clerk/stores/index.ts`
- `src/l2-coordinator/commander/useDevConsoleCommander.ts`
- `src/l2-coordinator/commander/useDiagnosticsCommander.ts`

职责：

- store 只保存有限条数事件。
- commander 负责把 sidecar logs、HTTP diagnostics、Tauri/export/update/release 摘要汇聚成 UI view model。
- view model 负责过滤、计数、分组、空态文案和安全导出摘要。
- diagnostics export 增加 `diagnosticEventsSummary`，只包含 redacted summary、source、level、category、timestamp、status/duration 等 safe attributes。

特别修复：

- `useDevConsoleCommander` 当前 `console.error("导出日志失败:", error)` 需要改为安全摘要，避免 raw error 泄漏到开发者控制台。

验证：

```powershell
pnpm test src\l2-coordinator\commander\diagnosticEventViewModel.test.ts src\l2-coordinator\commander\diagnostics.test.ts
```

### Step 6: Dev Console 只做基础升级，不做完整开发者平台

修改：

- `src/l3-molecule/common/DevConsole.tsx`

目标：

- 显示统一事件来源：sidecar、http、tauri、ui、updater、release。
- 支持 source filter、level filter、privacy status filter。
- 显示总数、error/warn 数、blocked/redacted 数。
- 空态区分“暂无 sidecar 日志”和“暂无诊断事件”。
- 保留导出和清空动作。
- 不显示 raw request/response body。
- 不显示 raw local path。

如果要严格收敛 L3 架构，可以拆分：

- `DevConsoleView.tsx`：纯 props 展示组件。
- `DevConsole.tsx` 或上层 L2/L1 wrapper：注入 commander 数据和 action。

验收：

- L3 组件不直接调用 L4 network atom。
- UI 文案不泄漏 secret/private marker。
- 桌面宽度和窄宽度不重叠。

建议检查：

```powershell
rg -n "requestJson|fetch\(|http://|invoke\(" src\l3-molecule\common\DevConsole.tsx
pnpm typecheck
```

### Step 7: 建立 E2E fixture 基础

新增：

- `e2e/README.md`
- `e2e/fixtures/core-ready.json`
- `e2e/fixtures/advanced-capabilities.json`
- `e2e/fixtures/diagnostics-redaction.json`
- `e2e/mock-chatlog-server/README.md`

要求：

- fixture 文件是 JSON，可被未来 mock server 和 contract tests 读取。
- `README.md` 说明如何从 fixture 映射到 `chatlog_alpha` endpoint family。
- `specs/002-advanced-capabilities/e2e-matrix.md` 说明 fixture 如何覆盖 route、state、viewport、privacy mode 和后续 phase owner。
- `diagnostics-redaction.json` 中的 secret-like 值必须标记为 synthetic redaction test case。
- 不加入真实二进制媒体。
- 不加入真实 DB/cache 路径。

验证：

```powershell
rg -n "synthetic" e2e\fixtures
rg --pcre2 -n "C:\\Users\\(?!Synthetic)|WeChat Files\\(?!wxid_synthetic|Synthetic)|sk-live|sk-proj|Bearer [A-Za-z0-9]{20,}" e2e\fixtures
```

PowerShell 正则兼容性可能需要拆成多个 `rg` 命令；核心目标是确认没有真实路径或真实 token 形态。

### Step 8: 更新总计划和 task/progress 记录

修改：

- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`
- `task_plan.md`
- `findings.md`
- `progress.md`

要求：

- 宽口径总计划增加指向本专项计划的链接。
- 修正任何错误路径，例如 `src/l3-molecule/dev/DevConsole.tsx`。
- `task_plan.md` 增加 P4/P5-0 专项计划阶段和实施入口。
- `progress.md` 记录实施验证结果。
- `findings.md` 记录任何新发现的契约或安全风险。

### Step 9: 完成验证和复盘

最小验证：

```powershell
pnpm test src\l4-atom\network\diagnosticEvents.test.ts src\l4-atom\network\httpClient.test.ts src\l2-coordinator\commander\diagnosticEventViewModel.test.ts src\l2-coordinator\commander\diagnostics.test.ts
pnpm typecheck
git diff --check
```

如果本阶段改动了 Dev Console UI：

```powershell
pnpm dev
```

然后用浏览器检查：

- desktop viewport
- narrow viewport
- privacy on/off
- empty state
- sidecar conflict or mocked HTTP error state
- diagnostics export state

如果引入 mock server 或 E2E runner，再额外补充：

```powershell
pnpm e2e
```

本计划不要求先引入 `pnpm e2e`。只有实现了可运行 E2E harness 后才要求这个命令存在。

## 验收标准

P4/P5-0 完成时必须满足：

- `specs/002-advanced-capabilities/` 存在，并包含能力矩阵、隐私诊断合同、fixture policy、E2E fixture plan。
- 能力矩阵包含 endpoint-level inventory，不能只停留在能力族概览。
- E2E 基础包含 route/state/viewport/privacy/fixture matrix，不能只停留在未来测试愿望清单。
- `specs/001-ready-desktop-app/test-data-policy.md` 缺口被补齐。
- 能力矩阵覆盖 chatlog_alpha 的 media、SNS、DB、hook、MCP、semantic residual、graph residual、release quality 分组。
- `requestJson` 默认行为保持兼容。
- HTTP 诊断事件可选启用，不把 store 耦合进 L4。
- 诊断导出包含统一事件摘要，并通过 redaction tests。
- Dev Console 至少能展示统一事件摘要和过滤基础。
- E2E fixtures 存在且 synthetic-only。
- 没有新增真实聊天数据、真实媒体、真实本地路径、真实 secret。
- 未改变 sidecar 命令行契约和 base URL。
- 未无理由扩宽 Tauri CSP/capabilities。
- 相关单测、typecheck、diff check 通过，或在最终报告中明确剩余失败原因。

## 风险和处理

### 风险 1: 诊断事件变成隐性 telemetry

处理：

- 文档和实现都明确 local-only。
- 不添加网络上传。
- 不自动导出。
- 不记录 raw private content。

### 风险 2: L4 诊断事件 atom 破坏分层

处理：

- L4 只创建和 sanitize 事件。
- L4 通过 callback 发事件，不导入 Zustand 或 commander。
- L2 负责保留、筛选、展示和导出。

### 风险 3: HTTP URL 中 query 泄漏 data key 或 SNS media URL

处理：

- 事件保存 endpoint family，不保存完整 URL。
- 单测覆盖 query strip。
- redaction fail-closed。

### 风险 4: fixture 被误认为可使用真实数据

处理：

- 每个 fixture 顶层加 `synthetic: true`。
- 文档禁止从真实聊天数据裁剪。
- CI 或测试命令加入敏感 marker 扫描。

### 风险 5: Dev Console 升级范围膨胀

处理：

- P4/P5-0 只做 source/level/privacy filter 和统一摘要。
- API runner、MCP console、DB explorer 不在本阶段实现。

### 风险 6: 过早引入 Playwright 依赖

处理：

- 本阶段优先建立 fixture 和 mock contract。
- 是否加入 `@playwright/test` 留给 P5-A E2E implementation gate。

## 后续阶段入口

P4/P5-0 完成后，建议按这个顺序继续：

1. P4-A 诊断/隐私 2.0：把统一诊断事件用于 release smoke、updater、Tauri command、sidecar health。
2. P4-B 媒体/收藏/成员/未读：先使用矩阵中风险最低的只读能力。
3. P4-C SNS：先实现列表和搜索，不实现不必要的媒体外链暴露。
4. P4-D DB/API runner：默认只读、强提醒、诊断不记录 SQL 原文或结果。
5. P4-E Hook/MCP/residuals：重点做 SSE cancellation、事件节流和安全摘要。
6. P5-A contract fixtures：把本阶段 fixtures 接到自动 contract tests。
7. P5-B browser E2E/visual/a11y：引入正式 E2E runner 和视觉基线。
8. P5-C release pipeline：把 P2-E 手工门迁移成可重复 CI/release gate。

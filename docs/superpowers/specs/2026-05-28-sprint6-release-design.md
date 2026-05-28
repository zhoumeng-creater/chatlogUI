# Sprint 6: 交付与发布 — Design Spec

> **日期**: 2026-05-28
> **状态**: Draft
> **架构模式**: Mediator 四层架构 (L1-L4)
> **前置依赖**: Sprint 1-5 全部完成并验证

---

## 一、目标

将已完成开发的 chatlog_alpha 桌面应用投入正式交付，建立持续集成/发布流水线和应用内更新机制。

| 交付物 | 详细内容 | 验收标准 |
|--------|---------|---------|
| **CI/CD 流水线** | GitHub Actions 交叉编译 Go Sidecar + Tauri 打包，推 tag 触发发布 | push v* tag → 自动构建并发布 |
| **安装包** | macOS `.dmg` (x64 + arm64)，Windows `.msi` (x64) | 下载后可安装运行 |
| **自动发布** | GitHub Releases 发布安装包 + update.json | Releases 页面有完整下载资源 |
| **应用内更新** | 自动检测新版本 → 弹窗 → 下载进度 → 安装重启 | 全链路走通 |

### 明确排除

| 项目 | 理由 |
|------|------|
| macOS / Windows 代码签名 | macOS 仅开发者本地使用，Windows 不强制签名 |
| 增量更新 | 无签名基线，增量 diff 退化为全量，无实质收益 |
| macOS 公证 (Notarization) | 需要 Apple Developer 付费账号，个人本地使用跳过 |
| Windows arm64 | 现有 CGO 交叉编译在此平台受限，且受众极小 |

---

## 二、架构设计

### 2.1 整体数据流

```
┌─────────────────────────────────────┐
│         GitHub Actions              │
│  push tag v* → trigger              │
│  ┌───────────────────────────────┐  │
│  │ Matrix: macos-13 / macos-latest / windows-2022  │
│  │                               │  │
│  │ 1. Cross-compile Go Sidecar   │  │
│  │ 2. pnpm install && pnpm build │  │
│  │ 3. pnpm tauri build           │  │
│  │ 4. Package (.dmg / .msi)      │  │
│  │ 5. Generate update.json       │  │
│  │ 6. Upload to GitHub Releases  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────┐
│  GitHub Releases (更新源)           │
│  ┌──────────┐  ┌────────────────┐  │
│  │ .dmg     │  │ update.json    │  │
│  │ .msi     │  │ (版本清单+URL) │  │
│  └──────────┘  └────────────────┘  │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│  应用内更新 (tauri-plugin-updater)  │
│  ┌──────┐  ┌──────┐  ┌──────────┐  │
│  │检测  │→│下载  │→│安装+重启  │  │
│  └──────┘  └──────┘  └──────────┘  │
└─────────────────────────────────────┘
```

### 2.2 应用内更新 — Mediator 四层映射

```
用户操作 → L1 SettingsView "检查更新" 按钮
               ↓
          L2 useUpdateCommander.checkUpdate()
               ↓
          L2 命令 Diplomat 调用 L4 fetchUpdateJson()
               ↓
          L4 网络原子 GET GitHub Releases update.json
               ↓
          L2 Diplomat 比对版本号
               ↓
     ┌─────有新版本────────────────────┐
     ↓                                 ↓
  L2 useUpdateStore                   L2 useUpdateStore
  status='available'                  status='idle' (静默)
     ↓
  L3 UpdateNotification 弹窗
     ↓
  用户点击"立即更新"
     ↓
  L2 useUpdateCommander.downloadUpdate()
     ↓
  L4 tauri-plugin-updater 下载 + hash校验
     ↓
  L2 useUpdateStore progress逐帧更新
     ↓
  L3 UpdateNotification 进度条刷新
     ↓
  下载完成 → 用户点击"安装并重启"
     ↓
  L4 tauri-plugin-updater 调用系统安装程序
     ↓
  应用退出
```

### 2.3 CI/CD 流水线 — 构建矩阵

| job | runs-on | Go 编译参数 | 产出 |
|-----|---------|------------|------|
| macos-x64 | macos-13 | GOOS=darwin GOARCH=amd64 CGO_ENABLED=1 | .dmg |
| macos-arm64 | macos-latest | GOOS=darwin GOARCH=arm64 CGO_ENABLED=1 | .dmg |
| windows-x64 | windows-2022 | GOOS=windows GOARCH=amd64 CGO_ENABLED=1 + MSYS2 MinGW | .msi |

### 2.4 流水线触发

| 触发条件 | 行为 |
|----------|------|
| 推送 `v*.*.*` tag | 全量构建 + 发布到 GitHub Releases |
| 推送到 `main` 分支 | 仅构建验证（不发布） |
| workflow_dispatch | 手动触发（可选平台） |

---

## 三、数据模型

### 3.1 更新类型 (`update.ts`)

```typescript
export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "error";

export interface UpdateState {
  status: UpdateStatus;
  version: string;
  notes: string;
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  errorMessage: string;
}

export interface UpdateManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, {
    signature: string;
    url: string;
  }>;
}
```

### 3.2 UpdateStore

```typescript
type UpdateStore = UpdateState & {
  setStatus: (status: UpdateStatus) => void;
  setVersion: (version: string, notes: string) => void;
  setProgress: (downloaded: number, total: number) => void;
  setError: (message: string) => void;
  reset: () => void;
};
```

### 3.3 UpdateCommander

```typescript
function useUpdateCommander() {
  return {
    status, version, notes, progress, totalBytes, downloadedBytes, errorMessage,
    checkUpdate,    // 后台静默检测
    downloadUpdate, // 开始下载
    installAndRestart, // 安装并重启
    dismissUpdate,  // 稍后提醒
  };
}
```

---

## 四、目录结构变更

```
新增/修改:

.github/
└── workflows/
    ├── release.yml               # 新增: 完整 CI/CD 流水线
    └── build-check.yml           # 新增: main 分支构建验证

src-tauri/
├── Cargo.toml                    # 修改: +tauri-plugin-updater
├── tauri.conf.json               # 修改: +plugins.updater, +createUpdaterArtifacts
├── capabilities/default.json     # 修改: +updater权限
└── src/
    └── lib.rs                    # 修改: +updater插件注册

src/
├── l1-entry/pages/
│   └── SettingsView.tsx          # 修改: AboutSettings 增加 "检查更新" 按钮
├── l2-coordinator/
│   ├── api-docs/
│   │   └── update.ts             # 新增: 更新类型定义
│   ├── commander/
│   │   └── useUpdateCommander.ts # 新增: 更新指挥官
│   ├── data-clerk/stores/
│   │   └── useUpdateStore.ts     # 新增: 更新状态 Store
│   └── diplomat/
│       └── updateErrorTranslator.ts # 新增: 更新错误翻译
├── l3-molecule/
│   └── common/
│       └── UpdateNotification.tsx # 新增: 更新通知弹窗
├── l4-atom/network/
│   └── fetchUpdateJson.ts        # 新增: 获取更新清单
└── utils/
    └── constants.ts              # 修改: 新增更新相关常量

docs/superpowers/
├── specs/
│   └── 2026-05-28-sprint6-release-design.md  # 本文档
└── plans/
    └── 2026-05-28-sprint6-release.md         # 实施计划
```

---

## 五、更新 UI 设计

### 5.1 UpdateNotification 弹窗

```
┌─────────────────────────────────┐
│  发现新版本 v0.2.0               │
│                                 │
│  更新内容：                     │
│  · 新增隐私模式                 │
│  · 新增开发者控制台             │
│  · 图谱控制栏与时间轴           │
│                                 │
│  [████████████░░] 78%           │
│  正在下载... 12.3 MB / 15.8 MB  │
│                                 │
│           [稍后提醒]             │
└─────────────────────────────────┘
```

**状态矩阵：**

| 阶段 | 标题 | 按钮 | 进度条 |
|------|------|------|--------|
| 检测到新版本 | "发现新版本 vX.Y.Z" | "立即更新" + "稍后提醒" | 无 |
| 下载中 | "正在下载 vX.Y.Z" | "取消" | 进度条 + 百分比 |
| 下载完成 | "下载完成" | "安装并重启" | 100% |
| 下载失败 | "更新失败" | "重试" + "稍后提醒" | 显示错误信息 |

### 5.2 动画

- Framer Motion 弹簧入场 (opacity 0→1, scale 0.92→1, y 8→0)
- GlassPanel 毛玻璃背景，z-index 最高层 (modal overlay)
- 进度条使用浅蓝色填充动画 (CSS transition width)

### 5.3 检测时机

| 方式 | 触发 | 行为 |
|------|------|------|
| 自动检测 | 应用启动后 5 秒 | 静默请求 update.json，有新版本弹出 |
| 手动检测 | 设置 → 关于 → 点击 "检查更新" | 显示 loading 状态，有新版本弹出 |
| 手动检测（已是最新） | 同上 | 短暂 toast "已是最新版本" |

---

## 六、CI/CD 流水线详细

### 6.1 release.yml 关键步骤

```yaml
jobs:
  build:
    strategy:
      matrix:
        include:
          - target: aarch64-apple-darwin
            os: macos-latest
          - target: x86_64-apple-darwin
            os: macos-13
          - target: x86_64-pc-windows-msvc
            os: windows-2022

    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      # Go cross-compile
      - uses: actions/setup-go@v5
      - name: Cross-compile Go Sidecar
        run: |
          # macOS uses built-in C toolchain
          # Windows installs MSYS2 mingw-w64 for CGO
          GOOS=${{ matrix.goos }} GOARCH=${{ matrix.goarch }} CGO_ENABLED=1 go build -o sidecar-binary ./cmd/chatlog
        # 将编译产物放入 src-tauri/binaries/

      # Frontend + Tauri build
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm tauri build --target ${{ matrix.target }}

      # Upload
      - uses: softprops/action-gh-release@v2
        with:
          files: src-tauri/target/${{ matrix.target }}/release/bundle/**/*.{dmg,msi,app}
```

### 6.2 build-check.yml

仅触发构建（`pnpm install && pnpm tauri build`），不发布。用于验证 main 分支不腐。

### 6.3 update.json 生成

release.yml 最后一步（所有平台 job 完成后）聚合各平台下载 URL，生成 update.json 上传。由于是串联依赖，可在 release.yml 中使用 `needs` 或单独 job。

---

## 七、关键设计决策

| 决策 | 理由 |
|------|------|
| 跳过代码签名 | macOS 仅开发者本地使用（右键绕过 Gatekeeper），Windows 个人工具无强制要求 |
| 标准级更新（非增量） | 无签名基线导致增量 diff 退化，完整下载在 50MB 以内可接受 |
| pubkey 留空 | 无签名意味着无公钥验证，仅依赖 HTTPS 传输安全 + hash 校验 |
| 自动检测延迟 5 秒 | 避免阻塞应用启动流程（Sidecar 启动 + 健康检查已有延迟） |
| 更新设置放在 AboutSettings 底部 | 符合 macOS 系统设置风格，不新增导航项 |
| CI 复用现有 .goreleaser.yaml 参数 | chatlog_alpha 已有成熟的 CGO 交叉编译配置，直接复用 |
| update.json 随发布自动生成 | 避免手动维护版本清单，减少人为错误 |
| 构建矩阵仅包含 3 个 target | Windows arm64 受众极少，CGO 交叉编译困难，暂不包含 |

---

## 八、验收清单

| # | 验收项 | 方法 |
|---|--------|------|
| 1 | `pnpm typecheck` 零错误 | 命令 |
| 2 | `pnpm lint` 零警告 | 命令 |
| 3 | `pnpm build` 成功 | 命令 |
| 4 | `cargo build` 成功 | 命令 |
| 5 | GitHub Actions release.yml 推送 tag 后触发成功 | 观察 Actions |
| 6 | macOS .dmg + Windows .msi 产出并发布到 Releases | 下载验证 |
| 7 | update.json 正确生成，版本号与 tauri.conf.json 一致 | 检查 |
| 8 | 应用启动后 5 秒自动检测更新（有新版本时弹窗） | 操作 |
| 9 | 更新弹窗正确显示版本号 + 更新日志 + 下载进度条 | 操作 |
| 10 | 下载完成后 "安装并重启" 按钮生效 | 操作 |
| 11 | 已是最新版本时无弹窗 / toast "已是最新版本" | 操作 |
| 12 | 设置 → 关于页 "检查更新" 按钮手动触发生效 | 操作 |
| 13 | 下载失败显示友好错误提示 + 重试按钮 | 模拟 |
| 14 | "稍后提醒" 关闭弹窗，下次启动再检测 | 操作 |
| 15 | L4 原子间无相互 import | 代码审查 |
| 16 | L3 分子间无相互 import | 代码审查 |
| 17 | L1 页面无业务逻辑 | 代码审查 |

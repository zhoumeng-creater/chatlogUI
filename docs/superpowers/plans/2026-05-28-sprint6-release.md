# Sprint 6: 交付与发布 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build CI/CD pipeline (GitHub Actions), platform installers (.dmg/.msi), GitHub Releases auto-publish, and in-app update detection/download/install flow via tauri-plugin-updater.

**Architecture:** Rust side adds `tauri-plugin-updater` to Cargo.toml and lib.rs. Frontend adds L2 useUpdateStore (Zustand) + useUpdateCommander + L3 UpdateNotification molecule + L4 fetchUpdateJson network atom. AboutSettings gets a "Check for Updates" button. Two GitHub Actions workflows: release.yml (tag-triggered full build+publish) and build-check.yml (main branch verify).

**Tech Stack:** Tauri v2, React 18, TypeScript 5, Zustand 5, Framer Motion 11, GitHub Actions, tauri-plugin-updater

---

## 任务依赖图

```
Group A: Rust/Tauri Config (并行 Group B)
A-1 (Cargo.toml +updater dep) → A-2 (tauri.conf.json +updater config) → A-3 (lib.rs +plugin) → A-4 (capabilities +permission)

Group B: Frontend L2 (并行 A)
B-1 (update.ts types) → B-2 (useUpdateStore) → B-3 (useUpdateCommander) → B-4 (updateErrorTranslator)

Group C: Frontend L4 + L3 (依赖 B)
C-1 (fetchUpdateJson.ts) → C-2 (network/index.ts export)
                              ↓
B-3 → C-3 (UpdateNotification.tsx)

Group D: L1 + Settings (依赖 B, C)
D-1 (AboutSettings.tsx) → D-2 (constants.ts)

Group E: CI/CD Workflows (独立，无代码依赖)
E-1 (build-check.yml) → E-2 (release.yml) → 最终验证

Final:
G-1 (verification)
```

**并行建议:** Group A、B、E 可并行开发。

---

### Task A-1: Cargo.toml — 新增 tauri-plugin-updater 依赖

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: 在 dependencies 中添加 updater 插件**

在 `tauri-plugin-dialog = "2"` 之后追加：

```toml
tauri-plugin-updater = "2"
```

最终 dependencies 区块：

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-updater = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 2: 验证**

Run: `cargo build -p chatlogUI 2>&1`
Expected: 编译成功（下载并编译新依赖）

---

### Task A-2: tauri.conf.json — 新增 updater 插件配置

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: 在 plugins 对象中添加 updater 配置**

在 `"shell"` 配置块之后（同层级）追加 `"updater"` 块。同时在 bundle 中启用 `createUpdaterArtifacts`。

最终文件内容：

```json
{
  "$schema": "https://raw.githubusercontent.com/nicehiro/tauri/dev/tauri-config-schema/schema.json",
  "productName": "chatlog_alpha",
  "version": "0.1.0",
  "identifier": "com.chatlog.alpha",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build"
  },
  "app": {
    "windows": [
      {
        "title": "chatlog_alpha",
        "width": 1080,
        "height": 720,
        "minWidth": 900,
        "minHeight": 600,
        "decorations": false,
        "center": true,
        "transparent": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "createUpdaterArtifacts": true,
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "externalBin": [
      "binaries/chatlog_alpha"
    ],
    "windows": {
      "wix": {
        "language": "zh-CN"
      }
    },
    "macOS": {
      "minimumSystemVersion": "11.0"
    }
  },
  "plugins": {
    "shell": {
      "sidecar": true,
      "scope": [
        {
          "name": "binaries/chatlog_alpha",
          "sidecar": true
        }
      ]
    },
    "updater": {
      "endpoints": [
        "https://github.com/CHANGEME_OWNER/CHANGEME_REPO/releases/latest/download/update.json"
      ],
      "pubkey": ""
    }
  }
}
```

> **NOTE:** `CHANGEME_OWNER` 和 `CHANGEME_REPO` 在实际使用时替换为你的 GitHub 用户名和仓库名。

- [ ] **Step 2: 验证**

Run: `pnpm tauri build --help`
Expected: 新选项 `--config` 等正常识别，无语法错误

---

### Task A-3: Rust lib.rs — 注册 updater 插件

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 在 Tauri Builder 中注册 updater 插件**

在 `.plugin(tauri_plugin_dialog::init())` 之后追加 `.plugin(tauri_plugin_updater::Builder::new().build())`。

最终文件内容：

```rust
use tauri::Manager;

mod commands;
mod health;
mod port_killer;
mod sidecar;
mod theme;
mod material;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.open_devtools();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::kill_port,
            commands::spawn_sidecar,
            commands::check_health,
            commands::shutdown_sidecar,
            commands::get_system_theme,
            commands::export_logs,
            material::apply_window_material,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: 验证**

Run: `cargo build -p chatlogUI 2>&1`
Expected: 编译成功

---

### Task A-4: Capabilities — 新增 updater 权限

**Files:**
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: 在 permissions 数组中追加 updater 权限**

最终文件内容：

```json
{
  "identifier": "default",
  "description": "Default capability for chatlog_alpha",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-execute",
    "shell:allow-stdin-write",
    "dialog:default",
    "updater:default"
  ]
}
```

- [ ] **Step 2: 验证**

Run: `cargo build -p chatlogUI 2>&1`
Expected: 编译成功

---

### Task B-1: 更新 API 类型定义

**Files:**
- Create: `src/l2-coordinator/api-docs/update.ts`

- [ ] **Step 1: 创建类型文件**

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

export interface UpdateManifestPlatform {
  signature: string;
  url: string;
}

export interface UpdateManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, UpdateManifestPlatform>;
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task B-2: useUpdateStore — 更新状态管理

**Files:**
- Create: `src/l2-coordinator/data-clerk/stores/useUpdateStore.ts`

- [ ] **Step 1: 创建 Store**

```typescript
import { create } from "zustand";
import type { UpdateStatus } from "@/l2-coordinator/api-docs/update";

interface UpdateStoreData {
  status: UpdateStatus;
  version: string;
  notes: string;
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  errorMessage: string;
}

interface UpdateStoreActions {
  setStatus: (status: UpdateStatus) => void;
  setVersion: (version: string, notes: string) => void;
  setProgress: (downloaded: number, total: number) => void;
  setError: (message: string) => void;
  reset: () => void;
}

type UpdateStore = UpdateStoreData & UpdateStoreActions;

const initialState: UpdateStoreData = {
  status: "idle",
  version: "",
  notes: "",
  progress: 0,
  totalBytes: 0,
  downloadedBytes: 0,
  errorMessage: "",
};

export const useUpdateStore = create<UpdateStore>((set) => ({
  ...initialState,

  setStatus: (status: UpdateStatus) => set({ status }),

  setVersion: (version: string, notes: string) =>
    set({ version, notes, status: "available" }),

  setProgress: (downloaded: number, total: number) =>
    set({
      downloadedBytes: downloaded,
      totalBytes: total,
      progress: total > 0 ? Math.round((downloaded / total) * 100) : 0,
    }),

  setError: (message: string) =>
    set({ status: "error", errorMessage: message }),

  reset: () => set(initialState),
}));
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task B-3: useUpdateCommander — 更新指挥官

**Files:**
- Create: `src/l2-coordinator/commander/useUpdateCommander.ts`

- [ ] **Step 1: 创建 Commander**

```typescript
import { useCallback, useEffect } from "react";
import { useUpdateStore } from "@/l2-coordinator/data-clerk/stores/useUpdateStore";
import { fetchUpdateJson } from "@l4/network/fetchUpdateJson";
import { UPDATE_CHECK_DELAY_MS } from "@/utils/constants";
import type { UpdateManifest } from "@/l2-coordinator/api-docs/update";

export function useUpdateCommander() {
  const store = useUpdateStore();

  const checkUpdate = useCallback(async (): Promise<boolean> => {
    useUpdateStore.getState().setStatus("checking");

    try {
      const manifest: UpdateManifest = await fetchUpdateJson();
      const currentVersion = "0.1.0";

      if (manifest.version !== currentVersion) {
        useUpdateStore.getState().setVersion(manifest.version, manifest.notes);
        return true;
      }

      useUpdateStore.getState().setStatus("idle");
      return false;
    } catch (error) {
      useUpdateStore.getState().setError(
        error instanceof Error ? error.message : "检查更新失败",
      );
      return false;
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    useUpdateStore.getState().setStatus("downloading");

    try {
      const manifest = await fetchUpdateJson();
      const platform = getPlatformKey();
      const entry = manifest.platforms[platform];
      if (!entry) {
        useUpdateStore.getState().setError("当前平台无可用更新包");
        return;
      }

      const response = await fetch(entry.url);
      if (!response.ok) {
        throw new Error(`下载失败: HTTP ${response.status}`);
      }

      const total = parseInt(response.headers.get("content-length") ?? "0", 10);
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取下载流");
      }

      const chunks: Uint8Array[] = [];
      let downloaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        downloaded += value.length;
        useUpdateStore.getState().setProgress(downloaded, total);
      }

      const blob = new Blob(chunks);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getInstallerFilename(platform);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      useUpdateStore.getState().setStatus("ready");
    } catch (error) {
      useUpdateStore.getState().setError(
        error instanceof Error ? error.message : "下载更新失败",
      );
    }
  }, []);

  const installAndRestart = useCallback(async () => {
    try {
      const { checkUpdate: tauriCheckUpdate } = await import(
        "@tauri-apps/plugin-updater"
      );
      const result = await tauriCheckUpdate();
      if (result?.available) {
        await result.downloadAndInstall();
        // Process will exit after install
      }
    } catch {
      useUpdateStore.getState().setError("安装更新失败，请手动下载");
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    useUpdateStore.getState().reset();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkUpdate();
    }, UPDATE_CHECK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [checkUpdate]);

  return {
    status: store.status,
    version: store.version,
    notes: store.notes,
    progress: store.progress,
    totalBytes: store.totalBytes,
    downloadedBytes: store.downloadedBytes,
    errorMessage: store.errorMessage,
    checkUpdate,
    downloadUpdate,
    installAndRestart,
    dismissUpdate,
  };
}

function getPlatformKey(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac os")) {
    return ua.includes("arm") || ua.includes("aarch64")
      ? "darwin-aarch64"
      : "darwin-x86_64";
  }
  return "windows-x86_64";
}

function getInstallerFilename(platform: string): string {
  if (platform.startsWith("darwin")) {
    return `chatlog_alpha_${platform}.dmg`;
  }
  return `chatlog_alpha_${platform}.msi`;
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task B-4: updateErrorTranslator — 更新错误翻译

**Files:**
- Create: `src/l2-coordinator/diplomat/updateErrorTranslator.ts`

- [ ] **Step 1: 创建错误翻译器**

```typescript
const ERROR_MAP: Record<string, string> = {
  "Failed to fetch": "无法连接到更新服务器，请检查网络连接",
  "forbidden": "更新服务器拒绝访问，请稍后重试",
  "not found": "未找到更新清单文件，请联系开发者",
  "timeout": "更新服务器连接超时，请检查网络后重试",
};

export function translateUpdateError(error: unknown): string {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return ERROR_MAP["Failed to fetch"];
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    for (const [key, translation] of Object.entries(ERROR_MAP)) {
      if (message.includes(key)) {
        return translation;
      }
    }
    return `更新失败：${error.message}`;
  }

  return "发生未知错误，请稍后重试";
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task C-1: fetchUpdateJson — L4 网络原子

**Files:**
- Create: `src/l4-atom/network/fetchUpdateJson.ts`

- [ ] **Step 1: 创建网络原子**

```typescript
import type { UpdateManifest } from "@/l2-coordinator/api-docs/update";

const DEFAULT_UPDATE_URL =
  "https://github.com/CHANGEME_OWNER/CHANGEME_REPO/releases/latest/download/update.json";

export async function fetchUpdateJson(): Promise<UpdateManifest> {
  const response = await fetch(DEFAULT_UPDATE_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`获取更新清单失败: HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  const manifest = data as UpdateManifest;

  if (!manifest.version || !manifest.platforms) {
    throw new Error("更新清单格式无效");
  }

  return manifest;
}
```

> **NOTE:** `CHANGEME_OWNER` 和 `CHANGEME_REPO` 在实际使用时替换为你的 GitHub 用户名和仓库名。

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task C-2: 网络原子 index.ts — 追加导出

**Files:**
- Modify: `src/l4-atom/network/index.ts`

- [ ] **Step 1: 在文件末尾追加导出**

```typescript
export { fetchUpdateJson } from "./fetchUpdateJson";
```

最终文件末尾变为：

```typescript
export { fetchGraphVisualize } from "./fetchGraphVisualize";
export { fetchGraphQuery } from "./fetchGraphQuery";
export { fetchGraphStatus } from "./fetchGraphStatus";
export { fetchUpdateJson } from "./fetchUpdateJson";
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task C-3: UpdateNotification — 更新通知弹窗

**Files:**
- Create: `src/l3-molecule/common/UpdateNotification.tsx`

- [ ] **Step 1: 创建弹窗组件**

```tsx
import { motion, AnimatePresence } from "framer-motion";
import { useUpdateCommander } from "@l2/commander/useUpdateCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";

export function UpdateNotification() {
  const update = useUpdateCommander();

  const showAvailable = update.status === "available";
  const showDownloading = update.status === "downloading";
  const showReady = update.status === "ready";
  const showError = update.status === "error";
  const show = showAvailable || showDownloading || showReady || showError;

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={update.dismissUpdate}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 9999,
              width: 340,
              maxWidth: "90vw",
              background: "rgba(30, 30, 50, 0.95)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(74, 158, 255, 0.2)",
              borderRadius: 16,
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Typography variant="h3" weight={600}>
              {showReady
                ? "下载完成"
                : showError
                  ? "更新失败"
                  : showDownloading
                    ? `正在下载 v${update.version}`
                    : `发现新版本 v${update.version}`}
            </Typography>

            {update.notes && showAvailable && (
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 8,
                  padding: 12,
                  maxHeight: 120,
                  overflowY: "auto",
                }}
              >
                <Typography
                  variant="caption"
                  color="var(--color-text-secondary)"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {update.notes}
                </Typography>
              </div>
            )}

            {showDownloading && (
              <div>
                <div
                  style={{
                    width: "100%",
                    height: 6,
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    style={{
                      height: "100%",
                      background: "linear-gradient(90deg, #007AFF, #5856D6)",
                      borderRadius: 3,
                    }}
                    animate={{ width: `${update.progress}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>
                <Typography
                  variant="caption"
                  color="var(--color-text-tertiary)"
                  style={{ marginTop: 8, textAlign: "center" }}
                >
                  {update.totalBytes > 0
                    ? `${formatBytes(update.downloadedBytes)} / ${formatBytes(update.totalBytes)}`
                    : `${formatBytes(update.downloadedBytes)} 已下载`}
                </Typography>
              </div>
            )}

            {showError && (
              <Typography variant="caption" color="#FF3B30">
                {update.errorMessage}
              </Typography>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              {showAvailable && (
                <>
                  <AppleButton
                    variant="secondary"
                    size="sm"
                    onClick={update.dismissUpdate}
                  >
                    稍后提醒
                  </AppleButton>
                  <AppleButton
                    variant="primary"
                    size="sm"
                    onClick={update.downloadUpdate}
                  >
                    立即更新
                  </AppleButton>
                </>
              )}

              {showDownloading && (
                <AppleButton
                  variant="secondary"
                  size="sm"
                  onClick={update.dismissUpdate}
                >
                  取消
                </AppleButton>
              )}

              {showReady && (
                <AppleButton
                  variant="primary"
                  size="sm"
                  onClick={update.installAndRestart}
                >
                  安装并重启
                </AppleButton>
              )}

              {showError && (
                <>
                  <AppleButton
                    variant="secondary"
                    size="sm"
                    onClick={update.dismissUpdate}
                  >
                    稍后提醒
                  </AppleButton>
                  <AppleButton
                    variant="primary"
                    size="sm"
                    onClick={update.downloadUpdate}
                  >
                    重试
                  </AppleButton>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task D-1: DashboardView — 集成 UpdateNotification

**Files:**
- Modify: `src/l1-entry/pages/DashboardView.tsx`

- [ ] **Step 1: 在 DashboardView 中渲染 UpdateNotification**

在文件顶部 import 区域追加：

```typescript
import { UpdateNotification } from "@l3/common/UpdateNotification";
import { useUpdateCommander } from "@l2/commander/useUpdateCommander";
```

在 `export function DashboardView()` 内部，`useDevConsoleCommander()` 调用之后追加 hook 调用以触发自动检测：

```typescript
useUpdateCommander();
```

在 return 中的 `</AppLayout>` 闭合之前追加 `UpdateNotification`：

```tsx
<UpdateNotification />
```

> 注意：此修改只在 DashboardView 中追加 3 处。精确插入位置——imports 区域在现有 `import { DevConsole }` 附近；hook 调用在 `useDevConsoleCommander()` 之后；JSX 在 `</AppLayout>` 之前。

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task D-2: AboutSettings — 新增 "检查更新" 按钮

**Files:**
- Modify: `src/l3-molecule/settings/AboutSettings.tsx`

- [ ] **Step 1: 在关于页面底部添加检查更新按钮**

```tsx
import { useState, useCallback } from "react";
import { Typography } from "@l4/ui/Typography";
import { GlassPanel } from "@l4/ui/GlassPanel";
import { AppleButton } from "@l4/ui/AppleButton";
import { useUpdateCommander } from "@l2/commander/useUpdateCommander";

export function AboutSettings() {
  const { checkUpdate } = useUpdateCommander();
  const [checkingText, setCheckingText] = useState("");

  const handleCheckUpdate = useCallback(async () => {
    setCheckingText("正在检查更新...");
    const hasUpdate = await checkUpdate();
    if (!hasUpdate) {
      setCheckingText("已是最新版本");
      setTimeout(() => setCheckingText(""), 3000);
    }
  }, [checkUpdate]);

  return (
    <div>
      <Typography variant="h2" style={{ marginBottom: 24 }}>关于</Typography>

      <GlassPanel>
        <div style={{ padding: 16, textAlign: "center" }}>
          <Typography variant="h3" style={{ marginBottom: 8 }}>chatlog_alpha</Typography>
          <Typography variant="caption" color="var(--color-text-secondary)">
            版本 1.0.0
          </Typography>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16, marginTop: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 8 }}>
            技术栈
          </Typography>
          <Typography variant="caption" color="var(--color-text-secondary)">
            Tauri v2 · React 18 · TypeScript 5 · Three.js · Go (chatlog_alpha)
          </Typography>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16, marginTop: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 8 }}>
            开源许可
          </Typography>
          <Typography variant="caption" color="var(--color-text-secondary)">
            基于 chatlog_alpha 开源项目构建。本软件仅供个人学习和研究使用。
          </Typography>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16, marginTop: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            更新
          </Typography>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AppleButton variant="secondary" size="sm" onClick={handleCheckUpdate}>
              检查更新
            </AppleButton>
            {checkingText && (
              <Typography variant="caption" color="var(--color-text-secondary)">
                {checkingText}
              </Typography>
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task D-3: constants.ts — 追加 Sprint 6 常量

**Files:**
- Modify: `src/utils/constants.ts`

- [ ] **Step 1: 在文件末尾追加常量**

```typescript
// ========== Sprint 6: 更新与发布常量 ==========

export const UPDATE_CHECK_DELAY_MS = 5000;
export const UPDATE_MANIFEST_URL =
  "https://github.com/CHANGEME_OWNER/CHANGEME_REPO/releases/latest/download/update.json";

// ========== Sprint 6: CI/CD 常量 (仅文档参考) ==========

export const GO_BUILD_TARGETS = [
  "darwin/amd64",
  "darwin/arm64",
  "windows/amd64",
] as const;
```

> **NOTE:** `CHANGEME_OWNER` 和 `CHANGEME_REPO` 在实际使用时替换。

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task E-1: build-check.yml — main 分支构建验证

**Files:**
- Create: `.github/workflows/build-check.yml`

- [ ] **Step 1: 创建 main 分支 CI 验证工作流**

```yaml
name: Build Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: x86_64-pc-windows-msvc
            os: windows-2022
          - target: x86_64-apple-darwin
            os: macos-13
          - target: aarch64-apple-darwin
            os: macos-latest

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: "1.24"

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install MSYS2 (Windows)
        if: runner.os == 'Windows'
        uses: msys2/setup-msys2@v2
        with:
          update: true
          install: mingw-w64-x86_64-gcc mingw-w64-x86_64-pkg-config

      - name: Build Go Sidecar
        shell: bash
        run: |
          BINARY_NAME="chatlog_alpha-${{ matrix.target }}"
          if [[ "${{ runner.os }}" == "Windows" ]]; then
            BINARY_NAME="${BINARY_NAME}.exe"
          fi
          go build -o "src-tauri/binaries/${BINARY_NAME}" ./cmd/chatlog

      - name: Install Dependencies
        run: pnpm install

      - name: Type Check
        run: pnpm typecheck

      - name: Lint Check
        run: pnpm lint

      - name: Tauri Build
        run: pnpm tauri build --target ${{ matrix.target }}
```

- [ ] **Step 2: 验证**

推送到 main 分支后在 GitHub Actions 页面验证工作流自动触发。

---

### Task E-2: release.yml — Tag 触发完整发布流水线

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: 创建 Release 工作流**

```yaml
name: Release

on:
  push:
    tags:
      - "v*.*.*"
  workflow_dispatch:
    inputs:
      target:
        description: "Target platform"
        required: false
        type: choice
        options:
          - all
          - windows-x86_64
          - macos-x86_64
          - macos-aarch64

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: x86_64-pc-windows-msvc
            os: windows-2022
            rust-target: x86_64-pc-windows-msvc
            archive: msi
            ext: msi
          - target: x86_64-apple-darwin
            os: macos-13
            rust-target: x86_64-apple-darwin
            archive: dmg
            ext: dmg
          - target: aarch64-apple-darwin
            os: macos-latest
            rust-target: aarch64-apple-darwin
            archive: dmg
            ext: dmg

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: "1.24"

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install MSYS2 (Windows)
        if: runner.os == 'Windows'
        uses: msys2/setup-msys2@v2
        with:
          update: true
          install: mingw-w64-x86_64-gcc mingw-w64-x86_64-pkg-config

      - name: Build Go Sidecar
        shell: bash
        run: |
          BINARY_NAME="chatlog_alpha-${{ matrix.target }}"
          if [[ "${{ runner.os }}" == "Windows" ]]; then
            BINARY_NAME="${BINARY_NAME}.exe"
          fi
          go build -o "src-tauri/binaries/${BINARY_NAME}" ./cmd/chatlog

      - name: Install Dependencies
        run: pnpm install

      - name: Tauri Build
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: "chatlog_alpha v__VERSION__"
          releaseBody: |
            更新内容请参见 CHANGELOG。
            下载适合你平台的安装包：
            - **macOS (Intel)**: `chatlog_alpha_x64.dmg`
            - **macOS (Apple Silicon)**: `chatlog_alpha_aarch64.dmg`
            - **Windows**: `chatlog_alpha_x64.msi`
          releaseDraft: false
          prerelease: false
          args: --target ${{ matrix.target }}

  publish-update-json:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate update.json
        run: |
          VERSION="${{ github.ref_name }}"
          VERSION="${VERSION#v}"
          REPO="${{ github.repository }}"
          cat > update.json << EOF
          {
            "version": "${VERSION}",
            "notes": "请查看 GitHub Releases 获取详细更新内容",
            "pub_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "platforms": {
              "darwin-x86_64": {
                "signature": "",
                "url": "https://github.com/${REPO}/releases/download/${{ github.ref_name }}/chatlog_alpha_x64.dmg"
              },
              "darwin-aarch64": {
                "signature": "",
                "url": "https://github.com/${REPO}/releases/download/${{ github.ref_name }}/chatlog_alpha_aarch64.dmg"
              },
              "windows-x86_64": {
                "signature": "",
                "url": "https://github.com/${REPO}/releases/download/${{ github.ref_name }}/chatlog_alpha_x64.msi"
              }
            }
          }
          EOF

      - name: Upload update.json
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          files: update.json
```

> **IMPORTANT:** `tauri-apps/tauri-action@v0` 使用 `${{ secrets.GITHUB_TOKEN }}` 自动发布到 GitHub Releases。需要确保仓库的 Actions 有写权限（Settings → Actions → General → Workflow permissions → Read and write permissions）。

- [ ] **Step 2: 验证**

推送 `v0.1.0` tag 后在 GitHub Actions 页面验证工作流触发，检查 Releases 页面产物。

---

### Task G-1: 最终验证

- [ ] **Step 1: 类型检查**

Run: `pnpm typecheck`
Expected: 0 errors

- [ ] **Step 2: Lint 检查**

Run: `pnpm lint`
Expected: 0 warnings

- [ ] **Step 3: 前端构建**

Run: `pnpm build`
Expected: 构建成功

- [ ] **Step 4: Rust 构建**

Run: `cargo build -p chatlogUI 2>&1`
Expected: 编译成功

- [ ] **Step 5: 架构合规检查**

- [ ] `fetchUpdateJson.ts` 不 import 任何其他 L4 原子
- [ ] `UpdateNotification.tsx` 不 import 其他 L3 分子（仅 import L4 UI 原子 + L2 commander）
- [ ] `AboutSettings.tsx` 不 import 其他 L3 分子
- [ ] `DashboardView.tsx` 仅做事件委托，无业务逻辑
- [ ] L4 网络原子 index.ts 正确导出 `fetchUpdateJson`

- [ ] **Step 6: 提交所有 Sprint 6 代码**

```bash
git add .
git commit -m "feat: sprint 6 - CI/CD pipeline, packaging, in-app update mechanism"
```

---

## 验收清单

| # | 验收项 | 方法 |
|---|--------|------|
| 1 | `pnpm typecheck` 零错误 | 命令 |
| 2 | `pnpm lint` 零警告 | 命令 |
| 3 | `pnpm build` 成功 | 命令 |
| 4 | `cargo build` 成功 | 命令 |
| 5 | GitHub Actions build-check.yml 推送 main 触发成功 | 观察 |
| 6 | GitHub Actions release.yml 推送 tag 触发成功 | 观察 |
| 7 | macOS .dmg + Windows .msi 产出并发布到 Releases | 下载验证 |
| 8 | update.json 正确生成，版本号与 tauri.conf.json 一致 | 检查 |
| 9 | 应用启动后 5 秒自动静默检测（控制台观察） | 操作 |
| 10 | 有新版本时 UpdateNotification 弹窗显示 | 操作 |
| 11 | 更新弹窗正确显示版本号 + 更新日志 + 下载进度条 | 操作 |
| 12 | 下载完成后 "安装并重启" 按钮显示 | 操作 |
| 13 | 设置 → 关于页 "检查更新" 按钮手动触发 | 操作 |
| 14 | 已是最新版本时 toast "已是最新版本" | 操作 |
| 15 | 下载失败显示友好错误提示 + 重试按钮 | 模拟 |
| 16 | "稍后提醒" 关闭弹窗 | 操作 |
| 17 | L4 原子间无相互 import | 代码审查 |
| 18 | L3 分子间无相互 import | 代码审查 |
| 19 | L1 页面无业务逻辑 | 代码审查 |

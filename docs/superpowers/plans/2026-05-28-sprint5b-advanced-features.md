# Sprint 5b: 高级功能 (Part B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Privacy Mode (avatar blur + text masking), Developer Console (real-time Sidecar logs + export), Graph Control Bar (entity filter / time window / layout switch / refresh), and Graph Timeline Overlay.

**Architecture:** Privacy mode extends SettingsStore with a `privacyOn` toggle affecting ContactItem (CSS blur) and MessageBubble (content masking). DevConsole captures Sidecar stdout/stderr in Rust via piped stdio, emitting Tauri events to a new DevConsoleStore + DevConsole component. Graph Control Bar and Timeline attach as sub-panels inside GraphCanvas, extending GraphStore with entity kind filter, layout mode, and timeline visibility state.

**Tech Stack:** React 18, TypeScript 5, Zustand 5, Tauri v2, React Three Fiber, @react-three/drei, Framer Motion

---

## 任务依赖图

```
Group A: Privacy Mode
A-1 (settings.ts +privacyOn) → A-2 (useSettingsStore +togglePrivacy)
                                    ↓
                              A-3 (AppLayout +icon)  ┐
                              A-4 (ContactItem blur) ├─ 并行
                              A-5 (MessageBubble mask)┘

Group B: Dev Console
B-1 (sidecar.rs pipe+emit) → B-2 (commands.rs +export_logs) → B-3 (lib.rs register)
                                                                    ↓
B-4 (listenSidecarLogs.ts) → B-5 (index.ts export) → B-6 (useDevConsoleStore)
                                                              ↓
                                                        B-7 (useDevConsoleCommander)
                                                              ↓
                                                        B-8 (DevConsole.tsx component)
                                                              ↓
                                              B-9 (AppLayout +console button)
                                              B-10 (DashboardView integrate)

Group C: Graph Control Bar + Timeline
C-1 (useGraphStore extend) → C-2 (useGraphCommander extend)
                                    ↓
                              C-3 (GraphControlBar.tsx)  ┐
                              C-4 (GraphTimeline.tsx)    ├─ 并行
                                                          │
                              C-5 (GraphEngine filter+radial)
                              C-6 (GraphCanvas integrate)

Group D: Final
D-1 (constants.ts) → D-2 (verification all)
```

并行建议: Group A, B, C 三者可并行开发。Group A 纯前端，Group B 涉及 Rust 编译，Group C 涉及 R3F 代码。

---

### Task A-1: Settings API 类型扩展 (+privacyOn)

**Files:**
- Modify: `src/l2-coordinator/api-docs/settings.ts`

- [ ] **Step 1: SettingsState 新增 privacyOn 字段**

在 `SettingsState` interface 的 `sidecarPort` 后追加：

```typescript
  privacyOn: boolean;
```

在 `SETTINGS_DEFAULTS` 的 `sidecarPort: 5030` 后追加：

```typescript
  privacyOn: false,
```

最终文件内容：
```typescript
export type ThemeMode = "system" | "light" | "dark";
export type WindowMaterial = "vibrancy" | "mica" | "acrylic" | "none";
export type SettingsCategory = "ai" | "appearance" | "data" | "about";
export type FontSize = "small" | "medium" | "large";

export interface SettingsState {
  aiProvider: string;
  aiModel: string;
  aiEndpoint: string;
  aiApiKey: string;
  theme: ThemeMode;
  fontSize: FontSize;
  reduceAnimations: boolean;
  windowMaterial: WindowMaterial;
  wxDataPath: string;
  sidecarPort: number;
  privacyOn: boolean;
}

export const SETTINGS_DEFAULTS: SettingsState = {
  aiProvider: "ollama",
  aiModel: "",
  aiEndpoint: "http://localhost:11434",
  aiApiKey: "",
  theme: "system",
  fontSize: "medium",
  reduceAnimations: false,
  windowMaterial: "none",
  wxDataPath: "",
  sidecarPort: 5030,
  privacyOn: false,
};
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task A-2: useSettingsStore 扩展 (+togglePrivacy)

**Files:**
- Modify: `src/l2-coordinator/data-clerk/stores/useSettingsStore.ts`

- [ ] **Step 1: SettingsStoreActions 新增 togglePrivacy**

在 `SettingsStoreActions` interface 的 `reset` 后追加：

```typescript
  togglePrivacy: () => void;
```

在 store 实现的 `reset` action 后追加：

```typescript
  togglePrivacy: () => {
    set((state) => {
      const newSettings = { ...state.settings, privacyOn: !state.settings.privacyOn };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      } catch {
        // storage full or unavailable
      }
      return { settings: newSettings };
    });
  },
```

最终文件内容：
```typescript
import { create } from "zustand";
import type { SettingsCategory, SettingsState } from "@/l2-coordinator/api-docs/settings";
import { SETTINGS_DEFAULTS } from "@/l2-coordinator/api-docs/settings";
import { SETTINGS_STORAGE_KEY } from "@/utils/constants";

interface SettingsStoreData {
  settings: SettingsState;
  activeCategory: SettingsCategory;
  loaded: boolean;
}

interface SettingsStoreActions {
  setActiveCategory: (category: SettingsCategory) => void;
  updateSettings: (partial: Partial<SettingsState>) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
  reset: () => void;
  togglePrivacy: () => void;
}

type SettingsStore = SettingsStoreData & SettingsStoreActions;

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: { ...SETTINGS_DEFAULTS },
  activeCategory: "ai",
  loaded: false,

  setActiveCategory: (category: SettingsCategory) => set({ activeCategory: category }),

  updateSettings: (partial: Partial<SettingsState>) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SettingsState>;
        set({
          settings: { ...SETTINGS_DEFAULTS, ...parsed },
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  saveToStorage: () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(get().settings));
    } catch {
      // storage full or unavailable
    }
  },

  reset: () => set({ settings: { ...SETTINGS_DEFAULTS }, activeCategory: "ai", loaded: true }),

  togglePrivacy: () => {
    set((state) => {
      const newSettings = { ...state.settings, privacyOn: !state.settings.privacyOn };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      } catch {
        // storage full or unavailable
      }
      return { settings: newSettings };
    });
  },
}));
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task A-3: AppLayout — 标题栏添加隐私开关按钮

**Files:**
- Modify: `src/l3-molecule/common/AppLayout.tsx`

- [ ] **Step 1: 在标题栏右侧设置按钮前添加隐私开关**

在 `import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";` 已有基础上，修改标题栏右侧的 div：

```tsx
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Typography } from "@l4/ui";
import { applyWindowMaterial } from "@l4/system/applyWindowMaterial";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const privacyOn = useSettingsStore((s) => s.settings.privacyOn);
  const togglePrivacy = useSettingsStore((s) => s.togglePrivacy);

  useEffect(() => {
    const settings = useSettingsStore.getState().settings;
    if (settings.windowMaterial && settings.windowMaterial !== "none") {
      applyWindowMaterial(settings.windowMaterial);
    }
  }, []);

  return (
    <div className="flex flex-col h-full w-full select-none">
      <header
        className="flex items-center justify-between h-10 px-4 shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <div className="flex items-center gap-1.5">
            <button
              className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-90 transition-all"
              onClick={() => window.close?.()}
              aria-label="关闭"
            />
            <button
              className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:brightness-90 transition-all"
              aria-label="最小化"
            />
            <button
              className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-90 transition-all"
              aria-label="全屏"
            />
          </div>
        </div>
        <Typography variant="label" color="#8E8E93">
          chatlog_alpha
        </Typography>
        <div style={{ width: 96, display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center", WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <button
            onClick={togglePrivacy}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              padding: 0,
              lineHeight: 1,
              color: privacyOn ? "#FFD60A" : "#8E8E93",
            }}
            aria-label="隐私模式"
            title={privacyOn ? "关闭隐私模式" : "开启隐私模式"}
          >
            {privacyOn ? "\u{1F512}" : "\u{1F513}"}
          </button>
          <button
            onClick={() => navigate("/settings")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              padding: 0,
              lineHeight: 1,
              color: "#8E8E93",
            }}
            aria-label="设置"
          >
            \u2699
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task A-4: ContactItem — 隐私模式头像模糊 + 名称掩码

**Files:**
- Modify: `src/l3-molecule/chat/ContactItem.tsx`

- [ ] **Step 1: 添加隐私模式判断**

```tsx
import { motion } from "framer-motion";
import { Avatar, Typography, Badge } from "@l4/ui";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";

interface ContactItemProps {
  displayName: string;
  lastMessage?: string;
  lastTime?: string;
  isGroup?: boolean;
  isSelected?: boolean;
  unreadCount?: number;
  onClick: () => void;
}

function maskText(text: string): string {
  return text.replace(/[^\s]/g, "*");
}

export function ContactItem({
  displayName,
  lastMessage = "",
  lastTime = "",
  isGroup = false,
  isSelected = false,
  unreadCount = 0,
  onClick,
}: ContactItemProps) {
  const privacyOn = useSettingsStore((s) => s.settings.privacyOn);

  const shownName = privacyOn ? maskText(displayName) : displayName;
  const shownMessage = privacyOn ? maskText(lastMessage) : lastMessage;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        cursor: "pointer",
        borderRadius: 12,
        margin: "2px 8px",
        backgroundColor: isSelected ? "rgba(0, 122, 255, 0.12)" : "transparent",
        transition: "background-color 0.15s ease",
      }}
    >
      <div style={{ filter: privacyOn ? "blur(8px)" : "none", transition: "filter 0.2s ease" }}>
        <Avatar
          alt={displayName}
          size={44}
          fallback={isGroup ? displayName.slice(0, 1) : displayName.slice(0, 2)}
        />
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography
            variant="label"
            color="var(--color-text-primary)"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 140,
            }}
          >
            {shownName}
          </Typography>
          <Typography variant="caption" color="var(--color-text-tertiary)">
            {lastTime}
          </Typography>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography
            variant="caption"
            color="var(--color-text-secondary)"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 160,
            }}
          >
            {shownMessage || ""}
          </Typography>
          {unreadCount > 0 && (
            <Badge count={unreadCount} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task A-5: MessageBubble — 隐私模式文本掩码

**Files:**
- Modify: `src/l3-molecule/chat/MessageBubble.tsx`

- [ ] **Step 1: 添加隐私模式文本掩码**

```tsx
import { motion } from "framer-motion";
import { Avatar, Typography } from "@l4/ui";
import type { HistoryMessage } from "@l2/api-docs/history";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";

interface MessageBubbleProps {
  message: HistoryMessage;
  isSelf: boolean;
  showAvatar: boolean;
}

function hasMedia(msg: HistoryMessage): boolean {
  return !!(msg.mediaType || msg.mediaMsg || msg.imageUrl || msg.mediaUrl);
}

function getTypeLabel(msg: HistoryMessage): string {
  if (msg.mediaType) {
    return `[${msg.mediaType}]`;
  }
  const t = msg.type;
  if (t === 3) return "[图片]";
  if (t === 4) return "[视频]";
  if (t === 34) return "[语音]";
  if (t === 6) return "[文件]";
  if (t === 49) return "[链接]";
  if (t === 47) return "[表情]";
  return "";
}

function formatTime(timeStr: string): string {
  try {
    return new Date(timeStr).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function maskText(text: string): string {
  return text.replace(/[^\s]/g, "*");
}

export function MessageBubble({ message, isSelf, showAvatar }: MessageBubbleProps) {
  const privacyOn = useSettingsStore((s) => s.settings.privacyOn);
  const typeLabel = getTypeLabel(message);
  const hasMediaContent = hasMedia(message);
  const rawContent = hasMediaContent && typeLabel ? typeLabel : message.content;
  const displayContent = privacyOn ? maskText(rawContent) : rawContent;
  const rawSenderName = message.isGroup && !isSelf ? message.sender : "";
  const senderName = privacyOn ? maskText(rawSenderName) : rawSenderName;

  if (!rawContent && !typeLabel) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      style={{
        display: "flex",
        flexDirection: isSelf ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 8,
        padding: "4px 16px",
        maxWidth: "80%",
        alignSelf: isSelf ? "flex-end" : "flex-start",
        width: "100%",
      }}
    >
      {showAvatar ? (
        <div style={{ filter: privacyOn ? "blur(6px)" : "none", transition: "filter 0.2s ease" }}>
          <Avatar alt={message.sender} size={32} fallback={message.sender.slice(0, 2)} />
        </div>
      ) : (
        <div style={{ width: 32, flexShrink: 0 }} />
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isSelf ? "flex-end" : "flex-start",
          gap: 2,
        }}
      >
        {senderName && (
          <Typography variant="caption" color="var(--color-text-tertiary)">
            {senderName}
          </Typography>
        )}

        <div
          style={{
            padding: "10px 14px",
            borderRadius: isSelf ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
            backgroundColor: isSelf
              ? "var(--color-bubble-self, #007AFF)"
              : "var(--color-bubble-other, rgba(255,255,255,0.9))",
            color: isSelf ? "#ffffff" : "var(--color-text-primary)",
            fontSize: 14,
            lineHeight: 1.5,
            wordBreak: "break-word",
            maxWidth: 360,
          }}
        >
          {displayContent}
        </div>

        <Typography variant="caption" color="var(--color-text-quaternary)">
          {formatTime(message.time)}
        </Typography>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task B-1: Rust sidecar.rs — 捕获 stdout/stderr 并 emit 事件

**Files:**
- Modify: `src-tauri/src/sidecar.rs`

- [ ] **Step 1: 重写 sidecar.rs，添加管道捕获和事件推送**

```rust
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, serde::Serialize)]
pub struct LogPayload {
    pub level: String,
    pub message: String,
}

pub struct SidecarState {
    pub child: Option<Child>,
}

impl SidecarState {
    pub fn new() -> Self {
        Self { child: None }
    }
}

pub fn spawn_sidecar_with_logs(
    app_handle: AppHandle,
    state: State<'_, Mutex<SidecarState>>,
) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if guard.child.is_some() {
        return Err("Sidecar already running".into());
    }

    let mut child = Command::new("binaries/chatlog_alpha-x86_64-pc-windows-msvc.exe")
        .arg("serve")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    if let Some(stdout) = child.stdout.take() {
        let handle = app_handle.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(text) = line {
                    let _ = handle.emit("sidecar-log", LogPayload {
                        level: "stdout".into(),
                        message: text,
                    });
                }
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        let handle = app_handle.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(text) = line {
                    let _ = handle.emit("sidecar-log", LogPayload {
                        level: "stderr".into(),
                        message: text,
                    });
                }
            }
        });
    }

    guard.child = Some(child);
    Ok("Sidecar started".into())
}

pub fn shutdown_sidecar(
    state: State<'_, Mutex<SidecarState>>,
) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if let Some(ref mut child) = guard.child {
        child.kill().map_err(|e| format!("Failed to kill sidecar: {}", e))?;
        child.wait().map_err(|e| format!("Failed to wait: {}", e))?;
    }

    guard.child = None;
    Ok("Sidecar stopped".into())
}

#[tauri::command]
pub async fn export_logs_command(
    logs: Vec<LogPayload>,
) -> Result<String, String> {
    use std::io::Write;
    let path = std::env::temp_dir().join("chatlog_alpha_export.log");
    let mut file = std::fs::File::create(&path)
        .map_err(|e| format!("无法创建日志文件: {}", e))?;
    for entry in &logs {
        let line = format!("[{}] {}\n", entry.level, entry.message);
        file.write_all(line.as_bytes())
            .map_err(|e| format!("写入日志失败: {}", e))?;
    }
    Ok(path.to_string_lossy().to_string())
}
```

- [ ] **Step 2: 验证**

Run: `cargo build -p chatlog-alpha-desktop 2>&1`
Expected: 编译成功

---

### Task B-2: Rust commands.rs — 更新 spawn_sidecar 签名 + 注册 export_logs

**Files:**
- Modify: `src-tauri/src/commands.rs`

- [ ] **Step 1: 修改 spawn_sidecar 接受 AppHandle + 新增 export_logs**

```rust
use tauri::{AppHandle, State};
use std::sync::Mutex;

use crate::port_killer;
use crate::sidecar::SidecarState;

#[tauri::command]
pub async fn kill_port(port: u16) -> Result<String, String> {
    port_killer::kill_port_if_occupied(port)
}

#[tauri::command]
pub async fn spawn_sidecar(
    app_handle: AppHandle,
    state: State<'_, Mutex<SidecarState>>,
) -> Result<String, String> {
    crate::sidecar::spawn_sidecar_with_logs(app_handle, state)
}

#[tauri::command]
pub async fn check_health(port: u16) -> Result<bool, String> {
    crate::health::check_health(port).await
}

#[tauri::command]
pub async fn shutdown_sidecar(
    state: State<'_, Mutex<SidecarState>>,
) -> Result<String, String> {
    crate::sidecar::shutdown_sidecar(state)
}

#[tauri::command]
pub async fn get_system_theme() -> Result<String, String> {
    crate::theme::get_system_theme()
}

#[tauri::command]
pub async fn export_logs(
    logs: Vec<crate::sidecar::LogPayload>,
) -> Result<String, String> {
    crate::sidecar::export_logs_command(logs)
}
```

- [ ] **Step 2: 验证**

Run: `cargo build -p chatlog-alpha-desktop 2>&1`
Expected: 编译成功

---

### Task B-3: Rust lib.rs — 注册 export_logs command

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 在 generate_handler! 宏中添加 export_logs**

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

Run: `cargo build -p chatlog-alpha-desktop 2>&1`
Expected: 编译成功

---

### Task B-4: L4 系统原子 — listenSidecarLogs.ts

**Files:**
- Create: `src/l4-atom/system/listenSidecarLogs.ts`

- [ ] **Step 1: 创建 Tauri event 监听原子**

```typescript
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface SidecarLogPayload {
  level: "stdout" | "stderr";
  message: string;
}

export function listenSidecarLogs(
  callback: (payload: SidecarLogPayload) => void
): Promise<UnlistenFn> {
  return listen<SidecarLogPayload>("sidecar-log", (event) => {
    callback(event.payload);
  });
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task B-5: L4 系统原子 index.ts — 添加导出

**Files:**
- Modify: `src/l4-atom/system/index.ts`

- [ ] **Step 1: 追加 listenSidecarLogs 导出**

在文件末尾追加：

```typescript
export { listenSidecarLogs } from "./listenSidecarLogs";
export type { SidecarLogPayload } from "./listenSidecarLogs";
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task B-6: useDevConsoleStore — 开发者控制台状态管理

**Files:**
- Create: `src/l2-coordinator/data-clerk/stores/useDevConsoleStore.ts`

- [ ] **Step 1: 创建 Store**

```typescript
import { create } from "zustand";

export interface LogEntry {
  id: number;
  time: string;
  level: "stdout" | "stderr";
  message: string;
}

const MAX_LOGS = 5000;

let nextId = 0;

interface DevConsoleState {
  logs: LogEntry[];
  visible: boolean;
  autoScroll: boolean;
}

interface DevConsoleActions {
  addLog: (level: "stdout" | "stderr", message: string) => void;
  clear: () => void;
  toggle: () => void;
  setVisible: (visible: boolean) => void;
}

type DevConsoleStore = DevConsoleState & DevConsoleActions;

export const useDevConsoleStore = create<DevConsoleStore>((set) => ({
  logs: [],
  visible: false,
  autoScroll: true,

  addLog: (level: "stdout" | "stderr", message: string) =>
    set((state) => {
      const entry: LogEntry = {
        id: nextId++,
        time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
        level,
        message,
      };
      const logs = [...state.logs, entry];
      if (logs.length > MAX_LOGS) {
        logs.splice(0, logs.length - MAX_LOGS);
      }
      return { logs };
    }),

  clear: () => set({ logs: [] }),

  toggle: () => set((state) => ({ visible: !state.visible })),

  setVisible: (visible: boolean) => set({ visible }),
}));
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task B-7: useDevConsoleCommander — 控制台指挥官

**Files:**
- Create: `src/l2-coordinator/commander/useDevConsoleCommander.ts`

- [ ] **Step 1: 创建 Commander**

```typescript
import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listenSidecarLogs } from "@l4/system/listenSidecarLogs";
import { useDevConsoleStore } from "@/l2-coordinator/data-clerk/stores/useDevConsoleStore";

export function useDevConsoleCommander() {
  const store = useDevConsoleStore();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listenSidecarLogs((payload) => {
      useDevConsoleStore.getState().addLog(payload.level, payload.message);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const exportLogs = useCallback(async (): Promise<string | null> => {
    try {
      const { logs } = useDevConsoleStore.getState();
      const payload = logs.map((l) => ({ level: l.level, message: l.message }));
      const path = await invoke<string>("export_logs", { logs: payload });
      return path;
    } catch (error) {
      console.error("导出日志失败:", error);
      return null;
    }
  }, []);

  return {
    logs: store.logs,
    visible: store.visible,
    autoScroll: store.autoScroll,
    toggle: store.toggle,
    clear: store.clear,
    exportLogs,
  };
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task B-8: DevConsole — 控制台 UI 组件

**Files:**
- Create: `src/l3-molecule/common/DevConsole.tsx`

- [ ] **Step 1: 创建终端风格控制台面板**

```tsx
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDevConsoleCommander } from "@l2/commander/useDevConsoleCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";

export function DevConsole() {
  const { logs, visible, toggle, clear, exportLogs } = useDevConsoleCommander();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && visible) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, visible]);

  const handleExport = async () => {
    const path = await exportLogs();
    if (path) {
      alert(`日志已导出到: ${path}`);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 200, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            borderTop: "1px solid var(--color-border)",
            backgroundColor: "#1e1e2e",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              flexShrink: 0,
            }}
          >
            <Typography variant="caption" weight={600} color="rgba(255,255,255,0.5)">
              开发者控制台
              <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.3)" }}>
                {logs.length} 条日志
              </span>
            </Typography>
            <div style={{ display: "flex", gap: 4 }}>
              <AppleButton variant="ghost" size="sm" onClick={handleExport} style={{ padding: "0 8px", minWidth: 40, fontSize: 12 }}>
                导出
              </AppleButton>
              <AppleButton variant="ghost" size="sm" onClick={clear} style={{ padding: "0 8px", minWidth: 40, fontSize: 12 }}>
                清空
              </AppleButton>
              <AppleButton variant="ghost" size="sm" onClick={toggle} style={{ padding: "0 6px", minWidth: 24, fontSize: 12 }}>
                ×
              </AppleButton>
            </div>
          </div>
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "4px 12px",
              fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
              fontSize: 12,
              lineHeight: "18px",
            }}
          >
            {logs.length === 0 && (
              <Typography variant="caption" color="rgba(255,255,255,0.2)">
                等待 Sidecar 输出...
              </Typography>
            )}
            {logs.map((log) => (
              <div key={log.id} style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{log.time}</span>
                <span
                  style={{
                    color: log.level === "stderr" ? "#FF6B6B" : "rgba(255,255,255,0.7)",
                    flexShrink: 0,
                    width: 50,
                  }}
                >
                  {log.level === "stderr" ? "STDERR" : "STDOUT"}
                </span>
                <span
                  style={{
                    color: log.level === "stderr" ? "#FF6B6B" : "rgba(255,255,255,0.85)",
                    wordBreak: "break-all",
                  }}
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task B-9: AppLayout — 标题栏添加控制台按钮

**Files:**
- Modify: `src/l3-molecule/common/AppLayout.tsx`

- [ ] **Step 1: 在标题栏右侧隐私按钮和设置按钮之间添加控制台按钮**

修改标题栏右侧 div 的宽度和内容。将原来的 `width: 96` 改为 `width: 128`，在隐私按钮和设置按钮之间插入：

```tsx
import { useDevConsoleStore } from "@l2/data-clerk/stores/useDevConsoleStore";
```

在组件内添加：
```typescript
const toggleConsole = useDevConsoleStore((s) => s.toggle);
```

在隐私按钮和设置按钮之间添加：
```tsx
<button
  onClick={toggleConsole}
  style={{
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    padding: 0,
    lineHeight: 1,
    color: "#8E8E93",
  }}
  aria-label="开发者控制台"
  title="开发者控制台"
>
  {"\u{1F5A5}"}
</button>
```

完整修改后的 AppLayout.tsx：
```tsx
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Typography } from "@l4/ui";
import { applyWindowMaterial } from "@l4/system/applyWindowMaterial";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useDevConsoleStore } from "@l2/data-clerk/stores/useDevConsoleStore";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const privacyOn = useSettingsStore((s) => s.settings.privacyOn);
  const togglePrivacy = useSettingsStore((s) => s.togglePrivacy);
  const toggleConsole = useDevConsoleStore((s) => s.toggle);

  useEffect(() => {
    const settings = useSettingsStore.getState().settings;
    if (settings.windowMaterial && settings.windowMaterial !== "none") {
      applyWindowMaterial(settings.windowMaterial);
    }
  }, []);

  return (
    <div className="flex flex-col h-full w-full select-none">
      <header
        className="flex items-center justify-between h-10 px-4 shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <div className="flex items-center gap-1.5">
            <button
              className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-90 transition-all"
              onClick={() => window.close?.()}
              aria-label="关闭"
            />
            <button
              className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:brightness-90 transition-all"
              aria-label="最小化"
            />
            <button
              className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-90 transition-all"
              aria-label="全屏"
            />
          </div>
        </div>
        <Typography variant="label" color="#8E8E93">
          chatlog_alpha
        </Typography>
        <div style={{ width: 128, display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center", WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <button
            onClick={togglePrivacy}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              padding: 0,
              lineHeight: 1,
              color: privacyOn ? "#FFD60A" : "#8E8E93",
            }}
            aria-label="隐私模式"
            title={privacyOn ? "关闭隐私模式" : "开启隐私模式"}
          >
            {privacyOn ? "\u{1F512}" : "\u{1F513}"}
          </button>
          <button
            onClick={toggleConsole}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              padding: 0,
              lineHeight: 1,
              color: "#8E8E93",
            }}
            aria-label="开发者控制台"
            title="开发者控制台"
          >
            {"\u{1F5A5}"}
          </button>
          <button
            onClick={() => navigate("/settings")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              padding: 0,
              lineHeight: 1,
              color: "#8E8E93",
            }}
            aria-label="设置"
          >
            \u2699
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task B-10: DashboardView — 集成 DevConsole

**Files:**
- Modify: `src/l1-entry/pages/DashboardView.tsx`

- [ ] **Step 1: 在 DashboardView 底部 StatusBar 上方集成 DevConsole**

在 import 区域添加：
```typescript
import { DevConsole } from "@l3/common/DevConsole";
import { useDevConsoleCommander } from "@l2/commander/useDevConsoleCommander";
```

在组件内部添加 hook 调用：
```typescript
useDevConsoleCommander();
```

将底部的 StatusBar 行改为同时渲染 DevConsole：
```tsx
<DevConsole />
<StatusBar status={sidecarStatus} indexStatus={indexStatus} />
```

完整修改后的 DashboardView.tsx（仅展示变更部分，其余保持不变）：

在文件顶部 import 区域末尾追加：
```typescript
import { DevConsole } from "@l3/common/DevConsole";
import { useDevConsoleCommander } from "@l2/commander/useDevConsoleCommander";
```

在 `export function DashboardView()` 内部，`const graph = useGraphCommander();` 之后追加：
```typescript
useDevConsoleCommander();
```

在 return 中，将：
```tsx
<StatusBar status={sidecarStatus} indexStatus={indexStatus} />
```
替换为：
```tsx
<DevConsole />
<StatusBar status={sidecarStatus} indexStatus={indexStatus} />
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task C-1: useGraphStore — 扩展筛选/布局/时间轴状态

**Files:**
- Modify: `src/l2-coordinator/data-clerk/stores/useGraphStore.ts`

- [ ] **Step 1: 追加新状态字段和 actions**

在 `GraphState` interface 和 `GraphActions` interface 以及 initialState 和 store 实现中追加：

在 `GraphState` 的 `tooltipCoord` 后追加：
```typescript
  visibleEntityKinds: EntityKind[];
  layoutMode: "force" | "radial";
  timelineVisible: boolean;
  highlightedTimelineId: string | null;
```

在 `GraphActions` 的 `reset` 前追加：
```typescript
  setVisibleEntityKinds: (kinds: EntityKind[]) => void;
  setLayoutMode: (mode: "force" | "radial") => void;
  setTimelineVisible: (visible: boolean) => void;
  setHighlightedTimeline: (id: string | null) => void;
```

在 initialState 中追加：
```typescript
  visibleEntityKinds: ["person","organization","project","product","group","topic","keyword","event","unknown"],
  layoutMode: "force",
  timelineVisible: false,
  highlightedTimelineId: null,
```

在 store 实现 `reset` 前追加：
```typescript
  setVisibleEntityKinds: (kinds: EntityKind[]) => set({ visibleEntityKinds: kinds }),
  setLayoutMode: (layoutMode: "force" | "radial") => set({ layoutMode }),
  setTimelineVisible: (timelineVisible: boolean) => set({ timelineVisible }),
  setHighlightedTimeline: (highlightedTimelineId: string | null) => set({ highlightedTimelineId }),
```

需要在文件顶部 `import type { VisualizeResult }` 改为：
```typescript
import type { EntityKind, VisualizeResult } from "@/l2-coordinator/api-docs/graph";
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task C-2: useGraphCommander — 扩展新方法

**Files:**
- Modify: `src/l2-coordinator/commander/useGraphCommander.ts`

- [ ] **Step 1: 追加 setVisibleKinds, setLayoutMode, setTimelineVisible, highlightTimelineEntry**

在 `useGraphCommander` 函数内的现有方法之后、return 之前追加：

```typescript
  const setVisibleKinds = useCallback((kinds: EntityKind[]) => {
    useGraphStore.getState().setVisibleEntityKinds(kinds);
  }, []);

  const setLayoutMode = useCallback((mode: "force" | "radial") => {
    useGraphStore.getState().setLayoutMode(mode);
  }, []);

  const setTimelineVisible = useCallback((visible: boolean) => {
    useGraphStore.getState().setTimelineVisible(visible);
  }, []);

  const highlightTimelineEntry = useCallback((timelineId: string) => {
    const { data } = useGraphStore.getState();
    if (!data) return;
    const entry = data.timeline.find((t, i) => `${i}` === timelineId);
    if (!entry || !entry.source) return;
    const matchedNode = data.nodes.find((n) =>
      n.name.toLowerCase() === entry.source!.toLowerCase()
    );
    if (matchedNode) {
      useGraphStore.getState().setPulsedNode(matchedNode.id);
      setTimeout(() => useGraphStore.getState().setPulsedNode(null), 4000);
    }
  }, []);
```

在顶部 import 添加 `import type { EntityKind }`：
```typescript
import type { EntityKind, VisualizeParams } from "@/l2-coordinator/api-docs/graph";
```

在 return 对象中追加：
```typescript
    visibleEntityKinds: store.visibleEntityKinds,
    layoutMode: store.layoutMode,
    timelineVisible: store.timelineVisible,
    highlightedTimelineId: store.highlightedTimelineId,
    setVisibleKinds,
    setLayoutMode,
    setTimelineVisible,
    highlightTimelineEntry,
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task C-3: GraphControlBar — 图谱控制栏组件

**Files:**
- Create: `src/l3-molecule/graph/GraphControlBar.tsx`

- [ ] **Step 1: 创建控制栏组件**

```tsx
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import type { EntityKind } from "@/l2-coordinator/api-docs/graph";

const KIND_GROUPS: { label: string; kinds: EntityKind[] }[] = [
  { label: "人物", kinds: ["person"] },
  { label: "组织", kinds: ["organization", "group"] },
  { label: "主题", kinds: ["topic", "keyword", "event"] },
  { label: "项目", kinds: ["project", "product"] },
  { label: "其他", kinds: ["customer", "unknown"] },
];

const TIME_OPTIONS: { label: string; value: string }[] = [
  { label: "全部", value: "" },
  { label: "近7天", value: "7d" },
  { label: "近30天", value: "30d" },
  { label: "近90天", value: "90d" },
];

export function GraphControlBar() {
  const graph = useGraphCommander();
  const { visibleEntityKinds, timeWindow, layoutMode, autoRotate, timelineVisible } = graph;

  const toggleKind = (kind: EntityKind) => {
    if (visibleEntityKinds.includes(kind)) {
      graph.setVisibleKinds(visibleEntityKinds.filter((k) => k !== kind));
    } else {
      graph.setVisibleKinds([...visibleEntityKinds, kind]);
    }
  };

  const toggleAllKinds = () => {
    const allKinds: EntityKind[] = ["person","organization","project","product","customer","group","topic","keyword","event","unknown"];
    if (visibleEntityKinds.length === allKinds.length) {
      graph.setVisibleKinds([]);
    } else {
      graph.setVisibleKinds(allKinds);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "2px 8px",
        borderBottom: "1px solid rgba(74,158,255,0.12)",
        flexShrink: 0,
        flexWrap: "wrap",
        minHeight: 30,
      }}
    >
      <div style={{ display: "flex", gap: 2 }}>
        <button
          onClick={toggleAllKinds}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
            padding: "1px 4px",
          }}
        >
          {visibleEntityKinds.length === 10 ? "全部" : "无"}
        </button>
        {KIND_GROUPS.map((group) => {
          const allActive = group.kinds.every((k) => visibleEntityKinds.includes(k));
          const partialActive = group.kinds.some((k) => visibleEntityKinds.includes(k)) && !allActive;
          return (
            <AppleButton
              key={group.label}
              variant={allActive ? "primary" : partialActive ? "secondary" : "ghost"}
              size="sm"
              onClick={() => group.kinds.forEach(toggleKind)}
              style={{ padding: "0 6px", minWidth: 36, fontSize: 11 }}
            >
              {group.label}
            </AppleButton>
          );
        })}
      </div>

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />

      <div style={{ display: "flex", gap: 2 }}>
        {TIME_OPTIONS.map((opt) => (
          <AppleButton
            key={opt.value}
            variant={timeWindow === opt.value ? "primary" : "ghost"}
            size="sm"
            onClick={() => {
              graph.setTimeWindow(opt.value);
              graph.refreshGraph();
            }}
            style={{ padding: "0 6px", minWidth: 40, fontSize: 11 }}
          >
            {opt.label}
          </AppleButton>
        ))}
      </div>

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />

      <div style={{ display: "flex", gap: 2 }}>
        <AppleButton
          variant={layoutMode === "force" ? "primary" : "ghost"}
          size="sm"
          onClick={() => graph.setLayoutMode("force")}
          style={{ padding: "0 6px", minWidth: 50, fontSize: 11 }}
        >
          力导向
        </AppleButton>
        <AppleButton
          variant={layoutMode === "radial" ? "primary" : "ghost"}
          size="sm"
          onClick={() => graph.setLayoutMode("radial")}
          style={{ padding: "0 6px", minWidth: 36, fontSize: 11 }}
        >
          径向
        </AppleButton>
      </div>

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />

      <AppleButton
        variant="ghost"
        size="sm"
        onClick={graph.refreshGraph}
        style={{ padding: "0 6px", minWidth: 30, fontSize: 11 }}
      >
        {"\u{1F504}"}
      </AppleButton>

      <button
        onClick={() => graph.toggleAutoRotate()}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          color: autoRotate ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
          padding: "0 4px",
        }}
        title="自动旋转"
      >
        {"\u25EF"}
      </button>

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />

      <AppleButton
        variant={timelineVisible ? "primary" : "ghost"}
        size="sm"
        onClick={() => graph.setTimelineVisible(!timelineVisible)}
        style={{ padding: "0 6px", minWidth: 36, fontSize: 11 }}
      >
        时间轴
      </AppleButton>
    </div>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task C-4: GraphTimeline — 时间轴叠加组件

**Files:**
- Create: `src/l3-molecule/graph/GraphTimeline.tsx`

- [ ] **Step 1: 创建时间轴组件**

```tsx
import { motion, AnimatePresence } from "framer-motion";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import type { GraphTimeline as GraphTimelineEntry } from "@/l2-coordinator/api-docs/graph";

const TYPE_ICONS: Record<string, string> = {
  event: "\u{1F4C5}",
  fact: "\u{1F4CB}",
  relation: "\u{1F517}",
};

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GraphTimeline() {
  const timelineVisible = useGraphStore((s) => s.timelineVisible);
  const data = useGraphStore((s) => s.data);
  const highlightedTimelineId = useGraphStore((s) => s.highlightedTimelineId);
  const graph = useGraphCommander();

  if (!data || !data.timeline || data.timeline.length === 0) return null;

  return (
    <AnimatePresence>
      {timelineVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 150, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            borderTop: "1px solid rgba(74,158,255,0.15)",
            flexShrink: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "2px 8px",
              borderBottom: "1px solid rgba(74,158,255,0.1)",
              flexShrink: 0,
            }}
          >
            <Typography variant="caption" weight={600} color="var(--color-text-secondary)">
              时间轴 · {data.timeline.length} 条
            </Typography>
            <AppleButton
              variant="ghost"
              size="sm"
              onClick={() => graph.setTimelineVisible(false)}
              style={{ padding: "0 6px", minWidth: 24, fontSize: 12 }}
            >
              ×
            </AppleButton>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
            {data.timeline.map((entry: GraphTimelineEntry, i: number) => {
              const id = `${i}`;
              const isHighlighted = highlightedTimelineId === id;
              return (
                <div
                  key={id}
                  onClick={() => graph.highlightTimelineEntry(id)}
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: "4px 6px",
                    cursor: "pointer",
                    borderRadius: 6,
                    background: isHighlighted ? "rgba(74,158,255,0.1)" : "transparent",
                    marginBottom: 2,
                  }}
                >
                  <span style={{ fontSize: 12, flexShrink: 0 }}>
                    {TYPE_ICONS[entry.type] ?? "\u{2022}"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <Typography
                        variant="caption"
                        weight={600}
                        color="var(--color-text-primary)"
                        style={{ fontSize: 11 }}
                      >
                        {entry.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="var(--color-text-tertiary)"
                        style={{ fontSize: 10, flexShrink: 0 }}
                      >
                        {formatTime(entry.time)}
                      </Typography>
                    </div>
                    {entry.description && (
                      <Typography
                        variant="caption"
                        color="var(--color-text-tertiary)"
                        style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {entry.description}
                      </Typography>
                    )}
                    {entry.source && (
                      <Typography variant="caption" color="var(--color-accent)" style={{ fontSize: 10 }}>
                        来源: {entry.source}
                      </Typography>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task C-5: GraphEngine — 实体筛选 + 径向布局支持

**Files:**
- Modify: `src/l3-molecule/graph/GraphEngine.tsx`

- [ ] **Step 1: 添加筛选和径向布局逻辑**

在 import 区域，`useGraphStore` 已经 import。在 `GraphEngine` 组件函数内，`const data = useGraphStore((s) => s.data);` 之后追加：

```typescript
  const visibleEntityKinds = useGraphStore((s) => s.visibleEntityKinds);
  const layoutMode = useGraphStore((s) => s.layoutMode);
```

修改 `nodePositions` 的 `useMemo`，将 `runForceLayout(data.nodes, data.edges)` 替换为：

```typescript
  const filteredNodes = useMemo(() => {
    if (!data) return [];
    return data.nodes.filter((n) => visibleEntityKinds.includes(n.kind));
  }, [data, visibleEntityKinds]);

  const filteredEdges = useMemo(() => {
    if (!data) return [];
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    return data.edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );
  }, [data, filteredNodes]);

  const nodePositions = useMemo(() => {
    if (!data || filteredNodes.length === 0) return new Map<string, THREE.Vector3>();
    if (layoutMode === "radial") {
      return runRadialLayout(filteredNodes);
    }
    return runForceLayout(filteredNodes, filteredEdges);
  }, [data, filteredNodes, filteredEdges, layoutMode]);
```

在 `runForceLayout` 函数之后（或之前），添加径向布局函数：

```typescript
function runRadialLayout(
  nodes: GraphNode[],
): Map<string, THREE.Vector3> {
  const positions = new Map<string, THREE.Vector3>();
  const sorted = [...nodes].sort((a, b) => b.value - a.value);
  const total = sorted.length;
  const rings = Math.ceil(Math.sqrt(total));
  let idx = 0;

  for (let ring = 0; ring < rings && idx < total; ring++) {
    const radius = 1.5 + ring * 1.8;
    const countInRing = ring === 0
      ? 1
      : Math.ceil((total - 1) * (ring / rings));
    const actualCount = Math.min(countInRing, total - idx);

    for (let i = 0; i < actualCount && idx < total; i++) {
      const angle = (i / actualCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = ring * 0.5 - (rings * 0.25);
      positions.set(sorted[idx].id, new THREE.Vector3(x, y, z));
      idx++;
    }
  }

  return positions;
}
```

在渲染的边/node 循环中，将 `data.edges` 替换为 `filteredEdges`，将 `data.nodes` 替换为 `filteredNodes`，将 `GraphLabels` 的 `nodes` prop 也改为 `filteredNodes`。

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task C-6: GraphCanvas — 集成控制栏 + 时间轴

**Files:**
- Modify: `src/l3-molecule/graph/GraphCanvas.tsx`

- [ ] **Step 1: 在 GraphCanvas 中集成 GraphControlBar 和 GraphTimeline**

在 import 区域追加：
```typescript
import { GraphControlBar } from "./GraphControlBar";
import { GraphTimeline } from "./GraphTimeline";
```

在 minimized 为 false 的分支中，标题栏之后、`{loading && ...}` 的 div 之前插入 `GraphControlBar`：

```tsx
<GraphControlBar />
```

在 Canvas 的闭合标签 `</Canvas>` 之后、`GraphTooltip` 之前（或 resize handle 之前）插入 `GraphTimeline`：

```tsx
<GraphTimeline />
```

最终 GraphCanvas.tsx 的 import 区域：
```typescript
import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { motion, AnimatePresence } from "framer-motion";
import { GraphEngine } from "./GraphEngine";
import { GraphTooltip } from "./GraphTooltip";
import { GraphControlBar } from "./GraphControlBar";
import { GraphTimeline } from "./GraphTimeline";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { useGraphStore } from "@l2/data-clerk/stores/useGraphStore";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import { Spinner } from "@l4/ui/Spinner";
```

GraphCanvas 渲染体（非 minimized 分支）：
```tsx
{minimized ? (
  <div
    onClick={graph.toggleMinimize}
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      fontSize: 24,
    }}
  >
    {"\u{1F578}"}
  </div>
) : (
  <>
    <div
      onMouseDown={handleTitleMouseDown}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px",
        cursor: "move",
        borderBottom: "1px solid rgba(74,158,255,0.15)",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      <Typography variant="caption" weight={600} color="var(--color-text-secondary)">
        知识图谱
        {data && ` · ${data.nodes.length} 节点 · ${data.edges.length} 连线`}
      </Typography>
      <div style={{ display: "flex", gap: 4 }}>
        <AppleButton
          variant="ghost"
          size="sm"
          onClick={graph.toggleMinimize}
          style={{ padding: "0 4px", minWidth: 24, fontSize: 12 }}
        >
          _
        </AppleButton>
        <AppleButton
          variant="ghost"
          size="sm"
          onClick={graph.closeGraph}
          style={{ padding: "0 4px", minWidth: 24, fontSize: 12 }}
        >
          ×
        </AppleButton>
      </div>
    </div>

    <GraphControlBar />

    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            background: "rgba(10,10,26,0.6)",
          }}
        >
          <Spinner size={24} label="加载图谱数据..." />
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            background: "rgba(10,10,26,0.8)",
            gap: 12,
          }}
        >
          <Typography variant="body" color="#FF3B30">
            {error}
          </Typography>
          <AppleButton variant="secondary" size="sm" onClick={graph.refreshGraph}>
            重试
          </AppleButton>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: "#0a0a1a" }}
      >
        <GraphEngine
          onNodeHover={graph.hoverNode}
          onNodeDblClick={graph.selectNode}
        />
      </Canvas>
    </div>

    <GraphTimeline />

    <GraphTooltip />

    <div
      onMouseDown={handleResizeMouseDown}
      style={{
        position: "absolute",
        right: 0,
        bottom: 0,
        width: 16,
        height: 16,
        cursor: "nwse-resize",
      }}
    />
  </>
)}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task D-1: constants.ts — Sprint 5b 常量

**Files:**
- Modify: `src/utils/constants.ts`

- [ ] **Step 1: 在文件末尾追加 Sprint 5b 常量**

```typescript
// ========== Sprint 5b: 高级功能 Part B 常量 ==========

export const DEV_CONSOLE_MAX_LOGS = 5000;
export const DEV_CONSOLE_MAX_HEIGHT = 200;
export const DEV_CONSOLE_FONT_SIZE = 12;

export const GRAPH_TIMELINE_HEIGHT = 150;
export const GRAPH_CONTROL_BAR_HEIGHT = 32;

export const PRIVACY_STORAGE_KEY = "chatlog_alpha_settings";
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### Task D-2: 最终验证与提交

**Files:** 所有修改文件

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

Run: `cargo build -p chatlog-alpha-desktop 2>&1`
Expected: 编译成功

- [ ] **Step 5: 架构合规检查**

- [ ] L4 原子间无相互 import
- [ ] L3 分子间无相互 import
- [ ] L1 页面无业务逻辑

- [ ] **Step 6: 提交**

```bash
git add .
git commit -m "feat: Sprint 5b - privacy mode, dev console, graph control bar, timeline overlay"
```

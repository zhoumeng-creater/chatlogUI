# Sprint 5a: 高级功能 (Part A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SettingsView page (`/settings`), graph hover tooltip, graph↔chat bidirectional cross-linking, and platform-native window materials.

**Architecture:** SettingsView is a new L1 page with L2 SettingsStore + SettingsCommander + L3 settings molecules. Graph tooltip uses R3F `useThree` for 3D→2D coordinate mapping with HTML overlay. Cross-linking bridges GraphCommander ↔ ChatCommander through L2 coordination. Window materials are implemented in Rust (`material.rs`) with a Tauri command.

**Tech Stack:** React 18, TypeScript 5, Zustand 5, React Three Fiber, @react-three/drei, Tauri v2, Framer Motion

---

## 任务依赖图

```
Group A: Settings System
T-0.1 (settings.ts types) ──→ T-0.2 (constants) ──→ T-1.1 (useSettingsStore)
                                                        │
                                                        └──→ T-2.1 (useSettingsCommander)
                                                                │
                                                                └──→ T-3.1 (SettingsLayout)
                                                                        │
                                                          ┌─────────────┼─────────────┐
                                                          ↓             ↓             ↓
                                                    T-3.2 (AIModel) T-3.3 (Appear) T-3.4 (Data) T-3.5 (About)
                                                                        │
                                                                        └──→ T-6.1 (SettingsView)
                                                                                │
                                                                                └──→ T-6.2→T-6.3

Group B: Graph Enhancement
T-4.1 (GraphStore ext) ──→ T-4.2 (GraphCommander ext) ──→ T-4.3 (Node3D) ──→ T-4.4 (Tooltip)
                                                                                    │
                                                                                    └──→ T-4.5 (Engine) ──→ T-4.6 (DashboardView)

Group C: Window Material (parallel with A & B)
T-5.1 (material.rs) ──→ T-5.2 (lib.rs+commands.rs) ──→ T-5.3 (applyWindowMaterial.ts) ──→ T-5.4 (AppLayout)

Final:
T-7.1 (verification + commit)
```

**并行建议:** Group A、B、C 三者可并行开发。

---

### 任务 T-0.1: 设置 API 类型定义

**Files:**
- Create: `src/l2-coordinator/api-docs/settings.ts`

- [ ] **Step 1: 创建类型文件**

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
};
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-0.2: Settings 常量追加

**Files:**
- Modify: `src/utils/constants.ts:38`

- [ ] **Step 1: 在文件末尾追加常量**

```typescript
// ========== Sprint 5a: Settings 常量 ==========

export const SETTINGS_STORAGE_KEY = "chatlog_alpha_settings";
export const SETTINGS_SIDEBAR_WIDTH = 180;
export const SETTINGS_CONTENT_MAX_WIDTH = 600;
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-1.1: useSettingsStore 状态管理

**Files:**
- Create: `src/l2-coordinator/data-clerk/stores/useSettingsStore.ts`

- [ ] **Step 1: 创建 Store**

```typescript
import { create } from "zustand";
import type { SettingsCategory, SettingsState, ThemeMode, FontSize, WindowMaterial } from "@/l2-coordinator/api-docs/settings";
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
}));
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-2.1: useSettingsCommander 指挥官

**Files:**
- Create: `src/l2-coordinator/commander/useSettingsCommander.ts`

- [ ] **Step 1: 创建 Commander**

```typescript
import { useCallback, useEffect } from "react";
import { useSettingsStore } from "@/l2-coordinator/data-clerk/stores/useSettingsStore";
import type { SettingsCategory, SettingsState } from "@/l2-coordinator/api-docs/settings";

export function useSettingsCommander() {
  const store = useSettingsStore();

  useEffect(() => {
    if (!store.loaded) {
      store.loadFromStorage();
    }
  }, [store.loaded, store]);

  const setActiveCategory = useCallback((category: SettingsCategory) => {
    store.setActiveCategory(category);
  }, [store]);

  const updateAndSave = useCallback((partial: Partial<SettingsState>) => {
    store.updateSettings(partial);
    store.saveToStorage();
  }, [store]);

  const reset = useCallback(() => {
    store.reset();
    store.saveToStorage();
  }, [store]);

  return {
    settings: store.settings,
    activeCategory: store.activeCategory,
    loaded: store.loaded,
    setActiveCategory,
    updateAndSave,
    reset,
  };
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-3.1: SettingsLayout — 左侧导航 + 右侧内容区

**Files:**
- Create: `src/l3-molecule/settings/SettingsLayout.tsx`

- [ ] **Step 1: 创建布局组件**

```tsx
import type { ReactNode } from "react";
import type { SettingsCategory } from "@/l2-coordinator/api-docs/settings";
import { SETTINGS_SIDEBAR_WIDTH } from "@/utils/constants";
import { GlassPanel } from "@l4/ui/GlassPanel";
import { Typography } from "@l4/ui/Typography";
import { useSettingsCommander } from "@l2/commander/useSettingsCommander";

const CATEGORIES: { key: SettingsCategory; label: string }[] = [
  { key: "ai", label: "AI 模型" },
  { key: "appearance", label: "外观" },
  { key: "data", label: "数据" },
  { key: "about", label: "关于" },
];

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const { activeCategory, setActiveCategory } = useSettingsCommander();

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div
        style={{
          width: SETTINGS_SIDEBAR_WIDTH,
          minWidth: SETTINGS_SIDEBAR_WIDTH,
          flexShrink: 0,
          paddingTop: 8,
        }}
      >
        <GlassPanel intensity="light">
          <div style={{ padding: 8 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: activeCategory === cat.key
                    ? "rgba(0, 122, 255, 0.1)"
                    : "transparent",
                  cursor: "pointer",
                  marginBottom: 2,
                }}
              >
                <Typography
                  variant="body"
                  weight={activeCategory === cat.key ? 600 : 400}
                  color={activeCategory === cat.key ? "var(--color-accent)" : "var(--color-text-primary)"}
                >
                  {cat.label}
                </Typography>
              </button>
            ))}
          </div>
        </GlassPanel>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 32px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-3.2: AIModelSettings — AI 模型配置

**Files:**
- Create: `src/l3-molecule/settings/AIModelSettings.tsx`

- [ ] **Step 1: 创建 AI 模型设置组件**

```tsx
import { useSettingsCommander } from "@l2/commander/useSettingsCommander";
import { useAiCommander } from "@l2/commander/useAiCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import { GlassPanel } from "@l4/ui/GlassPanel";
import type { LLMProvider } from "@/l2-coordinator/api-docs/semantic";

const PROVIDERS: { key: string; label: string }[] = [
  { key: "ollama", label: "Ollama (本地)" },
  { key: "glm", label: "智谱 GLM" },
  { key: "deepseek", label: "DeepSeek" },
];

export function AIModelSettings() {
  const { settings, updateAndSave } = useSettingsCommander();
  const { testConnection } = useAiCommander();

  const handleProviderChange = (provider: string) => {
    updateAndSave({ aiProvider: provider });
  };

  return (
    <div>
      <Typography variant="h2" style={{ marginBottom: 24 }}>AI 模型</Typography>

      <GlassPanel>
        <div style={{ padding: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            模型提供商
          </Typography>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {PROVIDERS.map((p) => (
              <AppleButton
                key={p.key}
                variant={settings.aiProvider === p.key ? "primary" : "secondary"}
                size="sm"
                onClick={() => handleProviderChange(p.key)}
              >
                {p.label}
              </AppleButton>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <Typography variant="caption" color="var(--color-text-secondary)">
              API 端点
            </Typography>
            <input
              value={settings.aiEndpoint}
              onChange={(e) => updateAndSave({ aiEndpoint: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
                fontSize: 14,
                marginTop: 4,
              }}
            />
          </div>

          {settings.aiProvider !== "ollama" && (
            <div style={{ marginBottom: 12 }}>
              <Typography variant="caption" color="var(--color-text-secondary)">
                API Key
              </Typography>
              <input
                type="password"
                value={settings.aiApiKey}
                onChange={(e) => updateAndSave({ aiApiKey: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  fontSize: 14,
                  marginTop: 4,
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <Typography variant="caption" color="var(--color-text-secondary)">
              模型名称
            </Typography>
            <input
              value={settings.aiModel}
              onChange={(e) => updateAndSave({ aiModel: e.target.value })}
              placeholder={settings.aiProvider === "ollama" ? "llama3" : "模型名称"}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
                fontSize: 14,
                marginTop: 4,
              }}
            />
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

### 任务 T-3.3: AppearanceSettings — 外观设置

**Files:**
- Create: `src/l3-molecule/settings/AppearanceSettings.tsx`

- [ ] **Step 1: 创建外观设置组件**

```tsx
import { useSettingsCommander } from "@l2/commander/useSettingsCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import { GlassPanel } from "@l4/ui/GlassPanel";
import type { ThemeMode, FontSize, WindowMaterial } from "@/l2-coordinator/api-docs/settings";

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "跟随系统" },
  { key: "light", label: "浅色" },
  { key: "dark", label: "深色" },
];

const FONT_OPTIONS: { key: FontSize; label: string }[] = [
  { key: "small", label: "小" },
  { key: "medium", label: "中" },
  { key: "large", label: "大" },
];

const MATERIAL_OPTIONS: { key: WindowMaterial; label: string }[] = [
  { key: "mica", label: "亚克力材质" },
  { key: "none", label: "不透明" },
];

export function AppearanceSettings() {
  const { settings, updateAndSave } = useSettingsCommander();

  return (
    <div>
      <Typography variant="h2" style={{ marginBottom: 24 }}>外观</Typography>

      <GlassPanel>
        <div style={{ padding: 16, marginBottom: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            主题
          </Typography>
          <div style={{ display: "flex", gap: 8 }}>
            {THEME_OPTIONS.map((t) => (
              <AppleButton
                key={t.key}
                variant={settings.theme === t.key ? "primary" : "secondary"}
                size="sm"
                onClick={() => updateAndSave({ theme: t.key })}
              >
                {t.label}
              </AppleButton>
            ))}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16, marginBottom: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            字体大小
          </Typography>
          <div style={{ display: "flex", gap: 8 }}>
            {FONT_OPTIONS.map((f) => (
              <AppleButton
                key={f.key}
                variant={settings.fontSize === f.key ? "primary" : "secondary"}
                size="sm"
                onClick={() => updateAndSave({ fontSize: f.key })}
              >
                {f.label}
              </AppleButton>
            ))}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16, marginBottom: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            窗口材质
          </Typography>
          <div style={{ display: "flex", gap: 8 }}>
            {MATERIAL_OPTIONS.map((m) => (
              <AppleButton
                key={m.key}
                variant={settings.windowMaterial === m.key ? "primary" : "secondary"}
                size="sm"
                onClick={() => updateAndSave({ windowMaterial: m.key })}
              >
                {m.label}
              </AppleButton>
            ))}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.reduceAnimations}
              onChange={(e) => updateAndSave({ reduceAnimations: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <Typography variant="body">减少动画效果</Typography>
          </label>
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

### 任务 T-3.4: DataSettings — 数据设置

**Files:**
- Create: `src/l3-molecule/settings/DataSettings.tsx`

- [ ] **Step 1: 创建数据设置组件**

```tsx
import { useSettingsCommander } from "@l2/commander/useSettingsCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import { GlassPanel } from "@l4/ui/GlassPanel";
import { openDirectoryPicker } from "@l4/system/openDirectoryPicker";

export function DataSettings() {
  const { settings, updateAndSave } = useSettingsCommander();

  const handlePickPath = async () => {
    try {
      const path = await openDirectoryPicker();
      if (path) {
        updateAndSave({ wxDataPath: path });
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <div>
      <Typography variant="h2" style={{ marginBottom: 24 }}>数据</Typography>

      <GlassPanel>
        <div style={{ padding: 16, marginBottom: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            微信数据路径
          </Typography>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Typography variant="caption" color="var(--color-text-secondary)" style={{ flex: 1 }}>
              {settings.wxDataPath || "未设置"}
            </Typography>
            <AppleButton variant="secondary" size="sm" onClick={handlePickPath}>
              选择目录
            </AppleButton>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            缓存管理
          </Typography>
          <Typography variant="caption" color="var(--color-text-secondary)">
            聊天记录和 AI 索引缓存在本地存储
          </Typography>
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

### 任务 T-3.5: AboutSettings — 关于页面

**Files:**
- Create: `src/l3-molecule/settings/AboutSettings.tsx`

- [ ] **Step 1: 创建关于组件**

```tsx
import { Typography } from "@l4/ui/Typography";
import { GlassPanel } from "@l4/ui/GlassPanel";

export function AboutSettings() {
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
    </div>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-6.1: SettingsView — L1 页面

**Files:**
- Create: `src/l1-entry/pages/SettingsView.tsx`

- [ ] **Step 1: 创建设置页面**

```tsx
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@l3/common/AppLayout";
import { StatusBar } from "@l3/common/StatusBar";
import { SettingsLayout } from "@l3/settings/SettingsLayout";
import { AIModelSettings } from "@l3/settings/AIModelSettings";
import { AppearanceSettings } from "@l3/settings/AppearanceSettings";
import { DataSettings } from "@l3/settings/DataSettings";
import { AboutSettings } from "@l3/settings/AboutSettings";
import { useSettingsCommander } from "@l2/commander/useSettingsCommander";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { useAiCommander } from "@l2/commander/useAiCommander";
import { Typography } from "@l4/ui/Typography";

export function SettingsView() {
  const navigate = useNavigate();
  const { activeCategory } = useSettingsCommander();
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const { indexStatus } = useAiCommander();

  const renderContent = () => {
    switch (activeCategory) {
      case "ai":
        return <AIModelSettings />;
      case "appearance":
        return <AppearanceSettings />;
      case "data":
        return <DataSettings />;
      case "about":
        return <AboutSettings />;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", gap: 16, borderBottom: "1px solid var(--color-border)" }}>
        <button
          onClick={() => navigate("/dashboard", { replace: true })}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-accent)",
            fontSize: 14,
            padding: 0,
          }}
        >
          ← 返回仪表盘
        </button>
        <Typography variant="label" weight={600}>设置</Typography>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <SettingsLayout>{renderContent()}</SettingsLayout>
      </div>
      <StatusBar status={sidecarStatus} indexStatus={indexStatus} />
    </AppLayout>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-6.2: 路由配置

**Files:**
- Modify: `src/l1-entry/routes/index.tsx`

- [ ] **Step 1: 增加 /settings 路由**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LaunchView } from "@l1/pages/LaunchView";
import { DashboardView } from "@l1/pages/DashboardView";
import { SettingsView } from "@l1/pages/SettingsView";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LaunchView />} />
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-6.3: AppLayout — 标题栏增加设置入口

**Files:**
- Modify: `src/l3-molecule/common/AppLayout.tsx`

- [ ] **Step 1: 在标题栏右侧添加齿轮图标按钮**

```tsx
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Typography } from "@l4/ui";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();

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
        <div style={{ width: 56, display: "flex", justifyContent: "flex-end", WebkitAppRegion: "no-drag" } as React.CSSProperties}>
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
            ⚙️
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

### 任务 T-4.1: useGraphStore 扩展 — 添加 hover/select/pulse 状态

**Files:**
- Modify: `src/l2-coordinator/data-clerk/stores/useGraphStore.ts`

- [ ] **Step 1: 追加新字段和 actions**

```typescript
import { create } from "zustand";
import type { VisualizeResult } from "@/l2-coordinator/api-docs/graph";

interface GraphState {
  data: VisualizeResult | null;
  loading: boolean;
  error: string | null;
  keyword: string;
  timeWindow: string;
  autoRotate: boolean;
  visible: boolean;
  minimized: boolean;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  pulsedNodeId: string | null;
  tooltipCoord: { x: number; y: number } | null;
}

interface GraphActions {
  setData: (data: VisualizeResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setKeyword: (keyword: string) => void;
  setTimeWindow: (window: string) => void;
  toggleAutoRotate: () => void;
  setVisible: (visible: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  setHoveredNode: (id: string | null, coord?: { x: number; y: number }) => void;
  setSelectedNode: (id: string | null) => void;
  setPulsedNode: (id: string | null) => void;
  reset: () => void;
}

type GraphStore = GraphState & GraphActions;

const initialState: GraphState = {
  data: null,
  loading: false,
  error: null,
  keyword: "",
  timeWindow: "",
  autoRotate: true,
  visible: false,
  minimized: false,
  hoveredNodeId: null,
  selectedNodeId: null,
  pulsedNodeId: null,
  tooltipCoord: null,
};

export const useGraphStore = create<GraphStore>((set) => ({
  ...initialState,

  setData: (data: VisualizeResult) => set({ data, loading: false, error: null }),

  setLoading: (loading: boolean) => set({ loading }),

  setError: (error: string | null) =>
    set({ error, loading: false }),

  setKeyword: (keyword: string) => set({ keyword }),

  setTimeWindow: (timeWindow: string) => set({ timeWindow }),

  toggleAutoRotate: () =>
    set((state) => ({ autoRotate: !state.autoRotate })),

  setVisible: (visible: boolean) => set({ visible }),

  setMinimized: (minimized: boolean) => set({ minimized }),

  setHoveredNode: (id: string | null, coord?: { x: number; y: number }) =>
    set({ hoveredNodeId: id, tooltipCoord: id ? (coord ?? null) : null }),

  setSelectedNode: (id: string | null) => set({ selectedNodeId: id }),

  setPulsedNode: (id: string | null) => set({ pulsedNodeId: id }),

  reset: () => set(initialState),
}));
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-4.2: useGraphCommander 扩展 — 新增联动方法

**Files:**
- Modify: `src/l2-coordinator/commander/useGraphCommander.ts`

- [ ] **Step 1: 追加 hoverNode / selectNode / focusOnChat / focusOnGraphFromSearch 方法**

```typescript
import { useCallback } from "react";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import {
  fetchGraphVisualize,
} from "@l4/network";
import type { VisualizeParams } from "@/l2-coordinator/api-docs/graph";

export function useGraphCommander() {
  const store = useGraphStore();

  const loadGraph = useCallback(async (params: VisualizeParams = {}) => {
    useGraphStore.setState({ loading: true, error: null });
    try {
      const data = await fetchGraphVisualize(params);
      useGraphStore.getState().setData(data);
    } catch (error) {
      useGraphStore.getState().setError(
        error instanceof Error ? error.message : "加载图谱数据失败",
      );
    }
  }, []);

  const searchGraph = useCallback(async (keyword: string) => {
    useGraphStore.setState({ loading: true, keyword });
    try {
      const data = await fetchGraphVisualize({ keyword });
      useGraphStore.getState().setData(data);
    } catch (error) {
      useGraphStore.getState().setError(
        error instanceof Error ? error.message : "图谱搜索失败",
      );
    }
  }, []);

  const refreshGraph = useCallback(async () => {
    const { keyword, timeWindow } = useGraphStore.getState();
    await loadGraph({ keyword: keyword || undefined, window: timeWindow || undefined });
  }, [loadGraph]);

  const openGraph = useCallback(async () => {
    useGraphStore.setState({ visible: true, minimized: false });
    const { data } = useGraphStore.getState();
    if (!data) {
      await loadGraph();
    }
  }, [loadGraph]);

  const closeGraph = useCallback(() => {
    useGraphStore.getState().setVisible(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    useGraphStore.setState((state) => ({ minimized: !state.minimized }));
  }, []);

  const hoverNode = useCallback((nodeId: string | null, coord?: { x: number; y: number }) => {
    useGraphStore.getState().setHoveredNode(nodeId, coord);
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    useGraphStore.getState().setSelectedNode(nodeId);
  }, []);

  const focusOnChat = useCallback((contactName: string) => {
    const { data, visible } = useGraphStore.getState();
    if (!visible || !data) return;
    const matched = data.nodes.find((n) =>
      n.name.toLowerCase() === contactName.toLowerCase()
    );
    if (matched) {
      useGraphStore.getState().setPulsedNode(matched.id);
      setTimeout(() => useGraphStore.getState().setPulsedNode(null), 4000);
    }
  }, []);

  const focusOnGraphFromSearch = useCallback(async (keyword: string) => {
    const { visible } = useGraphStore.getState();
    if (!visible) return;
    await searchGraph(keyword);
  }, [searchGraph]);

  return {
    data: store.data,
    loading: store.loading,
    error: store.error,
    keyword: store.keyword,
    timeWindow: store.timeWindow,
    autoRotate: store.autoRotate,
    visible: store.visible,
    minimized: store.minimized,
    hoveredNodeId: store.hoveredNodeId,
    selectedNodeId: store.selectedNodeId,
    pulsedNodeId: store.pulsedNodeId,
    tooltipCoord: store.tooltipCoord,
    loadGraph,
    searchGraph,
    refreshGraph,
    openGraph,
    closeGraph,
    toggleMinimize,
    hoverNode,
    selectNode,
    focusOnChat,
    focusOnGraphFromSearch,
    setKeyword: store.setKeyword,
    setTimeWindow: store.setTimeWindow,
    toggleAutoRotate: store.toggleAutoRotate,
    reset: store.reset,
  };
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-4.3: GraphNode3D — 添加 hover 回调和选中/脉冲视觉

**Files:**
- Modify: `src/l3-molecule/graph/GraphNode3D.tsx`

- [ ] **Step 1: 添加 pointer 事件和视觉状态**

```typescript
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import * as THREE from "three";
import type { GraphNode } from "@/l2-coordinator/api-docs/graph";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import { GRAPH_NODE_MIN_RADIUS } from "@/utils/constants";

const ENTITY_COLORS: Record<string, string> = {
  person: "#FF6B6B",
  organization: "#74B9FF",
  project: "#FFEAA7",
  product: "#00CEC9",
  customer: "#FD79A8",
  group: "#6C5CE7",
  topic: "#A29BFE",
  keyword: "#A29BFE",
  event: "#55EFC4",
  unknown: "#999999",
};

function getNodeRadius(value: number): number {
  return GRAPH_NODE_MIN_RADIUS + Math.log2(Math.max(value, 1)) * 0.25;
}

function getNodeColor(kind: string): string {
  return ENTITY_COLORS[kind] ?? ENTITY_COLORS.unknown;
}

interface GraphNode3DProps {
  node: GraphNode;
  position?: [number, number, number];
  onHover: (nodeId: string | null, coord?: { x: number; y: number }) => void;
  onDblClick: (nodeId: string) => void;
}

export function GraphNode3D({ node, position = [0, 0, 0], onHover, onDblClick }: GraphNode3DProps) {
  const meshRef = useRef<Mesh>(null);
  const radius = getNodeRadius(node.value);
  const color = getNodeColor(node.kind);
  const isHovered = useGraphStore((s) => s.hoveredNodeId === node.id);
  const isSelected = useGraphStore((s) => s.selectedNodeId === node.id);
  const isPulsed = useGraphStore((s) => s.pulsedNodeId === node.id);

  const handlePointerEnter = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const el = (e as unknown as { nativeEvent?: MouseEvent }).nativeEvent;
    if (el) {
      onHover(node.id, { x: el.clientX, y: el.clientY });
    } else {
      onHover(node.id);
    }
    document.body.style.cursor = "pointer";
  };

  const handlePointerLeave = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onHover(null);
    document.body.style.cursor = "default";
  };

  const handleDoubleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onDblClick(node.id);
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onDoubleClick={handleDoubleClick}
    >
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={isPulsed ? "#FFFFFF" : color}
        emissive={isPulsed ? "#FFFFFF" : color}
        emissiveIntensity={
          isPulsed ? 1.0 :
          isSelected ? 0.7 :
          isHovered ? 0.6 :
          node.kind === "unknown" ? 0.2 : 0.4
        }
        metalness={0.3}
        roughness={isHovered ? 0.2 : 0.4}
      />
    </mesh>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-4.4: GraphTooltip — 悬浮详情卡片

**Files:**
- Create: `src/l3-molecule/graph/GraphTooltip.tsx`

- [ ] **Step 1: 创建 Tooltip 组件**

```tsx
import { motion, AnimatePresence } from "framer-motion";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import { Typography } from "@l4/ui/Typography";

const KIND_LABELS: Record<string, string> = {
  person: "人物",
  organization: "组织",
  project: "项目",
  product: "产品",
  customer: "客户",
  group: "群组",
  topic: "话题",
  keyword: "关键词",
  event: "事件",
  unknown: "未知",
};

export function GraphTooltip() {
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const tooltipCoord = useGraphStore((s) => s.tooltipCoord);
  const data = useGraphStore((s) => s.data);

  if (!hoveredNodeId || !data) return null;

  const node = data.nodes.find((n) => n.id === hoveredNodeId);
  if (!node) return null;

  const connectedEdges = data.edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );
  const kindLabel = KIND_LABELS[node.kind] ?? node.kind;
  const lastSeenDate = node.last_seen
    ? new Date(node.last_seen * 1000).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
    : "未知";

  return (
    <AnimatePresence>
      <motion.div
        key={node.id}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        style={{
          position: "fixed",
          left: tooltipCoord ? tooltipCoord.x + 16 : 0,
          top: tooltipCoord ? tooltipCoord.y - 60 : 0,
          zIndex: 2000,
          pointerEvents: "none",
          background: "rgba(10, 10, 26, 0.92)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(74, 158, 255, 0.25)",
          borderRadius: 12,
          padding: "10px 14px",
          minWidth: 180,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <Typography variant="body" weight={700} style={{ marginBottom: 4 }}>
          {node.name}
        </Typography>
        <Typography variant="caption" color="var(--color-text-secondary)">
          {kindLabel} · 提到 {node.value} 次
        </Typography>
        <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginTop: 4 }}>
          最近活跃：{lastSeenDate}
        </Typography>
        <Typography variant="caption" color="var(--color-text-tertiary)">
          关联关系：{connectedEdges.length} 条
        </Typography>
        <Typography variant="caption" color="var(--color-accent)" style={{ marginTop: 4 }}>
          双击查看聊天记录
        </Typography>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-4.5: GraphEngine — 添加摄像头飞动 + pulse 动画 + 传递回调

**Files:**
- Modify: `src/l3-molecule/graph/GraphEngine.tsx`

- [ ] **Step 1: 添加 camera fly-to + pulse ref + 传递 hover/dblClick**

```typescript
import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force-3d";
import { GraphNode3D } from "./GraphNode3D";
import { GraphEdge3D } from "./GraphEdge3D";
import { GraphLabels } from "./GraphLabels";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import type { GraphNode, GraphEdge } from "@/l2-coordinator/api-docs/graph";
import {
  GRAPH_CAMERA_MIN_DISTANCE,
  GRAPH_CAMERA_MAX_DISTANCE,
  GRAPH_AUTO_ROTATE_SPEED,
  GRAPH_FORCE_LINK_DISTANCE,
  GRAPH_FORCE_LINK_STRENGTH,
  GRAPH_FORCE_CHARGE_MULTIPLIER,
  GRAPH_FORCE_COLLIDE_PADDING,
  GRAPH_LAYOUT_TICKS,
} from "@/utils/constants";

interface SimNode extends THREE.Vector3 {
  id: string;
  value: number;
}

interface SimLink {
  source: string;
  target: string;
}

function runForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Map<string, THREE.Vector3> {
  const nodePositions = new Map<string, THREE.Vector3>();

  const simNodes: SimNode[] = nodes.map((n) => {
    const v = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
    ) as SimNode;
    v.id = n.id;
    v.value = n.value;
    return v;
  });

  const simLinks: SimLink[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
  }));

  const simNodeRadius = (n: SimNode) =>
    0.5 + Math.log2(Math.max(n.value, 1)) * 0.25;

  const simulation = forceSimulation(simNodes, 3)
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id((d: SimNode) => d.id)
        .distance(GRAPH_FORCE_LINK_DISTANCE)
        .strength(GRAPH_FORCE_LINK_STRENGTH),
    )
    .force(
      "charge",
      forceManyBody<SimNode>().strength(
        -nodes.length * GRAPH_FORCE_CHARGE_MULTIPLIER,
      ),
    )
    .force("center", forceCenter(0, 0, 0))
    .force(
      "collide",
      forceCollide<SimNode>((d: SimNode) => simNodeRadius(d) + GRAPH_FORCE_COLLIDE_PADDING),
    )
    .stop();

  for (let i = 0; i < GRAPH_LAYOUT_TICKS; i++) {
    simulation.tick();
  }

  for (const node of simNodes) {
    nodePositions.set(node.id, node.clone());
  }

  return nodePositions;
}

interface GraphEngineProps {
  onNodeHover: (nodeId: string | null, coord?: { x: number; y: number }) => void;
  onNodeDblClick: (nodeId: string) => void;
}

export function GraphEngine({ onNodeHover, onNodeDblClick }: GraphEngineProps) {
  const data = useGraphStore((s) => s.data);
  const autoRotate = useGraphStore((s) => s.autoRotate);
  const pulsedNodeId = useGraphStore((s) => s.pulsedNodeId);
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  const nodePositions = useMemo(() => {
    if (!data) return new Map<string, THREE.Vector3>();
    return runForceLayout(data.nodes, data.edges);
  }, [data]);

  // Camera fly-to when pulsed node changes
  useEffect(() => {
    if (!pulsedNodeId || !nodePositions) return;
    const target = nodePositions.get(pulsedNodeId);
    if (!target) return;

    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(
      target.x,
      target.y,
      target.z + 5,
    );
    const startTime = Date.now();
    const duration = 1000;

    let raf: number;
    function animate() {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      // easeInOutCubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.lerpVectors(startPos, endPos, eased);
      if (t < 1) {
        raf = requestAnimationFrame(animate);
      }
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [pulsedNodeId, nodePositions, camera]);

  if (!data) return null;

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -3, -3]} intensity={0.4} />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={GRAPH_CAMERA_MIN_DISTANCE}
        maxDistance={GRAPH_CAMERA_MAX_DISTANCE}
        autoRotate={autoRotate}
        autoRotateSpeed={GRAPH_AUTO_ROTATE_SPEED}
      />

      <group>
        {data.edges.map((edge) => {
          const fromPos = nodePositions.get(edge.source);
          const toPos = nodePositions.get(edge.target);
          if (!fromPos || !toPos) return null;
          return (
            <GraphEdge3D
              key={edge.id}
              edge={edge}
              fromPos={fromPos}
              toPos={toPos}
            />
          );
        })}
      </group>

      <group>
        {data.nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;
          return (
            <GraphNode3D
              key={node.id}
              node={node}
              position={pos.toArray() as [number, number, number]}
              onHover={onNodeHover}
              onDblClick={onNodeDblClick}
            />
          );
        })}
      </group>

      <GraphLabels nodes={data.nodes} positions={nodePositions} />
    </>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-4.6: GraphCanvas — 添加 Tooltip 并传递回调

**Files:**
- Modify: `src/l3-molecule/graph/GraphCanvas.tsx` (开头和 Canvas 内的 GraphEngine)

- [ ] **Step 1: 添加 GraphTooltip import 和回调传递**

```typescript
// 在文件顶部 import 区域追加:
import { GraphTooltip } from "./GraphTooltip";
```

```typescript
// 将 <GraphEngine /> 替换为:
<GraphEngine
  onNodeHover={graph.hoverNode}
  onNodeDblClick={graph.selectNode}
/>
```

```typescript
// 在 Canvas 闭合标签之后、resize handle 之前添加:
<GraphTooltip />
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-4.7: DashboardView — 集成图谱联动和搜索联动

**Files:**
- Modify: `src/l1-entry/pages/DashboardView.tsx`

- [ ] **Step 1: 添加图谱↔聊天 + 搜索↔图谱联动**

在现有的 `const { loadContacts, selectedContact, selectedChatRoom } = useChatCommander();` 之后，追加从 ChatCommander 中获取 selectAndLoad 方法：

```typescript
const { loadContacts, selectedContact, selectedChatRoom, selectAndLoad } = useChatCommander();
```

在现有的 `useEffect(() => { if (currentChat) { loadAll(currentChat); } }, [currentChat, loadAll]);` 之后追加：

```typescript
// 图谱 → 聊天：双击节点时触发
useEffect(() => {
  if (!graph.selectedNodeId || !graph.data) return;
  const node = graph.data.nodes.find((n) => n.id === graph.selectedNodeId);
  if (!node) return;
  const contactName = node.name;
  // 在联系人列表中查找匹配的 contacts
  const { contacts, chatRooms } = useChatStore.getState();
  const matchedContact = contacts.find((c) => c.nickName === contactName || c.userName === contactName);
  const matchedRoom = chatRooms.find((r) => r.nickName === contactName || r.name === contactName);
  if (matchedRoom) {
    selectAndLoad(matchedRoom.name, matchedRoom.nickName, true);
  } else if (matchedContact) {
    selectAndLoad(matchedContact.userName, matchedContact.nickName, false);
  }
  graph.selectNode(null);
}, [graph.selectedNodeId]);

// 聊天 → 图谱：选中联系人时
useEffect(() => {
  const name = selectedContact?.nickName || selectedChatRoom?.nickName;
  if (name) {
    graph.focusOnChat(name);
  }
}, [selectedContact?.nickName, selectedChatRoom?.nickName]);
```

添加 `useChatStore` import：

```typescript
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
```

在 `GlobalSearch` 的父组件中添加上下文，将搜索关键词同步给图谱。由于现有的 `GlobalSearch` 由 `useSearchCommander` 控制，需要额外 hook API。最简单的方式是在 DashboardView 中监听搜索关键词变化。但为了不破坏现有架构，这里改用 DashboardView 层面监听：

```typescript
import { useSearchStore } from "@l2/data-clerk/stores/useSearchStore";

// 在 DashboardView 中:
const searchQuery = useSearchStore((s) => s.query);
useEffect(() => {
  if (searchQuery) {
    graph.focusOnGraphFromSearch(searchQuery);
  }
}, [searchQuery]);
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-5.1: Rust material.rs — 窗口材质应用

**Files:**
- Create: `src-tauri/src/material.rs`

- [ ] **Step 1: 创建材质模块**

```rust
use tauri::Window;

#[tauri::command]
pub async fn apply_window_material(
    window: Window,
    material: String,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use tauri::window::Effect;
        let effect = match material.as_str() {
            "mica" => Some(Effect::Mica),
            "acrylic" => Some(Effect::Acrylic),
            _ => None,
        };
        if let Some(effect) = effect {
            window.set_effect(effect)
                .map_err(|e| format!("设置窗口材质失败: {}", e))?;
        }
    }

    #[cfg(target_os = "macos")]
    {
        // macOS: NSVisualEffectView via Tauri's vibrancy
        // Tauri v2 supports NSVisualEffectMaterial through the window builder
        if material == "vibrancy" {
            // Window is already transparent (set in tauri.conf.json)
            // Vibrancy requires no additional code beyond transparent + blur
            // The CSS backdrop-filter handles the visual effect
        }
    }

    let _ = (window, material);
    Ok(())
}
```

- [ ] **Step 2: 验证**

Run: `cargo build -p chatlog-alpha-desktop 2>&1`
Expected: 编译成功

---

### 任务 T-5.2: lib.rs + commands.rs — 注册 material 模块

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/commands.rs`

- [ ] **Step 1: 修改 lib.rs**

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

### 任务 T-5.3: L4 系统原子 — applyWindowMaterial.ts

**Files:**
- Create: `src/l4-atom/system/applyWindowMaterial.ts`

- [ ] **Step 1: 创建系统原子**

```typescript
import { invoke } from "@tauri-apps/api/core";

type WindowMaterial = "mica" | "acrylic" | "vibrancy" | "none";

export async function applyWindowMaterial(material: WindowMaterial): Promise<void> {
  try {
    await invoke("apply_window_material", { material });
  } catch (error) {
    console.error("Failed to apply window material:", error);
  }
}
```

- [ ] **Step 2: 更新系统原子的 index.ts，追加导出**

```typescript
export { applyWindowMaterial } from "./applyWindowMaterial";
```

- [ ] **Step 3: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-5.4: AppLayout — 启动时自动应用材质

**Files:**
- Modify: `src/l3-molecule/common/AppLayout.tsx`（已在上一步 T-6.3 修改，此处追加 useEffect）

- [ ] **Step 1: 在 AppLayout 中添加材质初始化 useEffect**

```typescript
import { useEffect } from "react";
import { applyWindowMaterial } from "@l4/system/applyWindowMaterial";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";

// 在 AppLayout 组件的 return 之前添加:
useEffect(() => {
  const settings = useSettingsStore.getState().settings;
  if (settings.windowMaterial && settings.windowMaterial !== "none") {
    applyWindowMaterial(settings.windowMaterial);
  }
}, []);
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-7.1: 最终验证

- [ ] **Step 1: 类型检查**

Run: `pnpm typecheck`
Expected: 0 errors

- [ ] **Step 2: Lint 检查**

Run: `pnpm lint`
Expected: 0 warnings

- [ ] **Step 3: 前端构建验证**

Run: `pnpm build`
Expected: 构建成功

- [ ] **Step 4: Rust 编译验证**

Run: `cargo build -p chatlog-alpha-desktop 2>&1`
Expected: 编译成功

- [ ] **Step 5: 架构合规检查**

检查以下项目：
- L4 原子间无相互 import（`applyWindowMaterial.ts` 独立，不导入其他原子）
- L3 分子间无相互 import（settings 分子不导入 graph/chat/search/stats 分子）
- L1 页面无业务逻辑（SettingsView 只做布局 + 条件渲染，DashboardView 只做事件委托 + useEffect 协调）
- SettingsCommander 在 L2 层，只被 L1 SettingsView 和 L3 settings 分子使用

- [ ] **Step 6: 提交**

```bash
git add .
git commit -m "feat: sprint 5a - settings, graph tooltip, cross-linking, window materials"
```

---

## 验收清单

| # | 验收项 | 方法 |
|---|--------|------|
| 1 | `pnpm typecheck` 零错误 | 运行命令 |
| 2 | `pnpm lint` 零警告 | 运行命令 |
| 3 | `pnpm build` 成功 | 运行命令 |
| 4 | `cargo build` 成功 | 运行命令 |
| 5 | 标题栏齿轮图标点击 → `/settings` 页面 | 操作 |
| 6 | 设置四个子项正常切换（AI/外观/数据/关于） | 操作 |
| 7 | AI 配置保存后回调生效 | 操作 |
| 8 | 外观设置变更即时生效 | 操作 |
| 9 | 图谱节点 hover → Tooltip 显示正确信息 | 操作 |
| 10 | 双击节点 → 侧边栏高亮联系人 + 加载聊天记录 | 操作 |
| 11 | 选中联系人 → 图谱对应节点脉冲高亮 | 操作 |
| 12 | 全局搜索 → 图谱同步搜索高亮匹配节点 | 操作 |
| 13 | L4 原子间无相互 import | 代码审查 |
| 14 | L3 分子间无相互 import | 代码审查 |
| 15 | L1 页面无业务逻辑 | 代码审查 |

# P2-C Settings And Diagnostics Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Settings, diagnostics, status feedback, and privacy-facing surfaces coherent enough for a ready-to-use desktop app baseline without changing the `chatlog_alpha` sidecar contract.

**Architecture:** P2-C builds on P2-A/P2-B. L1 pages remain shells, L2 commanders own settings/diagnostics orchestration, L3 surfaces render props or commander outputs, and L4 system atoms wrap Tauri/Rust calls. Diagnostics are redaction-first and user-triggered; semantic and graph feature contracts remain P2-D/P3 scope.

**Tech Stack:** React 18, TypeScript 5, Zustand, Vitest, Tauri v2, Tailwind CSS v4/project CSS tokens, lucide-react, existing `Button/IconButton/Surface/StatusIndicator` primitives.

---

## 1. Current Baseline

P2-C starts after:

- P2-A established tokens, `AppLayout`, `Button`, `IconButton`, `Surface`, `StatusIndicator`, `WorkbenchFrame`, Setup Center first polish, and Settings route cleanup.
- P2-B polished core chat/search/stats and then fixed privacy accessibility, transcript virtualization, stats measured fallback, setup raw button, password form semantics, favicon, and dev port.
- `docs/reviews/2026-05-30-p2-b-comprehensive-review.md` still keeps residual debt: strict architecture cleanup, legacy semantic/graph/common UI, graph chunk warning, and manual Windows install/quit/reopen/port-conflict smoke.

Current code confirms P2-C should focus on:

- `src/l1-entry/pages/SettingsView.tsx` still reads `useAppStore` and `useAiCommander` in L1.
- `src/l3-molecule/settings/DataSettings.tsx` and `src/l3-molecule/setup/ConfigImportPanel.tsx` still call L4 `openDirectoryPicker` directly.
- `src/l3-molecule/setup/DiagnosticPanel.tsx` displays raw `configDir`, `dataDir`, `workDir`, and raw error text.
- `src/l3-molecule/common/DevConsole.tsx` still uses `AppleButton` and `alert()` for export feedback.
- `src/l2-coordinator/commander/useDevConsoleCommander.ts` calls Tauri `invoke` directly instead of using an L4 system atom.
- `src/utils/maskSecrets.ts` only masks `data_key/img_key` in limited shapes.
- `src/l4-atom/ui/StatusIndicator.tsx` uses `accent`, while P2 requires `neutral/info/success/warning/danger/ai`.
- `src/l3-molecule/common/StatusBar.tsx` still maps semantic index display through older `building/completed/total` assumptions.
- `src/l3-molecule/settings/AboutSettings.tsx` hard-codes app version `1.0.0`.

## 2. Scope

P2-C includes:

- Settings center category order, validation states, save feedback, and honest AI/settings language.
- Settings and setup directory-picking routed through L2 commander methods.
- Redaction helpers and diagnostic summary/export contract.
- Unified diagnostics panel reusable by Setup Center, DevConsole, and future Workbench status surfaces.
- Unified status tone taxonomy and reusable readiness state rendering.
- DevConsole migration away from `AppleButton`, raw `invoke`, and `alert()`.
- About/version display using available app metadata and explicit unavailable states.
- Browser checks for `/`, `/workbench`, and `/settings` at desktop and 390px width.

P2-C does not include:

- Full semantic config/index/QA backend contract repair. That remains P2-D/P3.
- Full graph containment, chunk splitting, or graph empty/oversized states. That remains P2-D/P2-E.
- Windows installer manual smoke completion. This remains release gate/P2-E.
- New remote telemetry or automatic diagnostic upload.
- Removing the legacy `AppleButton` or `GlassPanel` exports from L4. They may remain as compatibility exports, but P2-C user-facing settings/diagnostics/common surfaces must not use them.

## 3. File Structure

- Create: `src/l2-coordinator/data-clerk/types/readiness.ts`
- Create: `src/l2-coordinator/data-clerk/types/readiness.test.ts`
- Create: `src/l2-coordinator/commander/diagnostics.ts`
- Create: `src/l2-coordinator/commander/diagnostics.test.ts`
- Create: `src/l2-coordinator/commander/useDiagnosticsCommander.ts`
- Create: `src/l2-coordinator/commander/settingsValidation.ts`
- Create: `src/l2-coordinator/commander/settingsValidation.test.ts`
- Create: `src/l3-molecule/common/ReadinessStatePanel.tsx`
- Create: `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx`
- Create: `src/l3-molecule/diagnostics/DiagnosticCopyButton.tsx`
- Create: `src/l4-atom/system/exportDiagnostics.ts`
- Modify: `src/utils/maskSecrets.ts`
- Modify: `src/l4-atom/ui/StatusIndicator.tsx`
- Modify: `src/styles/layout.css`
- Modify: `src/styles/tokens.css`
- Modify: `src/l3-molecule/common/StatusBar.tsx`
- Modify: `src/l3-molecule/common/DevConsole.tsx`
- Modify: `src/l2-coordinator/commander/useDevConsoleCommander.ts`
- Modify: `src/l2-coordinator/commander/useSettingsCommander.ts`
- Modify: `src/l2-coordinator/commander/useSetupCommander.ts`
- Modify: `src/l2-coordinator/data-clerk/stores/useSettingsStore.ts`
- Modify: `src/l2-coordinator/data-clerk/stores/settingsMigration.test.ts`
- Modify: `src/l2-coordinator/api-docs/settings.ts`
- Modify: `src/l1-entry/pages/SettingsView.tsx`
- Modify: `src/l3-molecule/settings/SettingsLayout.tsx`
- Modify: `src/l3-molecule/settings/DataSettings.tsx`
- Modify: `src/l3-molecule/settings/AIModelSettings.tsx`
- Modify: `src/l3-molecule/settings/AppearanceSettings.tsx`
- Modify: `src/l3-molecule/settings/AboutSettings.tsx`
- Modify: `src/l3-molecule/setup/ConfigImportPanel.tsx`
- Modify: `src/l3-molecule/setup/DiagnosticPanel.tsx`
- Modify: `src/l3-molecule/setup/ReadinessChecklist.tsx`
- Modify: `src/l3-molecule/setup/ServiceControlPanel.tsx`
- Modify: `src/l3-molecule/common/index.ts`
- Modify: `src/l4-atom/system/index.ts`
- Modify: `src-tauri/src/sidecar.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `task_plan.md`, `findings.md`, `progress.md`

## 4. Task C0: Baseline And Inventory

**Files:**
- Modify: `progress.md`
- Modify: `findings.md`

- [ ] **Step 1: Confirm clean starting branch**

Run:

```powershell
git status --short --branch
```

Expected:

```text
## codex/p2-c-settings-diagnostics-planning
 M findings.md
 M progress.md
 M task_plan.md
?? docs/superpowers/plans/2026-05-30-p2-c-settings-diagnostics-polish.md
```

If other files are modified, inspect them before proceeding and do not revert user changes.

- [ ] **Step 2: Record legacy UI and boundary inventory**

Run:

```powershell
rg -n "AppleButton|GlassPanel|motion\.div|AnimatePresence|alert\(|@l4/system|@tauri-apps/api/core|openDirectoryPicker|dataKey|apiKey|token|secret|credential" src -S
```

Record each hit as one of:

- P2-C settings/diagnostics/common cleanup.
- P2-D semantic/graph cleanup.
- P2-E motion/accessibility cleanup.
- L4 compatibility export allowed to remain.

- [ ] **Step 3: Append baseline notes**

Append to `progress.md`:

```markdown
## 2026-05-30 P2-C Implementation Baseline

- Branch: `codex/p2-c-settings-diagnostics-planning`.
- P2-C scope: settings center, diagnostics, status feedback, privacy-safe common surfaces.
- P2-D excluded: semantic/graph backend contract repair and graph chunk strategy.
- P2-E/release excluded: installer manual smoke and full release gate.
- Legacy scan result: record every match from the inventory command under P2-C, P2-D, P2-E, or L4 compatibility export, without copying raw private data.
```

## 5. Task C1: Shared Readiness Model And Status Tones

**Files:**
- Create: `src/l2-coordinator/data-clerk/types/readiness.ts`
- Create: `src/l2-coordinator/data-clerk/types/readiness.test.ts`
- Modify: `src/l4-atom/ui/StatusIndicator.tsx`
- Modify: `src/styles/layout.css`
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: Write failing readiness model tests**

Create `src/l2-coordinator/data-clerk/types/readiness.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { createReadinessState, getReadinessTone } from "./readiness";

describe("readiness state model", () => {
  it("creates a redaction-safe recoverable error state", () => {
    const state = createReadinessState({
      scope: "diagnostics",
      status: "error",
      title: "诊断导出失败",
      message: "无法完成敏感信息脱敏",
      recoveryAction: { label: "返回诊断面板", kind: "open-settings" },
      evidenceRef: "diag-redaction-failed",
    });

    expect(state.status).toBe("error");
    expect(state.recoveryAction?.kind).toBe("open-settings");
    expect(state.evidenceRef).toBe("diag-redaction-failed");
  });

  it("maps statuses to the P2-C tone taxonomy", () => {
    expect(getReadinessTone("idle")).toBe("neutral");
    expect(getReadinessTone("loading")).toBe("info");
    expect(getReadinessTone("empty")).toBe("neutral");
    expect(getReadinessTone("success")).toBe("success");
    expect(getReadinessTone("error")).toBe("danger");
    expect(getReadinessTone("conflict")).toBe("warning");
    expect(getReadinessTone("cancelled")).toBe("neutral");
  });
});
```

Run:

```powershell
pnpm test -- src/l2-coordinator/data-clerk/types/readiness.test.ts
```

Expected: FAIL because `readiness.ts` does not exist.

- [ ] **Step 2: Implement readiness types**

Create `src/l2-coordinator/data-clerk/types/readiness.ts`:

```typescript
export type ReadinessScope =
  | "setup"
  | "backend"
  | "database"
  | "settings"
  | "privacy"
  | "diagnostics"
  | "semantic"
  | "graph"
  | "release";

export type ReadinessStatus =
  | "idle"
  | "loading"
  | "empty"
  | "success"
  | "error"
  | "conflict"
  | "cancelled";

export type ReadinessTone = "neutral" | "info" | "success" | "warning" | "danger" | "ai";

export type RecoveryActionKind =
  | "retry"
  | "choose-directory"
  | "open-settings"
  | "copy-diagnostics"
  | "stop-stream"
  | "none";

export interface ReadinessRecoveryAction {
  label: string;
  kind: RecoveryActionKind;
}

export interface ReadinessState {
  scope: ReadinessScope;
  status: ReadinessStatus;
  title: string;
  message: string;
  recoveryAction?: ReadinessRecoveryAction;
  updatedAt: string;
  evidenceRef?: string;
}

export function createReadinessState(
  input: Omit<ReadinessState, "updatedAt"> & { updatedAt?: string },
): ReadinessState {
  return {
    ...input,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export function getReadinessTone(status: ReadinessStatus): ReadinessTone {
  switch (status) {
    case "loading":
      return "info";
    case "success":
      return "success";
    case "error":
      return "danger";
    case "conflict":
      return "warning";
    case "idle":
    case "empty":
    case "cancelled":
      return "neutral";
  }
}
```

- [ ] **Step 3: Expand status tone primitive without reversing layer dependencies**

Change `src/l4-atom/ui/StatusIndicator.tsx`:

```typescript
import { Spinner } from "./Spinner";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "ai";
```

Keep the existing `StatusIndicatorProps` shape. Do not import `ReadinessTone` from L2 into L4; L4 UI atoms must remain independent.

- [ ] **Step 4: Add CSS tone classes**

Add to `src/styles/tokens.css`:

```css
:root {
  --info: #2563eb;
  --ai: #7c3aed;
}
```

Add to `src/styles/layout.css` near status indicator styles:

```css
.ui-status-indicator--info .ui-status-indicator__dot {
  background: var(--info);
}

.ui-status-indicator--ai .ui-status-indicator__dot {
  background: var(--ai);
}
```

Remove `.ui-status-indicator--accent` after confirming no caller uses `tone="accent"`.

- [ ] **Step 5: Verify**

Run:

```powershell
pnpm test -- src/l2-coordinator/data-clerk/types/readiness.test.ts
pnpm typecheck
```

Expected: PASS.

## 6. Task C2: Readiness State Panel

**Files:**
- Create: `src/l3-molecule/common/ReadinessStatePanel.tsx`
- Modify: `src/l3-molecule/common/index.ts`

- [ ] **Step 1: Add reusable panel**

Create `src/l3-molecule/common/ReadinessStatePanel.tsx`:

```tsx
import type { ReadinessState, RecoveryActionKind } from "@l2/data-clerk/types/readiness";
import { getReadinessTone } from "@l2/data-clerk/types/readiness";
import { Button, StatusIndicator, Surface, Typography } from "@l4/ui";

interface ReadinessStatePanelProps {
  state: ReadinessState;
  onAction?: (kind: RecoveryActionKind) => void;
}

export function ReadinessStatePanel({ state, onAction }: ReadinessStatePanelProps) {
  return (
    <Surface variant={state.status === "error" || state.status === "conflict" ? "raised" : "base"} className="readiness-panel">
      <div className="readiness-panel__header">
        <StatusIndicator label={state.title} tone={getReadinessTone(state.status)} busy={state.status === "loading"} />
      </div>
      <Typography variant="body" color="var(--text-secondary)">
        {state.message}
      </Typography>
      {state.evidenceRef && (
        <Typography variant="caption" color="var(--text-muted)">
          Evidence: {state.evidenceRef}
        </Typography>
      )}
      {state.recoveryAction && state.recoveryAction.kind !== "none" && (
        <Button variant="secondary" size="sm" onClick={() => onAction?.(state.recoveryAction!.kind)}>
          {state.recoveryAction.label}
        </Button>
      )}
    </Surface>
  );
}
```

- [ ] **Step 2: Export component**

Modify `src/l3-molecule/common/index.ts`:

```typescript
export { AppLayout } from "./AppLayout";
export { StatusBar } from "./StatusBar";
export { ReadinessStatePanel } from "./ReadinessStatePanel";
```

- [ ] **Step 3: Add CSS**

Add to `src/styles/layout.css`:

```css
.readiness-panel {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
}

.readiness-panel__header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm lint
pnpm typecheck
```

Expected: PASS.

## 7. Task C3: Redaction Helpers

**Files:**
- Modify: `src/utils/maskSecrets.ts`
- Create or modify: `src/utils/maskSecrets.test.ts`

- [ ] **Step 1: Write failing redaction tests**

Create `src/utils/maskSecrets.test.ts` if missing:

```typescript
import { describe, expect, it } from "vitest";
import { maskDiagnosticText, maskDisplayPath, containsUnsafeDiagnosticContent } from "./maskSecrets";

describe("diagnostic redaction", () => {
  it("redacts data keys, api keys, tokens, and credential-like fields", () => {
    const text = [
      '"data_key":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"',
      "api_key=sk-live-secret",
      "token: ghp_abcdef",
      "Authorization: Bearer secret-token",
      "credential=plain-secret",
    ].join("\n");

    const masked = maskDiagnosticText(text);

    expect(masked).not.toContain("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(masked).not.toContain("sk-live-secret");
    expect(masked).not.toContain("ghp_abcdef");
    expect(masked).not.toContain("secret-token");
    expect(masked).not.toContain("plain-secret");
    expect(masked).toContain("******");
  });

  it("redacts identity-bearing path segments while keeping useful structure", () => {
    expect(maskDisplayPath("C:/Users/Alice/Documents/WeChat Files/wxid_private/msg")).toBe(
      "C:/Users/<user>/Documents/WeChat Files/<wechat-id>/msg",
    );
  });

  it("flags unsafe diagnostic content after masking if raw private markers remain", () => {
    expect(containsUnsafeDiagnosticContent("message body: hello private chat")).toBe(true);
    expect(containsUnsafeDiagnosticContent("HTTP ready: true")).toBe(false);
  });
});
```

Run:

```powershell
pnpm test -- src/utils/maskSecrets.test.ts
```

Expected: FAIL because the new functions do not exist.

- [ ] **Step 2: Implement redaction helpers**

Modify `src/utils/maskSecrets.ts`:

```typescript
const WECHAT_ID_PATTERN = /\b(wxid_[A-Za-z0-9_-]+)\b/g;

export function maskSecretText(input: string): string {
  return maskDiagnosticText(input);
}

export function maskDisplayText(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[^\s]/g, "*");
}

export function maskDisplayPath(input: string | null | undefined): string {
  if (!input) return "-";
  return input
    .replace(/([A-Za-z]:\/Users\/)[^/\\]+/g, "$1<user>")
    .replace(/([A-Za-z]:\\Users\\)[^/\\]+/g, "$1<user>")
    .replace(WECHAT_ID_PATTERN, "<wechat-id>");
}

export function maskDiagnosticText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/("?(?:data_key|dataKey|img_key|imgKey)"?\s*[:=]\s*"?)[^"\s,}]+("?)/gi, "$1******$2")
    .replace(/("?(?:api_key|apiKey|token|secret|credential|authorization)"?\s*[:=]\s*"?)[^"\n]+("?)/gi, "$1******$2")
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, "$1******")
    .replace(/\bsk-[A-Za-z0-9._-]+\b/g, "sk-******")
    .replace(/\bghp_[A-Za-z0-9_]+\b/g, "ghp_******")
    .replace(WECHAT_ID_PATTERN, "<wechat-id>");
}

export function containsUnsafeDiagnosticContent(input: string): boolean {
  return [
    /\b(?:dataKey|data_key|imgKey|img_key)\b\s*[:=]\s*(?!\*{3,})\S+/i,
    /\b(?:api[_-]?key|token|credential|authorization)\b\s*[:=]\s*(?!\*{3,})\S+/i,
    /\bBearer\s+(?!\*{3,})\S+/i,
    /\bsk-[A-Za-z0-9._-]{8,}\b/i,
    /\bghp_[A-Za-z0-9_]{8,}\b/i,
    /\bprivate chat\b/i,
    /\bmessage body\b/i,
    /\bwxid_[A-Za-z0-9_-]+\b/i,
  ].some((pattern) => pattern.test(input));
}
```

- [ ] **Step 3: Verify**

Run:

```powershell
pnpm test -- src/utils/maskSecrets.test.ts
pnpm typecheck
```

Expected: PASS.

## 8. Task C4: Diagnostics Domain Model

**Files:**
- Create: `src/l2-coordinator/commander/diagnostics.ts`
- Create: `src/l2-coordinator/commander/diagnostics.test.ts`

- [ ] **Step 1: Write failing diagnostics tests**

Create `src/l2-coordinator/commander/diagnostics.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildDiagnosticReport, normalizeDiagnosticLog } from "./diagnostics";

describe("diagnostics report", () => {
  it("builds a redacted setup and runtime report", () => {
    const report = buildDiagnosticReport({
      appVersion: "0.1.0",
      sidecarBaseUrl: "http://127.0.0.1:5030",
      setup: {
        mode: "managed",
        source: "app-managed-server-config",
        configDir: "C:/Users/Alice/AppData/Roaming/chatlogUI",
        dataDir: "C:/Users/Alice/Documents/WeChat Files/wxid_private",
        workDir: "C:/Temp/chatlog",
        portState: "owned",
        httpReady: true,
        dbReady: false,
        hasDataKey: true,
        hasImgKey: true,
        error: "data_key=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      logs: [{ level: "stderr", message: "api_key=sk-secret" }],
    });

    expect(report.redactionStatus).toBe("safe");
    expect(report.text).not.toContain("Alice");
    expect(report.text).not.toContain("wxid_private");
    expect(report.text).not.toContain("aaaaaaaa");
    expect(report.text).not.toContain("sk-secret");
    expect(report.text).toContain("HTTP ready: true");
  });

  it("normalizes diagnostic logs before display or export", () => {
    expect(normalizeDiagnosticLog({ level: "stderr", message: "token: ghp_secret" }).message).toBe("token: ******");
  });

  it("fails closed without returning unsafe report text if masking misses private content", () => {
    const report = buildDiagnosticReport({
      appVersion: "0.1.0",
      sidecarBaseUrl: "http://127.0.0.1:5030",
      setup: null,
      logs: [{ level: "stdout", message: "message body: hello private chat" }],
    });

    expect(report.redactionStatus).toBe("blocked");
    expect(report.text).not.toContain("hello private chat");
    expect(report.text).toContain("诊断内容未完成脱敏");
  });
});
```

Run:

```powershell
pnpm test -- src/l2-coordinator/commander/diagnostics.test.ts
```

Expected: FAIL because `diagnostics.ts` does not exist.

- [ ] **Step 2: Implement diagnostics helpers**

Create `src/l2-coordinator/commander/diagnostics.ts`:

```typescript
import { containsUnsafeDiagnosticContent, maskDiagnosticText, maskDisplayPath } from "@/utils/maskSecrets";

export interface DiagnosticLogInput {
  level: string;
  message: string;
}

export interface DiagnosticSetupInput {
  mode: string;
  source: string;
  configDir: string | null;
  dataDir: string | null;
  workDir: string | null;
  portState: string;
  httpReady: boolean;
  dbReady: boolean;
  hasDataKey: boolean;
  hasImgKey: boolean;
  error: string | null;
}

export interface DiagnosticReportInput {
  appVersion: string;
  sidecarBaseUrl: string;
  setup: DiagnosticSetupInput | null;
  logs: DiagnosticLogInput[];
}

export interface DiagnosticReport {
  redactionStatus: "safe" | "blocked";
  text: string;
}

export function normalizeDiagnosticLog(log: DiagnosticLogInput): DiagnosticLogInput {
  return {
    level: log.level,
    message: maskDiagnosticText(log.message),
  };
}

export function buildDiagnosticReport(input: DiagnosticReportInput): DiagnosticReport {
  const lines = [
    "# chatlogUI Diagnostic Summary",
    `App version: ${input.appVersion}`,
    `Sidecar base URL: ${input.sidecarBaseUrl}`,
  ];

  if (input.setup) {
    lines.push(
      "",
      "## Setup",
      `Mode: ${input.setup.mode}`,
      `Source: ${input.setup.source}`,
      `Config dir: ${maskDisplayPath(input.setup.configDir)}`,
      `Data dir: ${maskDisplayPath(input.setup.dataDir)}`,
      `Work dir: ${maskDisplayPath(input.setup.workDir)}`,
      `Port state: ${input.setup.portState}`,
      `HTTP ready: ${String(input.setup.httpReady)}`,
      `DB ready: ${String(input.setup.dbReady)}`,
      `Secret presence: data key ${input.setup.hasDataKey ? "present" : "missing"}, image key ${input.setup.hasImgKey ? "present" : "missing"}`,
    );
    if (input.setup.error) {
      lines.push(`Last error: ${maskDiagnosticText(input.setup.error)}`);
    }
  }

  lines.push("", "## Recent Logs");
  for (const log of input.logs.slice(-100).map(normalizeDiagnosticLog)) {
    lines.push(`[${log.level}] ${log.message}`);
  }

  const text = lines.join("\n");
  const blocked = containsUnsafeDiagnosticContent(text);
  return {
    redactionStatus: blocked ? "blocked" : "safe",
    text: blocked ? "# chatlogUI Diagnostic Summary\n诊断内容未完成脱敏，已阻止显示和导出。" : text,
  };
}
```

- [ ] **Step 3: Verify**

Run:

```powershell
pnpm test -- src/l2-coordinator/commander/diagnostics.test.ts src/utils/maskSecrets.test.ts
pnpm typecheck
```

Expected: PASS.

## 9. Task C5: Diagnostics Export Atom And Rust Fail-Closed Command

**Files:**
- Create: `src/l4-atom/system/exportDiagnostics.ts`
- Modify: `src/l4-atom/system/index.ts`
- Modify: `src-tauri/src/sidecar.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add L4 system atom**

Create `src/l4-atom/system/exportDiagnostics.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";

export async function exportDiagnosticsReport(report: string): Promise<string> {
  return invoke<string>("export_diagnostics_report", { report });
}
```

Modify `src/l4-atom/system/index.ts`:

```typescript
export { exportDiagnosticsReport } from "./exportDiagnostics";
```

- [ ] **Step 2: Add Rust redaction guard**

In `src-tauri/src/sidecar.rs`, add:

```rust
fn contains_unmasked_assignment(report: &str, marker: &str) -> bool {
    for line in report.lines() {
        let lowered = line.to_ascii_lowercase();
        if let Some(index) = lowered.find(marker) {
            let tail = line[index + marker.len()..].trim_start();
            if tail.starts_with("******") || tail.starts_with("<redacted>") {
                continue;
            }
            return true;
        }
    }
    false
}

fn contains_unsafe_diagnostic_content(report: &str) -> bool {
    let lowered = report.to_ascii_lowercase();
    [
        "data_key=",
        "data_key:",
        "datakey=",
        "datakey:",
        "img_key=",
        "img_key:",
        "imgkey=",
        "imgkey:",
        "api_key=",
        "api_key:",
        "apikey=",
        "apikey:",
        "token=",
        "token:",
        "authorization: bearer ",
        "credential=",
        "credential:",
    ]
    .iter()
    .any(|marker| contains_unmasked_assignment(report, marker))
        || (lowered.contains("sk-") && !lowered.contains("sk-******"))
        || (lowered.contains("ghp_") && !lowered.contains("ghp_******"))
        || (lowered.contains("c:/users/") && !lowered.contains("c:/users/<user>"))
        || (lowered.contains("c:\\users\\") && !lowered.contains("c:\\users\\<user>"))
        || lowered.contains("private chat")
        || lowered.contains("message body")
        || report.contains("wxid_")
}

pub async fn export_diagnostics_report_command(report: String) -> Result<String, String> {
    use std::io::Write;
    if contains_unsafe_diagnostic_content(&report) {
        return Err("诊断内容未完成脱敏，已取消导出".into());
    }
    let path = std::env::temp_dir().join("chatlog_alpha_diagnostics.txt");
    let mut file = std::fs::File::create(&path).map_err(|e| format!("无法创建诊断文件: {}", e))?;
    file.write_all(report.as_bytes())
        .map_err(|e| format!("写入诊断文件失败: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}
```

Replace the existing `export_logs_command()` body so the legacy command fails closed through the same guard while the frontend migrates away from it:

```rust
pub async fn export_logs_command(logs: Vec<LogPayload>) -> Result<String, String> {
    let report = logs
        .iter()
        .map(|entry| format!("[{}] {}", entry.level, entry.message))
        .collect::<Vec<_>>()
        .join("\n");
    export_diagnostics_report_command(report).await
}
```

Add Rust tests in the existing `#[cfg(test)] mod tests`:

```rust
#[test]
fn diagnostic_guard_blocks_unredacted_secrets() {
    assert!(contains_unsafe_diagnostic_content("data_key=secret"));
    assert!(contains_unsafe_diagnostic_content("token: ghp_secret"));
    assert!(contains_unsafe_diagnostic_content("C:/Users/Alice/Documents/WeChat Files"));
    assert!(contains_unsafe_diagnostic_content("message body: private chat"));
    assert!(!contains_unsafe_diagnostic_content("api_key=******"));
    assert!(!contains_unsafe_diagnostic_content("C:/Users/<user>/Documents"));
    assert!(!contains_unsafe_diagnostic_content("HTTP ready: true\nSecret presence: data key present"));
}
```

- [ ] **Step 3: Register Tauri command**

In `src-tauri/src/commands.rs`, add:

```rust
#[tauri::command]
pub async fn export_diagnostics_report(report: String) -> Result<String, String> {
    crate::sidecar::export_diagnostics_report_command(report).await
}
```

In `src-tauri/src/lib.rs`, add `export_diagnostics_report` to the invoke handler list next to `export_logs`.

- [ ] **Step 4: Verify**

Run:

```powershell
Push-Location src-tauri
cargo test
Pop-Location
pnpm typecheck
```

Expected: PASS.

## 10. Task C6: Diagnostics Commander And DevConsole Cleanup

**Files:**
- Create: `src/l2-coordinator/commander/useDiagnosticsCommander.ts`
- Modify: `src/l2-coordinator/commander/useDevConsoleCommander.ts`
- Modify: `src/l3-molecule/common/DevConsole.tsx`

- [ ] **Step 1: Add diagnostics commander**

Create `src/l2-coordinator/commander/useDiagnosticsCommander.ts`:

```typescript
import { useCallback, useMemo, useState } from "react";
import { buildDiagnosticReport } from "./diagnostics";
import { useSetupStore } from "@/l2-coordinator/data-clerk/stores/useSetupStore";
import { useDevConsoleStore } from "@/l2-coordinator/data-clerk/stores/useDevConsoleStore";
import { exportDiagnosticsReport } from "@l4/system";
import { SIDECAR_PORT } from "@/utils/constants";
import packageJson from "../../../package.json";

export function useDiagnosticsCommander() {
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const setupProfile = useSetupStore((state) => state.profile);
  const setupMode = useSetupStore((state) => state.mode);
  const portState = useSetupStore((state) => state.portState);
  const httpReady = useSetupStore((state) => state.httpReady);
  const dbReady = useSetupStore((state) => state.dbReady);
  const setupError = useSetupStore((state) => state.error);
  const logs = useDevConsoleStore((state) => state.logs);

  const report = useMemo(() => {
    return buildDiagnosticReport({
      appVersion: packageJson.version,
      sidecarBaseUrl: `http://127.0.0.1:${SIDECAR_PORT}`,
      setup: setupProfile
        ? {
            mode: setupMode,
            source: setupProfile.source,
            configDir: setupProfile.configDir,
            dataDir: setupProfile.dataDir,
            workDir: setupProfile.workDir,
            portState,
            httpReady,
            dbReady,
            hasDataKey: setupProfile.hasDataKey,
            hasImgKey: setupProfile.hasImgKey,
            error: setupError,
          }
        : null,
      logs,
    });
  }, [dbReady, httpReady, logs, portState, setupError, setupMode, setupProfile]);

  const copyDiagnostics = useCallback(async () => {
    if (report.redactionStatus !== "safe") {
      setExportError("诊断内容未完成脱敏，无法复制。");
      return false;
    }
    try {
      await navigator.clipboard.writeText(report.text);
      setExportError(null);
      return true;
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [report]);

  const exportDiagnostics = useCallback(async () => {
    setExportError(null);
    setExportPath(null);
    if (report.redactionStatus !== "safe") {
      setExportError("诊断内容未完成脱敏，无法导出。");
      return null;
    }
    try {
      const path = await exportDiagnosticsReport(report.text);
      setExportPath(path);
      return path;
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
      return null;
    }
  }, [report]);

  return {
    report,
    exportPath,
    exportError,
    copyDiagnostics,
    exportDiagnostics,
  };
}
```

- [ ] **Step 2: Route DevConsole export through diagnostics commander**

Modify `src/l2-coordinator/commander/useDevConsoleCommander.ts`:

- Remove direct `invoke` import.
- Keep lifecycle log listening.
- Return only logs/visible/toggle/clear.

Modify `src/l3-molecule/common/DevConsole.tsx`:

- Import `useDiagnosticsCommander`.
- Replace `AppleButton` with `Button`.
- Remove `alert()`.
- Show export success/error inline with `Typography`.

The action row should use:

```tsx
<Button variant="ghost" size="sm" onClick={() => void exportDiagnostics()}>
  导出诊断
</Button>
<Button variant="ghost" size="sm" onClick={clear}>
  清空
</Button>
<Button variant="ghost" size="sm" onClick={toggle}>
  关闭
</Button>
```

- [ ] **Step 3: Verify no common diagnostics AppleButton/alert remains**

Run:

```powershell
rg -n "AppleButton|alert\(|@tauri-apps/api/core" src/l3-molecule/common src/l2-coordinator/commander/useDevConsoleCommander.ts
pnpm typecheck
```

Expected: `rg` exits 1 with no matches; `pnpm typecheck` PASS.

## 11. Task C7: Settings Store Privacy And Validation

**Files:**
- Modify: `src/l2-coordinator/api-docs/settings.ts`
- Modify: `src/l2-coordinator/data-clerk/stores/useSettingsStore.ts`
- Modify: `src/l2-coordinator/data-clerk/stores/settingsMigration.test.ts`
- Create: `src/l2-coordinator/commander/settingsValidation.ts`
- Create: `src/l2-coordinator/commander/settingsValidation.test.ts`

- [ ] **Step 1: Write failing settings validation tests**

Create `src/l2-coordinator/commander/settingsValidation.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { sanitizeSettingsForStorage, validateSettingsPatch } from "./settingsValidation";

describe("settings validation", () => {
  it("does not persist raw AI credentials in UI settings storage", () => {
    const sanitized = sanitizeSettingsForStorage({
      aiProvider: "glm",
      aiApiKey: "sk-secret",
      aiCredentialConfigured: true,
    });

    expect("aiApiKey" in sanitized).toBe(false);
    expect(sanitized.aiCredentialConfigured).toBe(false);
  });

  it("marks appearance material as disabled when the option is not implemented", () => {
    const result = validateSettingsPatch({ windowMaterial: "vibrancy" });

    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("windowMaterial");
  });
});
```

Run:

```powershell
pnpm test -- src/l2-coordinator/commander/settingsValidation.test.ts
```

Expected: FAIL because `settingsValidation.ts` does not exist.

- [ ] **Step 2: Update settings types**

Modify `src/l2-coordinator/api-docs/settings.ts`:

```typescript
export interface SettingsState {
  aiProvider: string;
  aiModel: string;
  aiEndpoint: string;
  aiCredentialConfigured: boolean;
  theme: ThemeMode;
  fontSize: FontSize;
  reduceAnimations: boolean;
  windowMaterial: WindowMaterial;
  wxDataPath: string;
  sidecarPort: number;
  privacyOn: boolean;
}
```

Remove `aiApiKey` from `SETTINGS_DEFAULTS` and add:

```typescript
aiCredentialConfigured: false,
```

- [ ] **Step 3: Implement settings validation helper**

Create `src/l2-coordinator/commander/settingsValidation.ts`:

```typescript
import type { SettingsState } from "@/l2-coordinator/api-docs/settings";

export interface SettingsValidationError {
  field: keyof SettingsState;
  message: string;
}

export interface SettingsValidationResult {
  valid: boolean;
  errors: SettingsValidationError[];
}

export function sanitizeSettingsForStorage(
  patch: Partial<SettingsState> & { aiApiKey?: string },
): Partial<SettingsState> {
  const safe: Partial<SettingsState> & { aiApiKey?: string } = { ...patch };
  if ("aiApiKey" in safe) {
    safe.aiCredentialConfigured = false;
  }
  delete safe.aiApiKey;
  return safe;
}

export function validateSettingsPatch(patch: Partial<SettingsState>): SettingsValidationResult {
  const errors: SettingsValidationError[] = [];
  if (patch.windowMaterial && patch.windowMaterial !== "none" && patch.windowMaterial !== "mica") {
    errors.push({
      field: "windowMaterial",
      message: "当前 Windows x64 版本只开放 Mica 或不透明窗口材质。",
    });
  }
  if (patch.sidecarPort !== undefined && patch.sidecarPort !== 5030) {
    errors.push({
      field: "sidecarPort",
      message: "当前 sidecar 合约固定使用 5030，修改端口需要单独的 sidecar 规格变更。",
    });
  }
  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 4: Update migration tests**

Modify `settingsMigration.test.ts` so persisted `aiApiKey` is removed:

```typescript
it("removes persisted AI api keys from browser settings", () => {
  const migrated = migrateSettings({
    aiProvider: "glm",
    aiApiKey: "sk-secret",
    aiCredentialConfigured: true,
  });

  expect("aiApiKey" in migrated).toBe(false);
  expect(migrated.aiCredentialConfigured).toBe(false);
});
```

Modify `useSettingsStore.ts`:

- Initial `activeCategory` becomes `"data"`.
- `migrateSettings()` removes `dataKey` and `aiApiKey`; if an old `aiApiKey` was present, reset `aiCredentialConfigured` to `false`.
- `updateSettings()` remains typed as `Partial<SettingsState>`; extended patches that may include transient `aiApiKey` are sanitized in `useSettingsCommander.updateAndSave()` before they reach the store.

- [ ] **Step 5: Verify**

Run:

```powershell
pnpm test -- src/l2-coordinator/commander/settingsValidation.test.ts src/l2-coordinator/data-clerk/stores/settingsMigration.test.ts
pnpm typecheck
```

Expected: PASS.

## 12. Task C8: Settings Commander Boundary Cleanup

**Files:**
- Modify: `src/l2-coordinator/commander/useSettingsCommander.ts`
- Modify: `src/l2-coordinator/commander/useSetupCommander.ts`
- Modify: `src/l3-molecule/settings/DataSettings.tsx`
- Modify: `src/l3-molecule/setup/ConfigImportPanel.tsx`

- [ ] **Step 1: Add commander-owned directory selection**

Modify `useSettingsCommander.ts`:

```typescript
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { openDirectoryPicker } from "@l4/system";
import { sanitizeSettingsForStorage, validateSettingsPatch } from "./settingsValidation";
```

Add state:

```typescript
const [saveMessage, setSaveMessage] = useState<string | null>(null);
const [validationError, setValidationError] = useState<string | null>(null);
```

Change `updateAndSave`:

```typescript
const updateAndSave = useCallback((partial: Partial<SettingsState> & { aiApiKey?: string }) => {
  const safePatch = sanitizeSettingsForStorage(partial);
  const validation = validateSettingsPatch(safePatch);
  if (!validation.valid) {
    setValidationError(validation.errors[0].message);
    return false;
  }
  setValidationError(null);
  store.updateSettings(safePatch);
  store.saveToStorage();
  setSaveMessage("已保存");
  return true;
}, [store]);
```

Add:

```typescript
const chooseDataDirectory = useCallback(async () => {
  const path = await openDirectoryPicker();
  if (!path) return null;
  updateAndSave({ wxDataPath: path });
  return path;
}, [updateAndSave]);
```

Return `chooseDataDirectory`, `saveMessage`, and `validationError`.

- [ ] **Step 2: Add setup commander directory selection**

Modify `useSetupCommander.ts`:

```typescript
import { openDirectoryPicker } from "@l4/system";
```

Add `chooseAndImportDataDirectory` to `SetupCommander`:

```typescript
chooseAndImportDataDirectory: () => Promise<string | null>;
```

Add the callback before `openWorkbench`:

```typescript
const chooseAndImportDataDirectory = useCallback(async () => {
  const dir = await openDirectoryPicker();
  if (!dir) return null;
  await importDataDirectory(dir);
  return dir;
}, [importDataDirectory]);
```

Return `chooseAndImportDataDirectory` from the commander.

- [ ] **Step 3: Remove L3 direct L4 picker calls**

Modify `DataSettings.tsx`:

- Remove `openDirectoryPicker` import.
- Use `const { settings, updateAndSave, chooseDataDirectory, validationError, saveMessage } = useSettingsCommander();`
- `handlePickPath` calls `await chooseDataDirectory()`.

Modify `ConfigImportPanel.tsx`:

- Use `const { chooseAndImportDataDirectory } = useSetupCommander();`
- `handlePickDir` calls `const dir = await chooseAndImportDataDirectory(); if (dir) setPicked(dir);`
- Remove `openDirectoryPicker` import from `ConfigImportPanel.tsx`.

- [ ] **Step 4: Verify boundary scan**

Run:

```powershell
rg -n "@l4/system|openDirectoryPicker" src/l3-molecule/settings src/l3-molecule/setup
pnpm typecheck
```

Expected: `rg` exits 1 with no matches in those directories; typecheck PASS.

## 13. Task C9: Settings UI Polish

**Files:**
- Modify: `src/l1-entry/pages/SettingsView.tsx`
- Modify: `src/l3-molecule/settings/SettingsLayout.tsx`
- Modify: `src/l3-molecule/settings/DataSettings.tsx`
- Modify: `src/l3-molecule/settings/AIModelSettings.tsx`
- Modify: `src/l3-molecule/settings/AppearanceSettings.tsx`
- Modify: `src/l3-molecule/settings/AboutSettings.tsx`

- [ ] **Step 1: Keep L1 as a shell**

`SettingsView.tsx` should not call `useAppStore` or `useAiCommander` directly. Replace those reads with a settings view model returned by `useSettingsCommander()` or a small `useSettingsPageCommander()` if keeping `useSettingsCommander()` focused.

Target page shape:

```tsx
export function SettingsView() {
  const navigate = useNavigate();
  const settingsPage = useSettingsCommander();

  return (
    <AppLayout title="设置">
      <div className="settings-page">
        <header className="settings-page__header">
          <Button variant="ghost" size="sm" onClick={() => navigate("/workbench", { replace: true })}>
            <ArrowLeft size={15} />
            返回工作台
          </Button>
          <Typography variant="label" weight={600}>设置</Typography>
        </header>
        <SettingsLayout
          activeCategory={settingsPage.activeCategory}
          onCategoryChange={settingsPage.setActiveCategory}
        >
          {renderSettingsContent(settingsPage.activeCategory)}
        </SettingsLayout>
      </div>
    </AppLayout>
  );
}
```

Do not include `StatusBar` in Settings unless all status data comes through L2 view-model props.

Modify `SettingsLayout.tsx` so it does not call `useSettingsCommander()` internally:

```tsx
interface SettingsLayoutProps {
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
  children: ReactNode;
}

export function SettingsLayout({ activeCategory, onCategoryChange, children }: SettingsLayoutProps) {
  return (
    <div className="settings-shell">
      <nav className="settings-shell__nav" aria-label="设置分类">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => onCategoryChange(cat.key)}
            className={[
              "settings-category-button",
              activeCategory === cat.key ? "settings-category-button--active" : "",
            ].filter(Boolean).join(" ")}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </nav>
      <div className="settings-shell__content">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Make AI settings honest**

`AIModelSettings.tsx` must state semantic is optional and P3 contract dependent. It must not echo saved API keys.

Use field text:

```tsx
<Typography variant="body" color="var(--text-secondary)">
  语义检索和问答是增强功能。缺少模型配置不会影响启动、聊天浏览、搜索和统计。
</Typography>
```

For non-Ollama providers, remove the persisted API-key input from settings. Show an honest credential state instead:

```tsx
{settings.aiProvider !== "ollama" && (
  <Surface variant="subtle" className="settings-section">
    <Typography variant="label" weight={700}>
      凭据状态
    </Typography>
    <Typography variant="body" color="var(--text-secondary)">
      API Key 不保存在 UI 设置存储中。语义配置向导会在 P2-D/P3 按后端合约处理连接测试、保存和索引状态。
    </Typography>
  </Surface>
)}
```

Do not set `aiCredentialConfigured` to `true` unless it comes from a verified secure semantic configuration source in a later task.

- [ ] **Step 3: Make Appearance settings real where already supported, disabled where unsupported**

Extend `useSettingsBootstrap()` in `useSettingsCommander.ts` so theme, font size, and reduced motion visibly affect the document root:

```typescript
const settings = useSettingsStore((state) => state.settings);

useLayoutEffect(() => {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.fontSize = settings.fontSize;
  document.documentElement.dataset.motion = settings.reduceAnimations ? "reduced" : "standard";
}, [settings.fontSize, settings.reduceAnimations, settings.theme]);
```

Keep window material controlled through existing `AppLayout`/`applyWindowMaterial`; block unsupported values through `validateSettingsPatch()` and show `validationError` in `AppearanceSettings`. Do not leave controls that appear saved but have no visible effect.

- [ ] **Step 4: Replace hard-coded About version**

Use `package.json` version via `resolveJsonModule`:

```typescript
import packageJson from "../../../package.json";
```

Display:

- App version: `packageJson.version`
- Frontend stack: current text
- Sidecar version: `未检测` until a real command exists
- Package status: `Windows x64 build evidence pending` unless release evidence says otherwise

- [ ] **Step 5: Verify**

Run:

```powershell
rg -n "useAppStore|useAiCommander" src/l1-entry/pages/SettingsView.tsx
rg -n "aiApiKey|type=\"password\" value=\{settings\.aiApiKey\}" src/l3-molecule/settings
pnpm lint
pnpm typecheck
```

Expected: first two `rg` commands exit 1 with no matches; lint/typecheck PASS.

## 14. Task C10: Diagnostics UI Panels

**Files:**
- Create: `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx`
- Create: `src/l3-molecule/diagnostics/DiagnosticCopyButton.tsx`
- Modify: `src/l3-molecule/setup/DiagnosticPanel.tsx`
- Modify: `src/l3-molecule/setup/ReadinessChecklist.tsx`
- Modify: `src/l3-molecule/setup/ServiceControlPanel.tsx`

- [ ] **Step 1: Add diagnostic copy button**

Create `src/l3-molecule/diagnostics/DiagnosticCopyButton.tsx`:

```tsx
import { Copy, Download } from "lucide-react";
import { Button } from "@l4/ui";

interface DiagnosticCopyButtonProps {
  onCopy: () => Promise<boolean>;
  onExport: () => Promise<string | null>;
}

export function DiagnosticCopyButton({ onCopy, onExport }: DiagnosticCopyButtonProps) {
  return (
    <div className="diagnostics-actions">
      <Button variant="secondary" size="sm" onClick={() => void onCopy()}>
        <Copy size={14} />
        复制诊断
      </Button>
      <Button variant="secondary" size="sm" onClick={() => void onExport()}>
        <Download size={14} />
        导出诊断
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Add unified diagnostics panel**

Create `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx`:

```tsx
import { useDiagnosticsCommander } from "@l2/commander/useDiagnosticsCommander";
import { Surface, Typography } from "@l4/ui";
import { DiagnosticCopyButton } from "./DiagnosticCopyButton";

export function DiagnosticsPanel() {
  const { report, exportPath, exportError, copyDiagnostics, exportDiagnostics } = useDiagnosticsCommander();

  return (
    <Surface variant="base" className="diagnostics-panel">
      <div className="diagnostics-panel__header">
        <Typography variant="label" weight={700}>诊断摘要</Typography>
        <Typography variant="caption" color={report.redactionStatus === "safe" ? "var(--success)" : "var(--danger)"}>
          {report.redactionStatus === "safe" ? "已脱敏" : "已阻止导出"}
        </Typography>
      </div>
      <pre className="diagnostics-panel__body">
        {report.redactionStatus === "safe" ? report.text : "诊断内容未完成脱敏，已阻止显示和导出。"}
      </pre>
      <DiagnosticCopyButton onCopy={copyDiagnostics} onExport={exportDiagnostics} />
      {exportPath && <Typography variant="caption" color="var(--text-secondary)">已导出到脱敏诊断文件。</Typography>}
      {exportError && <Typography variant="caption" color="var(--danger)">{exportError}</Typography>}
    </Surface>
  );
}
```

- [ ] **Step 3: Convert setup DiagnosticPanel into wrapper**

Modify `src/l3-molecule/setup/DiagnosticPanel.tsx`:

```tsx
import { DiagnosticsPanel } from "@l3/diagnostics/DiagnosticsPanel";

export function DiagnosticPanel() {
  return <DiagnosticsPanel />;
}
```

- [ ] **Step 4: Tokenize setup readiness and service controls**

`ReadinessChecklist.tsx` should use `StatusIndicator` instead of Unicode check/dash circles.

`ServiceControlPanel.tsx` should use `Button`, `Surface`, `ReadinessStatePanel`, and `StatusIndicator` instead of raw `<button>` and raw Tailwind status rows.

- [ ] **Step 5: Add diagnostics CSS**

Add to `src/styles/layout.css`:

```css
.diagnostics-panel {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
}

.diagnostics-panel__header,
.diagnostics-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.diagnostics-panel__body {
  max-height: 220px;
  overflow: auto;
  margin: 0;
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--surface-subtle);
  color: var(--text-secondary);
  font-family: Consolas, "SFMono-Regular", monospace;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
```

- [ ] **Step 6: Verify**

Run:

```powershell
rg -n "Config dir:|Data dir:|Work dir:|Last error:" src/l3-molecule/setup src/l3-molecule/diagnostics
rg -n "<button|AppleButton" src/l3-molecule/setup src/l3-molecule/diagnostics
pnpm lint
pnpm typecheck
```

Expected: first `rg` has no raw diagnostic labels in setup; second `rg` exits 1 with no raw buttons or AppleButton; lint/typecheck PASS.

## 15. Task C11: StatusBar Semantic Display

**Files:**
- Modify: `src/l3-molecule/common/StatusBar.tsx`
- Create: `src/l3-molecule/common/statusDisplay.ts`
- Create: `src/l3-molecule/common/statusDisplay.test.ts`

- [ ] **Step 1: Write failing display tests**

Create `src/l3-molecule/common/statusDisplay.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { getIndexStatusDisplay } from "./statusDisplay";

describe("status display", () => {
  it("shows old building index status without claiming backend contract completeness", () => {
    expect(getIndexStatusDisplay({ status: "building", total: 100, completed: 25 })).toEqual({
      label: "语义索引处理中 25%",
      tone: "ai",
      busy: true,
    });
  });

  it("shows missing or unsupported index status as absent", () => {
    expect(getIndexStatusDisplay(null)).toBeNull();
  });
});
```

Run:

```powershell
pnpm test -- src/l3-molecule/common/statusDisplay.test.ts
```

Expected: FAIL because `statusDisplay.ts` does not exist.

- [ ] **Step 2: Implement display helper**

Create `src/l3-molecule/common/statusDisplay.ts`:

```typescript
import type { IndexStatusResponse } from "@/l2-coordinator/api-docs/semantic";
import type { StatusTone } from "@l4/ui";

export interface StatusDisplay {
  label: string;
  tone: StatusTone;
  busy?: boolean;
}

export function getIndexStatusDisplay(indexStatus: IndexStatusResponse | null | undefined): StatusDisplay | null {
  if (!indexStatus) return null;
  if (indexStatus.status === "ready") {
    return { label: "语义索引就绪", tone: "ai" };
  }
  if (indexStatus.status === "building") {
    const progress = indexStatus.total > 0 ? Math.round((indexStatus.completed / indexStatus.total) * 100) : 0;
    return { label: `语义索引处理中 ${progress}%`, tone: "ai", busy: true };
  }
  if (indexStatus.status === "paused") {
    return { label: "语义索引已暂停", tone: "warning" };
  }
  if (indexStatus.status === "error") {
    return { label: "语义索引异常", tone: "danger" };
  }
  return null;
}
```

- [ ] **Step 3: Use helper in StatusBar**

Modify `StatusBar.tsx`:

- Import `getIndexStatusDisplay`.
- Replace inline `indexProgress/isIndexBuilding` logic.
- Render:

```tsx
const indexDisplay = getIndexStatusDisplay(indexStatus);
...
{indexDisplay && (
  <StatusIndicator label={indexDisplay.label} tone={indexDisplay.tone} busy={indexDisplay.busy} />
)}
```

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm test -- src/l3-molecule/common/statusDisplay.test.ts
pnpm typecheck
```

Expected: PASS.

## 16. Task C12: Final Verification And Browser Smoke

**Files:**
- Modify: `progress.md`
- Modify: `task_plan.md`
- Modify: `specs/001-ready-desktop-app/architecture-boundary-check.md`
- Modify: `specs/001-ready-desktop-app/release-evidence.md`

- [ ] **Step 1: Run automated verification**

Run:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If Rust files changed, also run:

```powershell
Push-Location src-tauri
cargo test
Pop-Location
```

Expected: all commands PASS. If `pnpm build` keeps the lazy GraphModule chunk warning, record it as P2-D/P2-E debt, not a P2-C failure.

- [ ] **Step 2: Run boundary scans**

Run:

```powershell
rg -n "@l4/system|openDirectoryPicker" src/l3-molecule/settings src/l3-molecule/setup
rg -n "@tauri-apps/api/core" src/l2-coordinator/commander src/l3-molecule
rg -n "AppleButton|alert\(" src/l3-molecule/common src/l3-molecule/settings src/l3-molecule/setup src/l3-molecule/diagnostics
rg -n "dataKey|data_key|apiKey|api_key|token|secret|credential" src/l3-molecule src/l2-coordinator src/l4-atom src/utils
```

Expected:

- First three commands exit 1 with no matches in P2-C-owned surfaces.
- Fourth command may match type names/tests/redaction helpers, but no UI echo path or diagnostic export should expose raw secrets.

- [ ] **Step 3: Browser smoke**

Start or reuse the dev server:

```powershell
pnpm dev -- --host 127.0.0.1
```

Use Codex Browser or Playwright against `http://127.0.0.1:5173/`.

Check:

- `/` Setup Center at 1440px and 390px.
- `/workbench` not-ready state at 1440px and 390px.
- `/settings` at 1440px and 390px.
- Settings opens on Data category.
- Data directory selection button has stable touch target and no direct raw path leak in diagnostics.
- AI settings states missing-provider as optional and does not echo saved API key.
- Appearance settings either visibly apply or show disabled/honest state.
- About version is not hard-coded `1.0.0`.
- DevConsole opens/closes, exports diagnostics without `alert()`, and redaction state is visible.
- Diagnostics copy/export blocks if redaction status is unsafe.
- Status bar uses `info/ai/success/warning/danger/neutral` taxonomy with no `accent`.
- No horizontal overflow or clipped primary controls at 390px.

- [ ] **Step 4: Update docs and evidence**

Append to `progress.md`:

```markdown
## 2026-05-30 P2-C Implementation Verification

- `pnpm lint` -- PASS
- `pnpm typecheck` -- PASS
- `pnpm test` -- PASS; record the exact Vitest file/test count from the current run.
- `pnpm build` -- PASS; record whether the lazy GraphModule warning appears.
- `cargo test` -- PASS if Rust changed; otherwise record that Rust was not touched.
- Boundary scan: no direct L4 system picker calls remain in P2-C setup/settings molecules.
- Browser smoke: `/`, `/workbench`, `/settings` checked at 1440px and 390px.
- Release evidence: P2-C settings/diagnostics state updated; install/quit/reopen/port-conflict manual smoke remains pending.
```

Update `task_plan.md` with P2-C implementation status only after all verification commands have fresh passing evidence.

Update `specs/001-ready-desktop-app/architecture-boundary-check.md` with the new scan result.

Update `specs/001-ready-desktop-app/release-evidence.md` under privacy/diagnostics with the redaction-safe result. Do not mark install, launch, quit, reopen, or port conflict as complete unless manually verified.

## 17. Acceptance Criteria

- Settings opens with Data first and does not briefly default to AI in normal load.
- Settings L1 page no longer reads app/AI stores directly.
- Settings/setup L3 components no longer call L4 system directory picker directly.
- Data settings show selected data path in a redacted or non-sensitive way when privacy mode is enabled.
- AI settings clearly state semantic features are optional and do not block browsing/search/stats.
- AI settings do not persist or echo raw API keys in UI settings storage.
- AI settings do not claim provider credentials are configured unless that state comes from a verified secure semantic configuration source.
- Appearance settings either apply theme/font/motion/material choices or show explicit disabled/honest state for unsupported options.
- About settings display real app package version and honest sidecar version availability.
- Diagnostics panel is reusable, user-triggered, redaction-first, and fails closed if unsafe content is detected.
- DevConsole uses tokenized `Button`/status text, not `AppleButton` or `alert()`.
- Status tone taxonomy is `neutral/info/success/warning/danger/ai`.
- `StatusBar` no longer mislabels semantic index status as fully adapted when only legacy status shape is available.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
- `cargo test` passes if Rust diagnostic export changes are implemented.
- Browser smoke for `/`, `/workbench`, and `/settings` at 1440px and 390px is recorded in `progress.md`.

## 18. Risk Register

- **Risk:** P2-C accidentally becomes full semantic settings implementation.
  **Response:** Keep semantic provider UI honest and optional; backend semantic config/schema/SSE fixes remain P2-D/P3.

- **Risk:** Diagnostics export leaks private local paths or log content.
  **Response:** Redact in TS before export and fail closed in Rust if unsafe markers remain.

- **Risk:** Strict architecture cleanup becomes too broad.
  **Response:** P2-C only cleans settings/setup diagnostics and common surfaces. Core chat/search/stats direct store reads are recorded as staged architecture debt unless touched for P2-C.

- **Risk:** Appearance controls look functional but do nothing.
  **Response:** Either implement visible runtime application in `useSettingsBootstrap()` or disable unsupported controls with clear text.

- **Risk:** Browser smoke is run in Vite only and misses packaged behavior.
  **Response:** P2-C records Vite UI smoke only; packaged Windows install/quit/reopen evidence remains release-gate work.

## 19. Self-Review

- Spec coverage: This plan covers P2-C from the P2 master plan and maps to ready-desktop-app settings/privacy/diagnostics requirements FR-017 through FR-021 plus architecture and redaction contracts.
- Placeholder scan: No task uses incomplete placeholder language or vague fallback wording.
- Type consistency: New types are named `ReadinessState`, `ReadinessTone`, `DiagnosticReport`, and `SettingsValidationResult`; component names are `ReadinessStatePanel`, `DiagnosticsPanel`, and `DiagnosticCopyButton`.
- Scope check: P2-D semantic/graph containment and P2-E release/manual smoke remain outside this plan.
- Second-pass correction check: L4 does not import L2 readiness types, legacy `export_logs` is guarded by the same fail-closed path, diagnostics use live store selectors, `SettingsLayout` receives category props, and AI settings do not claim credentials are configured without a verified secure source.

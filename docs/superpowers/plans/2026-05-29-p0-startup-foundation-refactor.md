# P0 Startup Foundation Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the first-run setup, configuration, sidecar lifecycle, readiness checks, routing gate, and API client foundation so `chatlogUI` can safely start or connect to a real `chatlog_alpha` service without corrupting the original workflow.

**Architecture:** Introduce a setup-centered foundation before any chat/AI/graph feature work. Sensitive chatlog server configuration moves out of browser localStorage into an app-managed `chatlog-server.json` config directory; Tauri owns config import/validation and safe sidecar lifecycle; React owns setup state, progressive user guidance, status display, and routing. HTTP calls go through a single client that appends `format=json`, preserves structured errors, and maps raw `chatlog_alpha` DTOs into UI models.

**Tech Stack:** React 18, React Router 6, Zustand 5, Vite 6, Vitest 4, Tauri v2, Rust, `tauri-plugin-shell`, `tauri-plugin-dialog`, original Go `chatlog_alpha` HTTP server.

---

## 1. Why P0 Exists

The current UI fails before the user reaches useful functionality because it assumes `chatlog_alpha` can be started with only a data directory and data key. That assumption is false for the real project.

Evidence from current code:

- `src/l4-atom/system/detectWxPath.ts` always returns `[]`.
- `src/l2-coordinator/commander/useAppCommander.ts` calls `killPort()` before every sidecar start.
- `src-tauri/src/sidecar.rs` launches `chatlog_alpha serve --data-dir --data-key`, but does not pass `type/platform/version/full_version/img_key`.
- `src/l1-entry/pages/DashboardView.tsx` redirects to `/` whenever `appPhase !== "ready"`, so the launch page “跳过” button cannot work.
- `src/l2-coordinator/data-clerk/stores/useSettingsStore.ts` stores `dataKey` in localStorage and defaults Settings to the AI tab.
- Most fetchers under `src/l4-atom/network` do not append `format=json`, even though original `chatlog_alpha` defaults to YAML.

Evidence from original `chatlog_alpha`:

- `cmd/chatlog/cmd_serve.go` accepts `--data-dir`, `--work-dir`, `--data-key`, `--http-addr`, and `--config`.
- `internal/chatlog/conf/conf.go` only loads `dataDir/chatlog.json` when `DataDir` is set and `DataKey` is empty.
- `internal/chatlog/conf/server.go` requires server config fields such as `data_dir`, `data_key`, `img_key`, `platform`, `version`, `full_version`, `work_dir`, and `http_addr`.
- Logs already show `start db failed: unsupported platform:  v0`, matching the current incomplete launch strategy.

P0 must therefore fix the launch foundation before P1/P2 UI polish or feature expansion.

## 2. P0 Scope

### In Scope

- First-run Setup Center replacing the current auto-boot-only launch screen.
- App-managed chatlog server configuration storage and import.
- Safe sidecar lifecycle and safe port handling.
- External service connection mode.
- Service health and DB readiness model.
- Basic diagnostics surfaced to the UI.
- API client foundation with JSON format enforcement and structured errors.
- Routing changes so the user can reach an empty workbench when not ready.
- Data/settings page changes for P0 fields.
- Tests for config validation, launch argument construction, port handling, setup state transitions, and HTTP client behavior.

### Out of Scope

- Full visual redesign of the entire chat/search/stats dashboard. That is P2.
- Full chat/session/history/search/stat feature repair. That is P1, except for shared API client foundations.
- Semantic AI setup, index management, SSE QA, and graph rebuild controls. That is P3.
- SNS, hook/push, media browser, DB explorer, wx-cli compatibility UI. That is P4.
- Packaging/release hardening. That is P5.

## 3. Product Requirements

P0 must make the app truthful and recoverable:

1. The app must not silently kill a user-managed `chatlog_alpha` process.
2. The app must not pass `data_key` on the command line in the normal managed path.
3. The app must not store `dataKey` in localStorage.
4. The app must distinguish these states:
   - no setup profile
   - profile incomplete
   - config valid
   - service stopped
   - service port occupied by unknown process
   - external service reachable
   - managed sidecar starting
   - HTTP health ok
   - DB not ready
   - DB ready
5. The app must let users choose between:
   - app-managed service
   - connect to existing service
6. The app must guide users through required setup without assuming terminal knowledge.
7. All setup errors must include:
   - what failed
   - likely cause
   - next action
   - diagnostic detail that can be copied
8. P0 must preserve enough structure for P1 to repair chat/session/history without another architecture rewrite.

## 4. UX Requirements

Use Apple-like principles as interaction guidance, not surface imitation:

- Setup is interactive and task-based, not a decorative splash screen.
- Permission/private-data prerequisites are explained at the moment they are needed.
- Status feedback is integrated into the interface and scales with severity.
- The setup flow uses progressive disclosure: simple path first, advanced manual fields only when needed.
- A sidebar/split-view shell is introduced for the post-setup workbench, but P0 only needs a minimal empty workbench.
- No emoji icons in structural navigation or setup actions.
- No fake macOS traffic-light controls on Windows.
- Form fields use visible labels, inline validation, helper text, keyboard focus, and accessible error announcements.

Reference guidelines used:

- Apple HIG Onboarding: https://developer.apple.com/design/human-interface-guidelines/onboarding
- Apple HIG Feedback: https://developer.apple.com/design/human-interface-guidelines/feedback
- Apple HIG Sidebars: https://developer.apple.com/design/human-interface-guidelines/sidebars
- Apple HIG Settings: https://developer.apple.com/design/human-interface-guidelines/settings
- Apple HIG Entering Data: https://developer.apple.com/design/human-interface-guidelines/entering-data

## 5. Target State Model

### Setup Modes

```ts
export type SetupMode = "managed" | "external";
```

`managed` means Tauri launches the bundled `chatlog_alpha` sidecar.  
`external` means the user already started `chatlog_alpha serve` manually, and the UI only connects to it.

### Config Source

```ts
export type ConfigSource =
  | "none"
  | "data-dir-chatlog-json"
  | "app-managed-server-config"
  | "manual-advanced"
  | "external-service";
```

### Setup Step Status

```ts
export type SetupStepStatus =
  | "blocked"
  | "idle"
  | "active"
  | "valid"
  | "warning"
  | "error";
```

### Readiness Layers

```ts
export type ServiceReadiness =
  | "unknown"
  | "stopped"
  | "port-conflict"
  | "starting"
  | "http-ready"
  | "db-ready"
  | "error";
```

`http-ready` must not be treated as `db-ready`. Current `/health` can return ok while `/api/v1/db` returns 503.

### Setup Profile

The browser store should keep only non-secret summary state:

```ts
export interface SetupProfileSummary {
  mode: SetupMode;
  source: ConfigSource;
  configDir: string | null;
  dataDir: string | null;
  workDir: string | null;
  httpAddr: string;
  port: number;
  platform: string | null;
  version: number | null;
  fullVersion: string | null;
  hasDataKey: boolean;
  hasImgKey: boolean;
  lastValidatedAt: string | null;
}
```

The full secret-bearing config must live in the app-managed server config file, not localStorage:

```json
{
  "type": "wechat",
  "platform": "windows",
  "version": 4,
  "full_version": "4.1.8.107",
  "data_dir": "E:\\OneDrive - Default Directory\\xwechat_files\\wxid_xxx",
  "work_dir": "E:\\OneDrive - Default Directory\\chatlogUI\\chatlog\\work",
  "data_key": "64-char-hex-key",
  "img_key": "optional-image-key",
  "http_addr": "127.0.0.1:5030",
  "save_decrypted_media": true
}
```

## 6. File Structure

### New Frontend Files

- `src/l2-coordinator/data-clerk/types/setup.ts`  
  Owns setup mode, setup profile summary, setup step state, validation errors, and service readiness types.

- `src/l2-coordinator/data-clerk/stores/useSetupStore.ts`  
  Owns setup wizard UI state, selected mode, profile summary, validation results, service readiness, and current step.

- `src/l2-coordinator/commander/setupMachine.ts`  
  Pure state machine helpers: derive current step, next enabled action, and readiness summary.

- `src/l2-coordinator/commander/useSetupCommander.ts`  
  Orchestrates Tauri config commands, port inspection, sidecar start/stop/connect, readiness polling, and UI state updates.

- `src/l1-entry/pages/SetupCenterView.tsx`  
  New first-run setup page replacing the current launch auto-boot experience.

- `src/l1-entry/pages/WorkbenchShellView.tsx`  
  Minimal post-setup shell that can show “not connected yet” without redirect loops.

- `src/l3-molecule/setup/SetupStepper.tsx`  
  Step list and progress indicator.

- `src/l3-molecule/setup/SetupModeChooser.tsx`  
  Managed vs external service choice.

- `src/l3-molecule/setup/ConfigImportPanel.tsx`  
  Import `chatlog.json`, import server config directory, or choose data directory.

- `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx`  
  Advanced fields for data dir, work dir, platform, version, full version, data key, img key, port.

- `src/l3-molecule/setup/ServiceControlPanel.tsx`  
  Start, connect, stop, retry, and conflict resolution controls.

- `src/l3-molecule/setup/ReadinessChecklist.tsx`  
  Shows profile, port, HTTP, and DB readiness as separate checks.

- `src/l3-molecule/setup/DiagnosticPanel.tsx`  
  Copyable diagnostic summary with secrets masked.

- `src/l4-atom/system/chatlogConfig.ts`  
  Tauri invoke wrappers for config load/import/write/validate.

- `src/l4-atom/system/sidecarManager.ts`  
  Tauri invoke wrappers for inspect/start/stop/connect.

- `src/l4-atom/network/httpClient.ts`  
  Shared fetch wrapper that appends `format=json`, applies timeout, parses JSON, and throws structured errors.

- `src/l4-atom/network/chatlogRawTypes.ts`  
  Raw DTOs matching original `chatlog_alpha` snake_case responses for P0/P1 endpoints.

- `src/l4-atom/network/chatlogAdapters.ts`  
  Pure adapter functions from raw DTOs to UI domain models.

- `src/l4-atom/network/readiness.ts`  
  `fetchHealth`, `fetchDbReadiness`, and readiness polling helpers built on `httpClient`.

### Modified Frontend Files

- `src/l1-entry/routes/index.tsx`  
  Route `/` to `SetupCenterView`, route `/workbench` or `/dashboard` to `WorkbenchShellView`.

- `src/l1-entry/pages/LaunchView.tsx`  
  Remove or reduce to a compatibility redirect to `SetupCenterView`.

- `src/l1-entry/pages/DashboardView.tsx`  
  Remove hard redirect to `/`; use readiness-aware empty state instead. If kept during P0, route it under `WorkbenchShellView`.

- `src/l1-entry/pages/SettingsView.tsx`  
  Default active category becomes `"data"` when setup is incomplete. AI stays available but not primary.

- `src/l2-coordinator/api-docs/settings.ts`  
  Remove secret `dataKey` from browser settings. Add non-secret setup summary references.

- `src/l2-coordinator/data-clerk/stores/useSettingsStore.ts`  
  Migrate old localStorage shape and erase persisted `dataKey`.

- `src/l2-coordinator/commander/useAppCommander.ts`  
  Stop owning launch orchestration. Keep only app-level helpers or replace with `useSetupCommander`.

- `src/l4-atom/system/spawnSidecar.ts`  
  Replace data-key-based payload with launch-plan-based payload.

- `src/l4-atom/system/killPort.ts`  
  Remove from boot path. Keep only if renamed to an explicit destructive action with confirmation, or delete.

- `src/utils/constants.ts`  
  Replace fixed `SIDECAR_PORT` consumers with profile-derived base URL where possible.

- `src-tauri/tauri.conf.json`  
  P0 can keep CSP fixed to 5030 if configurable ports are deferred, but the plan should document that dynamic ports require CSP changes in P5.

### New Rust Files

- `src-tauri/src/config_store.rs`  
  Reads/imports/writes app-managed `chatlog-server.json`, validates config, masks secrets for frontend.

- `src-tauri/src/service_probe.rs`  
  Inspects port occupancy, process identity, and HTTP/DB readiness.

- `src-tauri/src/sidecar_args.rs`  
  Pure sidecar argument builder with tests. Keeps launch decisions out of process spawn code.

### Modified Rust Files

- `src-tauri/src/lib.rs`  
  Register new modules and commands.

- `src-tauri/src/commands.rs`  
  Add commands for config store, port inspection, managed start/stop, and readiness probes.

- `src-tauri/src/sidecar.rs`  
  Use launch plans and `sidecar_args`; track managed PID and masked command summary.

- `src-tauri/src/port_killer.rs`  
  Stop being the default lifecycle tool. Convert to inspection-first helpers; destructive kill becomes explicitly managed-only.

- `src-tauri/src/health.rs`  
  Keep low-level HTTP check if useful, but readiness should move to `service_probe.rs`.

### New Tests

- `src/l2-coordinator/commander/setupMachine.test.ts`
- `src/l4-atom/network/httpClient.test.ts`
- `src/l4-atom/network/chatlogAdapters.test.ts`
- `src/l4-atom/system/spawnSidecar.test.ts` updated
- `src/l2-coordinator/data-clerk/stores/settingsMigration.test.ts`
- Rust unit tests in `config_store.rs`, `service_probe.rs`, `sidecar_args.rs`, and `port_killer.rs`.

## 7. Task Breakdown

### Task 1: Capture P0 Regressions as Tests

**Files:**
- Create: `src/l2-coordinator/commander/setupMachine.test.ts`
- Create: `src/l4-atom/network/httpClient.test.ts`
- Create: `src/l4-atom/network/chatlogAdapters.test.ts`
- Modify: `src/l4-atom/system/spawnSidecar.test.ts`
- Modify: `src-tauri/src/sidecar.rs`
- Create: `src-tauri/src/sidecar_args.rs`

- [ ] **Step 1: Add failing setup state machine tests**

Create tests that encode the expected P0 behavior before implementation:

```ts
import { describe, expect, it } from "vitest";
import { deriveSetupStep, deriveWorkbenchAccess } from "./setupMachine";
import type { SetupStateSnapshot } from "@l2/data-clerk/types/setup";

const base: SetupStateSnapshot = {
  mode: "managed",
  source: "none",
  profileComplete: false,
  configValid: false,
  portState: "unknown",
  httpReady: false,
  dbReady: false,
};

describe("setupMachine", () => {
  it("starts at config import when no setup profile exists", () => {
    expect(deriveSetupStep(base)).toBe("config");
  });

  it("does not treat HTTP health as DB readiness", () => {
    expect(
      deriveSetupStep({
        ...base,
        source: "app-managed-server-config",
        profileComplete: true,
        configValid: true,
        portState: "owned",
        httpReady: true,
        dbReady: false,
      }),
    ).toBe("database");
  });

  it("allows opening an empty workbench before DB is ready", () => {
    expect(deriveWorkbenchAccess({ ...base, httpReady: false, dbReady: false })).toEqual({
      allowed: true,
      connected: false,
      reason: "setup-incomplete",
    });
  });
});
```

Run:

```powershell
pnpm test src/l2-coordinator/commander/setupMachine.test.ts
```

Expected: FAIL because `setupMachine.ts` does not exist.

- [ ] **Step 2: Add failing HTTP client tests**

```ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { requestJson, ChatlogHttpError } from "./httpClient";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requestJson", () => {
  it("appends format=json to chatlog API requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("format=json");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    );

    await expect(requestJson("http://127.0.0.1:5030/api/v1/db")).resolves.toEqual({ ok: true });
  });

  it("preserves HTTP status and response body on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("db not ready", { status: 503 })),
    );

    await expect(requestJson("http://127.0.0.1:5030/api/v1/db")).rejects.toMatchObject({
      name: "ChatlogHttpError",
      status: 503,
      body: "db not ready",
    } satisfies Partial<ChatlogHttpError>);
  });
});
```

Run:

```powershell
pnpm test src/l4-atom/network/httpClient.test.ts
```

Expected: FAIL because `httpClient.ts` does not exist.

- [ ] **Step 3: Add failing sidecar argument tests**

Update `src/l4-atom/system/spawnSidecar.test.ts` to assert the frontend no longer sends `dataKey` in launch payload:

```ts
import { describe, expect, it } from "vitest";
import { createSpawnSidecarPayload } from "./spawnSidecar";

describe("createSpawnSidecarPayload", () => {
  it("uses config directory launch without exposing data key", () => {
    expect(
      createSpawnSidecarPayload({
        mode: "managed",
        configDir: " C:/Users/me/AppData/Roaming/chatlogUI ",
        httpAddr: " 127.0.0.1:5030 ",
      }),
    ).toEqual({
      mode: "managed",
      configDir: "C:/Users/me/AppData/Roaming/chatlogUI",
      dataDir: null,
      workDir: null,
      httpAddr: "127.0.0.1:5030",
    });
  });
});
```

Run:

```powershell
pnpm test src/l4-atom/system/spawnSidecar.test.ts
```

Expected: FAIL because the current payload shape still includes `dataKey`.

- [ ] **Step 4: Add Rust tests for sidecar args**

Create `src-tauri/src/sidecar_args.rs` with tests first:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_dir_launch_does_not_put_data_key_in_args() {
        let plan = SidecarLaunchPlan {
            http_addr: "127.0.0.1:5030".into(),
            config_dir: Some("C:\\Users\\me\\AppData\\Roaming\\chatlogUI".into()),
            data_dir: None,
            work_dir: None,
        };

        let args = build_sidecar_args(&plan);

        assert!(args.contains(&"--config".to_string()));
        assert!(args.contains(&"--http-addr".to_string()));
        assert!(!args.contains(&"--data-key".to_string()));
    }

    #[test]
    fn data_dir_config_launch_omits_data_key_so_chatlog_json_can_load() {
        let plan = SidecarLaunchPlan {
            http_addr: "127.0.0.1:5030".into(),
            config_dir: None,
            data_dir: Some("E:\\WeChat Files\\wxid_xxx".into()),
            work_dir: Some("E:\\chatlog\\work".into()),
        };

        let args = build_sidecar_args(&plan);

        assert!(args.contains(&"--data-dir".to_string()));
        assert!(args.contains(&"--work-dir".to_string()));
        assert!(!args.contains(&"--data-key".to_string()));
    }
}
```

Run:

```powershell
cd src-tauri
cargo test sidecar_args
```

Expected: FAIL because types/functions are not defined yet.

### Task 2: Define Setup Types and Pure State Machine

**Files:**
- Create: `src/l2-coordinator/data-clerk/types/setup.ts`
- Create: `src/l2-coordinator/commander/setupMachine.ts`
- Test: `src/l2-coordinator/commander/setupMachine.test.ts`

- [ ] **Step 1: Implement setup types**

Create `setup.ts`:

```ts
export type SetupMode = "managed" | "external";

export type ConfigSource =
  | "none"
  | "data-dir-chatlog-json"
  | "app-managed-server-config"
  | "manual-advanced"
  | "external-service";

export type PortState = "unknown" | "free" | "owned" | "external-chatlog" | "occupied";

export type SetupStepId = "mode" | "config" | "service" | "database" | "ready";

export interface SetupStateSnapshot {
  mode: SetupMode;
  source: ConfigSource;
  profileComplete: boolean;
  configValid: boolean;
  portState: PortState;
  httpReady: boolean;
  dbReady: boolean;
}

export interface WorkbenchAccess {
  allowed: boolean;
  connected: boolean;
  reason: "ready" | "setup-incomplete" | "service-not-ready" | "db-not-ready";
}

export interface SetupProfileSummary {
  mode: SetupMode;
  source: ConfigSource;
  configDir: string | null;
  dataDir: string | null;
  workDir: string | null;
  httpAddr: string;
  port: number;
  platform: string | null;
  version: number | null;
  fullVersion: string | null;
  hasDataKey: boolean;
  hasImgKey: boolean;
  lastValidatedAt: string | null;
}
```

- [ ] **Step 2: Implement pure state machine helpers**

Create `setupMachine.ts`:

```ts
import type { SetupStateSnapshot, SetupStepId, WorkbenchAccess } from "@l2/data-clerk/types/setup";

export function deriveSetupStep(state: SetupStateSnapshot): SetupStepId {
  if (!state.profileComplete || state.source === "none") return "config";
  if (!state.configValid) return "config";
  if (!state.httpReady) return "service";
  if (!state.dbReady) return "database";
  return "ready";
}

export function deriveWorkbenchAccess(state: SetupStateSnapshot): WorkbenchAccess {
  if (state.dbReady) {
    return { allowed: true, connected: true, reason: "ready" };
  }
  if (!state.profileComplete || !state.configValid) {
    return { allowed: true, connected: false, reason: "setup-incomplete" };
  }
  if (!state.httpReady) {
    return { allowed: true, connected: false, reason: "service-not-ready" };
  }
  return { allowed: true, connected: false, reason: "db-not-ready" };
}
```

- [ ] **Step 3: Run tests**

```powershell
pnpm test src/l2-coordinator/commander/setupMachine.test.ts
```

Expected: PASS.

### Task 3: Build Config Validation and Secret Masking in Rust

**Files:**
- Create: `src-tauri/src/config_store.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/commands.rs`

- [ ] **Step 1: Write Rust validation tests first**

Create `config_store.rs` with tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_complete_windows_config() {
        let cfg = ServerConfigDraft {
            data_dir: Some("E:\\WeChat Files\\wxid_xxx".into()),
            work_dir: Some("E:\\chatlog\\work".into()),
            data_key: Some("a".repeat(64)),
            img_key: Some("image-key".into()),
            platform: Some("windows".into()),
            version: Some(4),
            full_version: Some("4.1.8.107".into()),
            type_: Some("wechat".into()),
            http_addr: Some("127.0.0.1:5030".into()),
            save_decrypted_media: Some(true),
        };

        assert_eq!(validate_server_config(&cfg), Vec::<ConfigValidationError>::new());
    }

    #[test]
    fn reports_missing_platform_version_and_key() {
        let cfg = ServerConfigDraft::default();
        let errors = validate_server_config(&cfg);
        let codes: Vec<_> = errors.iter().map(|e| e.code.as_str()).collect();

        assert!(codes.contains(&"data_dir_required"));
        assert!(codes.contains(&"data_key_required"));
        assert!(codes.contains(&"platform_required"));
        assert!(codes.contains(&"version_required"));
    }

    #[test]
    fn masks_secret_fields_in_summary() {
        let cfg = ServerConfigDraft {
            data_key: Some("a".repeat(64)),
            img_key: Some("secret-image".into()),
            ..ServerConfigDraft::default()
        };

        let summary = summarize_config(&cfg, "C:\\config".into(), "manual-advanced".into());

        assert!(summary.has_data_key);
        assert!(summary.has_img_key);
    }
}
```

Run:

```powershell
cd src-tauri
cargo test config_store
```

Expected: FAIL because config structs and functions do not exist.

- [ ] **Step 2: Implement config structs**

Use serde names matching original `chatlog_alpha`:

```rust
#[derive(Clone, Debug, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct ServerConfigDraft {
    #[serde(rename = "type", default)]
    pub type_: Option<String>,
    #[serde(default)]
    pub platform: Option<String>,
    #[serde(default)]
    pub version: Option<i64>,
    #[serde(default)]
    pub full_version: Option<String>,
    #[serde(default)]
    pub data_dir: Option<String>,
    #[serde(default)]
    pub work_dir: Option<String>,
    #[serde(default)]
    pub data_key: Option<String>,
    #[serde(default)]
    pub img_key: Option<String>,
    #[serde(default)]
    pub http_addr: Option<String>,
    #[serde(default)]
    pub save_decrypted_media: Option<bool>,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
pub struct ConfigValidationError {
    pub code: String,
    pub field: String,
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigSummary {
    pub source: String,
    pub config_dir: String,
    pub data_dir: Option<String>,
    pub work_dir: Option<String>,
    pub http_addr: String,
    pub port: u16,
    pub platform: Option<String>,
    pub version: Option<i64>,
    pub full_version: Option<String>,
    pub has_data_key: bool,
    pub has_img_key: bool,
}
```

- [ ] **Step 3: Implement validation**

Validation rules:

- `data_dir` required for managed mode.
- `data_key` required and should be a 64-character hex string when present. If old configs contain a non-hex experimental key, mark warning only if original `chatlog_alpha` accepts it locally; otherwise error.
- `platform` required; P0 accepts at least `windows`, `darwin`, `linux`.
- `version` required and greater than 0.
- `full_version` required for real DB opening.
- `http_addr` defaults to `127.0.0.1:5030`.
- `work_dir` defaults to app data work directory when absent.

Implementation:

```rust
pub fn validate_server_config(cfg: &ServerConfigDraft) -> Vec<ConfigValidationError> {
    let mut errors = Vec::new();

    if is_blank(cfg.data_dir.as_deref()) {
        errors.push(error("data_dir_required", "data_dir", "请选择微信数据目录"));
    }
    if is_blank(cfg.data_key.as_deref()) {
        errors.push(error("data_key_required", "data_key", "需要 data key 才能解密数据库"));
    }
    if is_blank(cfg.platform.as_deref()) {
        errors.push(error("platform_required", "platform", "需要平台信息，例如 windows"));
    }
    if cfg.version.unwrap_or_default() <= 0 {
        errors.push(error("version_required", "version", "需要微信主版本号，例如 4"));
    }
    if is_blank(cfg.full_version.as_deref()) {
        errors.push(error("full_version_required", "full_version", "需要完整微信版本号，例如 4.1.8.107"));
    }

    errors
}

fn is_blank(value: Option<&str>) -> bool {
    value.map(str::trim).unwrap_or_default().is_empty()
}

fn error(code: &str, field: &str, message: &str) -> ConfigValidationError {
    ConfigValidationError {
        code: code.into(),
        field: field.into(),
        message: message.into(),
    }
}
```

- [ ] **Step 4: Implement import of `dataDir/chatlog.json`**

Add a function:

```rust
pub fn read_data_dir_chatlog_json(data_dir: &std::path::Path) -> Result<ServerConfigDraft, String> {
    let path = data_dir.join("chatlog.json");
    let bytes = std::fs::read(&path).map_err(|e| format!("无法读取 {}: {}", path.display(), e))?;
    serde_json::from_slice::<ServerConfigDraft>(&bytes)
        .map_err(|e| format!("无法解析 {}: {}", path.display(), e))
}
```

Important: if this config includes `data_key`, managed sidecar can be started with `--data-dir` only, or copied into app-managed `chatlog-server.json`.

- [ ] **Step 5: Implement app-managed config writing**

Write `chatlog-server.json` into an app config directory. The `--config` flag in original code expects a directory because `config.New` calls `PrepareDir(path)` and then uses config name `chatlog-server`.

The written filename must be:

```text
<app-config-dir>/chatlog-server.json
```

The sidecar should receive:

```text
chatlog_alpha serve --config <app-config-dir> --http-addr 127.0.0.1:5030
```

It should not receive `--data-key`.

- [ ] **Step 6: Register Tauri commands**

Expose:

```rust
#[tauri::command]
pub async fn import_data_dir_config(data_dir: String) -> Result<ConfigSummary, String>;

#[tauri::command]
pub async fn save_managed_server_config(config: ServerConfigDraft) -> Result<ConfigSummary, String>;

#[tauri::command]
pub async fn load_managed_server_config_summary() -> Result<Option<ConfigSummary>, String>;

#[tauri::command]
pub async fn validate_managed_server_config(config: ServerConfigDraft) -> Result<Vec<ConfigValidationError>, String>;
```

- [ ] **Step 7: Run Rust tests**

```powershell
cd src-tauri
cargo test config_store
```

Expected: PASS.

### Task 4: Replace Unsafe Port Killing with Service Inspection

**Files:**
- Create: `src-tauri/src/service_probe.rs`
- Modify: `src-tauri/src/port_killer.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write service probe tests**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_chatlog_process_name_as_external_chatlog() {
        let result = classify_port_owner(Some(ProcessInfo {
            pid: 1234,
            name: "chatlog_alpha-x86_64-pc-windows-msvc.exe".into(),
            command: "chatlog_alpha serve --http-addr 127.0.0.1:5030".into(),
        }), None);

        assert_eq!(result.owner, PortOwnerKind::ExternalChatlog);
    }

    #[test]
    fn classifies_tracked_pid_as_managed() {
        let result = classify_port_owner(Some(ProcessInfo {
            pid: 42,
            name: "chatlog_alpha".into(),
            command: "chatlog_alpha serve".into(),
        }), Some(42));

        assert_eq!(result.owner, PortOwnerKind::ManagedSidecar);
    }

    #[test]
    fn unknown_process_is_conflict_not_kill_target() {
        let result = classify_port_owner(Some(ProcessInfo {
            pid: 999,
            name: "node.exe".into(),
            command: "node server.js".into(),
        }), None);

        assert_eq!(result.owner, PortOwnerKind::UnknownProcess);
        assert!(!result.can_stop_safely);
    }
}
```

Run:

```powershell
cd src-tauri
cargo test service_probe
```

Expected: FAIL before implementation.

- [ ] **Step 2: Implement port owner model**

```rust
#[derive(Clone, Debug, PartialEq, serde::Serialize)]
pub enum PortOwnerKind {
    Free,
    ManagedSidecar,
    ExternalChatlog,
    UnknownProcess,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub command: String,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortInspection {
    pub port: u16,
    pub owner: PortOwnerKind,
    pub process: Option<ProcessInfo>,
    pub can_stop_safely: bool,
}
```

- [ ] **Step 3: Implement `inspect_port` command**

The command must:

- Return `Free` when no listener is found.
- Return `ManagedSidecar` only when PID matches the tracked child PID.
- Return `ExternalChatlog` when process name/command clearly matches `chatlog_alpha`.
- Return `UnknownProcess` otherwise.
- Never kill anything.

Expose:

```rust
#[tauri::command]
pub async fn inspect_port(port: u16) -> Result<PortInspection, String>;
```

- [ ] **Step 4: Restrict killing to managed child**

Replace default boot usage of `kill_port`. Keep a command only for:

```rust
#[tauri::command]
pub async fn stop_managed_sidecar(...) -> Result<String, String>;
```

Do not expose “kill arbitrary port” in the setup flow. If a future developer console needs it, gate it behind an explicit destructive confirmation and show PID/process name.

- [ ] **Step 5: Run tests**

```powershell
cd src-tauri
cargo test service_probe port_killer
```

Expected: PASS.

### Task 5: Rebuild Sidecar Launch Around Config Directories

**Files:**
- Create: `src-tauri/src/sidecar_args.rs`
- Modify: `src-tauri/src/sidecar.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src/l4-atom/system/spawnSidecar.ts`
- Test: `src/l4-atom/system/spawnSidecar.test.ts`

- [ ] **Step 1: Implement Rust sidecar argument builder**

```rust
#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarLaunchPlan {
    pub http_addr: String,
    pub config_dir: Option<String>,
    pub data_dir: Option<String>,
    pub work_dir: Option<String>,
}

pub fn build_sidecar_args(plan: &SidecarLaunchPlan) -> Vec<String> {
    let mut args = vec![
        "serve".to_string(),
        "--http-addr".to_string(),
        normalize_http_addr(&plan.http_addr),
    ];

    if let Some(config_dir) = normalize_option(plan.config_dir.clone()) {
        args.push("--config".to_string());
        args.push(config_dir);
        return args;
    }

    if let Some(data_dir) = normalize_option(plan.data_dir.clone()) {
        args.push("--data-dir".to_string());
        args.push(data_dir);
    }

    if let Some(work_dir) = normalize_option(plan.work_dir.clone()) {
        args.push("--work-dir".to_string());
        args.push(work_dir);
    }

    args
}

fn normalize_http_addr(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        "127.0.0.1:5030".to_string()
    } else {
        trimmed.to_string()
    }
}

fn normalize_option(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim().to_string();
        if trimmed.is_empty() { None } else { Some(trimmed) }
    })
}
```

Note: `--data-key` must not be part of this builder.

- [ ] **Step 2: Update Rust sidecar spawn**

`src-tauri/src/sidecar.rs` should:

- Accept `SidecarLaunchPlan`.
- Build args through `sidecar_args::build_sidecar_args`.
- Store managed child and managed PID if available.
- Emit a masked command summary to logs.
- Return error if a managed child is already running.

- [ ] **Step 3: Update frontend spawn payload**

Replace current `SpawnSidecarOptions`:

```ts
export interface SpawnSidecarOptions {
  mode: "managed";
  configDir?: string | null;
  dataDir?: string | null;
  workDir?: string | null;
  httpAddr: string;
}
```

Implementation:

```ts
export interface SpawnSidecarPayload {
  mode: "managed";
  configDir: string | null;
  dataDir: string | null;
  workDir: string | null;
  httpAddr: string;
}

function normalize(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function createSpawnSidecarPayload(options: SpawnSidecarOptions): SpawnSidecarPayload {
  return {
    mode: "managed",
    configDir: normalize(options.configDir),
    dataDir: normalize(options.dataDir),
    workDir: normalize(options.workDir),
    httpAddr: normalize(options.httpAddr) ?? "127.0.0.1:5030",
  };
}
```

- [ ] **Step 4: Run frontend and Rust tests**

```powershell
pnpm test src/l4-atom/system/spawnSidecar.test.ts
cd src-tauri
cargo test sidecar_args sidecar
```

Expected: PASS.

### Task 6: Add Tauri Config Wrappers and Setup Store

**Files:**
- Create: `src/l4-atom/system/chatlogConfig.ts`
- Create: `src/l4-atom/system/sidecarManager.ts`
- Modify: `src/l4-atom/system/index.ts`
- Create: `src/l2-coordinator/data-clerk/stores/useSetupStore.ts`

- [ ] **Step 1: Add config invoke wrappers**

```ts
import { invoke } from "@tauri-apps/api/core";
import type { SetupProfileSummary } from "@l2/data-clerk/types/setup";

export interface ServerConfigDraft {
  type?: string | null;
  platform?: string | null;
  version?: number | null;
  fullVersion?: string | null;
  dataDir?: string | null;
  workDir?: string | null;
  dataKey?: string | null;
  imgKey?: string | null;
  httpAddr?: string | null;
  saveDecryptedMedia?: boolean | null;
}

export interface ConfigValidationError {
  code: string;
  field: string;
  message: string;
}

export async function importDataDirConfig(dataDir: string): Promise<SetupProfileSummary> {
  return invoke("import_data_dir_config", { dataDir });
}

export async function saveManagedServerConfig(config: ServerConfigDraft): Promise<SetupProfileSummary> {
  return invoke("save_managed_server_config", { config });
}

export async function loadManagedServerConfigSummary(): Promise<SetupProfileSummary | null> {
  return invoke("load_managed_server_config_summary");
}

export async function validateManagedServerConfig(
  config: ServerConfigDraft,
): Promise<ConfigValidationError[]> {
  return invoke("validate_managed_server_config", { config });
}
```

- [ ] **Step 2: Add sidecar manager wrappers**

```ts
import { invoke } from "@tauri-apps/api/core";
import type { PortState } from "@l2/data-clerk/types/setup";
import type { SpawnSidecarOptions } from "./spawnSidecar";
import { spawnSidecar } from "./spawnSidecar";

export interface PortInspection {
  port: number;
  owner: "Free" | "ManagedSidecar" | "ExternalChatlog" | "UnknownProcess";
  process: { pid: number; name: string; command: string } | null;
  canStopSafely: boolean;
}

export function toPortState(inspection: PortInspection): PortState {
  switch (inspection.owner) {
    case "Free":
      return "free";
    case "ManagedSidecar":
      return "owned";
    case "ExternalChatlog":
      return "external-chatlog";
    default:
      return "occupied";
  }
}

export async function inspectPort(port: number): Promise<PortInspection> {
  return invoke("inspect_port", { port });
}

export async function startManagedSidecar(options: SpawnSidecarOptions): Promise<void> {
  await spawnSidecar(options);
}

export async function stopManagedSidecar(): Promise<void> {
  await invoke("stop_managed_sidecar");
}
```

- [ ] **Step 3: Add setup store**

Store non-secret state only:

```ts
import { create } from "zustand";
import type {
  SetupMode,
  SetupProfileSummary,
  PortState,
  SetupStepId,
} from "@l2/data-clerk/types/setup";

interface SetupStoreData {
  mode: SetupMode;
  currentStep: SetupStepId;
  profile: SetupProfileSummary | null;
  portState: PortState;
  httpReady: boolean;
  dbReady: boolean;
  loading: boolean;
  error: string | null;
  diagnostic: string | null;
}

interface SetupStoreActions {
  setMode: (mode: SetupMode) => void;
  setCurrentStep: (step: SetupStepId) => void;
  setProfile: (profile: SetupProfileSummary | null) => void;
  setPortState: (state: PortState) => void;
  setReadiness: (readiness: { httpReady?: boolean; dbReady?: boolean }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDiagnostic: (diagnostic: string | null) => void;
}

export const useSetupStore = create<SetupStoreData & SetupStoreActions>((set) => ({
  mode: "managed",
  currentStep: "config",
  profile: null,
  portState: "unknown",
  httpReady: false,
  dbReady: false,
  loading: false,
  error: null,
  diagnostic: null,
  setMode: (mode) => set({ mode }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setProfile: (profile) => set({ profile }),
  setPortState: (portState) => set({ portState }),
  setReadiness: ({ httpReady, dbReady }) =>
    set((state) => ({
      httpReady: httpReady ?? state.httpReady,
      dbReady: dbReady ?? state.dbReady,
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setDiagnostic: (diagnostic) => set({ diagnostic }),
}));
```

- [ ] **Step 4: Run typecheck**

```powershell
pnpm typecheck
```

Expected: PASS after wiring imports.

### Task 7: Implement HTTP Client Foundation

**Files:**
- Create: `src/l4-atom/network/httpClient.ts`
- Create: `src/l4-atom/network/readiness.ts`
- Create: `src/l4-atom/network/chatlogRawTypes.ts`
- Create: `src/l4-atom/network/chatlogAdapters.ts`
- Test: `src/l4-atom/network/httpClient.test.ts`
- Test: `src/l4-atom/network/chatlogAdapters.test.ts`

- [ ] **Step 1: Implement `ChatlogHttpError` and `requestJson`**

```ts
export class ChatlogHttpError extends Error {
  readonly status: number | null;
  readonly body: string | null;
  readonly url: string;

  constructor(message: string, options: { status: number | null; body: string | null; url: string }) {
    super(message);
    this.name = "ChatlogHttpError";
    this.status = options.status;
    this.body = options.body;
    this.url = options.url;
  }
}

export interface RequestJsonOptions extends RequestInit {
  timeoutMs?: number;
}

export async function requestJson<T = unknown>(url: string, options: RequestJsonOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
  const finalUrl = withJsonFormat(url);

  try {
    const response = await fetch(finalUrl, {
      ...options,
      signal: controller.signal,
    });
    const body = await response.text();

    if (!response.ok) {
      throw new ChatlogHttpError(`HTTP ${response.status}`, {
        status: response.status,
        body,
        url: finalUrl,
      });
    }

    return body ? (JSON.parse(body) as T) : ({} as T);
  } catch (error) {
    if (error instanceof ChatlogHttpError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ChatlogHttpError("请求超时", { status: null, body: null, url: finalUrl });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function withJsonFormat(rawUrl: string): string {
  const url = new URL(rawUrl);
  if (!url.searchParams.has("format")) {
    url.searchParams.set("format", "json");
  }
  return url.toString();
}
```

- [ ] **Step 2: Add readiness fetchers**

```ts
import { requestJson, ChatlogHttpError } from "./httpClient";

export interface HealthResponse {
  status?: string;
  ok?: boolean;
}

export interface DbReadiness {
  ready: boolean;
  status: "ready" | "initializing" | "unreachable" | "error";
  message: string;
  detail?: string;
}

export async function fetchHealth(baseUrl: string): Promise<boolean> {
  const result = await requestJson<HealthResponse>(`${baseUrl}/health`, { timeoutMs: 5000 });
  return result.status === "ok" || result.ok === true;
}

export async function fetchDbReadiness(baseUrl: string): Promise<DbReadiness> {
  try {
    await requestJson(`${baseUrl}/api/v1/db`, { timeoutMs: 10000 });
    return { ready: true, status: "ready", message: "数据库就绪" };
  } catch (error) {
    if (error instanceof ChatlogHttpError && error.status === 503) {
      return {
        ready: false,
        status: "initializing",
        message: "服务已启动，但数据库尚未就绪",
        detail: error.body ?? undefined,
      };
    }
    if (error instanceof ChatlogHttpError) {
      return {
        ready: false,
        status: error.status === null ? "unreachable" : "error",
        message: error.message,
        detail: error.body ?? undefined,
      };
    }
    return { ready: false, status: "error", message: String(error) };
  }
}
```

- [ ] **Step 3: Add raw types for P0/P1 contract**

At minimum:

```ts
export interface RawDbResponse {
  groups?: unknown[];
  databases?: unknown[];
  message?: string;
}

export interface RawContact {
  username: string;
  alias?: string;
  remark?: string;
  nickname?: string;
  display?: string;
  is_friend?: boolean;
}

export interface RawContactsResponse {
  count: number;
  contacts: RawContact[];
}

export interface RawSession {
  username: string;
  chat?: string;
  is_group?: boolean;
  chat_type?: string;
  summary?: string;
  timestamp?: number;
  time?: string;
}

export interface RawSessionsResponse {
  sessions: RawSession[];
}
```

- [ ] **Step 4: Add adapters**

```ts
import type { RawContact, RawSession } from "./chatlogRawTypes";

export function displayName(raw: Pick<RawContact, "display" | "remark" | "nickname" | "username">): string {
  return raw.display || raw.remark || raw.nickname || raw.username;
}

export function adaptContact(raw: RawContact) {
  return {
    userName: raw.username,
    alias: raw.alias ?? "",
    remark: raw.remark ?? "",
    nickName: displayName(raw),
    isFriend: raw.is_friend ?? false,
  };
}

export function adaptSession(raw: RawSession) {
  return {
    userName: raw.username,
    nickName: raw.chat || raw.username,
    content: raw.summary ?? "",
    nTime: raw.timestamp ?? 0,
    isGroup: raw.is_group ?? raw.chat_type === "group",
    chatType: raw.chat_type ?? "",
  };
}
```

- [ ] **Step 5: Run tests**

```powershell
pnpm test src/l4-atom/network/httpClient.test.ts src/l4-atom/network/chatlogAdapters.test.ts
```

Expected: PASS.

### Task 8: Build Setup Commander

**Files:**
- Create: `src/l2-coordinator/commander/useSetupCommander.ts`
- Modify: `src/l2-coordinator/commander/useAppCommander.ts`
- Test: `src/l2-coordinator/commander/setupMachine.test.ts`

- [ ] **Step 1: Implement orchestration responsibilities**

`useSetupCommander` must expose:

```ts
export interface SetupCommander {
  loadExistingProfile: () => Promise<void>;
  chooseMode: (mode: "managed" | "external") => void;
  importDataDirectory: (path: string) => Promise<void>;
  saveManualConfig: (draft: ServerConfigDraft) => Promise<void>;
  inspectServicePort: () => Promise<void>;
  startManagedService: () => Promise<void>;
  connectExternalService: (baseUrl: string) => Promise<void>;
  checkReadiness: () => Promise<void>;
  stopManagedService: () => Promise<void>;
  openWorkbench: () => void;
}
```

- [ ] **Step 2: Implement managed service flow**

Flow:

1. Load profile summary.
2. Inspect port.
3. If port is free, start sidecar using `configDir + httpAddr`.
4. If port is managed, check readiness.
5. If port is external chatlog, ask user to connect or stop their external process manually.
6. If port is occupied by unknown process, show conflict and do nothing destructive.
7. Poll `/health`.
8. Poll `/api/v1/db`.
9. Set `httpReady` and `dbReady` separately.

- [ ] **Step 3: Implement external service flow**

Flow:

1. User enters `http://127.0.0.1:5030` or another address.
2. Normalize to base URL.
3. Fetch `/health?format=json`.
4. Fetch `/api/v1/db?format=json`.
5. Store non-secret summary with `source: "external-service"`.

- [ ] **Step 4: Remove auto destructive boot from `useAppCommander`**

`useAppCommander.boot()` must no longer call `killPort()`. During P0 either:

- Replace `boot()` with a wrapper around `loadExistingProfile + checkReadiness`.
- Or leave `useAppCommander` unused and migrate launch routes to `useSetupCommander`.

- [ ] **Step 5: Run typecheck**

```powershell
pnpm typecheck
```

Expected: PASS.

### Task 9: Replace Launch Screen with Setup Center UI

**Files:**
- Create: `src/l1-entry/pages/SetupCenterView.tsx`
- Create: `src/l3-molecule/setup/SetupStepper.tsx`
- Create: `src/l3-molecule/setup/SetupModeChooser.tsx`
- Create: `src/l3-molecule/setup/ConfigImportPanel.tsx`
- Create: `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx`
- Create: `src/l3-molecule/setup/ServiceControlPanel.tsx`
- Create: `src/l3-molecule/setup/ReadinessChecklist.tsx`
- Create: `src/l3-molecule/setup/DiagnosticPanel.tsx`
- Modify: `src/l1-entry/pages/LaunchView.tsx`

- [ ] **Step 1: Implement Setup Center layout**

UI structure:

- Left column: setup steps with status.
- Main column: current task panel.
- Right inspector: config summary, service status, diagnostics.

P0 visual rules:

- No emoji icons.
- No fake macOS window lights.
- Use restrained surfaces, clear separators, and status tokens.
- Primary action per step only.
- Error text uses `role="alert"`.
- Form fields have visible labels.

- [ ] **Step 2: Implement stepper**

Steps:

1. 模式
2. 配置
3. 服务
4. 数据库
5. 完成

Each step shows:

- blocked/idle/active/valid/warning/error
- short label
- short status

- [ ] **Step 3: Implement mode chooser**

Options:

- “由应用启动 chatlog_alpha”
- “连接已经运行的 chatlog_alpha 服务”

The external mode must explain that no local service will be started or stopped.

- [ ] **Step 4: Implement config import**

Managed mode offers:

- Choose WeChat data directory and import `chatlog.json`.
- Import app-managed server config directory.
- Open advanced manual form.

If imported `chatlog.json` lacks required fields, show inline errors.

- [ ] **Step 5: Implement manual advanced form**

Fields:

- data directory
- work directory
- platform
- version
- full version
- data key
- image key
- port/http address
- save decrypted media

Validation:

- Required fields marked.
- Data key masked by default with reveal button.
- Errors near fields.
- First invalid field receives focus after save failure.

- [ ] **Step 6: Implement service control**

Show different controls:

- Port free: Start service.
- Managed sidecar running: Check again / Stop managed service.
- External chatlog detected: Connect to this service.
- Unknown process: Show PID/process and ask user to change port or close process manually.

- [ ] **Step 7: Implement readiness checklist**

Checklist items:

- Config saved.
- Port available or service identified.
- HTTP health ok.
- Database ready.

Use both icon/text and color, not color alone.

- [ ] **Step 8: Implement diagnostics**

Diagnostic panel content:

```text
Mode: managed
Source: app-managed-server-config
Config dir: <path>
Data dir: <path>
Work dir: <path>
HTTP addr: 127.0.0.1:5030
Port owner: managed/external/unknown
PID: <pid if known>
HTTP ready: true/false
DB ready: true/false
Last error: <message>
Secrets: data_key=present, img_key=present
```

Secrets must never be printed.

- [ ] **Step 9: Preserve LaunchView as compatibility wrapper**

Either replace route usage or make `LaunchView` render `SetupCenterView`:

```tsx
export function LaunchView() {
  return <SetupCenterView />;
}
```

### Task 10: Fix Routing and Empty Workbench Access

**Files:**
- Modify: `src/l1-entry/routes/index.tsx`
- Create: `src/l1-entry/pages/WorkbenchShellView.tsx`
- Modify: `src/l1-entry/pages/DashboardView.tsx`

- [ ] **Step 1: Add workbench route**

```tsx
<Route path="/" element={<SetupCenterView />} />
<Route path="/workbench" element={<WorkbenchShellView />} />
<Route path="/dashboard" element={<WorkbenchShellView />} />
<Route path="/settings" element={<SettingsView />} />
```

- [ ] **Step 2: Create readiness-aware shell**

If DB is ready, render current `DashboardView`.  
If not ready, render empty workbench with:

- connection status
- primary action to return to setup
- secondary action to open diagnostics
- no redirect loop

- [ ] **Step 3: Remove hard redirect from Dashboard**

Delete this behavior:

```tsx
useEffect(() => {
  if (appPhase !== "ready") {
    navigate("/", { replace: true });
  }
}, [appPhase, navigate]);
```

Replace it with a prop or shell-level guard.

- [ ] **Step 4: Verify “skip/open workbench” path**

Manual browser check:

1. Open `/`.
2. Choose “稍后配置” or “打开空工作台”.
3. Confirm `/workbench` opens.
4. Confirm it does not redirect back to `/`.

### Task 11: Migrate Settings and Remove Secret localStorage

**Files:**
- Modify: `src/l2-coordinator/api-docs/settings.ts`
- Modify: `src/l2-coordinator/data-clerk/stores/useSettingsStore.ts`
- Create: `src/l2-coordinator/data-clerk/stores/settingsMigration.test.ts`
- Modify: `src/l1-entry/pages/SettingsView.tsx`

- [ ] **Step 1: Add failing migration test**

```ts
import { describe, expect, it } from "vitest";
import { migrateSettings } from "./useSettingsStore";

describe("migrateSettings", () => {
  it("removes persisted dataKey from browser settings", () => {
    const migrated = migrateSettings({
      wxDataPath: "E:/WeChat",
      dataKey: "a".repeat(64),
      sidecarPort: 5030,
    });

    expect("dataKey" in migrated).toBe(false);
    expect(migrated.wxDataPath).toBe("E:/WeChat");
  });
});
```

Run:

```powershell
pnpm test src/l2-coordinator/data-clerk/stores/settingsMigration.test.ts
```

Expected: FAIL.

- [ ] **Step 2: Update settings type**

Remove:

```ts
dataKey: string;
```

Keep non-secret fields:

```ts
setupConfigDir: string;
sidecarPort: number;
privacyOn: boolean;
```

- [ ] **Step 3: Implement migration**

```ts
export function migrateSettings(raw: unknown): Partial<SettingsState> {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const { dataKey: _dataKey, aiApiKey: _aiApiKey, ...rest } = source;
  return rest as Partial<SettingsState>;
}
```

For AI API keys, decide in P3 whether to move them to secure storage too. P0 must at least remove chatlog `dataKey`.

- [ ] **Step 4: Default Settings to Data category when setup incomplete**

`activeCategory` should initialize to `"data"` instead of `"ai"` when no setup profile exists. Keep `"ai"` only when user explicitly clicks it.

- [ ] **Step 5: Run tests**

```powershell
pnpm test src/l2-coordinator/data-clerk/stores/settingsMigration.test.ts
pnpm typecheck
```

Expected: PASS.

### Task 12: Wire Setup Status into App Shell and Status Bar

**Files:**
- Modify: `src/l3-molecule/common/AppLayout.tsx`
- Modify: `src/l3-molecule/common/StatusBar.tsx`
- Modify: `src/l3-molecule/common/DevConsole.tsx`

- [ ] **Step 1: Status bar must show readiness layers**

Required fields:

- Service: stopped / starting / HTTP ready / error
- DB: disconnected / initializing / ready / error
- Port: number and owner kind
- Mode: managed / external

- [ ] **Step 2: Dev console must show masked diagnostics**

No log entry may include raw `data_key`, `img_key`, or API keys. Add a masking helper:

```ts
export function maskSecretText(input: string): string {
  return input
    .replace(/("data_key"\s*:\s*")[^"]+(")/gi, "$1******$2")
    .replace(/("img_key"\s*:\s*")[^"]+(")/gi, "$1******$2")
    .replace(/(data_key=)[^\s]+/gi, "$1******")
    .replace(/(img_key=)[^\s]+/gi, "$1******");
}
```

- [ ] **Step 3: Use accessible status announcements**

Important readiness transitions should update an `aria-live="polite"` region:

```tsx
<div aria-live="polite" className="sr-only">
  {statusAnnouncement}
</div>
```

### Task 13: End-to-End Manual Verification

**Files:**
- Modify: `progress.md`
- Modify: `findings.md`

- [ ] **Step 1: Run automated frontend checks**

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all exit 0. If `GraphCanvas` chunk warning remains, document it as P3/P5, not P0.

- [ ] **Step 2: Run Rust checks**

```powershell
cd src-tauri
cargo test
```

Expected: all tests exit 0.

- [ ] **Step 3: Manual setup scenario A: no config**

Steps:

1. Clear browser localStorage for app.
2. Open `http://localhost:1420`.
3. Confirm Setup Center appears.
4. Confirm no sidecar auto-start happens.
5. Confirm no port kill happens.
6. Open empty workbench and confirm no redirect loop.

- [ ] **Step 4: Manual setup scenario B: import data directory with `chatlog.json`**

Steps:

1. Choose the data dir containing `chatlog.json`.
2. Confirm summary shows platform/version/full version and secret presence.
3. Start managed service.
4. Confirm sidecar command does not include `--data-key`.
5. Confirm HTTP health and DB readiness are separate.

- [ ] **Step 5: Manual setup scenario C: existing external service**

Steps:

1. Start `chatlog_alpha serve` manually outside the app.
2. Open Setup Center.
3. Confirm port owner is external chatlog.
4. Choose “connect”.
5. Confirm the app does not stop or restart that process.

- [ ] **Step 6: Manual setup scenario D: unknown process on 5030**

Steps:

1. Start a non-chatlog process on port 5030.
2. Open Setup Center.
3. Confirm UI shows port conflict and PID/process.
4. Confirm there is no “auto kill” behavior.

- [ ] **Step 7: Browser visual smoke check**

Run Vite:

```powershell
pnpm dev
```

Check at widths:

- 1440px
- 1080px
- 900px
- 768px

Confirm:

- setup stepper remains usable
- form labels and errors do not overlap
- status text does not truncate critical path/key labels incorrectly
- primary action is visible
- no emoji icons appear in setup controls

## 8. Commit Strategy

Use frequent commits after each coherent slice:

1. `test: capture p0 startup foundation regressions`
2. `feat: add setup state model and config validation`
3. `feat: add safe port inspection and sidecar launch plan`
4. `feat: add chatlog json client foundation`
5. `feat: add setup center flow`
6. `fix: allow empty workbench without redirect loop`
7. `fix: remove chatlog data key from browser settings`
8. `test: add p0 verification coverage`

Do not mix P1 chat repair or P2 visual redesign into these commits.

## 9. Acceptance Criteria

P0 is complete only when all of these are true:

- Opening the app with no config shows Setup Center, not a vague failure screen.
- The app does not kill port 5030 during startup.
- If port 5030 is occupied by external `chatlog_alpha`, the app offers connection mode.
- If port 5030 is occupied by an unknown process, the app shows a conflict and takes no destructive action.
- Managed sidecar start uses `--config <dir> --http-addr <addr>` or `--data-dir <dir>` without `--data-key`.
- `dataKey` is no longer stored in localStorage.
- App-managed `chatlog-server.json` contains the full server config required by original `chatlog_alpha`.
- HTTP health and DB readiness are represented separately.
- Workbench can open in an empty/not-connected state without redirecting back to setup.
- All P0 fetches use `format=json`.
- Structured HTTP errors preserve status, URL, and response body.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `cargo test` pass.

## 10. Known Risks

- The original `chatlog_alpha` help text says `--config /path/to/chatlog-server.json`, but current config code treats `--config` as a directory. P0 implementation must follow the code behavior: pass a directory containing `chatlog-server.json`.
- If existing user data only has `data_dir + data_key` but no platform/version/full_version, P0 cannot safely infer everything. The UI must require manual advanced fields or a valid `chatlog.json`.
- Dynamic sidecar ports require CSP changes in `tauri.conf.json`; P0 can keep 5030 fixed if the team wants lower risk, but the UI must not pretend arbitrary ports are fully supported until CSP is updated.
- Windows process inspection can be brittle if using `netstat`; prefer a Rust implementation that captures PID reliably and separately queries process name/command.
- Browser localStorage may already contain old `dataKey`; migration must erase it on load.

## 11. Handoff Notes for P1

P1 should start only after P0 merges. P1 can then safely repair:

- `/api/v1/sessions` as the primary conversation list.
- `/api/v1/contacts` and `/api/v1/chatrooms` adapters.
- `/api/v1/history` snake_case message mapping.
- `/api/v1/search` parameter mapping.
- `/api/v1/stats` parameter and response mapping.

P1 should not reimplement setup, sidecar lifecycle, or HTTP error handling. Those are P0-owned foundations.

# Current Issues Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the confirmed blockers behind `当前问题.md` from easiest to hardest, so chatlogUI can launch reliably, render consistently, and support the main chat/search workflow without hidden duplicate side effects.

**Architecture:** Preserve the existing four-layer Mediator structure. Fix UI atoms and shell lifecycle first, then make L2 stores/commanders the single source of truth for search, contact loading, settings, logs, updates, and sidecar state.

**Tech Stack:** React 18, TypeScript, Vite 6, Tauri 2, Zustand, Framer Motion, React Three Fiber, Three.js, d3-force-3d, pnpm.

---

## Verification Baseline

Run before the first code change:

```powershell
pnpm typecheck
pnpm lint
pnpm build
Set-Location src-tauri
cargo check
```

Observed on 2026-05-29:

- `pnpm typecheck`: PASS.
- `pnpm lint`: FAIL at `src/l3-molecule/graph/GraphNode3D.tsx:35` because `useRef<any>(null)` violates `@typescript-eslint/no-explicit-any`.
- `pnpm build`: PASS, but Vite reports a large `1,405.49 kB` minified JS chunk.
- `cargo check`: PASS with non-blocking crate naming warning.

---

## Task 1: Restore Lint Green

**Difficulty:** Very easy

**Files:**
- Modify: `src/l3-molecule/graph/GraphNode3D.tsx`

- [ ] **Step 1: Replace the explicit `any` ref**

Use the Three.js mesh type instead of `any`.

```tsx
import type { Mesh } from "three";

const meshRef = useRef<Mesh | null>(null);
```

- [ ] **Step 2: Verify lint**

Run:

```powershell
pnpm lint
```

Expected: PASS with zero errors.

- [ ] **Step 3: Commit**

```powershell
git add src/l3-molecule/graph/GraphNode3D.tsx
git commit -m "fix: type graph node mesh ref"
```

---

## Task 2: Close Token Gaps

**Difficulty:** Very easy

**Files:**
- Modify: `src/styles/globals.css`
- Inspect: `src/l1-entry/pages/SettingsView.tsx`
- Inspect: `src/l3-molecule/settings/SettingsLayout.tsx`
- Inspect: `src/l3-molecule/graph/GraphTooltip.tsx`
- Inspect: `src/l3-molecule/graph/GraphTimeline.tsx`

- [ ] **Step 1: Add the missing accent token**

Add both light and dark values in `src/styles/globals.css`.

```css
:root {
  --color-accent: #007AFF;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-accent: #0A84FF;
  }
}
```

- [ ] **Step 2: Verify token references**

Run:

```powershell
rg -n "var\(--color-accent\)" src
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all `--color-accent` references resolve to a defined token; commands pass.

- [ ] **Step 3: Commit**

```powershell
git add src/styles/globals.css
git commit -m "fix: define accent color token"
```

---

## Task 3: Remove Development-Only Runtime Leakage

**Difficulty:** Easy

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Inspect: `src-tauri/tauri.conf.json`
- Inspect: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Gate devtools behind debug builds**

Replace unconditional devtools opening.

```rust
#[cfg(debug_assertions)]
window.open_devtools();
```

- [ ] **Step 2: Add a production security follow-up item**

Do not leave release readiness blocked by `csp: null`, broad `shell:allow-execute`, or updater `pubkey: ""`. Track those in Task 13 where security and distribution are handled together.

- [ ] **Step 3: Verify**

Run:

```powershell
Set-Location src-tauri
cargo check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add src-tauri/src/lib.rs
git commit -m "fix: restrict devtools to debug builds"
```

---

## Task 4: Decide and Complete the Styling Base

**Difficulty:** Easy to medium

**Files:**
- Modify one chosen styling route across:
- `package.json`
- `vite.config.ts`
- `src/styles/globals.css`
- `src/l1-entry/pages/LaunchView.tsx`
- `src/l3-molecule/common/AppLayout.tsx`
- `src/l4-atom/ui/AppleButton.tsx`
- `src/l4-atom/ui/Typography.tsx`
- `src/l4-atom/ui/Spinner.tsx`
- `src/l4-atom/ui/SkeletonLoader.tsx`
- `src/l4-atom/ui/GlassPanel.tsx`
- `src/l4-atom/ui/Avatar.tsx`

- [ ] **Step 1: Choose one styling route**

Recommended route for lowest churn: officially add the Tailwind build pipeline because the code already uses Tailwind-style utility classes in critical files.

Alternative route: remove all Tailwind utility classes and convert those atoms/pages to inline styles or CSS modules. Do not mix both routes.

- [ ] **Step 2: If choosing Tailwind, wire it fully**

Install Tailwind and the Vite integration according to the version selected for the repo, update `vite.config.ts`, and add the required Tailwind import/directives to `src/styles/globals.css`.

- [ ] **Step 3: If choosing no Tailwind, remove utility classes**

Run:

```powershell
rg -n "className=" src/l1-entry src/l3-molecule src/l4-atom/ui
```

Then replace utility-only `className` usage in the listed UI atoms and layout/page components with actual styles.

- [ ] **Step 4: Verify rendered CSS is not missing core layout classes**

Run:

```powershell
pnpm build
Get-ChildItem dist/assets -Filter *.css | ForEach-Object { Get-Content $_.FullName -Raw }
```

Expected: the final CSS contains the layout/styling rules that the rendered DOM uses, or the components no longer depend on utility classes.

- [ ] **Step 5: Commit**

```powershell
git add package.json pnpm-lock.yaml vite.config.ts src/styles/globals.css src/l1-entry src/l3-molecule src/l4-atom/ui
git commit -m "fix: complete styling pipeline"
```

---

## Task 5: Make Boot Idempotent and Stop on Missing Data

**Difficulty:** Medium

**Files:**
- Modify: `src/l2-coordinator/commander/useAppCommander.ts`
- Modify: `src/l1-entry/pages/LaunchView.tsx`
- Modify: `src/l4-atom/system/detectWxPath.ts`
- Modify: `src/l4-atom/system/openDirectoryPicker.ts`
- Inspect: `src/l2-coordinator/data-clerk/stores/useAppStore.ts`
- Inspect: `src/l3-molecule/settings/DataSettings.tsx`

- [ ] **Step 1: Add an in-flight guard to `boot()`**

Prevent React StrictMode or repeated retry clicks from starting duplicate kill/spawn/poll flows.

```ts
const bootingRef = useRef(false);

const boot = useCallback(async () => {
  if (bootingRef.current) return;
  bootingRef.current = true;
  abortRef.current = false;

  try {
    // existing boot sequence
  } finally {
    bootingRef.current = false;
  }
}, [/* existing deps */]);
```

- [ ] **Step 2: Stop polling when data is missing**

After `setPhase("db_not_found")`, return from `boot()` instead of calling `pollDbReady()`.

```ts
if (candidates.length > 0) {
  setWxDataPath(candidates[0].path);
} else {
  setPhase("db_not_found");
  return;
}
```

- [ ] **Step 3: Wire manual selection**

Add a commander action such as `chooseWxDataPath()` that calls `openDirectoryPicker()`, saves the selected path, and restarts/continues the DB readiness flow.

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm typecheck
pnpm lint
pnpm build
```

Manual check: force `detectWxPath()` to return `[]`; launch should stay in `db_not_found` and not time out into `error`.

- [ ] **Step 5: Commit**

```powershell
git add src/l2-coordinator/commander/useAppCommander.ts src/l1-entry/pages/LaunchView.tsx src/l4-atom/system src/l3-molecule/settings/DataSettings.tsx
git commit -m "fix: stabilize boot data-path flow"
```

---

## Task 6: Connect the Selected Data Path to the Sidecar

**Difficulty:** Medium

**Files:**
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/sidecar.rs`
- Modify: `src/l4-atom/system/spawnSidecar.ts`
- Modify: `src/l2-coordinator/commander/useAppCommander.ts`
- Inspect: `src/l2-coordinator/api-docs/settings.ts`
- Inspect: `src/l3-molecule/settings/DataSettings.tsx`

- [ ] **Step 1: Stop hardcoding runtime-only sidecar args**

`src-tauri/src/sidecar.rs` currently hardcodes a Windows executable path and a zero `--data-key`. Replace this with arguments passed from the commander or a validated persisted setting.

- [ ] **Step 2: Extend the command contract**

Make `spawn_sidecar` accept a data path and any required backend options.

```rust
pub async fn spawn_sidecar(
    app_handle: AppHandle,
    state: State<'_, Mutex<SidecarState>>,
    data_path: Option<String>,
) -> Result<String, String> {
    crate::sidecar::spawn_sidecar_with_logs(app_handle, state, data_path)
}
```

- [ ] **Step 3: Pass the path from frontend**

Update the L4 system atom and commander so the path selected in Launch/Settings is used when spawning the sidecar.

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm typecheck
pnpm lint
pnpm build
Set-Location src-tauri
cargo check
```

Manual check: select a path and confirm the spawned sidecar receives it in args/logs.

- [ ] **Step 5: Commit**

```powershell
git add src-tauri/src/commands.rs src-tauri/src/sidecar.rs src/l4-atom/system/spawnSidecar.ts src/l2-coordinator/commander/useAppCommander.ts
git commit -m "fix: pass data path to sidecar"
```

---

## Task 7: Fix Window Controls

**Difficulty:** Medium

**Files:**
- Modify: `src/l3-molecule/common/AppLayout.tsx`
- Inspect: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Replace browser `window.close()`**

Use Tauri's current window API for close, minimize, and maximize/toggle maximize.

- [ ] **Step 2: Give all traffic-light buttons real behavior**

Close, minimize, and maximize buttons must either work or be removed. Do not keep dead controls.

- [ ] **Step 3: Verify**

Run:

```powershell
pnpm typecheck
pnpm lint
pnpm tauri dev
```

Manual check: the three titlebar buttons perform their expected window actions.

- [ ] **Step 4: Commit**

```powershell
git add src/l3-molecule/common/AppLayout.tsx src-tauri/capabilities/default.json
git commit -m "fix: wire titlebar window controls"
```

---

## Task 8: Load Settings Once at App Bootstrap

**Difficulty:** Medium

**Files:**
- Modify: `src/App.tsx` or create a small bootstrap coordinator under `src/l2-coordinator/commander/`
- Modify: `src/l3-molecule/common/AppLayout.tsx`
- Modify: `src/l2-coordinator/commander/useSettingsCommander.ts`
- Inspect: `src/l2-coordinator/data-clerk/stores/useSettingsStore.ts`

- [ ] **Step 1: Move `loadFromStorage()` out of Settings-only UI**

Settings affect AppLayout privacy/material/theme, so they must load before the user opens the Settings page.

- [ ] **Step 2: Re-apply material when `windowMaterial` changes**

Update the AppLayout effect dependencies or move material application to a commander action triggered by settings updates.

- [ ] **Step 3: Verify**

Manual check: set privacy/material in Settings, reload the app, and confirm the top-level layout reflects persisted settings before visiting Settings again.

- [ ] **Step 4: Commit**

```powershell
git add src/App.tsx src/l2-coordinator src/l3-molecule/common/AppLayout.tsx
git commit -m "fix: bootstrap persisted settings"
```

---

## Task 9: Stop Duplicate Listeners and Update Checks

**Difficulty:** Medium

**Files:**
- Modify: `src/l1-entry/pages/DashboardView.tsx`
- Modify: `src/l3-molecule/common/DevConsole.tsx`
- Modify: `src/l3-molecule/common/UpdateNotification.tsx`
- Modify: `src/l2-coordinator/commander/useDevConsoleCommander.ts`
- Modify: `src/l2-coordinator/commander/useUpdateCommander.ts`

- [ ] **Step 1: Ensure log listening is registered exactly once**

Currently `DashboardView` calls `useDevConsoleCommander()` and `DevConsole` calls it again. Keep side-effect registration in one place.

- [ ] **Step 2: Ensure update checking is registered exactly once**

Currently `DashboardView` calls `useUpdateCommander()` and `UpdateNotification` calls it again. Split side effects from state/actions if necessary.

- [ ] **Step 3: Verify**

Manual check: add a temporary log line or network console instrumentation and confirm each sidecar log/update check is handled once.

- [ ] **Step 4: Commit**

```powershell
git add src/l1-entry/pages/DashboardView.tsx src/l3-molecule/common src/l2-coordinator/commander
git commit -m "fix: avoid duplicate app side effects"
```

---

## Task 10: Complete Search and Filter Behavior

**Difficulty:** Medium

**Files:**
- Modify: `src/l2-coordinator/data-clerk/stores/useSearchStore.ts`
- Modify: `src/l2-coordinator/commander/useSearchCommander.ts`
- Modify: `src/l1-entry/pages/DashboardView.tsx`
- Modify: `src/l3-molecule/search/GlobalSearch.tsx`
- Modify: `src/l3-molecule/search/FilterBar.tsx`
- Modify: `src/l3-molecule/search/SearchResults.tsx`
- Inspect: `src/l4-atom/network/fetchSearch.ts`
- Inspect: `src/l2-coordinator/api-docs/search.ts`

- [ ] **Step 1: Add `activeFilter` to search state**

Use `FilterType` as store state and pass it into `fetchSearch` as `type` where backend supports it.

- [ ] **Step 2: Make `GlobalSearch` controlled**

Replace `defaultValue={query}` with `value={query}` so store state is the single source of truth.

- [ ] **Step 3: Replace the empty filter callback**

`DashboardView` must pass a real `setActiveFilter` action to `FilterBar`.

- [ ] **Step 4: Add loading guards to search pagination**

Block `loadMoreResults()` when `loading` is true.

- [ ] **Step 5: Verify**

Manual check: search, change filters, load more, clear query. Result count and list must stay synchronized with input/filter state.

- [ ] **Step 6: Commit**

```powershell
git add src/l2-coordinator/data-clerk/stores/useSearchStore.ts src/l2-coordinator/commander/useSearchCommander.ts src/l1-entry/pages/DashboardView.tsx src/l3-molecule/search
git commit -m "fix: complete search filter flow"
```

---

## Task 11: Make Search Results Accessible and Non-Blocking

**Difficulty:** Medium

**Files:**
- Modify: `src/l3-molecule/search/SearchResults.tsx`
- Modify: `src/l1-entry/pages/DashboardView.tsx`

- [ ] **Step 1: Give results an independent panel boundary**

Add a max height and internal scroll, or convert the results list into an overlay/popover. It must not consume unlimited vertical space above `ChatView`.

- [ ] **Step 2: Use semantic buttons for clickable results**

Replace clickable `div` rows with `button` rows or anchors, including keyboard activation and visible focus states.

- [ ] **Step 3: Verify**

Manual check at 1440, 1280, 1024, and 900 px widths: search results scroll internally and the chat area remains usable.

- [ ] **Step 4: Commit**

```powershell
git add src/l3-molecule/search/SearchResults.tsx src/l1-entry/pages/DashboardView.tsx
git commit -m "fix: contain and improve search results"
```

---

## Task 12: Guard Contact Loading and Message Pagination

**Difficulty:** Medium to hard

**Files:**
- Modify: `src/l2-coordinator/commander/useChatCommander.ts`
- Modify: `src/l3-molecule/chat/ContactList.tsx`
- Modify: `src/l1-entry/pages/DashboardView.tsx`
- Modify: `src/l3-molecule/chat/MessageList.tsx`
- Inspect: `src/l2-coordinator/data-clerk/stores/useChatStore.ts`

- [ ] **Step 1: Pick one owner for initial contacts**

Recommended: `DashboardView` or a page-level coordinator owns initial loading; `ContactList` renders state and user interactions only.

- [ ] **Step 2: Add commander-level pending guards**

Prevent duplicate `loadContacts`, `loadHistory`, and `loadMoreHistory` calls for the same active chat while a request is already running.

- [ ] **Step 3: Do not throw unhandled errors from scroll-driven pagination**

Store errors in chat state and render a retry affordance instead of throwing from `loadMoreHistory()` into a scroll listener chain.

- [ ] **Step 4: Verify**

Manual check: first Dashboard entry triggers one contact load; rapidly scrolling to the top triggers at most one pagination request at a time.

- [ ] **Step 5: Commit**

```powershell
git add src/l2-coordinator/commander/useChatCommander.ts src/l3-molecule/chat src/l1-entry/pages/DashboardView.tsx
git commit -m "fix: guard chat data loading"
```

---

## Task 13: Fix Tauri Sidecar Portability and Security

**Difficulty:** Hard

**Files:**
- Modify: `src-tauri/src/sidecar.rs`
- Modify: `src-tauri/src/port_killer.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `.github/workflows/build-check.yml`
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Remove Windows-only process assumptions**

`port_killer.rs` currently uses `netstat`/`taskkill` unconditionally. Add target-specific implementations for Windows, macOS, and Linux, or move port cleanup behind Tauri/Rust APIs that work cross-platform.

- [ ] **Step 2: Stop hardcoding a Windows sidecar binary**

`sidecar.rs` currently launches `binaries/chatlog_alpha-x86_64-pc-windows-msvc.exe`. Resolve the correct bundled sidecar for the current target.

- [ ] **Step 3: Stop creating empty sidecar placeholders in CI**

The workflows currently `touch` target binaries if `cmd/chatlog` is missing. Replace this with a real prebuilt binary download step or fail the build clearly.

- [ ] **Step 4: Lock down app security**

Set a production CSP, remove broad shell execute permissions unless truly needed, and configure updater signing instead of empty `pubkey`/`signature` values.

- [ ] **Step 5: Verify**

Run locally:

```powershell
pnpm typecheck
pnpm lint
pnpm build
Set-Location src-tauri
cargo check
```

CI verification: Windows and both macOS targets must build with real sidecar binaries.

- [ ] **Step 6: Commit**

```powershell
git add src-tauri .github/workflows
git commit -m "fix: harden sidecar packaging and security"
```

---

## Task 14: Make Dashboard Responsive

**Difficulty:** Hard

**Files:**
- Modify: `src/l1-entry/pages/DashboardView.tsx`
- Modify: `src/l3-molecule/chat/ContactList.tsx`
- Modify: `src/l3-molecule/semantic/AiPanel.tsx`
- Modify: `src/l3-molecule/graph/GraphCanvas.tsx`
- Modify or create: `src/styles/globals.css` or dedicated layout CSS/module if the chosen styling route supports it.

- [ ] **Step 1: Define working breakpoints**

Required manual view widths: 1440, 1280, 1024, 900.

- [ ] **Step 2: Prioritize the chat column**

At narrow widths, contacts and right-side stats/AI must collapse or become drawers/tabs. The chat column must not be squeezed under a practical reading width.

- [ ] **Step 3: Re-test graph overlay**

Graph floating UI must not cover titlebar, search, or critical chat controls at the required widths.

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm build
pnpm tauri dev
```

Manual check each width listed above.

- [ ] **Step 5: Commit**

```powershell
git add src/l1-entry/pages/DashboardView.tsx src/l3-molecule src/styles/globals.css
git commit -m "fix: make dashboard responsive"
```

---

## Task 15: Split Heavy Graph and AI Bundles

**Difficulty:** Hard

**Files:**
- Modify: `src/l1-entry/pages/DashboardView.tsx`
- Modify: `src/l1-entry/routes/index.tsx`
- Inspect: `vite.config.ts`

- [ ] **Step 1: Lazy load route-level and panel-level heavy modules**

Use `React.lazy` for `DashboardView`/`SettingsView` where useful, and dynamic imports for `GraphCanvas` and `AiPanel`.

- [ ] **Step 2: Add meaningful loading fallbacks**

Fallbacks must fit the existing app layout without shifting major regions.

- [ ] **Step 3: Verify chunk size**

Run:

```powershell
pnpm build
```

Expected: the previous `1,405.49 kB` main chunk is split into smaller chunks and Vite no longer warns about the primary bundle, or the warning is limited to a lazy graph/AI chunk.

- [ ] **Step 4: Commit**

```powershell
git add src/l1-entry vite.config.ts
git commit -m "perf: lazy load heavy panels"
```

---

## Task 16: Add Regression Tests

**Difficulty:** Hard

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/**/*.test.ts(x)` or `tests/**`
- Optional create: `playwright.config.ts`

- [ ] **Step 1: Add test tooling**

Add a unit/component test runner and a browser smoke test path suitable for the chosen stack.

- [ ] **Step 2: Cover P0 flows**

Minimum tests:

- Launch does not continue polling after `db_not_found`.
- Manual directory selection updates state.
- Search input/filter state drives fetch params.
- Search results render as keyboard-accessible controls.
- `loadMoreHistory` cannot run concurrently.
- Settings load before AppLayout uses privacy/material state.

- [ ] **Step 3: Wire scripts**

Add:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:ui": "playwright test"
  }
}
```

Adapt names if a different runner is selected.

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected: all pass.

- [ ] **Step 5: Commit**

```powershell
git add package.json pnpm-lock.yaml src tests playwright.config.ts
git commit -m "test: cover launch search and chat regressions"
```

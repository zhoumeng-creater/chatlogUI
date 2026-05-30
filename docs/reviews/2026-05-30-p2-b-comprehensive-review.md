# P2-B Comprehensive Review Record

Date: 2026-05-30
Branch observed: `001-ready-desktop-app`
Review scope: current code after P2-B work, P2 overall goals, `AGENTS.md`, `开发指南.md`, `docs/总体开发规划.md`, `docs/ui-functional-audit-and-redesign-plan.md`, `specs/001-ready-desktop-app/*`, and P2/P2-B plans.

## Verdict

P2-B is partially successful, but the current code cannot be marked as satisfying all stage, project, UI, productization, privacy, and release requirements.

The core workbench polish is materially improved: `DashboardView` is a thin wrapper, the workbench has a frame/shell model, the chat transcript no longer depends on `column-reverse`, core search has scope and active-result state, and stats are more compact. The remaining problems below must be tracked before calling P2 complete or release-ready.

## Verification Evidence

- `pnpm verify`: passed. It ran lint, typecheck, tests, and build. Test result observed: 123 tests in 19 files passed.
- `cd src-tauri && cargo test`: passed. Rust test result observed: 16 tests passed.
- `pnpm tauri build`: passed and produced Windows MSI/NSIS artifacts.
- Browser smoke covered `/`, `/workbench`, and `/settings` at 1440, 1180, 900, 768, and 390 px widths. No horizontal overflow was observed.
- Browser console issues observed during smoke:
  - `favicon.ico` returned 404.
  - Chromium emitted verbose warnings for password fields not contained in a form.
- Local development port issue observed:
  - `pnpm dev` on `127.0.0.1:1420` and `1422` failed with `EACCES`.
  - Windows excluded port range included `1375-1474`; this covers the configured Vite/Tauri dev port `1420`.
  - Smoke used `127.0.0.1:5173` as a temporary workaround.

## Findings

### R1 - Privacy Mode Leaks Names Through Accessibility Text

Severity: Blocker for privacy acceptance.

Evidence:
- `src/l3-molecule/chat/ConversationRow.tsx:30` sets `aria-label={formatConversationA11yLabel(conversation)}`.
- `src/l3-molecule/chat/ConversationRow.tsx:37` sets `<Avatar alt={conversation.displayName} ... />`.
- `src/l3-molecule/chat/conversationDisplay.ts:54` builds the accessibility label from the raw `conversation.displayName`.

Impact:
- With privacy mode enabled, visible names and summaries are masked, but screen readers, accessibility snapshots, browser automation, and OS accessibility tools can still expose the raw conversation name.
- This conflicts with privacy requirements in `specs/001-ready-desktop-app/spec.md` and the local-private-data product goal.

Required outcome:
- Accessibility labels, avatar alt text, title text, tooltip text, and other non-visible user-facing surfaces must use the same privacy mask policy as visible text.

### R2 - Long History Is Paginated But Not Virtualized

Severity: Productization blocker for the 10,000-message success criterion.

Evidence:
- `src/l2-coordinator/commander/useChatCommander.ts:5` uses `HISTORY_PAGE_SIZE = 50`.
- `src/l2-coordinator/data-clerk/stores/useChatStore.ts:122-133` prepends all newly loaded messages into one growing array.
- `src/l3-molecule/chat/MessageList.tsx:89-95` renders every loaded message group into the DOM.
- `specs/001-ready-desktop-app/spec.md` requires a prepared 10,000-message conversation to remain browsable with continuation feedback.

Impact:
- The app can load older pages, but DOM size grows without a cap. A user can eventually render thousands of message nodes.
- Passing unit tests and build does not prove acceptable memory, scroll, or input latency for long histories.

Required outcome:
- Use a virtualized transcript renderer or an equivalent bounded-DOM strategy, with a synthetic 10,000-message regression test and browser smoke evidence.

### R3 - L1/L3 Architecture Boundaries Are Still Blurred

Severity: Project architecture debt; blocker before claiming full compliance with `开发指南.md` and `docs/总体开发规划.md`.

Evidence:
- L3 components directly read L2 stores/commanders in many places, including:
  - `src/l3-molecule/chat/ConversationList.tsx`
  - `src/l3-molecule/chat/ChatView.tsx`
  - `src/l3-molecule/chat/MessageList.tsx`
  - `src/l3-molecule/search/GlobalSearch.tsx`
  - `src/l3-molecule/search/SearchResults.tsx`
  - `src/l3-molecule/setup/*`
  - `src/l3-molecule/settings/*`
  - `src/l3-molecule/semantic/*`
  - `src/l3-molecule/graph/*`
- L3 also calls L4 system atoms directly in `src/l3-molecule/setup/ConfigImportPanel.tsx:2` and `src/l3-molecule/settings/DataSettings.tsx:3`.
- `src/l1-entry/pages/WorkbenchShellView.tsx:12-23` performs setup readiness loading and branching in the page layer.

Impact:
- This follows some current local patterns, but it does not fully satisfy the stricter Mediator rule that L1 delegates, L2 orchestrates, L3 receives data/callbacks, and L4 remains isolated.
- Components are harder to test as presentational units and state dependencies are hidden.

Required outcome:
- Define a staged boundary correction. P2-B should clean the core workbench surface first; P2-C/P2-D should continue settings, setup, semantic, and graph.

### R4 - Productization Tasks And Release Evidence Are Not Complete

Severity: Release blocker.

Evidence:
- `specs/001-ready-desktop-app/tasks.md` contains 42 unchecked tasks and 0 checked tasks.
- `specs/001-ready-desktop-app/quickstart.md` states that the quickstart is a planning artifact, not proof that the current code already passes.
- Manual product smoke steps for install, launch, data selection, sidecar ownership, quit/reopen, semantic states, graph states, privacy masking, and diagnostic redaction have not been recorded.

Impact:
- Passing `pnpm tauri build` only proves packaging can complete in this workspace. It does not prove the installed app is ready for non-technical users.

Required outcome:
- Create and fill release evidence before any release-ready claim.

### R5 - Stats Trend Fallback Does Not Use Actual Inspector Width

Severity: P2-B functional/UI gap.

Evidence:
- `src/l3-molecule/stats/TrendChart.tsx:11` defaults `inspectorWidth = 320`.
- `src/l3-molecule/stats/StatsInspector.tsx:68` renders `<TrendChart data={trend} />` without passing measured width.
- `src/l3-molecule/stats/statsDisplay.ts:44-46` intends to switch to table mode when `inspectorWidth < 300`.

Impact:
- The dense/narrow table fallback is only partially implemented. It works for many data points, but not reliably for physically narrow inspector layouts.

Required outcome:
- Measure the inspector width or use a CSS/container-query equivalent, and verify table fallback at narrow widths.

### R6 - Setup Center Still Has A Small, Non-Token Button

Severity: UI quality and accessibility issue.

Evidence:
- Browser matrix measured the "选择微信数据目录" control around `112x20`.
- `src/l3-molecule/setup/ConfigImportPanel.tsx:27-34` uses a raw `<button>` with Tailwind utility classes instead of the tokenized `Button` atom.

Impact:
- The control is visually inconsistent with the newer design system and falls below the expected target size for a key setup action.

Required outcome:
- Replace raw setup buttons with `Button`, confirm desktop and 390 px width target sizes, and avoid mixed legacy Tailwind styling in primary product flows.

### R7 - Password Inputs Are Not Form-Scoped

Severity: Accessibility/autofill warning; not a build blocker.

Evidence:
- Browser emitted password-field-not-in-form warnings.
- Password inputs exist in `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:101`, `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:115`, `src/l3-molecule/settings/DataSettings.tsx`, `src/l3-molecule/settings/AIModelSettings.tsx`, and `src/l3-molecule/semantic/SetupWizard.tsx`.

Impact:
- Browser and accessibility tooling treat the forms as less semantically complete. Autofill and keyboard submit behavior may be inconsistent.

Required outcome:
- Wrap credential entry blocks in explicit `<form>` elements with submit handlers, labels, autocomplete policy, and no raw secret logging.

### R8 - Legacy Design-System Elements Remain Outside The P2-B Core

Severity: P2 overall UI consistency debt.

Evidence:
- `AppleButton` remains in semantic, graph, dev console, and update notification components.
- Framer Motion remains heavily used in graph, semantic, update notification, and dev console surfaces.
- `GlassPanel.tsx` and `AppleButton.tsx` remain exported from L4 UI.

Impact:
- Core workbench feels more unified, but the full product still mixes old and new interaction languages.
- This blocks claims that "all components are unified" or that P2 overall is complete.

Required outcome:
- P2-C/P2-D/P2-E must replace legacy controls where user-facing and keep motion purposeful, short, and reduced-motion aware.

### R9 - Search States Are Improved But Still Not Product-Complete

Severity: Productization gap.

Evidence:
- P2-B added scope and active result state.
- `specs/001-ready-desktop-app/data-model.md` requires search to distinguish matches, no results, invalid query, backend failure, and cancelled request.
- Current UI still has limited explicit invalid-query/cancelled-state representation.
- Exact transcript anchoring remains limited by available history paging and message loading behavior.

Impact:
- Search is usable, but not complete against the ready-desktop-app state contract.

Required outcome:
- Add invalid/cancelled states and honest navigation behavior when the target message is not in the currently loaded transcript page.

### R10 - Graph Bundle Warning Persists

Severity: Performance warning; not a current build blocker.

Evidence:
- `pnpm build` and `pnpm tauri build` warn that the `GraphModule` chunk is larger than 500 kB.

Impact:
- The graph dependency is now contained in a lazy chunk, which is better than polluting the main chunk, but the app still carries a large feature module.

Required outcome:
- Treat as P2-D/P2-E performance work: explicit lazy boundary, loading state, and measured impact in release evidence.

### R11 - Favicon 404 Adds Console Noise

Severity: Polish issue.

Evidence:
- Browser console logged a 404 for `favicon.ico`.

Impact:
- Not user-critical, but it reduces smoke-test signal quality.

Required outcome:
- Add a valid favicon reference or asset mapping so smoke tests do not carry avoidable console errors.

### R12 - Dev Port 1420 Can Be Blocked On Windows

Severity: Developer and Tauri-dev reliability issue.

Evidence:
- `vite.config.ts:20-22` hard-codes `port: 1420` and `strictPort: true`.
- `src-tauri/tauri.conf.json:8-9` hard-codes `devUrl: "http://localhost:1420"` and `beforeDevCommand: "pnpm dev"`.
- On this Windows machine, port 1420 is inside an excluded port range and failed with `EACCES`.

Impact:
- `pnpm dev` and `pnpm tauri dev` can fail before the app opens, even though the code builds.

Required outcome:
- Either document a supported fallback dev port and config path, or move the canonical dev port to a safer value and update Tauri/AGENTS/docs consistently.

## Positive Findings

- No direct L1/L3 imports from `@l4/network` were found in the reviewed path.
- `DashboardView` is now a compatibility wrapper for `WorkbenchView`.
- P2-B removed core chat-list row motion and old `ContactItem` use from the workbench path.
- Core transcript rendering no longer relies on `column-reverse` or old scroll-listener pagination.
- Core stats no longer uses `GlassPanel`.
- Core browser matrix showed no horizontal overflow across checked routes and widths.

## Required Next Decision

The remediation should not be merged into one large patch. Execute the repair plan in phases:

1. Privacy and obvious UI/a11y blockers.
2. Long-history performance.
3. Core architecture boundary cleanup for workbench.
4. Search and stats completeness.
5. Productization/release evidence.
6. P2-C/P2-D/P2-E legacy UI consistency follow-up.

## Recheck After Claimed Fixes - 2026-05-30

Result: remediation plan must remain.

Fresh evidence:

- `pnpm verify`: passed. Vitest reported 40 files and 256 tests passed; Vite build still reported `GraphModule-BddO-upw.js` over 500 kB.
- `git status --short` showed no source-file working-tree changes at the time of this recheck; only documentation/planning files were modified or untracked.
- R1 still present:
  - `src/l3-molecule/chat/ConversationRow.tsx:30` still uses `aria-label={formatConversationA11yLabel(conversation)}`.
  - `src/l3-molecule/chat/ConversationRow.tsx:37` still uses `Avatar alt={conversation.displayName}`.
  - `src/l3-molecule/chat/conversationDisplay.ts:54` still formats the raw display name.
- R2 still present:
  - `src/l3-molecule/chat/transcriptRows.ts` is missing.
  - `src/l3-molecule/chat/MessageList.tsx:89-95` still renders all message groups directly.
  - `package.json` does not contain `@tanstack/react-virtual`.
- R3 still present in the core workbench path:
  - `src/l3-molecule/chat/ConversationList.tsx`, `ChatView.tsx`, `MessageList.tsx`, `GlobalSearch.tsx`, and `SearchResults.tsx` still read L2 stores/commanders directly.
  - `src/l1-entry/pages/WorkbenchShellView.tsx` still reads setup/app stores and performs readiness branching.
- R4 still present:
  - `specs/001-ready-desktop-app/tasks.md` still has 42 unchecked tasks and 0 checked tasks.
  - `docs/release/ready-desktop-app.md` is missing.
  - `specs/001-ready-desktop-app/architecture-boundary-check.md` is missing.
- R5 still present:
  - `src/l3-molecule/stats/StatsInspector.tsx:68` still renders `<TrendChart data={trend} />` without passing actual inspector width.
- R6/R7 still present:
  - `src/l3-molecule/setup/ConfigImportPanel.tsx:27-34` still uses a raw `<button>` for the data-directory picker.
  - Password inputs remain in setup/settings/semantic files without the planned form-scope remediation.
- R8/R10/R12 still present:
  - Legacy `AppleButton` remains in semantic, graph, update, and dev-console surfaces.
  - `vite.config.ts` still uses port `1420` / HMR `1421`.
  - `src-tauri/tauri.conf.json` still points devUrl/CSP websocket entries at `1420`/`1421`.

Do not delete `docs/superpowers/plans/2026-05-30-p2-b-comprehensive-remediation.md` until the above recheck items are cleared and verified.

## Suggested Fix Implementation Recheck - 2026-05-30

Result: major P2-B blockers are fixed; remediation plan should remain for residual follow-up debt.

Cleared items:

- R1 privacy accessibility: `ConversationRow` now passes privacy state into `formatConversationA11yLabel()` and uses a privacy-safe avatar alt.
- R2 long-history performance: `MessageList` now uses `@tanstack/react-virtual` and `transcriptRows.ts`; row-count behavior is covered by a 10,000-message test.
- R4 release evidence baseline: `release-evidence.md`, `architecture-boundary-check.md`, and `docs/release/ready-desktop-app.md` now exist.
- R5 stats fallback: `StatsInspector` measures actual width and passes it to `TrendChart`.
- R6/R7 setup and credential UI: setup import uses `Button`; password fields are form-scoped with autocomplete disabled.
- R11 favicon smoke noise: `index.html` now defines an inline favicon.
- R12 dev port: Vite/Tauri dev port is now `5173`, HMR websocket is `5174`.

Verification:

- `pnpm verify`: passed, 41 test files and 262 tests.
- `cargo test` in `src-tauri`: passed, 16 tests.
- `pnpm tauri build`: passed, produced MSI and NSIS x64 bundles.
- Browser smoke against `http://127.0.0.1:5173/`, `/workbench`, and `/settings` at 1440px and 390px did not show obvious overlap or horizontal clipping.

Remaining debt:

- R3 strict architecture boundary is still not fully clean: L1/L3 still read stores/commanders in several places, and some L3 setup/settings paths still call L4 system atoms.
- R8 legacy UI primitives remain in semantic/graph/common follow-up areas outside this P2-B patch.
- R10 GraphModule remains a large lazy chunk and still emits Vite's chunk-size warning.
- Manual Windows install, quit, reopen, sidecar cleanup, and port-conflict smoke evidence remains pending.

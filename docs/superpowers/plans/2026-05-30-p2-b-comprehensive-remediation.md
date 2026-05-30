# P2-B Comprehensive Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the P2-B review blockers and convert the current improved workbench into a privacy-safe, responsive, architecture-aligned, productization-ready baseline.

**Architecture:** Keep `chatlog_alpha` as the unchanged backend contract. L4 owns raw system/network atoms, L2 owns orchestration and state normalization, L3 receives data/callbacks and renders reusable UI, and L1 remains route/layout composition. The plan fixes core workbench first, then productization evidence and cross-module UI debt.

**Tech Stack:** Tauri v2, React 18, TypeScript 5, Zustand, Vite, Vitest, Tailwind CSS v4 tokens, lucide-react, optional `@tanstack/react-virtual` for transcript virtualization.

---

## Authority And Scope

Primary evidence:

- `docs/reviews/2026-05-30-p2-b-comprehensive-review.md`
- `docs/superpowers/plans/2026-05-29-p2-b-core-workbench-polish.md`
- `docs/superpowers/plans/2026-05-29-p2-apple-like-ui-system-refactor.md`
- `docs/ui-functional-audit-and-redesign-plan.md`
- `AGENTS.md`
- `开发指南.md`
- `docs/总体开发规划.md`
- `specs/001-ready-desktop-app/spec.md`
- `specs/001-ready-desktop-app/data-model.md`
- `specs/001-ready-desktop-app/tasks.md`
- `specs/001-ready-desktop-app/quickstart.md`

Non-goals for this plan:

- Do not change `chatlog_alpha` backend behavior.
- Do not add telemetry.
- Do not broaden Tauri CSP/capabilities unless a task explicitly requires and documents it.
- Do not complete all future P3/P4 features in this pass.
- Do not reintroduce fake macOS controls, emoji command icons, broad glass surfaces, or hidden destructive port killing.

## Issue Coverage Matrix

| Finding | Covered By |
| --- | --- |
| R1 privacy accessibility leak | Task 1 |
| R2 long history not virtualized | Task 2 |
| R3 L1/L3 boundary drift | Task 3 |
| R4 productization evidence incomplete | Task 8 |
| R5 stats width fallback not wired | Task 4 |
| R6 small raw setup button | Task 5 |
| R7 password inputs not form-scoped | Task 5 |
| R8 legacy design elements remain | Task 7 |
| R9 search state/product gaps | Task 6 |
| R10 graph chunk warning | Task 7 |
| R11 favicon 404 | Task 5 |
| R12 dev port 1420 blocked | Task 9 |

## File Structure

Create:

- `docs/release/ready-desktop-app.md` - release evidence and manual smoke checklist.
- `specs/001-ready-desktop-app/architecture-boundary-check.md` - architecture scan result and allowed exceptions.
- `src/l3-molecule/chat/transcriptRows.ts` - pure transcript row builder for virtualization.
- `src/l3-molecule/chat/transcriptRows.test.ts` - row-builder tests.
- `src/l4-atom/ui/useElementWidth.ts` - small ResizeObserver hook if width measurement is not kept local to `StatsInspector`.

Modify:

- `src/l3-molecule/chat/conversationDisplay.ts`
- `src/l3-molecule/chat/conversationDisplay.test.ts`
- `src/l3-molecule/chat/ConversationRow.tsx`
- `src/l3-molecule/chat/ConversationList.tsx`
- `src/l3-molecule/chat/ChatView.tsx`
- `src/l3-molecule/chat/MessageList.tsx`
- `src/l3-molecule/chat/MessageGroup.tsx`
- `src/l3-molecule/chat/MessageBubble.tsx`
- `src/l3-molecule/search/GlobalSearch.tsx`
- `src/l3-molecule/search/SearchResults.tsx`
- `src/l3-molecule/search/SearchResultsPane.tsx`
- `src/l2-coordinator/commander/useSearchCommander.ts`
- `src/l2-coordinator/commander/searchRequest.ts`
- `src/l2-coordinator/commander/searchRequest.test.ts`
- `src/l3-molecule/stats/StatsInspector.tsx`
- `src/l3-molecule/stats/TrendChart.tsx`
- `src/l3-molecule/stats/statsDisplay.test.ts`
- `src/l3-molecule/setup/ConfigImportPanel.tsx`
- `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx`
- `src/l3-molecule/settings/DataSettings.tsx`
- `src/l3-molecule/settings/AIModelSettings.tsx`
- `src/l3-molecule/semantic/SetupWizard.tsx`
- `src/l1-entry/pages/WorkbenchView.tsx`
- `src/l1-entry/pages/WorkbenchShellView.tsx`
- `src/styles/workbench-content.css`
- `src/styles/layout.css`
- `vite.config.ts`
- `src-tauri/tauri.conf.json`
- `AGENTS.md`
- `specs/001-ready-desktop-app/tasks.md`

## Task 0: Baseline Guard

**Files:**
- Read: `docs/reviews/2026-05-30-p2-b-comprehensive-review.md`
- Read: `git status --short`
- Read: `package.json`

- [ ] **Step 1: Confirm branch and dirty files**

Run:

```powershell
git branch --show-current
git status --short
```

Expected:
- The branch is not `master`, unless the user explicitly instructed otherwise.
- Existing user edits are identified and not reverted.

- [ ] **Step 2: Run baseline verification**

Run:

```powershell
pnpm typecheck
pnpm test
```

Expected:
- Both commands exit 0 before remediation begins.
- Record test count in `progress.md`.

- [ ] **Step 3: Confirm current review issues are still present**

Run:

```powershell
rg -n "aria-label=\\{formatConversationA11yLabel|Avatar alt=\\{conversation.displayName\\}|<TrendChart data=\\{trend\\} />|选择微信数据目录|type=\\\"password\\\"" src -S
```

Expected:
- The command shows the current issue locations that Tasks 1, 4, and 5 will address.

## Task 1: Privacy-Safe Accessibility Surfaces

**Files:**
- Modify: `src/l3-molecule/chat/conversationDisplay.ts`
- Modify: `src/l3-molecule/chat/conversationDisplay.test.ts`
- Modify: `src/l3-molecule/chat/ConversationRow.tsx`
- Check: `src/l3-molecule/chat/TranscriptHeader.tsx`
- Check: `src/l3-molecule/search/SearchResultsPane.tsx`

- [ ] **Step 1: Add failing privacy tests**

Add test coverage to `src/l3-molecule/chat/conversationDisplay.test.ts`:

```ts
it("masks conversation accessibility labels when privacy is enabled", () => {
  const conversation = createConversation({
    displayName: "Alice Private",
    timeLabel: "10:30",
    unread: 2,
  });

  expect(formatConversationA11yLabel(conversation, true)).toBe("***** *******，10:30，2 条未读");
});

it("keeps non-private metadata in accessibility labels", () => {
  const conversation = createConversation({
    displayName: "Alice",
    timeLabel: "10:30",
    unread: 0,
  });

  expect(formatConversationA11yLabel(conversation, true)).toBe("*****，10:30");
});
```

Run:

```powershell
pnpm test src/l3-molecule/chat/conversationDisplay.test.ts
```

Expected:
- The new tests fail because `formatConversationA11yLabel` does not accept privacy state yet.

- [ ] **Step 2: Implement privacy-aware labels**

Update `src/l3-molecule/chat/conversationDisplay.ts`:

```ts
export function formatConversationA11yLabel(
  conversation: Conversation,
  privacyOn = false,
): string {
  const displayName = privacyOn
    ? maskDisplayText(conversation.displayName)
    : conversation.displayName;
  const parts = [displayName];
  if (conversation.timeLabel) parts.push(conversation.timeLabel);
  if (conversation.unread > 0) parts.push(`${conversation.unread} 条未读`);
  return parts.join("，");
}
```

- [ ] **Step 3: Use privacy-safe alt text in conversation rows**

Update `src/l3-molecule/chat/ConversationRow.tsx` so the row uses masked accessibility text:

```tsx
const accessibilityLabel = formatConversationA11yLabel(conversation, privacyOn);
const avatarAlt = privacyOn ? "已隐藏会话头像" : conversation.displayName;
```

Then apply:

```tsx
aria-label={accessibilityLabel}
```

and:

```tsx
<Avatar alt={avatarAlt} size={36} fallback={fallback} />
```

- [ ] **Step 4: Scan other hidden text surfaces**

Run:

```powershell
rg -n "aria-label|title=|alt=|data-tooltip|tooltip" src/l3-molecule src/l4-atom -S
```

Expected:
- Any surface that displays private names, message bodies, credentials, or private paths has a privacy-aware path or is documented as non-private metadata.

- [ ] **Step 5: Verify**

Run:

```powershell
pnpm test src/l3-molecule/chat/conversationDisplay.test.ts
pnpm typecheck
```

Expected:
- Tests pass.
- Typecheck exits 0.

## Task 2: Virtualized Long-History Transcript

**Files:**
- Create: `src/l3-molecule/chat/transcriptRows.ts`
- Create: `src/l3-molecule/chat/transcriptRows.test.ts`
- Modify: `src/l3-molecule/chat/MessageList.tsx`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add the virtualization dependency**

Run:

```powershell
pnpm add @tanstack/react-virtual
```

Expected:
- `package.json` and `pnpm-lock.yaml` include `@tanstack/react-virtual`.

- [ ] **Step 2: Add failing row-builder tests**

Create `src/l3-molecule/chat/transcriptRows.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { buildTranscriptRows } from "./transcriptRows";

function message(id: string, date: string): ChatMessage {
  return {
    id,
    localId: Number(id.replace(/\D/g, "")) || 0,
    timestamp: Date.parse(date) / 1000,
    time: `${date} 10:00:00`,
    sender: "Alice",
    type: "text",
    content: `message ${id}`,
    chat: "wxid_a",
    username: "wxid_a",
    isGroup: false,
    chatType: "private",
    direction: "unknown",
  };
}

describe("buildTranscriptRows", () => {
  it("creates date and message rows in render order", () => {
    const rows = buildTranscriptRows([
      message("m1", "2026-05-29"),
      message("m2", "2026-05-29"),
      message("m3", "2026-05-30"),
    ]);

    expect(rows.map((row) => row.kind)).toEqual(["date", "message", "message", "date", "message"]);
  });

  it("keeps row count to one date row per date plus messages", () => {
    const messages = Array.from({ length: 10000 }, (_, index) =>
      message(`m${index}`, "2026-05-30"),
    );

    expect(buildTranscriptRows(messages)).toHaveLength(10001);
  });
});
```

Run:

```powershell
pnpm test src/l3-molecule/chat/transcriptRows.test.ts
```

Expected:
- The test fails because `transcriptRows.ts` does not exist.

- [ ] **Step 3: Implement row descriptors**

Create `src/l3-molecule/chat/transcriptRows.ts`:

```ts
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { groupMessagesByDate } from "./transcriptDisplay";

export type TranscriptRow =
  | { kind: "date"; id: string; dateLabel: string }
  | { kind: "message"; id: string; message: ChatMessage };

export function buildTranscriptRows(messages: ChatMessage[]): TranscriptRow[] {
  return groupMessagesByDate(messages).flatMap((group) => [
    { kind: "date", id: `date-${group.dateLabel}`, dateLabel: group.dateLabel },
    ...group.messages.map((message) => ({
      kind: "message" as const,
      id: message.id,
      message,
    })),
  ]);
}

export function estimateTranscriptRowHeight(row: TranscriptRow): number {
  return row.kind === "date" ? 32 : 92;
}
```

- [ ] **Step 4: Replace full message rendering with virtual rows**

Modify `src/l3-molecule/chat/MessageList.tsx`:

- Keep the explicit "加载更早消息" button.
- Replace full group rendering with `buildTranscriptRows(messages)`.
- Use `useVirtualizer` with the message-list container as `getScrollElement`.
- Render only `virtualizer.getVirtualItems()`.
- Use `estimateTranscriptRowHeight(rows[index])` for `estimateSize`.
- Keep empty, loading, error, and all-loaded states.

The row render branch should be structurally equivalent to:

```tsx
{virtualizer.getVirtualItems().map((virtualRow) => {
  const row = rows[virtualRow.index];
  return (
    <div
      key={row.id}
      data-index={virtualRow.index}
      ref={virtualizer.measureElement}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      {row.kind === "date" ? (
        <div className="message-date-divider">{row.dateLabel}</div>
      ) : (
        <MessageBubble message={row.message} />
      )}
    </div>
  );
})}
```

- [ ] **Step 5: Add a long-history browser smoke**

Use a browser mock with a 10,000-message conversation.

Expected browser evidence:
- Initial DOM renders a bounded number of `.message-row` nodes, not 10,000.
- "加载更早消息" remains reachable.
- Scrolling remains responsive at desktop and 390 px width.

- [ ] **Step 6: Verify**

Run:

```powershell
pnpm test src/l3-molecule/chat/transcriptRows.test.ts src/l3-molecule/chat/transcriptDisplay.test.ts
pnpm typecheck
pnpm build
```

Expected:
- Tests pass.
- Typecheck exits 0.
- Build exits 0.

## Task 3: Core Workbench Architecture Boundary Cleanup

**Files:**
- Create: `specs/001-ready-desktop-app/architecture-boundary-check.md`
- Modify: `src/l1-entry/pages/WorkbenchShellView.tsx`
- Modify: `src/l1-entry/pages/WorkbenchView.tsx`
- Modify: `src/l3-molecule/chat/ConversationList.tsx`
- Modify: `src/l3-molecule/chat/ChatView.tsx`
- Modify: `src/l3-molecule/chat/MessageList.tsx`
- Modify: `src/l3-molecule/search/GlobalSearch.tsx`
- Modify: `src/l3-molecule/search/SearchResults.tsx`

- [ ] **Step 1: Record current boundary scan**

Run:

```powershell
rg -n "use[A-Za-z]+(Commander|Store)|@l4/system|@l4/network" src/l1-entry src/l3-molecule -S
```

Write the output summary to `specs/001-ready-desktop-app/architecture-boundary-check.md` with:

```markdown
# Architecture Boundary Check

## Current Violations

## Allowed Temporary Exceptions

## Remediation Order
```

- [ ] **Step 2: Move WorkbenchShell readiness into L2**

Add a L2-facing view model so `WorkbenchShellView` receives already-translated readiness content:

```ts
interface WorkbenchGateViewModel {
  ready: boolean;
  statusText: string;
  title: string;
  description: string;
  sidecarStatus: string;
  httpReady: boolean;
  dbReady: boolean;
}
```

`WorkbenchShellView` should render based on this model and delegate setup loading/checking through L2.

- [ ] **Step 3: Convert core workbench L3 components to props-first**

For the P2-B core path, migrate these components to receive data and callbacks:

- `ConversationList`
- `ChatView`
- `MessageList`
- `GlobalSearch`
- `SearchResults`

`WorkbenchView` and `useWorkbenchCommander` should become the composition/orchestration boundary.

Required prop shape examples:

```ts
interface ConversationListProps {
  conversations: Conversation[];
  status: LoadStatus;
  error: string | null;
  selectedConversationId: string | null;
  onRetry: () => void;
  onOpenConversation: (conversation: Conversation) => void;
}
```

```ts
interface MessageListProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  status: LoadStatus;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  onRetry: () => void;
  onLoadMore: () => void;
}
```

- [ ] **Step 4: Add boundary regression scan**

Add this command to `specs/001-ready-desktop-app/architecture-boundary-check.md`:

```powershell
rg -n "use[A-Za-z]+(Commander|Store)|@l4/system|@l4/network" src/l3-molecule/chat src/l3-molecule/search src/l3-molecule/stats -S
```

Expected:
- No matches in core chat/search/stats L3 implementation files except type-only imports from L2 store types.

- [ ] **Step 5: Verify**

Run:

```powershell
pnpm typecheck
pnpm test
```

Expected:
- Typecheck and tests pass.
- Browser smoke still shows `/workbench` ready and not-ready states.

## Task 4: Real Stats Inspector Width Fallback

**Files:**
- Modify: `src/l3-molecule/stats/StatsInspector.tsx`
- Modify: `src/l3-molecule/stats/TrendChart.tsx`
- Modify: `src/l3-molecule/stats/statsDisplay.test.ts`
- Optional create: `src/l4-atom/ui/useElementWidth.ts`

- [ ] **Step 1: Add explicit fallback tests**

Extend `src/l3-molecule/stats/statsDisplay.test.ts`:

```ts
it("uses table fallback for narrow inspectors even with few points", () => {
  expect(shouldUseTrendTable(createTrend(4), 284)).toBe(true);
});

it("keeps chart mode for roomy inspectors with few points", () => {
  expect(shouldUseTrendTable(createTrend(4), 360)).toBe(false);
});
```

Run:

```powershell
pnpm test src/l3-molecule/stats/statsDisplay.test.ts
```

Expected:
- Tests pass if helper behavior already matches.

- [ ] **Step 2: Measure inspector width**

In `StatsInspector`, add a ref and measured width using `ResizeObserver`.

Required behavior:
- Initial width defaults to `320` to preserve test safety.
- When the aside width changes, pass the actual width into `TrendChart`.
- Disconnect the observer on unmount.

Apply:

```tsx
<aside ref={inspectorRef} className="stats-inspector" aria-label="统计 inspector">
```

and:

```tsx
<TrendChart data={trend} inspectorWidth={inspectorWidth} />
```

- [ ] **Step 3: Verify narrow UI**

Browser check:
- `/workbench` at 390 px width.
- Ready-workbench mock with trend data of 4-10 points.
- Confirm table fallback appears when inspector/drawer width is below 300 px.

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm test src/l3-molecule/stats/statsDisplay.test.ts
pnpm typecheck
```

Expected:
- Tests and typecheck pass.

## Task 5: Setup And Credential UI Accessibility Polish

**Files:**
- Modify: `src/l3-molecule/setup/ConfigImportPanel.tsx`
- Modify: `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx`
- Modify: `src/l3-molecule/settings/DataSettings.tsx`
- Modify: `src/l3-molecule/settings/AIModelSettings.tsx`
- Modify: `src/l3-molecule/semantic/SetupWizard.tsx`
- Modify: `src/styles/layout.css`
- Modify: `index.html` or `public/favicon.ico`

- [ ] **Step 1: Replace raw setup button**

Change `ConfigImportPanel` to use `Button` from `@l4/ui`:

```tsx
<Button
  variant="primary"
  size="md"
  onClick={handlePickDir}
  disabled={loading}
  loading={loading}
>
  选择微信数据目录
</Button>
```

Remove the raw Tailwind button class path for this action.

- [ ] **Step 2: Put credential inputs inside forms**

For `ManualAdvancedConfigPanel`, wrap fields in:

```tsx
<form
  className="settings-stack"
  onSubmit={(event) => {
    event.preventDefault();
    void handleSave();
  }}
>
```

Set credential autocomplete attributes:

```tsx
autoComplete="off"
```

for `dataKey` and `imgKey`, unless a future credential-storage decision chooses a safer explicit value.

Apply equivalent form semantics to `DataSettings`, `AIModelSettings`, and `SetupWizard` credential sections.

- [ ] **Step 3: Add or map favicon**

Choose one:
- Add `public/favicon.ico`.
- Or update `index.html` to reference an existing Tauri icon asset.

Expected:
- Browser smoke no longer logs `favicon.ico` 404.

- [ ] **Step 4: Browser check**

Check `/` at widths 1440, 768, and 390.

Expected:
- "选择微信数据目录" target height is at least 34 px on desktop and at least 40 px on narrow width.
- No password-not-in-form warnings appear for the checked route.
- No horizontal overflow.

- [ ] **Step 5: Verify**

Run:

```powershell
pnpm typecheck
pnpm build
```

Expected:
- Both commands exit 0.

## Task 6: Product-Complete Search States And Honest Result Navigation

**Files:**
- Modify: `src/l2-coordinator/data-clerk/stores/useSearchStore.ts`
- Modify: `src/l2-coordinator/commander/searchRequest.ts`
- Modify: `src/l2-coordinator/commander/searchRequest.test.ts`
- Modify: `src/l2-coordinator/commander/useSearchCommander.ts`
- Modify: `src/l3-molecule/search/GlobalSearch.tsx`
- Modify: `src/l3-molecule/search/SearchResults.tsx`
- Modify: `src/l3-molecule/search/SearchResultsPane.tsx`
- Modify: `src/l3-molecule/chat/MessageList.tsx`

- [ ] **Step 1: Add search state tests**

Extend `searchRequest.test.ts` and store tests to cover:
- Empty/blank query is invalid and does not call backend.
- Cancelled request transitions to `cancelled`.
- Backend failure transitions to `error`.
- Current-conversation scope sends backend `chats`.

Expected query-state type:

```ts
export type SearchStatus = "idle" | "invalid" | "loading" | "ready" | "empty" | "error" | "cancelled";
```

- [ ] **Step 2: Add state-specific UI**

`SearchResultsPane` must render:
- Invalid query: "输入关键词后搜索。"
- Empty result: "没有找到匹配消息。"
- Cancelled: "搜索已取消。"
- Error: current retry UI.
- Ready: list with active result.

- [ ] **Step 3: Normalize result navigation**

Keep backend ID selection honest:

```ts
const conversationId = message.username || message.chat;
const historyChat = message.username || message.chat;
```

If the clicked message is not in currently loaded history after navigation, show a transcript notice:

```text
已打开该会话。目标消息不在当前加载页中，可继续加载更早消息。
```

Do not fake-scroll to a message that is not loaded.

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm test src/l2-coordinator/commander/searchRequest.test.ts
pnpm typecheck
```

Browser smoke:
- Enter search query.
- Click result.
- Escape clears query/results.
- Blank query shows invalid guidance and does not call backend.

## Task 7: P2-C/P2-D/P2-E Legacy UI And Performance Follow-Up

**Files:**
- Modify: `docs/superpowers/plans/2026-05-29-p2-apple-like-ui-system-refactor.md`
- Modify or create: `docs/superpowers/plans/2026-05-30-p2-c-settings-diagnostics-polish.md`
- Modify or create: `docs/superpowers/plans/2026-05-30-p2-d-ai-graph-containment.md`
- Modify or create: `docs/superpowers/plans/2026-05-30-p2-e-visual-qa-accessibility.md`

- [ ] **Step 1: Record legacy component inventory**

Run:

```powershell
rg -n "AppleButton|GlassPanel|motion\\.div|AnimatePresence|emoji|🕸️|⚙|🔒|🔓" src -S
```

Record each hit as:
- P2-C settings/diagnostics
- P2-D AI/graph containment
- P2-E visual QA/accessibility
- L4 legacy export retained only for compatibility

- [ ] **Step 2: Plan graph performance remediation**

Add P2-D tasks:
- Keep graph behind a route/module lazy boundary.
- Add bounded graph empty/error/oversized states.
- Measure the lazy `GraphModule` chunk after build.
- Decide whether further chunk splitting is worth the complexity.

- [ ] **Step 3: Plan motion and reduced-motion remediation**

Add P2-E tasks:
- Preserve only purposeful motion.
- Add reduced-motion behavior for user-facing animations.
- Remove list-scale decorative animation.

- [ ] **Step 4: Verify documentation**

Run:

```powershell
rg -n "AppleButton|GraphModule|reduced-motion|oversized|P2-C|P2-D|P2-E" docs/superpowers/plans
```

Expected:
- Legacy design debt and graph chunk warning are explicitly assigned to follow-up phases.

## Task 8: Productization And Release Evidence

**Files:**
- Create or modify: `docs/release/ready-desktop-app.md`
- Modify: `specs/001-ready-desktop-app/tasks.md`
- Modify: `specs/001-ready-desktop-app/checklists/productization.md`
- Modify: `specs/001-ready-desktop-app/checklists/requirements.md`

- [ ] **Step 1: Create release evidence document**

Create `docs/release/ready-desktop-app.md` with:

```markdown
# Ready Desktop App Release Evidence

## Build Verification

## Windows x64 Install Smoke

## Launch And Sidecar Lifecycle

## Data Setup

## Dashboard And Browsing

## Search

## Semantic

## Graph

## Settings And Privacy

## Diagnostics Redaction

## Quit And Reopen

## Known Caveats
```

- [ ] **Step 2: Run release-gate commands**

Run:

```powershell
pnpm verify
cd src-tauri
cargo test
cd ..
pnpm tauri build
```

Expected:
- Every command exits 0 before recording build PASS.
- Record warnings exactly, including `GraphModule` chunk warnings.

- [ ] **Step 3: Manual smoke**

Perform and record:
- Install/open packaged Windows x64 app.
- Missing data path state.
- Manual data path selection.
- Sidecar start.
- `/health` succeeds.
- Dashboard loads or shows useful empty state.
- Settings open/save.
- Privacy mode masks names, message bodies, credentials, accessibility labels, and screenshots.
- Diagnostic export contains zero raw data keys, provider credentials, tokens, private message bodies, or unredacted private identities.
- Quit app and confirm app-managed sidecar cleanup.
- Reopen without manual backend cleanup.

- [ ] **Step 4: Update Spec Kit task checkboxes only with evidence**

For each `specs/001-ready-desktop-app/tasks.md` item touched by the remediation, check it only if:
- Source implementation exists.
- Verification command passed.
- Release/privacy evidence is recorded when required.

Do not mass-check tasks based on intent.

## Task 9: Dev Port Reliability

**Files:**
- Modify: `vite.config.ts`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `AGENTS.md`
- Modify: `docs/release/ready-desktop-app.md`

- [ ] **Step 1: Decide canonical dev port policy**

Use one of these two policies:

Policy A:
- Keep canonical `1420`.
- Document Windows excluded-port troubleshooting.
- Add an explicit fallback command for browser-only Vite smoke.

Policy B:
- Move canonical dev port to a less conflict-prone port such as `5173`.
- Update `vite.config.ts`, `src-tauri/tauri.conf.json`, `AGENTS.md`, and docs together.
- Confirm `pnpm tauri dev` still opens the app.

The preferred policy is B if the project accepts changing the documented dev server URL; otherwise use A.

- [ ] **Step 2: If policy B is selected, update config**

Expected Vite server config:

```ts
server: {
  port: 5173,
  strictPort: true,
  host: host || false,
  hmr: host
    ? {
        protocol: "ws",
        host,
        port: 5174,
      }
    : undefined,
}
```

Expected Tauri dev config:

```json
"devUrl": "http://localhost:5173",
"beforeDevCommand": "pnpm dev"
```

Update CSP websocket entries from `1421` to `5174` if needed.

- [ ] **Step 3: Verify dev startup**

Run:

```powershell
pnpm dev
```

Expected:
- Dev server listens on the canonical port.

Then run:

```powershell
pnpm tauri dev
```

Expected:
- Tauri opens against the same dev URL.

## Final Verification

- [ ] **Step 1: Automated frontend verification**

Run:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected:
- All commands exit 0.

- [ ] **Step 2: Product verification**

Run:

```powershell
pnpm verify
cd src-tauri
cargo test
cd ..
pnpm tauri build
```

Expected:
- All commands exit 0.
- Known warnings are documented in `docs/release/ready-desktop-app.md`.

- [ ] **Step 3: Browser matrix**

Check:
- `/`
- `/workbench`
- `/settings`
- ready-workbench mock
- long-history mock

Widths:
- 1440
- 1180
- 900
- 768
- 390

Expected:
- No horizontal overflow.
- No overlapping UI text.
- No raw private data in privacy mode, including accessibility labels.
- Search invalid/empty/error/success states are visible.
- Stats trend table fallback appears in narrow inspector.
- Long transcript DOM remains bounded.

- [ ] **Step 4: Documentation closeout**

Update:
- `progress.md`
- `findings.md`
- `docs/reviews/2026-05-30-p2-b-comprehensive-review.md`
- `docs/release/ready-desktop-app.md`

Expected:
- Each completed fix has evidence and remaining assumptions.

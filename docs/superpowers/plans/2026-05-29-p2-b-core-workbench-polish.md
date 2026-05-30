# P2-B Core Workbench Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the core chat workbench content after P2-A so conversation browsing, transcript reading, search, and stats feel like a stable desktop product.

**Architecture:** Keep the P0/P1 backend contract layer unchanged and build P2-B on top of P2-A `WorkbenchFrame`, semantic CSS tokens, `Button`, `IconButton`, `Surface`, and `StatusIndicator`. L1 remains a composition layer; reusable workbench behavior moves into L3 display helpers and L3 molecules, while API calls stay in L4 network atoms and orchestration stays in L2 commanders.

**Tech Stack:** Tauri v2, React 18, TypeScript 5, Zustand, Vitest, Vite, CSS tokens from `src/styles/tokens.css`, lucide-react, existing Framer Motion only where motion is short and not list-staggered.

---

## Context And Authority

Newest documents override older draft guidance:

- `docs/ui-functional-audit-and-redesign-plan.md` defines P0/P1/P2 priorities: real function flow first, then Apple-like professional UI.
- `docs/superpowers/plans/2026-05-29-p2-apple-like-ui-system-refactor.md` defines P2-B as Core Workbench Polish.
- `task_plan.md` and `progress.md` mark P2-A complete and also record a subsequent Code Review Remediation pass.
- `docs/superpowers/plans/2026-05-29-code-review-remediation.md` is already implemented in the current working tree. It introduced `WorkbenchView`, `useWorkbenchCommander`, `workbenchViewModel`, graph module containment, tokenized form controls, and `StatsInspector`.
- `findings.md` records the original P2-B starting point, but the current source now supersedes part of that snapshot. P2-B must not re-plan work that is already complete.
- Older `开发指南.md`, Sprint 1/2/3/4/5/6 docs still provide architecture and feature intent, but fake macOS controls, no-confirmation port killing, and heavy glass surfaces are superseded by P0/P2 decisions.

P2-B does not repair AI/Graph backend contracts, settings diagnostics, developer console, release pipelines, SNS, SQL, media export, or graph containment. Those remain P2-C, P2-D, P2-E, P3, P4, or release-stage work.

## Current Code Findings

- `src/l1-entry/pages/DashboardView.tsx` is now a compatibility wrapper that renders `WorkbenchView`; P2-B should leave that wrapper thin and make composition changes in `src/l1-entry/pages/WorkbenchView.tsx`.
- `src/l2-coordinator/commander/useWorkbenchCommander.ts` now owns ready-workbench orchestration, single-pane list/detail state, module selection, stats retry, graph focus, and navigation. P2-B should preserve that L2 boundary instead of moving behavior back into L1.
- `src/l3-molecule/chat/ContactList.tsx` still renders the current conversation list directly, keeps the old contact name, uses `AnimatePresence` and per-row `motion.div`, delegates row rendering to `ContactItem`, has no retry action for `conversationsError`, and lacks conversation-type filters.
- `src/l3-molecule/chat/ContactItem.tsx` is still a motion-based row with hard-coded text widths. Once `ConversationRow` exists, this file should be removed so stale row behavior cannot remain in the workbench path.
- `src/l3-molecule/chat/MessageList.tsx` still uses a scroll listener, `column-reverse`, `bottomRef`, and `isSelf={msg.direction === "self"}`. Combined with `MessageBubble.tsx`, unknown messages still render as other-side bubbles instead of neutral transcript items.
- `src/l3-molecule/search/SearchResults.tsx` calls `selectAndLoad(msg.username, msg.username)`, keeps no selected-result context, and lacks scoped search, empty state, and error state rendering.
- `src/l3-molecule/stats/StatsInspector.tsx`, `DashboardOverview.tsx`, `TrendChart.tsx`, and `TopContactCard.tsx` already use tokenized `Surface`-based styling after the remediation pass. P2-B should only add helper tests, metric-row structure, and explicit trend fallback helpers; it should not recreate `StatsInspector` or touch `DashboardView`.
- There are no React component tests in the repo; existing test coverage is pure helper/unit tests. P2-B should continue that pattern and use browser smoke for rendered UI.

## File Structure

Create:

- `src/styles/workbench-content.css` - P2-B conversation, transcript, search, and stats content classes.
- `src/l3-molecule/chat/conversationDisplay.ts` - pure display/filter helpers for conversation list.
- `src/l3-molecule/chat/conversationDisplay.test.ts` - tests for conversation display helpers.
- `src/l3-molecule/chat/ConversationListToolbar.tsx` - search and segmented filters for conversations.
- `src/l3-molecule/chat/ConversationRow.tsx` - one stable-height conversation row.
- `src/l3-molecule/chat/ConversationList.tsx` - new rendered conversation list.
- `src/l3-molecule/chat/transcriptDisplay.ts` - pure helpers for message tone, grouping, labels, and times.
- `src/l3-molecule/chat/transcriptDisplay.test.ts` - tests for transcript helpers.
- `src/l3-molecule/chat/TranscriptHeader.tsx` - compact selected-conversation header.
- `src/l3-molecule/chat/MessageMeta.tsx` - sender/time/type metadata rendering.
- `src/l3-molecule/chat/MessageGroup.tsx` - date/sender grouped transcript section.
- `src/l3-molecule/search/SearchScopeMenu.tsx` - all/current-conversation scope control.
- `src/l3-molecule/search/SearchResultsPane.tsx` - full search result list with states.
- `src/l3-molecule/stats/statsDisplay.ts` - pure metric/chart fallback helpers.
- `src/l3-molecule/stats/statsDisplay.test.ts` - tests for stats display helpers.
- `src/l3-molecule/stats/MetricRow.tsx` - compact inspector metric row.
- `src/l3-molecule/stats/ChartFallbackTable.tsx` - accessible table for trend data.

Modify:

- `src/styles/globals.css`
- `src/l1-entry/pages/WorkbenchView.tsx`
- `src/l3-molecule/chat/ContactList.tsx`
- `src/l3-molecule/chat/ChatView.tsx`
- `src/l3-molecule/chat/MessageList.tsx`
- `src/l3-molecule/chat/MessageBubble.tsx`
- `src/l3-molecule/search/GlobalSearch.tsx`
- `src/l3-molecule/search/FilterBar.tsx`
- `src/l3-molecule/search/SearchResults.tsx`
- `src/l2-coordinator/data-clerk/stores/useSearchStore.ts`
- `src/l2-coordinator/commander/searchRequest.ts`
- `src/l2-coordinator/commander/searchRequest.test.ts`
- `src/l2-coordinator/commander/useSearchCommander.ts`
- `src/l3-molecule/stats/StatsInspector.tsx`
- `src/l3-molecule/stats/DashboardOverview.tsx`
- `src/l3-molecule/stats/TrendChart.tsx`
- `src/l3-molecule/stats/TopContactCard.tsx`

Delete:

- `src/l3-molecule/chat/ContactItem.tsx` - replaced by `ConversationRow`.

## Task B0: Baseline And Scope Guard

**Files:**

- Read: `task_plan.md`
- Read: `findings.md`
- Read: `progress.md`
- Read: `docs/superpowers/plans/2026-05-29-p2-apple-like-ui-system-refactor.md`

- [ ] **Step 1: Confirm branch and working tree**

Run:

```powershell
git branch --show-current
git status --short
```

Expected:

```text
codex/p2-a-ui-foundation
```

`git status --short` may show existing planning-file edits from this planning session. Do not revert user changes or P2-A work.

- [ ] **Step 2: Run baseline unit and type checks**

Run:

```powershell
pnpm typecheck
pnpm test
```

Expected: `pnpm typecheck` exits 0 and `pnpm test` exits 0. Record test count in `progress.md`.

- [ ] **Step 3: Confirm P2-B starting constraints**

Run:

```powershell
rg -n "GlassPanel|motion\\.div|ContactList|ContactItem|column-reverse|handleScroll|selectAndLoad\\(msg\\.username|AppleButton" src\l1-entry src\l2-coordinator src\l3-molecule src\styles -S
```

Expected: hits include `ContactList`, `ContactItem`, `MessageList`, `SearchResults`, and `FilterBar`. `GlassPanel` should not appear in `src/l3-molecule/stats` or `src/l1-entry/pages/DashboardView.tsx`; if it does, treat it as a regression from the remediation pass.

## Task B1: Conversation Display Helpers

**Files:**

- Create: `src/l3-molecule/chat/conversationDisplay.test.ts`
- Create: `src/l3-molecule/chat/conversationDisplay.ts`

- [ ] **Step 1: Write failing helper tests**

Create `src/l3-molecule/chat/conversationDisplay.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import {
  filterConversations,
  formatConversationA11yLabel,
  getConversationBadge,
  getConversationEmptyMessage,
  maskDisplayText,
  type ConversationFilter,
} from "./conversationDisplay";

function conversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: overrides.id ?? "wxid_a",
    username: overrides.username ?? "wxid_a",
    displayName: overrides.displayName ?? "张三",
    chatType: overrides.chatType ?? "private",
    isGroup: overrides.isGroup ?? false,
    summary: overrides.summary ?? "最近一条消息",
    timestamp: overrides.timestamp ?? 100,
    timeLabel: overrides.timeLabel ?? "12:00",
    unread: overrides.unread ?? 0,
    lastSender: overrides.lastSender ?? "",
    source: overrides.source ?? "session",
    contact: overrides.contact,
    chatroom: overrides.chatroom,
  };
}

describe("conversationDisplay", () => {
  it("filters by name, username, and summary", () => {
    const list = [
      conversation({ id: "a", displayName: "项目群", username: "room@chatroom", summary: "验收计划", isGroup: true, chatType: "group" }),
      conversation({ id: "b", displayName: "李四", username: "wxid_b", summary: "晚饭" }),
    ];

    expect(filterConversations(list, "验收", "recent").map((item) => item.id)).toEqual(["a"]);
    expect(filterConversations(list, "wxid_b", "recent").map((item) => item.id)).toEqual(["b"]);
  });

  it("filters private and group conversations without reordering", () => {
    const list = [
      conversation({ id: "group", isGroup: true, chatType: "group" }),
      conversation({ id: "private", isGroup: false, chatType: "private" }),
    ];

    expect(filterConversations(list, "", "group").map((item) => item.id)).toEqual(["group"]);
    expect(filterConversations(list, "", "private").map((item) => item.id)).toEqual(["private"]);
  });

  it("returns stable badges for source and kind", () => {
    expect(getConversationBadge(conversation({ source: "session", isGroup: false }))).toEqual({ label: "最近", tone: "accent" });
    expect(getConversationBadge(conversation({ source: "contact", isGroup: false }))).toEqual({ label: "联系人", tone: "neutral" });
    expect(getConversationBadge(conversation({ source: "chatroom", isGroup: true }))).toEqual({ label: "群聊", tone: "success" });
  });

  it("builds an aria label with unread and time context", () => {
    expect(formatConversationA11yLabel(conversation({ displayName: "项目群", unread: 3, timeLabel: "昨天" }))).toBe("项目群，昨天，3 条未读");
    expect(formatConversationA11yLabel(conversation({ displayName: "李四", unread: 0, timeLabel: "" }))).toBe("李四");
  });

  it("keeps spaces while masking private text", () => {
    expect(maskDisplayText("A B")).toBe("* *");
  });

  it("uses distinct empty messages for list and filter states", () => {
    expect(getConversationEmptyMessage("ready", "", "recent")).toBe("数据库已连接，但没有返回最近会话。");
    expect(getConversationEmptyMessage("ready", "abc", "recent")).toBe("没有匹配的会话。");
    expect(getConversationEmptyMessage("error", "", "group")).toBe("会话列表加载失败。");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm test src/l3-molecule/chat/conversationDisplay.test.ts
```

Expected: FAIL because `./conversationDisplay` does not exist.

- [ ] **Step 3: Add helper implementation**

Create `src/l3-molecule/chat/conversationDisplay.ts`:

```ts
import type { Conversation, LoadStatus } from "@l2/data-clerk/stores/useChatStore";

export type ConversationFilter = "recent" | "private" | "group";
export type BadgeTone = "neutral" | "accent" | "success";

export interface ConversationBadge {
  label: string;
  tone: BadgeTone;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function maskDisplayText(value: string): string {
  return value.replace(/[^\s]/g, "*");
}

export function filterConversations(
  conversations: Conversation[],
  query: string,
  filter: ConversationFilter,
): Conversation[] {
  const normalizedQuery = normalize(query);
  return conversations.filter((conversation) => {
    if (filter === "private" && conversation.isGroup) return false;
    if (filter === "group" && !conversation.isGroup) return false;
    if (!normalizedQuery) return true;
    const searchable = [
      conversation.displayName,
      conversation.username,
      conversation.summary,
      conversation.lastSender,
    ].join(" ").toLowerCase();
    return searchable.includes(normalizedQuery);
  });
}

export function getConversationBadge(conversation: Conversation): ConversationBadge {
  if (conversation.source === "session") return { label: "最近", tone: "accent" };
  if (conversation.isGroup || conversation.source === "chatroom") return { label: "群聊", tone: "success" };
  return { label: "联系人", tone: "neutral" };
}

export function formatConversationA11yLabel(conversation: Conversation): string {
  const parts = [conversation.displayName];
  if (conversation.timeLabel) parts.push(conversation.timeLabel);
  if (conversation.unread > 0) parts.push(`${conversation.unread} 条未读`);
  return parts.join("，");
}

export function getConversationEmptyMessage(
  status: LoadStatus,
  query: string,
  filter: ConversationFilter,
): string {
  if (status === "error") return "会话列表加载失败。";
  if (query.trim()) return "没有匹配的会话。";
  if (filter === "private") return "没有私聊会话。";
  if (filter === "group") return "没有群聊会话。";
  return "数据库已连接，但没有返回最近会话。";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm test src/l3-molecule/chat/conversationDisplay.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit helper foundation**

Run:

```powershell
git add src/l3-molecule/chat/conversationDisplay.ts src/l3-molecule/chat/conversationDisplay.test.ts
git commit -m "test: add p2-b conversation display helpers"
```

## Task B2: Conversation List Components

**Files:**

- Create: `src/l3-molecule/chat/ConversationListToolbar.tsx`
- Create: `src/l3-molecule/chat/ConversationRow.tsx`
- Create: `src/l3-molecule/chat/ConversationList.tsx`
- Modify: `src/l3-molecule/chat/ContactList.tsx`
- Modify: `src/styles/workbench-content.css`
- Modify: `src/styles/globals.css`
- Delete: `src/l3-molecule/chat/ContactItem.tsx`

- [ ] **Step 1: Add P2-B CSS import**

Create `src/styles/workbench-content.css`:

```css
.conversation-list {
  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: var(--surface-base);
}

.conversation-list__toolbar {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-raised);
}

.conversation-list__filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-1);
  padding: 3px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-subtle);
}

.conversation-list__filter {
  min-height: 28px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.conversation-list__filter[aria-pressed="true"] {
  background: var(--surface-base);
  color: var(--accent);
  box-shadow: 0 1px 4px rgba(20, 26, 34, 0.08);
}

.conversation-list__filter:focus-visible,
.conversation-row:focus-visible,
.search-result-row:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.conversation-list__body {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: var(--space-2);
}

.conversation-row {
  display: grid;
  width: 100%;
  min-height: 64px;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: var(--space-2);
  align-items: center;
  margin: 0 0 var(--space-1);
  padding: var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.conversation-row:hover {
  background: var(--surface-hover);
}

.conversation-row--selected {
  border-color: rgba(10, 132, 255, 0.18);
  background: var(--surface-selected);
}

.conversation-row__main {
  min-width: 0;
}

.conversation-row__top,
.conversation-row__bottom {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.conversation-row__name,
.conversation-row__summary,
.conversation-row__time {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-row__name {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
}

.conversation-row__summary {
  color: var(--text-secondary);
  font-size: 12px;
}

.conversation-row__time {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 11px;
}

.workbench-empty-state,
.workbench-error-state {
  display: flex;
  min-height: 160px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-5);
  color: var(--text-secondary);
  text-align: center;
}
```

Modify `src/styles/globals.css` imports:

```css
@import "tailwindcss";
@import "./tokens.css";
@import "./layout.css";
@import "./workbench-content.css";
@import "./motion.css";
```

- [ ] **Step 2: Create toolbar component**

Create `src/l3-molecule/chat/ConversationListToolbar.tsx`:

```tsx
import { Input } from "@l4/ui";
import type { ConversationFilter } from "./conversationDisplay";

const FILTERS: { value: ConversationFilter; label: string }[] = [
  { value: "recent", label: "最近" },
  { value: "private", label: "私聊" },
  { value: "group", label: "群聊" },
];

interface ConversationListToolbarProps {
  query: string;
  filter: ConversationFilter;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: ConversationFilter) => void;
}

export function ConversationListToolbar({
  query,
  filter,
  onQueryChange,
  onFilterChange,
}: ConversationListToolbarProps) {
  return (
    <div className="conversation-list__toolbar">
      <Input
        variant="search"
        aria-label="搜索会话"
        placeholder="搜索会话"
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
      />
      <div className="conversation-list__filters" role="toolbar" aria-label="会话类型">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className="conversation-list__filter"
            aria-pressed={filter === item.value}
            onClick={() => onFilterChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create row component**

Create `src/l3-molecule/chat/ConversationRow.tsx`:

```tsx
import { Avatar, StatusIndicator, Typography } from "@l4/ui";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import {
  formatConversationA11yLabel,
  getConversationBadge,
  maskDisplayText,
} from "./conversationDisplay";

interface ConversationRowProps {
  conversation: Conversation;
  selected: boolean;
  onOpen: (conversation: Conversation) => void;
}

export function ConversationRow({ conversation, selected, onOpen }: ConversationRowProps) {
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const badge = getConversationBadge(conversation);
  const displayName = privacyOn ? maskDisplayText(conversation.displayName) : conversation.displayName;
  const summary = privacyOn ? maskDisplayText(conversation.summary) : conversation.summary;
  const fallback = displayName.slice(0, conversation.isGroup ? 1 : 2);

  return (
    <button
      type="button"
      className={`conversation-row${selected ? " conversation-row--selected" : ""}`}
      aria-current={selected ? "true" : undefined}
      aria-label={formatConversationA11yLabel(conversation)}
      onClick={() => onOpen(conversation)}
    >
      <div style={{ filter: privacyOn ? "blur(7px)" : "none", transition: "filter var(--duration-fast) var(--easing-standard)" }}>
        <Avatar alt={conversation.displayName} size={36} fallback={fallback} />
      </div>
      <span className="conversation-row__main">
        <span className="conversation-row__top">
          <span className="conversation-row__name">{displayName}</span>
          <span className="conversation-row__time">{conversation.timeLabel}</span>
        </span>
        <span className="conversation-row__bottom">
          <span className="conversation-row__summary">{summary || "没有消息摘要"}</span>
          <StatusIndicator label={badge.label} tone={badge.tone === "success" ? "success" : badge.tone === "accent" ? "accent" : "neutral"} />
        </span>
        {conversation.unread > 0 && (
          <Typography variant="caption" color="var(--accent)">
            {conversation.unread} 条未读
          </Typography>
        )}
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Create ConversationList**

Create `src/l3-molecule/chat/ConversationList.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Button, SkeletonLoader, Typography } from "@l4/ui";
import { useChatCommander } from "@l2/commander/";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import { ConversationListToolbar } from "./ConversationListToolbar";
import { ConversationRow } from "./ConversationRow";
import {
  filterConversations,
  getConversationEmptyMessage,
  type ConversationFilter,
} from "./conversationDisplay";

interface ConversationListProps {
  onConversationOpened?: () => void;
}

export function ConversationList({ onConversationOpened }: ConversationListProps) {
  const {
    conversations,
    conversationsStatus,
    conversationsError,
    selectedConversationId,
    loadConversations,
    selectAndLoad,
  } = useChatCommander();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("recent");

  const visibleConversations = useMemo(
    () => filterConversations(conversations, query, filter),
    [conversations, filter, query],
  );

  const openConversation = (conversation: Conversation) => {
    void selectAndLoad(conversation.id, conversation.username);
    onConversationOpened?.();
  };

  if (conversationsStatus === "loading") {
    return (
      <div className="conversation-list" aria-busy="true">
        <ConversationListToolbar query={query} filter={filter} onQueryChange={setQuery} onFilterChange={setFilter} />
        <div className="conversation-list__body">
          <SkeletonLoader variant="rect" height={64} count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-list">
      <ConversationListToolbar query={query} filter={filter} onQueryChange={setQuery} onFilterChange={setFilter} />
      <div className="conversation-list__body" role="list" aria-label="会话列表">
        {conversationsStatus === "error" ? (
          <div className="workbench-error-state" role="alert">
            <Typography variant="label" weight={700}>会话列表加载失败</Typography>
            <Typography variant="body" color="var(--text-secondary)">{conversationsError ?? "无法读取最近会话。"}</Typography>
            <Button variant="secondary" size="sm" onClick={() => void loadConversations()}>
              重试
            </Button>
          </div>
        ) : visibleConversations.length === 0 ? (
          <div className="workbench-empty-state">
            <Typography variant="label" weight={700}>{getConversationEmptyMessage(conversationsStatus, query, filter)}</Typography>
            {query && (
              <Button variant="ghost" size="sm" onClick={() => setQuery("")}>
                清除搜索
              </Button>
            )}
          </div>
        ) : (
          visibleConversations.map((conversation) => (
            <div key={conversation.id} role="listitem">
              <ConversationRow
                conversation={conversation}
                selected={conversation.id === selectedConversationId}
                onOpen={openConversation}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Convert ContactList into compatibility wrapper**

Replace `src/l3-molecule/chat/ContactList.tsx` with:

```tsx
import { ConversationList } from "./ConversationList";

interface ContactListProps {
  onConversationOpened?: () => void;
}

export function ContactList({ onConversationOpened }: ContactListProps) {
  return <ConversationList onConversationOpened={onConversationOpened} />;
}
```

- [ ] **Step 6: Delete obsolete ContactItem**

Delete `src/l3-molecule/chat/ContactItem.tsx` after `ContactList` is converted into the wrapper. `ConversationRow` is the only row implementation for the workbench conversation list.

- [ ] **Step 7: Verify compile and no row stagger**

Run:

```powershell
pnpm typecheck
rg -n "AnimatePresence|initial=|motion\\.div|ContactItem" src/l3-molecule/chat/ContactList.tsx src/l3-molecule/chat/ConversationList.tsx src/l3-molecule/chat/ConversationRow.tsx
Test-Path src/l3-molecule/chat/ContactItem.tsx
```

Expected: `pnpm typecheck` exits 0, `rg` exits 1 with no matches, and `Test-Path` prints `False`.

- [ ] **Step 8: Commit conversation list polish**

Run:

```powershell
git add src/styles/globals.css src/styles/workbench-content.css src/l3-molecule/chat/ContactList.tsx src/l3-molecule/chat/ConversationList.tsx src/l3-molecule/chat/ConversationListToolbar.tsx src/l3-molecule/chat/ConversationRow.tsx src/l3-molecule/chat/ContactItem.tsx
git commit -m "style: polish p2-b conversation list"
```

## Task B3: Transcript Display Helpers

**Files:**

- Create: `src/l3-molecule/chat/transcriptDisplay.test.ts`
- Create: `src/l3-molecule/chat/transcriptDisplay.ts`

- [ ] **Step 1: Write failing transcript helper tests**

Create `src/l3-molecule/chat/transcriptDisplay.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import {
  formatMessageClock,
  getMessageKindLabel,
  getTranscriptTone,
  groupMessagesByDate,
  shouldShowSender,
} from "./transcriptDisplay";

function message(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: overrides.id ?? "m1",
    localId: overrides.localId ?? 1,
    timestamp: overrides.timestamp ?? 1_700_000_000,
    time: overrides.time ?? "2026-05-29 10:00",
    sender: overrides.sender ?? "wxid_sender",
    type: overrides.type ?? "text",
    content: overrides.content ?? "hello",
    chat: overrides.chat ?? "wxid_chat",
    username: overrides.username ?? "wxid_chat",
    isGroup: overrides.isGroup ?? false,
    chatType: overrides.chatType ?? "private",
    direction: overrides.direction ?? "unknown",
    mediaType: overrides.mediaType,
    mediaUrl: overrides.mediaUrl,
    imageUrl: overrides.imageUrl,
  };
}

describe("transcriptDisplay", () => {
  it("renders unknown direction as neutral", () => {
    expect(getTranscriptTone(message({ direction: "unknown" }))).toBe("neutral");
    expect(getTranscriptTone(message({ direction: "self" }))).toBe("self");
    expect(getTranscriptTone(message({ direction: "other" }))).toBe("other");
  });

  it("uses media labels without hiding text fallbacks", () => {
    expect(getMessageKindLabel(message({ mediaType: "image" }))).toBe("图片");
    expect(getMessageKindLabel(message({ type: "34" }))).toBe("语音");
    expect(getMessageKindLabel(message({ type: "text" }))).toBe("");
  });

  it("shows sender only for group messages not sent by self", () => {
    expect(shouldShowSender(message({ isGroup: true, direction: "unknown" }))).toBe(true);
    expect(shouldShowSender(message({ isGroup: true, direction: "self" }))).toBe(false);
    expect(shouldShowSender(message({ isGroup: false, direction: "other" }))).toBe(false);
  });

  it("groups messages by calendar date", () => {
    const groups = groupMessagesByDate([
      message({ id: "a", time: "2026-05-28 23:59" }),
      message({ id: "b", time: "2026-05-29 00:01" }),
    ]);

    expect(groups.map((group) => group.dateLabel)).toEqual(["2026-05-28", "2026-05-29"]);
    expect(groups[1].messages.map((item) => item.id)).toEqual(["b"]);
  });

  it("formats invalid times as an empty string", () => {
    expect(formatMessageClock("not-a-date")).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm test src/l3-molecule/chat/transcriptDisplay.test.ts
```

Expected: FAIL because `./transcriptDisplay` does not exist.

- [ ] **Step 3: Add transcript helper implementation**

Create `src/l3-molecule/chat/transcriptDisplay.ts`:

```ts
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";

export type TranscriptTone = "self" | "other" | "neutral";

export interface MessageDateGroup {
  dateLabel: string;
  messages: ChatMessage[];
}

export function getTranscriptTone(message: Pick<ChatMessage, "direction">): TranscriptTone {
  if (message.direction === "self") return "self";
  if (message.direction === "other") return "other";
  return "neutral";
}

export function getMessageKindLabel(message: Pick<ChatMessage, "mediaType" | "type">): string {
  if (message.mediaType) return message.mediaType;
  const labels: Record<string, string> = {
    "3": "图片",
    "4": "视频",
    "34": "语音",
    "6": "文件",
    "47": "表情",
    "49": "链接",
  };
  return labels[message.type] ?? "";
}

export function shouldShowSender(message: Pick<ChatMessage, "isGroup" | "direction">): boolean {
  return message.isGroup && message.direction !== "self";
}

export function getDateLabel(time: string): string {
  const match = time.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(time);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("zh-CN");
}

export function formatMessageClock(time: string): string {
  const parsed = new Date(time.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function groupMessagesByDate(messages: ChatMessage[]): MessageDateGroup[] {
  const groups: MessageDateGroup[] = [];
  for (const message of messages) {
    const dateLabel = getDateLabel(message.time) || "未知日期";
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.dateLabel === dateLabel) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ dateLabel, messages: [message] });
    }
  }
  return groups;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm test src/l3-molecule/chat/transcriptDisplay.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit transcript helper foundation**

Run:

```powershell
git add src/l3-molecule/chat/transcriptDisplay.ts src/l3-molecule/chat/transcriptDisplay.test.ts
git commit -m "test: add p2-b transcript display helpers"
```

## Task B4: Transcript Components And Honest Message Rendering

**Files:**

- Create: `src/l3-molecule/chat/TranscriptHeader.tsx`
- Create: `src/l3-molecule/chat/MessageMeta.tsx`
- Create: `src/l3-molecule/chat/MessageGroup.tsx`
- Modify: `src/l3-molecule/chat/ChatView.tsx`
- Modify: `src/l3-molecule/chat/MessageList.tsx`
- Modify: `src/l3-molecule/chat/MessageBubble.tsx`
- Modify: `src/styles/workbench-content.css`

- [ ] **Step 1: Add transcript CSS**

Append to `src/styles/workbench-content.css`:

```css
.transcript {
  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: var(--surface-base);
}

.transcript-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 48px;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-raised);
}

.transcript-header__title,
.transcript-header__meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-list {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: var(--space-4);
}

.message-date-divider {
  display: flex;
  justify-content: center;
  margin: var(--space-4) 0 var(--space-3);
  color: var(--text-muted);
  font-size: 11px;
}

.message-row {
  display: flex;
  width: 100%;
  min-width: 0;
  margin-bottom: var(--space-2);
}

.message-row--self {
  justify-content: flex-end;
}

.message-row--other {
  justify-content: flex-start;
}

.message-row--neutral {
  justify-content: stretch;
}

.message-bubble {
  max-width: min(640px, 78%);
  min-width: 0;
  padding: 9px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-subtle);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.message-row--self .message-bubble {
  border-color: transparent;
  background: var(--accent);
  color: var(--text-inverse);
}

.message-row--neutral .message-bubble {
  width: 100%;
  max-width: none;
  background: var(--surface-base);
}

.message-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 3px;
  color: var(--text-muted);
  font-size: 11px;
}

.message-attachment {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: inherit;
  font-weight: 700;
}
```

- [ ] **Step 2: Create TranscriptHeader**

Create `src/l3-molecule/chat/TranscriptHeader.tsx`:

```tsx
import { StatusIndicator, Typography } from "@l4/ui";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { maskDisplayText } from "./conversationDisplay";

interface TranscriptHeaderProps {
  conversation: Conversation;
  totalCount: number;
}

export function TranscriptHeader({ conversation, totalCount }: TranscriptHeaderProps) {
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const displayName = privacyOn ? maskDisplayText(conversation.displayName) : conversation.displayName;
  const username = privacyOn ? maskDisplayText(conversation.username) : conversation.username;

  return (
    <header className="transcript-header">
      <div style={{ minWidth: 0 }}>
        <Typography variant="label" weight={700} className="transcript-header__title">
          {displayName}
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)" className="transcript-header__meta">
          {username}
        </Typography>
      </div>
      <StatusIndicator
        tone={conversation.isGroup ? "success" : "neutral"}
        label={conversation.isGroup ? `群聊${totalCount ? ` · ${totalCount.toLocaleString()} 条` : ""}` : `私聊${totalCount ? ` · ${totalCount.toLocaleString()} 条` : ""}`}
      />
    </header>
  );
}
```

- [ ] **Step 3: Create MessageMeta**

Create `src/l3-molecule/chat/MessageMeta.tsx`:

```tsx
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { maskDisplayText } from "./conversationDisplay";
import { formatMessageClock, getMessageKindLabel, shouldShowSender } from "./transcriptDisplay";

interface MessageMetaProps {
  message: ChatMessage;
}

export function MessageMeta({ message }: MessageMetaProps) {
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const sender = privacyOn ? maskDisplayText(message.sender) : message.sender;
  const kindLabel = getMessageKindLabel(message);
  const time = formatMessageClock(message.time);

  if (!shouldShowSender(message) && !kindLabel && !time) return null;

  return (
    <div className="message-meta">
      {shouldShowSender(message) && <span>{sender}</span>}
      {kindLabel && <span>{kindLabel}</span>}
      {time && <span>{time}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite MessageBubble around tone**

Replace `src/l3-molecule/chat/MessageBubble.tsx` with:

```tsx
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { maskDisplayText } from "./conversationDisplay";
import { MessageMeta } from "./MessageMeta";
import { getMessageKindLabel, getTranscriptTone } from "./transcriptDisplay";

interface MessageBubbleProps {
  message: ChatMessage;
}

function getContent(message: ChatMessage): string {
  const kindLabel = getMessageKindLabel(message);
  if (message.content) return message.content;
  if (kindLabel) return `[${kindLabel}]`;
  return "";
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const tone = getTranscriptTone(message);
  const rawContent = getContent(message);
  const content = privacyOn ? maskDisplayText(rawContent) : rawContent;

  if (!content) return null;

  return (
    <div className={`message-row message-row--${tone}`}>
      <article className="message-bubble">
        <MessageMeta message={message} />
        <span>{content}</span>
        {(message.mediaUrl || message.imageUrl) && (
          <span className="message-attachment" aria-label="媒体占位">
            {privacyOn ? "[媒体]" : "[媒体可用]"}
          </span>
        )}
      </article>
    </div>
  );
}
```

- [ ] **Step 5: Create MessageGroup**

Create `src/l3-molecule/chat/MessageGroup.tsx`:

```tsx
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { MessageBubble } from "./MessageBubble";

interface MessageGroupProps {
  dateLabel: string;
  messages: ChatMessage[];
}

export function MessageGroup({ dateLabel, messages }: MessageGroupProps) {
  return (
    <section aria-label={`${dateLabel} 的消息`}>
      <div className="message-date-divider">{dateLabel}</div>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </section>
  );
}
```

- [ ] **Step 6: Rewrite MessageList states and grouping**

Modify `src/l3-molecule/chat/MessageList.tsx` so its render path uses:

```tsx
const groups = groupMessagesByDate(messages);

if (!currentConv) {
  return (
    <div className="workbench-empty-state">
      <Typography variant="label" weight={700}>选择会话</Typography>
      <Typography variant="body" color="var(--text-secondary)">从左侧会话列表打开聊天记录。</Typography>
    </div>
  );
}

if (messagesStatus === "error") {
  return (
    <div className="workbench-error-state" role="alert">
      <Typography variant="label" weight={700}>聊天记录加载失败</Typography>
      <Typography variant="body" color="var(--text-secondary)">{messagesError ?? "无法读取该会话的历史消息。"}</Typography>
      <Button variant="secondary" size="sm" onClick={() => void loadHistory(activeChat)}>
        重试
      </Button>
    </div>
  );
}

if (messagesStatus === "empty") {
  return (
    <div className="workbench-empty-state">
      <Typography variant="label" weight={700}>没有消息</Typography>
      <Typography variant="body" color="var(--text-secondary)">后端没有返回该会话的聊天记录。</Typography>
    </div>
  );
}

return (
  <div ref={containerRef} className="message-list">
    {messagesHasMore && (
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <Button variant="secondary" size="sm" loading={messagesLoading} onClick={() => activeChat && void loadMoreHistory(activeChat)}>
          加载更早消息
        </Button>
      </div>
    )}
    {messagesLoading && messages.length === 0 && (
      <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
        <Spinner size={24} label="加载聊天记录..." />
      </div>
    )}
    {groups.map((group) => (
      <MessageGroup key={group.dateLabel} dateLabel={group.dateLabel} messages={group.messages} />
    ))}
    {!messagesHasMore && messages.length > 0 && (
      <div className="message-date-divider">已加载全部 {messages.length.toLocaleString()} 条消息</div>
    )}
  </div>
);
```

Keep `containerRef`, selected-conversation lookup, and `activeChat`; remove `flexDirection: "column-reverse"`, `shouldShowAvatar`, `bottomRef`, `prevMessageCountRef`, `isFirstLoad`, `handleScroll`, and the manual `scroll` event listener. Older-history loading must happen only through the explicit `加载更早消息` button in this phase.

- [ ] **Step 7: Use TranscriptHeader in ChatView**

Modify `src/l3-molecule/chat/ChatView.tsx`:

```tsx
import { useChatCommander } from "@l2/commander/";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { MessageList } from "./MessageList";
import { TranscriptHeader } from "./TranscriptHeader";

export function ChatView() {
  const { selectedConversationId, messagesTotalCount } = useChatCommander();
  const conversations = useChatStore((state) => state.conversations);
  const currentConv = conversations.find((conversation) => conversation.id === selectedConversationId);

  return (
    <div className="transcript">
      {currentConv && <TranscriptHeader conversation={currentConv} totalCount={messagesTotalCount} />}
      <MessageList />
    </div>
  );
}
```

- [ ] **Step 8: Verify unknown direction no longer maps to other bubble**

Run:

```powershell
pnpm test src/l3-molecule/chat/transcriptDisplay.test.ts
pnpm typecheck
rg -n "isSelf|row-reverse|column-reverse|shouldShowAvatar|handleScroll|bottomRef|prevMessageCountRef|isFirstLoad" src/l3-molecule/chat
```

Expected: test and typecheck pass. `rg` exits 1 with no matches.

- [ ] **Step 9: Commit transcript polish**

Run:

```powershell
git add src/styles/workbench-content.css src/l3-molecule/chat/ChatView.tsx src/l3-molecule/chat/MessageList.tsx src/l3-molecule/chat/MessageBubble.tsx src/l3-molecule/chat/MessageGroup.tsx src/l3-molecule/chat/MessageMeta.tsx src/l3-molecule/chat/TranscriptHeader.tsx
git commit -m "style: render p2-b transcript honestly"
```

## Task B5: Search Scope, Results Pane, And Result Context

**Files:**

- Modify: `src/l2-coordinator/data-clerk/stores/useSearchStore.ts`
- Modify: `src/l2-coordinator/commander/searchRequest.ts`
- Modify: `src/l2-coordinator/commander/searchRequest.test.ts`
- Modify: `src/l2-coordinator/commander/useSearchCommander.ts`
- Create: `src/l3-molecule/search/SearchScopeMenu.tsx`
- Create: `src/l3-molecule/search/SearchResultsPane.tsx`
- Modify: `src/l3-molecule/search/GlobalSearch.tsx`
- Modify: `src/l3-molecule/search/FilterBar.tsx`
- Modify: `src/l3-molecule/search/SearchResults.tsx`
- Modify: `src/styles/workbench-content.css`

- [ ] **Step 1: Extend search request tests first**

Append to `src/l2-coordinator/commander/searchRequest.test.ts`:

```ts
it("passes current conversation scope as backend chats", () => {
  expect(createSearchRequest({
    keyword: "合同",
    filter: "text",
    limit: 20,
    offset: 0,
    scopeChat: "wxid_a",
  })).toEqual({
    keyword: "合同",
    limit: 20,
    offset: 0,
    msgType: "1",
    chats: ["wxid_a"],
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm test src/l2-coordinator/commander/searchRequest.test.ts
```

Expected: FAIL because `scopeChat` is not part of `CreateSearchRequestInput`.

- [ ] **Step 3: Add scope support**

Modify `src/l2-coordinator/commander/searchRequest.ts`:

```ts
interface CreateSearchRequestInput {
  keyword: string;
  filter: SearchFilterType;
  limit: number;
  offset: number;
  scopeChat?: string;
}
```

Modify the `createSearchRequest` destructuring and add `scopeChat` after `msgType` handling:

```ts
export function createSearchRequest({
  keyword,
  filter,
  limit,
  offset,
  scopeChat,
}: CreateSearchRequestInput): FetchSearchOptions {
  const params: FetchSearchOptions = {
    keyword: keyword.trim(),
    limit,
    offset,
  };

  const msgType = toSearchMessageType(filter);
  if (msgType) {
    params.msgType = msgType;
  }

  if (scopeChat) {
    params.chats = [scopeChat];
  }

  return params;
}
```

Run:

```powershell
pnpm test src/l2-coordinator/commander/searchRequest.test.ts
```

Expected: PASS.

- [ ] **Step 4: Extend search store state**

Modify `src/l2-coordinator/data-clerk/stores/useSearchStore.ts`:

```ts
export type SearchScope = "all" | "current";

interface SearchState {
  query: string;
  activeFilter: SearchFilterType;
  scope: SearchScope;
  activeResultId: string | null;
  results: SearchResults | null;
  loading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  setFilter: (filter: SearchFilterType) => void;
  setScope: (scope: SearchScope) => void;
  setActiveResultId: (id: string | null) => void;
  setResults: (results: SearchResults | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}
```

Add defaults/actions:

```ts
scope: "all",
activeResultId: null,
setScope: (scope) => set({ scope }),
setActiveResultId: (activeResultId) => set({ activeResultId }),
clear: () => set({ query: "", results: null, activeResultId: null, loading: false, error: null }),
```

- [ ] **Step 5: Update commander to pass current scope**

Modify `src/l2-coordinator/commander/useSearchCommander.ts` by importing chat store:

```ts
import { useChatStore } from "@/l2-coordinator/data-clerk/stores/useChatStore";
```

Inside `executeSearchFn`, read scope and selected conversation:

```ts
const { scope } = useSearchStore.getState();
const selectedConversationId = useChatStore.getState().selectedConversationId;
const conversation = useChatStore.getState().conversations.find((item) => item.id === selectedConversationId);
const scopeChat = scope === "current" ? conversation?.username : undefined;
const result = await fetchSearch(createSearchRequest({ keyword, filter, limit: SEARCH_PAGE_SIZE, offset: 0, scopeChat }));
```

Inside `loadMoreResults`, pass the same `scopeChat` into `createSearchRequest`.

Return `changeScope`:

```ts
const changeScope = useCallback((scope: "all" | "current") => {
  const { query } = useSearchStore.getState();
  debouncedSearchRef.current.cancel();
  useSearchStore.getState().setScope(scope);
  if (query.trim()) {
    executeSearchFn(query);
  }
}, [executeSearchFn]);
```

Add `changeScope` to the returned commander object:

```ts
return {
  ...store,
  search,
  executeSearch,
  changeFilter,
  changeScope,
  clearSearch,
  loadMoreResults,
};
```

- [ ] **Step 6: Add search CSS**

Append to `src/styles/workbench-content.css`:

```css
.search-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-2);
}

.search-panel__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-2);
  align-items: center;
}

.search-scope-menu,
.search-filter-bar {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.search-result-pane {
  max-height: 240px;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-base);
}

.search-result-row {
  display: block;
  width: 100%;
  min-width: 0;
  padding: var(--space-3);
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.search-result-row:hover,
.search-result-row--active {
  background: var(--surface-hover);
}

.search-result-row__meta,
.search-result-row__content {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 7: Create SearchScopeMenu**

Create `src/l3-molecule/search/SearchScopeMenu.tsx`:

```tsx
import { Button } from "@l4/ui";
import type { SearchScope } from "@l2/data-clerk/stores/useSearchStore";

interface SearchScopeMenuProps {
  scope: SearchScope;
  currentConversationName: string;
  currentConversationAvailable: boolean;
  onChange: (scope: SearchScope) => void;
}

export function SearchScopeMenu({
  scope,
  currentConversationName,
  currentConversationAvailable,
  onChange,
}: SearchScopeMenuProps) {
  return (
    <div className="search-scope-menu" role="toolbar" aria-label="搜索范围">
      <Button variant={scope === "all" ? "secondary" : "ghost"} size="sm" onClick={() => onChange("all")}>
        全部
      </Button>
      <Button
        variant={scope === "current" ? "secondary" : "ghost"}
        size="sm"
        disabled={!currentConversationAvailable}
        onClick={() => onChange("current")}
      >
        {currentConversationAvailable ? currentConversationName : "当前会话"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 8: Replace FilterBar buttons with Button primitive**

Modify `src/l3-molecule/search/FilterBar.tsx` import and button:

```tsx
import { Button } from "@l4/ui";
```

Use:

```tsx
<Button
  key={f.key}
  type="button"
  aria-pressed={activeFilter === f.key}
  variant={activeFilter === f.key ? "secondary" : "ghost"}
  size="sm"
  onClick={() => onFilterChange(f.key)}
>
  {f.label}
</Button>
```

- [ ] **Step 9: Create SearchResultsPane**

Create `src/l3-molecule/search/SearchResultsPane.tsx`:

```tsx
import { Button, Typography } from "@l4/ui";
import type { SearchResults } from "@l2/data-clerk/stores/useSearchStore";

interface SearchResultsPaneProps {
  query: string;
  results: SearchResults | null;
  loading: boolean;
  error: string | null;
  activeResultId: string | null;
  onOpenResult: (message: SearchResults["messages"][number]) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onClear: () => void;
}

export function SearchResultsPane({
  query,
  results,
  loading,
  error,
  activeResultId,
  onOpenResult,
  onLoadMore,
  onRetry,
  onClear,
}: SearchResultsPaneProps) {
  if (error) {
    return (
      <div className="workbench-error-state" role="alert">
        <Typography variant="label" weight={700}>搜索失败</Typography>
        <Typography variant="body" color="var(--text-secondary)">{error}</Typography>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={onRetry}>重试</Button>
          <Button variant="ghost" size="sm" onClick={onClear}>清除</Button>
        </div>
      </div>
    );
  }

  if (!results) return null;

  if (results.messages.length === 0 && query.trim()) {
    return (
      <div className="workbench-empty-state">
        <Typography variant="label" weight={700}>没有搜索结果</Typography>
        <Typography variant="body" color="var(--text-secondary)">换一个关键词或放宽搜索范围。</Typography>
      </div>
    );
  }

  const hasMore = results.offset + results.count < results.totalCount;

  return (
    <div className="search-result-pane" role="list" aria-label="搜索结果">
      {results.messages.map((message) => {
        const active = message.id === activeResultId;
        const time = message.time ? new Date(message.time).toLocaleString("zh-CN") : "";
        return (
          <button
            key={message.id}
            type="button"
            className={`search-result-row${active ? " search-result-row--active" : ""}`}
            aria-current={active ? "true" : undefined}
            onClick={() => onOpenResult(message)}
          >
            <div className="search-result-row__meta">
              <Typography variant="label" weight={700}>{message.sender || message.chat || message.username}</Typography>
              <Typography variant="caption" color="var(--text-muted)">{time}</Typography>
            </div>
            <Typography variant="body" color="var(--text-secondary)" className="search-result-row__content">
              {message.content || "[空消息]"}
            </Typography>
          </button>
        );
      })}
      {hasMore && (
        <Button variant="ghost" size="sm" loading={loading} onClick={onLoadMore} style={{ width: "100%", borderRadius: 0 }}>
          加载更多搜索结果
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 10: Make SearchResults a container for the pane**

Replace `src/l3-molecule/search/SearchResults.tsx` with a wrapper that uses `SearchResultsPane`. The click handler must set `activeResultId` and call `selectAndLoad(chat, chat)` where `chat = msg.username || msg.chat`.

```tsx
import { useSearchCommander } from "@l2/commander/";
import { useChatCommander } from "@l2/commander/";
import { useSearchStore } from "@l2/data-clerk/stores/useSearchStore";
import { SearchResultsPane } from "./SearchResultsPane";

export function SearchResults() {
  const { query, results, loading, error, executeSearch, clearSearch, loadMoreResults } = useSearchCommander();
  const { selectAndLoad } = useChatCommander();
  const activeResultId = useSearchStore((state) => state.activeResultId);
  const setActiveResultId = useSearchStore((state) => state.setActiveResultId);

  return (
    <SearchResultsPane
      query={query}
      results={results}
      loading={loading}
      error={error}
      activeResultId={activeResultId}
      onOpenResult={(message) => {
        const chat = message.username || message.chat;
        setActiveResultId(message.id);
        void selectAndLoad(chat, chat);
      }}
      onLoadMore={() => void loadMoreResults()}
      onRetry={() => executeSearch(query)}
      onClear={clearSearch}
    />
  );
}
```

- [ ] **Step 11: Integrate SearchScopeMenu in GlobalSearch**

Replace the imports and render body in `src/l3-molecule/search/GlobalSearch.tsx` with this structure:

```tsx
import { Input, Spinner, Typography } from "@l4/ui";
import { useSearchCommander } from "@l2/commander/";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { SearchScopeMenu } from "./SearchScopeMenu";

interface GlobalSearchProps {
  className?: string;
  style?: React.CSSProperties;
}

export function GlobalSearch({ className, style }: GlobalSearchProps) {
  const { query, results, loading, scope, search, executeSearch, clearSearch, changeScope } = useSearchCommander();
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const conversations = useChatStore((state) => state.conversations);
  const currentConversation = conversations.find((item) => item.id === selectedConversationId);
  const resultCount = results?.totalCount ?? 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      executeSearch(event.currentTarget.value);
    }
    if (event.key === "Escape") {
      clearSearch();
    }
  };

  return (
    <div className={className} style={style}>
      <div className="search-panel__controls">
        <div style={{ position: "relative", minWidth: 0 }}>
          <Input
            variant="search"
            aria-label="搜索聊天记录"
            placeholder="搜索聊天记录"
            value={query}
            onChange={(event) => search(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && (
            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
              <Spinner size={16} color="var(--text-tertiary)" />
            </div>
          )}
        </div>
        <SearchScopeMenu
          scope={scope}
          currentConversationName={currentConversation?.displayName ?? "当前会话"}
          currentConversationAvailable={Boolean(currentConversation)}
          onChange={changeScope}
        />
      </div>
      {resultCount > 0 && (
        <Typography variant="caption" color="var(--text-secondary)">
          找到 {resultCount.toLocaleString()} 条匹配记录
        </Typography>
      )}
    </div>
  );
}
```

Run:

```powershell
pnpm test src/l2-coordinator/commander/searchRequest.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 12: Commit search polish**

Run:

```powershell
git add src/styles/workbench-content.css src/l2-coordinator/data-clerk/stores/useSearchStore.ts src/l2-coordinator/commander/searchRequest.ts src/l2-coordinator/commander/searchRequest.test.ts src/l2-coordinator/commander/useSearchCommander.ts src/l3-molecule/search
git commit -m "style: polish p2-b search workflow"
```

## Task B6: Stats Inspector And Accessible Trend Fallback

**Files:**

- Create: `src/l3-molecule/stats/statsDisplay.test.ts`
- Create: `src/l3-molecule/stats/statsDisplay.ts`
- Create: `src/l3-molecule/stats/MetricRow.tsx`
- Create: `src/l3-molecule/stats/ChartFallbackTable.tsx`
- Modify: `src/l3-molecule/stats/StatsInspector.tsx`
- Modify: `src/l3-molecule/stats/DashboardOverview.tsx`
- Modify: `src/l3-molecule/stats/TrendChart.tsx`
- Modify: `src/l3-molecule/stats/TopContactCard.tsx`
- Modify: `src/styles/workbench-content.css`

Current remediation baseline: `StatsInspector.tsx` already exists, stats surfaces already use `Surface`, and `DashboardView.tsx` is only a compatibility wrapper. P2-B must preserve that baseline and add helper-tested inspector polish, not recreate the old inline stats structure.

- [ ] **Step 1: Write failing stats helper tests**

Create `src/l3-molecule/stats/statsDisplay.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { AdaptedStats, TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";
import { buildMetricRows, shouldUseTrendTable, summarizeTrendRange } from "./statsDisplay";

const stats: AdaptedStats = {
  chat: "wxid_a",
  username: "wxid_a",
  isGroup: false,
  chatType: "private",
  total: 1200,
  sentCount: 500,
  receivedCount: 700,
  activeSenders: 2,
  activeDays: 8,
  firstMessageTime: 0,
  lastMessageTime: 0,
  queryRangeLabel: "最近 7 天",
  byType: [],
  topSenders: [],
  byHour: [],
};

describe("statsDisplay", () => {
  it("builds stable metric rows with labels and descriptions", () => {
    expect(buildMetricRows(stats).map((row) => row.label)).toEqual(["消息总数", "发送", "接收", "活跃人数", "活跃天数", "查询范围"]);
    expect(buildMetricRows(stats)[0].value).toBe("1,200");
  });

  it("uses table fallback when the trend is too dense for the inspector", () => {
    const dense: TrendDataPoint[] = Array.from({ length: 40 }, (_, index) => ({ date: `2026-05-${index + 1}`, count: index }));
    expect(shouldUseTrendTable(dense, 300)).toBe(true);
    expect(shouldUseTrendTable(dense.slice(0, 7), 320)).toBe(false);
  });

  it("summarizes trend range", () => {
    expect(summarizeTrendRange([{ date: "2026-05-28", count: 1 }, { date: "2026-05-29", count: 2 }])).toBe("2026-05-28 至 2026-05-29");
    expect(summarizeTrendRange([])).toBe("没有趋势数据");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm test src/l3-molecule/stats/statsDisplay.test.ts
```

Expected: FAIL because `./statsDisplay` does not exist.

- [ ] **Step 3: Add stats helper implementation**

Create `src/l3-molecule/stats/statsDisplay.ts`:

```ts
import type { AdaptedStats, TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";

export interface MetricRowData {
  label: string;
  value: string;
  description: string;
}

export function buildMetricRows(stats: AdaptedStats): MetricRowData[] {
  return [
    { label: "消息总数", value: stats.total.toLocaleString(), description: "当前查询范围内的消息数量" },
    { label: "发送", value: stats.sentCount.toLocaleString(), description: "本账号发送的消息数量" },
    { label: "接收", value: stats.receivedCount.toLocaleString(), description: "对方或群成员发送的消息数量" },
    { label: "活跃人数", value: stats.activeSenders.toLocaleString(), description: stats.isGroup ? "群聊中的活跃发送者数量" : "私聊双方的活跃发送者数量" },
    { label: "活跃天数", value: stats.activeDays.toLocaleString(), description: "有消息记录的自然日数量" },
    { label: "查询范围", value: stats.queryRangeLabel || "全部", description: "后端返回的统计时间范围" },
  ];
}

export function shouldUseTrendTable(data: TrendDataPoint[], inspectorWidth: number): boolean {
  return data.length > 14 || inspectorWidth < 300;
}

export function summarizeTrendRange(data: TrendDataPoint[]): string {
  if (data.length === 0) return "没有趋势数据";
  return `${data[0].date} 至 ${data[data.length - 1].date}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm test src/l3-molecule/stats/statsDisplay.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add stats CSS**

Append to `src/styles/workbench-content.css`:

```css
.stats-inspector {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
}

.metric-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-3);
  align-items: start;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.metric-row__label,
.metric-row__description {
  min-width: 0;
}

.metric-row__value {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.trend-chart {
  display: flex;
  height: 120px;
  align-items: flex-end;
  gap: 3px;
  padding: var(--space-2) 0;
}

.trend-chart__bar {
  flex: 1;
  min-width: 3px;
  border-radius: var(--radius-xs) var(--radius-xs) 0 0;
  background: var(--accent);
}

.chart-fallback-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.chart-fallback-table th,
.chart-fallback-table td {
  padding: 6px 0;
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
}

.chart-fallback-table td:last-child,
.chart-fallback-table th:last-child {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 6: Create MetricRow**

Create `src/l3-molecule/stats/MetricRow.tsx`:

```tsx
import { Typography } from "@l4/ui";
import type { MetricRowData } from "./statsDisplay";

interface MetricRowProps {
  row: MetricRowData;
}

export function MetricRow({ row }: MetricRowProps) {
  return (
    <div className="metric-row">
      <div>
        <Typography variant="label" weight={700} className="metric-row__label">
          {row.label}
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)" className="metric-row__description">
          {row.description}
        </Typography>
      </div>
      <span className="metric-row__value">{row.value}</span>
    </div>
  );
}
```

- [ ] **Step 7: Create ChartFallbackTable**

Create `src/l3-molecule/stats/ChartFallbackTable.tsx`:

```tsx
import type { TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";

interface ChartFallbackTableProps {
  data: TrendDataPoint[];
}

export function ChartFallbackTable({ data }: ChartFallbackTableProps) {
  return (
    <table className="chart-fallback-table">
      <thead>
        <tr>
          <th scope="col">日期</th>
          <th scope="col">消息数</th>
        </tr>
      </thead>
      <tbody>
        {data.map((point) => (
          <tr key={point.date}>
            <td>{point.date}</td>
            <td>{point.count.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 8: Rewrite DashboardOverview from cards to metric rows**

Modify `src/l3-molecule/stats/DashboardOverview.tsx` to render `MetricRow` rows inside `Surface`:

```tsx
import { SkeletonLoader, Surface } from "@l4/ui";
import type { AdaptedStats } from "@l2/data-clerk/stores/useStatsStore";
import { buildMetricRows } from "./statsDisplay";
import { MetricRow } from "./MetricRow";

interface DashboardOverviewProps {
  stats: AdaptedStats | null;
  loading: boolean;
}

export function DashboardOverview({ stats, loading }: DashboardOverviewProps) {
  if (loading) {
    return (
      <Surface variant="base" style={{ padding: 12 }}>
        <SkeletonLoader variant="text" width="65%" height={14} count={4} />
      </Surface>
    );
  }

  if (!stats) return null;

  return (
    <Surface variant="base" style={{ padding: 12 }}>
      {buildMetricRows(stats).map((row) => (
        <MetricRow key={row.label} row={row} />
      ))}
    </Surface>
  );
}
```

- [ ] **Step 9: Rewrite TrendChart with table fallback**

Modify `src/l3-molecule/stats/TrendChart.tsx`:

```tsx
import { Surface, Typography } from "@l4/ui";
import type { TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";
import { ChartFallbackTable } from "./ChartFallbackTable";
import { shouldUseTrendTable, summarizeTrendRange } from "./statsDisplay";

interface TrendChartProps {
  data: TrendDataPoint[];
  inspectorWidth?: number;
}

export function TrendChart({ data, inspectorWidth = 320 }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Surface variant="base" style={{ padding: 12 }}>
        <Typography variant="label" weight={700}>消息趋势</Typography>
        <Typography variant="body" color="var(--text-secondary)">没有趋势数据。</Typography>
      </Surface>
    );
  }

  const maxCount = Math.max(...data.map((point) => point.count), 1);
  const useTable = shouldUseTrendTable(data, inspectorWidth);

  return (
    <Surface variant="base" style={{ padding: 12 }}>
      <Typography variant="label" weight={700}>消息趋势</Typography>
      <Typography variant="caption" color="var(--text-secondary)">{summarizeTrendRange(data)}</Typography>
      {useTable ? (
        <ChartFallbackTable data={data} />
      ) : (
        <div className="trend-chart" role="img" aria-label={`消息趋势，${summarizeTrendRange(data)}`}>
          {data.map((point) => {
            const heightPct = Math.max((point.count / maxCount) * 100, 3);
            return (
              <div
                key={point.date}
                className="trend-chart__bar"
                style={{ height: `${heightPct}%` }}
                title={`${point.date}: ${point.count}`}
              />
            );
          })}
        </div>
      )}
    </Surface>
  );
}
```

- [ ] **Step 10: Keep TopContactCard on Surface and token classes**

Current code already imports `Surface`. Verify it still uses `Surface`, keeps avatar row rendering, and uses `item.display || item.sender` as the visible label:

```tsx
import { Avatar, Surface, Typography } from "@l4/ui";
```

Wrap content:

```tsx
<Surface variant="base" style={{ padding: 12 }}>
  ...
</Surface>
```

- [ ] **Step 11: Update existing StatsInspector against new helpers**

Modify the existing `src/l3-molecule/stats/StatsInspector.tsx` only to keep action layout, empty/error states, and child component calls aligned with the new metric rows and trend fallback. Do not move this component back into `WorkbenchView` or `DashboardView`.

The existing component should keep this public prop shape:

```tsx
import { Button, Typography } from "@l4/ui";
import type { AdaptedStats, TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";
import { DashboardOverview } from "./DashboardOverview";
import { TrendChart } from "./TrendChart";
import { TopContactCard } from "./TopContactCard";

interface StatsInspectorProps {
  currentChat: string;
  stats: AdaptedStats | null;
  trend: TrendDataPoint[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onShowAi: () => void;
  onOpenGraph: () => void;
}

export function StatsInspector({
  currentChat,
  stats,
  trend,
  loading,
  error,
  onRetry,
  onShowAi,
  onOpenGraph,
}: StatsInspectorProps) {
  return (
    <aside className="stats-inspector" aria-label="统计 inspector">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Typography variant="label" weight={700}>统计数据</Typography>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="ghost" size="sm" onClick={onShowAi}>AI</Button>
          <Button variant="ghost" size="sm" onClick={onOpenGraph}>图谱</Button>
        </div>
      </div>
      {!currentChat ? (
        <div className="workbench-empty-state">
          <Typography variant="label" weight={700}>选择会话</Typography>
          <Typography variant="body" color="var(--text-secondary)">打开会话后显示消息总量、趋势和活跃发送者。</Typography>
        </div>
      ) : error ? (
        <div className="workbench-error-state" role="alert">
          <Typography variant="label" weight={700}>统计加载失败</Typography>
          <Typography variant="body" color="var(--text-secondary)">{error}</Typography>
          <Button variant="secondary" size="sm" onClick={onRetry}>重试</Button>
        </div>
      ) : (
        <>
          <DashboardOverview stats={stats} loading={loading} />
          <TrendChart data={trend} />
          {stats && <TopContactCard topSenders={stats.topSenders} />}
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 12: Verify DashboardView remains a wrapper**

Run:

```powershell
Get-Content -Raw src/l1-entry/pages/DashboardView.tsx
```

Expected output contains only:

```tsx
import { WorkbenchView } from "./WorkbenchView";

export function DashboardView() {
  return <WorkbenchView />;
}
```

If `DashboardView.tsx` contains imports for chat/search/stats components or an inline inspector, stop and re-apply the Code Review Remediation architecture before continuing P2-B.

- [ ] **Step 13: Verify no stats GlassPanel remains**

Run:

```powershell
pnpm test src/l3-molecule/stats/statsDisplay.test.ts
pnpm typecheck
rg -n "GlassPanel" src/l3-molecule/stats src/l1-entry/pages/DashboardView.tsx
```

Expected: tests and typecheck pass. `rg` exits 1 with no matches for these paths.

- [ ] **Step 14: Commit stats inspector polish**

Run:

```powershell
git add src/styles/workbench-content.css src/l3-molecule/stats
git commit -m "style: polish p2-b stats inspector"
```

## Task B7: WorkbenchView Composition And Single-Pane Flow

**Files:**

- Modify: `src/l1-entry/pages/WorkbenchView.tsx`
- Modify: `src/styles/workbench-content.css`

- [ ] **Step 1: Preserve single-pane list/detail after replacing ContactList**

Current `WorkbenchView` already derives:

```tsx
const conversationList = (
  <ContactList onConversationOpened={workbench.handleConversationOpened} />
);
const mainContent = workbench.conversationListAsMain ? conversationList : <ChatView />;
```

After Task B2 converts `ContactList` into a compatibility wrapper, verify that `onConversationOpened` is still passed through to `ConversationList`. This preserves the existing `useWorkbenchCommander` single-pane list/detail state.

- [ ] **Step 2: Verify no duplicate list remains in the toolbar**

Run:

```powershell
rg -n "maxHeight: 180|conversationListAsMain|openConversationList|返回会话列表" src/l1-entry/pages/WorkbenchView.tsx
```

Expected: no `maxHeight: 180` hit; `conversationListAsMain`, `openConversationList`, and `返回会话列表` remain present.

- [ ] **Step 3: Keep search from pushing transcript out of view**

In `WorkbenchView.tsx`, wrap search controls in a `div` with class `search-panel` and keep `SearchResults` capped by `.search-result-pane`.

```tsx
<div className="search-panel">
  <GlobalSearch />
  <FilterBar
    activeFilter={workbench.search.activeFilter}
    onFilterChange={workbench.search.changeFilter}
  />
  <SearchResults />
</div>
```

- [ ] **Step 4: Verify WorkbenchFrame drawer semantics remain fixed**

Current `WorkbenchFrame.tsx` should already close the drawer when the scrim is clicked and keep it open when the drawer body is clicked:

```tsx
<div className="workbench-frame__drawer-backdrop" role="presentation" onClick={onCloseInspector}>
  <aside
    className="workbench-frame__drawer"
    aria-label={inspectorTitle}
    onClick={(event) => event.stopPropagation()}
  >
```

If this snippet is missing, restore it before finishing P2-B.

- [ ] **Step 5: Verify composition**

Run:

```powershell
pnpm typecheck
pnpm test src/l3-molecule/workbench/workbenchLayout.test.ts src/l2-coordinator/commander/searchRequest.test.ts src/l3-molecule/chat/conversationDisplay.test.ts src/l3-molecule/chat/transcriptDisplay.test.ts src/l3-molecule/stats/statsDisplay.test.ts
```

Expected: all commands pass.

- [ ] **Step 6: Commit WorkbenchView composition cleanup**

Run:

```powershell
git add src/l1-entry/pages/WorkbenchView.tsx src/styles/workbench-content.css
git commit -m "refactor: compose p2-b workbench panes"
```

## Task B8: Verification And Browser Smoke

**Files:**

- Modify: `progress.md`

- [ ] **Step 1: Run full automated verification**

Run:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all exit 0. Existing GraphCanvas chunk warning may remain; record exact warning in `progress.md`.

- [ ] **Step 2: Run Rust tests only if Rust files changed**

P2-B should not modify Rust. If `git diff --name-only` includes `src-tauri/`, run:

```powershell
cd src-tauri
cargo test
```

Expected: exit 0 with the existing crate-name warning allowed.

- [ ] **Step 3: Check no new GlassPanel references in P2-B scope**

Run:

```powershell
git diff -- src/l1-entry/pages src/l3-molecule/chat src/l3-molecule/search src/l3-molecule/stats src/styles | rg "GlassPanel"
```

Expected: exit 1 with no matches.

- [ ] **Step 4: Start or reuse dev server**

Run:

```powershell
pnpm dev -- --host 127.0.0.1
```

Expected: dev server serves `http://127.0.0.1:1420/`. If another process already owns 1420, reuse the existing server after confirming it responds.

- [ ] **Step 5: Browser smoke matrix**

Use the Codex in-app browser or Playwright against `http://127.0.0.1:1420/`.

Check:

- `/` Setup Center still fits at 1440, 900, and 390 widths.
- `/workbench` not-ready state still explains setup/DB readiness.
- `/workbench` ready state with seeded or real DB shows conversation list, transcript, search panel, and stats inspector.
- Widths 1440, 1180, 900, 768, and 390 show no horizontal overflow, clipped primary buttons, or overlapping text.
- 390 width opens conversation list as primary content before selection.
- Search `Enter` executes immediately, `Escape` clears, scope button disables current-conversation search without a selected conversation.
- Search result click opens the backend chat ID and keeps the selected result highlighted.
- Stats inspector shows metric rows and trend table fallback when trend data is dense.
- Privacy mode keeps layout dimensions stable while masking conversation names, summaries, sender labels, message text, and search result snippets.

- [ ] **Step 6: Record verification**

Append to `progress.md`:

```markdown
## 2026-05-30 P2-B Implementation Verification

- `pnpm lint` -- PASS
- `pnpm typecheck` -- PASS
- `pnpm test` -- PASS ([test count from output])
- `pnpm build` -- PASS ([record GraphCanvas warning if present])
- Browser smoke: `/`, `/workbench`, `/settings` checked at 1440/1180/900/768/390 widths.
- P2-B scope check: no `GlassPanel` references remain in chat/search/stats/WorkbenchView/DashboardView diff.
```

- [ ] **Step 7: Commit verification log**

Run:

```powershell
git add progress.md
git commit -m "test: verify p2-b core workbench polish"
```

## Acceptance Criteria

- Conversation list is conversation-first, not contact-first, while keeping `ContactList` as a compatibility wrapper.
- Conversation rows have stable height, no per-row stagger animation, visible hover, selected, and focus states.
- Conversation loading, empty, filter-empty, and error states are local and recoverable.
- Transcript renders unknown message direction as neutral, not as fabricated other-side bubbles.
- Group messages show sender metadata; private messages remain compact.
- Loading older messages uses an explicit stable control and does not reverse the scroll column.
- Search supports all/current-conversation scope, immediate Enter submit, Escape clear, loading, empty, error, result active state, and backend chat ID navigation.
- Stats inspector stays extracted from the workbench page, uses `Surface` and metric rows, and provides trend table fallback.
- `GlassPanel` is not referenced by P2-B chat/search/stats/WorkbenchView/DashboardView changes.
- `DashboardView` stays a compatibility wrapper, while `WorkbenchView` stays a composition layer and does not absorb component rendering details.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
- Browser smoke results are recorded in `progress.md`.

## Risk Register

- **Risk:** Large conversation lists can jank if every row uses animation or heavy derived formatting.  
  **Response:** P2-B removes per-row Framer Motion from conversation rows, keeps row DOM simple, and verifies 500-row scroll behavior manually.

- **Risk:** Exact search-result message jump is not supported by current `useChatCommander`.  
  **Response:** P2-B opens the correct backend conversation ID and keeps selected result context visible. Exact timestamp anchoring is a separate behavior change after message-page indexing exists.

- **Risk:** Unknown message direction can make legacy bubble styling misleading.  
  **Response:** `transcriptDisplay.getTranscriptTone()` maps `unknown` to neutral and tests that behavior.

- **Risk:** Dense trend data becomes unreadable inside a narrow inspector.  
  **Response:** `shouldUseTrendTable()` switches dense or narrow inspector data to an accessible table.

- **Risk:** P2-B accidentally expands into AI/Graph behavior after the remediation pass already moved Graph into a module.  
  **Response:** Preserve the current `GraphModule` and AI inspector entry, but do not change semantic/graph backend contracts, canvas simulation behavior, or graph chunk strategy in this phase.

## Self-Review

- Spec coverage: P2-B tasks cover conversation list, transcript, search panel, stats inspector, responsive single-pane flow, tests, verification, and progress logging.
- Placeholder scan: all tasks specify concrete files, commands, expected results, and code snippets.
- Type consistency: task snippets use current `Conversation`, `ChatMessage`, `AdaptedStats`, `TrendDataPoint`, `SearchResults`, `SearchFilterType`, and `FetchSearchOptions` names from the current codebase.
- Scope check: Settings diagnostics, AI/Graph containment, visual QA matrix hardening, and release work remain outside P2-B.

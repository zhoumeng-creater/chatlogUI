# P1 Core Chat Workbench Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the core chat workbench after P0 so the UI can reliably load sessions, contacts, chatrooms, history, search results, and per-chat statistics from the real `chatlog_alpha` HTTP API, while replacing the current fragile dashboard surface with a usable, modern, Apple-inspired desktop workbench.

**Architecture:** Keep the P0 setup foundation intact. P1 owns the chat data contract and the primary workbench. Raw `chatlog_alpha` DTOs stay in L4 network atoms, pure adapters translate snake_case/raw backend fields into L2 domain models, L2 stores/commanders own loading, pagination, selection, search, and stats orchestration, and L3/L1 render a stable split-view workbench with explicit loading, empty, error, and recovery states.

**Tech Stack:** React 18, React Router 6, Zustand 5, Vite 6, Vitest 4, Tauri v2, existing `chatlog_alpha` HTTP API on `127.0.0.1:5030`, P0 `requestJson` client, P0 setup/readiness store.

---

## 1. P1 Success Definition

P1 is complete when a user who has finished P0 setup can enter the workbench and perform the essential chatlog tasks without runtime errors:

- See a conversation list based on `/api/v1/sessions`.
- Search/filter visible conversations without losing selection.
- Select a private chat or group chat and load `/api/v1/history`.
- Scroll to load older messages without duplicate calls or broken offsets.
- Search messages through `/api/v1/search` with correct backend parameters.
- Click a search result and open the correct conversation context.
- See per-chat stats from `/api/v1/stats`.
- See a basic trend view from `/api/v1/dashboard/trend` or a clearly supported per-chat fallback.
- Keep the UI usable when the DB is not ready, a request fails, a list is empty, or a response is partially missing.
- Keep P0 setup, sidecar lifecycle, safe port behavior, and config storage unchanged.

P1 must not be treated as a broad visual redesign of every advanced feature. It is a core-workbench repair phase. The UI should become clean and usable now, but deeper AI/graph/SNS/media/DB explorer redesign stays out of scope.

## 2. P0 Leftovers Included In P1

These items were intentionally left out of P0 or could not be fully verified during P0 review. P1 must carry them explicitly:

- `src/l4-atom/system/detectWxPath.ts` still returns `[]`. P1 must replace it with a real Windows-aware data directory detection path, while preserving manual import as the dependable fallback.
- Browser DOM verification was not completed in P0 because the browser plugin failed with a CDP timeout. P1 must include real browser or manual smoke checks after implementation.
- `GraphCanvas` still creates a large build chunk. P1 should avoid opening graph by default and keep graph lazy, but chunk splitting itself is not a P1 deliverable unless it blocks the core workbench.
- Rust crate name warning `chatlogUI_lib` is not a P1 blocker.
- Existing chat/search/stats fetchers still bypass the new P0 `requestJson` foundation and still assume old response shapes. P1 must migrate them.
- `@l2/data-clerk/types/setup` path alias is already covered by `tsconfig.json` through `"@l2/*": ["src/l2-coordinator/*"]`; P1 only needs to keep typecheck as the verification gate.

## 3. P1 Non-Goals

Do not mix these into P1 unless they are needed to prevent the chat workbench from crashing:

- Full AI semantic setup and SSE QA repair.
- 3D graph data model redesign or chunk optimization.
- SNS timeline, favorite/media browser, DB/SQL explorer, hook/push UI, wx-cli compatibility screens.
- Packaging, updater, CI/release tasks.
- Global design system rewrite across all settings/AI/graph pages.
- Changing the original `chatlog_alpha` backend behavior.

## 4. Current Root Causes

The current UI is broken after P0 not because the setup foundation is still wrong, but because the old workbench still talks to a backend contract that does not exist.

Evidence from current UI code:

- `fetchContacts()` calls `/api/v1/contacts` and returns `ContactsResponse`, but `ContactsResponse` incorrectly expects `contacts`, `sessions`, and `chatRooms` in one object.
- `fetchChatRooms()` returns `ChatRoom[]`, but the real endpoint returns `{ count, chatrooms }`.
- `useChatCommander.loadContacts()` never calls `/api/v1/sessions`, yet the visible conversation list depends on sessions for recency and previews.
- `fetchHistory()` does not use P0 `requestJson` and expects `totalCount` and `HistoryMessage` fields that are not returned by the backend.
- `fetchSearch()` sends `chat`, `timeStart`, `timeEnd`, and `type`; the backend expects `chats`, `time` or `since/until`, and `msg_type`.
- `fetchStats()` sends `timeStart/timeEnd`; the backend expects `time` or `since/until`.
- `fetchDashboardTrend()` sends `chat/timeStart/timeEnd` and expects `points`; the backend accepts `window/summary` and returns `daily/topics/mentions/summary`.
- `DashboardView` and `ContactList` both trigger `loadContacts()`, causing duplicate requests and race conditions.
- `ContactList` builds the sidebar from contacts first, so recent sessions with no matched contact can disappear or lose ordering.
- `MessageBubble` relies on `message.isSelf`, but the real history message output does not contain `is_self`.
- Current chatroom domain type expects `users`, but `/api/v1/chatrooms` compatibility output exposes `user_count` instead.
- The workbench uses decorative/loose Apple-like styling instead of predictable desktop split-view behavior: structural emoji, oversized glass cards, weak error recovery, and no stable empty/error/loading model.

## 5. Original API Contract To Respect

The following contract is from the local `chatlog_alpha` repository, especially `internal/chatlog/http/route.go` and README notes.

| Feature | Endpoint | Required params | Optional params | JSON response shape |
| --- | --- | --- | --- | --- |
| Sessions | `GET /api/v1/sessions` | none | `query`, `limit`, `format=json` | `{ sessions: RawSession[] }` |
| Contacts | `GET /api/v1/contacts` | none | `query`, `limit`, `offset`, `is_friend`, `format=json` | `{ count, contacts: RawContact[] }` |
| Chatrooms | `GET /api/v1/chatrooms` | none | `query`, `limit`, `offset`, `format=json` | `{ count, chatrooms: RawChatRoom[] }` |
| History | `GET /api/v1/history` | `chat` | `time`, `since`, `until`, `msg_type`, `sub_type`, `hour`, `is_self`, `has_media`, `limit`, `offset`, `format=json` | `{ chat, username, is_group, chat_type, total_count, count, limit, offset, messages }` |
| Search | `GET /api/v1/search` | `keyword` | `chats`, `time`, `since`, `until`, `msg_type`, `limit`, `offset`, `format=json` | `{ total_count, count, limit, offset, messages }` |
| Stats | `GET /api/v1/stats` | `chat` | `time`, `since`, `until`, `format=json` | `{ chat, username, is_group, chat_type, total, sent_count, received_count, active_senders, active_days, first_message_time, last_message_time, query_since, query_until, query_range_label, by_type, top_senders, by_hour }` |
| Dashboard trend | `GET /api/v1/dashboard/trend` | none | `chat`, `window`, `summary`, `format=json` | `{ chat, window, window_label, from, to, count, truncated, topics, topics_source, topics_error, mentions, daily, summary, summary_error, source }` |

Important field details:

- Session item fields: `chat`, `username`, `is_group`, `chat_type`, `unread`, `last_msg_type`, `last_sender`, `summary`, `timestamp`, `time`.
- Contact item fields: `username`, `alias`, `remark`, `nickname`, `display`, `is_friend`.
- Chatroom item fields: `name`, `remark`, `nickname`, `display`, `owner`, `user_count`.
- History/search message fields: `timestamp`, `time`, `sender`, `type`, `content`, `local_id`, `media_type`, `media_key`, `media_keys`, `media_path`, `media_url`, `image_key`, `image_keys`, `image_path`, `image_url`, `chat`, `username`, `is_group`, `chat_type`.
- `type` is a display string from `formatMessageType`, not a numeric WeChat message type in the compatibility response.
- `first_message_time`, `last_message_time`, `query_since`, and `query_until` are Unix seconds, not formatted strings.

## 6. Target UX And UI Direction

P1 should use Apple-like interaction principles without copying superficial macOS decoration:

- Use a stable split view: conversation sidebar, transcript center, inspector/search/stats panel.
- Keep one primary job per region: left selects, center reads, right inspects/searches/analyzes.
- Prefer native-feeling, quiet controls over decorative cards.
- Use clear separators, restrained surfaces, and small-radius controls. Repeated item cards may use up to `8px` radius; avoid nested cards and oversized glass panels.
- Do not use emoji as structural icons. Use existing icon library if present, or plain text controls until icons are added consistently.
- Show explicit states for loading, empty, error, stale, and ready.
- Maintain keyboard and screen-reader basics: visible focus, labelled search inputs, buttons with text or aria labels, errors near source and `role="alert"`.
- Preserve content density. Chat logs are data-heavy; avoid landing-page composition, oversized hero text, decorative panels, and one-note gradients.
- Make responsive behavior deliberate:
  - `>= 1180px`: three columns.
  - `900px - 1179px`: conversation + transcript, inspector collapsible.
  - `< 900px`: one primary column at a time with visible back/navigation controls.
- Keep text readable and non-overlapping. Long names, paths, message previews, and stats labels must truncate or wrap predictably.

### P1 Workbench Layout

Recommended structure:

```text
WorkbenchShellView
  AppLayout
    WorkbenchHeader
      service/db status, setup link, privacy toggle if already available
    WorkbenchGrid
      ConversationSidebar
        Search conversations
        Segmented filter: Recent / Private / Groups
        Virtualized or prepared-for-virtual list
      TranscriptPane
        ChatHeader
        MessageToolbar: date range, type/media filters when supported
        MessageList
        Load older / scroll anchored pagination
      InspectorPane
        Tabs: Search / Stats
        SearchPanel
        StatsPanel
```

P1 may keep file names like `ContactList.tsx` temporarily, but the rendered concept should become "conversation list", not "contacts first".

## 7. Target Data Model

Define UI domain types separately from raw DTOs. The current `api-docs/*` files can be migrated or new files can be added under `src/l2-coordinator/data-clerk/types/chat.ts`.

Recommended domain:

```ts
export interface Conversation {
  id: string;
  username: string;
  displayName: string;
  chatType: "private" | "group" | "official_account" | "folded" | "unknown";
  isGroup: boolean;
  summary: string;
  timestamp: number;
  timeLabel: string;
  unread: number;
  lastSender: string;
  source: "session" | "contact" | "chatroom";
  contact?: Contact;
  chatroom?: ChatRoom;
}

export interface ChatMessage {
  id: string;
  localId: number;
  timestamp: number;
  time: string;
  sender: string;
  type: string;
  content: string;
  chat: string;
  username: string;
  isGroup: boolean;
  chatType: Conversation["chatType"];
  mediaType?: string;
  mediaUrl?: string;
  imageUrl?: string;
  direction: "self" | "other" | "unknown";
}
```

Direction rule for P1:

- Do not invent a self marker when the backend does not provide one.
- If `stats.sent_count` is available it is useful for counts, but it cannot identify each message.
- For direct chats, render neutral or left-aligned messages unless a reliable local-account/self source exists.
- For group chats, show sender labels and avoid using wrong right/left alignment.
- Add a later extension point for `viewerUsername` or backend `is_self` if the backend exposes it.

This is less flashy than the current bubble direction, but it is truthful and avoids misleading transcript interpretation.

## 8. File-Level Plan

### Create or Expand

- `src/l2-coordinator/data-clerk/types/chat.ts`
- `src/l2-coordinator/data-clerk/types/stats.ts` if separating stats domain from `api-docs`
- `src/l4-atom/network/chatlogRawTypes.ts`
- `src/l4-atom/network/chatlogAdapters.ts`
- `src/l4-atom/network/chatlogAdapters.test.ts`
- `src/l4-atom/network/fetchContacts.test.ts`
- `src/l4-atom/network/fetchHistory.test.ts`
- `src/l4-atom/network/fetchSearch.test.ts`
- `src/l4-atom/network/fetchStats.test.ts`
- `src/l2-coordinator/commander/chatCommander.test.ts` or pure helper tests if hooks are hard to test without new dependencies
- `src/l2-coordinator/commander/chatState.ts` for pure merge/pagination helpers if needed
- `src/l3-molecule/chat/ConversationList.tsx`
- `src/l3-molecule/chat/ConversationItem.tsx`
- `src/l3-molecule/chat/TranscriptPane.tsx`
- `src/l3-molecule/chat/ChatEmptyState.tsx`
- `src/l3-molecule/chat/ChatErrorState.tsx`
- `src/l3-molecule/search/SearchPanel.tsx`
- `src/l3-molecule/stats/StatsPanel.tsx`

### Modify

- `src/l4-atom/network/fetchContacts.ts`
- `src/l4-atom/network/fetchHistory.ts`
- `src/l4-atom/network/fetchSearch.ts`
- `src/l4-atom/network/fetchStats.ts`
- `src/l4-atom/network/index.ts`
- `src/l4-atom/system/detectWxPath.ts`
- `src/l2-coordinator/api-docs/contacts.ts`
- `src/l2-coordinator/api-docs/history.ts`
- `src/l2-coordinator/api-docs/search.ts`
- `src/l2-coordinator/api-docs/stats.ts`
- `src/l2-coordinator/data-clerk/stores/useChatStore.ts`
- `src/l2-coordinator/data-clerk/stores/useSearchStore.ts`
- `src/l2-coordinator/data-clerk/stores/useStatsStore.ts`
- `src/l2-coordinator/commander/useChatCommander.ts`
- `src/l2-coordinator/commander/useSearchCommander.ts`
- `src/l2-coordinator/commander/useStatsCommander.ts`
- `src/l1-entry/pages/DashboardView.tsx`
- `src/l1-entry/pages/WorkbenchShellView.tsx`
- `src/l3-molecule/chat/ContactList.tsx` if retained as compatibility wrapper
- `src/l3-molecule/chat/ChatView.tsx`
- `src/l3-molecule/chat/MessageList.tsx`
- `src/l3-molecule/chat/MessageBubble.tsx`
- `src/l3-molecule/search/GlobalSearch.tsx`
- `src/l3-molecule/search/SearchResults.tsx`
- `src/l3-molecule/search/FilterBar.tsx`
- `src/l3-molecule/stats/DashboardOverview.tsx`
- `src/l3-molecule/stats/TrendChart.tsx`
- `src/l3-molecule/stats/TopContactCard.tsx`

### Rust/Tauri For P0 Leftover Detection

- Add a Tauri command such as `detect_wechat_data_dirs`.
- Wire it through `src-tauri/src/commands.rs` and `src-tauri/src/lib.rs`.
- Replace the frontend-only stub in `src/l4-atom/system/detectWxPath.ts` with an invoke wrapper.

## 9. Task Breakdown

### Task 1: Add Contract Fixtures And Failing Adapter Tests

**Purpose:** Freeze the real backend contract before changing the UI. This prevents another self-invented frontend API from replacing the current one.

**Files:**

- Modify: `src/l4-atom/network/chatlogRawTypes.ts`
- Modify: `src/l4-atom/network/chatlogAdapters.ts`
- Modify: `src/l4-atom/network/chatlogAdapters.test.ts`

- [ ] Add raw fixture objects for sessions, contacts, chatrooms, history, search, stats, and dashboard trend.
- [ ] Add tests for raw-to-domain field mapping.
- [ ] Add tests that snake_case fields become camelCase UI fields.
- [ ] Add tests that timestamps in seconds stay seconds internally and are formatted only in UI helpers.
- [ ] Add tests that missing optional fields do not crash adapters.
- [ ] Add tests that chatrooms use `user_count`, not `users`.
- [ ] Add tests that message IDs are stable using `local_id` plus `username/chat/timestamp` fallback.

Example adapter tests:

```ts
it("adapts a raw session into a conversation", () => {
  expect(
    adaptSession({
      chat: "项目群",
      username: "123@chatroom",
      is_group: true,
      chat_type: "group",
      unread: 0,
      last_sender: "Alice",
      summary: "今天同步一下",
      timestamp: 1710000000,
      time: "03-10 20:00",
    }),
  ).toMatchObject({
    id: "123@chatroom",
    username: "123@chatroom",
    displayName: "项目群",
    isGroup: true,
    chatType: "group",
    summary: "今天同步一下",
    timestamp: 1710000000,
    lastSender: "Alice",
  });
});

it("adapts history response pagination metadata", () => {
  const result = adaptHistoryResponse({
    chat: "项目群",
    username: "123@chatroom",
    is_group: true,
    chat_type: "group",
    total_count: 120,
    count: 2,
    limit: 50,
    offset: 0,
    messages: [],
  });

  expect(result.totalCount).toBe(120);
  expect(result.messages).toEqual([]);
});
```

Run first:

```powershell
pnpm test src/l4-atom/network/chatlogAdapters.test.ts
```

Expected at the start of implementation: fail for missing adapter functions. Expected after Task 2: pass.

### Task 2: Complete Raw DTOs And Pure Adapters

**Purpose:** Put all contract translation in one tested layer.

**Files:**

- Modify: `src/l4-atom/network/chatlogRawTypes.ts`
- Modify: `src/l4-atom/network/chatlogAdapters.ts`
- Modify: `src/l2-coordinator/api-docs/contacts.ts`
- Modify: `src/l2-coordinator/api-docs/history.ts`
- Modify: `src/l2-coordinator/api-docs/search.ts`
- Modify: `src/l2-coordinator/api-docs/stats.ts`

- [ ] Add `RawChatRoom`, `RawChatRoomsResponse`, `RawHistoryMessage`, `RawHistoryResponse`, `RawSearchResponse`, `RawStatsResponse`, `RawDashboardTrendResponse`.
- [ ] Add `adaptContact`, `adaptChatRoom`, `adaptSession`, `mergeConversations`, `adaptHistoryMessage`, `adaptHistoryResponse`, `adaptSearchResponse`, `adaptStatsResponse`, `adaptDashboardTrendResponse`.
- [ ] Normalize chat type with an explicit helper:

```ts
export function normalizeChatType(value: string | undefined, username: string): ChatType {
  if (value === "group" || username.endsWith("@chatroom")) return "group";
  if (value === "official_account" || username.startsWith("gh_")) return "official_account";
  if (value === "folded") return "folded";
  if (value === "private" || !value) return "private";
  return "unknown";
}
```

- [ ] `mergeConversations` must prefer sessions for ordering and previews, then enrich with contacts/chatrooms by username.
- [ ] Contacts or chatrooms that are not in sessions can appear in secondary filtered views, but the default "Recent" view must be session-first.
- [ ] Message direction must default to `"unknown"` unless a reliable self marker exists.
- [ ] Media fields should preserve backend URLs when present and expose fallback `mediaPath/imagePath` labels when URLs are missing.
- [ ] Convert stats snake_case to domain camelCase while preserving raw seconds for date formatting.

### Task 3: Rewrite Network Fetchers On Top Of P0 `requestJson`

**Purpose:** Make every P1 fetcher use `format=json`, structured errors, timeout handling, and tested query parameter mapping.

**Files:**

- Modify: `src/l4-atom/network/fetchContacts.ts`
- Modify: `src/l4-atom/network/fetchHistory.ts`
- Modify: `src/l4-atom/network/fetchSearch.ts`
- Modify: `src/l4-atom/network/fetchStats.ts`
- Modify: `src/l4-atom/network/index.ts`
- Add: fetcher tests listed in section 8

- [ ] `fetchSessions({ limit = 500, query })` calls `/api/v1/sessions`.
- [ ] `fetchContacts({ limit = 500, offset = 0, query, isFriend })` calls `/api/v1/contacts`.
- [ ] `fetchChatRooms({ limit = 500, offset = 0, query })` calls `/api/v1/chatrooms`.
- [ ] `fetchConversations()` loads sessions, contacts, and chatrooms in parallel and returns merged conversations plus indexes.
- [ ] `fetchHistory()` sends `chat`, `limit`, `offset`, and only supported filters: `time`, `since`, `until`, `msg_type`, `sub_type`, `hour`, `is_self`, `has_media`.
- [ ] `fetchSearch()` maps UI filters to `msg_type`, maps selected chats to comma-separated `chats`, and never sends `chat`, `timeStart`, `timeEnd`, or `type`.
- [ ] `fetchStats()` sends `chat`, `time` or `since/until`, and adapts snake_case response.
- [ ] `fetchDashboardTrend()` sends `window` and `summary`; if per-chat trend is needed, pass `chat` explicitly and adapt `daily`.
- [ ] Export `requestJson`, `ChatlogHttpError`, readiness helpers, and all P1 fetchers from `src/l4-atom/network/index.ts`.

Example parameter test:

```ts
it("maps search params to chatlog_alpha query names", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const parsed = new URL(url);
      expect(parsed.searchParams.get("keyword")).toBe("合同");
      expect(parsed.searchParams.get("chats")).toBe("wxid_a,room@chatroom");
      expect(parsed.searchParams.get("msg_type")).toBe("3");
      expect(parsed.searchParams.get("format")).toBe("json");
      expect(parsed.searchParams.has("timeStart")).toBe(false);
      expect(parsed.searchParams.has("type")).toBe(false);
      return new Response(JSON.stringify({ total_count: 0, count: 0, limit: 20, offset: 0, messages: [] }));
    }),
  );

  await fetchSearch({ keyword: "合同", chats: ["wxid_a", "room@chatroom"], messageType: "image" });
});
```

### Task 4: Rebuild Chat Store And Commander Around Conversations

**Purpose:** Remove duplicated loads, keep selection stable, and make pagination predictable.

**Files:**

- Modify: `src/l2-coordinator/data-clerk/stores/useChatStore.ts`
- Modify: `src/l2-coordinator/commander/useChatCommander.ts`
- Add optional pure helper: `src/l2-coordinator/commander/chatState.ts`
- Add tests for pure helpers

- [ ] Replace `contacts/sessions/chatRooms` as the primary render source with `conversations`.
- [ ] Keep `contactsByUsername` and `chatRoomsByName` indexes for enrichment and detail panels.
- [ ] Store `selectedConversationId`, not separate `selectedContact` and `selectedChatRoom` as the primary source of truth.
- [ ] Keep compatibility selectors temporarily if existing components need them during migration.
- [ ] Store message pages by conversation ID to avoid clearing useful state when switching back and forth.
- [ ] Track `messagesStatus`: `"idle" | "loading" | "ready" | "loading-more" | "empty" | "error"`.
- [ ] Track `conversationsStatus`: `"idle" | "loading" | "ready" | "empty" | "error"`.
- [ ] Ensure `loadConversations()` dedupes in-flight calls.
- [ ] Ensure `DashboardView` owns the initial load once; child components must not call `loadConversations()` on mount.
- [ ] Ensure `selectConversation(id)` loads first history page only when needed or when forced.
- [ ] Ensure `loadMoreHistory(id)` uses `nextOffset = current.messages.length` or the backend offset returned by the previous page, not stale offset arithmetic.
- [ ] Preserve existing privacy mode behavior but make it rely on domain messages.

Suggested store shape:

```ts
interface ChatState {
  conversations: Conversation[];
  contactsByUsername: Record<string, Contact>;
  chatRoomsByName: Record<string, ChatRoom>;
  selectedConversationId: string | null;
  messagesByConversation: Record<string, MessagePageState>;
  conversationsStatus: LoadStatus;
  conversationsError: string | null;
}
```

### Task 5: Replace Contact-First Sidebar With Conversation Sidebar

**Purpose:** Make the most important UI region match how chatlog_alpha actually exposes recent chats.

**Files:**

- Add: `src/l3-molecule/chat/ConversationList.tsx`
- Add: `src/l3-molecule/chat/ConversationItem.tsx`
- Modify or wrap: `src/l3-molecule/chat/ContactList.tsx`
- Modify: `src/l1-entry/pages/DashboardView.tsx`

- [ ] Rename conceptually from contacts to conversations. If file names are kept to reduce diff size, exported UI labels and state names must say conversation/session.
- [ ] Default list order is session recency from `/api/v1/sessions`.
- [ ] Add a compact search input for display name, username, and summary.
- [ ] Add segmented filters: `最近`, `私聊`, `群聊`.
- [ ] Render last message summary, time label, group/private indicator, and unread count if backend later provides it.
- [ ] Use skeleton rows during loading, not full-screen spinners.
- [ ] Use actionable empty states:
  - no conversations: "数据库已连接，但没有会话数据" plus "回到设置中心检查数据目录".
  - filter no result: "没有匹配的会话" plus clear-filter action.
- [ ] Use inline error with retry button near the sidebar, not a global crash.
- [ ] Prepare for virtualization if conversation count is large. If no virtualization dependency is added in P1, at minimum cap expensive animations and avoid per-row stagger for large lists.
- [ ] Remove row animation delays proportional to index for long lists.

### Task 6: Rebuild Transcript Pane And Message Rendering

**Purpose:** Make history readable and truthful with the backend fields currently available.

**Files:**

- Modify: `src/l3-molecule/chat/ChatView.tsx`
- Modify: `src/l3-molecule/chat/MessageList.tsx`
- Modify: `src/l3-molecule/chat/MessageBubble.tsx`
- Modify: `src/l3-molecule/chat/MediaPreview.tsx`
- Add: `src/l3-molecule/chat/TranscriptPane.tsx` if splitting improves clarity
- Add: `src/l3-molecule/chat/ChatEmptyState.tsx`
- Add: `src/l3-molecule/chat/ChatErrorState.tsx`

- [ ] Header shows conversation display name, username, chat type, and message total if loaded.
- [ ] Message list supports first load, empty state, error state, and loading older state.
- [ ] Pagination control should be stable. Prefer explicit "加载更早消息" button above the list for P1; scroll-triggered pagination can be added only if anchoring is correct.
- [ ] Message key uses stable domain `id`.
- [ ] Message timestamp formatting should handle backend `YYYY-MM-DD HH:mm` strings and seconds.
- [ ] Message `type` is a text label. Do not compare it to numeric `3/4/34/6/49/47` after adapter migration.
- [ ] For media:
  - if `imageUrl` or `mediaUrl` exists, show clickable preview/link with accessible label.
  - if only media key/path exists, show a compact attachment row.
  - if media is unavailable, show the text fallback without hiding the message.
- [ ] For group chats, show sender labels clearly.
- [ ] For unknown direction, avoid misleading right-aligned "self" bubbles. A neutral transcript style is acceptable and preferable.
- [ ] Privacy mode must mask sender names, message text, media labels, and attachment paths.

### Task 7: Repair Global Search And Search Results

**Purpose:** Make search use the real backend API and make result navigation dependable.

**Files:**

- Modify: `src/l2-coordinator/data-clerk/stores/useSearchStore.ts`
- Modify: `src/l2-coordinator/commander/searchRequest.ts`
- Modify: `src/l2-coordinator/commander/useSearchCommander.ts`
- Modify: `src/l3-molecule/search/GlobalSearch.tsx`
- Modify: `src/l3-molecule/search/FilterBar.tsx`
- Modify: `src/l3-molecule/search/SearchResults.tsx`
- Add: `src/l3-molecule/search/SearchPanel.tsx`

- [ ] Replace `SearchQueryParams.chat` with `chats?: string[]`.
- [ ] Replace `timeStart/timeEnd` with `time?: string` or `since/until`.
- [ ] Replace `type` with `messageType` mapped to backend `msg_type`.
- [ ] Preserve current "all/text/image/video/file" UI only if mapping is explicit and tested. Unsupported filters should be disabled or hidden, not silently ignored.
- [ ] Search should debounce typing but execute immediately on Enter.
- [ ] Store search errors and render them with retry and clear actions.
- [ ] Results must show conversation display name if available, otherwise `chat` or `username`.
- [ ] Result click must use `msg.username` as the backend `chat` ID when present. Do not use display `msg.chat` as the request ID.
- [ ] If opening exact message position is not supported by backend, open the conversation and show a temporary "来自搜索结果" context banner. Exact jump can be a later task.
- [ ] Pagination uses backend `total_count/count/offset/limit`.

### Task 8: Repair Stats And Trend Panels

**Purpose:** Make the right inspector useful without pretending unsupported trend data exists.

**Files:**

- Modify: `src/l2-coordinator/data-clerk/stores/useStatsStore.ts`
- Modify: `src/l2-coordinator/commander/useStatsCommander.ts`
- Modify: `src/l4-atom/network/fetchStats.ts`
- Modify: `src/l3-molecule/stats/DashboardOverview.tsx`
- Modify: `src/l3-molecule/stats/TrendChart.tsx`
- Modify: `src/l3-molecule/stats/TopContactCard.tsx`
- Add: `src/l3-molecule/stats/StatsPanel.tsx`

- [ ] Use real `StatsResponse` snake_case adapters.
- [ ] Add time range UI based on backend-supported values:
  - `all`
  - `last-1d`
  - `last-7d`
  - `last-30d`
  - `last-3m`
  - `last-1y`
- [ ] For custom ranges, use `since/until` only after a date picker/control exists.
- [ ] Show stats loading and stats error independently from history loading.
- [ ] Show zero-data state with a recovery path.
- [ ] Use `by_hour` for a compact hour distribution chart.
- [ ] Use `by_type` for message type distribution.
- [ ] Use `top_senders` only for group chats; for private chats, explain that active sender ranking is not meaningful.
- [ ] For trend:
  - if adapting `/api/v1/dashboard/trend`, use its `daily` array and supported `window` parameter.
  - if `daily` shape is uncertain, write adapter tests against real fixture output from the backend source/static UI.
  - do not keep returning `TrendResponse.points` unless the adapter truly creates it.
- [ ] Keep charts accessible: visible labels, no color-only meaning, no hover-only data.

### Task 9: Implement Real `detectWxPath`

**Purpose:** Close the P0 leftover while keeping manual setup as the fallback.

**Files:**

- Modify: `src/l4-atom/system/detectWxPath.ts`
- Add/modify Rust command in `src-tauri/src/commands.rs`
- Add supporting Rust module if needed, such as `src-tauri/src/wechat_detect.rs`
- Modify: `src-tauri/src/lib.rs`
- Add Rust tests for pure path-candidate logic

- [ ] Add a Tauri command returning:

```ts
export interface WxPathCandidate {
  path: string;
  label: string;
  exists: boolean;
  source: "documents" | "onedrive-documents" | "user-profile" | "manual-history";
  confidence: "high" | "medium" | "low";
}
```

- [ ] Search Windows candidate roots:
  - `%USERPROFILE%\Documents\WeChat Files`
  - `%USERPROFILE%\Documents\xwechat_files`
  - OneDrive Documents equivalent if discoverable.
  - Recent manually imported `dataDir` from P0 profile.
- [ ] Prefer account directories such as `wxid_*` under these roots when present.
- [ ] Mark root directories and account directories differently.
- [ ] Do not scan deep media/database subtrees.
- [ ] Do not block the Setup Center if detection fails.
- [ ] Add UI copy that treats detection as a suggestion, not a guarantee.
- [ ] Keep privacy: do not log full paths unless diagnostics privacy mode is off; mask or shorten in copyable diagnostics.

### Task 10: Workbench Shell Cleanup And Routing

**Purpose:** Ensure P0 setup and P1 workbench coexist cleanly.

**Files:**

- Modify: `src/l1-entry/pages/WorkbenchShellView.tsx`
- Modify: `src/l1-entry/pages/DashboardView.tsx`
- Modify: `src/l1-entry/routes/index.tsx` only if needed

- [ ] `WorkbenchShellView` remains the readiness gate.
- [ ] If `dbReady` is false, show the P0 not-ready state and setup link.
- [ ] If `dbReady` is true, render the P1 workbench.
- [ ] Avoid calling `loadExistingProfile/checkReadiness` in loops caused by unstable function identities.
- [ ] Keep `/dashboard` compatibility but prefer `/workbench` as the canonical future route.
- [ ] Add a small status strip in the workbench header showing HTTP and DB readiness.
- [ ] Do not navigate back to setup automatically after the user intentionally opens the workbench; show a state with recovery action instead.

### Task 11: Visual Quality Pass For The Core Workbench

**Purpose:** Bring P1 UI to a usable modern baseline before deeper P2 visual redesign.

**Files:**

- Modify P1 L1/L3 workbench components and shared CSS as needed.

- [ ] Remove structural emoji from the core workbench controls.
- [ ] Replace large decorative glass cards in the main workbench with quiet surfaces, separators, and compact panels.
- [ ] Use radius tokens no larger than `8px` for repeated workbench items.
- [ ] Use consistent spacing based on 4/8px increments.
- [ ] Ensure all buttons and controls have stable dimensions and do not shift layout on hover/loading.
- [ ] Ensure search, filter, retry, load-more, and tab controls are keyboard accessible.
- [ ] Ensure narrow widths do not create overlapping columns or clipped critical text.
- [ ] Avoid full-page hero/landing composition inside the app.
- [ ] Keep motion minimal and interruptible; remove long staggered animations from lists.
- [ ] Add `prefers-reduced-motion` handling where motion remains.

### Task 12: Verification And Manual Smoke Checks

**Purpose:** Prevent another "passes build but cannot be used" state.

**Automated checks:**

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
cd src-tauri
cargo test
```

**Manual or browser checks with a real ready DB:**

- [ ] Open `/` and confirm Setup Center still works.
- [ ] Open `/workbench` after DB readiness is true.
- [ ] Conversation list loads from sessions and keeps recency order.
- [ ] Selecting a private conversation loads history.
- [ ] Selecting a group conversation loads history and shows sender labels.
- [ ] Loading older history does not duplicate messages.
- [ ] Global search returns results for a known keyword.
- [ ] Clicking a search result opens the correct conversation.
- [ ] Stats panel loads for a selected conversation.
- [ ] Trend panel either renders real adapted daily data or clearly shows that no trend data is available.
- [ ] Disconnect/stop service and confirm workbench shows recoverable not-ready state without crashing.
- [ ] Resize to 1440, 1180, 900, 768, and 390 px widths. No critical overlap.
- [ ] Enable privacy mode and confirm sender, message, path, and media labels are masked.

**Manual or browser checks without DB readiness:**

- [ ] Workbench does not render the broken dashboard.
- [ ] Not-ready state explains HTTP vs DB readiness.
- [ ] Setup link returns to Setup Center.

## 10. Acceptance Criteria

P1 is accepted only when all of the following are true:

- All P1 fetchers use P0 `requestJson`.
- All P1 fetchers append or preserve `format=json`.
- Sessions, contacts, chatrooms, history, search, stats, and trend have raw DTOs and adapter tests.
- Conversation sidebar is session-first and not contact-first.
- `DashboardView` no longer causes duplicate conversation loads through parent and child effects.
- A user can select a conversation and read messages from the real `/api/v1/history` contract.
- Search uses `chats`, `msg_type`, `time` or `since/until`, not stale frontend-only names.
- Search result navigation uses backend username/chat ID, not a display label.
- Stats uses snake_case adapter fields and real backend time range parameters.
- Message rendering is truthful about unknown self/other direction.
- Chatroom user count no longer assumes a `users` array from `/api/v1/chatrooms`.
- Core workbench has explicit loading, empty, error, retry, and not-ready states.
- P0 Setup Center and safe sidecar behavior are preserved.
- `detectWxPath.ts` no longer returns a hardcoded empty array, or if the Tauri detection implementation is intentionally deferred by product decision, the plan and UI must state that manual import remains the only supported path. For this P1 plan, the intended outcome is real detection.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `cargo test` pass.
- A real browser/manual smoke check is recorded in `progress.md`.

## 11. Implementation Order

Use this sequence to avoid masking contract bugs with UI rewrites:

1. Contract fixtures and adapter tests.
2. Raw DTOs and pure adapters.
3. Fetcher rewrites and fetcher tests.
4. Chat store/commander conversation model.
5. Conversation sidebar and transcript pane.
6. Search parameter and result navigation repair.
7. Stats/trend repair.
8. `detectWxPath` P0 leftover.
9. Workbench visual quality pass.
10. Automated verification and real browser/manual smoke.

## 12. Risk Register

- **Risk:** Backend message output lacks `is_self`.
  **Response:** Render neutral transcript direction unless a reliable self source is introduced.

- **Risk:** Large session/contact lists become slow without virtualization.
  **Response:** Remove expensive row animations in P1 and keep virtualization as an optional implementation detail if list size requires it.

- **Risk:** `/api/v1/dashboard/trend` `daily` shape differs from current frontend assumption.
  **Response:** Add a fixture from real response or source-derived sample before adapting it.

- **Risk:** WeChat data directory detection varies by Windows installation and OneDrive redirection.
  **Response:** Treat detection as suggestions and preserve manual import as the primary reliable path.

- **Risk:** Existing AI/graph components still have broken contracts.
  **Response:** Keep them lazy and secondary. P1 only prevents them from breaking the core workbench.

- **Risk:** New types conflict with existing `api-docs` names.
  **Response:** Prefer adding domain types in `data-clerk/types/chat.ts` and gradually re-exporting compatibility names.

## 13. Commit Strategy

Suggested commits:

1. `test: capture p1 chatlog api contract`
2. `feat: add chatlog raw adapters for workbench`
3. `fix: align core fetchers with chatlog api`
4. `refactor: model chat state as conversations`
5. `feat: rebuild core workbench conversation UI`
6. `fix: repair search and stats panels`
7. `feat: detect wechat data directories`
8. `test: verify p1 workbench flows`

Keep each commit small enough that a failing contract or UI regression can be isolated.

## 14. Handoff Notes For P2

P2 can begin only after P1 makes the core workbench usable. P2 should then handle broader visual redesign and deeper product surfaces:

- Unified design tokens and global component polish.
- Full responsive workbench refinement.
- AI semantic setup and QA contract repair.
- Graph module interaction redesign.
- Media/SNS/favorites/DB explorer planning.
- Advanced keyboard shortcuts and deep-linking.
- Bundle splitting, including the large graph chunk.

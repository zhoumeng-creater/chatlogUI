# Product Acceptance Issue Ledger

Created: 2026-06-08

Purpose: this file is the single issue ledger for product-acceptance findings. It consolidates the Codex audit findings and user-supplied review checkpoints so they do not remain scattered across `findings.md` and `progress.md`.

Status values:
- `confirmed`: current source/evidence supports the issue.
- `product-decision`: current behavior may be valid, but product definition is missing.
- `coverage-gap`: implementation may exist, but acceptance evidence is insufficient.
- `not-confirmed-current-source`: user checkpoint is important, but current source appears to already mitigate it; keep as regression guard.

## P0

### P0-01 Privacy: settings and setup surfaces expose local paths and wxid-like identifiers

Status: confirmed

Evidence:
- `src/l3-molecule/settings/DataSettings.tsx:24-29` renders `settings.wxDataPath` directly in a readonly input.
- `src/l3-molecule/setup/ConfigImportPanel.tsx:23-36` stores and displays the picked directory path as `已选择: {picked}`.
- `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:58-64` uses a normal setup placeholder shaped like `E:\WeChat Files\wxid_xxx`, normalizing visible local path and wxid-like examples in ordinary UI.
- `src-tauri/src/config_store.rs:102-106` returns errors containing `path.display()` for `chatlog.json` read/parse failures.
- Manual Playwright audit reproduced a synthetic visible leak with privacy mode enabled: `C:\Users\SyntheticUser\Documents\WeChat Files\wxid_sensitive_example` appeared in the settings input.

Why it matters:
This violates the local-private-data acceptance gate. Windows usernames, WeChat data folders, and `wxid_*` identifiers must not appear in ordinary UI or raw error copy outside an explicit, privacy-safe diagnostic flow.

Acceptance standard:
- Privacy mode masks or summarizes all local paths and wxid-like identifiers in visible text, inputs, accessibility names, diagnostics, screenshots, and logs.
- Setup import errors use product copy such as "无法读取 chatlog.json，请确认目录包含配置文件", without raw absolute paths.

Suggested fix direction:
Introduce a path summarizer/masker and apply it to settings, setup import, setup errors, diagnostics copy, and tests. Keep raw paths only in memory/system calls where needed.

### P0-02 External service address is not propagated to main chatlog APIs

Status: confirmed

Evidence:
- Setup supports external service readiness: `src/l2-coordinator/commander/useSetupCommander.ts:265-309` checks `baseUrl`, stores `profile.httpAddr`, and derives `port`.
- Main data fetchers still build URLs from fixed `SIDECAR_PORT`:
  - `src/l4-atom/network/fetchContacts.ts:14`, then sessions/contacts/chatrooms use `BASE_URL` at `:32`, `:52`, `:71`.
  - `src/l4-atom/network/fetchHistory.ts:10`, then history uses `BASE_URL` at `:43-44`.
  - `src/l4-atom/network/fetchSearch.ts:10`, then search uses `BASE_URL` at `:37-38`.
  - `src/l4-atom/network/endpointRunner.ts:9` and `:279` build API Runner URLs against fixed local sidecar base.
- `src/utils/constants.ts:1-10` hardcodes `SIDECAR_PORT = 5030` and `AI_BASE_URL`.

Why it matters:
The setup center says users can connect an external `chatlog_alpha` service, but the workbench continues to call local 5030. A non-5030 external service can pass setup health checks and then fail sessions, history, search, semantic QA, graph, media, SNS, and API Runner flows.

Acceptance standard:
- Establish one `serviceBaseUrl` source owned by L2/settings/setup state.
- Every chatlog API fetcher receives or resolves that base URL from the same source.
- E2E: external service on a non-5030 port can load sessions, history, search, and API Runner allowlist endpoints.

Suggested fix direction:
Do not read Zustand state directly from L4 atoms. Let L2 commanders resolve the active service base URL and pass it to L4 fetchers, or introduce an L4 URL builder configured by L2/system atoms.

### P0-03 Acceptance standards are restored, but stale required checklist paths remain

Status: restored 2026-06-08; governance test still recommended

Evidence:
- User-supplied project instructions require `docs/product-acceptance-standards.md` and `docs/ui-development-standards.md` before non-trivial review/development work.
- Recovery pass restored `docs/product-acceptance-standards.md`, `docs/ui-development-standards.md`, and the `AGENTS.md` entry-point references from the prior local standards content preserved in the current conversation and process notes.
- 2026-06-08 recheck confirms the two docs now exist and define the standing product/UI acceptance contract.
- Local `AGENTS.md` still references `specs/000-productization/spec.md`, `plan.md`, `tasks.md`, and `acceptance-checklist.md`, but `Test-Path specs\000-productization\...` returns false for those paths.
- Current `specs/` directories are `001-ready-desktop-app` and `002-advanced-capabilities`; the only acceptance checklist currently present is `specs/002-advanced-capabilities/acceptance-checklist.md`.
- `git log --all -- docs/product-acceptance-standards.md docs/ui-development-standards.md specs/000-productization/acceptance-checklist.md` returned no history for those paths.

Why it matters:
The acceptance standards are supposed to be the standing product contract. The two canonical standards now exist, but stale required checklist/spec references can still mislead future reviewers into looking for nonexistent productization evidence.

Acceptance standard:
- Canonical acceptance standards exist at the paths referenced by project instructions.
- If the canonical files are renamed, update `AGENTS.md`, release docs, and any skill/runbook references to the new paths.
- Add a lightweight governance test that fails when required acceptance-standard paths are absent.

### P0-04 External service mode is not a configurable, persistent, desktop-safe connection path

Status: confirmed

Evidence:
- `src/l2-coordinator/commander/useSetupCommander.ts:95-115` sets external mode to a hardcoded `127.0.0.1:5030` profile with no visible URL entry step.
- `src/l3-molecule/setup/ServiceControlPanel.tsx:66-74` renders only a `连接外部服务` button; it calls `onConnectExternalService(externalBaseUrl)` and provides no input for a non-5030 service URL.
- `src/l1-entry/pages/SetupCenterView.tsx:70` passes `setup.profile?.httpAddr ?? "http://127.0.0.1:5030"` as the external base URL.
- `src/l2-coordinator/data-clerk/stores/useSetupStore.ts:47-62` is a plain in-memory Zustand store; external `profile.httpAddr` is not persisted across app restarts.
- `src-tauri/src/config_store.rs:124-141` summarizes saved manual configs as `mode: "managed"`; it does not persist an external-service mode.
- `src/l2-coordinator/commander/useSetupCommander.ts:26-33` requires `dataDir`, `hasDataKey`, platform, version, and fullVersion for `configValid`, while `connectExternalService()` creates an external profile with these fields empty at `:292-306`; `syncStep()` can therefore move a successfully connected external service back toward config instead of expressing external readiness cleanly.
- `src-tauri/tauri.conf.json:26` allows `connect-src`, `img-src`, and `media-src` only for `127.0.0.1:5030` / `localhost:5030` local media/API traffic; a packaged app would block a configured non-5030 chatlog API/media origin unless CSP is updated deliberately.
- `src/l3-molecule/common/StatusBar.tsx:5` and `:99-101`, `src/l2-coordinator/commander/diagnosticsManifest.ts:40`, and `src/utils/constants.ts:1-10` still present 5030 as the app base even when setup state may hold another `profile.httpAddr`.

Why it matters:
This is separate from P0-02's API propagation bug. Even before main fetchers are fixed, the product does not provide a coherent external-service setup path: the user cannot choose a non-5030 URL from the external-service panel, the choice is not durable, desktop CSP may block it, and status/diagnostics can report the wrong backend.

Acceptance standard:
- External service mode has an explicit, validated base URL field.
- The selected service base URL is persisted as part of app setup/settings state, with clear mode semantics.
- Setup state-machine rules treat a healthy external service plus DB readiness as a valid external profile without requiring local data-dir/data-key fields.
- Tauri CSP is updated narrowly and intentionally for allowed local external origins, or product copy limits external mode to 5030.
- Status bar and diagnostics report the active service base URL or a privacy-safe summary of it.

### P0-05 Borderless desktop shell has no minimize, maximize/restore, or close controls

Status: confirmed

Evidence:
- `src-tauri/tauri.conf.json:20-22` sets the main window to `decorations: false` and `transparent: true`, so the native system titlebar/chrome is removed.
- `src-tauri/capabilities/default.json:7-9` already grants `core:window:allow-close`, `core:window:allow-minimize`, and `core:window:allow-toggle-maximize`, so the missing behavior is not a permission problem.
- `src/l3-molecule/common/AppTitleBar.tsx:14-20` renders a custom draggable titlebar with brand, center title, status/actions, but no minimize, maximize/restore, or close buttons.
- `src/l3-molecule/common/GlobalCommandCluster.tsx:19-36` only exposes privacy mode, developer console, and settings.
- `src/l1-entry/pages/SetupCenterView.tsx:12-132` renders `setup-shell` directly and does not use `AppLayout`, so the first-run setup route lacks even the current visible app titlebar.
- `rg` found no `@tauri-apps/api/window`, `getCurrentWindow`, `minimize`, `toggleMaximize`, or close-window integration in `src/`.
- `docs/总体开发规划.md` already records the intended direction: a custom titlebar should provide minimize/maximize/close controls instead of fake platform lights.

Why it matters:
This is a desktop-shell baseline failure. Because native decorations are disabled, users cannot discover normal window operations from the app UI. The first-run page is affected as well, which makes the missing controls visible before the user has successfully configured the product.

Acceptance standard:
- Every route, including `/`, `/workbench`, `/dashboard`, and `/settings`, is inside a consistent desktop app shell with visible window controls.
- Windows release uses Windows-understandable minimize, maximize/restore, and close controls; macOS/Linux variants must not fake platform-specific controls if not implemented.
- Controls call the Tauri window APIs through an L4 system atom and L2/L3 shell contract, not ad hoc window calls in route pages.
- The titlebar keeps a reliable drag region while all controls are marked no-drag and remain keyboard/focus accessible.
- Close behavior remains compatible with sidecar lifecycle cleanup and does not bypass graceful shutdown expectations.
- Browser/E2E or Tauri smoke evidence verifies the controls are visible and invoke the correct actions, with route coverage for setup and workbench.

Suggested fix direction:
Add an L4 system atom for current-window actions, extend the app shell view/actions with `minimizeWindow`, `toggleMaximizeWindow`, and `closeWindow`, render a `WindowControlCluster` in `AppTitleBar`, and wrap `SetupCenterView` in the same shell or an equivalent setup shell that includes the controls.

## P1

### P1-01 Workbench has duplicated primary module navigation

Status: confirmed

Evidence:
- `src/l1-entry/pages/WorkbenchView.tsx:103-110` passes `WorkbenchRail` and `workbench.railItems` into `WorkbenchFrame`.
- `src/l1-entry/pages/WorkbenchView.tsx:119-168` manually renders top toolbar module buttons for `统计`, `媒体`, `朋友圈`, `开发`, `AI`, and `图谱`; each calls `workbench.selectModule(...)`.
- `src/l2-coordinator/commander/workbenchViewModel.ts:43-51` defines the same module set for the rail.

Why it matters:
Users must guess whether the left rail or top toolbar is the primary module navigation. Same-level navigation should not appear twice with different placement and visual weight.

Acceptance standard:
- One primary module navigation for one hierarchy level.
- Keep rail as module navigation; top toolbar contains current-context title and actions only.

### P1-02 Workbench toolbar is overloaded and behaves like a scrollable page section

Status: confirmed

Evidence:
- `src/l1-entry/pages/WorkbenchView.tsx:115-206` puts conversation title, module buttons, global search, filter bar, and search results into the same toolbar prop.
- `src/l3-molecule/workbench/WorkbenchFrame.tsx:81-85` renders that toolbar above the main workspace.
- `src/styles/layout.css:490-497` gives `.workbench-frame__toolbar` `max-height: 260px` and `overflow: auto`.
- `src/styles/workbench-content.css:350-357` gives search results a separate scrollable panel inside the toolbar.

Why it matters:
The main frame already has rail, conversation list, main workspace, and inspector. A top toolbar that can become a 260px scrollable region destroys hierarchy and makes the top area feel like half a page.

Acceptance standard:
- Layer 1: lightweight workspace title/action bar.
- Layer 2: one-line search entry.
- Layer 3: search results as a dismissible panel/drawer or main-content panel, not permanently inside the toolbar.

### P1-03 Developer tools are exposed by default to ordinary users

Status: confirmed

Evidence:
- `src/l2-coordinator/commander/workbenchViewModel.ts:48` includes `{ module: "developer", label: "开发" }` in the default rail.
- `src/l1-entry/pages/WorkbenchView.tsx:148-154` duplicates the developer module in the top toolbar.
- `src/l3-molecule/common/GlobalCommandCluster.tsx:26-31` always renders a global `开发者控制台` icon button.
- `src/l3-molecule/developer/DeveloperToolsModule.tsx:153-184` exposes DB Explorer, API Runner, Hook, and MCP tools.

Why it matters:
Ordinary users can interpret "开发" as required, dangerous, or a sign the app is unfinished. Developer/diagnostic features should be progressive-disclosure tools, not primary navigation.

Acceptance standard:
- Hide developer tools by default.
- Show only when developer mode is enabled in settings, an error/diagnostic flow offers it, a launch flag/env var enables it, or the build channel is dev/beta.

### P1-04 History pagination `hasMore` can be wrong

Status: confirmed

Evidence:
- `src/l2-coordinator/commander/useChatCommander.ts:8-10` computes `hasMore` from `result.count || result.messages.length` and `result.limit`.
- `src/l2-coordinator/commander/useChatCommander.ts:60-65` and `:87` use that helper even though the adapted history result includes `totalCount`.

Why it matters:
If the backend returns exactly one full page but `totalCount` equals the loaded count, the UI may offer a useless "load more". If `count` is not the page count expected by the helper, pagination can also stop too early or continue too long.

Acceptance standard:
- `hasMore = offset + messages.length < totalCount`.
- Unit tests cover total/message combinations: 0, 50, 51, 100, including exact-page end and partial-page end.

### P1-05 Conversation list product definition is unclear: recent sessions vs all contacts/chatrooms

Status: product-decision

Evidence:
- `src/l4-atom/network/fetchContacts.ts:84-94` fetches sessions, contacts, and chatrooms together.
- `src/l4-atom/network/chatlogAdapters.ts:231-273` creates the final list only from `sessions.sessions`; contacts/chatrooms only enrich matching session rows.
- `src/l2-coordinator/commander/useChatCommander.ts:31-41` stores contacts/chatrooms maps but sets the displayed conversations from `conversations`.

Why it matters:
If the product promise is "recent conversations", current behavior is likely correct. If the product promise is "all contacts/groups are browseable", contacts/chatrooms without recent sessions are invisible.

Acceptance standard:
- Explicitly define the list as either "最近会话" or "全部联系人/群聊".
- If "全部", add contact/group tabs or a merge strategy for non-session contacts/chatrooms, with empty and no-history states.

### P1-06 Semantic QA SSE lacks stream idle timeout after headers arrive

Status: confirmed

Evidence:
- `src/l4-atom/network/streamQA.ts:31` starts a single `SSE_TIMEOUT_MS` timer before `fetch`.
- `src/l4-atom/network/streamQA.ts:65-67` clears that timer as soon as a response is received.
- `src/l4-atom/network/streamQA.ts:80-92` then awaits `reader.read()` in a loop without an idle timer.
- `src/l4-atom/network/semanticStreamParser.ts:54-62` recognizes heartbeat-like events only as `unknown`; `streamQA.ts` does not use heartbeat to reset an idle watchdog.

Why it matters:
If the server sends headers and then stalls, the UI can remain in connecting/streaming indefinitely without retry or clear recovery copy.

Acceptance standard:
- Add an idle timeout that resets on data chunk or heartbeat.
- Heartbeats are parsed as liveness, not displayed content.
- E2E/mock scenario: stream sends headers then stalls; UI transitions to retryable failure with safe copy.

### P1-07 AI QA composer is mostly fixed, but clear-history UX still needs acceptance

Status: coverage-gap

Evidence:
- Current source uses multiline input: `src/l3-molecule/semantic/QAInput.tsx:231-245` renders `textarea`, rows=3.
- Enter sends and Shift+Enter preserves newline: `src/l3-molecule/semantic/QAInput.tsx:237-242`.
- Answer copy exists: `src/l3-molecule/semantic/QAMessage.tsx:118-129`.
- Store exposes clear: `src/l2-coordinator/data-clerk/stores/useAiStore.ts:211-212` and commander returns it at `src/l2-coordinator/commander/useAiCommander.ts:660-661`.
- No visible QAPanel/AiPanel control was found that calls `clearQAMessages`.

Why it matters:
The original "single-line input" concern is not confirmed in current source, but the expected "清空" affordance appears not to be surfaced despite store support.

Acceptance standard:
- QA composer remains multiline.
- Enter/Shift+Enter behavior is covered by E2E or component test.
- Visible "清空问答" action exists with sensible confirmation if it discards substantial content.

### P1-08 Semantic index destructive actions currently have confirmation; keep as regression guard

Status: not-confirmed-current-source

Evidence:
- `src/l2-coordinator/commander/semanticSetupViewModel.ts:377-394` marks `rebuildFromScratch` and `clearIndex` as `requiresConfirmation: true` with confirmation title/body.
- `src/l3-molecule/semantic/SemanticIndexCenter.tsx:23-28` opens confirmation for required actions.
- `src/l3-molecule/semantic/SemanticIndexCenter.tsx:80-104` renders a confirmation dialog.
- `e2e/specs/advanced.spec.ts:72-73` checks the "确认从头重建索引？" dialog.

Why it matters:
This checkpoint is valid for future changes, but current source appears to satisfy it for destructive rebuild/delete actions.

Acceptance standard:
- High-cost/destructive index actions always require confirmation.
- Confirmation copy states impact scope and reversibility.
- Tests cover both rebuild-from-scratch and clear-index confirmation.

### P1-09 `useAiStore.setError(null)` phase pollution appears fixed; keep as regression guard

Status: not-confirmed-current-source

Evidence:
- `src/l2-coordinator/data-clerk/stores/useAiStore.ts:260-274` restores `lastStablePhase` or keeps the current phase when clearing an error.
- `src/l2-coordinator/data-clerk/stores/useAiStore.test.ts:8-26` covers clearing errors without writing an invalid phase and restoring the previous stable phase.

Why it matters:
The old implementation shape `set({ error, phase: error ? "error" : undefined })` would have been a real state-pollution bug. Current code and tests already address it.

Acceptance standard:
- Keep these tests.
- Any future store refactor must not set phase to `undefined`.

### P1-10 Graph and updater flows can expose raw technical error text

Status: confirmed

Evidence:
- `src/l4-atom/network/httpClient.ts:107` throws `ChatlogHttpError("HTTP ${response.status}", ...)`.
- `src/l2-coordinator/commander/useGraphCommander.ts:55-56`, `:66-67`, `:98-99`, `:128-129`, `:148-149`, `:162-163`, `:185-186`, `:208-209`, and `:231-232` store raw `error.message`.
- `src/l2-coordinator/diplomat/updateErrorTranslator.ts` exists, but `src/l2-coordinator/commander/useUpdateCommander.ts:129-130`, `:187-188`, and `:228-229` store raw update errors.

Why it matters:
The acceptance standards explicitly forbid ordinary users seeing raw `HTTP 500`, `undefined`, or internal codes without a plain-language reason and next step.

Acceptance standard:
- L2 translates Graph and Update errors before UI storage.
- UI copy includes cause category and next step, not raw transport codes.
- Tests cover HTTP 500, timeout, unavailable sidecar, and malformed response cases.

### P1-11 `/settings` AI model settings are disconnected from the semantic AI configuration actually used by the workbench

Status: confirmed

Evidence:
- `src/l3-molecule/settings/AIModelSettings.tsx:25-64` lets users edit `aiProvider`, `aiEndpoint`, and `aiModel` in the settings page.
- `src/l2-coordinator/api-docs/settings.ts:6-18` stores those fields in local `SettingsState`.
- `src/l2-coordinator/commander/useSettingsCommander.ts:29-40` saves those settings to browser local storage.
- `src/l2-coordinator/commander/useAiCommander.ts:80` reads `useSettingsStore` only for `privacyOn`; semantic config is loaded from backend APIs at `:115-123` and saved through `setSemanticConfig()` at `:145-150`.
- `src/l2-coordinator/commander/semanticSetupViewModel.ts:136-180` defines separate semantic defaults and backend-shaped config fields for providers, endpoints, models, credentials, retrieval, and features.
- `src/l3-molecule/semantic/AiPanel.tsx:103-147` exposes a separate in-workbench `AI 设置` path backed by semantic setup, not `/settings` local AI fields.

Why it matters:
A user can change `/settings -> AI 模型` and reasonably expect AI search/QA/indexing to use that model, but current code uses the semantic backend config instead. This creates two AI configuration surfaces with different persistence and effect, and one of them may be a no-op for the actual AI workflow.

Acceptance standard:
- Either remove/rename `/settings` AI model fields as non-operational preferences, or wire them into the semantic config flow intentionally.
- Only one user-facing place should claim to configure the AI provider/model for semantic search and QA, unless the distinction is enforced by copy and code.
- E2E/component coverage proves changing the accepted AI configuration surface affects the semantic setup payload or is clearly documented as informational only.

### P1-12 Global search can be overwritten by stale in-flight responses

Status: confirmed

Evidence:
- `src/l2-coordinator/commander/useSearchCommander.ts:27-50` starts `fetchSearch()` and unconditionally writes `setResults(...)` when the promise resolves.
- `src/l2-coordinator/commander/useSearchCommander.ts:62-92` cancels only the pending debounced function before execute/filter/scope changes; it does not abort an already-started request and does not record a request id.
- `src/l2-coordinator/commander/useSearchCommander.ts:103-129` merges "load more" results into whatever `state.results` exists when the old request resolves.
- `src/l4-atom/network/fetchSearch.ts:23-46` does not expose a caller `AbortSignal` or request identity even though `requestJson()` supports `signal`.

Why it matters:
The standards require duplicate searches not to disorder results. A slower old query can overwrite a newer query or merge into the wrong result set, especially when the user changes filter/scope quickly.

Acceptance standard:
- Each search execution has a request id and/or `AbortController`.
- Superseded first-page and load-more responses are ignored.
- Tests cover slow old response after fast new response, filter change while old request is in flight, and load-more returning after a new query.

### P1-13 Search result click opens the conversation but does not jump to the matched message

Status: confirmed

Evidence:
- `src/l3-molecule/search/SearchResults.tsx:42-48` handles result clicks by setting the active result id and calling `onSelectAndLoad(chat, chat)`.
- `src/l1-entry/pages/WorkbenchView.tsx:198-200` wires that callback directly to `workbench.chat.selectAndLoad(...)`.
- `src/l2-coordinator/commander/useChatCommander.ts:92-99` then selects the conversation and loads history with `offset: 0`; it does not pass the search result timestamp/local id or request a page around the hit.
- `rg` found no message-list `scrollIntoView`, target-message highlight, or search-result anchor flow outside the search result pane itself.

Why it matters:
From the user perspective, clicking a search result should reveal the matched message. Current behavior may load only the newest page of the conversation, so an older hit can disappear after click.

Acceptance standard:
- Search result open loads the page/window containing the matched message, scrolls to it, and highlights it long enough for orientation.
- If exact anchor loading is not supported by the backend, the UI must state that it opened the conversation but could not locate the message.
- Tests cover a search hit outside the first history page.

### P1-14 Graph load cancellation is state-only and stale graph responses can still win

Status: confirmed

Evidence:
- `src/l2-coordinator/commander/useGraphCommander.ts:82-103` runs `fetchGraphStatus`, `fetchGraphQuery`, `fetchGraphVisualize`, and `fetchGraphTimeline` in `Promise.all`, then writes all graph store fields when the promise resolves.
- `src/l2-coordinator/commander/useGraphCommander.ts:111-113` implements `cancelGraphLoad()` as `setState({ loading: false, loadStatus: "cancelled" })`; it does not abort the HTTP requests.
- `src/l2-coordinator/commander/useWorkbenchCommander.ts:187-189` and `:279-281` call `graph.cancelGraphLoad()` when switching/closing, but the old in-flight graph promise can still update the store afterwards.
- Graph fetchers such as `src/l4-atom/network/fetchGraphVisualize.ts:20-41` and `src/l4-atom/network/fetchGraphQuery.ts:24-45` do not accept a caller `AbortSignal`.

Why it matters:
The graph standard requires cancel/stop and stale-response handling. A cancelled or superseded graph request can still replace newer filters, change the visible graph after leaving the module, or clear the cancelled state.

Acceptance standard:
- Graph load summary/visualize/timeline requests are abortable or request-id guarded.
- Cancelling or switching modules prevents stale responses from mutating the graph store.
- Tests cover cancel before resolve and two overlapping filter loads resolving out of order.

### P1-15 Manual advanced setup config lacks per-field guidance and validation feedback

Status: confirmed

Evidence:
- The setup acceptance standard requires manual configuration fields to have descriptions, examples, validation, and errors before save.
- `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:56-141` renders fields for data dir, work dir, platform, version, full version, data key, image key, HTTP address, and media cache, but most fields have no hint or example beyond a placeholder.
- `src/l2-coordinator/commander/useSetupCommander.ts:141-145` joins all validation errors into one general setup error instead of mapping them to individual fields.
- `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:163-167` renders the aggregate error below the form, not next to the invalid control.

Why it matters:
Manual setup is a high-friction, high-risk path. Users need to understand required fields before save and recover from invalid entries without reading a concatenated technical error string.

Acceptance standard:
- Required manual config fields include concrete examples or safe summaries.
- Validation maps to field-level errors and prevents save before dispatching invalid config.
- Data key/image key examples avoid exposing real-looking secret/path markers.

### P1-16 Media extension tabs expose data but do not complete required media/member/unread tasks

Status: confirmed

Evidence:
- `src/l3-molecule/media/MediaLibrary.tsx:150-160` exposes attachments, favorites, members, unread, and incremental message tabs.
- `src/l3-molecule/media/MediaLibrary.tsx:242-260` renders favorites as static rows; favorite attachments are not previewable/openable from the favorites tab.
- `src/l3-molecule/media/MediaLibrary.tsx:264-283` renders all members as a static list; there is no member search or pagination.
- `src/l3-molecule/media/MediaLibrary.tsx:285-327` renders unread and new-message rows as static `<div>` elements; they do not jump to the corresponding session/message.
- `src/l2-coordinator/commander/useMediaCommander.ts:32-63` loads each family with fixed `limit: 50` and does not expose pagination controls for favorites, members, or new messages.

Why it matters:
The module gives users counts and previews but leaves several standard tasks unfinished: inspect favorite media, search large groups, page member lists, and use unread/new-message items to navigate back to chat.

Acceptance standard:
- Favorites with attachments can be previewed/opened with the same safety/privacy behavior as history attachments.
- Group members support search and/or pagination for large groups.
- Unread and new-message rows can open the related conversation and, when possible, the relevant message area.

### P1-17 SNS article/link handling has no safe external-open flow

Status: confirmed

Evidence:
- `src/l4-atom/network/snsAdapters.ts:222-229` detects article/finder external URLs only as `hasExternalUrl`; it discards the actual URL for UI safety.
- `src/l3-molecule/sns/SnsDetailInspector.tsx:61-75` shows an article/finder/location fact row, but provides no external-open action or confirmation.
- `src/l3-molecule/sns/SnsTimeline.tsx:102-121` renders article/finder chips as passive spans.

Why it matters:
The privacy-safe adapter avoids leaking remote URLs, but the product task remains incomplete. A user can see that a post is an article or external item but cannot intentionally open it with a safe prompt.

Acceptance standard:
- If external SNS links are supported, expose a deliberate "open externally" action with a confirmation/prompt that explains it leaves the local app.
- If they are not supported, remove or rename the affordance so `hasExternalUrl` is not presented as an actionable article/link task.
- Tests cover safe prompt copy and privacy mode behavior.

## P2

### P2-01 Shared control target sizes do not yet match the new UI development standard

Status: confirmed

Evidence:
- `docs/ui-development-standards.md` defines project defaults above WCAG minimum: form buttons at least 40px high, toolbar/icon buttons at least 32px with 36px preferred, modal/drawer confirm controls at least 40px, and segmented controls at least 32px high.
- Toolbar module buttons use `Button size="sm"` at `src/l1-entry/pages/WorkbenchView.tsx:127-168`.
- `.ui-button--sm` is `min-height: 28px`, `padding: 0 10px`, `font-size: 12px` at `src/styles/layout.css:188-192`.
- `.ui-button--md` is `min-height: 34px` at `src/styles/layout.css:194-198`, below the 40px form-button standard and below the old "main action" 36px target.
- `.ui-icon-button--sm` is 28x28 at `src/styles/layout.css:232-235`.
- `.ui-segmented__item` is `min-height: 30px` at `src/styles/layout.css:382-388`, below the 32px segmented-control standard.
- `src/l3-molecule/semantic/SemanticIndexCenter.tsx:90-99` and `src/l3-molecule/semantic/SemanticSetupCenter.tsx:252-263` use `size="sm"` buttons inside modal confirmations, below the modal/drawer confirmation target.
- Common controls are raised to 40px only inside the narrow/mobile rule at `src/styles/layout.css:3439-3457`.

Why it matters:
WCAG 2.2 target-size minimum is 24x24 CSS pixels, but the project standard intentionally sets larger defaults because this app is dense and often used for repeated local-data workflows. Current atoms let many ordinary desktop controls remain below the documented target.

Reference:
https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

Acceptance standard:
- Update atom defaults or size semantics so `Button`, `IconButton`, and `SegmentedControl` meet `docs/ui-development-standards.md`.
- Modal/drawer confirmation controls use at least 40px targets.
- Add a lightweight regression check for key atom target sizes.

### P2-02 Route/page purpose boundaries are implicit

Status: confirmed

Evidence:
- `src/l1-entry/routes/index.tsx:10-13` maps `/` to setup center, `/workbench` and `/dashboard` to the same workbench shell, and `/settings` to settings.
- `src/l1-entry/pages/SetupCenterView.tsx:23-35` labels `/` as `设置中心` and handles service mode/config/readiness/diagnostics.
- `src/l1-entry/pages/SettingsView.tsx:20-58` handles AI, appearance, data, and about preferences.

Why it matters:
The pages can coexist, but the code does not strongly express that `/` is first-run/service setup and `/settings` is preferences. `/dashboard` as a workbench alias also needs documented intent.

Acceptance standard:
- `/` is named and guarded as first-run/service setup center.
- `/settings` is named as preferences.
- `/dashboard` is either removed or documented as a compatibility redirect/alias.

### P2-03 Field hint/error text is not automatically associated with controls

Status: confirmed

Evidence:
- `src/l4-atom/ui/Field.tsx:12-30` renders `hint`/`error` ids but does not inject `aria-describedby`, `aria-invalid`, or `aria-errormessage` into the child input/select.
- `src/l4-atom/ui/formControl.ts:26-28` can generate description ids, but Field does not apply them to children.

Why it matters:
Screen readers may not announce hints/errors when focus lands on the input, especially when errors are dynamically updated.

Acceptance standard:
- Field supports a render prop or safe clone-child path that injects `aria-describedby`.
- Error state also applies `aria-invalid=true` and/or `aria-errormessage`.
- Tests cover hint-only, error-only, both, and missing-id behavior.

### P2-04 Visual regression coverage is still narrow

Status: coverage-gap

Evidence:
- `e2e/specs/visual.spec.ts:11-56` covers desktop workbench, developer Hook, semantic index/setup/QA evidence, graph workbench, and graph visualization.
- `e2e/specs/visual.spec.ts:58-84` covers narrow privacy workbench, semantic setup, and graph workbench.

Why it matters:
Coverage is better than the older four-screenshot baseline, but important product states are still not represented visually: setup center, `/settings`, AI streaming state, AI empty/error, media preview, SNS detail, dark mode, and route-specific empty/error states.

Acceptance standard:
- Add visual snapshots for setup center, settings, AI setup/index/streaming/empty/error, media preview, SNS detail, dark mode, and representative narrow states.
- Keep snapshots synthetic and privacy-safe.

### P2-05 L3 inline style debt is tracked but not eliminated

Status: confirmed

Evidence:
- `scripts/ui-governance.test.mjs:20-29` lists known L3 style debt.
- `scripts/ui-governance.test.mjs:55-78` fails if new untracked inline style/manual class debt appears, but existing debt remains allowed.
- Known offenders include `ConversationRow`, `MediaPreview`, `MessageList`, `DashboardOverview`, `TrendChart`, and `WorkbenchFrame`.

Why it matters:
The test prevents debt growth but does not remove existing token/class migration debt. Repeated UI work can normalize exceptions unless there is a burn-down expectation.

Acceptance standard:
- No new L3 inline style debt on UI changes.
- Existing tracked debt is migrated to token/class styles incrementally.
- The allowlist shrinks over time.

### P2-06 Diagnostic export success copy exposes full temp path

Status: confirmed

Evidence:
- `src/l3-molecule/diagnostics/DiagnosticsPanel.tsx:51` sets success message to `已导出到 ${path}`.
- `src/l3-molecule/common/DevConsole.tsx:101` sets success message to `诊断已导出到: ${path}`.

Why it matters:
This is an explicit diagnostic flow, so it is lower severity than settings path leaks, but visible full temp paths can still expose OS usernames.

Acceptance standard:
- Display filename or "已导出到临时诊断目录" instead of absolute path.
- Keep raw path only for the system-level file operation.

### P2-07 Updater manifest release evidence is missing

Status: coverage-gap

Evidence:
- `src-tauri/tauri.conf.json:32` has `createUpdaterArtifacts: false`.
- `pnpm release:check:updater` failed in the 2026-06-07 audit because no `latest.json` was found under `src-tauri/target`.
- 2026-06-08 recheck: `pnpm release:check:updater` still failed with `no latest.json was found under src-tauri/target`.

Why it matters:
The packaged app can build while release evidence remains incomplete. If updater support is part of release readiness, `latest.json` must be generated and verified.

Acceptance standard:
- Either document updater-disabled as the release policy, or enable updater artifacts for release builds.
- `pnpm release:check:updater` passes for required platforms before release.

### P2-08 Semantic confirmation dialogs lack modal focus management and keyboard dismissal coverage

Status: confirmed

Evidence:
- `src/l3-molecule/semantic/SemanticIndexCenter.tsx:80-103` renders destructive-action confirmation with `role="dialog"` and `aria-modal="true"`, but the component only uses `useState`; there is no previous-focus capture, initial focus, Escape handler, or focus restoration.
- `src/l3-molecule/semantic/SemanticSetupCenter.tsx:242-265` renders high-concurrency save confirmation with the same dialog attributes and the same missing focus lifecycle.
- By contrast, `src/l3-molecule/common/UpdateNotificationView.tsx:50-68` captures/restores focus and `:86-90` handles Escape; `src/l3-molecule/semantic/SemanticQAEvidenceDrawer.tsx:45-51` handles Escape and `:64-70` autofocuses the close button.
- `e2e/specs/a11y.spec.ts` covers QA evidence drawers and narrow inspector drawers, but does not cover semantic confirmation dialogs.

Why it matters:
The dialogs are attached to high-cost/destructive semantic actions. A modal that does not move focus, support Escape, or restore focus may satisfy visual confirmation while still failing keyboard and screen-reader workflows.

Acceptance standard:
- Confirmation dialogs set initial focus to a safe action, trap or contain focus while open, support Escape when cancellation is allowed, and restore focus to the invoking button after close.
- Add a keyboard/a11y test for semantic index destructive confirmation and high-concurrency save confirmation.

### P2-09 Redaction tests use realistic-looking private markers instead of consistently synthetic markers

Status: coverage-gap

Evidence:
- The project test data policy says tests may include secret-like strings only for redaction and those values should be clearly named as synthetic redaction cases: `specs/001-ready-desktop-app/test-data-policy.md:9-15`.
- A policy scan found redaction-test strings such as:
  - `src/utils/maskSecrets.test.ts:28` with `C:\Users\Alice\Documents\WeChat Files\wxid_private`.
  - `src/l4-atom/network/diagnosticEvents.test.ts:54` with `C:\Users\Alice\WeChat Files\wxid_private`.
  - `src/l2-coordinator/diplomat/errorTranslator.test.ts:12` with `wxid_real` and `sk-real-secret`.
  - `src/l4-atom/network/semanticAdapters.test.ts:124`, `:234`, and `:444` with `C:\Users\Alice\WeChat Files\wxid_real`.
- These appear to be intentional redaction tests, not real data, but they do not consistently carry explicit `Synthetic` naming.

Why it matters:
Using `Alice`, `wxid_real`, or `sk-real-secret` in test fixtures increases audit ambiguity and can normalize realistic private markers in committed files. This weakens the "synthetic and clearly labeled" test-data policy even when no real data is present.

Acceptance standard:
- Rename redaction markers to explicit synthetic forms such as `C:\Users\Synthetic\WeChat Files\wxid_synthetic_redaction_case` and `sk-synthetic-redaction-secret`.
- Keep tests proving redaction works, but make fixture intent unambiguous to humans and automated scans.

### P2-10 Release evidence cannot currently certify the 2026-06-08 working tree as release-ready

Status: coverage-gap

Evidence:
- `docs/release/ready-desktop-app.md:32-46` records many pass results from 2026-06-01 through 2026-06-03, not the current 2026-06-08 audit date.
- The release dashboard explicitly lists P5-C updater signing, P5-C platform smoke, P5-D privacy audit, and Windows x64 release candidate as `release-blocked` at `docs/release/ready-desktop-app.md:59-63`.
- `specs/002-advanced-capabilities/acceptance-checklist.md:31`, `:41-43`, `:47`, and `:56-57` leave release-candidate privacy audit, updater manifest evidence, refreshed packaged smoke, release evidence bundle, and owner signoff unchecked.
- 2026-06-08 recheck: `pnpm fixtures:check` passed for 71 route entries, architecture/UI governance tests passed, and `pnpm release:check:sidecar:release` passed for Windows x64; however `pnpm release:check:updater` still failed because no `latest.json` exists.

Why it matters:
Historical source/UI evidence is useful, but it does not prove the current working tree or a concrete release candidate is acceptable. The acceptance standard requires explicit evidence for release readiness, not a buildable app plus old smoke notes.

Acceptance standard:
- For any release-ready claim, record current-date `pnpm verify`, Rust tests if applicable, package build, updater decision/evidence, packaged smoke, privacy audit, installer/update artifact checksums, sidecar provenance, and owner signoff.
- Keep the dashboard status blocked until those current candidate artifacts exist.

### P2-11 Media preview sheet uses dialog semantics without dialog keyboard/focus behavior

Status: confirmed

Evidence:
- `src/l3-molecule/media/MediaPreviewSheet.tsx:24-34` renders `role="dialog"` with `aria-modal="false"` when a media attachment is selected.
- The component has no focus capture, initial focus, Escape handler, focus restoration, or close-button focus management.
- `src/l3-molecule/media/MediaPreviewSheet.tsx:29` uses `Button size="sm"` for the close control, below the new modal/drawer close target.
- `src/l3-molecule/media/MediaPreviewSheet.tsx:64-66` opens file-like attachments through a raw `<a target="_blank">` without the same safe-open prompt/confirmation pattern expected for local/private resources.

Why it matters:
The preview behaves like an overlay but does not meet modal/drawer interaction standards. Keyboard users can lose context, and file/open-original flows need explicit privacy-safe intent.

Acceptance standard:
- Media preview either becomes a real drawer/dialog with focus lifecycle, Escape close, and 40px close target, or is reclassified as a non-dialog inline panel.
- File/open-original actions use a deliberate control with safe copy and privacy-safe URL handling.

### P2-12 Current automated a11y gates do not enforce target size or field-description linkage

Status: coverage-gap

Evidence:
- `e2e/specs/a11y.spec.ts:9-24` runs axe serious/critical checks on representative routes.
- `e2e/specs/a11y.spec.ts:26-53` checks keyboard reachability for selected workbench flows.
- `e2e/specs/a11y.spec.ts:55-103` checks privacy text scanning and drawer focus behavior.
- No E2E or unit test currently asserts `Button`/`IconButton`/`SegmentedControl` target size against `docs/ui-development-standards.md`.
- No test currently asserts `Field` hint/error ids are actually connected to child inputs via `aria-describedby` or `aria-errormessage`.

Why it matters:
Passing axe is valuable, but it does not prove the project-specific UI standard. The new standards explicitly define target sizing and field association as development-time requirements.

Acceptance standard:
- Add atom-level or browser-level checks for target dimensions of shared controls.
- Add Field tests for hint-only, error-only, and combined description/error association.
- Keep axe and keyboard tests, but do not treat them as sufficient evidence for the full UI standard.

### P2-13 Tooltip affordance coverage is inconsistent and not accessibility/test gated

Status: confirmed

Evidence:
- `docs/product-acceptance-standards.md` and `docs/ui-development-standards.md` require icon-only controls to have accessible names and tooltips when their meaning is not obvious.
- `src/l4-atom/ui/Tooltip.tsx:8-14` renders a visual hover/focus bubble, but it does not generate an id, does not connect the trigger through `aria-describedby`, and has no keyboard/screen-reader contract beyond the visual child remaining focusable.
- `src/styles/layout.css:252-275` shows the tooltip immediately on `:hover`/`:focus-within`; there is no intentional delay like the user-requested "hover for a short time, then explain" behavior.
- Only six `IconButton` call sites currently pass `tooltip=`: `GlobalCommandCluster`, `WorkbenchFrame`, `AiPanel`, and `SemanticQAEvidenceDrawer`.
- Compact controls still use native `title` or hand-written buttons instead of the shared tooltip path, for example `WorkbenchRail.tsx:76-82`, `GraphControlBar.tsx:151-171`, and `GraphTimeline.tsx:52-55`.
- Existing E2E/a11y tests exercise some keyboard reachability, but `rg` found no test that asserts tooltip visibility delay, tooltip accessible description linkage, or tooltip privacy-scan coverage.

Why it matters:
The app already has many dense icon and compact controls. If explanations are inconsistent, first-time users must remember icon meanings, infer disabled/pressed state from styling, or rely on browser-native `title` behavior that differs by platform and is not consistently accessible.

Acceptance standard:
- The shared `Tooltip` atom supports delayed hover/focus display, stable id generation, `aria-describedby` linkage where appropriate, placement that avoids clipping in titlebars/drawers, and privacy-safe text.
- `IconButton` has a clear default policy: obvious icons may use only accessible label, but ambiguous icon-only controls require explicit tooltip text.
- Compact non-IconButton controls that behave like icon buttons either migrate to `IconButton`/`Tooltip` or receive an equivalent component-level explanation contract.
- Tests cover tooltip display timing, focus visibility, accessible description linkage, and privacy scanning of tooltip/title text.

Suggested fix direction:
Upgrade the L4 `Tooltip` primitive first, then migrate high-density controls in the titlebar, rail, graph controls, media preview, diagnostics/dev console, and semantic drawers to the same tooltip policy.

### P2-14 Disabled controls often lack a visible reason or recovery hint

Status: confirmed

Evidence:
- `src/l3-molecule/media/MediaLibrary.tsx:69-78` disables the media refresh button when no conversation is selected or media is loading; the surrounding copy explains the no-chat state only after the user notices the disabled icon.
- `src/l3-molecule/search/SearchScopeMenu.tsx:22-33` disables the "当前会话" scope when no conversation is available, but does not state why the scope is unavailable or how to enable it.
- `src/l3-molecule/developer/DbSearchPanel.tsx:40-73` disables the keyword input and search button in privacy mode; the placeholder changes, but the disabled action itself has no reason/hint.
- `src/l3-molecule/semantic/QAInput.tsx:109-250` disables several scope, history, window/depth, selected-chat, textarea, and send controls based on privacy mode, streaming state, no current contact, or empty selected chats; most disabled reasons are implicit.
- `src/l3-molecule/graph/GraphAdvancedPanel.tsx` and `src/l3-molecule/graph/GraphQAPanel.tsx` disable many privacy-sensitive fields/actions when privacy mode is on; the disabled state is not paired with per-control reason text.

Why it matters:
Disabled controls without a reason break recognition over recall. Users can see that an action exists but not what prerequisite is missing, whether the app is busy, whether privacy mode is blocking it, or what they should do next.

Acceptance standard:
- Disabled controls that block a likely user task expose a reason via adjacent hint text, status copy, tooltip, or `aria-describedby`.
- The reason distinguishes loading/busy, missing selection, privacy mode, not configured, unsupported state, and permission/service readiness.
- High-frequency disabled controls should have concise copy; rare or advanced disabled controls may use tooltip plus screen-reader description.
- Tests cover representative disabled-reason cases for media refresh, search scope, semantic QA send/scope, privacy-blocked developer search, and graph advanced actions.

Suggested fix direction:
Add a small "disabled reason" pattern to shared controls or field wrappers, then apply it to compact action clusters where the reason would otherwise be hidden.

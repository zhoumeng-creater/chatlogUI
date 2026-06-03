# P4-B Media, Favorites, Members, Unread, And Incremental Messages Plan

## Goal

P4-B turns the current plain-text chat workbench into a richer local chat record browser:

- media messages can be inspected through safe image/video/voice/file states instead of `[媒体可用]`;
- favorites can be browsed as a first-class library surface;
- group members can be inspected from the active conversation;
- unread counts can be pulled from the sidecar and merged into the session list;
- incremental messages can be refreshed with backend `new_state` without disrupting existing history pagination.

This plan is intentionally implementation-focused but does not include full source code. It records file ownership, endpoint contracts, test targets, privacy rules, UI acceptance, and verification gates.

## Source Basis

Planning inputs already reviewed for this phase:

- `AGENTS.md` and the user-provided agent guide.
- `开发指南.md`.
- `docs/总体开发规划.md`.
- `docs/ui-functional-audit-and-redesign-plan.md`.
- `.specify/memory/constitution.md`.
- `specs/001-ready-desktop-app/spec.md`, `plan.md`, `tasks.md`, `release-evidence.md`.
- `specs/002-advanced-capabilities/README.md`, `capability-matrix.md`, `privacy-diagnostics-contract.md`, `e2e-matrix.md`, `e2e-fixture-plan.md`, `test-data-policy.md`.
- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`.
- `docs/superpowers/plans/2026-06-01-p4-p5-0-capability-diagnostics-e2e-foundation.md`.
- `docs/superpowers/plans/2026-06-02-p4-a-developer-diagnostics-privacy-mode-2.md`.
- Current `chatlogUI` source under `src/l1-entry`, `src/l2-coordinator`, `src/l3-molecule`, `src/l4-atom`, and `src-tauri`.
- Local `chatlog_alpha` README, HTTP command aliases, media model, and HTTP route handlers for history, media, favorites, members, unread, and new messages.

Relevant skills considered and used for this planning slice:

- `using-superpowers` for skill discipline.
- `planning-with-files` for `task_plan.md`, `findings.md`, and `progress.md`.
- `brainstorming` for intent, scope, and design tradeoffs.
- `writing-plans` for executable task structure, adapted to the user's explicit requirement not to embed full code.
- `app-productization` for ready-desktop app scope, packaging, and release readiness.
- `using-git-worktrees` because this is non-trivial work and should not be planned directly on `master`.
- `frontend-design` and `ui-acceptance` as UI constraints for dense, operational desktop surfaces.
- `sidecar-integration` for CSP, Tauri permission, sidecar endpoint, and media playback implications.
- `release-gate` for packaged smoke requirements when CSP or permissions change.
- `test-driven-development` for the implementation plan.
- `verification-before-completion` for final evidence requirements.

## Current Baseline

P4/P5-0 is complete and provides:

- endpoint-level advanced capability matrix;
- privacy diagnostics contract;
- synthetic fixture policy;
- P4/P5 E2E matrix;
- opt-in redacted diagnostic event foundation.

P4-A is complete and provides:

- production HTTP diagnostic event wiring;
- DevConsole 2.0;
- diagnostics manifest 2.0;
- expanded redaction helpers;
- settings/about diagnostics reuse;
- source/UI evidence for 1440 and 390 viewports.

Current P4-B gaps:

- `src/l4-atom/network/index.ts` does not export media, favorites, members, unread, or new message fetchers.
- `RawHistoryMessage` contains some media fields, but `adaptHistoryMessage()` only keeps `mediaType`, `mediaUrl`, and `imageUrl`; it discards the key/path metadata needed for safe typed attachments.
- `MessageBubble` renders a coarse `[媒体可用]` placeholder.
- `MediaPreview` is a simple image modal and is not a complete media resource workflow.
- `useChatStore` has `Conversation.unread`, but unread values are not populated from `/api/v1/unread`.
- No L2 state exists for favorites, group members, incremental `new_state`, media preview/download blobs, or media object URL cleanup.
- Current chat L3 roots still have historical direct L2/store dependencies. P4-B must avoid deepening that debt and keep new leaf components props-driven.

## Backend Contract Snapshot

The following backend shapes are the implementation source of truth for P4-B. Synthetic fixtures and tests must match these shapes before UI work starts.

| Capability | Endpoint | Required inputs | Response shape | Notes |
| --- | --- | --- | --- | --- |
| Image resource | `GET /image/*key` | media key; optional `info` query | binary image or media metadata | Multiple keys can be comma-separated. Raw key is sensitive. |
| Video resource | `GET /video/*key` | media key; optional `info` query | redirect/data resource or media metadata | Playback may require `media-src` CSP review. |
| File resource | `GET /file/*key` | media key; optional `info` query | redirect/data resource or media metadata | Save/download must be explicit user action. |
| Voice resource | `GET /voice/*key` | media key; optional `info` query | audio resource or media metadata | Playback may require codec and `media-src` validation. |
| Data resource | `GET /data/*path` | backend media path | binary/decrypted data | Path is highly sensitive and must never render or log raw. |
| Favorites | `GET /api/v1/favorites` | optional `limit`, `fav_type`, `query` | `{ count, items }`; item fields: `id/type/type_num/time/timestamp/preview/from/chat` | Preview/from/chat are private content. |
| Members | `GET /api/v1/members` | required `chat` | `{ chat, username, count, members }`; member fields: `username/display/is_owner` | Only fetch for selected conversation or explicit member panel action. |
| Unread | `GET /api/v1/unread` | optional `limit` and filters | `{ sessions, total }`; session fields include `chat/username/is_group/chat_type/unread/last_msg_type/last_sender/summary/timestamp/time` | Merge into conversations without replacing existing list state unexpectedly. |
| New messages | `GET /api/v1/new_messages` | optional `limit`, optional `state` JSON map | `{ count, messages, new_state }` | No `state` means roughly last 24h. Store `new_state` in L2 memory first. |

History/search message media fields:

- media-related fields include `media_type`, `media_key`, `media_keys`, `media_path`, `media_url`, `image_key`, `image_keys`, `image_path`, `image_url`;
- the UI should convert these into internal typed attachment descriptors;
- raw keys and paths are not display strings and must not be copied/exported/logged.

## Scope

In scope:

- Backend-shaped fixtures for P4-B endpoints.
- L4 network atoms for media metadata/blob fetch and chat extensions.
- Typed media attachment model derived from history/search/favorites responses.
- L2 stores/commanders for media preview/download, favorites, members, unread, and incremental messages.
- Chat transcript media rendering with loading, empty, error, retry, and privacy states.
- Favorites/media library surface inside the existing workbench.
- Group member inspector for selected group conversations.
- Unread badges and incremental refresh state that preserve existing history pagination behavior.
- Diagnostic events through the existing P4-A opt-in bridge.
- Synthetic-only tests and viewport/privacy UI acceptance.
- CSP/release review if video/audio playback or native save permissions require Tauri changes.

Out of scope:

- SNS/Moments module and SNS media proxy; that remains P4-C.
- DB explorer, API runner, hook, MCP, semantic residuals, and graph residuals.
- Backend sidecar contract changes.
- Automatic telemetry or remote calls.
- Raw `/data/*path` explorer.
- Opening containing folders or broad shell permissions.
- Always-on background polling by default.
- Persisting incremental sync state across app restarts unless a later spec approves it.

## Architecture Decisions

1. L4 owns raw HTTP and media resource access only.
   L4 fetchers may accept optional diagnostic callbacks, but must not import L2 stores, Zustand, L3 components, Tauri UI state, or workbench modules.

2. L2 owns orchestration and normalization.
   L2 stores and commanders decide when to fetch members, unread, favorites, new messages, and media blobs. L2 also owns object URL lifecycle and deduplication decisions.

3. L3 receives props and callbacks.
   New media/favorites/member leaf components must be props-driven. If existing chat roots still use commander/store imports, P4-B should avoid adding new direct network calls there and should move new semantics into L2 view models where practical.

4. Raw media endpoints are not DOM URLs.
   Prefer fetching media through L4 and rendering blob object URLs. This prevents raw media keys or `/data/*path` from appearing in visible text, alt text, tooltips, copy/export output, or normal DOM `src` attributes.

5. Privacy mode is structural, not blank.
   Privacy-on should preserve message structure, attachment type, counts, and states while masking identities, previews, filenames, thumbnails, raw media metadata, and message text.

6. Incremental messages start with explicit refresh.
   Default P4-B behavior should refresh on selected workbench entry or user action. Always-on polling needs a later explicit decision because it changes performance, privacy, diagnostics volume, and user expectations.

7. CSP changes are evidence-gated.
   Image blob previews may not require a new CSP rule if existing `img-src` covers `blob:`. Video/audio playback likely requires explicit `media-src` review. If `src-tauri/tauri.conf.json` changes, P4-B must run the Tauri/release verification path.

## Data And State Model Targets

### Typed Attachment Descriptor

The UI model should represent attachments as safe descriptors rather than raw backend strings.

Recommended fields:

- stable attachment id;
- kind: image, video, voice, file, sticker, unknown;
- source family: history, search, favorite, incremental;
- display label derived from safe metadata, never a raw key/path;
- internal fetch reference held in L2/L4 only;
- optional size/duration/type metadata when available;
- loading/error/ready status;
- privacy display state.

The descriptor may keep internal key references in application memory when required for fetches, but those values must not be sent to diagnostics, copy/export, aria labels, tooltips, screenshots, or user-visible text.

### Favorites

Favorites state should track:

- current filter: favorite type, query, limit;
- list status: idle/loading/ready/error;
- synthetic-safe item view models;
- selected favorite detail;
- retry metadata;
- last refreshed time.

Favorites preview text is private content. Privacy-on must mask it and expose only type, count, and safe timestamp category.

### Members

Members state should track:

- selected chat identity reference;
- status per chat;
- total count;
- member rows with privacy-aware display labels;
- owner/admin indicator when provided by backend.

Members should be fetched only when a group conversation is selected and the member panel is opened, or when the user explicitly refreshes that panel.

### Unread

Unread state should track:

- unread sessions returned by backend;
- total unread conversation count;
- last refresh status/error;
- merge status into existing `Conversation.unread` without wiping local conversation metadata.

Unread summaries and senders are private. Counts can be displayed; summary/sender text must follow privacy mode.

### Incremental Messages

Incremental state should track:

- backend `new_state` map in memory;
- refresh status/error;
- last refresh time;
- count of new messages;
- per-chat new message rows;
- dedupe ids aligned with existing history messages.

Messages should merge in timestamp order. Existing transcript pagination should remain stable: loading older history still prepends older rows; new messages append or merge into the active transcript without changing the user's current scroll unexpectedly.

## Implementation Plan

### P4-B-0: Baseline And Fixture Correction

Purpose:

- lock the true backend shape before writing UI or adapters;
- prevent tests from passing against incorrect synthetic data.

Files:

- Modify `e2e/fixtures/advanced-capabilities.json`.
- Modify `specs/002-advanced-capabilities/e2e-fixture-plan.md` if fixture ownership needs clarification.
- Modify `specs/002-advanced-capabilities/capability-matrix.md` and `e2e-matrix.md` only to add P4-B planning evidence/status, not to claim implementation.

Tasks:

- Replace P4-B fixture shapes for unread, members, new messages, and favorites with backend-shaped synthetic rows.
- Add synthetic media metadata rows that include attachment type and safe labels but no real binary media.
- Keep fixture values synthetic-only; no real local paths, real WeChat ids, real message text, or real media keys.
- Add fixture notes stating that raw media key/path examples are synthetic redaction cases only if needed for tests.

Tests:

- Add contract tests that parse `advanced-capabilities.json` and assert backend-shaped fields exist.
- Add redaction fixture tests for media key/path, favorite preview, member display, unread summary, and new message content.

Acceptance:

- P4-B tests fail if fixtures drift back to the old `items` shape for unread/members/new messages.
- No committed fixture contains real chat data, real file paths, real tokens, or private messages.

### P4-B-1: L4 Raw Types And Adapters

Purpose:

- make backend responses explicit and keep raw fields at the boundary.

Files:

- Modify `src/l4-atom/network/chatlogRawTypes.ts`.
- Modify `src/l4-atom/network/chatlogAdapters.ts`.
- Create `src/l4-atom/network/mediaAdapters.ts`.
- Create `src/l4-atom/network/chatExtensionsAdapters.ts` or equivalent focused adapter modules.
- Add tests beside these modules.

Tasks:

- Extend `RawHistoryMessage` for all media key/path/url fields currently emitted by `chatlog_alpha`.
- Add raw types for favorites, members, unread sessions, and new messages.
- Add safe adapter outputs for typed attachments and chat extension view data.
- Ensure adapters never treat raw key/path as user-facing labels.
- Preserve existing history/search behavior for messages without media fields.

Tests:

- Adapter tests for image, video, voice, file, multiple image keys, missing media fields, malformed metadata, and unknown media.
- Adapter tests for favorites, members, unread, and new_messages using backend-shaped synthetic fixtures.
- Privacy/redaction tests proving adapter display labels do not include raw key/path.

Acceptance:

- Current core chat/history tests continue to pass.
- Typed attachment data exists without changing the backend contract.

### P4-B-2: L4 Fetchers For Media And Chat Extensions

Purpose:

- add independent network atoms for P4-B endpoints.

Files:

- Create `src/l4-atom/network/mediaResources.ts`.
- Create `src/l4-atom/network/fetchFavorites.ts`.
- Create `src/l4-atom/network/fetchMembers.ts`.
- Create `src/l4-atom/network/fetchUnread.ts`.
- Create `src/l4-atom/network/fetchNewMessages.ts`.
- Update `src/l4-atom/network/index.ts`.

Tasks:

- Implement JSON fetchers through existing request helpers where appropriate.
- Implement media metadata fetch with `?info=1`.
- Implement media blob fetch with caller `AbortSignal` support and safe diagnostic events.
- Normalize HTTP errors into current app error conventions.
- Add `onDiagnosticEvent` support through P4-A bridge-compatible options.
- Emit endpoint family, method, status, duration, error kind, and recovery hint only.
- Never emit raw key, raw path, favorite preview, member identity, message body, query text, or `state` payload.

Tests:

- Fetcher tests for success, HTTP error, network error, timeout, caller abort, malformed JSON, and blob failure.
- Diagnostic event tests proving sensitive request values are absent.
- Export/index tests proving new fetchers remain in L4 and are exported intentionally.

Acceptance:

- L4 scans show no imports from L1/L2/L3/Zustand/Tauri UI.
- Aborted media fetches do not leave hanging requests or misleading timeout events.

### P4-B-3: L2 Stores And Commanders

Purpose:

- centralize orchestration, object URL lifecycle, and app-level state.

Files:

- Create `src/l2-coordinator/data-clerk/stores/useMediaStore.ts`.
- Create `src/l2-coordinator/data-clerk/stores/useFavoritesStore.ts`.
- Create or extend chat extension state in `src/l2-coordinator/data-clerk/stores/useChatStore.ts`.
- Create `src/l2-coordinator/commander/useMediaCommander.ts`.
- Create `src/l2-coordinator/commander/useFavoritesCommander.ts`.
- Create `src/l2-coordinator/commander/useChatExtensionsCommander.ts` or extend `useChatCommander.ts` with narrowly named actions.

Tasks:

- Manage preview state, blob URLs, abort controllers, retry state, and object URL revocation.
- Manage favorites filters, loading, detail selection, and retry actions.
- Manage member panel state per selected chat.
- Manage unread refresh and merge unread counts into conversations.
- Manage incremental `new_state`, dedupe, and transcript merge.
- Use `createDiagnosticHttpOptions()` or the existing P4-A diagnostic bridge for every fetch.

Tests:

- Store tests for media preview load/abort/retry/revoke.
- Store tests for favorites empty/error/success/filter changes.
- Store tests for members open/refresh/error/privacy view models.
- Store tests for unread merge and zero state.
- Store tests for new_messages dedupe, ordering, active chat merge, and retained pagination.

Acceptance:

- Closing a media preview revokes object URLs.
- Switching conversations cancels stale media/member requests where needed.
- Incremental refresh does not duplicate messages already in active history.

### P4-B-4: Chat Transcript Attachment Rendering

Purpose:

- replace coarse media placeholders with typed, recoverable, privacy-aware attachment UI.

Files:

- Modify `src/l2-coordinator/data-clerk/stores/useChatStore.ts` message model as needed.
- Modify `src/l2-coordinator/commander/useChatCommander.ts` or add a chat transcript view model helper.
- Modify `src/l3-molecule/chat/MessageBubble.tsx`.
- Modify `src/l3-molecule/chat/MessageList.tsx` only if needed for stable row measurement.
- Create `src/l3-molecule/media/MessageAttachment.tsx`.
- Create `src/l3-molecule/media/MediaPreviewSheet.tsx`.
- Add focused display helper/tests.

Tasks:

- Render image/video/voice/file/unknown attachment rows with stable dimensions.
- Provide open preview, retry, cancel, and save/download actions where appropriate.
- Keep text and media controls within virtualized row layout without causing row jump loops.
- Use icons for attachment actions and accessible labels.
- Privacy-on: no thumbnail, filename, sender, key, path, or preview content.

Tests:

- Component/view-model tests for attachment labels, privacy labels, loading/error/retry state, and action wiring.
- Virtualized transcript tests or focused layout tests for stable dimensions.

Acceptance:

- `[媒体可用]` is no longer the final media experience.
- Media rows fit both 1440 and 390 width without horizontal overflow or overlapping controls.

### P4-B-5: Media Preview And Download Workflow

Purpose:

- provide safe inspection for image/video/voice/file resources.

Files:

- Create or extend `src/l3-molecule/media/MediaPreviewSheet.tsx`.
- Create `src/l3-molecule/media/MediaToolbar.tsx` if a separate toolbar is clearer.
- Create media display helpers/tests.
- Review `src-tauri/tauri.conf.json` if video/audio playback needs `media-src`.

Tasks:

- Image: load blob, render object URL, support retry and close.
- Video: implement only after CSP review; support loading/error/retry and accessible controls.
- Voice: implement only after playback/codec review; support loading/error/retry and accessible controls.
- File: show safe metadata and explicit save/download action.
- Use object URLs and revoke them on close, replacement, or app-level cleanup.
- Do not implement open-containing-folder in P4-B.

Tests:

- Blob URL lifecycle tests.
- Preview state transition tests.
- Privacy-on tests for every media kind.
- CSP/release tests if Tauri config changes.

Acceptance:

- Failed media fetches show recoverable, redacted endpoint-family errors.
- Media preview can be closed with keyboard and does not trap focus incorrectly.

### P4-B-6: Favorites And Library Surface

Purpose:

- add a user-facing library area for favorites and media browsing without crowding the chat transcript.

Files:

- Modify `src/l2-coordinator/commander/workbenchViewModel.ts`.
- Modify workbench module types where needed.
- Create `src/l3-molecule/media/MediaLibrary.tsx`.
- Create `src/l3-molecule/media/FavoritesBrowser.tsx`.
- Create `src/l3-molecule/media/FavoriteDetail.tsx`.
- Modify L1 workbench shell only for layout delegation and module routing.

Tasks:

- Add a Library workbench entry or a narrowly scoped Media/Favorites entry following current rail conventions.
- Favorites tab: filters for type/query/limit, list, detail, empty, error, loading, retry.
- Media tab: start with media discovered from loaded transcript/favorites and backend metadata; do not crawl the full database in P4-B.
- Ensure privacy-on masks preview/from/chat and media labels.
- Keep module dense and operational; no landing page or marketing hero.

Tests:

- Workbench view model tests for new module entry.
- Favorites commander/store tests.
- Component tests for filters, empty/error/success, and privacy labels.

Acceptance:

- Favorites are reachable from workbench navigation.
- Empty and error states are explicit and recoverable.
- The library module does not make remote calls outside the local sidecar.

### P4-B-7: Group Members Inspector

Purpose:

- expose group membership for the selected chat without turning L3 into an API owner.

Files:

- Create or modify `src/l3-molecule/chat/ConversationInspector.tsx`.
- Create member list leaf components if useful.
- Extend L2 chat extension commander/view model.

Tasks:

- Show member count and list only when the selected conversation is a group.
- Fetch members on panel open or explicit refresh.
- Show loading, empty, error, and retry states.
- Mark owner if backend provides `is_owner`.
- Privacy-on masks member display and usernames while preserving count/role indicators.

Tests:

- Member view-model tests for personal chat, group loading, group success, error, and privacy.
- Component tests for keyboard and layout behavior.

Acceptance:

- Personal chats do not trigger unnecessary members calls.
- Group member panel fits 390 width and does not overlap transcript content.

### P4-B-8: Unread And Incremental Message Integration

Purpose:

- make unread/new message endpoints useful while preserving existing conversation/history behavior.

Files:

- Modify `src/l2-coordinator/data-clerk/stores/useChatStore.ts`.
- Modify `src/l2-coordinator/commander/useChatCommander.ts` or add `useChatExtensionsCommander.ts`.
- Modify `src/l3-molecule/chat/ConversationRow.tsx`.
- Modify `src/l3-molecule/chat/TranscriptHeader.tsx`.

Tasks:

- Add explicit unread refresh action and refresh status.
- Merge unread counts into conversations by stable chat/session identity.
- Add new message refresh action and status.
- Store backend `new_state` in L2 memory.
- Deduplicate messages by `local_id` where possible, with a safe fallback internal id.
- Append/merge new messages in timestamp order.
- Preserve current scroll when incremental messages arrive unless the user requests jump-to-new.

Tests:

- Unread merge tests for existing sessions, new unread-only sessions, zero unread, and error.
- New message tests for first refresh without state, refresh with state, dedupe, active chat merge, and inactive chat badge/count update.
- Privacy tests for unread summary and new message preview.

Acceptance:

- Existing session loading still works if unread/new_messages endpoints fail.
- Incremental refresh does not duplicate or reorder existing history incorrectly.

### P4-B-9: Privacy, Diagnostics, And Export Hardening

Purpose:

- ensure P4-B's raw-data-heavy surfaces inherit P4-A safety guarantees.

Files:

- Modify redaction helpers if new synthetic markers expose gaps.
- Add diagnostic tests around new fetchers/commanders.
- Update `specs/002-advanced-capabilities/privacy-diagnostics-contract.md` if P4-B adds module-specific rules.

Tasks:

- Ensure media keys, media paths, `/data/*path`, favorite preview/from/chat, member identities, unread summaries, new message bodies, query text, and state maps are forbidden diagnostic/export values.
- Add privacy-on view-model assertions for visible text, aria labels, tooltips, copy/export, diagnostic rows, and screenshots.
- Use diagnostic events only for endpoint family/status/duration/error/recovery/count summaries.
- Treat download/save failures as local UI/system events with redacted summaries.

Tests:

- Redaction tests for every P4-B sensitive field class.
- Diagnostics report tests for fail-closed behavior when raw P4-B labels are supplied.
- DevConsole event tests proving media/chat extension events are safe.

Acceptance:

- Synthetic leak scans pass with P4-B markers.
- Diagnostics export still fails closed or redacts if a raw P4-B field enters the report builder.

### P4-B-10: Sidecar, CSP, And Permission Review

Purpose:

- prevent media playback/download from silently weakening the desktop security posture.

Files:

- Review `src-tauri/tauri.conf.json`.
- Review `src-tauri/capabilities/default.json`.
- Review relevant L4 system atoms if a native save path is required.

Tasks:

- Keep sidecar startup contract unchanged: `serve --http-addr 127.0.0.1:5030`.
- If video/audio playback is implemented, add the narrowest required `media-src` rule and document why.
- If native save is implemented, use the narrowest Tauri permission and explicit user action.
- Do not enable shell open or folder open in P4-B.
- If no Tauri/CSP change is needed, record that in evidence.

Tests:

- If Tauri config changes: `cd src-tauri && cargo test`, `pnpm tauri build`, and packaged smoke for playback/download surface.
- If no Tauri config changes: source-level browser/UI acceptance and documentation evidence are enough.

Acceptance:

- No broadened CSP/capability without written rationale.
- No backend sidecar contract change.

### P4-B-11: UI Acceptance And Evidence

Purpose:

- prove the new surfaces are usable at desktop and narrow widths.

Targets:

- `/workbench?codex-smoke=workbench-ready` with Library/Media/Favorites surface.
- Chat transcript with media attachments.
- Conversation inspector with members.
- Session list/header with unread and new message states.
- DevConsole or diagnostics export with P4-B events.

Required checks:

- 1440x900 viewport.
- 390x820 viewport.
- privacy off and privacy on.
- no page-level horizontal overflow.
- no text overlap inside media rows, filters, badges, buttons, dialogs, sheets, or drawers.
- loading, empty, error, success, retry, disabled, and cancelled states.
- keyboard access for preview close, retry, filters, and download/save action.
- no visible synthetic private markers, raw media keys, raw paths, raw query values, raw member identities, or raw message content under privacy-on.

Tools:

- Prefer Browser plugin for local target when available.
- Use Playwright/Chromium fallback if Browser plugin connection times out, as P4-A evidence already recorded this tooling caveat.

Acceptance:

- Evidence is written to release/spec docs with clear distinction between source/UI evidence and packaged release evidence.

### P4-B-12: Final Verification And Closeout

Purpose:

- finish with reproducible evidence and clear remaining scope.

Minimum commands for code implementation:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
git diff --check
```

Additional commands if Rust/Tauri/CSP/capabilities change:

```powershell
cd src-tauri
cargo test
cd ..
pnpm tauri build
```

Additional scans:

```powershell
rg -n "media_key|media_path|image_key|image_path|/data/|favPreview|newMessageBody|memberUsername" src specs e2e
rg -n "@l2|l2-coordinator|zustand" src\l4-atom
rg -n "fetch\\(|XMLHttpRequest|EventSource" src\l1-entry src\l3-molecule
```

The sensitive-field scan is expected to find implementation and tests in controlled places; final evidence must explain allowed hits and prove no raw values are rendered, logged, copied, or exported.

## Verification Matrix

| Area | Required evidence |
| --- | --- |
| Backend contract | Fixture contract tests match `chatlog_alpha` response shapes. |
| L4 independence | Import scans show L4 has no L2/L3/store/UI coupling. |
| L2 orchestration | Store/commander tests cover success, error, abort, retry, cleanup, and dedupe. |
| L3 props/views | New media/favorites/member leaves receive data/actions as props. |
| Privacy | Synthetic private markers masked in visible text, aria, tooltip, copy/export, screenshots, diagnostics. |
| Diagnostics | Events contain endpoint family/status/duration/error/recovery/count only. |
| Media lifecycle | Object URLs are revoked on close/replacement/unmount; stale requests are aborted. |
| UI layout | 1440 and 390 evidence for transcript, preview sheet, library, members, unread/new message states. |
| CSP/release | If Tauri changes, packaged smoke and release evidence are updated. |

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Fixture shape drift | UI passes tests but fails against sidecar | P4-B-0 contract tests against backend-shaped synthetic fixtures. |
| Raw media key/path leak | Privacy/security regression | Blob object URLs, redaction tests, no raw key/path in view models or diagnostics. |
| Object URL leak | Memory grows during media browsing | L2 media store owns revoke lifecycle and tests cleanup. |
| CSP over-broadening | Desktop security posture weakens | Only add `media-src` if playback requires it; run Tauri/release verification. |
| Voice/video playback codec mismatch | Broken media UX | Provide recoverable error state; record codec limitations; avoid claiming universal playback. |
| Incremental message duplication | Transcript becomes confusing | Dedupe by `local_id` and stable fallback id; test active/inactive chat cases. |
| Background polling surprise | Performance/privacy issue | Start with explicit refresh/on-entry refresh only. |
| L3 architecture debt grows | Harder future refactor | New leaves are props-driven; semantics stay in L2 view models/commanders. |
| Favorites preview leaks private content | Privacy-on failure | Mask preview/from/chat in visible/aria/tooltip/copy/export; add leak scans. |
| Download permission creep | Over-broad Tauri capability | Prefer browser/blob save first; native save requires explicit permission review. |

## Documentation Updates During Implementation

Implementation should update these documents as evidence accumulates:

- `task_plan.md`: add P4-B implementation phase status.
- `findings.md`: record backend/CSP/UI/test discoveries.
- `progress.md`: record step-by-step execution and verification.
- `docs/superpowers/plans/2026-06-01-p4-p5-advanced-capabilities-diagnostics-release-quality.md`: update P4-B status.
- `specs/002-advanced-capabilities/capability-matrix.md`: move P4-B rows from `documented` toward `implemented` or `verified` only after evidence.
- `specs/002-advanced-capabilities/e2e-matrix.md`: add source/UI evidence for P4-B rows; do not claim persistent P5-B suite unless it exists.
- `specs/002-advanced-capabilities/privacy-diagnostics-contract.md`: add P4-B-specific forbidden payload examples if redaction tests add new classes.
- `specs/001-ready-desktop-app/release-evidence.md` and `docs/release/ready-desktop-app.md`: update only if P4-B changes release/package/CSP/Tauri behavior or produces packaged smoke evidence.

## Implementation Evidence 2026-06-02

P4-B source/UI implementation is complete under the constraints in this plan.

- Backend-shaped synthetic fixture contract is fixed and covered by `advancedCapabilitiesFixture.test.ts`.
- L4 raw types, media adapters, chat extension adapters, media resource fetchers, and chat extension fetchers are implemented behind the existing `requestJson`/diagnostic-event model.
- L2 media, favorites, and chat extension stores/commanders own orchestration, object URL lifecycle, favorites filters, unread merge, members, `new_state`, and new message dedupe.
- L3/L1 surfaces now include attachment buttons, image preview sheet, media/library module, favorites list/detail, member inspector, unread badges, and explicit new-message refresh.
- Privacy redaction covers P4-B labels and fields, and Playwright CLI source/UI evidence passed at `1440x900` privacy off and `390x820` privacy on.
- Video and voice native playback are deferred. Current video/voice/file paths render download/placeholder states, so no Tauri `media-src`, capability, Rust, sidecar startup, bind-address, or packaged artifact change was made.
- Final source verification passed: `pnpm lint`, `pnpm typecheck`, `pnpm test` (60 files / 282 tests), `pnpm build`, `pnpm verify`, architecture/privacy scans, and `git diff --check` with only CRLF normalization warnings.

## Open Decisions

These are not blockers for writing the plan, but they should be confirmed before implementation if product behavior changes:

- Whether incremental messages should remain explicit/on-entry refresh only, or later support a user-configured polling interval.
- Whether P4-B should implement real video/voice playback in the first implementation pass, or start with metadata, download, and recoverable preview placeholders until CSP/codec evidence is stronger.
- Whether native file save is required in P4-B, or whether blob download inside the WebView is acceptable for the first pass.

## Done Criteria

P4-B implementation is done only when:

- media messages no longer end at `[媒体可用]`;
- favorites, members, unread, and new messages are implemented through L4 -> L2 -> L3 architecture;
- fixtures match backend shapes and remain synthetic-only;
- privacy-on masks all P4-B sensitive surfaces;
- diagnostic events and exports stay redacted and local-only;
- UI evidence covers 1440 and 390 viewports;
- final verification commands pass;
- any Tauri/CSP/capability changes have matching Rust/Tauri/package evidence;
- remaining assumptions and open decisions are recorded clearly.

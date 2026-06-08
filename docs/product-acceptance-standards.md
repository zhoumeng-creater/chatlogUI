# chatlogUI Product Acceptance Standards

> This document is a standing constraint for chatlogUI development, debugging, UI polish, code repair, review, and release readiness. Future standards may be added, but the requirements below must not be weakened unless the product owner explicitly changes them.

## 1. Purpose

chatlogUI is not accepted just because a button can be clicked or a panel can render data. A feature, page, component, or release slice is acceptable only when it helps the user complete the intended local chatlog task, handles required states, protects private data, stays compatible with `chatlog_alpha`, remains maintainable, and has a coherent user interface.

Use this document together with `AGENTS.md`, `docs/ui-development-standards.md`, architecture rules, sidecar contracts, active specs, and release evidence. If there is a conflict, preserve privacy, sidecar compatibility, architecture boundaries, and explicit user requirements first.

`docs/ui-development-standards.md` is the coding-time companion to this acceptance document. It translates WCAG target-size requirements and NN/G usability heuristics into development rules for hit targets, buttons, dense controls, user language, status visibility, recovery paths, and component behavior.

## 2. Non-Negotiable Gates

A page or feature fails acceptance if any of these are true:

- It cannot answer the user-perspective heuristic check in section 3.1 before implementation or review.
- It exposes raw `dataKey`, API keys, tokens, secrets, private chat content, or unrestricted local paths outside an explicitly requested debugging flow.
- It changes `chatlog_alpha` backend behavior or sidecar API contracts without an explicit task requiring that change.
- It bypasses the L1/L2/L3/L4 architecture boundaries in `AGENTS.md`.
- It has no visible loading, empty, error, disabled, and success handling for the user's main path.
- It can enter a broken-looking blank page when service or DB readiness is missing.
- It allows repeated clicks, stale responses, or uncancelled requests to corrupt visible state.
- It contains pointer targets below the WCAG 2.2 target-size minimum without a documented exception or equivalent target.
- It is unusable at a narrow viewport or unreadable in dark/privacy mode.
- It presents raw technical errors such as `HTTP 500`, `undefined`, or internal error codes to ordinary users without a plain-language reason and next step.
- It cannot provide evidence for the claims made in review or release notes.

## 3. Overall Project Acceptance

Every meaningful development slice must be checked across these layers.

### 3.1 User-Perspective Heuristic Check

Before reviewing or implementing any page, button, panel, module, route, or workflow, answer these questions from the user's point of view. The user originally described this as a four-question check; the current required check has five questions and all five must be preserved.

| Question | What a passing answer must prove |
| --- | --- |
| What real task does this interface help the user complete? | The UI maps to a concrete chatlog task, not an internal component or implementation milestone. |
| When the user sees it for the first time, what should they do first? | The first action is visually and verbally clear without reading documentation or guessing from debug terms. |
| Does the same task have more than two entry points? | Duplicate entry points are justified, named consistently, and do not fragment the workflow or confuse state. |
| If the user makes a mistake, regrets an action, or does not understand the screen, can they immediately exit or recover? | Back, cancel, close, undo, retry, reset, settings, diagnostics, or help paths are available where the risk requires them. |
| Is the experience degraded because another required function is missing? | Missing prerequisites, adjacent modules, data states, or recovery actions are identified instead of hidden behind a superficially working UI. |

If any answer is vague, implementation should pause until the task model, entry point, recovery path, or missing dependency is clarified.

### 3.2 NN/G Heuristic Adoption For chatlogUI

Nielsen Norman Group's [10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) are broad interaction-design review principles, not detailed implementation rules. For chatlogUI, all 10 are useful, but they must be translated into concrete local-private-data desktop-app checks rather than pasted as slogans.

The following table is the adopted interpretation for this project:

| NN/G heuristic | chatlogUI adoption decision | Acceptance consequence |
| --- | --- | --- |
| Visibility of system status | Required. The app depends on sidecar startup, HTTP readiness, DB readiness, searches, index jobs, SSE streams, graph rebuilds, diagnostics, and exports; users must always know what is happening. | No silent long-running action. Service, DB, loading, streaming, cancelling, retrying, timeout, and completion states must be visible within the relevant surface. |
| Match between system and real world | Required. UI language must follow the user's chatlog mental model, not backend/internal names. | Ordinary users see terms like service, database, sessions, contacts, groups, media, 朋友圈, AI index, evidence, and diagnostics. Raw endpoint names, internal error codes, and implementation jargon require translation. |
| User control and freedom | Required. This is critical for local private data, AI streams, destructive actions, drawers, dialogs, and navigation. | Users need clear back, cancel, close, stop, undo where feasible, retry, reset, and safe-exit paths. Destructive or expensive actions require confirmation and cannot trap the user. |
| Consistency and standards | Required. chatlogUI has many modules and a strict component/layer system. | Same task uses the same naming, icon meaning, button hierarchy, state language, keyboard behavior, and layout pattern across settings, workbench, AI, graph, media, SNS, and developer tools. |
| Error prevention | Required. Preventing mistakes matters more than merely displaying errors after private-data or destructive operations fail. | Validate before save/start/export/write. Disable repeated submit while pending. Confirm destructive, expensive, privacy-sensitive, cache-clearing, ingest, rebuild, and external-open actions. |
| Recognition rather than recall | Required. Users should not remember hidden config, current scope, selected contact, active filters, or prior error context. | Labels, selected scope, active filters, examples, hints, recent choices, readiness status, and recovery actions must remain visible or easily retrievable. Placeholder-only guidance is insufficient. |
| Flexibility and efficiency of use | Adopt as contextual requirement. Support experienced users without making the first-run path harder. | Shortcuts, recent scopes, saved filters, quick retry, copy diagnostics, and advanced developer tools are valuable, but they must not create duplicate confusing entry points or expose risky actions by default. |
| Aesthetic and minimalist design | Required and already part of page scoring. This is about focus, not decoration. | Remove irrelevant or rarely needed information from primary screens. Keep developer density inside developer tools. Do not let ornamental UI, repeated cards, or excessive secondary controls compete with the main task. |
| Help users recognize, diagnose, and recover from errors | Required. chatlogUI must translate backend, DB, timeout, permission, AI, graph, and file/resource failures into usable recovery paths. | Error states use plain language, show likely cause, distinguish service vs DB vs timeout vs missing data, and offer retry, settings, diagnostics, copy, or safe next step. |
| Help and documentation | Adopt as contextual requirement. The product should be self-explanatory first, with concise contextual help where the task remains complex. | Use inline examples, field hints, short setup guidance, and diagnostics explanations at the point of need. Do not replace clear UI with long documentation. |

These adoptions are not separate from the rest of this document. They strengthen the non-negotiable gates, page scoring, component checks, state coverage, module acceptance, and review workflow below.

### 3.3 User Task Coverage

Start from the user's task, not from the UI component. For each task, define the intended outcome, the required entry point, the happy path, failure paths, and recovery paths.

Current mandatory task families include:

| Task family | Acceptance intent |
| --- | --- |
| Connect chatlog service | User can choose hosted or external service, understand readiness, and recover from service/DB failures. |
| View sessions | User can inspect recent chats, contacts, groups, and special accounts with correct identity priority and sorting. |
| View chat history | User can load recent and older messages, understand senders and time, and handle unknown message types safely. |
| Search chats | User can search with clear scope, filters, result snippets, pagination, privacy-safe rendering, and jump-to-context. |
| View media | User can browse images, videos, voice, files, and missing resources without unsafe path exposure. |
| View SNS/朋友圈 | User can inspect text, media, links, locations, comments, likes, notifications, and search results distinctly. |
| View statistics | User can understand counts, trends, and empty/partial data without misleading charts. |
| Use Developer Tools | User can inspect diagnostics, DB/API/debug data safely with local-only guards and redaction. |
| Use AI Q&A and analysis | User can configure AI, build indexes, stream/cancel answers, inspect evidence, and audit result sources. |
| View Knowledge Graph | User can understand entities, relations, events, timelines, filters, and graph QA evidence. |
| Use privacy mode | User can hide private content without collapsing layout or losing workflow orientation. |
| Export or diagnose problems | User can export safe diagnostics, copy useful context, retry, and reach the correct recovery screen. |

Future task families must be added to this table or to a linked task matrix before implementation is considered complete.

### 3.4 State Coverage

Every page and reusable component must be reviewed in the states below. Not every state needs a separate visual treatment, but every applicable state must have defined behavior.

| State | Required check |
| --- | --- |
| Normal | Main task is clear, data is correct, and primary action is obvious. |
| Loading | Loading is visible, scoped, non-jarring, and does not erase useful stable context. |
| Empty | Empty state explains why it is empty and what the user can do next. |
| Error | Error explains likely cause and next action; retry/copy diagnostics/settings navigation appears where appropriate. |
| Slow request | User sees progress or timeout guidance; UI remains responsive. |
| Permission/service not ready | HTTP readiness and DB readiness are separated; user sees the missing precondition. |
| Privacy mode | Private content is masked across visible text, inputs, attributes, copy/export, logs, screenshots, and diagnostics. |
| Narrow screen | User can complete the main task without horizontal overflow or hidden critical controls. |
| Dark mode | Contrast, focus, borders, and empty/error states remain legible and polished. |
| Long text | Chinese/English mix, URLs, emoji, code-like text, and multiline content do not break layout. |
| Large data | Pagination, virtualization, truncation, or explicit load controls prevent resource and layout failures. |
| Repeated click | Loading/disabled/idempotency prevents duplicate destructive or confusing requests. |
| Cancel/stop | Long-running and streaming work can be cancelled, and cancellation leaves a clear final state. |
| Stale response | Late responses cannot overwrite newer user intent. |
| Partial data | Missing optional fields do not render broken labels or misleading summaries. |

### 3.5 Quality Coverage

Use ISO/IEC 25010-style product quality dimensions as a review lens. Do not reduce acceptance to feature count.

| Quality dimension | Acceptance questions |
| --- | --- |
| Functional suitability | Is the task complete, correct, and aligned with the real chatlog workflow? |
| Performance efficiency | Are response time, rendering cost, memory use, and large-data behavior acceptable? |
| Compatibility | Does it work with the current `chatlog_alpha` sidecar/API and Tauri desktop runtime? |
| Usability | Can a non-technical user understand what to do, what happened, and how to recover? |
| Reliability | Does it tolerate service failure, DB unready state, timeout, cancellation, and repeated actions? |
| Security and privacy | Are secrets, local paths, private content, logs, screenshots, and diagnostics controlled? |
| Maintainability | Are L1/L2/L3/L4 responsibilities clear, tests focused, and code changes scoped? |
| Accessibility | Are labels, focus, keyboard behavior, contrast, and screen-reader names covered? |

## 4. Page Design And Aesthetic Acceptance

Functional acceptance and visual/design acceptance are separate gates. A page can be functionally wired and still fail because information hierarchy, density, copy, state design, or responsive behavior is poor.

Design review must check:

- information hierarchy
- whitespace
- density
- alignment
- visual rhythm
- component consistency
- copy tone
- color relationships
- restrained motion
- focus states
- loading/empty/error aesthetics
- privacy/dark mode appearance

Reference principle: aesthetic and minimal design matters. Irrelevant or rarely needed information weakens the visibility of important information. Error text should use ordinary language, identify the problem, and suggest a solution.

### 4.1 Page Scoring

Score every page from 0 to 2 for each item:

- `0`: absent, misleading, or visibly broken
- `1`: partially handled but inconsistent, incomplete, or fragile
- `2`: meets the standard in normal and required edge states

Minimum passing score: `16 / 20`. If main task clarity, privacy mode, or error state scores `0`, the page fails even if the total score reaches 16.

| Item | Passing standard |
| --- | --- |
| Main goal is obvious | User knows within 3 seconds what the page is for. Settings is configuration, workbench is chat inspection, graph is relationships, AI is Q&A/search/analysis. |
| Visual hierarchy is clear | Title, description, primary action, secondary action, state information, and dangerous action have distinct hierarchy. |
| Whitespace is stable | Page margin, card padding, and component gaps use the token rhythm `4/8/12/16/20/24/32`; avoid random values such as `13px`, `17px`, or `23px`. |
| Alignment is clean | Titles, buttons, inputs, list rows, and panel edges land on coherent visual axes. |
| Control density is appropriate | High-frequency areas may be compact; configuration and dangerous-action areas need more breathing room. Developer tools may be dense; settings center and AI Q&A must not feel like debug panels. |
| Button hierarchy is correct | Each region has at most one primary button. Secondary actions use secondary/ghost treatment. Dangerous actions use danger styling and confirmation. |
| Copy feels like product copy | Ordinary users do not see raw `HTTP 500`, `undefined`, or internal codes without explanation. Error copy states cause and next step. |
| States look designed | Loading, empty, error, disabled, and success states have dedicated visuals; no blank panel or raw dumped error. |
| Scrolling is elegant | The outer page does not scroll unpredictably. Internal lists/panels own scrolling clearly. Bottom actions are not hidden. Because `html/body/#root` use `overflow: hidden`, every content area must manage scroll explicitly. |
| Dark/privacy mode remains polished | Layout does not collapse, placeholder copy is not awkward, and color contrast remains sufficient. |

### 4.2 Visual Defect Severity

| Severity | Examples | Required action |
| --- | --- | --- |
| Critical | Hidden primary task, privacy leak, unreadable page, blocked navigation, overlapping core controls | Must fix before acceptance. |
| High | Broken empty/error state, poor narrow layout, duplicate primary actions, misleading copy | Must fix before feature completion. |
| Medium | Inconsistent spacing, weak hierarchy, rough but usable copy, minor focus styling gap | Fix in the same slice unless explicitly deferred. |
| Low | Cosmetic inconsistency with no workflow impact | Track if not fixed. |

## 5. Component Acceptance

Review components both standalone and in their page context.

| Component | Required checks |
| --- | --- |
| Button | Only true primary actions use `primary`; loading disables repeated submit; dangerous actions use `danger`; target size follows `docs/ui-development-standards.md`; label stays readable. |
| IconButton | Every icon button has a clear `aria-label`; icon-only controls have tooltips when meaning is not obvious; hit target follows the WCAG/project size rules even if the visible icon is smaller. |
| Input | Every input has a label or `aria-label`; placeholder can help but must not be the only accessible name; validation and examples are visible where needed. |
| Field | Hint/error text renders and should be connected to child inputs through `aria-describedby`; missing binding is an accessibility debt to fix when touched. |
| Modal/Drawer | Esc closes where safe, outside click behavior is intentional, focus is trapped, and focus returns to the opener. |
| Tabs | Keyboard operation works, active tab is obvious, labels are short and consistent, and narrow layouts do not wrap module labels into unusable controls. Current module labels such as `统计` / `媒体` / `朋友圈` / `开发` / `AI` / `图谱` are useful examples, not a frozen taxonomy; if modules are renamed, added, removed, or reorganized, the same compact-layout and accessible-name requirements apply to the new labels. |
| StatusIndicator | Communicates what is happening, whether it succeeded, and what to do next; not just a colored dot. |
| Empty State | Explains why content is empty and the next action: refresh, choose contact, build index, configure service, or change filters. |
| Error State | Supports retry, copy diagnostics, go to Settings Center, or open Developer Tools where appropriate. |
| Toast/Notification | Does not replace persistent error state for important failures; does not expose secrets or raw private text. |
| List/Table row | Handles long names, missing fields, keyboard/focus, selection state, and privacy masking. |
| Inspector/Panel | Has a clear title, scoped scroll, close/back behavior on narrow screens, and does not hide bottom status or actions. |

## 6. Responsive Layout Acceptance

Every user-facing route must be checked at representative widths. Use actual browser evidence where possible.

| Width | Required checks |
| --- | --- |
| `<720` | Conversation list is shown first where relevant. After selecting a session, user has a clear way back. AI/developer/media inspectors use drawer behavior. Drawer does not cover bottom status or critical actions. |
| `720-980` | Narrow sidebar icons remain understandable. Tooltips are present where needed. Hidden module labels do not remove accessible names. |
| `980-1280` | Inline inspector does not make the main chat area too narrow. Search bar and module buttons do not squeeze into unreadable controls. |
| `>=1280` | Sidebar text, session list, main chat, and right inspector proportions are balanced. Right side is useful but not overloaded. |

Additional layout requirements:

- No page-level horizontal overflow unless explicitly designed and documented.
- Fixed-format UI such as boards, toolbars, icon buttons, counters, tiles, and graph canvases must have stable dimensions.
- Long labels and translated copy must wrap or truncate intentionally; text must not escape buttons/cards/panels.
- Do not use layout shifts as a loading indicator.

## 7. Feature Acceptance Matrix

### 7.1 Settings Center

Settings Center is the first success gate, not just a launch screen.

| Scenario | Acceptance standard |
| --- | --- |
| First launch | User understands hosted service vs external service; no configuration does not drop the user into an empty broken workbench. |
| Import data directory | Success shows platform, version, data key, img key, and path summary safely; failure explains missing files. |
| Manual configuration | Every field has description, example, validation, and error messaging before save. |
| Hosted service startup | Port free, port occupied, existing external chatlog service, successful start, and failed start all have distinct messaging. |
| External service connection | `127.0.0.1:5030` and `http://127.0.0.1:5030` both work; failure separates service unreachable from DB not ready. |
| Readiness check | HTTP ready and DB ready are shown separately; "service started" is not treated as "database queryable". |
| Enter workbench | DB-unready state explains the cause; app must not enter a broken empty page. |

### 7.2 Sessions And Chat History

This is the core product surface. Do not stop at "messages render." If the product offers a recent-history view, the first page normally should show the newest useful slice; if another anchor is intended, the UI, copy, tests, and acceptance notes must make that choice explicit. The earlier "50 messages should be the latest 50" observation is a product review suggestion based on the current implementation, not a permanent hard rule.

| Scenario | Acceptance standard |
| --- | --- |
| Recent sessions | Sorted by recent time; group/private/public-account/folded session types are correct; nickname, remark, and username priority is correct. |
| Contacts/groups | If the product promises all contacts/groups, contacts without history sessions can still be found or shown. |
| History pagination | First page, load more, last page, empty session, and huge group chat work correctly. For fixed-size first pages such as 50 messages, review whether the intended anchor is "most recent" or something else; the implementation and user-facing copy must match that product decision. |
| Message types | Text, image, video, file, voice, link, system, revoke, red packet, location, and unknown types do not crash. |
| Sender identity | Group member name, self/other direction, time dividers, and same-day grouping are clear. |
| Long text | Long messages, line breaks, emoji, URLs, code-like blocks, and mixed Chinese/English do not break layout. |
| Search jump | Search result opens the right session and positions near the matching context. |

### 7.3 Search

Search is an experience, not just an input.

| Scenario | Acceptance standard |
| --- | --- |
| Empty query | No request is sent; no error is shown; user is prompted to enter keywords. |
| Searching | Loading is explicit; duplicate requests cannot cause result disorder. |
| No results | Shows no-result copy and suggests changing scope or keywords. |
| Many results | Pagination exists; each result shows session, sender, time, and hit snippet. |
| Filters | Time, message type, current session, and all-session scopes have clear effects. |
| Privacy mode | Result content is hidden while structure and counts remain stable. |
| Error | Service unreachable, DB not ready, and timeout have distinct copy and recovery. |

### 7.4 Media, Favorites, Members, Unread, And New Messages

These modules fail if they are merely present but incomplete.

| Scenario | Acceptance standard |
| --- | --- |
| Image preview | Thumbnail, original-load failure, unknown size, privacy mode, copy/open-original behavior are handled. |
| Video/voice | Playback, load failure, duration, and unsupported format messaging are handled. |
| Files | File name, size, type, open/locate action, and missing-file state are handled. |
| Favorites | Favorite content source is distinct from ordinary messages and not confused in UI or state. |
| Group members | Large groups support pagination or search; nickname/remark priority is correct. |
| Unread/new messages | Total count, per-session aggregation, and click-to-session behavior work. |
| Resource safety | Frontend cannot open arbitrary local paths without controlled allowlisting/system mediation. |

### 7.5 SNS / 朋友圈

Accept by content type, not by list presence.

| Content type | Required checks |
| --- | --- |
| Text only | Line breaks, emoji, long text, and empty content are handled. |
| Images | Nine-grid, single image, thumbnail failure, and original failure work. |
| Video/Live Photo | Thumbnail, play entry, duration, and failure state work. |
| Link/article | Title, description, cover, and safe external-open prompt are present. |
| Location | City, POI, and empty address avoid broken partial UI. |
| Comment/like notifications | Time, source, feed preview, and jump behavior are clear. |
| Search | Search results are distinct from feed; clearing search restores feed state. |

### 7.6 AI Semantic Index, SSE Q&A, And Analysis

AI features require auditability. An AI answer without inspectable evidence is not acceptable for this product.

| Submodule | Acceptance standard |
| --- | --- |
| AI config | Provider, model, base URL, key, embedding model, dimensions, test connection, save, and reload are handled. |
| Index build | Unconfigured, not built, building, pause, resume, failure, timeout, clear, and rebuild states are visible. |
| Index preview | Object type, count, pagination, empty state, and privacy mode are handled without exposing raw private content. |
| Semantic search | Current contact/all contacts scope is clear; result shows source, time, snippet, similarity or explanation. |
| SSE Q&A | Connecting, streaming output, stop, failure, empty answer, timeout, service disconnect, repeated question, and module switch cancellation are handled. |
| Evidence references | Final answer can show evidence messages, time, session, and hit reason; otherwise the answer is not auditable. |
| Long question | Multiline input, question history, copy answer, and clear conversation are supported. |

### 7.7 Knowledge Graph

The graph is accepted only if it helps users understand chat data, not merely because nodes and edges render.

| Item | Acceptance standard |
| --- | --- |
| Summary | Entity count, relation count, event count, last build time, and status are clear. |
| Filters | Keyword, time window, and entity type filters can be combined. |
| Canvas | Loading, empty graph, huge graph, error graph, node hover, double-click-to-chat, zoom/drag, and reset view work. |
| Visual encoding | Node size, color, and label hierarchy are clear; edges do not turn the scene into an unreadable hairball. |
| Timeline | Relation/event time is explainable; clicking timeline highlights related nodes. |
| Graph QA | Question, answer, evidence, and time window are clear; dangerous or expensive operations require confirmation. |
| Advanced writes | Business record/event writes require confirmation; after write, summary refreshes and source is traceable. |

### 7.8 Developer Tools, Diagnostics, Export, And Privacy

| Scenario | Acceptance standard |
| --- | --- |
| Developer tool entry | Clearly marked as advanced/local diagnostic tooling; ordinary users are not forced into it for normal recovery. |
| DB/API diagnostics | Read-only and allowlisted operations are clear; dangerous operations require confirmation or are absent. |
| Error diagnostics | Copy/export includes safe app, sidecar, readiness, endpoint-family, and event summaries without raw private content. |
| Logs | Logs redact secrets and private messages; no telemetry is added by default. |
| Export | User-triggered only, redacted or fail-closed, with visible success/failure and where-to-find guidance. |
| Privacy mode | Copy, export, screenshots, accessibility labels, and form values follow the same masking policy as visible UI. |

## 8. Verification Evidence

Acceptance claims must include evidence appropriate to risk.

Minimum evidence for most frontend changes:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- focused tests for changed logic
- browser/UI checks at desktop and narrow width when UI changed

Additional evidence when relevant:

- `pnpm verify`
- `cd src-tauri && cargo test`
- `pnpm tauri build`
- Playwright E2E, visual, and accessibility checks
- synthetic fixture evidence, never real private chat data
- release evidence that clearly distinguishes source/UI, mock browser, packaged smoke, and signed release status

Manual acceptance notes should include:

- route or page
- viewport width
- privacy mode on/off
- state tested
- main assertion
- remaining caveat

## 9. Review Workflow

Use this order for non-trivial work:

1. Read and apply `docs/ui-development-standards.md` for UI implementation decisions.
2. Answer the user-perspective heuristic check in section 3.1.
3. Apply the NN/G-to-chatlogUI adoption table in section 3.2.
4. Identify the user task and module.
5. Build a state matrix from section 3.4.
6. Apply page scoring from section 4.1.
7. Apply component checks from section 5.
8. Apply responsive checks from section 6.
9. Apply module-specific checks from section 7.
10. Verify architecture, sidecar contract, privacy, and performance risks.
11. Run evidence commands appropriate to the change.
12. Record residual assumptions and any deferred defects.

If a future requirement is missing from this document, add it rather than relying on memory or chat history.

## 10. Source Traceability Notes

This non-normative map preserves where the product-owner inputs landed so future edits can check for accidental omissions. It is not an additional acceptance checklist and does not freeze examples, temporary findings, or suggestions. If this map conflicts with the normative sections above, update the map rather than weakening the standards.

| Source area | Covered here |
| --- | --- |
| Overall project acceptance: user task coverage | Sections 3.1, 3.3, and 7. |
| Overall project acceptance: state coverage | Sections 2, 3.4, 4.1, 5, 7, and 8. |
| Overall project acceptance: quality dimensions including ISO/IEC 25010-style functionality, performance, compatibility, security, maintainability, and accessibility | Section 3.5 plus the non-negotiable gates in section 2. |
| Separate page design and aesthetics acceptance | Section 4. |
| Required 10-item page score with 0-2 points and a minimum passing score of 16 | Section 4.1. |
| Component checks for Button, IconButton, Input, Field, Modal/Drawer, Tabs, StatusIndicator, Empty State, and Error State | Section 5 plus `docs/ui-development-standards.md`. |
| Responsive layout checks for `<720`, `720-980`, `980-1280`, and `>=1280` | Section 6. |
| Settings Center acceptance | Section 7.1. |
| Sessions and chat history acceptance, including first-page anchor review | Section 7.2. The "50 messages should be the latest 50" point is treated as a current product review suggestion, not a permanent hard constraint. |
| Search acceptance | Section 7.3. |
| Media, favorites, members, unread, and new-message acceptance | Section 7.4. |
| SNS / 朋友圈 acceptance by content type | Section 7.5. |
| AI semantic index, SSE Q&A, and analysis acceptance | Section 7.6. |
| Knowledge Graph acceptance | Section 7.7. |
| Developer tools, diagnostics, export, and privacy acceptance | Section 7.8. |
| Second follow-up: every page, button, module, panel, route, or workflow must answer the user-perspective questions first | Section 3.1 and review workflow section 9. The document preserves all five listed questions even though the user initially called them four. |
| Third follow-up: NN/G link must be analyzed and judged instead of merely linked | Section 3.2 analyzes all 10 NN/G heuristics into chatlogUI acceptance consequences; `docs/ui-development-standards.md` turns them into coding-time rules. |
| NN/G usability heuristics as project-specific checks | Section 3.2 and `docs/ui-development-standards.md`. |
| WCAG target-size development standard | `docs/ui-development-standards.md`, with acceptance gate in section 2 and component checks in section 5. |

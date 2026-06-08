# UX Micro-Affordance Opportunities

Created: 2026-06-08

Purpose: record small, high-leverage usability improvements that are not all immediate defects. Confirmed defects remain in `product-acceptance-issue-ledger.md`; this file tracks enhancement ideas that can reduce guessing, improve confidence, and make dense desktop workflows easier to learn.

## Principles

- Prefer contextual help over long documentation.
- Explain only at the point of uncertainty: icon-only controls, disabled controls, risky actions, technical terms, and compact status indicators.
- Keep tooltip text short. If the explanation needs more than one sentence, use an inline hint, popover, drawer, or diagnostics detail instead.
- Tooltips must be privacy-safe. They should never include raw local paths, chat content, API keys, data keys, wxid-like identifiers, or private message text.
- Tooltip/focus behavior must work for keyboard users, not only mouse hover.

## High-Value Opportunities

### 1. Shared tooltip policy

Priority: high

Status: foundation and high-impact compact command migration implemented 2026-06-08; broad lower-frequency migration still pending.

Idea:
Create one consistent tooltip contract for icon-only and compact controls:
- delayed hover display;
- focus display for keyboard users;
- `aria-describedby` linkage when the tooltip explains the control;
- stable placement inside titlebars, drawers, sidebars, and graph panels;
- privacy-safe text scanning in tests.

Why:
The app now has a shared `Tooltip` atom with id/description linkage, hover delay, focus reveal, placement variants, wrapping, and an `IconButton` path that no longer falls back to native `title`. The high-impact rail, graph, and media-preview command targets have moved to the shared path. Usage is still partial for lower-frequency compact controls outside this slice.

2026-06-08 Step 4 evidence:
Focused source/governance tests, `pnpm e2e:a11y`, `pnpm e2e`, `pnpm e2e:visual`, and `pnpm verify` passed for the high-impact shared-tooltip scope. This does not close native Tauri window smoke or lower-frequency tooltip migration.

Likely first targets:
- window control buttons now use the shared shell control pattern, but native desktop smoke is still required before closing the P0 ledger item;
- global privacy/developer/settings controls;
- lower-frequency inspector and drawer close/open controls;
- QA evidence and inspector close buttons.

### 2. Disabled-reason hints

Priority: high

Status: shared primitive and high-impact reason categories implemented 2026-06-08; lower-frequency/service-readiness states remain pending.

Idea:
When a control is disabled, give a concise reason through adjacent copy or tooltip:
- "先选择一个会话";
- "隐私模式下不可搜索原始数据库";
- "正在加载，完成后可刷新";
- "请先保存 AI 配置";
- "没有上一页/下一页".

Why:
Disabled controls are common, and the current high-impact privacy/missing-selection/loading/busy/pagination/incomplete blockers now use the shared `DisabledReason` primitive. Service/permission readiness and lower-frequency advanced states still need follow-up coverage.

2026-06-08 Step 4 evidence:
Focused source/governance tests, `pnpm e2e:a11y`, `pnpm e2e`, `pnpm e2e:visual`, and `pnpm verify` passed for the high-impact shared-disabled-reason scope. Service/permission readiness and lower-frequency advanced controls remain pending.

Likely first targets:
- service/DB readiness controls outside the migrated high-impact surfaces;
- unsupported or permission-blocked advanced controls;
- remaining rare compact actions where the disabled reason is only implied by status text.

### 3. Status details popovers

Priority: medium

Idea:
Let compact status chips explain their meaning on hover/focus or click:
- service status: whether the sidecar process is running;
- HTTP health: whether `/health` is reachable;
- DB readiness: whether chatlog data can be queried;
- AI index status: configured, building, paused, failed, or ready.

Why:
The app has many status indicators. A small status popover can reduce confusion without expanding the main layout.

Boundary:
Do not expose raw paths, ports beyond a safe summary, secrets, or private chat data in the popover.

### 4. First-run checklist microcopy

Priority: medium

Idea:
Add tiny "what this step needs" hints to setup steps:
- service mode choice;
- import config/data directory;
- manual config;
- service start/connect;
- DB readiness.

Why:
The setup center is the first task. Short explanations can prevent users from treating service-ready and DB-ready as the same thing.

Boundary:
This should be inline copy or field hints, not a large tutorial page.

### 5. Risk-action explanations

Priority: medium

Idea:
For risky or expensive actions, show "what will happen" before the user commits:
- rebuild/clear semantic index;
- graph ingest/write actions;
- cache clear;
- external open;
- diagnostics export;
- stop managed service.

Why:
Confirmations already exist in some places, but a small explanatory line can make the consequence clear before the confirmation state appears.

### 6. Keyboard shortcut discovery

Priority: medium

Idea:
After the shell is stable, add a small shortcut/help surface for repeated desktop tasks:
- toggle privacy mode;
- open settings;
- open/close developer diagnostics when enabled;
- focus global search;
- stop AI streaming;
- close drawers/dialogs.

Why:
Experienced users benefit from shortcuts, but they should be discoverable and not required for first-time use.

Boundary:
Do not add shortcuts until the visible controls and focus paths are correct.

### 7. Search/filter explanations

Priority: low-medium

Idea:
Give compact descriptions for ambiguous filters:
- all chats vs current chat;
- message type filter;
- semantic search window/depth/source limit;
- graph entity type/time window/layout mode.

Why:
These controls are dense and easy to misunderstand. Short hints prevent users from running searches with the wrong scope.

### 8. Safe-open confirmations

Priority: low-medium

Idea:
Use a shared safe-open affordance for local files and external URLs:
- show the action leaves the app or opens a local resource;
- avoid displaying full paths in normal UI;
- provide a clear cancel path.

Why:
This supports the local-private-data model and pairs well with media/SNS enhancements already recorded in the issue ledger.

## Not Enhancement-Only

The following are not optional polish items; they are confirmed issues in `product-acceptance-issue-ledger.md`:

- missing minimize/maximize/close controls in a borderless desktop shell;
- tooltip coverage and accessibility/test gating gaps;
- disabled controls lacking reason/recovery hints;
- target-size, field-description, modal focus, privacy, and release-evidence gaps already listed in the ledger.

# 2026-06-08 Desktop Shell Step 2 Tooltip And Disabled-Reason Primitives Plan

> Scope: detailed repair plan for the third remediation slice requested by the user, corresponding to Step 2 in `docs/superpowers/plans/2026-06-08-desktop-shell-micro-affordance-remediation.md`.
>
> User constraint: this document intentionally does not include full implementation code. It defines the files, ownership, behavior, test targets, acceptance evidence, and handoff rules for shared tooltip and disabled-reason primitives.

## 1. Goal

Turn the current tooltip and disabled-state follow-up fixes into reusable, test-backed primitives.

This step targets:

- `P2-13`: tooltip affordance coverage is inconsistent and not accessibility/test gated.
- `P2-14`: disabled controls often lack a visible reason or recovery hint.

The practical goal is:

- one L4 tooltip contract exists for command explanations;
- one L4 disabled-reason contract exists for disabled controls that block user tasks;
- existing local `sr-only` disabled reasons are migrated to the shared primitive;
- `IconButton` no longer depends on native `title` as its default command explanation path;
- tests and governance prove the pattern without requiring every remaining native `title` usage in the app to be migrated in this slice.

This step should not migrate every compact control in the product. High-impact control migration remains the next remediation slice.

## 2. Inputs Reviewed

Primary planning and issue inputs:

- `docs/superpowers/plans/2026-06-08-desktop-shell-micro-affordance-remediation.md`
- `2026-06-08-desktop-shell-baseline-tests-governance-plan.md`
- `2026-06-08-desktop-shell-window-controls-shared-shell-plan.md`
- `product-acceptance-issue-ledger.md`
- `ux-micro-affordance-opportunities.md`
- `task_plan.md`
- `findings.md`
- `progress.md`

Acceptance and development constraints:

- `AGENTS.md`
- `docs/product-acceptance-standards.md`
- `docs/ui-development-standards.md`
- `.specify/memory/constitution.md`
- `specs/001-ready-desktop-app/spec.md`
- `docs/总体开发规划.md`
- `开发指南.md`
- `docs/ui-functional-audit-and-redesign-plan.md`

Current source and tests:

- `src/l4-atom/ui/Tooltip.tsx`
- `src/l4-atom/ui/IconButton.tsx`
- `src/l4-atom/ui/Button.tsx`
- `src/l4-atom/ui/Input.tsx`
- `src/l4-atom/ui/Field.tsx`
- `src/l4-atom/ui/StatusIndicator.tsx`
- `src/l4-atom/ui/index.ts`
- `src/l4-atom/ui/Tooltip.test.tsx`
- `src/l3-molecule/developer/DbSearchPanel.tsx`
- `src/l3-molecule/developer/DbSearchPanel.test.tsx`
- `src/l3-molecule/media/MediaLibrary.tsx`
- `src/l3-molecule/media/MediaLibrary.test.tsx`
- `src/l3-molecule/search/SearchScopeMenu.tsx`
- `src/l3-molecule/search/SearchScopeMenu.test.tsx`
- `src/l3-molecule/semantic/QAInput.tsx`
- `src/l3-molecule/semantic/QAInput.test.tsx`
- `src/l3-molecule/graph/GraphAdvancedPanel.tsx`
- `src/l3-molecule/graph/GraphAdvancedPanel.test.tsx`
- `src/l3-molecule/graph/GraphQAPanel.tsx`
- `src/l3-molecule/graph/GraphQAPanel.test.tsx`
- `src/styles/layout.css`
- `scripts/ui-governance.test.mjs`
- `e2e/specs/a11y.spec.ts`
- `e2e/specs/core.spec.ts`
- `e2e/utils/privacy-scan.ts`

## 3. Current Progress

Step 0 and Step 1 have already changed the worktree. Do not treat this plan as if the codebase is still at the original RED state.

Current tooltip state:

- `src/l4-atom/ui/Tooltip.tsx` now accepts or generates an id, clones a valid trigger child, merges `aria-describedby`, and renders `role="tooltip"`.
- `src/styles/layout.css` now delays pointer hover reveal and keeps focus reveal immediate.
- `src/l4-atom/ui/Tooltip.test.tsx` covers stable id and `IconButton` description linkage.
- `e2e/specs/a11y.spec.ts` covers a representative tooltip-enabled settings command and pointer delay behavior.
- `scripts/ui-governance.test.mjs` requires `IconButton` call sites to pass tooltip copy.

Current disabled-reason state:

- High-impact components now expose representative reason copy with `aria-describedby` and local `.sr-only` text:
  - `DbSearchPanel`
  - `MediaLibrary`
  - `SearchScopeMenu`
  - `QAInput`
  - `GraphAdvancedPanel`
  - `GraphQAPanel`
- Corresponding component tests now assert representative reason text and description linkage.
- `scripts/ui-governance.test.mjs` no longer expects unresolved disabled-reason debt in those high-impact files; it treats disabled lines without `aria-describedby` as untracked debt.

Remaining primitive gaps:

- There is no shared `DisabledReason` or equivalent L4 UI primitive. The current reason copy is repeated locally as hand-written ids and `p.sr-only` nodes.
- `Tooltip` still has a narrow fixed placement and alignment model. It works for the current titlebar/global settings case, but it is not yet a contract for rail, drawer, graph control, toolbar, or dense-panel migration.
- `IconButton` still has native `title={tooltip ? undefined : label}` fallback. Governance currently prevents untooltipped call sites, but the atom still contains native-title fallback behavior.
- Native `title` command debt remains explicitly tracked in `scripts/ui-governance.test.mjs`, including workbench rail, graph controls, graph timeline, status indicator, semantic setup cards, and other non-command/data-display cases.
- Disabled reason copy currently covers mainly privacy and missing-selection states. The shared primitive must also support loading/busy, not configured, service/DB readiness, unsupported, no pagination, and destructive confirmation prerequisites.

## 4. User-Task Check

Real user task:

A user needs to understand what an icon-only or compact control does, and why an advertised action is unavailable, without guessing from icon shape, disabled styling, or prior memory.

First action:

For icon-only commands, the user can hover or focus the command to read a short explanation. For disabled high-impact actions, the user sees or can access a reason and a recovery path at the point of need.

Duplicate entry points:

There should be one tooltip primitive and one disabled-reason primitive. Individual modules should not invent one-off hover spans, arbitrary `title` text, or bespoke hidden descriptions.

Recovery and freedom:

Disabled reasons should say what the user can do next: select a conversation, turn off privacy mode, wait for loading to finish, save configuration, build an index, or retry readiness.

Missing adjacent function:

This step creates the foundation. It should not claim all compact controls are migrated. The next remediation step applies the primitives to workbench rail, graph toolbar/timeline, media, search, developer, semantic, and graph advanced call sites.

## 5. Architecture Ownership

| Concern | Owner | Required shape |
| --- | --- | --- |
| Tooltip primitive | L4 UI | `Tooltip` owns trigger description linkage, placement classes, visibility delay, and privacy-safe content rendering. |
| Icon command atom | L4 UI | `IconButton` owns accessible label, target size, and shared tooltip integration; it does not rely on native `title` for command explanation. |
| Disabled reason primitive | L4 UI | `DisabledReason` or equivalent owns stable id, description merging, visible/screen-reader variants, and class naming. |
| Disabled state decision | L2/L3 usage | L2 view models or L3 props decide why a control is disabled; L4 only renders the reason contract. |
| High-impact usage | L3 molecules | Components pass static or redaction-safe reason copy and avoid leaking private content. |
| Governance | Scripts/tests | Governance tracks native-title debt and disabled-reason usage without blocking unrelated historical debt. |
| Privacy | L2/L3 copy policy plus E2E scan | Tooltip/reason text must not include raw paths, keys, query content, API tokens, table internals, or private chat data. |

## 6. Planned Source Changes

### 6.1 Tooltip Primitive Contract

Modify:

- `src/l4-atom/ui/Tooltip.tsx`
- `src/l4-atom/ui/Tooltip.test.tsx`
- `src/styles/layout.css`

Required behavior:

- Preserve stable id generation and explicit `id` support.
- Preserve merging with an existing `aria-describedby` value.
- Keep keyboard focus reveal immediate.
- Keep pointer hover reveal delayed enough to avoid noisy flyouts.
- Add placement/alignment variants needed by titlebar, rail, toolbar, graph panel, and drawer contexts.
- Provide a wrapping strategy that keeps tooltip text within narrow viewport constraints.
- Support class names or variant props only where they serve layout placement, not arbitrary visual theming.
- Keep tooltip content static or caller-supplied safe copy. Do not derive tooltip text from private runtime content.

Recommended placement vocabulary:

| Variant | Intended use |
| --- | --- |
| `top-end` | titlebar and right-aligned toolbar commands. |
| `top` | centered toolbar controls. |
| `right` | collapsed rail commands. |
| `bottom` | top toolbar controls where upward space is unavailable. |
| `left` | right drawer or inspector controls near the window edge. |

Implementation boundary:

- The primitive can stay CSS-driven for this slice.
- Do not add Floating UI or another positioning dependency unless a local implementation attempt proves CSS cannot satisfy the current route matrix.
- If CSS placement cannot fully avoid viewport clipping, document the remaining case and keep Step 3 migration conservative.

Exit:

- Tooltip unit tests pass.
- Browser a11y tooltip tests pass for focus and hover delay.
- Tooltip text wraps or constrains on narrow widths instead of overflowing the app frame.

### 6.2 IconButton Tooltip Policy

Modify:

- `src/l4-atom/ui/IconButton.tsx`
- `src/l4-atom/ui/Tooltip.test.tsx`
- `scripts/ui-governance.test.mjs`

Required behavior:

- Preserve `aria-label={label}`.
- Prefer shared `Tooltip` when `tooltip` is supplied.
- Remove or retire the native `title` fallback for command explanations.
- Keep `tooltip` optional at the atom type level only if the policy remains that obvious icon commands may use the accessible label alone.
- Keep governance stricter than the atom if the current product decision is "all `IconButton` command call sites must pass tooltip copy".
- Support tooltip copy that can differ from accessible label. Example direction:
  - accessible label: `设置`
  - tooltip copy: `打开设置`

Non-goals:

- Do not make every `IconButton` automatically show a tooltip equal to its label if that would create noisy duplicate copy.
- Do not use native `title` as a shortcut for delayed tooltip behavior.
- Do not weaken the current `IconButton` call-site governance without a documented product decision.

Exit:

- No migrated command relies on native `title`.
- `IconButton` tests assert the shared tooltip path.
- `scripts/ui-governance.test.mjs` no longer needs to allowlist `src/l4-atom/ui/IconButton.tsx: title={tooltip ? undefined : label}` if the fallback is removed.

### 6.3 Disabled-Reason Primitive

Create:

- `src/l4-atom/ui/DisabledReason.tsx`
- `src/l4-atom/ui/DisabledReason.test.tsx`

Modify:

- `src/l4-atom/ui/index.ts`
- `src/styles/layout.css`

Required behavior:

- Provide a stable reason id, with explicit `id` support for deterministic component tests.
- When wrapping a valid control child, merge the reason id into the child's existing `aria-describedby`.
- Support at least two display variants:
  - screen-reader-only reason for dense secondary controls where surrounding visible copy is already sufficient;
  - visible inline or compact reason for primary workflow blockers.
- Allow visible reason text to be rendered adjacent to, not inside, native disabled buttons.
- Avoid making a disabled native button fake-focusable by default.
- If any future usage chooses `aria-disabled` for focusability, the primitive or consuming component must require an explicit click guard and tests.
- Accept only `ReactNode` copy; do not inspect application state or fetch data.

Recommended display vocabulary:

| Variant | Intended use |
| --- | --- |
| `sr-only` | Secondary dense controls with nearby visible context. |
| `inline` | Primary workflow blockers, form-level prerequisites, or repeated user confusion points. |
| `compact` | Short helper text near a small control cluster. |

Reason categories to support in copy:

- privacy mode
- missing selection
- loading/busy
- not configured
- service not ready
- DB not ready
- no previous/next page
- unsupported in current mode
- dangerous action needs confirmation

Non-goals:

- Do not centralize product-specific reason strings inside L4.
- Do not add business state, stores, or network imports to L4.
- Do not force every disabled control in the app to use this primitive in the same commit.

Exit:

- `DisabledReason.test.tsx` proves stable ids, description merging, visible variant, screen-reader-only variant, and existing-description preservation.
- The component is exported from `src/l4-atom/ui/index.ts`.
- CSS classes are token-based and do not introduce decorative card styling.

### 6.4 Migrate Existing Local Disabled Reasons To The Primitive

Modify:

- `src/l3-molecule/developer/DbSearchPanel.tsx`
- `src/l3-molecule/media/MediaLibrary.tsx`
- `src/l3-molecule/search/SearchScopeMenu.tsx`
- `src/l3-molecule/semantic/QAInput.tsx`
- `src/l3-molecule/graph/GraphAdvancedPanel.tsx`
- `src/l3-molecule/graph/GraphQAPanel.tsx`

Update tests:

- `src/l3-molecule/developer/DbSearchPanel.test.tsx`
- `src/l3-molecule/media/MediaLibrary.test.tsx`
- `src/l3-molecule/search/SearchScopeMenu.test.tsx`
- `src/l3-molecule/semantic/QAInput.test.tsx`
- `src/l3-molecule/graph/GraphAdvancedPanel.test.tsx`
- `src/l3-molecule/graph/GraphQAPanel.test.tsx`

Required behavior:

- Preserve the current user-facing meaning of the reason text.
- Replace hand-written `p.sr-only` reason blocks with the shared primitive.
- Keep deterministic ids where existing tests or E2E selectors benefit from stable ids.
- Keep current privacy protections: input values and placeholders must not reveal private query, graph draft, or DB search text when privacy mode is on.
- Do not broaden the migration to new UX behavior in this step unless the primitive makes a current test easier to satisfy.

Recommended variant decisions:

| Area | Recommended variant | Reason |
| --- | --- | --- |
| DB search privacy block | `sr-only` or `compact` | Developer panel is dense; visible header already implies privacy mode, but recovery should be accessible. |
| Media refresh before conversation selected | `sr-only` with existing empty state visible | The empty state already visibly tells users to choose a session. |
| Search current-scope unavailable | `compact` if the toolbar has room, otherwise `sr-only` | The disabled scope is easy to miss in a toolbar. |
| Semantic QA privacy block | `inline` or compact visible reason | The composer is a primary workflow and disabled native controls are not focusable. |
| Graph advanced privacy block | `inline` or compact visible reason | Write/QA actions are high-impact and privacy-blocked. |
| Graph QA privacy block | `inline` or compact visible reason | The panel is a primary action surface. |

Exit:

- All current high-impact disabled-reason tests remain green.
- Tests assert use of the shared reason contract where practical, not just raw copy existence.
- No reason copy includes local paths, raw queries, table names, graph draft content, API keys, tokens, or private chat text.

### 6.5 CSS And Visual Behavior

Modify:

- `src/styles/layout.css`

Required behavior:

- Tooltip:
  - delayed pointer reveal;
  - immediate focus reveal;
  - max width and wrapping;
  - high enough stacking for titlebar/drawer use;
  - no overlap with command hit target focus ring;
  - placement variants as class modifiers.
- Disabled reason:
  - `sr-only` variant can reuse the existing `.sr-only` utility;
  - inline/compact variants use existing color tokens and spacing rhythm;
  - reason text wraps and does not resize fixed-format toolbars unexpectedly;
  - no nested card styling;
  - no decorative gradients, blur, or oversized typography.

Responsive requirements:

- At `<720px`, tooltip text must fit within the viewport or wrap safely.
- Disabled reason text must not overlap controls or hide bottom actions.
- Fixed toolbars should not grow unpredictably from a hidden reason; visible variants should be used where the layout can intentionally accommodate them.

Exit:

- Desktop and narrow browser checks show no overlap caused by tooltip/reason UI.
- `git diff --check` has no whitespace errors for touched CSS.

## 7. Planned Test Changes

### 7.1 L4 Tooltip Tests

Modify:

- `src/l4-atom/ui/Tooltip.test.tsx`

Add or preserve assertions for:

- stable explicit id;
- generated id appears on the tooltip element;
- trigger `aria-describedby` points to the tooltip id;
- existing `aria-describedby` values are preserved and appended;
- placement class or variant is rendered when requested;
- `IconButton` with tooltip uses shared tooltip and not native `title`;
- tooltip content is not duplicated into the button accessible label.

### 7.2 L4 DisabledReason Tests

Create:

- `src/l4-atom/ui/DisabledReason.test.tsx`

Assertions:

- explicit id is used;
- generated id exists when no id is supplied;
- valid child receives `aria-describedby`;
- existing child `aria-describedby` is preserved;
- `sr-only` variant renders the existing hidden-text class;
- visible variant renders a tokenized reason class;
- invalid or text children render safely without throwing;
- reason copy is rendered exactly once.

### 7.3 Existing Component Tests

Modify the current high-impact tests only as much as needed:

- Keep current privacy/missing-selection reason assertions.
- Add one assertion that the shared primitive class or shared description contract appears.
- Avoid brittle tests that depend on exact DOM depth.
- Preserve current synthetic test data wording.

### 7.4 Browser A11y Tests

Modify:

- `e2e/specs/a11y.spec.ts`

Required checks:

- Existing tooltip focus and hover delay tests remain green.
- Add a narrow-width tooltip check if placement changes create risk.
- Add one representative disabled-reason browser check only if component/unit tests cannot cover the actual focus/description path.
- Keep axe checks after tooltip focus.
- Keep privacy guard active when showing tooltip/reason text in synthetic workbench mode.

### 7.5 Governance Tests

Modify:

- `scripts/ui-governance.test.mjs`

Required governance changes:

- Remove `IconButton.tsx` native `title` allowlist entry if the atom fallback is removed.
- Keep command native-title debt explicit for components not migrated in this slice.
- Add a small rule or ledger that high-impact disabled reason usage should go through the shared primitive rather than raw local `sr-only` nodes.
- Keep data-display `title` cases separate from command tooltip debt:
  - graph fallback table truncation;
  - trend chart data point title;
  - status indicator title until status popover work exists.
- Do not fail the whole product on legacy native-title command debt that belongs to the next migration slice, as long as the debt is explicit.

Exit:

- Governance passes and prevents new untracked command-title or disabled-reason debt.

## 8. Command Plan

Before implementation:

- `pnpm test src/l4-atom/ui/Tooltip.test.tsx`
- `pnpm test src/l3-molecule/developer/DbSearchPanel.test.tsx src/l3-molecule/media/MediaLibrary.test.tsx src/l3-molecule/search/SearchScopeMenu.test.tsx src/l3-molecule/semantic/QAInput.test.tsx src/l3-molecule/graph/GraphAdvancedPanel.test.tsx src/l3-molecule/graph/GraphQAPanel.test.tsx`
- `pnpm test scripts/ui-governance.test.mjs`
- `pnpm exec playwright test e2e/specs/a11y.spec.ts --grep "tooltip"`

Expected current status:

- These commands are expected to be mostly green in the current worktree because a follow-up source fix already landed.
- The new `DisabledReason.test.tsx` should be RED when first added because the primitive does not exist.
- Any test that asserts "no native title fallback inside `IconButton`" should be RED until `IconButton` is updated.

After primitive implementation:

- `pnpm test src/l4-atom/ui/Tooltip.test.tsx src/l4-atom/ui/DisabledReason.test.tsx`
- `pnpm test scripts/ui-governance.test.mjs`
- `pnpm typecheck`

After high-impact local migration:

- `pnpm test src/l3-molecule/developer/DbSearchPanel.test.tsx src/l3-molecule/media/MediaLibrary.test.tsx src/l3-molecule/search/SearchScopeMenu.test.tsx src/l3-molecule/semantic/QAInput.test.tsx src/l3-molecule/graph/GraphAdvancedPanel.test.tsx src/l3-molecule/graph/GraphQAPanel.test.tsx`
- `pnpm test scripts/ui-governance.test.mjs`
- `pnpm typecheck`

Browser/UI checks:

- `pnpm exec playwright test e2e/specs/a11y.spec.ts --grep "tooltip"`
- `pnpm e2e:a11y`
- `pnpm e2e`
- `pnpm e2e:visual` if CSS placement or visible disabled reason variants change layout.

Full verification after the slice:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm verify`

Rust/Tauri:

- `cd src-tauri && cargo test` is not required for this slice unless Rust/Tauri files unexpectedly change.
- `pnpm tauri build` is not required for primitive-only source closure, but can be run if the branch is being bundled together with Step 1 desktop-shell release evidence.

## 9. Sequencing

### Task 2.1: Confirm Current Green/Partial-Green Baseline

Files:

- Current tooltip, disabled-reason, governance, and a11y test files.

Work:

- Run the current targeted tooltip/disabled reason checks.
- Record which tests are already green due to the current follow-up source fix.
- Confirm no current work is accidentally reverted.

Exit:

- The implementer knows this is a formalization/migration step, not the original RED baseline.

### Task 2.2: Add DisabledReason RED Tests

Files:

- Create `src/l4-atom/ui/DisabledReason.test.tsx`.

Work:

- Define stable id, generated id, description merging, `sr-only`, visible, and existing-description behavior.
- Keep tests focused on the shared primitive, not product-specific components.

Exit:

- The new test fails because `DisabledReason.tsx` does not exist.

### Task 2.3: Implement DisabledReason Primitive

Files:

- Create `src/l4-atom/ui/DisabledReason.tsx`.
- Modify `src/l4-atom/ui/index.ts`.
- Modify `src/styles/layout.css`.

Work:

- Implement a small L4 UI primitive with no app state.
- Add tokenized CSS classes for hidden and visible variants.
- Export the primitive.

Exit:

- `pnpm test src/l4-atom/ui/DisabledReason.test.tsx` passes.
- `pnpm typecheck` passes.

### Task 2.4: Harden Tooltip Placement And IconButton Policy

Files:

- Modify `src/l4-atom/ui/Tooltip.tsx`.
- Modify `src/l4-atom/ui/IconButton.tsx`.
- Modify `src/l4-atom/ui/Tooltip.test.tsx`.
- Modify `src/styles/layout.css`.

Work:

- Add placement/alignment support.
- Keep id/description behavior intact.
- Remove native `title` fallback if the product decision remains shared-tooltip-only for command explanations.
- Adjust tests for the final atom contract.

Exit:

- Tooltip tests pass.
- Governance no longer needs the `IconButton` native title allowlist entry if fallback is removed.

### Task 2.5: Migrate Existing Local Disabled Reasons

Files:

- `DbSearchPanel.tsx`
- `MediaLibrary.tsx`
- `SearchScopeMenu.tsx`
- `QAInput.tsx`
- `GraphAdvancedPanel.tsx`
- `GraphQAPanel.tsx`
- their existing tests

Work:

- Replace local `sr-only` reason blocks with the shared primitive.
- Preserve current reason copy and ids where useful.
- Use visible variants only where the component is a primary workflow blocker and layout supports it.

Exit:

- All six component test files pass.
- No privacy-mode regression appears in rendered static markup.

### Task 2.6: Update Governance For Shared Primitive Usage

Files:

- `scripts/ui-governance.test.mjs`

Work:

- Remove obsolete native-title allowlist entries that this step eliminates.
- Keep native-title debt for next-slice migration explicit.
- Add a rule or tracked expectation that high-impact disabled reason usage imports/uses the shared primitive instead of raw local hidden paragraphs.

Exit:

- Governance passes.
- New untracked `title=` or disabled-reason bypasses fail.

### Task 2.7: Browser And Layout Acceptance

Files:

- `e2e/specs/a11y.spec.ts`
- `src/styles/layout.css`

Work:

- Re-run tooltip focus/hover tests.
- Add one narrow tooltip placement check if needed.
- Run a11y and visual checks when CSS changed.

Exit:

- Tooltip remains keyboard available and delayed on pointer.
- No serious/critical axe violation is introduced.
- Tooltip/reason text does not overflow or overlap key controls.

### Task 2.8: Documentation And Ledger Follow-Up

Files:

- `product-acceptance-issue-ledger.md`
- `ux-micro-affordance-opportunities.md`
- `findings.md`
- `progress.md`

Work:

- After implementation and verification, update `P2-13` and `P2-14` to reflect the real state:
  - shared primitive implemented;
  - local high-impact disabled reason usages migrated;
  - broader high-impact control migration still pending if workbench rail/graph toolbar/native title debt remains.
- Do not mark all tooltip coverage as fully remediated until the next migration slice removes the remaining command-title debt.

Exit:

- Documentation distinguishes primitive foundation completion from full control migration.

## 10. Privacy And Copy Policy

Allowed tooltip/reason copy:

- static command labels;
- static recovery hints;
- redaction-safe status summaries;
- generic prerequisites such as "先选择一个会话" or "关闭隐私模式后可继续".

Forbidden tooltip/reason copy:

- raw local filesystem paths;
- `dataKey`, API keys, provider keys, tokens, or token-like examples;
- raw DB table names from a real user environment;
- raw query text;
- graph business/event draft content;
- private chat names or message content;
- raw sidecar error strings unless translated and redacted upstream.

Localization:

- User-facing tooltip and disabled reason copy should be Chinese unless the surrounding panel is intentionally technical and already uses English technical labels.
- Developer-only English labels such as `DB Search` can remain where they already exist, but recovery copy should still be plain and privacy-safe.

Reason copy pattern:

- Say why the control is unavailable.
- Say the recovery path when one exists.
- Avoid simply repeating "已禁用".
- Avoid long paragraphs; if the explanation needs more than one sentence, use visible inline help or a details surface, not a tooltip-only explanation.

## 11. UI Acceptance

Tooltip behavior:

- Meaningful for keyboard and pointer users.
- Does not flicker during normal pointer movement.
- Does not cover the focused control in a way that hides the focus ring.
- Does not overflow narrow viewports.
- Uses restrained visual styling and project tokens.

Disabled reason behavior:

- Primary workflow blockers should have visible or compact helper text where layout allows it.
- Dense secondary controls can use screen-reader-only reason text if surrounding visible empty/error state already explains the prerequisite.
- Native disabled buttons must not be the only way to discover a hidden reason because they are not focusable.
- Controls retain stable target dimensions across enabled, disabled, loading, and reason-visible states.

Design score impact:

- This step should improve recognition rather than recall and help/recovery heuristics.
- It should not make dense panels noisier by showing long helper text everywhere.
- It should not add cards, gradients, blobs, or decorative UI for micro-affordances.

## 12. Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| The primitive over-abstracts and makes simple controls harder to read | Keep the primitive small: id, description linkage, visible/hidden variants, and tokenized classes only. |
| Removing `IconButton` native title changes legacy behavior | Governance already requires tooltip copy at call sites; add focused tests before removal. |
| Disabled native buttons remain undiscoverable to keyboard users | Use visible/compact reason variants for primary workflow blockers; do not rely on hover-only tooltips for disabled native buttons. |
| Tooltip placement still clips near viewport edges | Add conservative placement variants and test narrow/titlebar cases; defer complex collision handling unless evidence requires a dependency. |
| Governance blocks unrelated historical `title` debt | Keep command-title debt explicit and scoped; separate data-display truncation title cases from command explanations. |
| Tooltip/reason text leaks private content | Keep copy static/redaction-safe and reuse privacy scans for visible text and attributes. |
| Existing high-impact tests become brittle after primitive migration | Assert description linkage and reason copy, not exact DOM nesting. |

## 13. Non-Goals

- Do not migrate every remaining native `title` command in this step.
- Do not redesign Workbench navigation, Graph toolbar, Graph timeline, media preview, diagnostics, or semantic drawer controls in this step.
- Do not change sidecar APIs, network fetchers, Tauri capabilities, CSP, release workflow, or backend behavior.
- Do not introduce telemetry, remote calls, or a third-party positioning dependency without local evidence.
- Do not put full implementation code into this plan.
- Do not mark `P0-05` fully remediated unless native Tauri smoke has separately confirmed window behavior.
- Do not mark `P2-13` or `P2-14` fully remediated until primitive implementation and high-impact migration coverage are separately verified.

## 14. Acceptance Criteria For This Plan

This Step 2 plan is ready when:

- It reflects the current partial source implementation instead of the older RED-only state.
- It names exact files to create and modify.
- It keeps UI primitive behavior in L4 and product-specific reasons in L2/L3 usage.
- It defines Tooltip, IconButton, DisabledReason, CSS, test, E2E, and governance changes.
- It distinguishes primitive-foundation completion from broad high-impact control migration.
- It preserves privacy constraints and avoids private-data exposure through visible text, attributes, screenshots, traces, or tests.
- It avoids full implementation code.
- It leaves unrelated product-acceptance ledger items open.


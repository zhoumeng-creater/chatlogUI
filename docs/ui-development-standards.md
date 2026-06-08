# chatlogUI UI Development Standards

> This file is a development-time standard. Read it before writing or changing UI code, not only during final review. `docs/product-acceptance-standards.md` remains the acceptance contract; this file explains how UI should be built so it can pass that contract.

## 1. Source Interpretation

### 1.1 WCAG 2.2 Target Size Minimum

Source: W3C WAI, [Understanding Success Criterion 2.5.8: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Project interpretation:

- WCAG 2.2 SC 2.5.8 is a Level AA target-size criterion for pointer input.
- The practical baseline is that interactive targets should be at least `24 x 24 CSS px`, unless a documented exception applies.
- Exceptions such as equivalent controls, inline text links, user-agent/native controls, essential presentation, or sufficient spacing are allowed by the criterion, but chatlogUI must not use them as a shortcut for cramped UI.
- For this app, target size is a development standard because many controls are dense: sidebars, tabs, toolbar icon buttons, chat rows, media grids, diagnostics filters, graph controls, drawer close buttons, and dangerous confirmation actions.

### 1.2 NN/G Usability Heuristics

Source: Nielsen Norman Group, [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/).

Project interpretation:

- The NN/G heuristics are review principles, but chatlogUI uses them earlier: while choosing layout, copy, component behavior, state models, and recovery paths.
- They are not a replacement for product requirements, architecture rules, accessibility checks, visual QA, or test evidence.
- The adopted chatlogUI mapping lives in `docs/product-acceptance-standards.md`; this file turns that mapping into coding-time decisions.

## 2. Development-Time UI Gates

Before implementing or changing a route, panel, component, button, menu, drawer, modal, list row, chart, graph control, or media control, answer:

| Gate | Development decision it should affect |
| --- | --- |
| What real user task is this UI serving? | Choose layout, title, primary action, and data dependencies from the task, not from component availability. |
| What should the first-time user do first? | Make the first step visually obvious; avoid burying it behind secondary controls or debug terminology. |
| Are there duplicate entry points for the same task? | Merge, rename, or clearly separate them before adding another button/tab/menu item. |
| Can the user cancel, go back, recover, or understand the next step? | Implement stop, back, close, retry, reset, diagnostics, or settings navigation before the UI is considered usable. |
| Is another missing feature making this UI feel broken? | Surface the missing prerequisite or dependency instead of pretending the current screen is complete. |

If these gates cannot be answered, stop and clarify the task model before coding.

## 3. Pointer Target Size Standards

### 3.1 Hard Minimum

Every interactive pointer target must meet at least one of these:

- target box is at least `24 x 24 CSS px`;
- target has enough spacing that a `24 x 24 CSS px` area centered on it does not overlap adjacent targets;
- it is an inline text link inside flowing text and is not a primary command;
- it is a native/user-agent control whose size is not overridden;
- the small target is essential to representing the underlying content, and the exception is documented.

If a visible icon or glyph is smaller than 24 px, expand the hit area with padding or an invisible target box. Do not rely on the visible glyph size as the clickable area.

### 3.2 Project Defaults

Use these defaults unless the component contract says otherwise:

| Control type | Development standard |
| --- | --- |
| Primary/secondary form buttons | At least `40 x 40 CSS px` target area; text must not clip. |
| Toolbar/IconButton controls | At least `32 x 32 CSS px`; `36 x 36 CSS px` preferred in normal density. |
| Dense table/list row actions | At least `28 x 28 CSS px`; if smaller visual treatment is needed, keep the hit target larger than the icon. |
| Tabs and segmented controls | Each tab target at least `32 px` high; narrow mode may scroll, collapse, or use drawer navigation rather than shrinking targets below minimum. |
| Drawer/modal close and confirm controls | At least `40 x 40 CSS px`; destructive confirmations should be easy to hit and hard to trigger accidentally. |
| Media playback/open/copy controls | At least `36 x 36 CSS px`; use visible disabled/error states for unavailable media. |
| Graph canvas controls | Zoom, reset, fit, filter, and inspector controls must meet normal button target sizes even if graph nodes themselves are data marks. |
| Inline links inside message text | May use inline text-link exception, but primary actions such as open file, open original image, retry, or copy diagnostics must use real controls. |
| Narrow viewport controls | Prefer `40 x 40 CSS px` or larger for frequent and navigation-critical actions. |

### 3.3 Spacing And Overlap

- Adjacent small controls must have enough spacing to avoid accidental activation.
- Floating controls, row actions, and icon clusters must not overlap scrollbars, drawer handles, bottom status bars, or window edges.
- The visual focus ring should cover the actual hit target, not only the small icon inside it.
- Disabled controls still need stable dimensions so loading, disabled, and enabled states do not shift layout.

### 3.4 Exceptions

Exceptions must be rare and explicit. If a target does not meet the hard minimum, document why in the task notes, review notes, or component comment:

- what exception applies;
- why increasing size would harm the task or representation;
- what equivalent or recovery path exists;
- how keyboard access remains usable.

## 4. NN/G Heuristics As Coding Rules

Use this table while designing implementation, not only after code exists.

| Heuristic | Coding rule for chatlogUI |
| --- | --- |
| System status visibility | Model every async flow with explicit status: idle, loading, success, empty, error, timeout, cancelling, cancelled, stale, or partial where applicable. |
| Match user language | Translate backend/API terms in L2 or view models before L3 renders copy. Do not leak raw endpoint names, internal enum names, or generic error objects into UI. |
| User control and freedom | Long-running work needs stop/cancel where possible. Drawers/modals need close/back behavior. Destructive or expensive actions need confirmation and a visible recovery path. |
| Consistency and standards | Reuse existing atoms and interaction patterns before creating a new control. Same operation should have the same label, icon, state copy, and confirmation model across modules. |
| Error prevention | Validate before submitting. Disable repeated submit while pending. Guard external open, cache clear, rebuild, ingest, export, and privacy-sensitive operations. |
| Recognition over recall | Keep active scope, filters, selected contact/session, readiness, and AI/graph context visible. Do not require the user to remember a previous setup step. |
| Flexibility and efficiency | Add shortcuts, saved choices, quick filters, and developer controls only when they do not confuse first-time paths or duplicate main entry points. |
| Aesthetic/minimal design | Prefer fewer, clearer controls. Move advanced/debug detail into inspector, drawer, disclosure, or developer tools instead of crowding the primary task. |
| Error recovery | Error UI must include plain-language cause, next step, and appropriate actions: retry, copy diagnostics, settings, developer tools, or safe exit. |
| Help and documentation | Use inline hints and examples at decision points. Documentation links are supplementary; they do not excuse unclear UI. |

## 5. Component Implementation Standards

### 5.1 Buttons And Icon Buttons

- Use `primary` only for the single main action in a region.
- Use `danger` for destructive actions and require confirmation.
- Loading buttons must prevent duplicate submission.
- Icon-only controls require `aria-label`, tooltip when meaning is not obvious, visible focus, and target size from section 3.
- Do not reduce icon button size just to fit more actions into a row; use overflow menus, drawers, or row expansion.

### 5.2 Inputs, Fields, And Filters

- Inputs need visible labels or accessible labels; placeholder-only labeling is not acceptable.
- Field hints and errors should be connected through accessible descriptions.
- Filters must show active state and clearing behavior.
- Search inputs should distinguish empty query, typing, searching, no result, and error.

### 5.3 Lists, Tables, And Rows

- Row-level actions must not be so small or close together that the wrong action is likely.
- Selection, hover, focus, active, disabled, and privacy-masked states must be visually distinct.
- Long names, remarks, usernames, message snippets, URLs, and mixed Chinese/English text must not break row layout.

### 5.4 Modals, Drawers, Inspectors, And Menus

- Esc/close/back behavior must be intentional and tested where applicable.
- Focus should move into the overlay and return when closed.
- Bottom actions must remain reachable on narrow screens.
- Menus and drawers should not become dumping grounds for unrelated entry points.

## 6. Evidence Expected During Development

For UI changes, development notes or review notes should include:

- which user task and first step were designed for;
- how the NN/G coding rules affected the implementation;
- pointer target decisions for compact controls;
- desktop and narrow viewport behavior;
- loading, empty, error, success, disabled, and privacy mode handling;
- any target-size exception and why it is acceptable;
- relevant automated checks or browser evidence.

If the work changes only documentation or standards, verify with file existence, section scans, and entry-point references. If the work changes UI code, use the verification commands required by `AGENTS.md` and `docs/product-acceptance-standards.md`.

# P2-E Visual QA And Accessibility Plan

## Goal

Create the repeatable visual and accessibility gate that prevents regressions where commands pass but the desktop app is visually broken, horizontally overflowing, or misleading to keyboard/screen-reader users.

## Scope

- Browser matrix for `/`, `/workbench`, and `/settings` at desktop, tablet, narrow, and mobile-ish widths.
- Check loading, empty, error, success, invalid, cancelled, and privacy-on states.
- Verify keyboard focus order for setup, search, transcript controls, inspector actions, settings tabs, and modal flows.
- Confirm no raw private data appears in visible text, `aria-label`, `alt`, status text, browser console logs, or screenshots when privacy mode is enabled.
- Track screenshots and smoke notes in release evidence instead of ad hoc progress notes only.

## Required Checks

- No horizontal overflow.
- No overlapping or clipped text in command buttons, cards, rows, inspector panels, or narrow drawers.
- Touch/click targets are at least visually stable and comfortably selectable.
- Search invalid/empty/error/cancelled/success states are visible and distinct.
- Long transcript DOM remains bounded under a synthetic 10,000-message dataset.
- Stats trend table fallback appears when inspector width is narrow.
- Favicon and asset requests do not produce avoidable 404s.

## Verification

- `pnpm verify`
- Browser smoke with console capture.
- Rendered screenshot review for at least one wide and one narrow viewport per primary route.

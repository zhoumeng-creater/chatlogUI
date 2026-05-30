---
name: ui-acceptance
description: Use for implementing, polishing, or reviewing chatlogUI interface screens and components. Requires route/state/responsive checks.
---

# ui-acceptance

## Purpose

Make UI changes shippable, not just visually improved.

## Before coding

Identify:

- route/page/component
- user goal
- data source
- owner layer
- required states
- desktop and narrow-width behavior

## Required states

For every user-facing feature:

- loading
- empty
- error
- success
- retry or next-step guidance when applicable

## Architecture checks

- L1 pages do layout and delegate events.
- L2 handles state, orchestration, backend calls, and error translation.
- L3 components receive data and callbacks.
- L4 UI atoms are reusable and state-free.
- No direct L1/L3 fetches.

## Visual checks

Check:

- `/`
- `/dashboard`
- `/settings`
- feature route/panel
- desktop width
- narrow width
- long content
- empty content
- backend error

## Report format

```text
Route/component:
Aesthetic direction:
States covered:
Responsive checks:
Changed files:
Verification:
Known UI debt:
```

# Architecture Boundary Checklist

This checklist records the current L1/L2/L3/L4 boundary expectations for the ready desktop app work.

## Rules

- L1 renders page shells and delegates events only.
- L1 must not own business logic, persistent state transitions, raw network calls, or sidecar calls.
- L2 owns orchestration, retries, error translation, state normalization, and API coordination.
- L3 molecules render feature UI from props or L2 commanders and must not call L4 network atoms directly.
- L4 network atoms own raw HTTP/SSE calls.
- L4 system atoms own Tauri and OS integration wrappers.
- Backend communication must flow through L4 network/system atoms, then L2 commander/diplomat, then state/UI.

## Scan Commands

```powershell
rg "@l4/network|fetch\(|EventSource|WebSocket|axios" src/l1-entry src/l3-molecule -n
rg "use[A-Za-z]+Store|zustand|localStorage|sessionStorage" src/l1-entry -n
rg "@l4/network|fetch\(|EventSource|WebSocket|axios" src/l2-coordinator src/l4-atom -n
rg "@l2/commander|@l2/data-clerk|@l4/network|@l4/system" src/l3-molecule -n
```

## 2026-05-30 Scan Result

- No direct L1/L3 raw `fetch`, `EventSource`, `WebSocket`, `axios`, or `@l4/network` import was found.
- L4 network atoms contain raw `fetch` calls, and L2 commanders call L4 network atoms. This matches the expected network boundary.
- L1 still imports setup/app stores in `SetupCenterView.tsx`, `WorkbenchShellView.tsx`, and `SettingsView.tsx`. These should be moved behind L2 view models/commanders in a follow-up boundary cleanup.
- Several L3 feature components still read Zustand stores or commanders directly. This is tolerated by the current codebase pattern but should be reduced where shared molecules need pure prop-driven reuse.
- `ConfigImportPanel.tsx` and `DataSettings.tsx` call L4 system directory pickers directly. A follow-up should route these through L2 setup/settings commanders to fully match the L3 rule.

## Follow-Up Items

- Move L1 readiness reads into L2 view models.
- Route directory-picker actions through L2 commanders.
- Keep P2-B chat, stats, search, setup, and settings components free of direct L4 network calls.

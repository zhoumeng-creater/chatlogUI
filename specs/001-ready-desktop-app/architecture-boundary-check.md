# P2-B Architecture Boundary Check

Date: 2026-05-30

## Scope

This check covers the core workbench path that P2-B changed:

- `src/l1-entry/pages/WorkbenchView.tsx`
- `src/l3-molecule/chat/`
- `src/l3-molecule/search/`
- `src/l3-molecule/stats/`
- `src/l2-coordinator/commander/useWorkbenchCommander.ts`

## Fixes Applied

- `useWorkbenchCommander` is now the core workbench state/action aggregation point for chat, search, stats, privacy, and selected result opening.
- `ConversationList`, `ChatView`, `MessageList`, `GlobalSearch`, `SearchResults`, `SearchResultsPane`, `StatsInspector`, and `TopContactCard` are props-first components.
- Privacy state is read once through the workbench commander for the core workbench path and passed into L3 presentation components.
- Pure workbench layout resolution moved from `src/l3-molecule/workbench/workbenchLayout.ts` to `src/l2-coordinator/commander/workbenchLayout.ts` so L2 no longer imports L3.

## Scan Commands

```powershell
rg -n "from \"@l3|from './?\.\./l3|@l3/" src/l2-coordinator -S
rg -n "use[A-Za-z]+(Commander|Store)|@l4/system|@l4/network" src/l1-entry/pages/WorkbenchView.tsx src/l3-molecule/chat src/l3-molecule/search src/l3-molecule/stats -S
```

## Current Results

- No L2-to-L3 import remains in `src/l2-coordinator`.
- Core workbench L3 matches are type-only imports from L2 stores, except `src/l3-molecule/chat/ContactList.tsx`.
- `ContactList.tsx` remains as a compatibility adapter for older call sites. The active workbench route no longer uses it; `WorkbenchView.tsx` renders `ConversationList` with commander-provided props.
- The scan still reports `WorkbenchView.tsx` using `useWorkbenchCommander`; that is the expected L1 entry-point dependency.

## Remaining Exceptions

`ContactList.tsx` should be removed or moved to an L2 adapter only after confirming no historical route or test fixture imports it. It is not part of the active P2-B workbench render path.

Other non-core L3 areas (`setup`, `settings`, `semantic`, `graph`, and `common`) still have direct commander/store usage and should be handled as targeted follow-up work so this remediation does not destabilize unrelated flows.

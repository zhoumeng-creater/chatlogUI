import type { SearchV2Request } from "@/l2-coordinator/api-docs/search";
import type { SearchDateContext } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import type { SearchDraft } from "./searchDraftModel";
import type {
  SearchPresentationGroupingMode,
  SearchPresentationSortMode,
} from "./searchResultPresentation";
import type { SearchResultWindow } from "./searchResultWindowModel";

export interface SearchAppliedReturnSnapshot {
  draft: SearchDraft;
  request: SearchV2Request;
  dateContext?: SearchDateContext;
  succeededAt: number;
}

export interface SearchReturnSnapshot {
  draft: SearchDraft;
  pending: null;
  applied: SearchAppliedReturnSnapshot;
  resultWindow: SearchResultWindow;
  stale: boolean;
  activeSourceIndex: number | null;
  scrollAnchor: string | null;
  sortMode: SearchPresentationSortMode;
  groupingMode: SearchPresentationGroupingMode;
  capturedAt: number;
}

export function createSearchReturnSnapshot(
  input: Omit<SearchReturnSnapshot, "pending">,
): Readonly<SearchReturnSnapshot> {
  return deepFreeze(cloneSnapshot({ ...input, pending: null }));
}

export function restoreSearchReturnSnapshot(
  snapshot: Readonly<SearchReturnSnapshot>,
): SearchReturnSnapshot {
  return cloneSnapshot(snapshot);
}

function cloneSnapshot(snapshot: Readonly<SearchReturnSnapshot>): SearchReturnSnapshot {
  return {
    draft: cloneDraft(snapshot.draft),
    pending: null,
    applied: {
      draft: cloneDraft(snapshot.applied.draft),
      request: cloneRequest(snapshot.applied.request),
      ...(snapshot.applied.dateContext ? { dateContext: { ...snapshot.applied.dateContext } } : {}),
      succeededAt: snapshot.applied.succeededAt,
    },
    resultWindow: cloneWindow(snapshot.resultWindow),
    stale: snapshot.stale,
    activeSourceIndex: snapshot.activeSourceIndex,
    scrollAnchor: snapshot.scrollAnchor,
    sortMode: snapshot.sortMode,
    groupingMode: snapshot.groupingMode,
    capturedAt: snapshot.capturedAt,
  };
}

function cloneDraft(draft: SearchDraft): SearchDraft {
  const scope =
    draft.scope.kind === "all"
      ? { kind: "all" as const }
      : draft.scope.kind === "current"
        ? { kind: "current" as const, chatId: draft.scope.chatId }
        : { kind: "selected" as const, chatIds: [...draft.scope.chatIds] };
  return {
    keyword: draft.keyword,
    scope,
    categories: [...draft.categories],
    senderIds: [...draft.senderIds],
    dateRange: { ...draft.dateRange },
  };
}

function cloneRequest(request: SearchV2Request): SearchV2Request {
  return {
    ...request,
    chats: request.chats ? [...request.chats] : undefined,
    categories: request.categories ? [...request.categories] : undefined,
    senderIds: request.senderIds ? [...request.senderIds] : undefined,
  };
}

function cloneWindow(window: SearchResultWindow): SearchResultWindow {
  return {
    ...window,
    retainedHits: cloneHits(window.retainedHits),
    currentPageHits: cloneHits(window.currentPageHits),
    loadedRanges: window.loadedRanges.map((range) => ({ ...range })),
    gaps: window.gaps.map((range) => ({ ...range })),
    scrollAnchors: { ...window.scrollAnchors },
    operations: {
      initial: { ...window.operations.initial },
      forward: { ...window.operations.forward },
      backward: { ...window.operations.backward },
      page: { ...window.operations.page },
      gaps: Object.fromEntries(
        Object.entries(window.operations.gaps).map(([key, value]) => [key, { ...value }]),
      ),
    },
  };
}

function cloneHits(hits: SearchResultWindow["retainedHits"]): SearchResultWindow["retainedHits"] {
  return hits.map((hit) => ({
    ...hit,
    matchSegments: hit.matchSegments.map((segment) => ({ ...segment })),
  }));
}

function deepFreeze<T>(value: T, visited = new WeakSet<object>()): T {
  if (typeof value !== "object" || value === null || visited.has(value)) return value;
  visited.add(value);
  for (const nested of Object.values(value)) deepFreeze(nested, visited);
  return Object.freeze(value);
}

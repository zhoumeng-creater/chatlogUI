import { create } from "zustand";
import type {
  SearchCapabilities,
  SearchSnapshotPage,
  SearchV2Request,
} from "@/l2-coordinator/api-docs/search";
import {
  createDefaultSearchDraft,
  type SearchDraft,
} from "@/l2-coordinator/commander/searchDraftModel";
import {
  applySearchWindowPage,
  createSearchResultWindow,
  rememberSearchPageReadingPosition,
  SearchWindowError,
  setSearchWindowOperation,
  switchSearchBrowseMode,
  type SearchResultWindow,
  type SearchWindowBrowseMode,
  type SearchWindowOperationStatus,
} from "@/l2-coordinator/commander/searchResultWindowModel";
import {
  cloneSearchScrollAnchor,
  type SearchScrollAnchor,
} from "@/l2-coordinator/commander/searchScrollAnchor";
import { createSearchHitIdentity } from "@/l2-coordinator/commander/searchHitIdentity";
import {
  restoreSearchReturnSnapshot,
  type SearchReturnSnapshot,
} from "@/l2-coordinator/commander/searchReturnSnapshot";

/** Route-level scope metadata used when returning from a search result. */
export type SearchScope = "all" | "current";
export interface SearchDateContext {
  timeZone: string | null;
  utcOffsetMinutes: number;
  since?: number;
  until?: number;
}

export type PendingSearchKind = "initial" | "replacement" | "refresh" | "retry";

export interface PendingSearchRequest {
  requestId: string;
  kind: PendingSearchKind;
  draft: SearchDraft;
  request: SearchV2Request;
  dateContext: SearchDateContext;
  startedAt: number;
  restoreActiveHitIdentity?: string | null;
}

export interface SearchAppliedRequest {
  draft: SearchDraft;
  request: SearchV2Request;
  dateContext: SearchDateContext;
  succeededAt: number;
}

export type SearchRequestErrorCode =
  | "capability_unavailable"
  | "service_unavailable"
  | "database_unavailable"
  | "invalid_request"
  | "timeout"
  | "request_failed"
  | "permission_denied"
  | "identity_conflict"
  | "snapshot_expired"
  | "stale_revision";

export type SearchRequestErrorField =
  | "keyword"
  | "scope"
  | "categories"
  | "senders"
  | "dateRange";

export type SearchRequestLifecycle =
  | { status: "idle" }
  | { status: "loading"; requestId: string }
  | { status: "success" }
  | {
      status: "error";
      errorCode: SearchRequestErrorCode;
      errorField?: SearchRequestErrorField;
    }
  | { status: "cancelled" };

export interface SearchReadiness {
  httpReady: boolean;
  dbReady: boolean;
}

export interface SearchResultNavigationState {
  status: "loading" | "error";
  sourceIndex: number;
  message: string | null;
  nearbyFallbackAvailable: boolean;
}

export type SearchCapabilitiesState =
  | { status: "idle"; value: null }
  | { status: "loading"; value: SearchCapabilities | null }
  | { status: "ready"; value: SearchCapabilities }
  | { status: "error"; value: SearchCapabilities | null; errorCode: "request_failed" };

type SearchWindowOperation =
  | { kind: "initial" | "forward" | "backward" | "page" }
  | { kind: "gap"; range: { start: number; end: number } };

interface SearchState {
  // Canonical v2 state.
  searchIntentGeneration: number;
  draft: SearchDraft;
  pending: Readonly<PendingSearchRequest> | null;
  applied: SearchAppliedRequest | null;
  resultWindow: SearchResultWindow | null;
  firstRequest: SearchRequestLifecycle;
  replacementRequest: SearchRequestLifecycle;
  retryCandidate: Readonly<PendingSearchRequest> | null;
  stale: boolean;
  restoredFromNavigation: boolean;
  capabilities: SearchCapabilitiesState;
  readiness: SearchReadiness;
  navigationByResultId: Record<string, SearchResultNavigationState>;
  refreshActiveNotice: string | null;
  setDraft: (draft: SearchDraft) => void;
  beginPending: (pending: PendingSearchRequest) => void;
  rejectSubmission: (
    errorCode: SearchRequestErrorCode,
    errorField?: SearchRequestErrorField,
  ) => void;
  commitPending: (
    requestId: string,
    page: SearchSnapshotPage,
    succeededAt: number,
    browseMode: SearchWindowBrowseMode,
  ) => boolean;
  failPending: (
    requestId: string,
    errorCode: SearchRequestErrorCode,
    errorField?: SearchRequestErrorField,
  ) => boolean;
  cancelPending: (requestId?: string | null) => boolean;
  setWindowOperation: (
    operation: SearchWindowOperation,
    status: SearchWindowOperationStatus,
  ) => void;
  applyWindowPage: (
    page: SearchSnapshotPage,
    target: "forward" | "backward" | "gap" | "page",
  ) => void;
  markSnapshotStale: () => void;
  setCapabilitiesState: (state: SearchCapabilitiesState) => void;
  setReadiness: (readiness: Partial<SearchReadiness>) => void;
  restoreReturnSnapshot: (snapshot: Readonly<SearchReturnSnapshot>) => void;
  consumeRestoredNavigation: () => boolean;
  switchResultBrowseMode: (
    mode: SearchWindowBrowseMode,
    outgoingScrollAnchor: SearchScrollAnchor | null,
  ) => boolean;
  setResultActiveSourceIndex: (sourceIndex: number | null) => boolean;
  rememberResultScrollAnchor: (
    mode: SearchWindowBrowseMode,
    scrollAnchor: SearchScrollAnchor | null,
  ) => boolean;
  rememberResultPageReadingPosition: (
    scrollAnchor: SearchScrollAnchor | null,
  ) => boolean;
  consumeResultRestoreScrollAnchor: () => SearchScrollAnchor | null;
  beginResultNavigation: (resultId: string, sourceIndex: number) => void;
  failResultNavigation: (
    resultId: string,
    message: string,
    nearbyFallbackAvailable: boolean,
  ) => void;
  clearResultNavigation: (resultId: string) => void;
  endSearch: () => void;
  reset: () => void;
}

const idleLifecycle = (): SearchRequestLifecycle => ({ status: "idle" });

function canonicalInitialState(searchIntentGeneration = 0) {
  return {
    searchIntentGeneration,
    draft: createDefaultSearchDraft(),
    pending: null,
    applied: null,
    resultWindow: null,
    firstRequest: idleLifecycle(),
    replacementRequest: idleLifecycle(),
    retryCandidate: null,
    stale: false,
    restoredFromNavigation: false,
    capabilities: { status: "idle", value: null } as SearchCapabilitiesState,
    readiness: { httpReady: false, dbReady: false },
    navigationByResultId: {},
    refreshActiveNotice: null,
  };
}

export const useSearchStore = create<SearchState>((set) => ({
  ...canonicalInitialState(),

  setDraft: (draft) => set({ draft: cloneDraft(draft) }),
  beginPending: (pending) =>
    set((state) => {
      const frozen = deepFreeze(clonePending(pending));
      const lifecycle: SearchRequestLifecycle = { status: "loading", requestId: pending.requestId };
      const isFirst = state.applied === null;
      return {
        searchIntentGeneration: state.searchIntentGeneration + 1,
        pending: frozen,
        resultWindow: state.resultWindow
          ? setSearchWindowOperation(state.resultWindow, { kind: "page" }, { status: "idle" })
          : null,
        retryCandidate: null,
        restoredFromNavigation: false,
        refreshActiveNotice: null,
        firstRequest: isFirst ? lifecycle : state.firstRequest,
        replacementRequest: isFirst ? state.replacementRequest : lifecycle,
      };
    }),
  rejectSubmission: (errorCode, errorField) =>
    set((state) =>
      state.applied === null
        ? { firstRequest: { status: "error", errorCode, ...(errorField ? { errorField } : {}) } }
        : {
            replacementRequest: {
              status: "error",
              errorCode,
              ...(errorField ? { errorField } : {}),
            },
          },
    ),
  commitPending: (requestId, page, succeededAt, browseMode) => {
    let committed = false;
    set((state) => {
      if (state.pending?.requestId !== requestId) return {};
      const pending = state.pending;
      const resultWindow = createSearchResultWindow(page, browseMode);
      const restoredActiveHit = pending.restoreActiveHitIdentity
        ? page.messages.find(
            (hit) => createSearchHitIdentity(hit) === pending.restoreActiveHitIdentity,
          )
        : null;
      if (restoredActiveHit) resultWindow.activeSourceIndex = restoredActiveHit.sourceIndex;
      const refreshActiveNotice =
        pending.kind === "refresh" && pending.restoreActiveHitIdentity
          ? restoredActiveHit
            ? "已恢复刷新前定位的结果。"
            : "原先定位的结果已不存在，已选择刷新结果中的第一条。"
          : null;
      const applied: SearchAppliedRequest = {
        draft: cloneDraft(pending.draft),
        request: cloneRequest(pending.request),
        dateContext: { ...pending.dateContext },
        succeededAt,
      };
      const wasFirst = state.applied === null;
      committed = true;
      return {
        pending: null,
        applied,
        resultWindow,
        retryCandidate: null,
        stale: false,
        firstRequest: wasFirst ? { status: "success" } : state.firstRequest,
        replacementRequest: wasFirst ? state.replacementRequest : { status: "success" },
        navigationByResultId: {},
        refreshActiveNotice,
      };
    });
    return committed;
  },
  failPending: (requestId, errorCode, errorField) => {
    let failed = false;
    set((state) => {
      if (state.pending?.requestId !== requestId) return {};
      const isFirst = state.applied === null;
      failed = true;
      return {
        pending: null,
        retryCandidate:
          errorCode === "timeout" ||
          errorCode === "service_unavailable" ||
          errorCode === "database_unavailable" ||
          errorCode === "request_failed"
            ? state.pending
            : null,
        firstRequest: isFirst
          ? { status: "error", errorCode, ...(errorField ? { errorField } : {}) }
          : state.firstRequest,
        replacementRequest: isFirst
          ? state.replacementRequest
          : { status: "error", errorCode, ...(errorField ? { errorField } : {}) },
      };
    });
    return failed;
  },
  cancelPending: (requestId) => {
    let cancelled = false;
    set((state) => {
      if (!state.pending || (requestId && state.pending.requestId !== requestId)) return {};
      const isFirst = state.applied === null;
      cancelled = true;
      return {
        pending: null,
        retryCandidate: null,
        firstRequest: isFirst ? { status: "cancelled" } : state.firstRequest,
        replacementRequest: isFirst ? state.replacementRequest : { status: "cancelled" },
      };
    });
    return cancelled;
  },
  setWindowOperation: (operation, operationStatus) =>
    set((state) => ({
      resultWindow: state.resultWindow
        ? setSearchWindowOperation(state.resultWindow, operation, operationStatus)
        : null,
    })),
  applyWindowPage: (page, target) =>
    set((state) => {
      if (!state.resultWindow) return {};
      if (state.stale) throw new SearchWindowError("stale_revision");
      return { resultWindow: applySearchWindowPage(state.resultWindow, page, target) };
    }),
  markSnapshotStale: () => set({ stale: true }),
  setCapabilitiesState: (capabilities) => set({ capabilities }),
  setReadiness: (readiness) =>
    set((state) => ({
      readiness: { ...state.readiness, ...readiness },
    })),
  restoreReturnSnapshot: (snapshot) =>
    set(() => {
      const restored = restoreSearchReturnSnapshot(snapshot);
      const resultWindow = {
        ...restored.resultWindow,
        activeSourceIndex: restored.activeSourceIndex,
        restoreScrollAnchor: restored.scrollAnchor,
      };
      return {
        draft: restored.draft,
        pending: null,
        applied: {
          ...restored.applied,
          dateContext: restored.applied.dateContext ?? {
            timeZone: null,
            utcOffsetMinutes: 0,
            ...(restored.applied.request.since !== undefined
              ? { since: restored.applied.request.since }
              : {}),
            ...(restored.applied.request.until !== undefined
              ? { until: restored.applied.request.until }
              : {}),
          },
        },
        resultWindow,
        firstRequest: { status: "success" },
        replacementRequest: idleLifecycle(),
        retryCandidate: null,
        stale: restored.stale,
        restoredFromNavigation: true,
        navigationByResultId: {},
      };
    }),
  consumeRestoredNavigation: () => {
    let consumed = false;
    set((state) => {
      if (!state.restoredFromNavigation) return {};
      consumed = true;
      return { restoredFromNavigation: false };
    });
    return consumed;
  },
  switchResultBrowseMode: (mode, outgoingScrollAnchor) => {
    let switched = false;
    set((state) => {
      if (!state.resultWindow) return {};
      switched = true;
      return {
        resultWindow: switchSearchBrowseMode(state.resultWindow, mode, outgoingScrollAnchor),
      };
    });
    return switched;
  },
  setResultActiveSourceIndex: (sourceIndex) => {
    let updated = false;
    set((state) => {
      const window = state.resultWindow;
      if (!window) return {};
      const hits = window.browseMode === "paged" ? window.currentPageHits : window.retainedHits;
      if (
        sourceIndex !== null &&
        (!Number.isSafeInteger(sourceIndex) ||
          !hits.some((hit) => hit.sourceIndex === sourceIndex))
      ) {
        return {};
      }
      updated = true;
      return { resultWindow: { ...window, activeSourceIndex: sourceIndex } };
    });
    return updated;
  },
  rememberResultScrollAnchor: (mode, scrollAnchor) => {
    let remembered = false;
    set((state) => {
      const window = state.resultWindow;
      if (!window) return {};
      remembered = true;
      return {
        resultWindow: {
          ...window,
          scrollAnchors: {
            ...window.scrollAnchors,
            [mode]: cloneSearchScrollAnchor(scrollAnchor),
          },
        },
      };
    });
    return remembered;
  },
  rememberResultPageReadingPosition: (scrollAnchor) => {
    let remembered = false;
    set((state) => {
      const window = state.resultWindow;
      if (!window || window.browseMode !== "paged") return {};
      remembered = true;
      return {
        resultWindow: rememberSearchPageReadingPosition(window, scrollAnchor),
      };
    });
    return remembered;
  },
  consumeResultRestoreScrollAnchor: () => {
    let anchor: SearchScrollAnchor | null = null;
    set((state) => {
      const window = state.resultWindow;
      if (!window?.restoreScrollAnchor) return {};
      anchor = cloneSearchScrollAnchor(window.restoreScrollAnchor);
      return { resultWindow: { ...window, restoreScrollAnchor: null } };
    });
    return anchor;
  },
  beginResultNavigation: (resultId, sourceIndex) =>
    set((state) => ({
      navigationByResultId: {
        ...state.navigationByResultId,
        [resultId]: {
          status: "loading",
          sourceIndex,
          message: null,
          nearbyFallbackAvailable: false,
        },
      },
    })),
  failResultNavigation: (resultId, message, nearbyFallbackAvailable) =>
    set((state) => {
      const current = state.navigationByResultId[resultId];
      if (!current) return {};
      return {
        navigationByResultId: {
          ...state.navigationByResultId,
          [resultId]: {
            status: "error",
            sourceIndex: current.sourceIndex,
            message,
            nearbyFallbackAvailable,
          },
        },
      };
    }),
  clearResultNavigation: (resultId) =>
    set((state) => {
      if (!state.navigationByResultId[resultId]) return {};
      const navigationByResultId = { ...state.navigationByResultId };
      delete navigationByResultId[resultId];
      return { navigationByResultId };
    }),
  endSearch: () =>
    set((state) => ({
      searchIntentGeneration: state.searchIntentGeneration + 1,
      draft: { ...cloneDraft(state.draft), keyword: "" },
      pending: null,
      applied: null,
      resultWindow: null,
      firstRequest: idleLifecycle(),
      replacementRequest: idleLifecycle(),
      retryCandidate: null,
      stale: false,
      navigationByResultId: {},
      refreshActiveNotice: null,
    })),
  reset: () =>
    set((state) => canonicalInitialState(state.searchIntentGeneration + 1)),
}));

function clonePending(pending: PendingSearchRequest): PendingSearchRequest {
  return {
    ...pending,
    draft: cloneDraft(pending.draft),
    request: cloneRequest(pending.request),
    dateContext: { ...pending.dateContext },
  };
}

function cloneDraft(draft: SearchDraft): SearchDraft {
  return {
    keyword: draft.keyword,
    scope:
      draft.scope.kind === "selected"
        ? { kind: "selected", chatIds: [...draft.scope.chatIds] }
        : { ...draft.scope },
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

function deepFreeze<T>(value: T, visited = new WeakSet<object>()): T {
  if (typeof value !== "object" || value === null || visited.has(value)) return value;
  visited.add(value);
  for (const nested of Object.values(value)) deepFreeze(nested, visited);
  return Object.freeze(value);
}

import { create } from "zustand";
import type {
  SearchCapabilities,
  SearchFilterType,
  SearchSnapshotPage,
  SearchV2Request,
} from "@/l2-coordinator/api-docs/search";
import {
  createDefaultSearchAdvancedFilters,
  type SearchAdvancedFiltersState,
  type SearchGroupMode,
  type SearchSortMode,
} from "@/l2-coordinator/commander/searchAdvancedFilters";
import {
  createDefaultSearchDraft,
  type SearchDraft,
} from "@/l2-coordinator/commander/searchDraftModel";
import {
  applySearchWindowPage,
  createSearchResultWindow,
  SearchWindowError,
  setSearchWindowOperation,
  type SearchResultWindow,
  type SearchWindowBrowseMode,
  type SearchWindowOperationStatus,
} from "@/l2-coordinator/commander/searchResultWindowModel";

/** @deprecated Compatibility shape for the UI while the v2 result rows are migrated. */
export type SearchScope = "all" | "current";
/** @deprecated Compatibility status for the UI while explicit request states are adopted. */
export type SearchStatus =
  | "idle"
  | "invalid"
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "cancelled";
/** @deprecated Compatibility request kind used by the legacy GET commander. */
export type SearchActiveRequestKind = "search" | "loadMore" | "retry";

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
  | "snapshot_expired"
  | "stale_revision";

export type SearchRequestLifecycle =
  | { status: "idle" }
  | { status: "loading"; requestId: string }
  | { status: "success" }
  | { status: "error"; errorCode: SearchRequestErrorCode }
  | { status: "cancelled" };

export interface SearchReadiness {
  httpReady: boolean;
  dbReady: boolean;
}

export type SearchCapabilitiesState =
  | { status: "idle"; value: null }
  | { status: "loading"; value: SearchCapabilities | null }
  | { status: "ready"; value: SearchCapabilities }
  | { status: "error"; value: SearchCapabilities | null; errorCode: "request_failed" };

export interface SearchActiveRequest {
  requestId: string;
  kind: SearchActiveRequestKind;
  query: string;
  filter: SearchFilterType;
  scope: SearchScope;
  scopeChat: string | null;
  advancedFilterKey: string;
  offset: number;
  limit: number;
}

/** @deprecated Compatibility result until SearchResultsPane consumes SearchResultWindow. */
export interface SearchResults {
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  messages: {
    id: string;
    messageId?: string;
    seq?: number;
    sourceIndex?: number;
    conversationId?: string;
    senderId?: string;
    localId?: number;
    timestamp: number;
    time?: string;
    content: string;
    sender: string;
    username: string;
    chat: string;
    isGroup?: boolean;
    type?: string;
  }[];
}

type SearchWindowOperation =
  | { kind: "initial" | "forward" | "backward" | "page" }
  | { kind: "gap"; range: { start: number; end: number } };

interface SearchState {
  // Canonical v2 state.
  draft: SearchDraft;
  pending: Readonly<PendingSearchRequest> | null;
  applied: SearchAppliedRequest | null;
  resultWindow: SearchResultWindow | null;
  firstRequest: SearchRequestLifecycle;
  replacementRequest: SearchRequestLifecycle;
  retryCandidate: Readonly<PendingSearchRequest> | null;
  stale: boolean;
  capabilities: SearchCapabilitiesState;
  readiness: SearchReadiness;
  setDraft: (draft: SearchDraft) => void;
  beginPending: (pending: PendingSearchRequest) => void;
  rejectSubmission: (errorCode: SearchRequestErrorCode) => void;
  commitPending: (
    requestId: string,
    page: SearchSnapshotPage,
    succeededAt: number,
    browseMode: SearchWindowBrowseMode,
  ) => boolean;
  failPending: (requestId: string, errorCode: SearchRequestErrorCode) => boolean;
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
  endSearch: () => void;
  reset: () => void;

  // Temporary compatibility surface consumed by the current page. Task 11/12 removes it.
  query: string;
  activeFilter: SearchFilterType;
  scope: SearchScope;
  advancedFilters: SearchAdvancedFiltersState;
  activeResultId: string | null;
  activeRequest: SearchActiveRequest | null;
  results: SearchResults | null;
  status: SearchStatus;
  loading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  setFilter: (filter: SearchFilterType) => void;
  setScope: (scope: SearchScope) => void;
  setAdvancedFilters: (filters: SearchAdvancedFiltersState) => void;
  setSearchSortMode: (sortMode: SearchSortMode) => void;
  setSearchGroupMode: (groupMode: SearchGroupMode) => void;
  setActiveResultId: (id: string | null) => void;
  setActiveRequest: (request: SearchActiveRequest) => void;
  clearActiveRequest: (requestId?: string | null) => void;
  settleActiveRequest: (requestId?: string | null) => void;
  setResults: (results: SearchResults | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInvalid: () => void;
  setCancelled: () => void;
  clear: () => void;
}

const idleLifecycle = (): SearchRequestLifecycle => ({ status: "idle" });

function canonicalInitialState() {
  return {
    draft: createDefaultSearchDraft(),
    pending: null,
    applied: null,
    resultWindow: null,
    firstRequest: idleLifecycle(),
    replacementRequest: idleLifecycle(),
    retryCandidate: null,
    stale: false,
    capabilities: { status: "idle", value: null } as SearchCapabilitiesState,
    readiness: { httpReady: false, dbReady: false },
  };
}

function compatibilityInitialState() {
  return {
    query: "",
    activeFilter: "all" as SearchFilterType,
    scope: "all" as SearchScope,
    advancedFilters: createDefaultSearchAdvancedFilters(),
    activeResultId: null,
    activeRequest: null,
    results: null,
    status: "idle" as SearchStatus,
    loading: false,
    error: null,
  };
}

export const useSearchStore = create<SearchState>((set) => ({
  ...canonicalInitialState(),
  ...compatibilityInitialState(),

  setDraft: (draft) => set({ draft: cloneDraft(draft) }),
  beginPending: (pending) =>
    set((state) => {
      const frozen = deepFreeze(clonePending(pending));
      const lifecycle: SearchRequestLifecycle = { status: "loading", requestId: pending.requestId };
      const isFirst = state.applied === null;
      return {
        pending: frozen,
        retryCandidate: null,
        stale: pending.kind === "refresh" ? state.stale : state.stale,
        firstRequest: isFirst ? lifecycle : state.firstRequest,
        replacementRequest: isFirst ? state.replacementRequest : lifecycle,
      };
    }),
  rejectSubmission: (errorCode) =>
    set((state) =>
      state.applied === null
        ? { firstRequest: { status: "error", errorCode } }
        : { replacementRequest: { status: "error", errorCode } },
    ),
  commitPending: (requestId, page, succeededAt, browseMode) => {
    let committed = false;
    set((state) => {
      if (state.pending?.requestId !== requestId) return {};
      const pending = state.pending;
      const resultWindow = createSearchResultWindow(page, browseMode);
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
      };
    });
    return committed;
  },
  failPending: (requestId, errorCode) => {
    let failed = false;
    set((state) => {
      if (state.pending?.requestId !== requestId) return {};
      const isFirst = state.applied === null;
      failed = true;
      return {
        pending: null,
        retryCandidate:
          errorCode === "stale_revision" || errorCode === "snapshot_expired" ? null : state.pending,
        firstRequest: isFirst ? { status: "error", errorCode } : state.firstRequest,
        replacementRequest: isFirst ? state.replacementRequest : { status: "error", errorCode },
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
  endSearch: () =>
    set((state) => ({
      draft: { ...cloneDraft(state.draft), keyword: "" },
      pending: null,
      applied: null,
      resultWindow: null,
      firstRequest: idleLifecycle(),
      replacementRequest: idleLifecycle(),
      retryCandidate: null,
      stale: false,
      activeResultId: null,
      activeRequest: null,
      results: null,
      status: "idle",
      loading: false,
      error: null,
      query: "",
    })),
  reset: () => set({ ...canonicalInitialState(), ...compatibilityInitialState() }),

  setQuery: (query) => set({ query }),
  setFilter: (activeFilter) => set({ activeFilter }),
  setScope: (scope) => set({ scope }),
  setAdvancedFilters: (advancedFilters) => set({ advancedFilters }),
  setSearchSortMode: (sortMode) =>
    set((state) => ({
      advancedFilters: { ...state.advancedFilters, sortMode },
    })),
  setSearchGroupMode: (groupMode) =>
    set((state) => ({
      advancedFilters: { ...state.advancedFilters, groupMode },
    })),
  setActiveResultId: (activeResultId) => set({ activeResultId }),
  setActiveRequest: (activeRequest) => set({ activeRequest }),
  clearActiveRequest: (requestId) =>
    set((state) => {
      if (requestId && state.activeRequest?.requestId !== requestId) return {};
      return { activeRequest: null };
    }),
  settleActiveRequest: (requestId) =>
    set((state) => {
      if (requestId && state.activeRequest?.requestId !== requestId) return {};
      return {
        activeRequest: null,
        loading: false,
        status: state.results ? (state.results.messages.length > 0 ? "ready" : "empty") : "idle",
      };
    }),
  setResults: (results) =>
    set({
      results,
      activeResultId: null,
      activeRequest: null,
      status: results ? (results.messages.length > 0 ? "ready" : "empty") : "idle",
      loading: false,
      error: null,
    }),
  setLoading: (loading) => set({ loading, status: loading ? "loading" : "idle" }),
  setError: (error) => set({ error, activeRequest: null, loading: false, status: "error" }),
  setInvalid: () =>
    set({
      results: null,
      activeResultId: null,
      activeRequest: null,
      loading: false,
      error: null,
      status: "invalid",
    }),
  setCancelled: () =>
    set((state) => ({
      activeResultId: state.results ? state.activeResultId : null,
      activeRequest: null,
      loading: false,
      error: null,
      status: "cancelled",
    })),
  clear: () =>
    set({
      query: "",
      results: null,
      activeResultId: null,
      activeRequest: null,
      status: "idle",
      loading: false,
      error: null,
    }),
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

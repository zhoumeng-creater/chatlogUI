import { useCallback, useRef } from "react";
import { useSearchStore } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import type { SearchScope } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import type { SearchResults } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { useChatStore } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { ChatlogHttpError, fetchSearch } from "@l4/network";
import { debounce } from "@/l2-coordinator/diplomat/debounce";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import {
  canMergeSearchPage,
  createSearchRequest,
  createSearchRequestSnapshot,
  getNextSearchOffset,
  getSearchInputStatus,
  isSearchSnapshotCurrent,
  mergeSearchResults,
} from "./searchRequest";
import { clearSearchSession } from "./searchSession";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";

const SEARCH_PAGE_SIZE = 20;

function getScopedChat(): string | null {
  const { scope } = useSearchStore.getState();
  if (scope !== "current") return null;

  const { conversations, selectedConversationId } = useChatStore.getState();
  const conversation = conversations.find((item) => item.id === selectedConversationId);
  return conversation?.username ?? null;
}

function getCurrentRequestState() {
  const state = useSearchStore.getState();
  return {
    query: state.query,
    activeFilter: state.activeFilter,
    scope: state.scope,
    scopeChat: getScopedChat(),
  };
}

function isCancelledSearchError(error: unknown): boolean {
  return error instanceof ChatlogHttpError && error.status === null && error.message === "请求已取消";
}

export function useSearchCommander() {
  const store = useSearchStore();
  const activeControllerRef = useRef<AbortController | null>(null);
  const requestCounterRef = useRef(0);

  const createRequestId = useCallback((kind: "search" | "loadMore") => {
    requestCounterRef.current += 1;
    return `${kind}-${requestCounterRef.current}`;
  }, []);

  const cancelActiveRequest = useCallback(() => {
    const controller = activeControllerRef.current;
    activeControllerRef.current = null;
    const activeRequestId = useSearchStore.getState().activeRequest?.requestId;
    if (activeRequestId) {
      useSearchStore.getState().clearActiveRequest(activeRequestId);
    }
    controller?.abort();
  }, []);

  const executeSearchFn = useCallback(async (keyword: string, filter = useSearchStore.getState().activeFilter) => {
    if (getSearchInputStatus(keyword) === "invalid") {
      cancelActiveRequest();
      useSearchStore.getState().setInvalid();
      return;
    }
    cancelActiveRequest();
    const scopeChat = getScopedChat();
    const requestId = createRequestId("search");
    const controller = new AbortController();
    const { scope } = useSearchStore.getState();
    const snapshot = createSearchRequestSnapshot({
      requestId,
      kind: "search",
      query: keyword,
      filter,
      scope,
      scopeChat,
      limit: SEARCH_PAGE_SIZE,
      offset: 0,
    });

    activeControllerRef.current = controller;
    useSearchStore.getState().setActiveRequest(snapshot);
    useSearchStore.getState().setLoading(true);

    try {
      const result = await fetchSearch(
        createSearchRequest({
          keyword,
          filter,
          limit: SEARCH_PAGE_SIZE,
          offset: 0,
          scopeChat: scopeChat ?? undefined,
        }),
        {
          ...createDiagnosticHttpOptions({
            endpointFamily: "search",
            method: "GET",
            recoveryHint: "retry",
          }),
          signal: controller.signal,
        },
      );
      if (!isSearchSnapshotCurrent(snapshot, getCurrentRequestState(), useSearchStore.getState().activeRequest?.requestId)) {
        return;
      }
      useSearchStore.getState().setResults(result as unknown as SearchResults);
    } catch (error) {
      if (!isSearchSnapshotCurrent(snapshot, getCurrentRequestState(), useSearchStore.getState().activeRequest?.requestId)) {
        return;
      }
      if (isCancelledSearchError(error)) {
        useSearchStore.getState().setCancelled();
        return;
      }
      useSearchStore.getState().setError("搜索失败，请检查网络连接");
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
    }
  }, [cancelActiveRequest, createRequestId]);

  const debouncedSearchRef = useRef(
    debounce((keyword: string) => {
      executeSearchFn(keyword);
    }, 300),
  );

  const executeSearch = useCallback(
    (keyword: string) => {
      debouncedSearchRef.current.cancel();
      useSearchStore.getState().setQuery(keyword);
      executeSearchFn(keyword);
    },
    [executeSearchFn],
  );

  const search = useCallback((keyword: string) => {
    useSearchStore.getState().setQuery(keyword);
    if (getSearchInputStatus(keyword) === "invalid") {
      debouncedSearchRef.current.cancel();
      cancelActiveRequest();
      useSearchStore.getState().setInvalid();
      return;
    }
    cancelActiveRequest();
    debouncedSearchRef.current(keyword);
  }, [cancelActiveRequest]);

  const changeFilter = useCallback((filter: SearchFilterType) => {
    const { query } = useSearchStore.getState();
    debouncedSearchRef.current.cancel();
    cancelActiveRequest();
    useSearchStore.getState().setFilter(filter);
    if (query.trim()) {
      executeSearchFn(query, filter);
    }
  }, [cancelActiveRequest, executeSearchFn]);

  const changeScope = useCallback((scope: SearchScope) => {
    const { query } = useSearchStore.getState();
    debouncedSearchRef.current.cancel();
    cancelActiveRequest();
    useSearchStore.getState().setScope(scope);
    if (query.trim()) {
      executeSearchFn(query);
    }
  }, [cancelActiveRequest, executeSearchFn]);

  const clearSearch = useCallback(() => {
    cancelActiveRequest();
    clearSearchSession(debouncedSearchRef.current, useSearchStore.getState().clear);
  }, [cancelActiveRequest]);

  const loadMoreResults = useCallback(async () => {
    const { query, activeFilter, results, loading, scope } = useSearchStore.getState();
    if (loading || !results || results.messages.length >= results.totalCount) return;

    const nextOffset = getNextSearchOffset(results);
    const scopeChat = getScopedChat();
    const requestId = createRequestId("loadMore");
    const controller = new AbortController();
    const snapshot = createSearchRequestSnapshot({
      requestId,
      kind: "loadMore",
      query,
      filter: activeFilter,
      scope,
      scopeChat,
      offset: nextOffset,
      limit: SEARCH_PAGE_SIZE,
    });

    activeControllerRef.current = controller;
    useSearchStore.getState().setActiveRequest(snapshot);
    useSearchStore.getState().setLoading(true);

    try {
      const newResult = await fetchSearch(
        createSearchRequest({
          keyword: query,
          filter: activeFilter,
          limit: SEARCH_PAGE_SIZE,
          offset: nextOffset,
          scopeChat: scopeChat ?? undefined,
        }),
        {
          ...createDiagnosticHttpOptions({
            endpointFamily: "search",
            method: "GET",
            recoveryHint: "retry",
          }),
          signal: controller.signal,
        },
      );
      useSearchStore.setState((state) => ({
        ...(canMergeSearchPage(
          snapshot,
          {
            query: state.query,
            activeFilter: state.activeFilter,
            scope: state.scope,
            scopeChat: getScopedChat(),
            results: state.results,
          },
          newResult as unknown as SearchResults,
          state.activeRequest?.requestId,
        )
          ? {
              results: state.results
                ? mergeSearchResults(state.results, newResult as unknown as SearchResults)
                : (newResult as unknown as SearchResults),
              activeRequest: null,
              loading: false,
              error: null,
              status: "ready" as const,
            }
          : {}),
      }));
    } catch (error) {
      if (!isSearchSnapshotCurrent(snapshot, getCurrentRequestState(), useSearchStore.getState().activeRequest?.requestId)) {
        return;
      }
      if (isCancelledSearchError(error)) {
        useSearchStore.getState().setCancelled();
        return;
      }
      useSearchStore.getState().setError("加载更多结果失败");
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
    }
  }, [createRequestId]);

  return {
    ...store,
    search,
    executeSearch,
    changeFilter,
    changeScope,
    clearSearch,
    loadMoreResults,
  };
}

import { useCallback, useRef } from "react";
import { useSearchStore } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import type { SearchScope } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import type { SearchResults } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { useChatStore } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { fetchSearch } from "@l4/network";
import { debounce } from "@/l2-coordinator/diplomat/debounce";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import { createSearchRequest, getNextSearchOffset, getSearchInputStatus, mergeSearchResults } from "./searchRequest";
import { clearSearchSession } from "./searchSession";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";

const SEARCH_PAGE_SIZE = 20;

function getScopedChat(): string | undefined {
  const { scope } = useSearchStore.getState();
  if (scope !== "current") return undefined;

  const { conversations, selectedConversationId } = useChatStore.getState();
  const conversation = conversations.find((item) => item.id === selectedConversationId);
  return conversation?.username;
}

export function useSearchCommander() {
  const store = useSearchStore();

  const executeSearchFn = useCallback(async (keyword: string, filter = useSearchStore.getState().activeFilter) => {
    if (getSearchInputStatus(keyword) === "invalid") {
      useSearchStore.getState().setInvalid();
      return;
    }
    useSearchStore.getState().setLoading(true);
    try {
      const result = await fetchSearch(
        createSearchRequest({
          keyword,
          filter,
          limit: SEARCH_PAGE_SIZE,
          offset: 0,
          scopeChat: getScopedChat(),
        }),
        createDiagnosticHttpOptions({
          endpointFamily: "search",
          method: "GET",
          recoveryHint: "retry",
        }),
      );
      useSearchStore.getState().setResults(result as unknown as SearchResults);
    } catch {
      useSearchStore.getState().setError("搜索失败，请检查网络连接");
    }
  }, []);

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
      useSearchStore.getState().setInvalid();
      return;
    }
    debouncedSearchRef.current(keyword);
  }, []);

  const changeFilter = useCallback((filter: SearchFilterType) => {
    const { query } = useSearchStore.getState();
    debouncedSearchRef.current.cancel();
    useSearchStore.getState().setFilter(filter);
    if (query.trim()) {
      executeSearchFn(query, filter);
    }
  }, [executeSearchFn]);

  const changeScope = useCallback((scope: SearchScope) => {
    const { query } = useSearchStore.getState();
    debouncedSearchRef.current.cancel();
    useSearchStore.getState().setScope(scope);
    if (query.trim()) {
      executeSearchFn(query);
    }
  }, [executeSearchFn]);

  const clearSearch = useCallback(() => {
    clearSearchSession(debouncedSearchRef.current, useSearchStore.getState().clear);
  }, []);

  const loadMoreResults = useCallback(async () => {
    const { query, activeFilter, results } = useSearchStore.getState();
    if (!results || results.messages.length >= results.totalCount) return;

    const nextOffset = getNextSearchOffset(results);
    useSearchStore.getState().setLoading(true);

    try {
      const newResult = await fetchSearch(
        createSearchRequest({
          keyword: query,
          filter: activeFilter,
          limit: SEARCH_PAGE_SIZE,
          offset: nextOffset,
          scopeChat: getScopedChat(),
        }),
        createDiagnosticHttpOptions({
          endpointFamily: "search",
          method: "GET",
          recoveryHint: "retry",
        }),
      );
      useSearchStore.setState((state) => ({
        results: state.results ? mergeSearchResults(state.results, newResult as unknown as SearchResults) : (newResult as unknown as SearchResults),
        loading: false,
        error: null,
        status: "ready",
      }));
    } catch {
      useSearchStore.getState().setError("加载更多结果失败");
    }
  }, []);

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

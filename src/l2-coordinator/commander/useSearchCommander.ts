import { useCallback, useRef } from "react";
import { useSearchStore } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { fetchSearch } from "@l4/network";
import { debounce } from "@/l2-coordinator/diplomat/debounce";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import { createSearchRequest, getNextSearchOffset, mergeSearchResults } from "./searchRequest";
import { clearSearchSession } from "./searchSession";

const SEARCH_PAGE_SIZE = 20;

export function useSearchCommander() {
  const store = useSearchStore();

  const executeSearchFn = useCallback(async (keyword: string, filter = useSearchStore.getState().activeFilter) => {
    if (!keyword.trim()) {
      useSearchStore.getState().clear();
      return;
    }
    useSearchStore.getState().setLoading(true);
    try {
      const result = await fetchSearch(createSearchRequest({ keyword, filter, limit: SEARCH_PAGE_SIZE, offset: 0 }));
      useSearchStore.getState().setResults(result);
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

  const clearSearch = useCallback(() => {
    clearSearchSession(debouncedSearchRef.current, useSearchStore.getState().clear);
  }, []);

  const loadMoreResults = useCallback(async () => {
    const { query, activeFilter, results } = useSearchStore.getState();
    if (!results || results.messages.length >= results.totalCount) return;

    const nextOffset = getNextSearchOffset(results);
    useSearchStore.getState().setLoading(true);

    try {
      const newResult = await fetchSearch(createSearchRequest({
        keyword: query,
        filter: activeFilter,
        limit: SEARCH_PAGE_SIZE,
        offset: nextOffset,
      }));
      useSearchStore.setState((state) => ({
        results: state.results ? mergeSearchResults(state.results, newResult) : newResult,
        loading: false,
        error: null,
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
    clearSearch,
    loadMoreResults,
  };
}

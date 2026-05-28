import { useCallback, useRef } from "react";
import { useSearchStore } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { fetchSearch } from "@l4/network";
import { debounce } from "@/l2-coordinator/diplomat/debounce";

const SEARCH_PAGE_SIZE = 20;

export function useSearchCommander() {
  const store = useSearchStore();

  const executeSearchFn = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      useSearchStore.getState().clear();
      return;
    }
    useSearchStore.getState().setLoading(true);
    try {
      const result = await fetchSearch({ keyword, limit: SEARCH_PAGE_SIZE, offset: 0 });
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
      useSearchStore.getState().setQuery(keyword);
      executeSearchFn(keyword);
    },
    [executeSearchFn],
  );

  const search = useCallback((keyword: string) => {
    useSearchStore.getState().setQuery(keyword);
    debouncedSearchRef.current(keyword);
  }, []);

  const loadMoreResults = useCallback(async () => {
    const { query, results } = useSearchStore.getState();
    if (!results || results.messages.length >= results.totalCount) return;

    const nextOffset = results.offset + SEARCH_PAGE_SIZE;
    useSearchStore.getState().setLoading(true);

    try {
      const newResult = await fetchSearch({ keyword: query, limit: SEARCH_PAGE_SIZE, offset: nextOffset });
      useSearchStore.setState((state) => ({
        results: state.results
          ? {
              ...newResult,
              messages: [...state.results.messages, ...newResult.messages],
              count: state.results.messages.length + newResult.messages.length,
            }
          : newResult,
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
    loadMoreResults,
  };
}

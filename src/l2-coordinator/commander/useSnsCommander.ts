import { useCallback, useMemo } from "react";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import {
  defaultSnsFilters,
  useSnsStore,
  type SnsActiveTab,
  type SnsFilters,
} from "@l2/data-clerk/stores/useSnsStore";
import {
  fetchSnsFeed,
  fetchSnsNotifications,
  fetchSnsSearch,
} from "@l4/network";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import { buildSnsModuleView } from "./snsViewModel";

const SNS_CORRELATION_ID = "p4c-sns";

export function useSnsCommander() {
  const store = useSnsStore();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const view = useMemo(() => buildSnsModuleView(store, privacyOn), [store, privacyOn]);

  const loadSnsModule = useCallback(async (overrides: Partial<SnsFilters> = {}) => {
    const current = useSnsStore.getState();
    const filters = { ...current.filters, ...overrides };
    useSnsStore.getState().setLoading();

    try {
      const [feed, notifications] = await Promise.all([
        fetchSnsFeed(
          {
            limit: filters.limit,
            user: filters.user || undefined,
            since: filters.since || undefined,
            until: filters.until || undefined,
            media: true,
            replace: true,
          },
          createDiagnosticHttpOptions({
            endpointFamily: "sns_feed",
            method: "GET",
            correlationId: SNS_CORRELATION_ID,
            recoveryHint: "retry",
          }),
        ),
        fetchSnsNotifications(
          {
            limit: filters.limit,
            since: filters.since || undefined,
            until: filters.until || undefined,
            includeRead: filters.includeRead,
          },
          createDiagnosticHttpOptions({
            endpointFamily: "sns_notifications",
            method: "GET",
            correlationId: SNS_CORRELATION_ID,
            recoveryHint: "retry",
          }),
        ),
      ]);

      useSnsStore.getState().setData({
        feed: feed.posts,
        notifications: notifications.items,
      });
      useSnsStore.getState().updateFilters(filters);
    } catch {
      useSnsStore.getState().setError("加载朋友圈失败");
    }
  }, []);

  const runSearch = useCallback(async (query?: string) => {
    const state = useSnsStore.getState();
    const keyword = (query ?? state.searchQuery).trim();
    useSnsStore.getState().setSearchQuery(keyword);
    useSnsStore.getState().setActiveTab("search");

    if (!keyword) {
      useSnsStore.getState().setSearchError("请输入朋友圈搜索关键词");
      return;
    }

    useSnsStore.getState().setSearchLoading();
    try {
      const results = await fetchSnsSearch(
        {
          keyword,
          limit: state.filters.limit,
          user: state.filters.user || undefined,
          since: state.filters.since || undefined,
          until: state.filters.until || undefined,
          media: true,
          replace: true,
        },
        createDiagnosticHttpOptions({
          endpointFamily: "sns_search",
          method: "GET",
          correlationId: SNS_CORRELATION_ID,
          recoveryHint: "retry",
        }),
      );
      useSnsStore.getState().setSearchResults(results.posts);
    } catch {
      useSnsStore.getState().setSearchError("搜索朋友圈失败");
    }
  }, []);

  const updateFilters = useCallback(
    (filters: Partial<SnsFilters>) => {
      useSnsStore.getState().updateFilters(filters);
    },
    [],
  );

  const refresh = useCallback(() => {
    void loadSnsModule();
  }, [loadSnsModule]);

  const loadMore = useCallback(() => {
    const nextLimit = useSnsStore.getState().filters.limit + defaultSnsFilters.limit;
    useSnsStore.getState().updateFilters({ limit: nextLimit });
    void loadSnsModule({ limit: nextLimit });
  }, [loadSnsModule]);

  const selectTab = useCallback((tab: SnsActiveTab) => {
    useSnsStore.getState().setActiveTab(tab);
  }, []);

  const clearSearch = useCallback(() => {
    useSnsStore.getState().setSearchQuery("");
    useSnsStore.getState().setSearchResults([]);
  }, []);

  return {
    ...store,
    view,
    privacyOn,
    loadSnsModule,
    refresh,
    retry: refresh,
    loadMore,
    runSearch,
    clearSearch,
    updateFilters,
    selectTab,
    selectPost: (postId: string | null) => useSnsStore.getState().selectPost(postId),
  };
}

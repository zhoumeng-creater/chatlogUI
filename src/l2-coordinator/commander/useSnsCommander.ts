import { useCallback, useMemo, useState } from "react";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import {
  defaultSnsFilters,
  useSnsStore,
  type SnsActiveTab,
  type SnsEndpointState,
  type SnsEndpointStatus,
  type SnsFilters,
} from "@l2/data-clerk/stores/useSnsStore";
import {
  fetchSnsFeed,
  fetchSnsNotifications,
  fetchSnsSearch,
  getSensitiveSnsArticleUrl,
} from "@l4/network";
import { openExternalUrl } from "@l4/system";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import { buildSnsModuleView } from "./snsViewModel";

const SNS_CORRELATION_ID = "p4c-sns";
let snsRequestSequence = 0;

function nextSnsRequestId(prefix: "feed" | "search"): string {
  snsRequestSequence += 1;
  return `${prefix}-${snsRequestSequence}`;
}

interface SnsExternalOpenPromptState {
  postId: string;
  title: string;
  domain: string;
  scheme: "http" | "https";
  url: string;
}

export function useSnsCommander() {
  const store = useSnsStore();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const [externalOpenPromptState, setExternalOpenPromptState] = useState<SnsExternalOpenPromptState | null>(null);
  const [externalOpenError, setExternalOpenError] = useState<string | null>(null);
  const view = useMemo(() => buildSnsModuleView(store, privacyOn), [store, privacyOn]);

  const loadSnsModule = useCallback(async (overrides: Partial<SnsFilters> = {}) => {
    const current = useSnsStore.getState();
    const filters = { ...current.filters, ...overrides };
    const requestId = nextSnsRequestId("feed");
    useSnsStore.getState().setLoading(requestId);

    try {
      const [feedResult, notificationsResult] = await Promise.allSettled([
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

      if (!useSnsStore.getState().isFeedRequestActive(requestId)) return;
      const feed = feedResult.status === "fulfilled" ? feedResult.value.posts : [];
      const notifications = notificationsResult.status === "fulfilled" ? notificationsResult.value.items : [];
      const endpointStatus: SnsEndpointStatus = {
        feed: endpointState(feedResult, feed.length, "动态加载失败"),
        notifications: endpointState(notificationsResult, notifications.length, "通知加载失败"),
      };

      useSnsStore.getState().setData({
        feed,
        notifications,
      }, requestId, endpointStatus);
      useSnsStore.getState().updateFilters(filters);
    } catch {
      useSnsStore.getState().setError("加载朋友圈失败", requestId);
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

    const requestId = nextSnsRequestId("search");
    useSnsStore.getState().setSearchLoading(requestId);
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
      useSnsStore.getState().setSearchResults(results.posts, requestId);
    } catch {
      useSnsStore.getState().setSearchError("搜索朋友圈失败", requestId);
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

  const requestArticleOpen = useCallback((postId: string) => {
    setExternalOpenError(null);
    if (privacyOn) {
      setExternalOpenError("隐私模式下不打开外部文章，避免暴露浏览上下文。");
      return;
    }

    const state = useSnsStore.getState();
    const post = [...state.feed, ...state.searchResults].find((item) => item.id === postId);
    const article = post?.article;
    const url = getSensitiveSnsArticleUrl(article);
    if (!post || !article?.externalDomain || !article.externalScheme || !url) {
      setExternalOpenError("这条文章没有可安全确认的外链，已阻止打开。");
      return;
    }

    setExternalOpenPromptState({
      postId,
      title: article.title || article.description || "朋友圈文章",
      domain: article.externalDomain,
      scheme: article.externalScheme,
      url,
    });
  }, [privacyOn]);

  const confirmExternalOpen = useCallback(async () => {
    const prompt = externalOpenPromptState;
    if (!prompt) return;
    const result = await openExternalUrl(prompt.url);
    if (!result.ok) {
      setExternalOpenError(result.message);
      return;
    }
    setExternalOpenPromptState(null);
    setExternalOpenError(null);
  }, [externalOpenPromptState]);

  const cancelExternalOpen = useCallback(() => {
    setExternalOpenPromptState(null);
    setExternalOpenError(null);
  }, []);

  const externalOpenPrompt = externalOpenPromptState
    ? {
        postId: externalOpenPromptState.postId,
        title: externalOpenPromptState.title,
        domain: externalOpenPromptState.domain,
        scheme: externalOpenPromptState.scheme,
      }
    : null;

  return {
    ...store,
    view,
    privacyOn,
    externalOpenPrompt,
    externalOpenError,
    loadSnsModule,
    refresh,
    retry: refresh,
    loadMore,
    runSearch,
    clearSearch,
    updateFilters,
    selectTab,
    selectPost: (postId: string | null) => useSnsStore.getState().selectPost(postId),
    requestArticleOpen,
    confirmExternalOpen,
    cancelExternalOpen,
  };
}

function endpointState<T>(
  result: PromiseSettledResult<T>,
  itemCount: number,
  error: string,
): SnsEndpointState {
  if (result.status === "rejected") return { status: "error", error };
  return { status: itemCount > 0 ? "ready" : "empty", error: null };
}

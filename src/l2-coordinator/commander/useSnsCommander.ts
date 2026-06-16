import { useCallback, useMemo, useState } from "react";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import {
  defaultSnsFilters,
  useSnsStore,
  type SnsActiveTab,
  type SnsEndpointState,
  type SnsEndpointStatus,
  type SnsFilterField,
  type SnsFilters,
} from "@l2/data-clerk/stores/useSnsStore";
import {
  fetchSnsFeed,
  fetchSnsNotifications,
  fetchSnsSearch,
  getSensitiveSnsArticleUrl,
  type AdaptedSnsPost,
} from "@l4/network";
import { openExternalUrl } from "@l4/system";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import { buildSnsModuleView } from "./snsViewModel";
import { createSnsExportArtifact } from "./businessExportModel";
import { useBusinessExportCommander } from "./useBusinessExportCommander";
import type { WorkspaceScopeClearAction } from "./workspaceScopeModel";
import {
  bindActionableEmptyStateActions,
  buildActionableEmptyState,
  type ActionableEmptyStateView,
} from "./actionableEmptyStateModel";
import {
  activeTabLabel,
  applySnsDraftFilters,
  buildAppliedFilterSummary,
  buildSnsExportScopeSummary,
  clearSnsFilterField,
  validateSnsDraftFilters,
} from "./snsFilterModel";

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
  const emptyStates = useMemo(() => buildSnsEmptyStates({
    emptyCopy: view.emptyCopy,
    privacyOn,
    searchQuery: store.searchQuery,
  }), [privacyOn, store.searchQuery, view.emptyCopy]);
  const businessExport = useBusinessExportCommander({
    source: "sns",
    formats: ["markdown", "csv", "json"],
    defaultFormat: "markdown",
    disabledReason: canExportSnsView(store) ? null : "朋友圈加载完成后可导出当前视图。",
    buildArtifact: ({ format, privacyOn: exportPrivacyOn, requestedUnredacted, unredactedConfirmed, generatedAt }) => {
      const posts = visibleSnsPostsForExport(store);
      const notifications = store.activeTab === "notifications" ? store.notifications : [];
      const selectedPost = resolveSelectedSnsPostForExport(store);
      const redactSummary = exportPrivacyOn || !requestedUnredacted || !unredactedConfirmed;
      return createSnsExportArtifact({
        format,
        privacyOn: exportPrivacyOn,
        requestedUnredacted,
        unredactedConfirmed,
        generatedAt,
        activeTab: store.activeTab,
        activeTabLabel: activeTabLabel(store.activeTab),
        scopeSummary: buildSnsExportScopeSummary({
          activeTab: store.activeTab,
          appliedFilters: store.filters,
          loadedCount: loadedSnsCount(store),
          visibleCount: visibleSnsCount(store),
          searchQuery: store.searchQuery,
          privacyOn: redactSummary,
        }),
        appliedFilterSummary: buildAppliedFilterSummary(store.filters, redactSummary),
        searchQuery: store.activeTab === "search" ? store.searchQuery : "",
        loadedCount: loadedSnsCount(store),
        visibleCount: visibleSnsCount(store),
        filters: {
          user: store.filters.user,
          since: store.filters.since,
          until: store.filters.until,
          contentType: store.filters.contentType,
          mediaOnly: store.filters.mediaOnly,
          includeRead: store.filters.includeRead,
        },
        posts: posts.map((post) => ({
          id: post.id,
          author: post.author.displayName || post.author.username,
          content: post.content,
          time: post.time,
          contentType: post.contentType,
          mediaCount: post.mediaCount,
          articleUrl: post.article?.sensitiveExternalUrl ?? null,
        })),
        selectedPost: selectedPost
          ? {
              id: selectedPost.id,
              author: selectedPost.author.displayName || selectedPost.author.username,
              content: selectedPost.content,
              time: selectedPost.time,
              contentType: selectedPost.contentType,
              mediaCount: selectedPost.mediaCount,
            }
          : null,
        notifications: notifications.map((notification) => ({
          id: notification.id,
          actor: notification.actor.displayName || notification.actor.username,
          content: notification.content || notification.feedPreview,
          time: notification.time,
          type: notification.type,
        })),
      });
    },
  });

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
      useSnsStore.getState().setSearchResults([]);
      useSnsStore.getState().selectPost(null);
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

  const updateDraftFilters = useCallback(
    (filters: Partial<Omit<SnsFilters, "limit">>) => {
      useSnsStore.getState().setDraftFilters(filters);
    },
    [],
  );

  const applyFilters = useCallback(() => {
    const state = useSnsStore.getState();
    const validation = validateSnsDraftFilters(state.draftFilters);
    if (!validation.ok) {
      useSnsStore.getState().setFilterError(validation.message);
      useSnsStore.getState().setFilterDrawerOpen(true);
      return;
    }

    const plan = applySnsDraftFilters(state.draftFilters, state.filters);
    useSnsStore.getState().applyDraftFilters();
    clearSelectedPostIfHidden();

    if (plan.shouldReload) {
      void loadSnsModule(plan.appliedFilters);
      if (state.activeTab === "search" && state.searchQuery.trim()) {
        void runSearch(state.searchQuery);
      }
    }
  }, [loadSnsModule, runSearch]);

  const resetFilters = useCallback(() => {
    useSnsStore.getState().updateFilters({ ...defaultSnsFilters });
    useSnsStore.getState().setFilterDrawerOpen(false);
    clearSelectedPostIfHidden();
    void loadSnsModule({ ...defaultSnsFilters });
    const state = useSnsStore.getState();
    if (state.activeTab === "search" && state.searchQuery.trim()) {
      void runSearch(state.searchQuery);
    }
  }, [loadSnsModule, runSearch]);

  const clearAppliedFilter = useCallback((field: SnsFilterField) => {
    const state = useSnsStore.getState();
    const nextFilters = clearSnsFilterField(state.filters, field);
    useSnsStore.getState().clearAppliedFilter(field);
    clearSelectedPostIfHidden();

    if (isRequestBackedFilterField(field)) {
      void loadSnsModule(nextFilters);
      if (state.activeTab === "search" && state.searchQuery.trim()) {
        void runSearch(state.searchQuery);
      }
    }
  }, [loadSnsModule, runSearch]);

  const clearWorkspaceScopeFilter = useCallback((action: WorkspaceScopeClearAction) => {
    const state = useSnsStore.getState();
    const resolution = resolveSnsScopeClearAction(action, state.filters);
    if (!resolution) return false;

    useSnsStore.getState().updateFilters(resolution.nextFilters);
    clearSelectedPostIfHidden();

    if (resolution.requestBacked) {
      void loadSnsModule(resolution.nextFilters);
      if (state.activeTab === "search" && state.searchQuery.trim()) {
        void runSearch(state.searchQuery);
      }
    }
    return true;
  }, [loadSnsModule, runSearch]);

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
    emptyStates,
    businessExport,
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
    updateDraftFilters,
    applyFilters,
    resetFilters,
    clearAppliedFilter,
    clearWorkspaceScopeFilter,
    setFilterDrawerOpen: (open: boolean) => useSnsStore.getState().setFilterDrawerOpen(open),
    setDensity: (density: "compact" | "comfortable") => useSnsStore.getState().setDensity(density),
    selectTab,
    selectPost: (postId: string | null) => useSnsStore.getState().selectPost(postId),
    requestArticleOpen,
    confirmExternalOpen,
    cancelExternalOpen,
  };
}

interface SnsEmptyStateBundle {
  timeline: ActionableEmptyStateView;
  search: ActionableEmptyStateView;
  notifications: ActionableEmptyStateView;
}

function buildSnsEmptyStates({
  emptyCopy,
  privacyOn,
  searchQuery,
}: {
  emptyCopy: string;
  privacyOn: boolean;
  searchQuery: string;
}): SnsEmptyStateBundle {
  const base = {
    readiness: {
      serviceConfigured: true,
      httpReady: true,
      dbReady: true,
      hasCurrentConversation: true,
    },
    privacyOn,
  } as const;
  const supported = ["clear-filters", "refresh"] as const;

  return {
    timeline: {
      ...bindActionableEmptyStateActions(
        buildActionableEmptyState({
          variant: "sns-empty",
          ...base,
        }),
        supported,
      ),
      title: emptyCopy,
    },
    search: {
      ...bindActionableEmptyStateActions(
        buildActionableEmptyState({
          variant: searchQuery.trim() ? "search-no-results" : "sns-empty",
          ...base,
        }),
        supported,
      ),
      title: emptyCopy,
    },
    notifications: {
      ...buildActionableEmptyState({
        variant: "sns-empty",
        ...base,
      }),
      title: emptyCopy,
      actions: [
        {
          id: "refresh",
          label: "刷新朋友圈",
          variant: "secondary",
          disabled: false,
          disabledReason: null,
        },
        {
          id: "clear-filters",
          label: "查看动态列表",
          variant: "ghost",
          disabled: false,
          disabledReason: null,
        },
      ],
    },
  };
}

function canExportSnsView(store: ReturnType<typeof useSnsStore.getState>): boolean {
  if (store.activeTab === "search") {
    return store.searchStatus === "ready" || store.searchStatus === "empty";
  }
  if (store.activeTab === "notifications") {
    return store.status === "ready" || store.status === "empty" || store.status === "partial";
  }
  return store.status === "ready" || store.status === "empty" || store.status === "partial";
}

function endpointState<T>(
  result: PromiseSettledResult<T>,
  itemCount: number,
  error: string,
): SnsEndpointState {
  if (result.status === "rejected") return { status: "error", error };
  return { status: itemCount > 0 ? "ready" : "empty", error: null };
}

type SnsStoreSnapshot = ReturnType<typeof useSnsStore.getState>;

function loadedSnsCount(store: SnsStoreSnapshot): number {
  if (store.activeTab === "search") return store.searchResults.length;
  if (store.activeTab === "notifications") return store.notifications.length;
  return store.feed.length;
}

function visibleSnsCount(store: SnsStoreSnapshot): number {
  if (store.activeTab === "search") return filterSnsPosts(store.searchResults, store.filters).length;
  if (store.activeTab === "notifications") return store.notifications.length;
  return filterSnsPosts(store.feed, store.filters).length;
}

function visibleSnsPostsForExport(store: SnsStoreSnapshot): AdaptedSnsPost[] {
  if (store.activeTab === "search") return filterSnsPosts(store.searchResults, store.filters);
  if (store.activeTab === "timeline") return filterSnsPosts(store.feed, store.filters);
  return [];
}

export function resolveSelectedSnsPostForExport(
  store: Pick<SnsStoreSnapshot, "selectedPostId" | "feed" | "searchResults" | "filters">,
): AdaptedSnsPost | null {
  if (!store.selectedPostId) return null;
  return (
    filterSnsPosts(store.feed, store.filters).find((post) => post.id === store.selectedPostId) ??
    filterSnsPosts(store.searchResults, store.filters).find((post) => post.id === store.selectedPostId) ??
    null
  );
}

export interface SnsScopeClearResolution {
  fields: SnsFilterField[];
  nextFilters: SnsFilters;
  requestBacked: boolean;
}

export function resolveSnsScopeClearAction(
  action: WorkspaceScopeClearAction,
  filters: SnsFilters,
): SnsScopeClearResolution | null {
  if (action.type !== "clearField") return null;
  let fields: SnsFilterField[];
  if (action.field === "selectedContacts") fields = ["user"];
  else if (action.field === "dateRange") fields = ["since", "until"];
  else if (action.field === "snsContentType") fields = ["contentType"];
  else if (action.field === "snsMediaOnly") fields = ["mediaOnly"];
  else if (action.field === "snsReadState") fields = ["includeRead"];
  else return null;

  const nextFilters = fields.reduce<SnsFilters>(
    (current, field) => clearSnsFilterField(current, field),
    filters,
  );
  return {
    fields,
    nextFilters,
    requestBacked: fields.some(isRequestBackedFilterField),
  };
}

function filterSnsPosts(posts: AdaptedSnsPost[], filters: SnsFilters): AdaptedSnsPost[] {
  return posts.filter((post) => postMatchesFilters(post, filters));
}

function postMatchesFilters(post: AdaptedSnsPost, filters: SnsFilters): boolean {
  if (filters.contentType !== "all" && post.contentType !== filters.contentType) return false;
  if (filters.mediaOnly && post.mediaCount === 0) return false;
  return true;
}

function clearSelectedPostIfHidden(): void {
  const state = useSnsStore.getState();
  if (!state.selectedPostId) return;
  const stillVisible = [...state.feed, ...state.searchResults].some(
    (post) => post.id === state.selectedPostId && postMatchesFilters(post, state.filters),
  );
  if (!stillVisible) {
    useSnsStore.getState().selectPost(null);
  }
}

function isRequestBackedFilterField(field: SnsFilterField): boolean {
  return field === "user" || field === "since" || field === "until" || field === "includeRead";
}

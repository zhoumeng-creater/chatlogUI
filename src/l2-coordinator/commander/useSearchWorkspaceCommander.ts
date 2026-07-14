import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import { maskDisplayText } from "@/utils/privacyDisplay";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import {
  useSearchStore,
  type SearchReadiness,
  type SearchResults,
} from "@l2/data-clerk/stores/useSearchStore";
import { useSearchPreferenceStore } from "@l2/data-clerk/stores/useSearchPreferenceStore";
import {
  buildSearchAdvancedFilterChips,
  clearSearchAdvancedFilter,
  formatDateRange,
  searchGroupModeLabel,
  searchSortModeLabel,
  type SearchAdvancedFiltersState,
  type SearchAdvancedFilterField,
  type SearchSortMode,
  type SearchGroupMode,
} from "./searchAdvancedFilters";
import { createSearchSnippet } from "./searchSnippet";
import { moveSearchHit, resolveSearchHitNavigator } from "./searchHitNavigator";
import {
  buildWorkspaceScopeModel,
  type WorkspaceScopeClearAction,
  type WorkspaceScopeKind,
} from "./workspaceScopeModel";
import { resolveSearchHitNavigation } from "./searchNavigation";
import { createSearchReturnSnapshot } from "./searchReturnSnapshot";
import { useScopedWorkspaceConversation } from "./useScopedWorkspaceConversation";
import { useSearchCommander } from "./useSearchCommander";
import { resolveSearchStoreScope } from "./searchWorkspaceContext";
import { createSearchExportArtifact } from "./businessExportModel";
import { useBusinessExportCommander } from "./useBusinessExportCommander";
import { recordSearchResultOpenedKpiEvent } from "./uxKpiEvents";
import {
  bindActionableEmptyStateActions,
  buildActionableEmptyState,
} from "./actionableEmptyStateModel";

function withSmokeQuery(route: string): string {
  if (typeof window === "undefined") return route;
  return new URLSearchParams(window.location.search).get("codex-smoke") === "workbench-ready"
    ? `${route}?codex-smoke=workbench-ready`
    : route;
}

export function useSearchWorkspaceCommander() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const scopedChat = params.get("chat");
  const scopedScope = params.get("scope");
  const routeSource = params.get("source");
  const routeFocus = params.get("focus");
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const recentQueries = useSearchPreferenceStore((state) => state.recentQueries);
  const loadRecentQueries = useSearchPreferenceStore((state) => state.loadFromStorage);
  const deleteRecentQuery = useSearchPreferenceStore((state) => state.deleteRecentQuery);
  const clearRecentQueries = useSearchPreferenceStore((state) => state.clearRecentQueries);
  const { chat, currentConversation, currentChat, workspaceRouteScope } =
    useScopedWorkspaceConversation({
      scope: scopedScope,
      scopedChat,
      source: routeSource,
      focus: routeFocus,
      defaultScope: scopedScope === "all" ? "all" : "currentChat",
    });
  const search = useSearchCommander({ scopedChat: scopedChat ?? currentChat });
  const { activeFilter, changeFilter, changeScope, scope } = search;
  const routeSearchScope = resolveSearchStoreScope({
    routeScope: scopedScope,
    routeHasScopedChat: Boolean(scopedChat?.trim()),
  });

  useEffect(() => {
    if (scope === routeSearchScope) return;
    changeScope(routeSearchScope);
  }, [changeScope, routeSearchScope, scope]);

  useEffect(() => {
    loadRecentQueries(privacyOn);
  }, [loadRecentQueries, privacyOn]);

  const updateRouteScopeParams = useCallback(
    (update: (next: URLSearchParams) => void) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          update(next);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const selectScope = useCallback(
    (kind: WorkspaceScopeKind) => {
      if (kind === "currentConversation") {
        changeScope("current");
        updateRouteScopeParams((next) => {
          next.set("scope", "currentChat");
          if (currentChat) next.set("chat", currentChat);
        });
        return;
      }
      if (kind === "allConversations") {
        changeScope("all");
        updateRouteScopeParams((next) => {
          next.set("scope", "all");
          next.delete("chat");
        });
      }
    },
    [changeScope, currentChat, updateRouteScopeParams],
  );

  const selectMessageType = useCallback(
    (type: SearchFilterType) => {
      changeFilter(type);
    },
    [changeFilter],
  );

  const clearScopeChip = useCallback(
    (action: WorkspaceScopeClearAction) => {
      if (action.type === "setScope" && action.scopeKind) {
        selectScope(action.scopeKind);
        return;
      }
      if (action.field === "messageType") {
        changeFilter("all");
        return;
      }
      if (action.field === "focusMessage" || action.field === "sourceRoute") {
        updateRouteScopeParams((next) => {
          if (action.field === "focusMessage") next.delete("focus");
          if (action.field === "sourceRoute") next.delete("source");
        });
      }
    },
    [changeFilter, selectScope, updateRouteScopeParams],
  );

  const resetScope = useCallback(() => {
    changeScope("all");
    changeFilter("all");
    updateRouteScopeParams((next) => {
      next.set("scope", "all");
      next.delete("chat");
      next.delete("focus");
      next.delete("source");
    });
  }, [changeFilter, changeScope, updateRouteScopeParams]);

  const changeAdvancedFilters = useCallback(
    (filters: SearchAdvancedFiltersState) => {
      search.changeAdvancedFilters(filters);
    },
    [search],
  );

  const clearAdvancedFilter = useCallback(
    (field: SearchAdvancedFilterField) => {
      search.changeAdvancedFilters(clearSearchAdvancedFilter(search.advancedFilters, field));
    },
    [search],
  );

  const executeSearch = useCallback(
    (keyword: string) => {
      search.executeSearch(keyword);
    },
    [search],
  );

  const useRecentQuery = useCallback(() => {}, []);

  const activeFilterChips = useMemo(
    () => buildSearchAdvancedFilterChips(search.advancedFilters),
    [search.advancedFilters],
  );
  const searchResultsPresentation = useMemo(
    () =>
      buildSearchResultsPresentation({
        results: search.results,
        query: search.appliedQuery,
        privacyOn,
        activeResultId: search.activeResultId,
        advancedFilters: search.advancedFilters,
        navigationByMessageId: search.navigationByMessageId,
      }),
    [
      privacyOn,
      search.activeResultId,
      search.advancedFilters,
      search.appliedQuery,
      search.navigationByMessageId,
      search.results,
    ],
  );
  const moveHit = useCallback(
    (direction: "previous" | "next" | "first" | "last") => {
      const nextId = moveSearchHit({
        messages: searchResultsPresentation.orderedMessages,
        activeResultId: search.activeResultId,
        direction,
      });
      search.setActiveResultId(nextId);
    },
    [search, searchResultsPresentation.orderedMessages],
  );
  const filterSummary = useMemo(
    () =>
      buildSearchExportFilterSummary({
        activeFilter: search.appliedFilter ?? activeFilter,
        scope: search.appliedScope ?? scope,
        advancedFilters: search.advancedFilters,
        activeFilterCount: activeFilterChips.length,
      }),
    [
      activeFilter,
      activeFilterChips.length,
      scope,
      search.advancedFilters,
      search.appliedFilter,
      search.appliedScope,
    ],
  );

  const scopeController = buildWorkspaceScopeModel({
    moduleId: "search",
    routeScope: workspaceRouteScope,
    state: {
      kind: scope === "current" ? "currentConversation" : "allConversations",
      messageType: activeFilter,
      sourceRoute: routeSource,
      focusMessage: routeFocus,
    },
    pending: search.loading,
  });
  const businessExport = useBusinessExportCommander({
    source: "search",
    formats: ["markdown", "csv", "json"],
    defaultFormat: "markdown",
    disabledReason: search.results ? null : "先完成一次搜索后再导出。",
    buildArtifact: ({
      format,
      privacyOn: exportPrivacyOn,
      requestedUnredacted,
      unredactedConfirmed,
      generatedAt,
    }) =>
      createSearchExportArtifact({
        format,
        privacyOn: exportPrivacyOn,
        requestedUnredacted,
        unredactedConfirmed,
        generatedAt,
        query: search.appliedQuery,
        scopeSummary: search.appliedScope === "current" ? "当前会话" : "全部会话",
        filterSummary,
        totalCount: search.results?.totalCount ?? 0,
        loadedCount: search.results?.messages.length ?? 0,
        messages: search.results?.messages ?? [],
      }),
  });
  const searchEmptyStates = useMemo(
    () => ({
      notStarted: bindActionableEmptyStateActions(
        buildActionableEmptyState({
          variant: "search-not-started",
          readiness: buildSearchEmptyStateReadiness(
            Boolean(scopedChat?.trim() || currentChat),
            search.readiness,
          ),
          privacyOn,
        }),
        ["clear-filters"],
      ),
      noResults: bindActionableEmptyStateActions(
        buildActionableEmptyState({
          variant: "search-no-results",
          readiness: buildSearchEmptyStateReadiness(
            Boolean(scopedChat?.trim() || currentChat),
            search.readiness,
          ),
          privacyOn,
        }),
        ["clear-filters", "refresh"],
      ),
      filteredNoResults: bindActionableEmptyStateActions(
        buildActionableEmptyState({
          variant: "filters-no-results",
          readiness: buildSearchEmptyStateReadiness(
            Boolean(scopedChat?.trim() || currentChat),
            search.readiness,
          ),
          privacyOn,
        }),
        ["clear-filters", "refresh"],
      ),
    }),
    [currentChat, privacyOn, scopedChat, search.readiness],
  );

  const navigateToResult = useCallback(
    async (message: SearchResults["messages"][number], allowNearbyFallback: boolean) => {
      const state = useSearchStore.getState();
      if (state.navigationByMessageId[message.id]?.status === "loading") return;
      const fallbackIndex =
        search.results?.messages.findIndex((item) => item.id === message.id) ?? 0;
      const sourceIndex = Number.isSafeInteger(message.sourceIndex)
        ? (message.sourceIndex ?? 0)
        : Math.max(0, fallbackIndex);
      state.beginResultNavigation(message.id, sourceIndex);

      const target = createSearchResultNavigationTarget({
        message,
        conversations: chat.conversations,
        returnRoute: buildSearchReturnRoute(params),
        scrollAnchor: message.id,
      });
      if (!target.ok) {
        useSearchStore.getState().failResultNavigation(message.id, target.message, false);
        return;
      }

      const navigation = await chat.selectAndLoadAtAnchor(target, { allowNearbyFallback });
      if (!navigation.ok) {
        useSearchStore
          .getState()
          .failResultNavigation(message.id, navigation.message, navigation.nearbyFallbackAvailable);
        return;
      }

      useSearchStore.getState().clearResultNavigation(message.id);
      const resultScope = search.appliedScope ?? scope;
      recordSearchResultOpenedKpiEvent({
        rankBucket: toSearchResultRankBucket(fallbackIndex),
        scopeKind: resultScope === "current" ? "current" : "all",
        hasAnchor:
          target.anchor.seq !== null ||
          target.anchor.localId !== null ||
          target.anchor.timestamp !== null,
        outcome: "success",
      });
      navigate(withSmokeQuery("/workbench"));
    },
    [chat, navigate, params, scope, search.appliedScope, search.results],
  );
  const openResult = useCallback(
    (message: SearchResults["messages"][number]) => navigateToResult(message, false),
    [navigateToResult],
  );
  const openResultNearTime = useCallback(
    (message: SearchResults["messages"][number]) => navigateToResult(message, true),
    [navigateToResult],
  );

  return {
    chat,
    currentConversation,
    hasCurrentConversation: Boolean(scopedChat?.trim() || currentChat),
    openResult,
    retryResult: openResult,
    openResultNearTime,
    privacyOn,
    search,
    scopeController,
    selectScope,
    selectMessageType,
    clearScopeChip,
    resetScope,
    recentQueries,
    activeFilterChips,
    searchResultsView: searchResultsPresentation.viewModel,
    changeAdvancedFilters,
    clearAdvancedFilter,
    executeSearch,
    useRecentQuery,
    deleteRecentQuery,
    clearRecentQueries,
    moveHit,
    businessExport,
    searchEmptyStates,
  };
}

const SAFE_SEARCH_RETURN_PARAMS = ["scope", "chat", "source", "focus", "codex-smoke"] as const;

export function buildSearchReturnRoute(params: URLSearchParams): string {
  const safe = new URLSearchParams();
  for (const key of SAFE_SEARCH_RETURN_PARAMS) {
    const value = params.get(key)?.trim();
    if (value) safe.set(key, value);
  }
  const query = safe.toString();
  return query ? `/search?${query}` : "/search";
}

export function createSearchResultNavigationTarget({
  message,
  conversations,
  returnRoute,
  scrollAnchor,
}: {
  message: SearchResults["messages"][number];
  conversations: Parameters<typeof resolveSearchHitNavigation>[0]["conversations"];
  returnRoute: string;
  scrollAnchor: string | null;
}) {
  const state = useSearchStore.getState();
  const preferences = useSearchPreferenceStore.getState();
  const appliedScope = state.applied?.draft.scope;
  const scope = appliedScope?.kind === "current" ? "current" : "all";
  const activeSourceIndex = Number.isSafeInteger(message.sourceIndex)
    ? (message.sourceIndex ?? null)
    : (state.resultWindow?.activeSourceIndex ?? null);
  const returnSnapshot =
    state.applied && state.resultWindow
      ? createSearchReturnSnapshot({
          draft: state.draft,
          applied: state.applied,
          resultWindow: state.resultWindow,
          stale: state.stale,
          activeSourceIndex,
          scrollAnchor,
          sortMode: preferences.sortMode,
          groupingMode: preferences.groupingMode,
          capturedAt: Date.now(),
        })
      : undefined;

  return resolveSearchHitNavigation({
    message,
    conversations,
    returnRoute,
    querySnapshot: {
      query: state.applied?.draft.keyword ?? "",
      filter: compatibilityFilterForReturn(state.applied?.draft.categories ?? []),
      scope,
      scopeChat: appliedScope?.kind === "current" ? appliedScope.chatId : null,
    },
    returnSnapshot,
  });
}

function compatibilityFilterForReturn(categories: readonly string[]): SearchFilterType {
  if (categories.length !== 1) return "all";
  if (categories[0] === "text") return "text";
  if (categories[0] === "image_emoji") return "image";
  if (categories[0] === "video") return "video";
  if (categories[0] === "file") return "file";
  return "all";
}

export function buildSearchEmptyStateReadiness(
  hasCurrentConversation: boolean,
  readiness: SearchReadiness,
) {
  return {
    serviceConfigured: true,
    httpReady: readiness.httpReady,
    dbReady: readiness.dbReady,
    hasCurrentConversation,
  };
}

function searchFilterLabel(filter: SearchFilterType): string {
  if (filter === "text") return "文本";
  if (filter === "image") return "图片";
  if (filter === "video") return "视频";
  if (filter === "file") return "文件";
  return "全部类型";
}

function buildSearchExportFilterSummary({
  activeFilter,
  scope,
  advancedFilters,
  activeFilterCount,
}: {
  activeFilter: SearchFilterType;
  scope: "all" | "current";
  advancedFilters: SearchAdvancedFiltersState;
  activeFilterCount: number;
}): string[] {
  const summary = [
    `消息类型：${searchFilterLabel(activeFilter)}`,
    `范围：${scope === "current" ? "当前会话" : "全部会话"}`,
    `时间：${formatDateRange(advancedFilters.dateRange)}`,
    `指定会话：${advancedFilters.selectedChats.length} 个`,
    `排序：${searchSortModeLabel(advancedFilters.sortMode as SearchSortMode)}`,
    `分组：${searchGroupModeLabel(advancedFilters.groupMode as SearchGroupMode)}`,
    `高级筛选：${activeFilterCount} 项`,
  ];
  if (advancedFilters.sender) summary.push("发送者筛选：当前后端不支持");
  if (advancedFilters.favoriteOnly) summary.push("收藏筛选：当前后端不支持");
  if (advancedFilters.attachmentOnly) summary.push("附件筛选：当前后端不支持");
  return summary;
}

function buildSearchResultsPresentation({
  results,
  query,
  privacyOn,
  activeResultId,
  advancedFilters,
  navigationByMessageId,
}: {
  results: SearchResults | null;
  query: string;
  privacyOn: boolean;
  activeResultId: string | null;
  advancedFilters: SearchAdvancedFiltersState;
  navigationByMessageId: ReturnType<typeof useSearchStore.getState>["navigationByMessageId"];
}) {
  if (!results) {
    return { viewModel: null, orderedMessages: [] as SearchResults["messages"] };
  }

  const orderedMessages = sortSearchMessages(results.messages, advancedFilters.sortMode);
  const navigator = resolveSearchHitNavigator({ messages: orderedMessages, activeResultId });
  const firstId = orderedMessages[0]?.id ?? null;
  const groups = groupSearchMessages(orderedMessages, advancedFilters.groupMode, privacyOn).map(
    (group) => ({
      key: group.key,
      label: group.label,
      items: group.messages.map((message) => ({
        message,
        senderLabel: privacyOn
          ? maskDisplayText(message.sender || message.chat || message.username || "未知发送者")
          : message.sender || message.chat || message.username,
        snippetSegments: createSearchSnippet({
          content: message.content,
          query,
          privacyOn,
        }).segments,
        active: message.id === activeResultId || (!activeResultId && message.id === firstId),
        navigation: navigationByMessageId[message.id] ?? null,
      })),
    }),
  );

  return {
    orderedMessages,
    viewModel: {
      sortLabel: searchSortModeLabel(advancedFilters.sortMode),
      groupLabel: searchGroupModeLabel(advancedFilters.groupMode),
      navigator: {
        label: navigator.label,
        hasPrevious: navigator.hasPrevious,
        hasNext: navigator.hasNext,
      },
      groups,
    },
  };
}

function sortSearchMessages(
  messages: SearchResults["messages"],
  sortMode: SearchSortMode,
): SearchResults["messages"] {
  if (sortMode === "relevance") return [...messages];
  return [...messages].sort((left, right) => {
    const delta = normalizeSearchTimestamp(right) - normalizeSearchTimestamp(left);
    return sortMode === "time-desc" ? delta : -delta;
  });
}

function groupSearchMessages(
  messages: SearchResults["messages"],
  groupMode: SearchGroupMode,
  privacyOn: boolean,
): Array<{ key: string; label: string | null; messages: SearchResults["messages"] }> {
  if (groupMode === "flat") return [{ key: "flat", label: null, messages }];

  const groups = new Map<string, SearchResults["messages"]>();
  for (const message of messages) {
    const key =
      groupMode === "conversation"
        ? message.chat || message.username || "未知会话"
        : formatSearchDateGroup(message);
    groups.set(key, [...(groups.get(key) ?? []), message]);
  }

  return Array.from(groups.entries()).map(([key, groupMessages]) => ({
    key,
    label: privacyOn && groupMode === "conversation" ? maskDisplayText(key) : key,
    messages: groupMessages,
  }));
}

function normalizeSearchTimestamp(message: SearchResults["messages"][number]): number {
  if (message.time) {
    const fromTime = new Date(message.time).getTime();
    if (!Number.isNaN(fromTime)) return fromTime;
  }
  return message.timestamp > 1_000_000_000_000 ? message.timestamp : message.timestamp * 1000;
}

function formatSearchDateGroup(message: SearchResults["messages"][number]): string {
  const date = new Date(normalizeSearchTimestamp(message));
  if (Number.isNaN(date.getTime())) return "未知日期";
  return date.toLocaleDateString("zh-CN");
}

function toSearchResultRankBucket(index: number): string {
  if (index < 0) return "unknown";
  const rank = index + 1;
  if (rank <= 10) return "top-10";
  if (rank <= 50) return "top-50";
  return "after-50";
}

import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import { maskDisplayText } from "@/utils/privacyDisplay";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import type { SearchResults } from "@l2/data-clerk/stores/useSearchStore";
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
  const addRecentQuery = useSearchPreferenceStore((state) => state.addRecentQuery);
  const deleteRecentQuery = useSearchPreferenceStore((state) => state.deleteRecentQuery);
  const clearRecentQueries = useSearchPreferenceStore((state) => state.clearRecentQueries);
  const { chat, currentConversation, currentChat, workspaceRouteScope } = useScopedWorkspaceConversation({
    scope: scopedScope,
    scopedChat,
    source: routeSource,
    focus: routeFocus,
    defaultScope: scopedScope === "all" ? "all" : "currentChat",
  });
  const search = useSearchCommander({ scopedChat: scopedChat ?? currentChat });
  const {
    activeFilter,
    changeFilter,
    changeScope,
    query,
    scope,
    setError,
  } = search;
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

  const updateRouteScopeParams = useCallback((update: (next: URLSearchParams) => void) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      update(next);
      return next;
    }, { replace: true });
  }, [setParams]);

  const selectScope = useCallback((kind: WorkspaceScopeKind) => {
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
  }, [changeScope, currentChat, updateRouteScopeParams]);

  const selectMessageType = useCallback((type: SearchFilterType) => {
    changeFilter(type);
  }, [changeFilter]);

  const clearScopeChip = useCallback((action: WorkspaceScopeClearAction) => {
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
  }, [changeFilter, selectScope, updateRouteScopeParams]);

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

  const changeAdvancedFilters = useCallback((filters: SearchAdvancedFiltersState) => {
    search.changeAdvancedFilters(filters);
  }, [search]);

  const clearAdvancedFilter = useCallback((field: SearchAdvancedFilterField) => {
    search.changeAdvancedFilters(clearSearchAdvancedFilter(search.advancedFilters, field));
  }, [search]);

  const executeSearch = useCallback((keyword: string) => {
    addRecentQuery(keyword, privacyOn);
    search.executeSearch(keyword);
  }, [addRecentQuery, privacyOn, search]);

  const useRecentQuery = useCallback((keyword: string) => {
    addRecentQuery(keyword, privacyOn);
  }, [addRecentQuery, privacyOn]);

  const activeFilterChips = useMemo(
    () => buildSearchAdvancedFilterChips(search.advancedFilters),
    [search.advancedFilters],
  );
  const searchResultsPresentation = useMemo(() => buildSearchResultsPresentation({
    results: search.results,
    query,
    privacyOn,
    activeResultId: search.activeResultId,
    advancedFilters: search.advancedFilters,
  }), [privacyOn, query, search.activeResultId, search.advancedFilters, search.results]);
  const moveHit = useCallback((direction: "previous" | "next" | "first" | "last") => {
    const nextId = moveSearchHit({
      messages: searchResultsPresentation.orderedMessages,
      activeResultId: search.activeResultId,
      direction,
    });
    search.setActiveResultId(nextId);
  }, [search, searchResultsPresentation.orderedMessages]);
  const filterSummary = useMemo(() => buildSearchExportFilterSummary({
    activeFilter,
    scope,
    advancedFilters: search.advancedFilters,
    activeFilterCount: activeFilterChips.length,
  }), [activeFilter, activeFilterChips.length, scope, search.advancedFilters]);

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
    buildArtifact: ({ format, privacyOn: exportPrivacyOn, requestedUnredacted, unredactedConfirmed, generatedAt }) =>
      createSearchExportArtifact({
        format,
        privacyOn: exportPrivacyOn,
        requestedUnredacted,
        unredactedConfirmed,
        generatedAt,
        query,
        scopeSummary: scope === "current" ? "当前会话" : "全部会话",
        filterSummary,
        totalCount: search.results?.totalCount ?? 0,
        loadedCount: search.results?.messages.length ?? 0,
        messages: search.results?.messages ?? [],
      }),
  });
  const searchEmptyStates = useMemo(() => ({
    notStarted: bindActionableEmptyStateActions(buildActionableEmptyState({
      variant: "search-not-started",
      readiness: buildReadySearchEmptyStateReadiness(Boolean(scopedChat?.trim() || currentChat)),
      privacyOn,
    }), ["clear-filters"]),
    noResults: bindActionableEmptyStateActions(buildActionableEmptyState({
      variant: "search-no-results",
      readiness: buildReadySearchEmptyStateReadiness(Boolean(scopedChat?.trim() || currentChat)),
      privacyOn,
    }), ["clear-filters", "refresh"]),
    filteredNoResults: bindActionableEmptyStateActions(buildActionableEmptyState({
      variant: "filters-no-results",
      readiness: buildReadySearchEmptyStateReadiness(Boolean(scopedChat?.trim() || currentChat)),
      privacyOn,
    }), ["clear-filters", "refresh"]),
  }), [currentChat, privacyOn, scopedChat]);

  const openResult = useCallback(
    async (message: SearchResults["messages"][number]) => {
      const scopeChat = scope === "current"
        ? ((scopedChat ?? currentChat) || null)
        : null;
      const target = resolveSearchHitNavigation({
        message,
        conversations: chat.conversations,
        returnRoute: withSmokeQuery("/search"),
        querySnapshot: {
          query,
          filter: activeFilter,
          scope,
          scopeChat,
        },
      });
      if (!target.ok) {
        setError(target.message);
        return;
      }
      await chat.selectAndLoadAtAnchor(target);
      recordSearchResultOpenedKpiEvent({
        rankBucket: toSearchResultRankBucket(search.results?.messages.findIndex((item) => item.id === message.id) ?? -1),
        scopeKind: scope === "current" ? "current" : "all",
        hasAnchor: target.anchor.localId !== null || target.anchor.timestamp !== null,
        outcome: "success",
      });
      navigate(withSmokeQuery("/workbench"));
    },
    [
      chat,
      currentChat,
      navigate,
      activeFilter,
      query,
      scopedChat,
      scope,
      setError,
      search.results,
    ],
  );

  return {
    chat,
    currentConversation,
    hasCurrentConversation: Boolean(scopedChat?.trim() || currentChat),
    openResult,
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

function buildReadySearchEmptyStateReadiness(hasCurrentConversation: boolean) {
  return {
    serviceConfigured: true,
    httpReady: true,
    dbReady: true,
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
}: {
  results: SearchResults | null;
  query: string;
  privacyOn: boolean;
  activeResultId: string | null;
  advancedFilters: SearchAdvancedFiltersState;
}) {
  if (!results) {
    return { viewModel: null, orderedMessages: [] as SearchResults["messages"] };
  }

  const orderedMessages = sortSearchMessages(results.messages, advancedFilters.sortMode);
  const navigator = resolveSearchHitNavigator({ messages: orderedMessages, activeResultId });
  const firstId = orderedMessages[0]?.id ?? null;
  const groups = groupSearchMessages(orderedMessages, advancedFilters.groupMode, privacyOn)
    .map((group) => ({
      key: group.key,
      label: group.label,
      items: group.messages.map((message) => ({
        message,
        senderLabel: privacyOn
          ? maskDisplayText(message.sender || message.chat || message.username || "未知发送者")
          : (message.sender || message.chat || message.username),
        snippetSegments: createSearchSnippet({
          content: message.content,
          query,
          privacyOn,
        }).segments,
        active: message.id === activeResultId || (!activeResultId && message.id === firstId),
      })),
    }));

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
    const key = groupMode === "conversation"
      ? (message.chat || message.username || "未知会话")
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

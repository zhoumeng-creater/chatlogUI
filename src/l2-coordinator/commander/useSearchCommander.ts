import { useCallback, useEffect, useMemo } from "react";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import {
  useSearchStore,
  type SearchResults,
  type SearchScope,
} from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { useSearchPreferenceStore } from "@/l2-coordinator/data-clerk/stores/useSearchPreferenceStore";
import { useSetupStore } from "@/l2-coordinator/data-clerk/stores/useSetupStore";
import type { SearchAdvancedFiltersState } from "./searchAdvancedFilters";
import { useSearchRequest } from "./useSearchRequest";

interface SearchCommanderOptions {
  scopedChat?: string | null;
}

/**
 * Search page facade during the L3 migration. Network execution is owned by
 * useSearchRequest; every edit method below changes draft/view state only.
 */
export function useSearchCommander(options: SearchCommanderOptions = {}) {
  const store = useSearchStore();
  const request = useSearchRequest();
  const httpReady = useSetupStore((state) => state.httpReady);
  const dbReady = useSetupStore((state) => state.dbReady);

  useEffect(() => {
    useSearchStore.getState().setReadiness({ httpReady, dbReady });
    if (httpReady) void request.probeCapabilities();
  }, [dbReady, httpReady, request]);

  useEffect(() => {
    const state = useSearchStore.getState();
    if (state.draft.scope.kind !== "current") return;
    const chatId = normalizePrivateId(options.scopedChat);
    if (state.draft.scope.chatId === chatId) return;
    state.setDraft({ ...state.draft, scope: { kind: "current", chatId } });
  }, [options.scopedChat]);

  const search = useCallback((keyword: string) => {
    const state = useSearchStore.getState();
    state.setDraft({ ...state.draft, keyword });
    state.setQuery(keyword);
  }, []);

  const executeSearch = useCallback(
    async (keyword: string) => {
      search(keyword);
      return request.submit();
    },
    [request, search],
  );

  const changeFilter = useCallback((filter: SearchFilterType) => {
    const state = useSearchStore.getState();
    state.setFilter(filter);
    state.setDraft({ ...state.draft, categories: legacyFilterCategories(filter) });
  }, []);

  const changeScope = useCallback(
    (scope: SearchScope) => {
      const state = useSearchStore.getState();
      state.setScope(scope);
      state.setDraft({
        ...state.draft,
        scope:
          scope === "all"
            ? { kind: "all" }
            : { kind: "current", chatId: normalizePrivateId(options.scopedChat) },
      });
    },
    [options.scopedChat],
  );

  const changeAdvancedFilters = useCallback((advancedFilters: SearchAdvancedFiltersState) => {
    const state = useSearchStore.getState();
    const selectedChatIds = advancedFilters.selectedChats
      .map((item) => normalizePrivateId(item.id))
      .filter((item): item is string => item !== null);
    const currentScope = state.draft.scope;
    const scope =
      selectedChatIds.length > 0
        ? { kind: "selected" as const, chatIds: [...new Set(selectedChatIds)] }
        : currentScope.kind === "selected"
          ? { kind: "all" as const }
          : currentScope;
    state.setAdvancedFilters(advancedFilters);
    state.setDraft({
      ...state.draft,
      scope,
      dateRange: advancedFilters.dateRange ? { ...advancedFilters.dateRange } : {},
    });
    useSearchPreferenceStore
      .getState()
      .setSortMode(advancedFilters.sortMode === "time-asc" ? "oldest" : "newest");
    useSearchPreferenceStore
      .getState()
      .setGroupingMode(advancedFilters.groupMode === "flat" ? "none" : advancedFilters.groupMode);
  }, []);

  const cancelSearch = useCallback(() => request.cancelPending(), [request]);

  const clearSearch = useCallback(() => {
    const state = useSearchStore.getState();
    state.setDraft({ ...state.draft, keyword: "" });
    state.setQuery("");
  }, []);

  const endSearch = useCallback(() => {
    request.cancelPending();
    useSearchStore.getState().endSearch();
  }, [request]);

  const loadMoreResults = useCallback(() => request.load("forward"), [request]);
  const retrySearch = useCallback(() => request.retry(), [request]);
  const refreshSearch = useCallback(() => request.refresh(), [request]);

  const results = useMemo(() => toCompatibilityResults(store.resultWindow), [store.resultWindow]);
  const lifecycle = store.applied ? store.replacementRequest : store.firstRequest;
  const loading = store.pending !== null;
  const status = compatibilityStatus({
    hasSnapshot: store.resultWindow !== null,
    totalCount: store.resultWindow?.totalCount ?? 0,
    lifecycle,
  });
  const error = compatibilityGlobalError(store.resultWindow, lifecycle);
  const appliedDraft = store.applied?.draft ?? null;

  return {
    ...store,
    query: store.draft.keyword,
    scope: compatibilityScope(store.draft.scope),
    activeFilter: compatibilityFilter(store.draft.categories),
    appliedQuery: appliedDraft?.keyword ?? "",
    appliedScope: appliedDraft ? compatibilityScope(appliedDraft.scope) : null,
    appliedFilter: appliedDraft ? compatibilityFilter(appliedDraft.categories) : null,
    appliedScopeChat: appliedDraft?.scope.kind === "current" ? appliedDraft.scope.chatId : null,
    results,
    loading,
    status,
    error,
    search,
    executeSearch,
    changeFilter,
    changeScope,
    changeAdvancedFilters,
    cancelSearch,
    clearSearch,
    endSearch,
    loadMoreResults,
    retrySearch,
    refreshSearch,
  };
}

function legacyFilterCategories(filter: SearchFilterType) {
  if (filter === "text") return ["text" as const];
  if (filter === "image") return ["image_emoji" as const];
  if (filter === "video") return ["video" as const];
  if (filter === "file") return ["file" as const];
  return [];
}

function compatibilityFilter(categories: readonly string[]): SearchFilterType {
  if (categories.length !== 1) return "all";
  if (categories[0] === "text") return "text";
  if (categories[0] === "image_emoji") return "image";
  if (categories[0] === "video") return "video";
  if (categories[0] === "file") return "file";
  return "all";
}

function compatibilityScope(
  scope: ReturnType<typeof useSearchStore.getState>["draft"]["scope"],
): SearchScope {
  return scope.kind === "current" ? "current" : "all";
}

export function toCompatibilityResults(
  window: ReturnType<typeof useSearchStore.getState>["resultWindow"],
): SearchResults | null {
  if (!window) return null;
  const hits = window.browseMode === "paged" ? window.currentPageHits : window.retainedHits;
  return {
    totalCount: window.exactTotal && window.completeScope ? window.totalCount : hits.length,
    count: hits.length,
    limit: 50,
    offset: window.browseMode === "paged" ? window.currentPageStart : 0,
    messages: hits.map((hit) => ({
      id: hit.messageId,
      messageId: hit.messageId,
      seq: hit.seq,
      sourceIndex: hit.sourceIndex,
      conversationId: hit.conversationId,
      senderId: hit.senderId,
      localId: Number.isSafeInteger(hit.seq) ? hit.seq : undefined,
      timestamp: hit.timestamp,
      content: hit.snippet,
      sender: hit.senderName,
      username: hit.conversationId,
      chat: hit.conversationName,
      type: hit.category,
    })),
  };
}

export function compatibilityGlobalError(
  window: ReturnType<typeof useSearchStore.getState>["resultWindow"],
  lifecycle: ReturnType<typeof useSearchStore.getState>["firstRequest"],
): string | null {
  if (window || lifecycle.status !== "error") return null;
  return lifecycleErrorMessage(lifecycle.errorCode);
}

function compatibilityStatus(input: {
  hasSnapshot: boolean;
  totalCount: number;
  lifecycle: ReturnType<typeof useSearchStore.getState>["firstRequest"];
}) {
  if (input.hasSnapshot) return input.totalCount > 0 ? ("ready" as const) : ("empty" as const);
  if (input.lifecycle.status === "loading") return "loading" as const;
  if (input.lifecycle.status === "error") return "error" as const;
  if (input.lifecycle.status === "cancelled") return "cancelled" as const;
  return "idle" as const;
}

function lifecycleErrorMessage(code: string): string {
  if (code === "service_unavailable") return "本机搜索服务尚未就绪";
  if (code === "database_unavailable") return "聊天数据库尚未就绪";
  if (code === "invalid_request") return "搜索条件需要修正";
  if (code === "capability_unavailable") return "本机搜索服务需要更新后才能执行此搜索";
  if (code === "timeout") return "搜索请求超时，请手动重试";
  if (code === "snapshot_expired" || code === "stale_revision") return "数据已更新，请刷新搜索";
  return "搜索请求失败，请手动重试";
}

function normalizePrivateId(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

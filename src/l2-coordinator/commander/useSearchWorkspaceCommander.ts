import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  SEARCH_CATEGORIES,
  type SearchFilterType,
  type SearchHit,
} from "@/l2-coordinator/api-docs/search";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import type { LoadStatus } from "@l2/data-clerk/stores/useChatStore";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import {
  useSearchStore,
  type SearchRequestErrorField,
  type SearchCapabilitiesState,
  type SearchRequestLifecycle,
  type SearchReadiness,
  type SearchScope as SearchStoreScope,
} from "@l2/data-clerk/stores/useSearchStore";
import type { PortState, SetupMode } from "@l2/data-clerk/types/setup";
import { useSearchPreferenceStore } from "@l2/data-clerk/stores/useSearchPreferenceStore";
import { resolveSearchHitNavigation } from "./searchNavigation";
import { assertSearchSubmissionCapabilities } from "./searchRequestSubmission";
import { createSearchReturnSnapshot } from "./searchReturnSnapshot";
import type { SearchScrollAnchor } from "./searchScrollAnchor";
import { useScopedWorkspaceConversation } from "./useScopedWorkspaceConversation";
import type { WorkspaceRouteScopeView } from "./workspaceRouteScope";
import { useSearchCommander } from "./useSearchCommander";
import { useSetupCommander } from "./useSetupCommander";
import { buildSettingsRoute } from "./settingsNavigation";
import {
  clearSearchDraftCondition,
  createDefaultSearchDraft,
  getSearchDraftDirectorySelectionIds,
  getSearchDraftChange,
  normalizeSearchKeyword,
  replaceSearchDraftScope,
  toggleSearchDraftDirectorySelection,
  validateSearchDraft,
  type SearchDraft,
  type SearchConditionDraftIntent,
  type SearchDraftErrors,
  type SearchScope as SearchDraftScope,
} from "./searchDraftModel";
import {
  createSearchDateShortcut,
  validateSearchDateRange,
  type SearchDateShortcut,
} from "./searchDateRange";
import {
  useSearchDirectoryCommander,
  type SearchSenderDirectoryContext,
} from "./useSearchDirectoryCommander";
import type {
  SearchDirectoryKind,
  SearchDirectoryOption,
  SearchDirectoryStatus,
} from "./searchDirectoryModel";
import { useSearchExportCommander } from "./useSearchExportCommander";
import {
  buildSearchResultPresentation,
  type SearchPresentationGroupingMode,
  type SearchPresentationSortMode,
} from "./searchResultPresentation";
import { createSearchHitIdentity } from "./searchHitIdentity";
import {
  getVisibleSearchHits,
  resolveSearchPageAttempt,
  type SearchLoadedRange,
  type SearchResultWindow,
  type SearchWindowBrowseMode,
} from "./searchResultWindowModel";
import {
  applySearchZeroResultSuggestion,
  buildSearchZeroResultSuggestions,
  type SearchZeroResultSuggestionId,
} from "./searchZeroResultModel";
import { resolveSearchStoreScope } from "./searchWorkspaceContext";
import { recordSearchResultOpenedKpiEvent } from "./uxKpiEvents";

function withSmokeQuery(route: string): string {
  if (typeof window === "undefined") return route;
  return new URLSearchParams(window.location.search).get("codex-smoke") === "workbench-ready"
    ? `${route}?codex-smoke=workbench-ready`
    : route;
}

export type SearchConditionPanelIntent =
  | "scope"
  | "categories"
  | "conversations"
  | "senders"
  | "date"
  | null;

export function applySearchConditionDraftIntent(
  draft: SearchDraft,
  intent: SearchConditionDraftIntent,
): SearchDraft {
  switch (intent.type) {
    case "choose-all-conversations":
      return clearSearchDraftCondition(draft, "scope");
    case "choose-current-conversation": {
      const chatId = intent.conversationId.trim();
      return chatId
        ? replaceSearchDraftScope(draft, { kind: "current", chatId })
        : draft;
    }
    case "clear-message-categories":
      return clearSearchDraftCondition(draft, "categories");
    case "toggle-message-category": {
      const selected = new Set(draft.categories);
      if (selected.has(intent.category)) selected.delete(intent.category);
      else selected.add(intent.category);
      return {
        ...draft,
        categories: SEARCH_CATEGORIES.filter((category) => selected.has(category)),
      };
    }
    case "change-date-range":
      return { ...draft, dateRange: { ...intent.value } };
  }
}

export function shouldApplyExplicitSearchRouteScope(
  currentScope: SearchDraftScope,
  routeScope: SearchStoreScope,
): boolean {
  return currentScope.kind !== routeScope;
}

export function resolveSearchRouteChatId(
  routeScope: WorkspaceRouteScopeView,
  scopedChat?: string | null,
  conversationsStatus: LoadStatus = "ready",
): string | null {
  if (routeScope.state === "current-chat") {
    const chatId = routeScope.currentConversation?.id.trim();
    return chatId || null;
  }
  if (
    routeScope.state === "missing-chat" &&
    (conversationsStatus === "idle" || conversationsStatus === "loading")
  ) {
    const provisionalChatId = scopedChat?.trim();
    return provisionalChatId || null;
  }
  return null;
}

export function isSearchSenderDirectoryAvailable(
  capabilities: SearchCapabilitiesState,
): boolean {
  return capabilities.status === "ready"
    && capabilities.value.senderDirectory
    && capabilities.value.senderFilter;
}

export function searchConditionPanelForErrorField(
  field: SearchRequestErrorField,
): SearchConditionPanelIntent {
  if (field === "scope") return "scope";
  if (field === "categories") return "categories";
  if (field === "senders") return "senders";
  if (field === "dateRange") return "date";
  return null;
}

export type SearchServiceRecoveryPlan =
  | "check-external"
  | "restart-managed"
  | "start-managed";

export function buildSearchServiceRecoveryPlan(
  mode: SetupMode,
  portState: PortState,
): SearchServiceRecoveryPlan {
  if (mode === "external" || portState === "external-chatlog") return "check-external";
  return portState === "owned" ? "restart-managed" : "start-managed";
}

export type SearchReadinessPhase =
  | "not-configured"
  | "service-starting"
  | "service-stopped"
  | "service-failed"
  | "external-unreachable"
  | "database-loading"
  | "database-not-ready"
  | "ready";

export interface SearchReadinessViewInput {
  profileConfigured: boolean;
  mode: SetupMode;
  portState: PortState;
  loading: boolean;
  hasSetupError: boolean;
  httpReady: boolean;
  dbReady: boolean;
  devSmokeReady?: boolean;
}

export interface SearchReadinessView {
  phase: SearchReadinessPhase;
  disabledReason: string | null;
}

export function buildSearchReadinessView(input: SearchReadinessViewInput): SearchReadinessView {
  if (input.devSmokeReady) {
    return { phase: "ready", disabledReason: null };
  }
  if (input.httpReady) {
    if (!input.dbReady) {
      return input.loading
        ? { phase: "database-loading", disabledReason: "正在加载聊天数据库" }
        : { phase: "database-not-ready", disabledReason: "聊天数据库尚未就绪" };
    }
    return { phase: "ready", disabledReason: null };
  }
  if (!input.profileConfigured) {
    return { phase: "not-configured", disabledReason: "请先配置本机聊天数据" };
  }
  if (input.mode === "external" || input.portState === "external-chatlog") {
    return { phase: "external-unreachable", disabledReason: "无法连接外部本机服务" };
  }
  if (input.loading) {
    return { phase: "service-starting", disabledReason: "正在启动本机搜索服务" };
  }
  if (input.hasSetupError || input.portState === "owned") {
    return { phase: "service-failed", disabledReason: "本机搜索服务启动失败" };
  }
  return { phase: "service-stopped", disabledReason: "本机搜索服务尚未启动" };
}

export interface SearchNavigationAttempt {
  attemptId: number;
  resultId: string;
  sourceIndex: number;
  searchIntentGeneration: number;
}

export function isSearchNavigationAttemptCurrent({
  attempt,
  activeAttemptId,
  mounted,
  state,
}: {
  attempt: SearchNavigationAttempt;
  activeAttemptId: number | null;
  mounted: boolean;
  state: ReturnType<typeof useSearchStore.getState>;
}): boolean {
  return Boolean(
    mounted &&
      activeAttemptId === attempt.attemptId &&
      state.searchIntentGeneration === attempt.searchIntentGeneration &&
      state.resultWindow !== null,
  );
}

export function useSearchWorkspaceCommander() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const scopedChat = params.get("chat");
  const scopedScope = params.get("scope");
  const routeSource = params.get("source");
  const routeFocus = params.get("focus");
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const setupProfile = useSetupStore((state) => state.profile);
  const setupMode = useSetupStore((state) => state.mode);
  const setupPortState = useSetupStore((state) => state.portState);
  const setupLoading = useSetupStore((state) => state.loading);
  const setupError = useSetupStore((state) => state.error);
  const setupHttpReady = useSetupStore((state) => state.httpReady);
  const setupDbReady = useSetupStore((state) => state.dbReady);
  const recentQueries = useSearchPreferenceStore((state) => state.recentQueries);
  const presentationSortMode = useSearchPreferenceStore((state) => state.sortMode);
  const presentationGroupingMode = useSearchPreferenceStore((state) => state.groupingMode);
  const setBrowseMode = useSearchPreferenceStore((state) => state.setBrowseMode);
  const setPresentationSortMode = useSearchPreferenceStore((state) => state.setSortMode);
  const setPresentationGroupingMode = useSearchPreferenceStore((state) => state.setGroupingMode);
  const loadRecentQueries = useSearchPreferenceStore((state) => state.loadFromStorage);
  const deleteRecentQuery = useSearchPreferenceStore((state) => state.deleteRecentQuery);
  const clearRecentQueries = useSearchPreferenceStore((state) => state.clearRecentQueries);
  const {
    chat,
    workspaceRouteScope,
    currentConversation,
  } = useScopedWorkspaceConversation({
      scope: scopedScope,
      scopedChat,
      source: routeSource,
      focus: routeFocus,
      defaultScope:
        scopedScope === "currentChat" || Boolean(scopedChat?.trim()) ? "currentChat" : "all",
    });
  const resolvedRouteChatId = resolveSearchRouteChatId(
    workspaceRouteScope,
    scopedChat,
    chat.conversationsStatus,
  );
  const search = useSearchCommander({ scopedChat: resolvedRouteChatId });
  const setupRecovery = useSetupCommander();
  const [searchConditionOpenPanel, setSearchConditionOpenPanel] =
    useState<SearchConditionPanelIntent>(null);
  const [keywordFocusRequestToken, setKeywordFocusRequestToken] = useState(1);
  const requestKeywordFocus = useCallback(() => {
    setKeywordFocusRequestToken((current) => current + 1);
  }, []);
  const directory = useSearchDirectoryCommander();
  const searchExport = useSearchExportCommander();
  const { changeScope, consumeRestoredNavigation, restoredFromNavigation } = search;
  const cancelActiveHistoryRequest = chat.cancelActiveHistoryRequest;
  const hasExplicitRouteScope =
    scopedScope === "all" || scopedScope === "currentChat" || Boolean(scopedChat?.trim());
  const routeSearchScope = resolveSearchStoreScope({
    routeScope: scopedScope,
    routeHasScopedChat: Boolean(scopedChat?.trim()),
  });
  const [initialEntryDraft] = useState(() =>
    cloneSearchDraft(useSearchStore.getState().draft));
  const entryDraftBaseline = useMemo<SearchDraft>(() => {
    const initial = cloneSearchDraft(initialEntryDraft);
    if (!hasExplicitRouteScope) return initial;
    if (routeSearchScope === "all") {
      return replaceSearchDraftScope(initial, { kind: "all" });
    }
    return replaceSearchDraftScope(initial, {
      kind: "current",
      chatId: resolvedRouteChatId,
    });
  }, [
    hasExplicitRouteScope,
    initialEntryDraft,
    resolvedRouteChatId,
    routeSearchScope,
  ]);
  const mountedRef = useRef(true);
  const navigationAttemptSequenceRef = useRef(0);
  const activeNavigationAttemptRef = useRef<SearchNavigationAttempt | null>(null);
  const navigationIntentKey = search.searchIntentGeneration;
  const previousNavigationIntentKeyRef = useRef(navigationIntentKey);
  const appliedRouteScopeKeyRef = useRef<string | null>(null);
  const routeScopeKey = `${scopedScope ?? ""}\u0000${scopedChat ?? ""}`;

  const invalidateResultNavigation = useCallback(() => {
    const active = activeNavigationAttemptRef.current;
    activeNavigationAttemptRef.current = null;
    navigationAttemptSequenceRef.current += 1;
    cancelActiveHistoryRequest();
    if (active) {
      const navigation = useSearchStore.getState().navigationByResultId[active.resultId];
      if (
        navigation?.status === "loading" &&
        navigation.sourceIndex === active.sourceIndex
      ) {
        useSearchStore.getState().clearResultNavigation(active.resultId);
      }
    }
  }, [cancelActiveHistoryRequest]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      invalidateResultNavigation();
    };
  }, [invalidateResultNavigation]);

  useEffect(() => {
    if (previousNavigationIntentKeyRef.current === navigationIntentKey) return;
    previousNavigationIntentKeyRef.current = navigationIntentKey;
    invalidateResultNavigation();
  }, [invalidateResultNavigation, navigationIntentKey]);

  useEffect(() => {
    if (restoredFromNavigation) {
      consumeRestoredNavigation();
      appliedRouteScopeKeyRef.current = routeScopeKey;
      return;
    }
    if (!hasExplicitRouteScope) return;
    if (appliedRouteScopeKeyRef.current === routeScopeKey) return;
    appliedRouteScopeKeyRef.current = routeScopeKey;
    if (!shouldApplyExplicitSearchRouteScope(search.draft.scope, routeSearchScope)) return;
    changeScope(routeSearchScope);
  }, [
    changeScope,
    hasExplicitRouteScope,
    routeSearchScope,
    search.draft.scope,
    consumeRestoredNavigation,
    restoredFromNavigation,
    routeScopeKey,
  ]);

  useEffect(() => {
    loadRecentQueries(privacyOn);
  }, [loadRecentQueries, privacyOn]);

  const searchReadinessView = useMemo(
    () => buildSearchReadinessView({
      profileConfigured: setupProfile !== null,
      mode: setupMode,
      portState: setupPortState,
      loading: setupLoading,
      hasSetupError: Boolean(setupError),
      httpReady: setupHttpReady,
      dbReady: setupDbReady,
      devSmokeReady: readDevSearchReadyOverride(),
    }),
    [
      setupDbReady,
      setupError,
      setupHttpReady,
      setupLoading,
      setupMode,
      setupPortState,
      setupProfile,
    ],
  );

  const searchCommit = useMemo(
    () =>
      buildSearchCommitView(
        search.draft,
        search.applied?.draft ?? null,
        search.pending !== null,
        search.readiness,
        search.capabilities,
        searchReadinessView,
        search.firstRequest,
      ),
    [
      search.applied,
      search.capabilities,
      search.draft,
      search.firstRequest,
      search.pending,
      search.readiness,
      searchReadinessView,
    ],
  );
  const searchRequestRecoveryDisabledReason = useMemo(
    () => buildSearchRequestRecoveryDisabledReason(
      search.readiness,
      search.capabilities,
      searchReadinessView,
    ),
    [search.capabilities, search.readiness, searchReadinessView],
  );
  const searchDraftChange = useMemo(
    () => getSearchDraftChange(search.draft, search.applied?.draft ?? entryDraftBaseline),
    [entryDraftBaseline, search.applied, search.draft],
  );
  const searchDraftErrors = useMemo(
    () => getSearchDraftErrorsForDisplay(
      search.draft,
      search.applied?.draft ?? null,
      search.firstRequest,
    ),
    [search.applied, search.draft, search.firstRequest],
  );
  const searchKeywordGraphemeCount = useMemo(
    () => normalizeSearchKeyword(search.draft.keyword).graphemeCount,
    [search.draft.keyword],
  );
  const searchDateErrors = useMemo(() => {
    const start = search.draft.dateRange.start
      ? validateSearchDateRange({ start: search.draft.dateRange.start })
      : { valid: true };
    const end = search.draft.dateRange.end
      ? validateSearchDateRange({ end: search.draft.dateRange.end })
      : { valid: true };
    const range = validateSearchDateRange(search.draft.dateRange);
    return {
      startError: "startError" in start ? start.startError : undefined,
      endError: "endError" in end ? end.endError : undefined,
      rangeError: "rangeError" in range ? range.rangeError : undefined,
    };
  }, [search.draft.dateRange]);

  const canonicalSearchPresentation = useMemo(() => {
    if (!search.resultWindow) return null;
    return buildSearchResultPresentation(getVisibleSearchHits(search.resultWindow), {
      sortMode: toCanonicalPresentationSortMode(presentationSortMode),
      groupingMode: presentationGroupingMode,
      locale: "zh-CN",
      ...(search.applied?.dateContext.timeZone
        ? { timeZone: search.applied.dateContext.timeZone }
        : {}),
      privacyOn,
    });
  }, [
    presentationGroupingMode,
    presentationSortMode,
    privacyOn,
    search.applied,
    search.resultWindow,
  ]);
  const zeroResultSuggestions = useMemo(
    () =>
      search.applied && search.resultWindow?.totalCount === 0
        ? buildSearchZeroResultSuggestions(search.applied.draft)
        : [],
    [search.applied, search.resultWindow],
  );

  const changeSearchDraft = useCallback(
    (draft: SearchDraft) => {
      useSearchStore.getState().setDraft(draft);
    },
    [],
  );

  const changeSearchConditionDraft = useCallback(
    (intent: SearchConditionDraftIntent) => {
      const state = useSearchStore.getState();
      state.setDraft(applySearchConditionDraftIntent(state.draft, intent));
    },
    [],
  );

  const cancelAllSearchDraftEdits = useCallback(
    () => cancelUnappliedSearchDraft(entryDraftBaseline),
    [entryDraftBaseline],
  );

  const applySearchDateShortcut = useCallback((shortcut: SearchDateShortcut) => {
    const state = useSearchStore.getState();
    state.setDraft({
      ...state.draft,
      dateRange: createSearchDateShortcut(shortcut),
    });
  }, []);

  const changeDirectoryQuery = useCallback(
    (kind: SearchDirectoryKind, query: string) => directory.coordinator.setQuery(kind, query),
    [directory.coordinator],
  );

  const searchDirectory = useCallback(
    (kind: SearchDirectoryKind) => {
      const senderContext = toSearchSenderDirectoryContext(
        useSearchStore.getState().draft.scope,
      );
      if (kind === "sender" && !senderContext) return;
      void directory.coordinator.search(kind, senderContext ?? undefined);
    },
    [directory.coordinator],
  );

  const loadMoreDirectory = useCallback(
    (kind: SearchDirectoryKind) => {
      void directory.coordinator.loadMore(kind);
    },
    [directory.coordinator],
  );

  const toggleDirectorySelection = useCallback(
    (kind: SearchDirectoryKind, option: SearchDirectoryOption) => {
      if (kind !== option.kind) return;
      const state = useSearchStore.getState();
      const next = toggleSearchDraftDirectorySelection(state.draft, kind, option.id);
      const desiredIds = new Set(getSearchDraftDirectorySelectionIds(next, kind));
      const coordinatorHasOption = directory.coordinator
        .getState()[kind]
        .selected.some((selected) => selected.id === option.id);
      if (coordinatorHasOption !== desiredIds.has(option.id)) {
        directory.coordinator.toggleSelection(kind, option);
      }
      state.setDraft(next);
    },
    [directory.coordinator],
  );

  const clearDirectorySelection = useCallback(
    (kind: SearchDirectoryKind) => {
      const selected = directory.coordinator.getState()[kind].selected;
      for (const option of selected) {
        directory.coordinator.toggleSelection(kind, option);
      }
      const state = useSearchStore.getState();
      state.setDraft(clearSearchDraftCondition(
        state.draft,
        kind === "conversation" ? "scope" : "senders",
      ));
    },
    [directory.coordinator],
  );

  const handleSearchConditionPanelChange = useCallback(
    (panel: SearchConditionPanelIntent) => {
      setSearchConditionOpenPanel(panel);
      if (panel !== "conversations" && panel !== "senders") return;
      const kind = panel === "conversations" ? "conversation" : "sender";
      if (
        !shouldRefreshSearchDirectoryOnOpen(
          kind,
          directory.coordinator.getState()[kind].status,
        )
      ) {
        return;
      }
      searchDirectory(kind);
    },
    [directory.coordinator, searchDirectory],
  );

  const probeSearchCapabilitiesAfterReadiness = useCallback(async () => {
    const readiness = useSetupStore.getState();
    if (!readiness.httpReady || !readiness.dbReady) return false;
    return search.reprobeCapabilities();
  }, [search]);

  const recoverSearchService = useCallback(async () => {
    const setupState = useSetupStore.getState();
    const plan = buildSearchServiceRecoveryPlan(setupState.mode, setupState.portState);
    if (plan === "restart-managed") {
      await setupRecovery.stopManagedService();
    }
    if (plan === "restart-managed" || plan === "start-managed") {
      await setupRecovery.startManagedService();
    } else {
      await setupRecovery.checkReadiness();
    }
    await probeSearchCapabilitiesAfterReadiness();
  }, [probeSearchCapabilitiesAfterReadiness, setupRecovery]);

  const recheckSearchDatabase = useCallback(async () => {
    await setupRecovery.checkReadiness();
    await probeSearchCapabilitiesAfterReadiness();
  }, [probeSearchCapabilitiesAfterReadiness, setupRecovery]);

  const openSearchRecoverySettings = useCallback(
    (section: "service" | "data" | "about") => {
      navigate(buildSettingsRoute({
        source: "search",
        returnRoute: "/search",
        section,
      }));
    },
    [navigate],
  );

  const reviewInvalidSearchField = useCallback((field: SearchRequestErrorField) => {
    const panel = searchConditionPanelForErrorField(field);
    if (panel) {
      setSearchConditionOpenPanel(panel);
      return;
    }
    setKeywordFocusRequestToken((token) => token + 1);
  }, []);

  const openConversationWorkspace = useCallback(
    () => navigate(withSmokeQuery("/workbench")),
    [navigate],
  );

  const openSearchExport = useCallback(() => {
    const state = useSearchStore.getState();
    const capabilities = state.capabilities.value;
    if (!state.applied || !state.resultWindow || !capabilities) return false;
    const preferences = useSearchPreferenceStore.getState();
    const presentation = freezeSearchExportPresentation(preferences);
    return searchExport.openDialog({
      applied: state.applied,
      resultWindow: state.resultWindow,
      capabilities,
      stale: state.stale,
      sortMode: presentation.sortMode,
      groupingMode: presentation.groupingMode,
      format: "markdown",
      privacyOn: useSettingsStore.getState().settings.privacyOn,
      locale: "zh-CN",
      openedAt: Date.now(),
    });
  }, [searchExport]);

  const searchExportDisabledReason = search.resultWindow
    ? search.capabilities.value
      ? null
      : "正在确认搜索导出能力。"
    : "先完成一次搜索后再导出。";

  const changeResultBrowseMode = useCallback(
    (mode: SearchWindowBrowseMode, outgoingScrollAnchor: SearchScrollAnchor | null) => {
      const state = useSearchStore.getState();
      if (state.resultWindow) state.switchResultBrowseMode(mode, outgoingScrollAnchor);
      setBrowseMode(mode);
    },
    [setBrowseMode],
  );

  const changeResultSortMode = useCallback(
    (mode: SearchPresentationSortMode) => {
      setPresentationSortMode(mode === "oldest" ? "oldest" : "newest");
    },
    [setPresentationSortMode],
  );

  const changeResultGroupingMode = useCallback(
    (mode: SearchPresentationGroupingMode) => setPresentationGroupingMode(mode),
    [setPresentationGroupingMode],
  );

  const activateSearchHit = useCallback((_resultId: string, sourceIndex: number) => {
    useSearchStore.getState().setResultActiveSourceIndex(sourceIndex);
  }, []);

  const loadSearchBoundary = useCallback(
    (direction: "forward" | "backward") => {
      if (direction === "forward") return search.loadMoreResults();
      return search.loadPreviousResults();
    },
    [search],
  );

  const loadSearchPage = useCallback(
    (
      cursor: string,
      targetPageStart: number,
      outgoingScrollAnchor: SearchScrollAnchor | null,
    ) => {
      const state = useSearchStore.getState();
      return requestReachableSearchPage(
        state.resultWindow,
        cursor,
        targetPageStart,
        search.loadPageResults,
        () => state.rememberResultPageReadingPosition(outgoingScrollAnchor),
      );
    },
    [search],
  );

  const loadSearchGap = useCallback(
    (gap: SearchLoadedRange) => search.loadGapResults(gap),
    [search],
  );

  const consumeResultRestoreScrollAnchor = useCallback(
    () => useSearchStore.getState().consumeResultRestoreScrollAnchor(),
    [],
  );

  const applyZeroResultSuggestion = useCallback(
    (suggestion: SearchZeroResultSuggestionId) => {
      if (suggestion === "edit-keyword") return false;
      const state = useSearchStore.getState();
      state.setDraft(applySearchZeroResultSuggestion(state.draft, suggestion));
      return true;
    },
    [],
  );

  const executeSearch = useCallback(
    (keyword: string) => {
      search.executeSearch(keyword);
    },
    [search],
  );

  const endSearch = useCallback(() => {
    search.endSearch();
    requestKeywordFocus();
  }, [requestKeywordFocus, search]);

  const navigateToResult = useCallback(
    async (
      message: SearchHit,
      allowNearbyFallback: boolean,
      scrollAnchor: SearchScrollAnchor | null,
    ) => {
      const state = useSearchStore.getState();
      const resultId = createSearchHitIdentity(message);
      if (state.navigationByResultId[resultId]?.status === "loading") return;
      if (!state.resultWindow) return;
      const previousAttempt = activeNavigationAttemptRef.current;
      if (previousAttempt) {
        const previousNavigation = state.navigationByResultId[previousAttempt.resultId];
        if (
          previousNavigation?.status === "loading" &&
          previousNavigation.sourceIndex === previousAttempt.sourceIndex
        ) {
          state.clearResultNavigation(previousAttempt.resultId);
        }
      }
      const fallbackIndex = Math.max(
        0,
        getVisibleSearchHits(state.resultWindow).findIndex(
          (item) => createSearchHitIdentity(item) === resultId,
        ),
      );
      const sourceIndex = Number.isSafeInteger(message.sourceIndex)
        ? message.sourceIndex
        : Math.max(0, fallbackIndex);
      state.beginResultNavigation(resultId, sourceIndex);
      const attempt: SearchNavigationAttempt = {
        attemptId: ++navigationAttemptSequenceRef.current,
        resultId,
        sourceIndex,
        searchIntentGeneration: state.searchIntentGeneration,
      };
      activeNavigationAttemptRef.current = attempt;

      const target = createSearchResultNavigationTarget({
        message,
        conversations: chat.conversations,
        returnRoute: buildSearchReturnRoute(params),
        scrollAnchor,
      });
      if (!target.ok) {
        useSearchStore.getState().failResultNavigation(resultId, target.message, false);
        activeNavigationAttemptRef.current = null;
        return;
      }

      const navigation = await chat.selectAndLoadAtAnchor(target, { allowNearbyFallback });
      if (
        !isSearchNavigationAttemptCurrent({
          attempt,
          activeAttemptId: activeNavigationAttemptRef.current?.attemptId ?? null,
          mounted: mountedRef.current,
          state: useSearchStore.getState(),
        })
      ) {
        return;
      }
      if (!navigation.ok) {
        useSearchStore
          .getState()
          .failResultNavigation(resultId, navigation.message, navigation.nearbyFallbackAvailable);
        activeNavigationAttemptRef.current = null;
        return;
      }

      useSearchStore.getState().clearResultNavigation(resultId);
      activeNavigationAttemptRef.current = null;
      const resultScope = search.applied?.draft.scope ?? search.draft.scope;
      recordSearchResultOpenedKpiEvent({
        rankBucket: toSearchResultRankBucket(fallbackIndex),
        scopeKind: resultScope.kind === "current" ? "current" : "all",
        hasAnchor:
          target.anchor.seq !== null ||
          target.anchor.localId !== null ||
          target.anchor.timestamp !== null,
        outcome: "success",
      });
      navigate(withSmokeQuery("/workbench"));
    },
    [chat, navigate, params, search.applied?.draft.scope, search.draft.scope],
  );
  const openResult = useCallback(
    (message: SearchHit, scrollAnchor: SearchScrollAnchor | null) =>
      navigateToResult(message, false, scrollAnchor),
    [navigateToResult],
  );
  const openResultNearTime = useCallback(
    (message: SearchHit, scrollAnchor: SearchScrollAnchor | null) =>
      navigateToResult(message, true, scrollAnchor),
    [navigateToResult],
  );

  return {
    openResult,
    retryResult: openResult,
    openResultNearTime,
    privacyOn,
    search,
    endSearch,
    searchCommit,
    searchReadinessView,
    searchRequestRecoveryDisabledReason,
    searchDraftDirtySources: searchDraftChange.dirtySources,
    searchDraftErrors,
    searchKeywordGraphemeCount,
    searchDateErrors,
    searchConditionCurrentConversation: buildSearchConditionCurrentConversation(
      currentConversation,
      search.draft.scope.kind === "current" ? search.draft.scope.chatId : null,
    ),
    conversationDirectory: directory.conversation,
    senderDirectory: directory.sender,
    senderDirectoryAvailable: isSearchSenderDirectoryAvailable(search.capabilities),
    changeSearchDraft,
    changeSearchConditionDraft,
    cancelAllSearchDraftEdits,
    applySearchDateShortcut,
    changeDirectoryQuery,
    searchDirectory,
    loadMoreDirectory,
    toggleDirectorySelection,
    clearDirectorySelection,
    searchConditionOpenPanel,
    keywordFocusRequestToken,
    requestKeywordFocus,
    handleSearchConditionPanelChange,
    recoverSearchService,
    recheckSearchDatabase,
    reprobeSearchCapabilities: search.reprobeCapabilities,
    reviewInvalidSearchField,
    openSearchRecoverySettings,
    openConversationWorkspace,
    searchExport,
    openSearchExport,
    searchExportDisabledReason,
    canonicalSearchPresentation,
    resultSortMode: presentationSortMode,
    resultGroupingMode: presentationGroupingMode,
    appliedSearchScopeLabel: formatAppliedSearchScope(search.applied?.draft.scope ?? null),
    changeResultBrowseMode,
    changeResultSortMode,
    changeResultGroupingMode,
    activateSearchHit,
    loadSearchBoundary,
    loadSearchPage,
    loadSearchGap,
    consumeResultRestoreScrollAnchor,
    zeroResultSuggestions,
    applyZeroResultSuggestion,
    recentQueries,
    executeSearch,
    deleteRecentQuery,
    clearRecentQueries,
  };
}

export interface SearchCommitView {
  label: "搜索" | "应用筛选";
  disabled: boolean;
  disabledReason: string | null;
}

export function isPristineSearchIdle(
  draft: SearchDraft,
  applied: SearchDraft | null,
  firstRequest: SearchRequestLifecycle,
): boolean {
  return draft.keyword === "" && applied === null && firstRequest.status === "idle";
}

export function getSearchDraftErrorsForDisplay(
  draft: SearchDraft,
  applied: SearchDraft | null,
  firstRequest: SearchRequestLifecycle,
): SearchDraftErrors {
  const errors = validateSearchDraft(draft).errors;
  if (!isPristineSearchIdle(draft, applied, firstRequest)) return errors;
  const visibleErrors = { ...errors };
  delete visibleErrors.keyword;
  return visibleErrors;
}

export function requestReachableSearchPage(
  resultWindow: Pick<
    SearchResultWindow,
    "pageCursors" | "currentPageStart" | "totalCount"
  > | null,
  cursor: string,
  targetPageStart: number,
  loadPageResults: (cursor: string, targetPageStart: number) => unknown,
  rememberCurrentPage?: () => unknown,
): boolean {
  if (!resultWindow || !resolveSearchPageAttempt(resultWindow, cursor, targetPageStart)) return false;
  rememberCurrentPage?.();
  void loadPageResults(cursor, targetPageStart);
  return true;
}

export function toCanonicalPresentationSortMode(
  preference: "newest" | "oldest",
): SearchPresentationSortMode {
  // The strict sidecar baseline is newest-first. Preserve source order so
  // positional gap rows remain truthful; only oldest-first is a local reorder.
  return preference === "newest" ? "baseline" : "oldest";
}

export function freezeSearchExportPresentation(input: {
  sortMode: "newest" | "oldest";
  groupingMode: SearchPresentationGroupingMode;
}): {
  sortMode: SearchPresentationSortMode;
  groupingMode: SearchPresentationGroupingMode;
} {
  return {
    sortMode: toCanonicalPresentationSortMode(input.sortMode),
    groupingMode: input.groupingMode,
  };
}

export function cancelUnappliedSearchDraft(
  entryBaseline: SearchDraft = createDefaultSearchDraft(),
): boolean {
  const state = useSearchStore.getState();
  const baseline = state.applied?.draft ?? entryBaseline;
  if (getSearchDraftChange(state.draft, baseline).dirtySources.length === 0) {
    return false;
  }
  state.setDraft(cloneSearchDraft(baseline));
  return true;
}

export function buildSearchCommitView(
  draft: SearchDraft,
  applied: SearchDraft | null,
  pending: boolean,
  readiness: SearchReadiness,
  capabilities?: SearchCapabilitiesState,
  readinessView?: SearchReadinessView,
  firstRequest: SearchRequestLifecycle = { status: "idle" },
): SearchCommitView {
  const validation = validateSearchDraft(draft);
  const label = getSearchDraftChange(draft, applied).submitLabel;
  if (pending) return { label, disabled: true, disabledReason: "正在准备新结果" };
  if (readinessView?.disabledReason) {
    return { label, disabled: true, disabledReason: readinessView.disabledReason };
  }
  if (!readiness.httpReady) {
    return { label, disabled: true, disabledReason: "正在启动本机搜索服务" };
  }
  if (!readiness.dbReady) {
    return { label, disabled: true, disabledReason: "正在加载聊天数据库" };
  }
  if (capabilities?.status === "idle" || capabilities?.status === "loading") {
    return { label, disabled: true, disabledReason: "正在确认完整搜索能力" };
  }
  if (capabilities?.status === "error" || (capabilities && !capabilities.value)) {
    return { label, disabled: true, disabledReason: "完整搜索能力暂不可用" };
  }
  if (!validation.valid) {
    if (isPristineSearchIdle(draft, applied, firstRequest) && validation.errors.keyword) {
      const hasNonKeywordError = [
        validation.errors.scope,
        validation.errors.categories,
        validation.errors.senders,
        validation.errors.dateRange,
      ].some(Boolean);
      if (!hasNonKeywordError) {
        return { label, disabled: true, disabledReason: null };
      }
    }
    const reason = validation.errors.keyword ??
      validation.errors.scope ??
      validation.errors.categories ??
      validation.errors.senders ??
      validation.errors.dateRange ??
      "请检查搜索条件";
    return { label, disabled: true, disabledReason: reason };
  }
  if (capabilities?.status === "ready" && capabilities.value) {
    try {
      assertSearchSubmissionCapabilities(draft, capabilities.value);
    } catch {
      return {
        label,
        disabled: true,
        disabledReason: "当前本机服务不支持这组完整搜索条件",
      };
    }
  }
  return { label, disabled: false, disabledReason: null };
}

export function buildSearchRequestRecoveryDisabledReason(
  readiness: SearchReadiness,
  capabilities: SearchCapabilitiesState,
  readinessView?: SearchReadinessView,
): string | null {
  if (readinessView?.disabledReason) return `${readinessView.disabledReason}。`;
  if (!readiness.httpReady) return "等待本机搜索服务就绪。";
  if (!readiness.dbReady) return "等待聊天数据库就绪。";
  if (capabilities.status !== "ready" || !capabilities.value) {
    return "等待完整搜索能力确认。";
  }
  return null;
}

function readDevSearchReadyOverride(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("codex-smoke") === "workbench-ready";
}

export function toSearchSenderDirectoryContext(
  scope: SearchDraftScope,
): SearchSenderDirectoryContext | null {
  if (scope.kind === "all") return { scope: "all", chats: [] };
  if (scope.kind === "current") {
    return scope.chatId ? { scope: "current", chats: [scope.chatId] } : null;
  }
  return scope.chatIds.length > 0
    ? { scope: "selected", chats: [...scope.chatIds] }
    : null;
}

export function buildSearchConditionCurrentConversation(
  conversation: { id: string; displayName?: string; username?: string } | null,
  currentScopeChatId: string | null,
): { id: string; label: string } | null {
  if (conversation?.id.trim()) {
    return {
      id: conversation.id,
      label: conversation.displayName?.trim() || conversation.username?.trim() || "未命名会话",
    };
  }
  const id = currentScopeChatId?.trim();
  return id ? { id, label: "会话名称加载中" } : null;
}

export function shouldRefreshSearchDirectoryOnOpen(
  kind: SearchDirectoryKind,
  status: SearchDirectoryStatus,
): boolean {
  return kind === "sender" || status === "idle";
}

function cloneSearchDraft(draft: SearchDraft): SearchDraft {
  return {
    ...draft,
    scope:
      draft.scope.kind === "selected"
        ? { kind: "selected", chatIds: [...draft.scope.chatIds] }
        : { ...draft.scope },
    categories: [...draft.categories],
    senderIds: [...draft.senderIds],
    dateRange: { ...draft.dateRange },
  };
}

function formatAppliedSearchScope(scope: SearchDraftScope | null): string {
  if (!scope || scope.kind === "all") return "全部会话";
  if (scope.kind === "current") return "当前会话";
  return `指定的 ${scope.chatIds.length.toLocaleString()} 个会话`;
}

export function buildSearchReturnRoute(params: URLSearchParams): string {
  const safe = new URLSearchParams();
  const smokeMarker = params.get("codex-smoke")?.trim();
  if (smokeMarker === "workbench-ready") safe.set("codex-smoke", smokeMarker);
  const query = safe.toString();
  return query ? `/search?${query}` : "/search";
}

export function createSearchResultNavigationTarget({
  message,
  conversations,
  returnRoute,
  scrollAnchor,
}: {
  message: SearchHit;
  conversations: Parameters<typeof resolveSearchHitNavigation>[0]["conversations"];
  returnRoute: string;
  scrollAnchor: SearchScrollAnchor | null;
}) {
  const state = useSearchStore.getState();
  const appliedScope = state.applied?.draft.scope;
  const scope = appliedScope?.kind === "current" ? "current" : "all";
  const activeSourceIndex = Number.isSafeInteger(message.sourceIndex)
    ? message.sourceIndex
    : (state.resultWindow?.activeSourceIndex ?? null);
  const preferences = useSearchPreferenceStore.getState();
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
    dataRevision: state.resultWindow?.dataRevision,
    historyContextAvailable:
      state.capabilities.status === "ready"
        ? state.capabilities.value.mode === "v2" &&
          state.capabilities.value.historyContextVersion === "history.context.v1" &&
          state.capabilities.value.historyContextQuery &&
          state.capabilities.value.historyContextRevisionBinding
        : undefined,
    querySnapshot: {
      query: state.applied?.draft.keyword ?? "",
      filter: deriveReturnMessageFilter(state.applied?.draft.categories ?? []),
      scope,
      scopeChat: appliedScope?.kind === "current" ? appliedScope.chatId : null,
    },
    returnSnapshot,
  });
}

function deriveReturnMessageFilter(categories: readonly string[]): SearchFilterType {
  if (categories.length !== 1) return "all";
  if (categories[0] === "text") return "text";
  if (categories[0] === "image_emoji") return "image";
  if (categories[0] === "video") return "video";
  if (categories[0] === "file") return "file";
  return "all";
}

function toSearchResultRankBucket(index: number): string {
  if (index < 0) return "unknown";
  const rank = index + 1;
  if (rank <= 10) return "top-10";
  if (rank <= 50) return "top-50";
  return "after-50";
}

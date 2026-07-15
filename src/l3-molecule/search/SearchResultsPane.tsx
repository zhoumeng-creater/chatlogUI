import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  CircleEllipsis,
  FileText,
  Image,
  Link,
  MapPin,
  MessageSquare,
  Mic,
  Quote,
  Video,
} from "lucide-react";
import type { SearchHit } from "@l2/api-docs/search";
import type {
  SearchPresentationGroupingMode,
  SearchPresentationRow,
  SearchPresentationSortMode,
  SearchResultPresentation,
} from "@l2/commander/searchResultPresentation";
import {
  getReachableSearchPages,
  getSearchBoundaryRemainingCount,
  getSearchGapCursor,
  resolveSearchPageAttempt,
  SEARCH_RESULT_BATCH_SIZE,
  SearchLoadedRange,
  SearchResultWindow,
  SearchWindowBrowseMode,
  SearchWindowOperationStatus,
} from "@l2/commander/searchResultWindowModel";
import {
  calculateSearchScrollCorrection,
  createSearchScrollAnchor,
  isSearchScrollAnchorAligned,
  resolveSearchAnchorAfterLoad,
  type SearchScrollAnchor,
} from "@l2/commander/searchScrollAnchor";
import type { SearchZeroResultSuggestion } from "@l2/commander/searchZeroResultModel";
import {
  buildSearchRequestRecoveryActions,
  type SearchRequestRecoveryAction,
} from "@l2/commander/searchRequestRecoveryModel";
import type {
  SearchRequestErrorField,
  SearchRequestLifecycle,
  SearchResultNavigationState,
} from "@l2/data-clerk/stores/useSearchStore";
import { classNames } from "@/utils/classNames";
import { StatusAnnouncer } from "@l3/common/StatusAnnouncer";
import {
  SearchBrowseToolbar,
  type SearchToolbarInputModality,
} from "./SearchBrowseToolbar";
import { SearchCoverageRow, type SearchCoverageGap } from "./SearchCoverageRow";

export function shouldActivateSearchResultRow({
  loading,
  pointerMoved,
  selectionCollapsed,
}: {
  loading: boolean;
  pointerMoved: boolean;
  selectionCollapsed: boolean;
}): boolean {
  return !loading && !pointerMoved && selectionCollapsed;
}

export function shouldRequestActiveResultFocusForBrowseMode(
  modality: SearchToolbarInputModality,
): boolean {
  return modality === "keyboard";
}

export function shouldAutoLoadSearchBoundary({
  mode,
  stale,
  available,
  status,
  userInitiated,
}: {
  mode: SearchWindowBrowseMode;
  stale: boolean;
  available: boolean;
  status: SearchWindowOperationStatus["status"];
  userInitiated: boolean;
}): boolean {
  return mode === "infinite" && userInitiated && !stale && available && status === "idle";
}

export function shouldAutoLoadSearchGap({
  mode,
  stale,
  loadAvailable,
  status,
  userInitiated,
}: {
  mode: SearchWindowBrowseMode;
  stale: boolean;
  loadAvailable: boolean;
  status: SearchWindowOperationStatus["status"];
  userInitiated: boolean;
}): boolean {
  return mode === "infinite" && userInitiated && !stale && loadAvailable && status === "idle";
}

export type SearchAutoLoadCandidate =
  | {
      kind: "gap";
      range: SearchLoadedRange;
      loadAvailable: boolean;
      status: SearchWindowOperationStatus["status"];
    }
  | {
      kind: "boundary";
      direction: "forward" | "backward";
      available: boolean;
      status: SearchWindowOperationStatus["status"];
    };

export type SearchAutoLoadTarget =
  | { kind: "gap"; range: SearchLoadedRange }
  | { kind: "boundary"; direction: "forward" | "backward" };

export function selectSearchAutoLoadTarget({
  mode,
  stale,
  userInitiated,
  visibilityState = "visible",
  candidates,
}: {
  mode: SearchWindowBrowseMode;
  stale: boolean;
  userInitiated: boolean;
  visibilityState?: DocumentVisibilityState;
  candidates: readonly SearchAutoLoadCandidate[];
}): SearchAutoLoadTarget | null {
  if (visibilityState !== "visible") return null;
  const ordered = [
    ...candidates.filter((candidate) => candidate.kind === "gap"),
    ...candidates.filter((candidate) => candidate.kind === "boundary"),
  ];
  for (const candidate of ordered) {
    if (candidate.kind === "gap") {
      if (shouldAutoLoadSearchGap({
        mode,
        stale,
        loadAvailable: candidate.loadAvailable,
        status: candidate.status,
        userInitiated,
      })) {
        return { kind: "gap", range: { ...candidate.range } };
      }
      continue;
    }
    if (shouldAutoLoadSearchBoundary({
      mode,
      stale,
      available: candidate.available,
      status: candidate.status,
      userInitiated,
    })) {
      return { kind: "boundary", direction: candidate.direction };
    }
  }
  return null;
}

const INITIAL_SEARCH_RENDER_LIMIT = 24;

export function initialSearchRenderIndexes(entryCount: number): number[] {
  const count = Math.min(
    INITIAL_SEARCH_RENDER_LIMIT,
    Math.max(0, Math.floor(Number.isFinite(entryCount) ? entryCount : 0)),
  );
  return Array.from({ length: count }, (_, index) => index);
}

export function canRestoreSearchScrollAnchor(
  anchor: SearchScrollAnchor | null | undefined,
  scrollElementReady: boolean,
): anchor is SearchScrollAnchor {
  return Boolean(
    anchor?.resultId.trim() &&
    Number.isFinite(anchor.offsetFromViewportTop) &&
    scrollElementReady,
  );
}

export function includeSearchAnchorIndex(
  indexes: readonly number[],
  anchorIndex: number | null,
): number[] {
  if (anchorIndex === null || indexes.includes(anchorIndex)) return [...indexes];
  return [...indexes, anchorIndex].sort((left, right) => left - right);
}

export function isSearchResultWithinViewport(
  row: { top: number; bottom: number },
  viewport: { top: number; bottom: number },
): boolean {
  return row.top >= viewport.top && row.bottom <= viewport.bottom;
}

export function selectFirstVisibleSearchScrollAnchor(
  rows: readonly { resultId: string; top: number; bottom: number }[],
  viewport: { top: number; bottom: number },
): SearchScrollAnchor | null {
  const firstVisible = rows
    .filter((row) => row.bottom > viewport.top && row.top < viewport.bottom)
    .sort((left, right) => left.top - right.top)[0];
  return firstVisible
    ? createSearchScrollAnchor({
        resultId: firstVisible.resultId,
        resultTop: firstVisible.top,
        viewportTop: viewport.top,
      })
    : null;
}

export function resolveSearchResultTabStopId(
  activeId: string | null,
  renderedRowIds: readonly string[],
): string | null {
  if (activeId && renderedRowIds.includes(activeId)) return activeId;
  return renderedRowIds[0] ?? null;
}

export type SearchResultListEntry =
  | { kind: "group"; key: string; label: string; count: number }
  | { kind: "row"; key: string; row: SearchPresentationRow }
  | {
      kind: "gap";
      key: string;
      range: SearchLoadedRange;
      operation: SearchWindowOperationStatus;
      loadAvailable: boolean;
    }
  | {
      kind: "coverage";
      key: string;
      ranges: SearchLoadedRange[];
      gaps: SearchCoverageGap[];
      totalCount: number;
      activeSourceIndex: number | null;
    };

export function buildSearchResultListEntries(
  presentation: SearchResultPresentation,
  window: SearchResultWindow,
): SearchResultListEntry[] {
  const entries: SearchResultListEntry[] = [];
  const positional = presentation.sortMode === "baseline" && presentation.groupingMode === "none";
  const allRows = presentation.groups.flatMap((group) => group.rows);
  const minimum = Math.min(...allRows.map((row) => row.hit.sourceIndex));
  const maximum = Math.max(...allRows.map((row) => row.hit.sourceIndex));

  if (!positional && window.gaps.length > 0) {
    entries.push({
      kind: "coverage",
      key: "coverage",
      ranges: window.loadedRanges.map((range) => ({ ...range })),
      gaps: window.gaps.map((range) => toCoverageGap(window, range)),
      totalCount: window.totalCount,
      activeSourceIndex: window.activeSourceIndex,
    });
  }

  for (const group of presentation.groups) {
    if (group.label) {
      entries.push({
        kind: "group",
        key: `group:${group.key}`,
        label: group.label,
        count: group.rows.length,
      });
    }
    if (!positional) {
      entries.push(
        ...group.rows.map((row) => ({ kind: "row" as const, key: `row:${row.id}`, row })),
      );
      continue;
    }
    const internalGaps = window.gaps.filter(
      (gap) => gap.start > minimum && gap.end <= maximum,
    );
    let gapIndex = 0;
    for (const row of group.rows) {
      while (internalGaps[gapIndex] && internalGaps[gapIndex].end <= row.hit.sourceIndex) {
        const gap = internalGaps[gapIndex];
        entries.push({
          kind: "gap",
          key: `gap:${gap.start}:${gap.end}`,
          range: { ...gap },
          operation: window.operations.gaps[`${gap.start}:${gap.end}`] ?? { status: "idle" },
          loadAvailable: getSearchGapCursor(window, gap) !== null,
        });
        gapIndex += 1;
      }
      entries.push({ kind: "row", key: `row:${row.id}`, row });
    }
  }
  return entries;
}

function toCoverageGap(window: SearchResultWindow, range: SearchLoadedRange): SearchCoverageGap {
  const operation = window.operations.gaps[`${range.start}:${range.end}`] ?? { status: "idle" };
  return {
    range: { ...range },
    operation,
    loadAvailable: getSearchGapCursor(window, range) !== null,
    errorMessage:
      operation.status === "error"
        ? searchRequestErrorMessage(operation.errorCode)
        : undefined,
  };
}

interface SearchResultsPaneProps {
  window: SearchResultWindow | null;
  presentation: SearchResultPresentation | null;
  appliedQuery: string;
  appliedScopeLabel: string;
  firstRequest: SearchRequestLifecycle;
  replacementRequest: SearchRequestLifecycle;
  pending: boolean;
  stale: boolean;
  refreshActiveNotice: string | null;
  navigationByResultId: Record<string, SearchResultNavigationState>;
  privacyOn: boolean;
  sortMode: SearchPresentationSortMode;
  groupingMode: SearchPresentationGroupingMode;
  exportDisabledReason: string | null;
  zeroResultSuggestions: SearchZeroResultSuggestion[];
  onApplyZeroResultSuggestion: (id: SearchZeroResultSuggestion["id"]) => boolean;
  onRequestKeywordFocus: () => void;
  onOpenResult: (hit: SearchHit, scrollAnchor: SearchScrollAnchor | null) => void;
  onRetryResult: (hit: SearchHit, scrollAnchor: SearchScrollAnchor | null) => void;
  onOpenNearbyResult: (hit: SearchHit, scrollAnchor: SearchScrollAnchor | null) => void;
  onActivateResult: (resultId: string, sourceIndex: number) => void;
  onBrowseModeChange: (
    mode: SearchWindowBrowseMode,
    scrollAnchor: SearchScrollAnchor | null,
  ) => void;
  onSortModeChange: (mode: SearchPresentationSortMode) => void;
  onGroupingModeChange: (mode: SearchPresentationGroupingMode) => void;
  onOpenExport: () => void;
  onEndSearch: () => void;
  onLoadBoundary: (direction: "forward" | "backward") => Promise<boolean>;
  onLoadPage: (
    cursor: string,
    targetPageStart: number,
    outgoingScrollAnchor: SearchScrollAnchor | null,
  ) => void;
  onLoadGap: (gap: SearchLoadedRange) => Promise<boolean>;
  onCancelWindowOperation: (
    target: "forward" | "backward" | "page" | "gap",
    gap?: SearchLoadedRange,
  ) => void;
  retryAvailable: boolean;
  requestRecoveryDisabledReason: string | null;
  resubmitDisabled: boolean;
  resubmitDisabledReason: string | null;
  onRetrySearch: () => void;
  onRefreshSearch: () => void;
  onResubmitSearch: () => void;
  onRecoverService: () => void;
  onRecheckDatabase: () => void;
  onReprobeCapabilities: () => void;
  onReviewInvalidField: (field: SearchRequestErrorField) => void;
  onOpenRecoverySettings: (section: "service" | "data" | "about") => void;
  onCancelPending: () => void;
  onConsumeRestoreScrollAnchor: () => SearchScrollAnchor | null;
}

export function SearchResultsPane({
  window: resultWindow,
  presentation,
  appliedQuery,
  appliedScopeLabel,
  firstRequest,
  replacementRequest,
  pending,
  stale,
  refreshActiveNotice,
  navigationByResultId,
  privacyOn,
  sortMode,
  groupingMode,
  exportDisabledReason,
  zeroResultSuggestions,
  onApplyZeroResultSuggestion,
  onRequestKeywordFocus,
  onOpenResult,
  onRetryResult,
  onOpenNearbyResult,
  onActivateResult,
  onBrowseModeChange,
  onSortModeChange,
  onGroupingModeChange,
  onOpenExport,
  onEndSearch,
  onLoadBoundary,
  onLoadPage,
  onLoadGap,
  onCancelWindowOperation,
  retryAvailable,
  requestRecoveryDisabledReason,
  resubmitDisabled,
  resubmitDisabledReason,
  onRetrySearch,
  onRefreshSearch,
  onResubmitSearch,
  onRecoverService,
  onRecheckDatabase,
  onReprobeCapabilities,
  onReviewInvalidField,
  onOpenRecoverySettings,
  onCancelPending,
  onConsumeRestoreScrollAnchor,
}: SearchResultsPaneProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const gapElementsRef = useRef(new Map<string, HTMLDivElement>());
  const intersectingAutoLoadTargetsRef = useRef(new Set<Element>());
  const autoLoadObserverRef = useRef<IntersectionObserver | null>(null);
  const autoLoadArmedRef = useRef(false);
  const attemptAutoLoadRef = useRef<() => void>(() => undefined);
  const autoLoadFrameRef = useRef<number | null>(null);
  const lastAutoLoadWindowRef = useRef<SearchResultWindow | null>(null);
  const resultRowRefs = useRef(new Map<string, HTMLDivElement>());
  const anchoredLoadSequenceRef = useRef(0);
  const pendingAnchorCorrectionRef = useRef<{
    token: number;
    anchor: SearchScrollAnchor;
    status: "loading" | "ready";
    missingFrameCount: number;
  } | null>(null);
  const pointerGestureRef = useRef<{
    resultId: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const focusRequestedRef = useRef(false);
  const pendingPageFocusStartRef = useRef<number | null>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [pinnedLoadAnchorResultId, setPinnedLoadAnchorResultId] = useState<string | null>(null);
  const [anchorCorrectionVersion, setAnchorCorrectionVersion] = useState(0);
  const [restoreAnchorVersion, setRestoreAnchorVersion] = useState(0);
  const registerGapElement = useCallback((key: string, element: HTMLDivElement | null) => {
    const previous = gapElementsRef.current.get(key);
    if (previous && previous !== element) {
      autoLoadObserverRef.current?.unobserve(previous);
      intersectingAutoLoadTargetsRef.current.delete(previous);
    }
    if (!element) {
      gapElementsRef.current.delete(key);
      return;
    }
    gapElementsRef.current.set(key, element);
    autoLoadObserverRef.current?.observe(element);
  }, []);
  const entries = useMemo(
    () =>
      presentation && resultWindow
        ? buildSearchResultListEntries(presentation, resultWindow)
        : [],
    [presentation, resultWindow],
  );
  const orderedRows = useMemo(
    () => presentation?.groups.flatMap((group) => group.rows) ?? [],
    [presentation],
  );
  const activeId =
    orderedRows.find((row) => row.hit.sourceIndex === resultWindow?.activeSourceIndex)?.id ??
    orderedRows[0]?.id ??
    null;
  const rowEntryIndexes = useMemo(
    () =>
      new Map<string, number>(
        entries.flatMap((entry, index) =>
          entry.kind === "row" ? ([[entry.row.id, index]] as const) : [],
        ),
      ),
    [entries],
  );
  const restoreAnchorResultId = resultWindow?.restoreScrollAnchor?.resultId ?? null;
  const pinnedAnchorResultId = pinnedLoadAnchorResultId ?? restoreAnchorResultId;
  const pinnedAnchorEntryIndex = pinnedAnchorResultId
    ? rowEntryIndexes.get(pinnedAnchorResultId) ?? null
    : null;
  const rangeExtractor = useCallback(
    (range: Parameters<typeof defaultRangeExtractor>[0]) =>
      includeSearchAnchorIndex(defaultRangeExtractor(range), pinnedAnchorEntryIndex),
    [pinnedAnchorEntryIndex],
  );
  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollElement,
    estimateSize: (index) => estimateEntryHeight(entries[index]),
    getItemKey: (index) => entries[index]?.key ?? index,
    scrollMargin,
    overscan: 7,
    rangeExtractor,
  });
  const resultBrowseMode = resultWindow?.browseMode;
  const resultSnapshotId = resultWindow?.snapshotId;

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const root = list.closest<HTMLElement>(".workspace-page__surface");
    setScrollElement(root);
    const updateMargin = () => {
      if (!root) return setScrollMargin(0);
      const listBox = list.getBoundingClientRect();
      const rootBox = root.getBoundingClientRect();
      setScrollMargin(root.scrollTop + listBox.top - rootBox.top);
    };
    updateMargin();
    const resizeObserver = new ResizeObserver(updateMargin);
    resizeObserver.observe(list);
    return () => resizeObserver.disconnect();
  }, [entries.length]);

  useEffect(() => {
    const pageFocusReady =
      pendingPageFocusStartRef.current !== null &&
      pendingPageFocusStartRef.current === resultWindow?.currentPageStart;
    if (
      (!focusRequestedRef.current && !pageFocusReady) ||
      !activeId ||
      resultWindow?.restoreScrollAnchor
    ) {
      return;
    }
    if (pageFocusReady) {
      pendingPageFocusStartRef.current = null;
      focusRequestedRef.current = true;
    }
    const entryIndex = rowEntryIndexes.get(activeId);
    let frame = 0;
    let cancelled = false;
    let attempts = 0;
    const focusWhenReady = () => {
      if (cancelled || !focusRequestedRef.current) return;
      const row = resultRowRefs.current.get(activeId);
      if (!row) {
        if (entryIndex !== undefined) virtualizer.scrollToIndex(entryIndex, { align: "auto" });
        attempts += 1;
        if (attempts < 4) {
          frame = requestAnimationFrame(focusWhenReady);
        } else {
          focusRequestedRef.current = false;
        }
        return;
      }
      if (
        scrollElement &&
        !isSearchResultWithinViewport(
          row.getBoundingClientRect(),
          scrollElement.getBoundingClientRect(),
        ) &&
        entryIndex !== undefined &&
        attempts === 0
      ) {
        virtualizer.scrollToIndex(entryIndex, { align: "auto" });
        attempts += 1;
        frame = requestAnimationFrame(focusWhenReady);
        return;
      }
      row.focus({ preventScroll: true });
      focusRequestedRef.current = false;
    };
    focusWhenReady();
    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
    };
  }, [
    activeId,
    resultWindow?.currentPageStart,
    resultWindow?.restoreScrollAnchor,
    rowEntryIndexes,
    scrollElement,
    virtualizer,
  ]);

  const captureFirstVisibleAnchor = useCallback(
    () => firstVisibleAnchor(resultRowRefs, scrollElement),
    [scrollElement],
  );
  const captureResultAnchor = useCallback(
    (resultId: string) => resultAnchor(resultId, resultRowRefs, scrollElement),
    [scrollElement],
  );
  const changeBrowseMode = useCallback(
    (mode: SearchWindowBrowseMode, modality: SearchToolbarInputModality) => {
      const requestActiveFocus = shouldRequestActiveResultFocusForBrowseMode(modality);
      if (requestActiveFocus) focusRequestedRef.current = true;
      onBrowseModeChange(mode, captureFirstVisibleAnchor());
    },
    [captureFirstVisibleAnchor, onBrowseModeChange],
  );
  const clearPendingAnchorCorrection = useCallback((token: number) => {
    if (pendingAnchorCorrectionRef.current?.token !== token) return;
    pendingAnchorCorrectionRef.current = null;
    setPinnedLoadAnchorResultId(null);
  }, []);
  const runAnchoredLoad = useCallback(
    async (load: () => Promise<boolean>) => {
      const anchor = captureFirstVisibleAnchor();
      const token = ++anchoredLoadSequenceRef.current;
      if (anchor) {
        pendingAnchorCorrectionRef.current = {
          token,
          anchor,
          status: "loading",
          missingFrameCount: 0,
        };
        setPinnedLoadAnchorResultId(anchor.resultId);
      }

      let succeeded = false;
      try {
        succeeded = await load();
      } catch {
        succeeded = false;
      }
      if (!anchor || pendingAnchorCorrectionRef.current?.token !== token) return succeeded;
      const correctionAnchor = resolveSearchAnchorAfterLoad(anchor, succeeded);
      if (!correctionAnchor) {
        clearPendingAnchorCorrection(token);
        return false;
      }
      pendingAnchorCorrectionRef.current.anchor = correctionAnchor;
      pendingAnchorCorrectionRef.current.status = "ready";
      setAnchorCorrectionVersion((version) => version + 1);
      return true;
    },
    [captureFirstVisibleAnchor, clearPendingAnchorCorrection],
  );
  const loadBoundaryPreservingAnchor = useCallback(
    (direction: "forward" | "backward") =>
      direction === "backward"
        ? runAnchoredLoad(() => onLoadBoundary(direction))
        : onLoadBoundary(direction),
    [onLoadBoundary, runAnchoredLoad],
  );
  const loadGapPreservingAnchor = useCallback(
    (gap: SearchLoadedRange) => runAnchoredLoad(() => onLoadGap(gap)),
    [onLoadGap, runAnchoredLoad],
  );
  const loadPagePreservingPosition = useCallback(
    (cursor: string, targetPageStart: number) => {
      const targetPosition = resultWindow?.pageReadingPositions[String(targetPageStart)];
      if (typeof targetPosition?.activeSourceIndex === "number") {
        pendingPageFocusStartRef.current = targetPageStart;
      }
      onLoadPage(cursor, targetPageStart, captureFirstVisibleAnchor());
    },
    [captureFirstVisibleAnchor, onLoadPage, resultWindow?.pageReadingPositions],
  );
  const cancelPageLoad = useCallback(() => {
    pendingPageFocusStartRef.current = null;
    onCancelWindowOperation("page");
  }, [onCancelWindowOperation]);

  useEffect(() => () => {
    anchoredLoadSequenceRef.current += 1;
    pendingAnchorCorrectionRef.current = null;
  }, []);

  useLayoutEffect(() => {
    const pendingCorrection = pendingAnchorCorrectionRef.current;
    if (
      !scrollElement ||
      !pendingCorrection ||
      pendingCorrection.status !== "ready"
    ) {
      return;
    }
    const row = resultRowRefs.current.get(pendingCorrection.anchor.resultId);
    if (!row) {
      if (pendingCorrection.missingFrameCount >= 2) {
        clearPendingAnchorCorrection(pendingCorrection.token);
        return;
      }
      pendingCorrection.missingFrameCount += 1;
      const frame = requestAnimationFrame(() => {
        if (pendingAnchorCorrectionRef.current?.token === pendingCorrection.token) {
          setAnchorCorrectionVersion((version) => version + 1);
        }
      });
      return () => cancelAnimationFrame(frame);
    }

    alignSearchScrollAnchor(scrollElement, row, pendingCorrection.anchor);
    const frame = requestAnimationFrame(() => {
      if (pendingAnchorCorrectionRef.current?.token !== pendingCorrection.token) return;
      const currentRow = resultRowRefs.current.get(pendingCorrection.anchor.resultId);
      if (currentRow) {
        alignSearchScrollAnchor(scrollElement, currentRow, pendingCorrection.anchor);
      }
      clearPendingAnchorCorrection(pendingCorrection.token);
    });
    return () => cancelAnimationFrame(frame);
  }, [
    anchorCorrectionVersion,
    clearPendingAnchorCorrection,
    entries,
    scrollElement,
  ]);

  useLayoutEffect(() => {
    const anchor = resultWindow?.restoreScrollAnchor;
    if (!canRestoreSearchScrollAnchor(anchor, Boolean(scrollElement)) || !scrollElement) return;
    const entryIndex = rowEntryIndexes.get(anchor.resultId);
    if (entryIndex === undefined) {
      onConsumeRestoreScrollAnchor();
      return;
    }
    const row = resultRowRefs.current.get(anchor.resultId);
    if (!row) {
      virtualizer.scrollToIndex(entryIndex, { align: "start" });
      const frame = requestAnimationFrame(() => {
        setRestoreAnchorVersion((version) => version + 1);
      });
      return () => cancelAnimationFrame(frame);
    }

    alignSearchScrollAnchor(scrollElement, row, anchor);
    const frame = requestAnimationFrame(() => {
      const currentRow = resultRowRefs.current.get(anchor.resultId);
      if (currentRow) alignSearchScrollAnchor(scrollElement, currentRow, anchor);
      onConsumeRestoreScrollAnchor();
    });
    return () => cancelAnimationFrame(frame);
  }, [
    onConsumeRestoreScrollAnchor,
    restoreAnchorVersion,
    resultWindow?.restoreScrollAnchor,
    rowEntryIndexes,
    scrollElement,
    virtualizer,
  ]);

  useEffect(() => {
    autoLoadArmedRef.current = false;
    lastAutoLoadWindowRef.current = null;
    if (resultBrowseMode !== "infinite" || !scrollElement) return;
    const scheduleAutomaticLoad = () => {
      if (autoLoadFrameRef.current !== null) return;
      autoLoadFrameRef.current = requestAnimationFrame(() => {
        autoLoadFrameRef.current = null;
        attemptAutoLoadRef.current();
      });
    };
    const armAutomaticLoad = () => {
      autoLoadArmedRef.current = true;
      scheduleAutomaticLoad();
    };
    const armForKeyboardScroll = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
        armAutomaticLoad();
      }
    };
    const armForScrollbar = (event: PointerEvent) => {
      if (event.target === scrollElement) armAutomaticLoad();
    };
    scrollElement.addEventListener("wheel", armAutomaticLoad, { passive: true });
    scrollElement.addEventListener("touchmove", armAutomaticLoad, { passive: true });
    scrollElement.addEventListener("keydown", armForKeyboardScroll);
    scrollElement.addEventListener("pointerdown", armForScrollbar);
    return () => {
      scrollElement.removeEventListener("wheel", armAutomaticLoad);
      scrollElement.removeEventListener("touchmove", armAutomaticLoad);
      scrollElement.removeEventListener("keydown", armForKeyboardScroll);
      scrollElement.removeEventListener("pointerdown", armForScrollbar);
      if (autoLoadFrameRef.current !== null) {
        cancelAnimationFrame(autoLoadFrameRef.current);
        autoLoadFrameRef.current = null;
      }
    };
  }, [resultBrowseMode, resultSnapshotId, scrollElement]);

  useEffect(() => {
    if (
      !resultWindow ||
      resultWindow.browseMode !== "infinite" ||
      !scrollElement ||
      typeof IntersectionObserver === "undefined"
    ) return;
    const intersectingTargets = intersectingAutoLoadTargetsRef.current;
    const attemptAutomaticLoad = () => {
      if (lastAutoLoadWindowRef.current === resultWindow) return;
      const windowOperationLoading =
        resultWindow.operations.forward.status === "loading" ||
        resultWindow.operations.backward.status === "loading" ||
        Object.values(resultWindow.operations.gaps).some((operation) => operation.status === "loading");
      if (windowOperationLoading) {
        autoLoadArmedRef.current = false;
        return;
      }

      const candidates: SearchAutoLoadCandidate[] = [];
      for (const target of intersectingTargets) {
        if (target === topSentinelRef.current) {
          candidates.push({
            kind: "boundary",
            direction: "backward",
            available: resultWindow.hasPrevious,
            status: resultWindow.operations.backward.status,
          });
          continue;
        }
        if (target === bottomSentinelRef.current) {
          candidates.push({
            kind: "boundary",
            direction: "forward",
            available: resultWindow.hasNext,
            status: resultWindow.operations.forward.status,
          });
          continue;
        }
        if (!(target instanceof HTMLElement) || target.dataset.gapStart === undefined) continue;
        const start = Number(target.dataset.gapStart);
        const end = Number(target.dataset.gapEnd);
        const gap = resultWindow.gaps.find(
          (candidate) => candidate.start === start && candidate.end === end,
        );
        if (!gap) continue;
        const operation = resultWindow.operations.gaps[`${gap.start}:${gap.end}`] ?? {
          status: "idle" as const,
        };
        candidates.push({
          kind: "gap",
          range: gap,
          loadAvailable: getSearchGapCursor(resultWindow, gap) !== null,
          status: operation.status,
        });
      }
      const target = selectSearchAutoLoadTarget({
        mode: resultWindow.browseMode,
        stale,
        userInitiated: autoLoadArmedRef.current,
        visibilityState: document.visibilityState,
        candidates,
      });
      if (!target) return;
      autoLoadArmedRef.current = false;
      lastAutoLoadWindowRef.current = resultWindow;
      if (target.kind === "gap") void loadGapPreservingAnchor(target.range);
      else void loadBoundaryPreservingAnchor(target.direction);
    };
    attemptAutoLoadRef.current = attemptAutomaticLoad;
    const observer = new IntersectionObserver(
      (observations) => {
        for (const observation of observations) {
          if (observation.isIntersecting) {
            intersectingTargets.add(observation.target);
          } else {
            intersectingTargets.delete(observation.target);
          }
        }
        attemptAutomaticLoad();
      },
      { root: scrollElement, rootMargin: "180px 0px" },
    );
    autoLoadObserverRef.current = observer;
    if (topSentinelRef.current) observer.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) observer.observe(bottomSentinelRef.current);
    for (const element of gapElementsRef.current.values()) observer.observe(element);
    return () => {
      observer.disconnect();
      intersectingTargets.clear();
      if (attemptAutoLoadRef.current === attemptAutomaticLoad) {
        attemptAutoLoadRef.current = () => undefined;
      }
      if (autoLoadObserverRef.current === observer) autoLoadObserverRef.current = null;
    };
  }, [
    loadBoundaryPreservingAnchor,
    loadGapPreservingAnchor,
    resultWindow,
    scrollElement,
    stale,
  ]);

  const moveActive = useCallback(
    (direction: "previous" | "next" | "first" | "last") => {
      if (orderedRows.length === 0) return;
      const currentIndex = Math.max(0, orderedRows.findIndex((row) => row.id === activeId));
      const nextIndex =
        direction === "first"
          ? 0
          : direction === "last"
            ? orderedRows.length - 1
            : direction === "previous"
              ? Math.max(0, currentIndex - 1)
              : Math.min(orderedRows.length - 1, currentIndex + 1);
      const next = orderedRows[nextIndex];
      focusRequestedRef.current = true;
      onActivateResult(next.id, next.hit.sourceIndex);
      const entryIndex = rowEntryIndexes.get(next.id);
      if (entryIndex !== undefined) virtualizer.scrollToIndex(entryIndex, { align: "auto" });
    },
    [activeId, onActivateResult, orderedRows, rowEntryIndexes, virtualizer],
  );

  if (!resultWindow || !presentation) {
    return renderInitialState({
      lifecycle: firstRequest,
      retryAvailable,
      requestRecoveryDisabledReason,
      resubmitDisabled,
      resubmitDisabledReason,
      onRetry: onRetrySearch,
      onResubmit: onResubmitSearch,
      onRecoverService,
      onRecheckDatabase,
      onReprobeCapabilities,
      onReviewInvalidField,
      onOpenRecoverySettings,
      onCancel: onCancelPending,
    });
  }

  const loadedCount =
    resultWindow.browseMode === "paged"
      ? resultWindow.currentPageHits.length
      : resultWindow.retainedHits.length;
  const virtualItems = scrollElement ? virtualizer.getVirtualItems() : [];
  const virtualized = virtualItems.length > 0;
  const renderedItems = virtualized
    ? virtualItems.map((item) => ({ index: item.index, start: item.start, measure: true }))
    : initialSearchRenderIndexes(entries.length).map((index) => ({
        index,
        start: 0,
        measure: false,
      }));
  const tabStopId = resolveSearchResultTabStopId(
    activeId,
    renderedItems.flatMap(({ index }) => {
      const entry = entries[index];
      return entry?.kind === "row" ? [entry.row.id] : [];
    }),
  );

  return (
    <section className="search-result-pane" aria-label="搜索结果">
      <StatusAnnouncer
        message={`已加载 ${loadedCount.toLocaleString()} 条搜索结果`}
        privacySafeMessage={`已加载 ${loadedCount.toLocaleString()} 条搜索结果`}
      />
      <SearchBrowseToolbar
        appliedQuery={appliedQuery}
        appliedScopeLabel={appliedScopeLabel}
        loadedCount={loadedCount}
        totalCount={resultWindow.totalCount}
        exactTotal={resultWindow.exactTotal}
        completeScope={resultWindow.completeScope}
        browseMode={resultWindow.browseMode}
        sortMode={sortMode}
        groupingMode={groupingMode}
        currentPageStart={resultWindow.currentPageStart}
        currentPageCount={resultWindow.currentPageHits.length}
        privacyOn={privacyOn}
        exportDisabled={Boolean(exportDisabledReason)}
        exportDisabledReason={exportDisabledReason ?? undefined}
        pendingReplacement={pending}
        stale={stale}
        onBrowseModeChange={changeBrowseMode}
        onSortModeChange={onSortModeChange}
        onGroupingModeChange={onGroupingModeChange}
        onOpenExport={onOpenExport}
        onEndSearch={onEndSearch}
        onRefresh={onRefreshSearch}
      />

      {refreshActiveNotice && (
        <p className="search-result-pane__refresh-notice" role="status">
          {refreshActiveNotice}
        </p>
      )}

      {replacementRequest.status === "error" && (
        <div className="search-result-pane__replacement-error" role="alert">
          <span>{searchRequestErrorMessage(replacementRequest.errorCode)}</span>
          <SearchRequestRecovery
            lifecycle={replacementRequest}
            hasSnapshot
            retryAvailable={retryAvailable}
            requestRecoveryDisabledReason={requestRecoveryDisabledReason}
            resubmitDisabled={resubmitDisabled}
            resubmitDisabledReason={resubmitDisabledReason}
            onRetry={onRetrySearch}
            onRefresh={onRefreshSearch}
            onResubmit={onResubmitSearch}
            onRecoverService={onRecoverService}
            onRecheckDatabase={onRecheckDatabase}
            onReprobeCapabilities={onReprobeCapabilities}
            onReviewInvalidField={onReviewInvalidField}
            onOpenRecoverySettings={onOpenRecoverySettings}
          />
        </div>
      )}
      {replacementRequest.status === "cancelled" && (
        <p className="search-result-pane__replacement-cancelled" role="status">
          新搜索已取消，仍显示上次结果。
        </p>
      )}
      {pending && (
        <button type="button" className="search-result-pane__cancel-pending" onClick={onCancelPending}>
          取消新搜索
        </button>
      )}

      {resultWindow.totalCount === 0 ? (
        <div className="search-zero-results">
          <strong>没有找到匹配记录</strong>
          <p>
            {privacyOn
              ? "当前已应用条件没有命中。"
              : `“${appliedQuery}”在${appliedScopeLabel}中没有命中。`}
          </p>
          <div className="search-zero-results__suggestions" aria-label="可调整的搜索草稿">
            {zeroResultSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                disabled={pending}
                onClick={() => {
                  const changed = onApplyZeroResultSuggestion(suggestion.id);
                  if (!changed && suggestion.id === "edit-keyword") {
                    onRequestKeywordFocus();
                  }
                }}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
          <p role="status">
            {pending
              ? "等待新搜索完成或取消后再调整草稿。"
              : "建议只修改草稿；请检查后再显式应用。"}
          </p>
        </div>
      ) : resultWindow.browseMode === "paged" ? (
        <PageControls
          window={resultWindow}
          stale={stale}
          onLoadPage={loadPagePreservingPosition}
          onCancelPage={cancelPageLoad}
        />
      ) : (
        <BoundaryControl
          ref={topSentinelRef}
          direction="backward"
          status={resultWindow.operations.backward}
          available={resultWindow.hasPrevious}
          remainingCount={getSearchBoundaryRemainingCount(resultWindow, "backward")}
          stale={stale}
          automatic={resultWindow.browseMode === "infinite"}
          onLoad={() => void loadBoundaryPreservingAnchor("backward")}
          onCancel={() => onCancelWindowOperation("backward")}
        />
      )}

      <div
        ref={listRef}
        role="list"
        aria-label="搜索结果列表"
        className="search-result-list"
        style={virtualized ? { height: virtualizer.getTotalSize(), position: "relative" } : undefined}
      >
        {renderedItems.map(({ index, start, measure }) => {
            const entry = entries[index];
            return (
              <div
                key={entry.key}
                role="listitem"
                data-index={index}
                ref={measure ? virtualizer.measureElement : undefined}
                className={classNames(measure && "search-result-list__virtual-row")}
                style={
                  measure
                    ? {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${start - scrollMargin}px)`,
                      }
                    : undefined
                }
              >
                <ResultEntry
                  entry={entry}
                  activeId={activeId}
                  tabStopId={tabStopId}
                  navigationByResultId={navigationByResultId}
                  resultRowRefs={resultRowRefs}
                  pointerGestureRef={pointerGestureRef}
                  suppressClickRef={suppressClickRef}
                  onActivateResult={onActivateResult}
                  onOpenResult={onOpenResult}
                  onRetryResult={onRetryResult}
                  onOpenNearbyResult={onOpenNearbyResult}
                  onCaptureScrollAnchor={captureResultAnchor}
                  onMoveActive={moveActive}
                  onLoadGap={loadGapPreservingAnchor}
                  onCancelGap={(gap) => onCancelWindowOperation("gap", gap)}
                  registerGapElement={registerGapElement}
                  stale={stale}
                />
              </div>
            );
          })}
      </div>

      {resultWindow.browseMode === "paged" ? (
        <PageControls
          window={resultWindow}
          stale={stale}
          onLoadPage={loadPagePreservingPosition}
          onCancelPage={cancelPageLoad}
          bottom
        />
      ) : (
        <BoundaryControl
          ref={bottomSentinelRef}
          direction="forward"
          status={resultWindow.operations.forward}
          available={resultWindow.hasNext}
          remainingCount={getSearchBoundaryRemainingCount(resultWindow, "forward")}
          stale={stale}
          automatic={resultWindow.browseMode === "infinite"}
          onLoad={() => void loadBoundaryPreservingAnchor("forward")}
          onCancel={() => onCancelWindowOperation("forward")}
        />
      )}
    </section>
  );
}

function ResultEntry({
  entry,
  activeId,
  tabStopId,
  navigationByResultId,
  resultRowRefs,
  pointerGestureRef,
  suppressClickRef,
  onActivateResult,
  onOpenResult,
  onRetryResult,
  onOpenNearbyResult,
  onCaptureScrollAnchor,
  onMoveActive,
  onLoadGap,
  onCancelGap,
  registerGapElement,
  stale,
}: {
  entry: SearchResultListEntry;
  activeId: string | null;
  tabStopId: string | null;
  navigationByResultId: Record<string, SearchResultNavigationState>;
  resultRowRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  pointerGestureRef: MutableRefObject<{
    resultId: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>;
  suppressClickRef: MutableRefObject<boolean>;
  onActivateResult: (resultId: string, sourceIndex: number) => void;
  onOpenResult: (hit: SearchHit, scrollAnchor: SearchScrollAnchor | null) => void;
  onRetryResult: (hit: SearchHit, scrollAnchor: SearchScrollAnchor | null) => void;
  onOpenNearbyResult: (hit: SearchHit, scrollAnchor: SearchScrollAnchor | null) => void;
  onCaptureScrollAnchor: (resultId: string) => SearchScrollAnchor | null;
  onMoveActive: (direction: "previous" | "next" | "first" | "last") => void;
  onLoadGap: (gap: SearchLoadedRange) => Promise<boolean>;
  onCancelGap: (gap: SearchLoadedRange) => void;
  registerGapElement: (key: string, element: HTMLDivElement | null) => void;
  stale: boolean;
}) {
  if (entry.kind === "coverage") {
    return (
      <SearchCoverageRow
        mode="coverage"
        containedByListItem
        loadedRanges={entry.ranges}
        gaps={entry.gaps}
        totalCount={entry.totalCount}
        activeSourceIndex={entry.activeSourceIndex}
        stale={stale}
        onLoad={onLoadGap}
        onCancel={onCancelGap}
      />
    );
  }
  if (entry.kind === "gap") {
    return (
      <SearchCoverageRow
        mode="gap"
        containedByListItem
        range={entry.range}
        operation={entry.operation}
        stale={stale}
        loadAvailable={entry.loadAvailable}
        errorMessage={
          entry.operation.status === "error"
            ? searchRequestErrorMessage(entry.operation.errorCode)
            : undefined
        }
        elementRef={(element) => registerGapElement(entry.key, element)}
        onLoad={() => onLoadGap(entry.range)}
        onCancel={() => onCancelGap(entry.range)}
      />
    );
  }
  if (entry.kind === "group") {
    return (
      <div className="search-result-group__label">
        <strong>{entry.label}</strong>
        <span>已加载 {entry.count.toLocaleString()} 条</span>
      </div>
    );
  }

  const { row } = entry;
  const navigation = navigationByResultId[row.id] ?? null;
  const loading = navigation?.status === "loading";
  const active = row.id === activeId;
  return (
    <div className="search-result-row-shell">
      <div
        role="button"
        ref={(node) => {
          if (node) resultRowRefs.current.set(row.id, node);
          else resultRowRefs.current.delete(row.id);
        }}
        className={classNames("search-result-row", active && "search-result-row--active")}
        aria-current={active ? "true" : undefined}
        aria-busy={loading || undefined}
        aria-disabled={loading || undefined}
        tabIndex={row.id === tabStopId ? 0 : -1}
        onFocus={() => onActivateResult(row.id, row.hit.sourceIndex)}
        onPointerDown={(event) => {
          pointerGestureRef.current = {
            resultId: row.id,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
          };
          suppressClickRef.current = false;
        }}
        onPointerMove={(event) => {
          const gesture = pointerGestureRef.current;
          if (!gesture || gesture.resultId !== row.id || gesture.pointerId !== event.pointerId) return;
          if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 6) {
            gesture.moved = true;
          }
        }}
        onPointerUp={(event) => {
          const gesture = pointerGestureRef.current;
          if (gesture?.resultId === row.id && gesture.pointerId === event.pointerId) {
            suppressClickRef.current = gesture.moved;
          }
          pointerGestureRef.current = null;
        }}
        onPointerCancel={() => {
          suppressClickRef.current = true;
          pointerGestureRef.current = null;
        }}
        onClick={() => {
          const pointerMoved = suppressClickRef.current;
          suppressClickRef.current = false;
          const selection = typeof globalThis.getSelection === "function" ? globalThis.getSelection() : null;
          if (
            shouldActivateSearchResultRow({
              loading,
              pointerMoved,
              selectionCollapsed: selection?.isCollapsed ?? true,
            })
          ) {
            onOpenResult(row.hit, onCaptureScrollAnchor(row.id));
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
            event.preventDefault();
            onMoveActive(
              event.key === "ArrowDown"
                ? "next"
                : event.key === "ArrowUp"
                  ? "previous"
                  : event.key === "Home"
                    ? "first"
                    : "last",
            );
            return;
          }
          if ((event.key === "Enter" || event.key === " ") && !loading) {
            event.preventDefault();
            onOpenResult(row.hit, onCaptureScrollAnchor(row.id));
          }
        }}
      >
        <span className="search-result-row__media" aria-hidden="true">
          {categoryIcon(row.hit.category)}
        </span>
        <div className="search-result-row__body">
          <div className="search-result-row__meta">
            <strong className="search-result-row__conversation">{row.conversationLabel}</strong>
            <span>{row.senderLabel}</span>
            <span>{row.categoryLabel}</span>
            <time>{row.timeLabel}</time>
          </div>
          <p className="search-result-row__content">
            {row.snippetSegments.map((segment, index) =>
              segment.matched ? (
                <mark key={`${row.id}:${index}`}>{segment.text}</mark>
              ) : (
                <span key={`${row.id}:${index}`}>{segment.text}</span>
              ),
            )}
          </p>
          <span className="search-result-row__match-field">命中来源：{row.matchFieldLabel}</span>
        </div>
        <span className="search-result-row__arrow" aria-hidden="true">›</span>
      </div>
      {loading && <p className="search-result-row__navigation-status">正在精确定位…</p>}
      {navigation?.status === "error" && (
        <div className="search-result-row__navigation-error" role="alert">
          <span>{navigation.message ?? "无法精确定位这条结果，请重试。"}</span>
          <button
            type="button"
            onClick={() => onRetryResult(row.hit, onCaptureScrollAnchor(row.id))}
          >
            重试精确定位
          </button>
          {navigation.nearbyFallbackAvailable && (
            <button
              type="button"
              onClick={() => onOpenNearbyResult(row.hit, onCaptureScrollAnchor(row.id))}
            >
              按附近时间打开
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const BoundaryControl = forwardRef<
  HTMLDivElement,
  {
    direction: "forward" | "backward";
    status: SearchWindowOperationStatus;
    available: boolean;
    remainingCount: number;
    stale: boolean;
    automatic: boolean;
    onLoad: () => void;
    onCancel: () => void;
  }
>(function BoundaryControl(
  { direction, status, available, remainingCount, stale, automatic, onLoad, onCancel },
  ref,
) {
  const [cancelAnnounced, setCancelAnnounced] = useState(false);
  if (!available) return <div ref={ref} className="search-result-boundary" />;
  const loading = status.status === "loading";
  if (!loading && (stale || remainingCount <= 0)) {
    return (
      <div ref={ref} className="search-result-boundary" role="status" aria-live="polite">
        {stale ? "数据已更新，请先刷新后继续加载。" : "当前没有可加载的更多结果。"}
      </div>
    );
  }
  const countLabel = remainingCount < 50
    ? `剩余 ${remainingCount.toLocaleString()} 条`
    : direction === "forward"
      ? "后 50 条"
      : "前 50 条";
  const label = loading
    ? `取消加载${countLabel}`
    : status.status === "error"
      ? `重试加载${countLabel}`
      : `加载${countLabel}`;
  const liveMessage = cancelAnnounced && status.status === "idle"
    ? `已取消加载${countLabel}。`
    : loading
      ? `正在加载${countLabel}；可以取消。`
      : status.status === "error"
        ? `${searchRequestErrorMessage(status.errorCode)} 可以重试加载${countLabel}。`
        : automatic
          ? "接近边界时可自动加载下一批。"
          : `可以加载${countLabel}。`;
  return (
    <div ref={ref} className="search-result-boundary">
      <span role="status" aria-live="polite" aria-atomic="true">{liveMessage}</span>
      <button
        type="button"
        aria-busy={loading || undefined}
        onClick={() => {
          if (loading) {
            setCancelAnnounced(true);
            onCancel();
            return;
          }
          setCancelAnnounced(false);
          onLoad();
        }}
      >
        {direction === "forward" ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
        {label}
      </button>
    </div>
  );
});

function PageControls({
  window,
  stale,
  onLoadPage,
  onCancelPage,
  bottom = false,
}: {
  window: SearchResultWindow;
  stale: boolean;
  onLoadPage: (cursor: string, targetPageStart: number) => void;
  onCancelPage: () => void;
  bottom?: boolean;
}) {
  const page = Math.floor(window.currentPageStart / SEARCH_RESULT_BATCH_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(window.totalCount / SEARCH_RESULT_BATCH_SIZE));
  const loading = window.operations.page.status === "loading";
  const transitionsDisabled = loading || stale;
  const reachablePages = getReachableSearchPages(window);
  const resolveCursorAttempt = (cursor: string) => {
    const candidates = reachablePages.filter((option) => option.cursor === cursor && !option.current);
    if (candidates.length !== 1) return null;
    return resolveSearchPageAttempt(window, cursor, candidates[0].start);
  };
  const previousAttempt = window.hasPrevious ? resolveCursorAttempt(window.previousCursor) : null;
  const nextAttempt = window.hasNext ? resolveCursorAttempt(window.nextCursor) : null;
  const pageOperation = window.operations.page;
  const retryAttempt = pageOperation.status === "error" &&
    typeof pageOperation.attemptedCursor === "string" &&
    typeof pageOperation.targetPageStart === "number"
    ? resolveSearchPageAttempt(
        window,
        pageOperation.attemptedCursor,
        pageOperation.targetPageStart,
      )
    : null;
  return (
    <nav
      className={classNames("search-result-pages", bottom && "search-result-pages--bottom")}
      aria-label={bottom ? "底部搜索结果分页" : "顶部搜索结果分页"}
    >
      <button
        type="button"
        disabled={!previousAttempt || transitionsDisabled}
        onClick={() => {
          if (previousAttempt) {
            onLoadPage(previousAttempt.attemptedCursor, previousAttempt.targetPageStart);
          }
        }}
      >
        上一页
      </button>
      <span>第 {page.toLocaleString()} / {totalPages.toLocaleString()} 页</span>
      <div className="search-result-pages__reachable" role="group" aria-label="可达页">
        {reachablePages.map((option) => {
          const attempt = option.cursor
            ? resolveSearchPageAttempt(window, option.cursor, option.start)
            : null;
          return (
            <button
              key={option.pageNumber}
              type="button"
              disabled={transitionsDisabled || option.current || !attempt}
              aria-current={option.current ? "page" : undefined}
              aria-label={option.current
                ? `当前第 ${option.pageNumber.toLocaleString()} 页`
                : `跳到第 ${option.pageNumber.toLocaleString()} 页`}
              onClick={() => {
                if (attempt) onLoadPage(attempt.attemptedCursor, attempt.targetPageStart);
              }}
            >
              {option.pageNumber.toLocaleString()}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={!nextAttempt || transitionsDisabled}
        onClick={() => {
          if (nextAttempt) onLoadPage(nextAttempt.attemptedCursor, nextAttempt.targetPageStart);
        }}
      >
        下一页
      </button>
      {loading && <button type="button" onClick={onCancelPage}>取消翻页</button>}
      {pageOperation.status === "error" && (
        <>
          <span role="alert">{searchRequestErrorMessage(pageOperation.errorCode)}</span>
          {retryAttempt && !stale && (
            <button
              type="button"
              onClick={() =>
                onLoadPage(retryAttempt.attemptedCursor, retryAttempt.targetPageStart)}
            >
              重试第 {retryAttempt.pageNumber.toLocaleString()} 页
            </button>
          )}
        </>
      )}
    </nav>
  );
}

function renderInitialState({
  lifecycle,
  retryAvailable,
  requestRecoveryDisabledReason,
  resubmitDisabled,
  resubmitDisabledReason,
  onRetry,
  onResubmit,
  onRecoverService,
  onRecheckDatabase,
  onReprobeCapabilities,
  onReviewInvalidField,
  onOpenRecoverySettings,
  onCancel,
}: {
  lifecycle: SearchRequestLifecycle;
  retryAvailable: boolean;
  requestRecoveryDisabledReason: string | null;
  resubmitDisabled: boolean;
  resubmitDisabledReason: string | null;
  onRetry: () => void;
  onResubmit: () => void;
  onRecoverService: () => void;
  onRecheckDatabase: () => void;
  onReprobeCapabilities: () => void;
  onReviewInvalidField: (field: SearchRequestErrorField) => void;
  onOpenRecoverySettings: (section: "service" | "data" | "about") => void;
  onCancel: () => void;
}) {
  if (lifecycle.status === "loading") {
    return (
      <section className="search-result-initial search-result-initial--loading" aria-label="正在搜索">
        <p role="status">正在创建首个搜索快照…</p>
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="search-result-skeleton" aria-hidden="true" />
        ))}
        <button type="button" onClick={onCancel}>取消搜索</button>
      </section>
    );
  }
  if (lifecycle.status === "cancelled") {
    return (
      <section className="search-result-initial" aria-label="搜索已取消">
        <strong>搜索已取消</strong>
        <p>没有建立新的结果快照；输入和筛选草稿仍然保留。</p>
      </section>
    );
  }
  if (lifecycle.status === "error") {
    return (
      <section className="search-result-initial" role="alert">
        <strong>搜索未完成</strong>
        <p>{searchRequestErrorMessage(lifecycle.errorCode)}</p>
        <SearchRequestRecovery
          lifecycle={lifecycle}
          hasSnapshot={false}
          retryAvailable={retryAvailable}
          requestRecoveryDisabledReason={requestRecoveryDisabledReason}
          resubmitDisabled={resubmitDisabled}
          resubmitDisabledReason={resubmitDisabledReason}
          onRetry={onRetry}
          onResubmit={onResubmit}
          onRecoverService={onRecoverService}
          onRecheckDatabase={onRecheckDatabase}
          onReprobeCapabilities={onReprobeCapabilities}
          onReviewInvalidField={onReviewInvalidField}
          onOpenRecoverySettings={onOpenRecoverySettings}
        />
      </section>
    );
  }
  return (
    <section className="search-result-initial" aria-label="搜索尚未开始">
      <strong>输入关键词并检查搜索条件</strong>
      <p>搜索只会在你明确提交后执行。</p>
    </section>
  );
}

function SearchRequestRecovery({
  lifecycle,
  hasSnapshot,
  retryAvailable,
  requestRecoveryDisabledReason,
  resubmitDisabled,
  resubmitDisabledReason,
  onRetry,
  onRefresh,
  onResubmit,
  onRecoverService,
  onRecheckDatabase,
  onReprobeCapabilities,
  onReviewInvalidField,
  onOpenRecoverySettings,
}: {
  lifecycle: SearchRequestLifecycle;
  hasSnapshot: boolean;
  retryAvailable: boolean;
  requestRecoveryDisabledReason: string | null;
  resubmitDisabled: boolean;
  resubmitDisabledReason: string | null;
  onRetry: () => void;
  onRefresh?: () => void;
  onResubmit: () => void;
  onRecoverService: () => void;
  onRecheckDatabase: () => void;
  onReprobeCapabilities: () => void;
  onReviewInvalidField: (field: SearchRequestErrorField) => void;
  onOpenRecoverySettings: (section: "service" | "data" | "about") => void;
}) {
  if (lifecycle.status !== "error") return null;
  const actions = buildSearchRequestRecoveryActions(lifecycle, {
    hasSnapshot,
    retryAvailable,
    requestRecoveryDisabledReason,
    resubmitDisabled,
    resubmitDisabledReason,
  });
  if (actions.length === 0) {
    return (
      <p className="search-result-pane__recovery-status" role="status">
        {requestRecoveryDisabledReason ?? resubmitDisabledReason ?? "请先检查搜索条件。"}
      </p>
    );
  }
  return (
    <div className="search-result-pane__recovery-actions">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() =>
            runSearchRecoveryAction(action, {
              onRetry,
              onRefresh,
              onResubmit,
              onRecoverService,
              onRecheckDatabase,
              onReprobeCapabilities,
              onReviewInvalidField,
              onOpenRecoverySettings,
            })
          }
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function runSearchRecoveryAction(
  action: SearchRequestRecoveryAction,
  callbacks: {
    onRetry: () => void;
    onRefresh?: () => void;
    onResubmit: () => void;
    onRecoverService: () => void;
    onRecheckDatabase: () => void;
    onReprobeCapabilities: () => void;
    onReviewInvalidField: (field: SearchRequestErrorField) => void;
    onOpenRecoverySettings: (section: "service" | "data" | "about") => void;
  },
) {
  if (action.id === "retry") return callbacks.onRetry();
  if (action.id === "refresh") return callbacks.onRefresh?.();
  if (action.id === "resubmit") return callbacks.onResubmit();
  if (action.id === "recover-service") return callbacks.onRecoverService();
  if (action.id === "recheck-database") return callbacks.onRecheckDatabase();
  if (action.id === "reprobe-capabilities") return callbacks.onReprobeCapabilities();
  if (action.id === "review-field" && action.field) {
    return callbacks.onReviewInvalidField(action.field);
  }
  if (action.id === "service-settings") return callbacks.onOpenRecoverySettings("service");
  if (action.id === "data-settings") return callbacks.onOpenRecoverySettings("data");
  return callbacks.onOpenRecoverySettings("about");
}

function searchRequestErrorMessage(code: string): string {
  if (code === "service_unavailable") return "本机搜索服务暂不可用，请检查服务状态后重试。";
  if (code === "database_unavailable") return "聊天数据库尚未就绪，请完成数据库加载后重试。";
  if (code === "invalid_request") return "搜索条件无效，请检查关键词、范围或日期。";
  if (code === "timeout") return "搜索超时；不会自动重试，请按需重新提交。";
  if (code === "snapshot_expired" || code === "stale_revision") return "搜索快照已变化，请刷新搜索。";
  if (code === "capability_unavailable") return "当前本机服务不支持这一完整搜索请求。";
  if (code === "permission_denied") return "读取本机聊天数据或文件时权限不足。";
  if (code === "identity_conflict") return "搜索结果身份不一致，需要刷新快照后再继续。";
  return "搜索请求失败，请重试或查看脱敏诊断。";
}

function estimateEntryHeight(entry: SearchResultListEntry | undefined): number {
  if (!entry) return 96;
  if (entry.kind === "row") return 104;
  if (entry.kind === "group") return 38;
  return 52;
}

function firstVisibleAnchor(
  refs: MutableRefObject<Map<string, HTMLDivElement>>,
  root: HTMLElement | null,
): SearchScrollAnchor | null {
  if (!root) return null;
  const rootBox = root.getBoundingClientRect();
  return selectFirstVisibleSearchScrollAnchor(
    [...refs.current.entries()].map(([resultId, node]) => {
      const box = node.getBoundingClientRect();
      return { resultId, top: box.top, bottom: box.bottom };
    }),
    { top: rootBox.top, bottom: rootBox.bottom },
  );
}

function resultAnchor(
  resultId: string,
  refs: MutableRefObject<Map<string, HTMLDivElement>>,
  root: HTMLElement | null,
): SearchScrollAnchor | null {
  const row = refs.current.get(resultId);
  if (!root || !row) return null;
  return createSearchScrollAnchor({
    resultId,
    resultTop: row.getBoundingClientRect().top,
    viewportTop: root.getBoundingClientRect().top,
  });
}

function alignSearchScrollAnchor(
  root: HTMLElement,
  row: HTMLElement,
  anchor: SearchScrollAnchor,
): boolean {
  const currentOffset = row.getBoundingClientRect().top - root.getBoundingClientRect().top;
  const correction = calculateSearchScrollCorrection({
    currentScrollTop: root.scrollTop,
    currentOffsetFromViewportTop: currentOffset,
    targetOffsetFromViewportTop: anchor.offsetFromViewportTop,
  });
  if (!correction.aligned && correction.scrollDelta !== 0) {
    root.scrollTop = correction.nextScrollTop;
  }
  const alignedOffset = row.getBoundingClientRect().top - root.getBoundingClientRect().top;
  return isSearchScrollAnchorAligned(alignedOffset, anchor.offsetFromViewportTop);
}

function categoryIcon(category: SearchHit["category"]) {
  if (category === "image_emoji") return <Image size={18} />;
  if (category === "video") return <Video size={18} />;
  if (category === "voice") return <Mic size={18} />;
  if (category === "file") return <FileText size={18} />;
  if (category === "link_card") return <Link size={18} />;
  if (category === "quote_forward") return <Quote size={18} />;
  if (category === "location") return <MapPin size={18} />;
  if (category === "system_other") return <CircleEllipsis size={18} />;
  return <MessageSquare size={18} />;
}

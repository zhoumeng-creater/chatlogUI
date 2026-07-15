import type { SearchHit, SearchSnapshotPage } from "@/l2-coordinator/api-docs/search";
import { createSearchHitIdentity } from "./searchHitIdentity";
import {
  cloneSearchScrollAnchor,
  type SearchScrollAnchor,
} from "./searchScrollAnchor";

// Ten ordinary 50-row windows keep cumulative browsing responsive while still
// preserving the active range and the page the user explicitly requested.
export const SEARCH_RETAINED_HIT_BUDGET = 500;

export type SearchWindowBrowseMode = "manual" | "infinite" | "paged";
export interface SearchPageAttemptMetadata {
  attemptedCursor: string;
  targetPageStart: number;
}

export type SearchWindowOperationStatus =
  | { status: "idle" }
  | ({ status: "loading" } & Partial<SearchPageAttemptMetadata>)
  | ({ status: "error"; errorCode: string } & Partial<SearchPageAttemptMetadata>);

export interface SearchLoadedRange {
  start: number;
  end: number;
}

export const SEARCH_RESULT_BATCH_SIZE = 50;

export interface SearchReachablePage {
  start: number;
  pageNumber: number;
  cursor: string | null;
  current: boolean;
}

export interface SearchPageAttempt extends SearchPageAttemptMetadata {
  pageNumber: number;
}

export interface SearchWindowOperations {
  initial: SearchWindowOperationStatus;
  forward: SearchWindowOperationStatus;
  backward: SearchWindowOperationStatus;
  page: SearchWindowOperationStatus;
  gaps: Record<string, SearchWindowOperationStatus>;
}

export interface SearchPageReadingPosition {
  activeSourceIndex: number | null;
  scrollAnchor: SearchScrollAnchor | null;
}

export interface SearchResultWindow {
  snapshotId: string;
  dataRevision: string;
  exactTotal: boolean;
  completeScope: boolean;
  totalCount: number;
  browseMode: SearchWindowBrowseMode;
  retainedHits: SearchHit[];
  currentPageHits: SearchHit[];
  currentPageStart: number;
  previousCursor: string;
  nextCursor: string;
  hasPrevious: boolean;
  hasNext: boolean;
  loadedRanges: SearchLoadedRange[];
  gaps: SearchLoadedRange[];
  pageCursors: Record<string, string>;
  pageReadingPositions: Record<string, SearchPageReadingPosition>;
  activeSourceIndex: number | null;
  scrollAnchors: Record<SearchWindowBrowseMode, SearchScrollAnchor | null>;
  restoreScrollAnchor: SearchScrollAnchor | null;
  operations: SearchWindowOperations;
}

export type SearchWindowErrorCode =
  | "invalid_window"
  | "stale_revision"
  | "snapshot_mismatch"
  | "identity_conflict";

export class SearchWindowError extends Error {
  readonly code: SearchWindowErrorCode;

  constructor(code: SearchWindowErrorCode) {
    super(windowErrorMessage(code));
    this.name = "SearchWindowError";
    this.code = code;
  }
}

export function createSearchResultWindow(
  page: SearchSnapshotPage,
  browseMode: SearchWindowBrowseMode,
): SearchResultWindow {
  validatePage(page);
  const hits = cloneHits(page.messages);
  const loadedRanges = rangesForHits(hits);
  return {
    snapshotId: page.snapshotId,
    dataRevision: page.dataRevision,
    exactTotal: page.exactTotal,
    completeScope: page.completeScope,
    totalCount: page.totalCount,
    browseMode,
    retainedHits: hits,
    currentPageHits: cloneHits(hits),
    currentPageStart: page.windowStart,
    previousCursor: page.previousCursor,
    nextCursor: page.nextCursor,
    hasPrevious: page.hasPrevious,
    hasNext: page.hasNext,
    loadedRanges,
    gaps: searchCoverageGaps(loadedRanges, page.totalCount),
    pageCursors: collectPageCursors({}, page),
    pageReadingPositions: {},
    activeSourceIndex: hits[0]?.sourceIndex ?? null,
    scrollAnchors: { manual: null, infinite: null, paged: null },
    restoreScrollAnchor: null,
    operations: createIdleOperations(),
  };
}

export function applySearchWindowPage(
  state: SearchResultWindow,
  page: SearchSnapshotPage,
  target: "forward" | "backward" | "gap" | "page",
): SearchResultWindow {
  validatePage(page);
  if (page.snapshotId !== state.snapshotId) throw new SearchWindowError("snapshot_mismatch");
  if (page.dataRevision !== state.dataRevision) throw new SearchWindowError("stale_revision");
  if (
    page.totalCount !== state.totalCount ||
    page.exactTotal !== state.exactTotal ||
    page.completeScope !== state.completeScope
  ) {
    throw new SearchWindowError("invalid_window");
  }
  assertNoIdentityConflicts([...state.retainedHits, ...state.currentPageHits], page.messages);

  const incomingPageHits = cloneHits(page.messages);
  const requestStillTargetsVisibleMode =
    (state.browseMode === "paged" && target === "page") ||
    (state.browseMode !== "paged" && target !== "page");
  const currentPageHits = requestStillTargetsVisibleMode
    ? incomingPageHits
    : cloneHits(state.currentPageHits);
  const currentPageStart = requestStillTargetsVisibleMode
    ? page.windowStart
    : state.currentPageStart;
  const retainedHits = retainSearchHitsWithinBudget(
    mergeHitsBySourceIndex(state.retainedHits, incomingPageHits),
    state.activeSourceIndex,
    incomingPageHits.map((hit) => hit.sourceIndex),
  );
  const loadedRanges = rangesForHits(retainedHits);
  const pageCursors = collectPageCursors(state.pageCursors, page);
  const preservePagedBoundaries = state.browseMode === "paged" && target !== "page";
  const boundaries = preservePagedBoundaries
    ? {
        previousCursor: state.previousCursor,
        nextCursor: state.nextCursor,
        hasPrevious: state.hasPrevious,
        hasNext: state.hasNext,
      }
    : boundariesForRanges(
        state.browseMode === "paged" ? rangesForHits(currentPageHits) : loadedRanges,
        pageCursors,
        state.totalCount,
      );
  const savedPagePosition = state.browseMode === "paged" && target === "page"
    ? state.pageReadingPositions[String(page.windowStart)]
    : undefined;
  const preferredActiveSourceIndex = savedPagePosition?.activeSourceIndex ?? state.activeSourceIndex;
  const activeSourceIndex = state.browseMode === "paged" && target === "page"
    ? currentPageHits.some((hit) => hit.sourceIndex === preferredActiveSourceIndex)
      ? preferredActiveSourceIndex
      : currentPageHits[0]?.sourceIndex ?? null
    : state.activeSourceIndex;
  return {
    ...state,
    retainedHits,
    currentPageHits,
    currentPageStart,
    ...boundaries,
    loadedRanges,
    gaps: searchCoverageGaps(loadedRanges, state.totalCount),
    pageCursors,
    activeSourceIndex,
    restoreScrollAnchor: requestStillTargetsVisibleMode && target === "page"
      ? cloneSearchScrollAnchor(savedPagePosition?.scrollAnchor)
      : state.restoreScrollAnchor,
  };
}

export function rememberSearchPageReadingPosition(
  state: SearchResultWindow,
  scrollAnchor: SearchScrollAnchor | null,
): SearchResultWindow {
  if (state.browseMode !== "paged") return state;
  return {
    ...state,
    pageReadingPositions: {
      ...state.pageReadingPositions,
      [String(state.currentPageStart)]: {
        activeSourceIndex: state.activeSourceIndex,
        scrollAnchor: cloneSearchScrollAnchor(scrollAnchor),
      },
    },
  };
}

export function switchSearchBrowseMode(
  state: SearchResultWindow,
  browseMode: SearchWindowBrowseMode,
  outgoingScrollAnchor: SearchScrollAnchor | null,
): SearchResultWindow {
  if (browseMode === state.browseMode) {
    return { ...state, restoreScrollAnchor: cloneSearchScrollAnchor(outgoingScrollAnchor) };
  }
  const stateWithPagePosition = state.browseMode === "paged"
    ? rememberSearchPageReadingPosition(state, outgoingScrollAnchor)
    : state;
  const scrollAnchors = cloneScrollAnchors(stateWithPagePosition.scrollAnchors);
  scrollAnchors[state.browseMode] = cloneSearchScrollAnchor(outgoingScrollAnchor);
  let currentPageHits = cloneHits(stateWithPagePosition.currentPageHits);
  let currentPageStart = stateWithPagePosition.currentPageStart;
  let activeSourceIndex = stateWithPagePosition.activeSourceIndex;

  if (browseMode === "paged") {
    const anchorIndex = nearestSourceIndex(stateWithPagePosition.retainedHits, activeSourceIndex);
    if (anchorIndex !== null) {
      currentPageStart =
        Math.floor(anchorIndex / SEARCH_RESULT_BATCH_SIZE) * SEARCH_RESULT_BATCH_SIZE;
      currentPageHits = cloneHits(stateWithPagePosition.retainedHits.filter(
        (hit) =>
          hit.sourceIndex >= currentPageStart &&
          hit.sourceIndex < currentPageStart + SEARCH_RESULT_BATCH_SIZE,
      ));
      activeSourceIndex = nearestSourceIndex(currentPageHits, anchorIndex);
    }
  } else {
    activeSourceIndex = nearestSourceIndex(stateWithPagePosition.retainedHits, activeSourceIndex);
  }

  const savedPagePosition = browseMode === "paged"
    ? stateWithPagePosition.pageReadingPositions[String(currentPageStart)]
    : undefined;
  const restoreScrollAnchor = cloneSearchScrollAnchor(
    savedPagePosition?.scrollAnchor ??
      scrollAnchors[browseMode] ??
      (browseMode === "paged" ? null : scrollAnchors.manual ?? scrollAnchors.infinite),
  );
  const boundaries = boundariesForRanges(
    browseMode === "paged" ? rangesForHits(currentPageHits) : state.loadedRanges,
    stateWithPagePosition.pageCursors,
    stateWithPagePosition.totalCount,
  );
  return {
    ...stateWithPagePosition,
    browseMode,
    currentPageHits,
    currentPageStart,
    activeSourceIndex,
    ...boundaries,
    scrollAnchors,
    restoreScrollAnchor,
  };
}

function cloneScrollAnchors(
  anchors: SearchResultWindow["scrollAnchors"],
): SearchResultWindow["scrollAnchors"] {
  return {
    manual: cloneSearchScrollAnchor(anchors.manual),
    infinite: cloneSearchScrollAnchor(anchors.infinite),
    paged: cloneSearchScrollAnchor(anchors.paged),
  };
}

function boundariesForRanges(
  ranges: SearchLoadedRange[],
  pageCursors: Record<string, string>,
  totalCount: number,
): Pick<SearchResultWindow, "previousCursor" | "nextCursor" | "hasPrevious" | "hasNext"> {
  const normalized = normalizeLoadedRanges(ranges);
  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  if (!first || !last) {
    return { previousCursor: "", nextCursor: "", hasPrevious: false, hasNext: false };
  }
  const previousCursor = first.start > 0
    ? pageCursors[String(Math.max(0, first.start - SEARCH_RESULT_BATCH_SIZE))] ?? ""
    : "";
  const nextCursor = last.end < totalCount ? pageCursors[String(last.end)] ?? "" : "";
  return {
    previousCursor,
    nextCursor,
    hasPrevious: previousCursor.length > 0,
    hasNext: nextCursor.length > 0,
  };
}

export function resolveSearchPageAttempt(
  state: Pick<SearchResultWindow, "pageCursors" | "currentPageStart" | "totalCount">,
  cursor: string,
  targetPageStart: number,
): SearchPageAttempt | null {
  if (!cursor || !Number.isSafeInteger(targetPageStart)) return null;
  const normalizedTarget = reachablePageStart(String(targetPageStart), state.totalCount);
  if (normalizedTarget === null || normalizedTarget !== targetPageStart) return null;
  const continuationAttempt = resolveSearchContinuationAttempt(state, cursor);
  if (!continuationAttempt || continuationAttempt.targetPageStart !== normalizedTarget) return null;
  const pageNumber = Math.floor(normalizedTarget / SEARCH_RESULT_BATCH_SIZE) + 1;
  const currentPageNumber = Math.floor(state.currentPageStart / SEARCH_RESULT_BATCH_SIZE) + 1;
  if (pageNumber === currentPageNumber) return null;
  return { attemptedCursor: cursor, targetPageStart: normalizedTarget, pageNumber };
}

export function resolveSearchContinuationAttempt(
  state: Pick<SearchResultWindow, "pageCursors" | "totalCount">,
  cursor: string,
): SearchPageAttemptMetadata | null {
  if (!cursor) return null;
  const matchingStarts = Object.entries(state.pageCursors).flatMap(([startKey, candidateCursor]) => {
    const start = continuationWindowStart(startKey, state.totalCount);
    return candidateCursor === cursor && start !== null ? [start] : [];
  });
  if (matchingStarts.length !== 1) return null;
  return { attemptedCursor: cursor, targetPageStart: matchingStarts[0] };
}

export function assertSearchContinuationPage(
  state: Pick<SearchResultWindow, "totalCount">,
  attempt: SearchPageAttemptMetadata,
  page: SearchSnapshotPage,
): void {
  validatePage(page);
  const expectedStart = attempt.targetPageStart;
  const expectedCount = Math.min(SEARCH_RESULT_BATCH_SIZE, state.totalCount - expectedStart);
  const expectedHasPrevious = expectedStart > 0;
  const expectedHasNext = expectedStart + expectedCount < state.totalCount;
  if (
    !attempt.attemptedCursor ||
    !isNonNegativeInteger(expectedStart) ||
    expectedStart >= state.totalCount ||
    page.totalCount !== state.totalCount ||
    page.windowStart !== expectedStart ||
    page.count !== expectedCount ||
    page.hasPrevious !== expectedHasPrevious ||
    page.hasNext !== expectedHasNext ||
    Boolean(page.previousCursor) !== page.hasPrevious ||
    Boolean(page.nextCursor) !== page.hasNext
  ) {
    throw new SearchWindowError("invalid_window");
  }
}

export function getReachableSearchPages(state: SearchResultWindow): SearchReachablePage[] {
  const totalPages = Math.max(1, Math.ceil(state.totalCount / SEARCH_RESULT_BATCH_SIZE));
  const pages = new Map<number, SearchReachablePage>();
  for (const [startKey, cursor] of Object.entries(state.pageCursors)) {
    const start = reachablePageStart(startKey, state.totalCount);
    if (start === null || cursor.length === 0) continue;
    const pageNumber = Math.floor(start / SEARCH_RESULT_BATCH_SIZE) + 1;
    if (pageNumber > totalPages) continue;
    pages.set(pageNumber, { start, pageNumber, cursor, current: false });
  }

  const currentPageNumber = Math.min(
    totalPages,
    Math.max(1, Math.floor(state.currentPageStart / SEARCH_RESULT_BATCH_SIZE) + 1),
  );
  pages.set(currentPageNumber, {
    start: state.currentPageStart,
    pageNumber: currentPageNumber,
    cursor: null,
    current: true,
  });
  return [...pages.values()].sort((left, right) => left.pageNumber - right.pageNumber);
}

function reachablePageStart(startKey: string, totalCount: number): number | null {
  const start = Number(startKey);
  return isNonNegativeInteger(start) &&
    String(start) === startKey &&
    start % SEARCH_RESULT_BATCH_SIZE === 0 &&
    start < totalCount
    ? start
    : null;
}

function continuationWindowStart(startKey: string, totalCount: number): number | null {
  const start = Number(startKey);
  return isNonNegativeInteger(start) && String(start) === startKey && start < totalCount
    ? start
    : null;
}

export function getVisibleSearchHits(state: SearchResultWindow): SearchHit[] {
  return cloneHits(state.browseMode === "paged" ? state.currentPageHits : state.retainedHits);
}

export function getSearchGapCursor(
  state: SearchResultWindow,
  gap: SearchLoadedRange,
): string | null {
  const isCurrentGap = state.gaps.some(
    (candidate) => candidate.start === gap.start && candidate.end === gap.end,
  );
  if (!isCurrentGap) return null;
  const firstCursor = state.pageCursors[String(gap.start)] ?? null;
  const lastWindowStart = Math.max(gap.start, gap.end - SEARCH_RESULT_BATCH_SIZE);
  const lastCursor = state.pageCursors[String(lastWindowStart)] ?? null;
  if (!firstCursor) return lastCursor;
  if (!lastCursor || lastWindowStart === gap.start) return firstCursor;

  const activeSourceIndex = state.activeSourceIndex;
  if (activeSourceIndex === null) return firstCursor;
  const distanceFromStart = Math.abs(activeSourceIndex - gap.start);
  const distanceFromEnd = Math.abs(activeSourceIndex - gap.end);
  return distanceFromEnd < distanceFromStart ? lastCursor : firstCursor;
}

export function getSearchRangeLoadCount(range: SearchLoadedRange): number {
  if (
    !isNonNegativeInteger(range.start) ||
    !isNonNegativeInteger(range.end) ||
    range.end <= range.start
  ) {
    throw new SearchWindowError("invalid_window");
  }
  return Math.min(SEARCH_RESULT_BATCH_SIZE, range.end - range.start);
}

export function getSearchBoundaryRemainingCount(
  state: SearchResultWindow,
  direction: "forward" | "backward",
): number {
  const ranges = normalizeLoadedRanges(state.loadedRanges);
  const first = ranges[0];
  const last = ranges[ranges.length - 1];
  if (!first || !last) return 0;
  return direction === "backward"
    ? first.start
    : Math.max(0, state.totalCount - last.end);
}

export function selectNearestSearchGap(
  gaps: SearchLoadedRange[],
  activeSourceIndex: number | null,
): SearchLoadedRange | null {
  if (gaps.length === 0) return null;
  const ordered = gaps.map((gap) => {
    getSearchRangeLoadCount(gap);
    return { ...gap };
  }).sort((left, right) => left.start - right.start || left.end - right.end);
  if (activeSourceIndex === null) return ordered[0];

  let nearest = ordered[0];
  let nearestDistance = distanceToRange(activeSourceIndex, nearest);
  for (const candidate of ordered.slice(1)) {
    const distance = distanceToRange(activeSourceIndex, candidate);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function setSearchWindowOperation(
  state: SearchResultWindow,
  operation:
    | { kind: "initial" | "forward" | "backward" | "page" }
    | { kind: "gap"; range: SearchLoadedRange },
  status: SearchWindowOperationStatus,
): SearchResultWindow {
  if (operation.kind === "gap") {
    return {
      ...state,
      operations: {
        ...state.operations,
        gaps: {
          ...state.operations.gaps,
          [rangeKey(operation.range)]: { ...status },
        },
      },
    };
  }
  return {
    ...state,
    operations: { ...state.operations, [operation.kind]: { ...status } },
  };
}

export function normalizeLoadedRanges(ranges: SearchLoadedRange[]): SearchLoadedRange[] {
  const sorted = ranges.map((range) => {
    if (!isNonNegativeInteger(range.start) || !isNonNegativeInteger(range.end) || range.end <= range.start) {
      throw new SearchWindowError("invalid_window");
    }
    return { ...range };
  }).sort((left, right) => left.start - right.start || left.end - right.end);
  const normalized: SearchLoadedRange[] = [];
  for (const range of sorted) {
    const previous = normalized[normalized.length - 1];
    if (!previous || range.start > previous.end) {
      normalized.push(range);
    } else if (range.end > previous.end) {
      previous.end = range.end;
    }
  }
  return normalized;
}

export function searchCoverageGaps(
  ranges: SearchLoadedRange[],
  totalCount: number,
): SearchLoadedRange[] {
  if (!isNonNegativeInteger(totalCount)) throw new SearchWindowError("invalid_window");
  const normalized = normalizeLoadedRanges(ranges);
  const gaps: SearchLoadedRange[] = [];
  let cursor = 0;
  for (const range of normalized) {
    if (range.end > totalCount) throw new SearchWindowError("invalid_window");
    if (range.start > cursor) gaps.push({ start: cursor, end: range.start });
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < totalCount) gaps.push({ start: cursor, end: totalCount });
  return gaps;
}

function validatePage(page: SearchSnapshotPage): void {
  if (
    !page.snapshotId ||
    !page.dataRevision ||
    !isNonNegativeInteger(page.totalCount) ||
    !isNonNegativeInteger(page.count) ||
    page.count > SEARCH_RESULT_BATCH_SIZE ||
    !isNonNegativeInteger(page.windowStart) ||
    page.messages.length !== page.count ||
    page.windowStart + page.count > page.totalCount ||
    (page.totalCount > 0 && page.count === 0) ||
    (page.totalCount === 0 && page.windowStart !== 0)
  ) {
    throw new SearchWindowError("invalid_window");
  }
  const hitIdentities = new Set<string>();
  for (let index = 0; index < page.messages.length; index += 1) {
    const hit = page.messages[index];
    const identity = createSearchHitIdentity(hit);
    if (
      !hit.messageId ||
      !hit.conversationId ||
      !Number.isSafeInteger(hit.seq) ||
      hit.sourceIndex !== page.windowStart + index ||
      hitIdentities.has(identity)
    ) {
      throw new SearchWindowError("invalid_window");
    }
    hitIdentities.add(identity);
  }
}

function collectPageCursors(
  current: Record<string, string>,
  page: SearchSnapshotPage,
): Record<string, string> {
  const next = { ...current };
  if (page.hasPrevious && page.previousCursor) {
    next[String(Math.max(0, page.windowStart - SEARCH_RESULT_BATCH_SIZE))] = page.previousCursor;
  }
  if (page.hasNext && page.nextCursor) {
    next[String(page.windowStart + page.count)] = page.nextCursor;
  }
  return next;
}

function assertNoIdentityConflicts(existing: SearchHit[], incoming: SearchHit[]): void {
  const bySource = new Map(existing.map((hit) => [hit.sourceIndex, hit]));
  const byIdentity = new Map(existing.map((hit) => [createSearchHitIdentity(hit), hit]));
  for (const hit of incoming) {
    const sameSource = bySource.get(hit.sourceIndex);
    const sameIdentity = byIdentity.get(createSearchHitIdentity(hit));
    if ((sameSource && !sameHit(sameSource, hit)) ||
        (sameIdentity && sameIdentity.sourceIndex !== hit.sourceIndex)) {
      throw new SearchWindowError("identity_conflict");
    }
  }
}

function mergeHitsBySourceIndex(existing: SearchHit[], incoming: SearchHit[]): SearchHit[] {
  const merged = new Map<number, SearchHit>();
  for (const hit of existing) merged.set(hit.sourceIndex, cloneHit(hit));
  for (const hit of incoming) merged.set(hit.sourceIndex, cloneHit(hit));
  return [...merged.values()].sort((left, right) => left.sourceIndex - right.sourceIndex);
}

export function retainSearchHitsWithinBudget(
  hits: SearchHit[],
  activeSourceIndex: number | null,
  pinnedSourceIndexes: readonly number[] = [],
  budget = SEARCH_RETAINED_HIT_BUDGET,
): SearchHit[] {
  if (!Number.isSafeInteger(budget) || budget < SEARCH_RESULT_BATCH_SIZE) {
    throw new SearchWindowError("invalid_window");
  }
  const ordered = [...hits].sort((left, right) => left.sourceIndex - right.sourceIndex);
  if (ordered.length <= budget) return ordered;

  const chunks: SearchHit[][] = [];
  for (const hit of ordered) {
    const chunk = chunks[chunks.length - 1];
    const previous = chunk?.[chunk.length - 1];
    if (
      !chunk ||
      chunk.length >= SEARCH_RESULT_BATCH_SIZE ||
      previous.sourceIndex + 1 !== hit.sourceIndex
    ) {
      chunks.push([hit]);
    } else {
      chunk.push(hit);
    }
  }
  const anchor = activeSourceIndex ?? pinnedSourceIndexes[0] ?? ordered[0].sourceIndex;
  const mandatory = new Set<SearchHit[]>();
  for (const chunk of chunks) {
    if (
      chunk.some(
        (hit) =>
          hit.sourceIndex === activeSourceIndex || pinnedSourceIndexes.includes(hit.sourceIndex),
      )
    ) {
      mandatory.add(chunk);
    }
  }
  const selected = [...mandatory];
  let selectedCount = selected.reduce((count, chunk) => count + chunk.length, 0);
  const candidates = chunks
    .filter((chunk) => !mandatory.has(chunk))
    .sort((left, right) => {
      const distance = chunkDistance(left, anchor) - chunkDistance(right, anchor);
      return distance || left[0].sourceIndex - right[0].sourceIndex;
    });
  for (const chunk of candidates) {
    if (selectedCount + chunk.length > budget) continue;
    selected.push(chunk);
    selectedCount += chunk.length;
  }
  return selected
    .sort((left, right) => left[0].sourceIndex - right[0].sourceIndex)
    .flat();
}

function chunkDistance(chunk: SearchHit[], anchor: number): number {
  const start = chunk[0].sourceIndex;
  const end = chunk[chunk.length - 1].sourceIndex;
  if (anchor < start) return start - anchor;
  if (anchor > end) return anchor - end;
  return 0;
}

function rangesForHits(hits: SearchHit[]): SearchLoadedRange[] {
  const indexes = [...new Set(hits.map((hit) => hit.sourceIndex))].sort((left, right) => left - right);
  const ranges: SearchLoadedRange[] = [];
  for (const sourceIndex of indexes) {
    const previous = ranges[ranges.length - 1];
    if (previous && previous.end === sourceIndex) {
      previous.end += 1;
    } else {
      ranges.push({ start: sourceIndex, end: sourceIndex + 1 });
    }
  }
  return ranges;
}

function nearestSourceIndex(hits: SearchHit[], preferred: number | null): number | null {
  if (hits.length === 0) return null;
  if (preferred === null) return hits[0].sourceIndex;
  let nearest = hits[0].sourceIndex;
  let distance = Math.abs(nearest - preferred);
  for (const hit of hits.slice(1)) {
    const candidateDistance = Math.abs(hit.sourceIndex - preferred);
    if (candidateDistance < distance || (candidateDistance === distance && hit.sourceIndex < nearest)) {
      nearest = hit.sourceIndex;
      distance = candidateDistance;
    }
  }
  return nearest;
}

function cloneHits(hits: SearchHit[]): SearchHit[] {
  return hits.map(cloneHit);
}

function cloneHit(hit: SearchHit): SearchHit {
  return { ...hit, matchSegments: hit.matchSegments.map((segment) => ({ ...segment })) };
}

function sameHit(left: SearchHit, right: SearchHit): boolean {
  return left.messageId === right.messageId &&
    left.seq === right.seq &&
    left.sourceIndex === right.sourceIndex &&
    left.conversationId === right.conversationId &&
    left.conversationName === right.conversationName &&
    left.senderId === right.senderId &&
    left.senderName === right.senderName &&
    left.timestamp === right.timestamp &&
    left.type === right.type &&
    left.subType === right.subType &&
    left.category === right.category &&
    left.matchField === right.matchField &&
    left.snippet === right.snippet &&
    left.matchSegments.length === right.matchSegments.length &&
    left.matchSegments.every((segment, index) =>
      segment.text === right.matchSegments[index].text &&
      segment.matched === right.matchSegments[index].matched);
}

function createIdleOperations(): SearchWindowOperations {
  return {
    initial: { status: "idle" },
    forward: { status: "idle" },
    backward: { status: "idle" },
    page: { status: "idle" },
    gaps: {},
  };
}

function rangeKey(range: SearchLoadedRange): string {
  return `${range.start}:${range.end}`;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function distanceToRange(sourceIndex: number, range: SearchLoadedRange): number {
  if (sourceIndex >= range.start && sourceIndex < range.end) return 0;
  return Math.min(Math.abs(sourceIndex - range.start), Math.abs(sourceIndex - range.end));
}

function windowErrorMessage(code: SearchWindowErrorCode): string {
  switch (code) {
    case "stale_revision":
      return "Search result revision is stale";
    case "snapshot_mismatch":
      return "Search result snapshot does not match";
    case "identity_conflict":
      return "Search result identity is inconsistent";
    case "invalid_window":
      return "Search result window is invalid";
  }
}

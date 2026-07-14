import type { SearchHit, SearchSnapshotPage } from "@/l2-coordinator/api-docs/search";

export type SearchWindowBrowseMode = "manual" | "infinite" | "paged";
export type SearchWindowOperationStatus =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; errorCode: string };

export interface SearchLoadedRange {
  start: number;
  end: number;
}

export interface SearchWindowOperations {
  initial: SearchWindowOperationStatus;
  forward: SearchWindowOperationStatus;
  backward: SearchWindowOperationStatus;
  page: SearchWindowOperationStatus;
  gaps: Record<string, SearchWindowOperationStatus>;
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
  activeSourceIndex: number | null;
  scrollAnchors: Record<SearchWindowBrowseMode, string | null>;
  restoreScrollAnchor: string | null;
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

  const currentPageHits = cloneHits(page.messages);
  const retainedHits = target === "page"
    ? cloneHits(state.retainedHits)
    : mergeHitsBySourceIndex(state.retainedHits, currentPageHits);
  const loadedRanges = rangesForHits(retainedHits);
  const activeSourceIndex = target === "page" &&
    !currentPageHits.some((hit) => hit.sourceIndex === state.activeSourceIndex)
    ? currentPageHits[0]?.sourceIndex ?? null
    : state.activeSourceIndex;
  return {
    ...state,
    retainedHits,
    currentPageHits,
    currentPageStart: page.windowStart,
    previousCursor: page.previousCursor,
    nextCursor: page.nextCursor,
    hasPrevious: page.hasPrevious,
    hasNext: page.hasNext,
    loadedRanges,
    gaps: searchCoverageGaps(loadedRanges, state.totalCount),
    activeSourceIndex,
  };
}

export function switchSearchBrowseMode(
  state: SearchResultWindow,
  browseMode: SearchWindowBrowseMode,
  outgoingScrollAnchor: string | null,
): SearchResultWindow {
  if (browseMode === state.browseMode) return { ...state, restoreScrollAnchor: outgoingScrollAnchor };
  const scrollAnchors = { ...state.scrollAnchors, [state.browseMode]: outgoingScrollAnchor };
  let currentPageHits = cloneHits(state.currentPageHits);
  let currentPageStart = state.currentPageStart;
  let activeSourceIndex = state.activeSourceIndex;

  if (browseMode === "paged") {
    const anchorIndex = nearestSourceIndex(state.retainedHits, activeSourceIndex);
    if (anchorIndex !== null) {
      currentPageStart = Math.floor(anchorIndex / 50) * 50;
      currentPageHits = cloneHits(state.retainedHits.filter(
        (hit) => hit.sourceIndex >= currentPageStart && hit.sourceIndex < currentPageStart + 50,
      ));
      activeSourceIndex = nearestSourceIndex(currentPageHits, anchorIndex);
    }
  } else {
    activeSourceIndex = nearestSourceIndex(state.retainedHits, activeSourceIndex);
  }

  const restoreScrollAnchor = scrollAnchors[browseMode] ?? (
    browseMode === "paged"
      ? null
      : scrollAnchors.manual ?? scrollAnchors.infinite
  );
  return {
    ...state,
    browseMode,
    currentPageHits,
    currentPageStart,
    activeSourceIndex,
    scrollAnchors,
    restoreScrollAnchor,
  };
}

export function getVisibleSearchHits(state: SearchResultWindow): SearchHit[] {
  return cloneHits(state.browseMode === "paged" ? state.currentPageHits : state.retainedHits);
}

export function getPartialExportHits(state: SearchResultWindow): SearchHit[] {
  return getVisibleSearchHits(state);
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
    page.count > 50 ||
    !isNonNegativeInteger(page.windowStart) ||
    page.messages.length !== page.count ||
    page.windowStart + page.count > page.totalCount ||
    (page.totalCount > 0 && page.count === 0) ||
    (page.totalCount === 0 && page.windowStart !== 0)
  ) {
    throw new SearchWindowError("invalid_window");
  }
  const messageIDs = new Set<string>();
  for (let index = 0; index < page.messages.length; index += 1) {
    const hit = page.messages[index];
    if (
      !hit.messageId ||
      hit.sourceIndex !== page.windowStart + index ||
      messageIDs.has(hit.messageId)
    ) {
      throw new SearchWindowError("invalid_window");
    }
    messageIDs.add(hit.messageId);
  }
}

function assertNoIdentityConflicts(existing: SearchHit[], incoming: SearchHit[]): void {
  const bySource = new Map(existing.map((hit) => [hit.sourceIndex, hit]));
  const byMessage = new Map(existing.map((hit) => [hit.messageId, hit]));
  for (const hit of incoming) {
    const sameSource = bySource.get(hit.sourceIndex);
    const sameMessage = byMessage.get(hit.messageId);
    if ((sameSource && !sameHit(sameSource, hit)) ||
        (sameMessage && sameMessage.sourceIndex !== hit.sourceIndex)) {
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

import { describe, expect, it } from "vitest";
import type { SearchHit, SearchSnapshotPage } from "@/l2-coordinator/api-docs/search";
import {
  SEARCH_RETAINED_HIT_BUDGET,
  applySearchWindowPage,
  assertSearchContinuationPage,
  createSearchResultWindow,
  getSearchBoundaryRemainingCount,
  getReachableSearchPages,
  resolveSearchContinuationAttempt,
  resolveSearchPageAttempt,
  getSearchGapCursor,
  getSearchRangeLoadCount,
  getVisibleSearchHits,
  normalizeLoadedRanges,
  rememberSearchPageReadingPosition,
  searchCoverageGaps,
  selectNearestSearchGap,
  setSearchWindowOperation,
  switchSearchBrowseMode,
  SearchWindowError,
} from "./searchResultWindowModel";

describe("searchResultWindowModel", () => {
  it("normalizes adjacent, overlapping, duplicate, and out-of-order ranges", () => {
    expect(normalizeLoadedRanges([
      { start: 50, end: 100 },
      { start: 0, end: 50 },
      { start: 40, end: 60 },
      { start: 150, end: 180 },
      { start: 150, end: 180 },
    ])).toEqual([{ start: 0, end: 100 }, { start: 150, end: 180 }]);
    expect(searchCoverageGaps([{ start: 0, end: 100 }, { start: 150, end: 180 }], 200)).toEqual([
      { start: 100, end: 150 },
      { start: 180, end: 200 },
    ]);
  });

  it("merges cumulative pages by sourceIndex without using array length as an offset", () => {
    let state = createSearchResultWindow(page(0, 50, 180), "manual");
    state = applySearchWindowPage(state, page(100, 50, 180), "gap");
    expect(state.loadedRanges).toEqual([{ start: 0, end: 50 }, { start: 100, end: 150 }]);
    expect(state.gaps).toEqual([{ start: 50, end: 100 }, { start: 150, end: 180 }]);

    state = applySearchWindowPage(state, page(50, 50, 180), "forward");
    state = applySearchWindowPage(state, page(50, 50, 180), "forward");
    expect(state.loadedRanges).toEqual([{ start: 0, end: 150 }]);
    expect(state.retainedHits).toHaveLength(150);
    expect(state.retainedHits.map((hit) => hit.sourceIndex)).toEqual(
      Array.from({ length: 150 }, (_, index) => index),
    );
  });

  it("keeps cumulative boundary cursors on the outer retained ranges", () => {
    let state = createSearchResultWindow(page(0, 50, 180), "manual");
    state = applySearchWindowPage(state, page(50, 50, 180), "forward");
    expect(state).toMatchObject({
      previousCursor: "",
      hasPrevious: false,
      nextCursor: "next-100",
      hasNext: true,
    });

    state = applySearchWindowPage(state, page(100, 50, 180), "forward");
    expect(state).toMatchObject({
      previousCursor: "",
      hasPrevious: false,
      nextCursor: "next-150",
      hasNext: true,
    });

    state = switchSearchBrowseMode(state, "paged", null);
    state = applySearchWindowPage(state, page(100, 50, 180), "page");
    expect(state).toMatchObject({
      previousCursor: "previous-100",
      hasPrevious: true,
      nextCursor: "next-150",
      hasNext: true,
    });

    state = switchSearchBrowseMode(state, "infinite", null);
    expect(state).toMatchObject({
      previousCursor: "",
      hasPrevious: false,
      nextCursor: "next-150",
      hasNext: true,
    });
  });

  it("retains opaque cursors for each reachable non-contiguous gap", () => {
    let state = createSearchResultWindow(page(0, 50, 180), "manual");
    expect(getSearchGapCursor(state, { start: 50, end: 180 })).toBe("next-50");

    state = applySearchWindowPage(state, page(100, 50, 180), "page");
    expect(state.gaps).toEqual([
      { start: 50, end: 100 },
      { start: 150, end: 180 },
    ]);
    expect(getSearchGapCursor(state, { start: 50, end: 100 })).toBe("previous-100");
    expect(getSearchGapCursor(state, { start: 150, end: 180 })).toBe("next-150");
    expect(getSearchGapCursor(state, { start: 50, end: 150 })).toBeNull();
  });

  it("lists only page starts backed by known opaque cursors", () => {
    let state = createSearchResultWindow(page(0, 50, 250), "paged");
    state = applySearchWindowPage(state, page(50, 50, 250), "page");
    state = {
      ...state,
      pageCursors: {
        ...state.pageCursors,
        200: "cursor-page-5",
        75: "cursor-not-a-page",
        300: "cursor-out-of-range",
      },
    };

    expect(getReachableSearchPages(state)).toEqual([
      { start: 0, pageNumber: 1, cursor: "previous-50", current: false },
      { start: 50, pageNumber: 2, cursor: null, current: true },
      { start: 100, pageNumber: 3, cursor: "next-100", current: false },
      { start: 200, pageNumber: 5, cursor: "cursor-page-5", current: false },
    ]);
    expect(resolveSearchPageAttempt(state, "next-100", 100)).toEqual({
      attemptedCursor: "next-100",
      targetPageStart: 100,
      pageNumber: 3,
    });
    expect(resolveSearchPageAttempt(state, "next-100", 200)).toBeNull();
    expect(resolveSearchPageAttempt(state, "cursor-not-a-page", 75)).toBeNull();
    expect(resolveSearchPageAttempt(state, "cursor-page-5", Number.MAX_SAFE_INTEGER)).toBeNull();
  });

  it("binds an opaque continuation cursor to one start and validates its complete position", () => {
    const state = createSearchResultWindow(page(0, 50, 150), "manual");
    const attempt = resolveSearchContinuationAttempt(state, "next-50");

    expect(attempt).toEqual({ attemptedCursor: "next-50", targetPageStart: 50 });
    expect(() => assertSearchContinuationPage(state, attempt!, page(50, 50, 150)))
      .not.toThrow();
    expect(() => assertSearchContinuationPage(state, attempt!, page(100, 50, 150)))
      .toThrowError(expect.objectContaining({ code: "invalid_window" }));
    expect(() => assertSearchContinuationPage(state, attempt!, page(50, 25, 150)))
      .toThrowError(expect.objectContaining({ code: "invalid_window" }));
    expect(() => assertSearchContinuationPage(state, attempt!, {
      ...page(50, 50, 150),
      previousCursor: "",
      hasPrevious: false,
    })).toThrowError(expect.objectContaining({ code: "invalid_window" }));

    expect(resolveSearchContinuationAttempt({
      ...state,
      pageCursors: { ...state.pageCursors, 100: "next-50" },
    }, "next-50")).toBeNull();
  });

  it("loads the side of the nearest gap closest to the active result", () => {
    let state = createSearchResultWindow(page(0, 50, 400), "manual");
    state = applySearchWindowPage(state, page(300, 50, 400), "page");
    state = { ...state, activeSourceIndex: 300 };

    expect(state.gaps).toEqual([
      { start: 50, end: 300 },
      { start: 350, end: 400 },
    ]);
    expect(state.activeSourceIndex).toBe(300);
    expect(getSearchGapCursor(state, { start: 50, end: 300 })).toBe("previous-300");

    state = { ...state, activeSourceIndex: 25 };
    expect(getSearchGapCursor(state, { start: 50, end: 300 })).toBe("next-50");
  });

  it("selects the closest gap to the active source index with a stable tie-break", () => {
    const gaps = [
      { start: 0, end: 50 },
      { start: 100, end: 150 },
      { start: 200, end: 240 },
    ];

    expect(selectNearestSearchGap(gaps, 175)).toEqual({ start: 100, end: 150 });
    expect(selectNearestSearchGap(gaps, 220)).toEqual({ start: 200, end: 240 });
    expect(selectNearestSearchGap(gaps, null)).toEqual({ start: 0, end: 50 });
  });

  it("reports real remaining counts while keeping each request capped at 50", () => {
    expect(getSearchRangeLoadCount({ start: 50, end: 82 })).toBe(32);
    expect(getSearchRangeLoadCount({ start: 50, end: 180 })).toBe(50);

    let state = createSearchResultWindow(page(0, 50, 82), "manual");
    expect(getSearchBoundaryRemainingCount(state, "backward")).toBe(0);
    expect(getSearchBoundaryRemainingCount(state, "forward")).toBe(32);

    state = applySearchWindowPage(state, page(50, 32, 82), "forward");
    expect(getSearchBoundaryRemainingCount(state, "forward")).toBe(0);
  });

  it("rejects stale revisions, malformed 50-row windows, and conflicting identities", () => {
    const state = createSearchResultWindow(page(0, 50, 100), "manual");
    expect(() => applySearchWindowPage(state, { ...page(50, 50, 100), dataRevision: "other" }, "forward"))
      .toThrowError(expect.objectContaining({ code: "stale_revision" }));
    expect(() => createSearchResultWindow(page(0, 51, 100), "manual"))
      .toThrowError(expect.objectContaining({ code: "invalid_window" }));
    expect(() => createSearchResultWindow(page(0, 0, 100), "manual"))
      .toThrowError(expect.objectContaining({ code: "invalid_window" }));

    const conflict = page(0, 50, 100);
    conflict.messages[0] = { ...conflict.messages[0], messageId: "different-message" };
    expect(() => applySearchWindowPage(state, conflict, "forward"))
      .toThrowError(expect.objectContaining({ code: "identity_conflict" }));
  });

  it("treats conversation, message, and sequence as the stable hit identity", () => {
    const sharedMessageId = "shared-message";
    const compositePage = page(0, 2, 2);
    compositePage.messages = [
      {
        ...compositePage.messages[0],
        messageId: sharedMessageId,
        conversationId: "conversation-a",
        seq: 7,
      },
      {
        ...compositePage.messages[1],
        messageId: sharedMessageId,
        conversationId: "conversation-b",
        seq: 7,
      },
    ];

    const state = createSearchResultWindow(compositePage, "manual");
    expect(state.retainedHits).toHaveLength(2);

    const repeatedLocalIdPage = page(0, 2, 2);
    repeatedLocalIdPage.messages = [
      {
        ...repeatedLocalIdPage.messages[0],
        messageId: sharedMessageId,
        conversationId: "conversation-a",
        seq: 7,
      },
      {
        ...repeatedLocalIdPage.messages[1],
        messageId: sharedMessageId,
        conversationId: "conversation-a",
        seq: 8,
      },
    ];
    expect(createSearchResultWindow(repeatedLocalIdPage, "manual").retainedHits)
      .toHaveLength(2);

    const firstPage = page(0, 1, 2);
    firstPage.messages[0] = {
      ...firstPage.messages[0],
      messageId: sharedMessageId,
      conversationId: "conversation-a",
      seq: 7,
    };
    const secondPage = page(1, 1, 2);
    secondPage.messages[0] = {
      ...secondPage.messages[0],
      messageId: sharedMessageId,
      conversationId: "conversation-b",
      seq: 7,
    };
    const merged = applySearchWindowPage(
      createSearchResultWindow(firstPage, "manual"),
      secondPage,
      "forward",
    );
    expect(merged.retainedHits).toHaveLength(2);

    const conflictingSecondPage = {
      ...secondPage,
      messages: [{ ...secondPage.messages[0], conversationId: "conversation-a" }],
    };
    expect(() =>
      applySearchWindowPage(
        createSearchResultWindow(firstPage, "manual"),
        conflictingSecondPage,
        "forward",
      )
    ).toThrowError(expect.objectContaining({ code: "identity_conflict" }));

    const duplicateIdentityPage = page(0, 2, 2);
    duplicateIdentityPage.messages = [
      {
        ...duplicateIdentityPage.messages[0],
        messageId: sharedMessageId,
        conversationId: "conversation-a",
        seq: 7,
      },
      {
        ...duplicateIdentityPage.messages[1],
        messageId: sharedMessageId,
        conversationId: "conversation-a",
        seq: 7,
      },
    ];
    expect(() => createSearchResultWindow(duplicateIdentityPage, "manual"))
      .toThrowError(expect.objectContaining({ code: "invalid_window" }));
  });

  it("preserves cumulative ranges and scroll anchors across manual, infinite, and paged modes", () => {
    let state = createSearchResultWindow(page(0, 50, 180), "manual");
    state = applySearchWindowPage(state, page(50, 50, 180), "forward");
    state = { ...state, activeSourceIndex: 65 };

    const cumulativeAnchor = {
      resultId: "cumulative-anchor",
      offsetFromViewportTop: -17.25,
    };

    state = switchSearchBrowseMode(state, "paged", cumulativeAnchor);
    expect(state.scrollAnchors.manual).toEqual(cumulativeAnchor);
    expect(state.scrollAnchors.manual).not.toBe(cumulativeAnchor);
    expect(getVisibleSearchHits(state).map((hit) => hit.sourceIndex)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 50),
    );

    state = applySearchWindowPage(state, page(100, 50, 180), "page");
    expect(state.retainedHits).toHaveLength(150);
    expect(getVisibleSearchHits(state)[0].sourceIndex).toBe(100);
    const pagedAnchor = { resultId: "paged-anchor", offsetFromViewportTop: 36 };
    state = switchSearchBrowseMode(state, "infinite", pagedAnchor);
    expect(state.scrollAnchors.paged).toEqual(pagedAnchor);
    expect(state.scrollAnchors.paged).not.toBe(pagedAnchor);
    expect(state.loadedRanges).toEqual([{ start: 0, end: 150 }]);
    expect(state.activeSourceIndex).toBe(100);
    expect(state.restoreScrollAnchor).toEqual(cumulativeAnchor);
    expect(state.restoreScrollAnchor).not.toBe(state.scrollAnchors.manual);
  });

  it("restores each paged window's active result and pixel anchor when revisiting it", () => {
    const firstPageAnchor = { resultId: "page-0-row-25", offsetFromViewportTop: 37.5 };
    const secondPageAnchor = { resultId: "page-50-row-65", offsetFromViewportTop: -11 };
    let state = createSearchResultWindow(page(0, 50, 150), "paged");
    state = { ...state, activeSourceIndex: 25 };
    state = rememberSearchPageReadingPosition(state, firstPageAnchor);

    state = applySearchWindowPage(state, page(50, 50, 150), "page");
    expect(state.activeSourceIndex).toBe(50);
    expect(state.restoreScrollAnchor).toBeNull();
    state = { ...state, activeSourceIndex: 65 };
    state = rememberSearchPageReadingPosition(state, secondPageAnchor);

    state = applySearchWindowPage(state, page(0, 50, 150), "page");
    expect(state.activeSourceIndex).toBe(25);
    expect(state.restoreScrollAnchor).toEqual(firstPageAnchor);
    expect(state.restoreScrollAnchor).not.toBe(firstPageAnchor);

    state = applySearchWindowPage(state, page(50, 50, 150), "page");
    expect(state.activeSourceIndex).toBe(65);
    expect(state.restoreScrollAnchor).toEqual(secondPageAnchor);
  });

  it("keeps the cumulative active result when re-entering a previously visited page", () => {
    const savedPageAnchor = { resultId: "page-0-row-25", offsetFromViewportTop: 18 };
    let state = createSearchResultWindow(page(0, 50, 100), "paged");
    state = { ...state, activeSourceIndex: 25 };
    state = rememberSearchPageReadingPosition(state, savedPageAnchor);
    state = switchSearchBrowseMode(state, "manual", savedPageAnchor);
    state = { ...state, activeSourceIndex: 30 };

    state = switchSearchBrowseMode(state, "paged", {
      resultId: "page-0-row-30",
      offsetFromViewportTop: 42,
    });

    expect(state.currentPageStart).toBe(0);
    expect(state.activeSourceIndex).toBe(30);
  });

  it("tracks directional, page, and gap operations independently", () => {
    let state = createSearchResultWindow(page(0, 50, 100), "manual");
    state = setSearchWindowOperation(state, { kind: "forward" }, { status: "loading" });
    state = setSearchWindowOperation(state, { kind: "gap", range: { start: 50, end: 100 } }, {
      status: "error",
      errorCode: "request_failed",
    });
    expect(state.operations.forward).toEqual({ status: "loading" });
    expect(state.operations.gaps["50:100"]).toEqual({ status: "error", errorCode: "request_failed" });
    expect(state.operations.backward).toEqual({ status: "idle" });
    expect(state.operations.page).toEqual({ status: "idle" });
  });

  it("bounds cumulative memory by evicting whole 50-row ranges far from the active result", () => {
    let state = createSearchResultWindow(page(0, 50, 650), "manual");
    state = { ...state, activeSourceIndex: 0 };
    for (let start = 50; start <= 550; start += 50) {
      state = applySearchWindowPage(state, page(start, 50, 650), "forward");
    }

    expect(state.retainedHits.length).toBeLessThanOrEqual(SEARCH_RETAINED_HIT_BUDGET);
    expect(state.retainedHits.some((candidate) => candidate.sourceIndex === 0)).toBe(true);
    expect(state.retainedHits.some((candidate) => candidate.sourceIndex === 599)).toBe(true);
    expect(state.gaps.length).toBeGreaterThan(0);
    expect(state.loadedRanges.every((range) => range.end - range.start >= 50)).toBe(true);
  });

  it("uses privacy-safe typed window errors", () => {
    const error = new SearchWindowError("invalid_window");
    expect(String(error)).toBe("SearchWindowError: Search result window is invalid");
  });
});

function page(start: number, count: number, total: number): SearchSnapshotPage {
  return {
    snapshotId: "snapshot",
    dataRevision: "revision",
    exactTotal: true,
    completeScope: true,
    totalCount: total,
    count,
    windowStart: start,
    previousCursor: start > 0 ? `previous-${start}` : "",
    nextCursor: start + count < total ? `next-${start + count}` : "",
    hasPrevious: start > 0,
    hasNext: start + count < total,
    messages: Array.from({ length: count }, (_, index) => hit(start + index)),
  };
}

function hit(sourceIndex: number): SearchHit {
  return {
    messageId: `message-${sourceIndex}`,
    seq: sourceIndex,
    sourceIndex,
    conversationId: `chat-${sourceIndex % 2}`,
    conversationName: `Chat ${sourceIndex % 2}`,
    senderId: `sender-${sourceIndex % 3}`,
    senderName: `Sender ${sourceIndex % 3}`,
    timestamp: 1_700_000_000 - sourceIndex,
    type: 1,
    subType: 0,
    category: "text",
    matchField: "content",
    snippet: "needle",
    matchSegments: [{ text: "needle", matched: true }],
  };
}

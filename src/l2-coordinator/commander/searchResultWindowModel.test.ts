import { describe, expect, it } from "vitest";
import type { SearchHit, SearchSnapshotPage } from "@/l2-coordinator/api-docs/search";
import {
  applySearchWindowPage,
  createSearchResultWindow,
  getPartialExportHits,
  getVisibleSearchHits,
  normalizeLoadedRanges,
  searchCoverageGaps,
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

  it("preserves cumulative ranges and scroll anchors across manual, infinite, and paged modes", () => {
    let state = createSearchResultWindow(page(0, 50, 180), "manual");
    state = applySearchWindowPage(state, page(50, 50, 180), "forward");
    state = { ...state, activeSourceIndex: 65 };

    state = switchSearchBrowseMode(state, "paged", "cumulative-anchor");
    expect(state.scrollAnchors.manual).toBe("cumulative-anchor");
    expect(getVisibleSearchHits(state).map((hit) => hit.sourceIndex)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 50),
    );

    state = applySearchWindowPage(state, page(100, 50, 180), "page");
    expect(state.retainedHits).toHaveLength(100);
    expect(getVisibleSearchHits(state)[0].sourceIndex).toBe(100);
    state = switchSearchBrowseMode(state, "infinite", "paged-anchor");
    expect(state.scrollAnchors.paged).toBe("paged-anchor");
    expect(state.loadedRanges).toEqual([{ start: 0, end: 100 }]);
    expect(state.activeSourceIndex).toBe(99);
    expect(state.restoreScrollAnchor).toBe("cumulative-anchor");
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

  it("exports retained ranges in cumulative modes and only the current page in paged mode", () => {
    let state = createSearchResultWindow(page(0, 50, 120), "manual");
    state = applySearchWindowPage(state, page(100, 20, 120), "gap");
    expect(getPartialExportHits(state).map((hit) => hit.sourceIndex)).toEqual([
      ...Array.from({ length: 50 }, (_, index) => index),
      ...Array.from({ length: 20 }, (_, index) => index + 100),
    ]);
    state = switchSearchBrowseMode(state, "paged", null);
    state = applySearchWindowPage(state, page(50, 50, 120), "page");
    expect(getPartialExportHits(state).map((hit) => hit.sourceIndex)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 50),
    );
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

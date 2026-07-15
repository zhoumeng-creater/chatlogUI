import { describe, expect, it } from "vitest";
import type { SearchSnapshotPage, SearchV2Request } from "@/l2-coordinator/api-docs/search";
import { createDefaultSearchDraft } from "./searchDraftModel";
import {
  createSearchResultWindow,
  rememberSearchPageReadingPosition,
  setSearchWindowOperation,
} from "./searchResultWindowModel";
import { createSearchReturnSnapshot, restoreSearchReturnSnapshot } from "./searchReturnSnapshot";

describe("searchReturnSnapshot", () => {
  it("freezes the complete in-memory workspace facts and restores a fresh copy without a request", () => {
    const draft = { ...createDefaultSearchDraft(), keyword: "PRIVATE needle" };
    const request: SearchV2Request = {
      keyword: "PRIVATE needle",
      chats: ["private-chat"],
      limit: 50,
    };
    let window = createSearchResultWindow(page(), "paged");
    window = rememberSearchPageReadingPosition(window, {
      resultId: "message-0",
      offsetFromViewportTop: 24,
    });
    const scrollAnchor = { resultId: "message-0", offsetFromViewportTop: -14.5 };
    const snapshot = createSearchReturnSnapshot({
      draft,
      applied: {
        draft,
        request,
        dateContext: {
          timeZone: "Asia/Shanghai",
          utcOffsetMinutes: 480,
          since: 1_699_999_000,
        },
        succeededAt: 1_700_000_000_000,
      },
      resultWindow: window,
      stale: true,
      activeSourceIndex: 0,
      scrollAnchor,
      sortMode: "newest",
      groupingMode: "conversation",
      capturedAt: 1_700_000_000_100,
    });

    draft.keyword = "mutated";
    request.chats![0] = "mutated-chat";
    window.retainedHits[0].snippet = "mutated content";
    scrollAnchor.offsetFromViewportTop = 999;

    expect(snapshot).toMatchObject({
      pending: null,
      draft: { keyword: "PRIVATE needle" },
      applied: { request: { chats: ["private-chat"] } },
      resultWindow: { retainedHits: [{ snippet: "needle" }] },
      stale: true,
      activeSourceIndex: 0,
      scrollAnchor: { resultId: "message-0", offsetFromViewportTop: -14.5 },
      sortMode: "newest",
      groupingMode: "conversation",
    });
    expect(Object.isFrozen(snapshot)).toBe(true);

    const first = restoreSearchReturnSnapshot(snapshot);
    const second = restoreSearchReturnSnapshot(snapshot);
    first.draft.keyword = "changed after restore";
    first.applied.dateContext!.utcOffsetMinutes = 0;
    first.resultWindow.retainedHits[0].snippet = "changed after restore";
    first.resultWindow.pageReadingPositions["0"].scrollAnchor!.offsetFromViewportTop = 654;
    first.scrollAnchor!.offsetFromViewportTop = 321;
    expect(second.draft.keyword).toBe("PRIVATE needle");
    expect(second.applied.dateContext?.utcOffsetMinutes).toBe(480);
    expect(second.resultWindow.retainedHits[0].snippet).toBe("needle");
    expect(second.resultWindow.pageReadingPositions["0"]).toEqual({
      activeSourceIndex: 0,
      scrollAnchor: { resultId: "message-0", offsetFromViewportTop: 24 },
    });
    expect(second.scrollAnchor).toEqual({ resultId: "message-0", offsetFromViewportTop: -14.5 });
  });

  it("normalizes ownerless in-flight window operations to idle on capture and restore", () => {
    const draft = { ...createDefaultSearchDraft(), keyword: "needle" };
    let window = createSearchResultWindow(page(), "manual");
    window = setSearchWindowOperation(window, { kind: "forward" }, { status: "loading" });
    window = setSearchWindowOperation(
      window,
      { kind: "gap", range: { start: 1, end: 2 } },
      { status: "loading" },
    );

    const snapshot = createSearchReturnSnapshot({
      draft,
      applied: {
        draft,
        request: { keyword: "needle", limit: 50 },
        succeededAt: 1,
      },
      resultWindow: window,
      stale: false,
      activeSourceIndex: 0,
      scrollAnchor: { resultId: "message-0", offsetFromViewportTop: 0 },
      sortMode: "baseline",
      groupingMode: "none",
      capturedAt: 2,
    });

    expect(snapshot.resultWindow.operations.forward).toEqual({ status: "idle" });
    expect(snapshot.resultWindow.operations.gaps["1:2"]).toEqual({ status: "idle" });
    expect(restoreSearchReturnSnapshot(snapshot).resultWindow.operations.forward).toEqual({
      status: "idle",
    });
  });
});

function page(): SearchSnapshotPage {
  return {
    snapshotId: "snapshot",
    dataRevision: "revision",
    exactTotal: true,
    completeScope: true,
    totalCount: 1,
    count: 1,
    windowStart: 0,
    previousCursor: "",
    nextCursor: "",
    hasPrevious: false,
    hasNext: false,
    messages: [
      {
        messageId: "message-0",
        seq: 1,
        sourceIndex: 0,
        conversationId: "private-chat",
        conversationName: "Private Chat",
        senderId: "private-sender",
        senderName: "Private Sender",
        timestamp: 1_700_000_000,
        type: 1,
        subType: 0,
        category: "text",
        matchField: "content",
        snippet: "needle",
        matchSegments: [{ text: "needle", matched: true }],
      },
    ],
  };
}

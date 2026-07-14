import { describe, expect, it } from "vitest";
import type { SearchSnapshotPage, SearchV2Request } from "@/l2-coordinator/api-docs/search";
import { createDefaultSearchDraft } from "./searchDraftModel";
import { createSearchResultWindow } from "./searchResultWindowModel";
import {
  createSearchReturnSnapshot,
  restoreSearchReturnSnapshot,
} from "./searchReturnSnapshot";

describe("searchReturnSnapshot", () => {
  it("freezes the complete in-memory workspace facts and restores a fresh copy without a request", () => {
    const draft = { ...createDefaultSearchDraft(), keyword: "PRIVATE needle" };
    const request: SearchV2Request = { keyword: "PRIVATE needle", chats: ["private-chat"], limit: 50 };
    const window = createSearchResultWindow(page(), "manual");
    const snapshot = createSearchReturnSnapshot({
      draft,
      applied: { draft, request, succeededAt: 1_700_000_000_000 },
      resultWindow: window,
      activeSourceIndex: 0,
      scrollAnchor: "message-0",
      sortMode: "newest",
      groupingMode: "conversation",
      capturedAt: 1_700_000_000_100,
    });

    draft.keyword = "mutated";
    request.chats![0] = "mutated-chat";
    window.retainedHits[0].snippet = "mutated content";

    expect(snapshot).toMatchObject({
      pending: null,
      draft: { keyword: "PRIVATE needle" },
      applied: { request: { chats: ["private-chat"] } },
      resultWindow: { retainedHits: [{ snippet: "needle" }] },
      activeSourceIndex: 0,
      scrollAnchor: "message-0",
      sortMode: "newest",
      groupingMode: "conversation",
    });
    expect(Object.isFrozen(snapshot)).toBe(true);

    const first = restoreSearchReturnSnapshot(snapshot);
    const second = restoreSearchReturnSnapshot(snapshot);
    first.draft.keyword = "changed after restore";
    first.resultWindow.retainedHits[0].snippet = "changed after restore";
    expect(second.draft.keyword).toBe("PRIVATE needle");
    expect(second.resultWindow.retainedHits[0].snippet).toBe("needle");
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
    messages: [{
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
    }],
  };
}

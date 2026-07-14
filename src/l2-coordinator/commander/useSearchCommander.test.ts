import { describe, expect, it } from "vitest";
import type { SearchSnapshotPage } from "@/l2-coordinator/api-docs/search";
import { createSearchResultWindow } from "./searchResultWindowModel";
import { compatibilityGlobalError, toCompatibilityResults } from "./useSearchCommander";

describe("search commander compatibility facade", () => {
  it("preserves canonical conversation and message identities separately from labels", () => {
    const results = toCompatibilityResults(createSearchResultWindow(page(), "manual"));

    expect(results?.messages[0]).toMatchObject({
      id: "opaque-message",
      messageId: "opaque-message",
      conversationId: "wxid-canonical",
      username: "wxid-canonical",
      chat: "Readable conversation",
      localId: 42,
    });
  });

  it("never exposes a replacement failure as a global error over a stable snapshot", () => {
    const window = createSearchResultWindow(page(), "manual");
    expect(
      compatibilityGlobalError(window, { status: "error", errorCode: "request_failed" }),
    ).toBeNull();
    expect(compatibilityGlobalError(null, { status: "error", errorCode: "request_failed" })).toBe(
      "搜索请求失败，请手动重试",
    );
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
        messageId: "opaque-message",
        seq: 42,
        sourceIndex: 0,
        conversationId: "wxid-canonical",
        conversationName: "Readable conversation",
        senderId: "sender-id",
        senderName: "Readable sender",
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

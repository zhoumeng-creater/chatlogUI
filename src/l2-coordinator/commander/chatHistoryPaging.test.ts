import { describe, expect, it } from "vitest";
import {
  buildLatestHistoryRequest,
  buildLatestTimestampWindowRequest,
  getLatestPageFollowupRequest,
  getOlderHistoryRequest,
  hasOlderHistory,
  mergeLatestTimestampWindowPage,
  pageNeedsLatestTimestampFallback,
  type HistoryOrderingContract,
} from "./chatHistoryPaging";

const page = {
  chat: "wxid_synthetic_user",
  totalCount: 120,
  count: 50,
  limit: 50,
  offset: 0,
  messages: Array.from({ length: 50 }, (_, index) => ({ id: `m${index}` })),
};

describe("chatHistoryPaging", () => {
  it("keeps normal conversation opening on the full latest page so older paging can continue", () => {
    expect(buildLatestHistoryRequest({
      chat: "wxid_synthetic_user",
      limit: 50,
      latestTimestamp: 1_783_227_901,
      windowSeconds: 3_600,
    })).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 0,
    });
  });

  it("builds a bounded timestamp-window request only as a fallback", () => {
    expect(buildLatestTimestampWindowRequest({
      chat: "wxid_synthetic_user",
      limit: 50,
      latestTimestamp: 1_783_227_901,
      windowSeconds: 3_600,
    })).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 0,
      since: 1_783_224_301,
      until: 1_783_231_501,
    });
  });

  it("detects when the latest page already contains the conversation timestamp", () => {
    expect(pageNeedsLatestTimestampFallback({
      ...page,
      messages: [{ id: "latest", timestamp: 1_783_227_900 }],
    }, 1_783_227_901, 3_600)).toBe(false);

    expect(pageNeedsLatestTimestampFallback({
      ...page,
      messages: [{ id: "old", timestamp: 1_783_000_000 }],
    }, 1_783_227_901, 3_600)).toBe(true);
  });

  it("merges timestamp-window messages without breaking the older-page offset chain", () => {
    const merged = mergeLatestTimestampWindowPage({
      primary: {
        ...page,
        messages: [
          { id: "p1", timestamp: 1_783_100_000 },
          { id: "p2", timestamp: 1_783_100_100 },
        ],
        count: 2,
      },
      supplemental: {
        ...page,
        offset: 0,
        totalCount: 2,
        count: 2,
        messages: [
          { id: "p2", timestamp: 1_783_100_100 },
          { id: "latest", timestamp: 1_783_227_901 },
        ],
      },
    });

    expect(merged.offset).toBe(0);
    expect(merged.limit).toBe(50);
    expect(merged.messages.map((message) => (message as { id: string }).id)).toEqual(["p1", "p2", "latest"]);
  });

  it("keeps offset zero as the latest page for the documented sidecar contract", () => {
    expect(getLatestPageFollowupRequest(page, "offset-zero-latest")).toBeNull();
    expect(getOlderHistoryRequest({
      chat: "wxid_synthetic_user",
      contract: "offset-zero-latest",
      currentOffset: 0,
      loadedCount: 50,
      limit: 50,
    })).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 50,
    });
  });

  it("can request older messages by timestamp cursor so anchored views remain paginatable", () => {
    expect(getOlderHistoryRequest({
      chat: "wxid_synthetic_user",
      contract: "offset-zero-latest",
      currentOffset: 0,
      loadedCount: 9,
      limit: 50,
      oldestLoadedTimestamp: 1_783_227_900,
    })).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 0,
      until: 1_783_227_899,
    });
  });

  it("advances offset-zero-latest older pages by page size instead of total loaded messages", () => {
    expect(getOlderHistoryRequest({
      chat: "wxid_synthetic_user",
      contract: "offset-zero-latest",
      currentOffset: 50,
      loadedCount: 100,
      limit: 50,
    })).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 100,
    });
  });

  it("can calculate a latest-page followup if the backend contract is oldest-first", () => {
    expect(getLatestPageFollowupRequest(page, "offset-zero-oldest")).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 70,
    });
    expect(getOlderHistoryRequest({
      chat: "wxid_synthetic_user",
      contract: "offset-zero-oldest",
      currentOffset: 70,
      loadedCount: 50,
      limit: 50,
    })).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 20,
    });
  });

  it("does not request negative or duplicate older pages", () => {
    expect(getLatestPageFollowupRequest({
      ...page,
      totalCount: 20,
      count: 20,
      limit: 50,
    }, "offset-zero-oldest")).toBeNull();
    expect(getOlderHistoryRequest({
      chat: "wxid_synthetic_user",
      contract: "offset-zero-oldest",
      currentOffset: 0,
      loadedCount: 20,
      limit: 50,
    })).toBeNull();
  });

  it("uses loaded count and page size to determine whether older pages exist", () => {
    expect(hasOlderHistory({ ...page, messages: [], count: 0 }, "offset-zero-latest")).toBe(false);
    expect(hasOlderHistory(page, "offset-zero-latest")).toBe(true);
    expect(hasOlderHistory({ ...page, offset: 70 }, "offset-zero-oldest")).toBe(true);
    expect(hasOlderHistory({ ...page, offset: 0 }, "offset-zero-oldest")).toBe(false);
  });

  it("keeps the contract type explicit", () => {
    const contract: HistoryOrderingContract = "offset-zero-latest";
    expect(contract).toBe("offset-zero-latest");
  });
});

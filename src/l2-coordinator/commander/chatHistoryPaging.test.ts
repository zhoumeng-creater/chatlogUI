import { describe, expect, it } from "vitest";
import {
  getLatestPageFollowupRequest,
  getOlderHistoryRequest,
  hasOlderHistory,
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

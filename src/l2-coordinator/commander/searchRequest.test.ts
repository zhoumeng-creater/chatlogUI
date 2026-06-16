import { describe, expect, it } from "vitest";
import type { SearchResults } from "./searchRequest";
import {
  canMergeSearchPage,
  createSearchRequestSnapshot,
  createSearchRequest,
  createSearchRequestContextKey,
  getNextSearchOffset,
  getSearchInputStatus,
  isSearchSnapshotCurrent,
  mergeSearchResults,
  toSearchMessageType,
} from "./searchRequest";
import { createDefaultSearchAdvancedFilters } from "./searchAdvancedFilters";

function createMessage(seq: number): SearchResults["messages"][number] {
  return {
    id: String(seq),
    timestamp: seq * 1000,
    content: "",
    sender: "",
    username: "",
    chat: "",
  };
}

describe("search request helpers", () => {
  it("omits message type when the all filter is active", () => {
    expect(toSearchMessageType("all")).toBeUndefined();
    expect(createSearchRequest({ keyword: " hello ", filter: "all", limit: 20, offset: 0 })).toEqual({
      keyword: "hello",
      limit: 20,
      offset: 0,
    });
  });

  it("maps image filter to msg_type 3", () => {
    expect(createSearchRequest({ keyword: "图片", filter: "image", limit: 20, offset: 40 })).toEqual({
      keyword: "图片",
      limit: 20,
      offset: 40,
      msgType: "3",
    });
  });

  it("maps text filter to msg_type 1", () => {
    expect(toSearchMessageType("text")).toBe("1");
  });

  it("maps video filter to msg_type 43", () => {
    expect(toSearchMessageType("video")).toBe("43");
  });

  it("maps file filter to msg_type 49", () => {
    expect(toSearchMessageType("file")).toBe("49");
  });

  it("uses loaded message count as the next offset for appended search results", () => {
    const existing: SearchResults = {
      totalCount: 100,
      count: 40,
      limit: 20,
      offset: 20,
      messages: Array.from({ length: 40 }, (_, index) => createMessage(index)),
    };

    expect(getNextSearchOffset(existing)).toBe(40);
  });

  it("keeps merged search results offset at the start of the accumulated list", () => {
    const existing: SearchResults = {
      totalCount: 100,
      count: 20,
      limit: 20,
      offset: 0,
      messages: [createMessage(1)],
    };
    const next: SearchResults = {
      totalCount: 100,
      count: 1,
      limit: 20,
      offset: 20,
      messages: [createMessage(2)],
    };

    expect(mergeSearchResults(existing, next)).toMatchObject({
      totalCount: 100,
      count: 2,
      offset: 0,
      messages: [createMessage(1), createMessage(2)],
    });
  });

  it("passes current conversation scope as backend chats", () => {
    expect(createSearchRequest({
      keyword: "合同",
      filter: "text",
      limit: 20,
      offset: 0,
      scopeChat: "wxid_synthetic_a",
    })).toEqual({
      keyword: "合同",
      limit: 20,
      offset: 0,
      msgType: "1",
      chats: ["wxid_synthetic_a"],
    });
  });

  it("maps supported advanced filters to backend request params without sending unsupported filters", () => {
    const advancedFilters = {
      ...createDefaultSearchAdvancedFilters(),
      dateRange: { start: "2026-01-02", end: "2026-01-03" },
      selectedChats: [{ id: "room_synthetic_001@chatroom", label: "Synthetic Group" }],
      sender: "unsupported sender",
      favoriteOnly: true,
      attachmentOnly: true,
    };

    expect(createSearchRequest({
      keyword: "合同",
      filter: "all",
      limit: 20,
      offset: 0,
      scopeChat: "wxid_synthetic_a",
      advancedFilters,
    })).toEqual({
      keyword: "合同",
      limit: 20,
      offset: 0,
      chats: ["wxid_synthetic_a", "room_synthetic_001@chatroom"],
      since: 1767312000,
      until: 1767484799,
    });
  });

  it("classifies blank search input as invalid", () => {
    expect(getSearchInputStatus("  ")).toBe("invalid");
    expect(getSearchInputStatus("合同")).toBe("ready");
  });

  it("normalizes request snapshots for later stale-response checks", () => {
    expect(createSearchRequestSnapshot({
      requestId: "search-1",
      kind: "search",
      query: " 合同 ",
      filter: "text",
      scope: "current",
      scopeChat: "wxid_synthetic_a",
      advancedFilters: {
        ...createDefaultSearchAdvancedFilters(),
        dateRange: { start: "2026-01-02" },
      },
      offset: 0,
      limit: 20,
    })).toEqual({
      requestId: "search-1",
      kind: "search",
      query: "合同",
      filter: "text",
      scope: "current",
      scopeChat: "wxid_synthetic_a",
      advancedFilterKey: createSearchRequestContextKey({
        ...createDefaultSearchAdvancedFilters(),
        dateRange: { start: "2026-01-02" },
      }),
      offset: 0,
      limit: 20,
    });
  });

  it("rejects stale search snapshots when query, filter, scope, chat, or request id changed", () => {
    const snapshot = createSearchRequestSnapshot({
      requestId: "search-1",
      kind: "search",
      query: "合同",
      filter: "text",
      scope: "current",
      scopeChat: "wxid_synthetic_a",
      advancedFilters: createDefaultSearchAdvancedFilters(),
      offset: 0,
      limit: 20,
    });
    const current = {
      query: "合同",
      activeFilter: "text" as const,
      scope: "current" as const,
      scopeChat: "wxid_synthetic_a",
      advancedFilters: createDefaultSearchAdvancedFilters(),
    };

    expect(isSearchSnapshotCurrent(snapshot, current, "search-1")).toBe(true);
    expect(isSearchSnapshotCurrent(snapshot, { ...current, query: "发票" }, "search-1")).toBe(false);
    expect(isSearchSnapshotCurrent(snapshot, { ...current, activeFilter: "image" }, "search-1")).toBe(false);
    expect(isSearchSnapshotCurrent(snapshot, { ...current, scope: "all", scopeChat: null }, "search-1")).toBe(false);
    expect(isSearchSnapshotCurrent(snapshot, { ...current, scopeChat: "wxid_synthetic_b" }, "search-1")).toBe(false);
    expect(isSearchSnapshotCurrent(snapshot, {
      ...current,
      advancedFilters: {
        ...createDefaultSearchAdvancedFilters(),
        dateRange: { start: "2026-01-02" },
      },
    }, "search-1")).toBe(false);
    expect(isSearchSnapshotCurrent(snapshot, current, "search-2")).toBe(false);
  });

  it("allows load-more pages to merge only when offsets and request context still match", () => {
    const existing: SearchResults = {
      totalCount: 60,
      count: 20,
      limit: 20,
      offset: 0,
      messages: Array.from({ length: 20 }, (_, index) => createMessage(index)),
    };
    const next: SearchResults = {
      totalCount: 60,
      count: 20,
      limit: 20,
      offset: 20,
      messages: Array.from({ length: 20 }, (_, index) => createMessage(index + 20)),
    };
    const snapshot = createSearchRequestSnapshot({
      requestId: "load-more-1",
      kind: "loadMore",
      query: "合同",
      filter: "all",
      scope: "all",
      scopeChat: null,
      advancedFilters: createDefaultSearchAdvancedFilters(),
      offset: 20,
      limit: 20,
    });
    const current = {
      query: "合同",
      activeFilter: "all" as const,
      scope: "all" as const,
      scopeChat: null,
      advancedFilters: createDefaultSearchAdvancedFilters(),
      results: existing,
    };

    expect(canMergeSearchPage(snapshot, current, next, "load-more-1")).toBe(true);
    expect(canMergeSearchPage({ ...snapshot, offset: 40 }, current, next, "load-more-1")).toBe(false);
    expect(canMergeSearchPage(snapshot, current, { ...next, offset: 40 }, "load-more-1")).toBe(false);
    expect(canMergeSearchPage(snapshot, { ...current, query: "发票" }, next, "load-more-1")).toBe(false);
    expect(canMergeSearchPage(snapshot, current, next, "load-more-2")).toBe(false);
  });
});

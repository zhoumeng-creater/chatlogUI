import { describe, expect, it } from "vitest";
import type { SearchResults } from "./searchRequest";
import { createSearchRequest, getNextSearchOffset, mergeSearchResults, toSearchMessageType } from "./searchRequest";

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
      scopeChat: "wxid_a",
    })).toEqual({
      keyword: "合同",
      limit: 20,
      offset: 0,
      msgType: "1",
      chats: ["wxid_a"],
    });
  });
});

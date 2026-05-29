import { describe, expect, it } from "vitest";
import type { HistoryMessage } from "@/l2-coordinator/api-docs/history";
import type { SearchResult } from "@/l2-coordinator/api-docs/search";
import { createSearchRequest, getNextSearchOffset, mergeSearchResults, toSearchMessageType } from "./searchRequest";

function createMessage(seq: number): HistoryMessage {
  return {
    seq,
    id: String(seq),
    time: "",
    talker: "",
    sender: "",
    isSelf: false,
    type: 1,
    subType: 0,
    content: "",
    mediaMsg: "",
    chat: "",
    username: "",
    isGroup: false,
    chatType: "",
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

  it("passes the active media filter as the sidecar search type", () => {
    expect(createSearchRequest({ keyword: "图片", filter: "image", limit: 20, offset: 40 })).toEqual({
      keyword: "图片",
      limit: 20,
      offset: 40,
      type: "image",
    });
  });

  it("uses loaded message count as the next offset for appended search results", () => {
    const existing: SearchResult = {
      totalCount: 100,
      count: 40,
      limit: 20,
      offset: 20,
      messages: Array.from({ length: 40 }, (_, index) => createMessage(index)),
    };

    expect(getNextSearchOffset(existing)).toBe(40);
  });

  it("keeps merged search results offset at the start of the accumulated list", () => {
    const existing: SearchResult = {
      totalCount: 100,
      count: 20,
      limit: 20,
      offset: 0,
      messages: [createMessage(1)],
    };
    const next: SearchResult = {
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
});

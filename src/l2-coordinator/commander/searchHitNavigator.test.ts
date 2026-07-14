import { describe, expect, it } from "vitest";
import { moveSearchHit, resolveSearchHitNavigator } from "./searchHitNavigator";

const messages = [
  { id: "one" },
  { id: "two" },
  { id: "three" },
];

describe("searchHitNavigator", () => {
  it("resolves previous and next hit states from the active result", () => {
    expect(resolveSearchHitNavigator({ messages, activeResultId: "two" })).toEqual({
      activeIndex: 1,
      total: 3,
      label: "第 2 / 3 条",
      previousId: "one",
      nextId: "three",
      hasPrevious: true,
      hasNext: true,
    });
  });

  it("moves through hits and clamps at boundaries", () => {
    expect(moveSearchHit({ messages, activeResultId: null, direction: "next" })).toBe("two");
    expect(moveSearchHit({ messages, activeResultId: null, direction: "previous" })).toBe("one");
    expect(moveSearchHit({ messages, activeResultId: "two", direction: "next" })).toBe("three");
    expect(moveSearchHit({ messages, activeResultId: "one", direction: "previous" })).toBe("one");
  });

  it("uses stable v2 message identities without treating coverage rows as hits", () => {
    const v2Hits = [{ messageId: "message-10" }, { messageId: "message-11" }];
    expect(resolveSearchHitNavigator({ messages: v2Hits, activeResultId: "message-11" })).toMatchObject({
      activeIndex: 1,
      total: 2,
      previousId: "message-10",
      nextId: null,
    });
    expect(moveSearchHit({ messages: v2Hits, activeResultId: "message-10", direction: "next" }))
      .toBe("message-11");
  });
});

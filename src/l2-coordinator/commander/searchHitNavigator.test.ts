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
});

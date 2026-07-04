import { describe, expect, it } from "vitest";
import { positionCoachMark } from "./useCoachMarkCommander";

describe("positionCoachMark", () => {
  it("keeps titlebar coach marks away from the first setup action area", () => {
    const position = positionCoachMark(rect({ left: 112, right: 148, top: 6, bottom: 42 }), "bottom", 390, 844);

    if (!position) throw new Error("Expected coach mark position");
    expect(position.top).toBeUndefined();
    expect(position.bottom).toBeGreaterThanOrEqual(48);
    expect(position.left).toBeGreaterThanOrEqual(16);
  });
});

function rect(input: { left: number; right: number; top: number; bottom: number }): DOMRectReadOnly {
  return {
    ...input,
    x: input.left,
    y: input.top,
    width: input.right - input.left,
    height: input.bottom - input.top,
    toJSON: () => input,
  };
}

import { describe, expect, it } from "vitest";
import { resolveFloatingMenuPlacement, resolveFloatingMenuPosition } from "./floatingPlacement";

describe("floatingPlacement", () => {
  it("flips message menus away from the left edge", () => {
    expect(resolveFloatingMenuPlacement({
      preferred: "top-end",
      triggerRect: { top: 500, bottom: 532, left: 12, right: 44 },
      overlaySize: { width: 190, height: 260 },
      viewportWidth: 1080,
      viewportHeight: 900,
    })).toBe("top-start");
  });

  it("places menus below when there is not enough space above", () => {
    expect(resolveFloatingMenuPlacement({
      preferred: "top-end",
      triggerRect: { top: 24, bottom: 56, left: 820, right: 852 },
      overlaySize: { width: 190, height: 260 },
      viewportWidth: 1080,
      viewportHeight: 900,
    })).toBe("bottom-end");
  });

  it("returns fixed overlay coordinates clamped inside the viewport", () => {
    expect(resolveFloatingMenuPosition({
      preferred: "bottom-end",
      triggerRect: { top: 12, bottom: 44, left: 1240, right: 1272 },
      overlaySize: { width: 188, height: 120 },
      viewportWidth: 1280,
      viewportHeight: 720,
    })).toEqual({
      placement: "bottom-end",
      left: 1084,
      top: 48,
    });
  });
});

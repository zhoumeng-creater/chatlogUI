import { describe, expect, it } from "vitest";
import {
  SEARCH_SCROLL_ANCHOR_TOLERANCE_PX,
  calculateSearchScrollCorrection,
  cloneSearchScrollAnchor,
  createSearchScrollAnchor,
  isSearchScrollAnchorAligned,
  resolveSearchAnchorAfterLoad,
} from "./searchScrollAnchor";

describe("searchScrollAnchor", () => {
  it("captures a stable result identity and its signed offset from the viewport top", () => {
    expect(createSearchScrollAnchor({
      resultId: " search-hit-42 ",
      resultTop: 318.25,
      viewportTop: 104.5,
    })).toEqual({
      resultId: "search-hit-42",
      offsetFromViewportTop: 213.75,
    });

    expect(createSearchScrollAnchor({
      resultId: "",
      resultTop: 100,
      viewportTop: 0,
    })).toBeNull();
    expect(createSearchScrollAnchor({
      resultId: "search-hit-42",
      resultTop: Number.NaN,
      viewportTop: 0,
    })).toBeNull();
  });

  it("uses the smallest scrollTop correction and treats two pixels as already aligned", () => {
    expect(SEARCH_SCROLL_ANCHOR_TOLERANCE_PX).toBe(2);
    expect(calculateSearchScrollCorrection({
      currentScrollTop: 200,
      currentOffsetFromViewportTop: 76,
      targetOffsetFromViewportTop: 40,
    })).toEqual({
      offsetError: 36,
      scrollDelta: 36,
      nextScrollTop: 236,
      aligned: false,
    });

    expect(calculateSearchScrollCorrection({
      currentScrollTop: 200,
      currentOffsetFromViewportTop: 41.5,
      targetOffsetFromViewportTop: 40,
    })).toEqual({
      offsetError: 1.5,
      scrollDelta: 0,
      nextScrollTop: 200,
      aligned: true,
    });
  });

  it("clamps at the scroll origin and never mutates a caller-owned anchor", () => {
    expect(calculateSearchScrollCorrection({
      currentScrollTop: 5,
      currentOffsetFromViewportTop: -30,
      targetOffsetFromViewportTop: 0,
    })).toMatchObject({
      offsetError: -30,
      scrollDelta: -5,
      nextScrollTop: 0,
      aligned: false,
    });

    const source = { resultId: "search-hit-7", offsetFromViewportTop: -12.5 };
    const cloned = cloneSearchScrollAnchor(source);
    expect(cloned).toEqual(source);
    expect(cloned).not.toBe(source);
    source.offsetFromViewportTop = 999;
    expect(cloned?.offsetFromViewportTop).toBe(-12.5);
  });

  it("checks alignment with the same inclusive two-pixel tolerance", () => {
    expect(isSearchScrollAnchorAligned(12, 10)).toBe(true);
    expect(isSearchScrollAnchorAligned(8, 10)).toBe(true);
    expect(isSearchScrollAnchorAligned(12.01, 10)).toBe(false);
  });

  it("corrects prepend/gap insertions by newTop minus oldTop and leaves aligned gaps untouched", () => {
    expect(calculateSearchScrollCorrection({
      currentScrollTop: 500,
      currentOffsetFromViewportTop: 178,
      targetOffsetFromViewportTop: 22,
    })).toMatchObject({
      offsetError: 156,
      scrollDelta: 156,
      nextScrollTop: 656,
    });
    expect(calculateSearchScrollCorrection({
      currentScrollTop: 500,
      currentOffsetFromViewportTop: 22,
      targetOffsetFromViewportTop: 22,
    })).toMatchObject({
      scrollDelta: 0,
      nextScrollTop: 500,
      aligned: true,
    });
  });

  it("drops failed or cancelled load anchors so no scroll correction can run", () => {
    const anchor = { resultId: "first-visible", offsetFromViewportTop: -6 };
    expect(resolveSearchAnchorAfterLoad(anchor, false)).toBeNull();
    expect(resolveSearchAnchorAfterLoad(anchor, true)).toEqual(anchor);
    expect(resolveSearchAnchorAfterLoad(anchor, true)).not.toBe(anchor);
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  focusInitialOverlayTarget,
  getFocusableOverlayElements,
  getOverlayDialogProps,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
} from "./overlayFocus";

describe("overlayFocus", () => {
  it("creates modal dialog props with either a title id or accessible label", () => {
    expect(getOverlayDialogProps({ titleId: "preview-title" })).toEqual({
      role: "dialog",
      "aria-modal": true,
      "aria-labelledby": "preview-title",
      tabIndex: -1,
    });

    expect(getOverlayDialogProps({ label: "媒体预览" })).toEqual({
      role: "dialog",
      "aria-modal": true,
      "aria-label": "媒体预览",
      tabIndex: -1,
    });
  });

  it("closes on Escape only when the overlay is dismissible", () => {
    expect(shouldCloseOverlayOnKey("Escape", { dismissible: true })).toBe(true);
    expect(shouldCloseOverlayOnKey("Escape", { dismissible: false })).toBe(false);
    expect(shouldCloseOverlayOnKey("Enter", { dismissible: true })).toBe(false);
  });

  it("returns focusable overlay elements from the standard selector", () => {
    const first = focusableElement();
    const second = focusableElement();
    const container = fakeContainer([first, second]);

    expect(getFocusableOverlayElements(container)).toEqual([first, second]);
  });

  it("focuses the first safe action or the container when no controls exist", () => {
    const first = focusableElement();
    const container = fakeContainer([first]);

    expect(focusInitialOverlayTarget(container)).toBe(true);
    expect(first.focus).toHaveBeenCalledOnce();

    const emptyContainer = fakeContainer([]);
    expect(focusInitialOverlayTarget(emptyContainer)).toBe(true);
    expect(emptyContainer.focus).toHaveBeenCalledOnce();
  });

  it("traps Tab and Shift+Tab inside the overlay", () => {
    const first = focusableElement();
    const last = focusableElement();
    const container = fakeContainer([first, last]);
    const tabFromLast = keyboardEvent("Tab", false);
    const shiftTabFromFirst = keyboardEvent("Tab", true);

    expect(trapOverlayFocus(container, last, tabFromLast)).toBe(true);
    expect(tabFromLast.preventDefault).toHaveBeenCalledOnce();
    expect(first.focus).toHaveBeenCalledOnce();

    expect(trapOverlayFocus(container, first, shiftTabFromFirst)).toBe(true);
    expect(shiftTabFromFirst.preventDefault).toHaveBeenCalledOnce();
    expect(last.focus).toHaveBeenCalledOnce();
  });

  it("restores focus only to connected focus targets", () => {
    const focus = vi.fn();

    expect(restoreFocusTarget({ isConnected: true, focus })).toBe(true);
    expect(focus).toHaveBeenCalledOnce();
    expect(restoreFocusTarget({ isConnected: false, focus })).toBe(false);
    expect(restoreFocusTarget(null)).toBe(false);
  });
});

function focusableElement() {
  return {
    focus: vi.fn(),
  } as unknown as HTMLElement;
}

function fakeContainer(focusable: HTMLElement[]) {
  return {
    focus: vi.fn(),
    querySelectorAll: vi.fn(() => focusable),
    contains: vi.fn((target: Element | null) => focusable.includes(target as HTMLElement)),
  } as unknown as HTMLElement;
}

function keyboardEvent(key: string, shiftKey: boolean) {
  return {
    key,
    shiftKey,
    preventDefault: vi.fn(),
  };
}

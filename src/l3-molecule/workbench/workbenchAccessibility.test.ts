import { describe, expect, it, vi } from "vitest";
import {
  getWorkbenchDrawerDialogProps,
  getWorkbenchRailButtonLabel,
  isRestorableFocusTarget,
  restoreFocusTarget,
  shouldCloseWorkbenchDrawerOnKey,
} from "./workbenchAccessibility";

describe("workbenchAccessibility", () => {
  it("marks overlay drawers as modal dialogs with a stable title id", () => {
    expect(getWorkbenchDrawerDialogProps("workbench-drawer-title")).toEqual({
      role: "dialog",
      "aria-modal": true,
      "aria-labelledby": "workbench-drawer-title",
      tabIndex: -1,
    });
  });

  it("closes drawer on Escape only", () => {
    expect(shouldCloseWorkbenchDrawerOnKey("Escape")).toBe(true);
    expect(shouldCloseWorkbenchDrawerOnKey("Enter")).toBe(false);
  });

  it("restores focus only to connected focusable targets", () => {
    const focus = vi.fn();
    const target = { isConnected: true, focus };

    expect(isRestorableFocusTarget(target)).toBe(true);
    expect(restoreFocusTarget(target)).toBe(true);
    expect(focus).toHaveBeenCalledOnce();

    expect(isRestorableFocusTarget({ isConnected: false, focus })).toBe(false);
    expect(restoreFocusTarget({ isConnected: false, focus })).toBe(false);
  });

  it("uses action-oriented labels for repeated rail buttons", () => {
    expect(getWorkbenchRailButtonLabel("AI")).toBe("打开AI模块");
    expect(getWorkbenchRailButtonLabel("图谱")).toBe("打开图谱模块");
  });
});

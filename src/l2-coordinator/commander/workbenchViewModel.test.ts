import { describe, expect, it } from "vitest";
import {
  buildWorkbenchRailItems,
  getInspectorTitle,
  resolveSinglePaneView,
  shouldRenderConversationListAsMain,
  type WorkbenchModule,
} from "./workbenchViewModel";
import type { WorkbenchLayout } from "@l3/workbench/workbenchLayout";

function layout(mode: WorkbenchLayout["mode"]): WorkbenchLayout {
  return {
    mode,
    sidebarLabels: mode === "wide",
    showConversationList: mode !== "single",
    inspectorMode: mode === "compact" ? "drawer" : "inline",
    gridTemplateColumns: "minmax(0, 1fr)",
  };
}

describe("workbenchViewModel", () => {
  it("starts single-pane workbench on the conversation list when no conversation is selected", () => {
    expect(resolveSinglePaneView("single", null, "detail")).toBe("list");
  });

  it("keeps a selected conversation in detail until the user returns to the list", () => {
    expect(resolveSinglePaneView("single", "wxid_a", "detail")).toBe("detail");
    expect(resolveSinglePaneView("single", "wxid_a", "list")).toBe("list");
  });

  it("does not replace the main content with the list outside single-pane mode", () => {
    expect(shouldRenderConversationListAsMain(layout("wide"), null, "list")).toBe(false);
    expect(shouldRenderConversationListAsMain(layout("single"), null, "list")).toBe(true);
  });

  it("marks exactly one rail item active and includes graph and settings entries", () => {
    const modules: WorkbenchModule[] = ["chat", "stats", "ai", "graph", "settings"];

    for (const module of modules) {
      const items = buildWorkbenchRailItems(module);
      expect(items.filter((item) => item.active).map((item) => item.module)).toEqual([module]);
    }

    expect(buildWorkbenchRailItems("graph").map((item) => item.module)).toEqual(modules);
  });

  it("uses graph as a real inspector module instead of a floating overlay label", () => {
    expect(getInspectorTitle("stats")).toBe("统计数据");
    expect(getInspectorTitle("ai")).toBe("AI 分析");
    expect(getInspectorTitle("graph")).toBe("知识图谱");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildWorkbenchRailItems,
  buildWorkbenchModuleBadges,
  deriveWorkbenchShellView,
  formatWorkbenchConversationTitle,
  getInspectorTitle,
  resolveSinglePaneView,
  shouldRenderConversationListAsMain,
  type WorkbenchModule,
} from "./workbenchViewModel";
import type { WorkbenchLayout } from "./workbenchLayout";
import type { SetupProfileSummary } from "@l2/data-clerk/types/setup";

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

  it("marks exactly one rail item active and includes library, graph, and settings entries", () => {
    const modules: WorkbenchModule[] = ["chat", "library", "stats", "ai", "graph", "settings"];

    for (const module of modules) {
      const items = buildWorkbenchRailItems(module);
      expect(items.filter((item) => item.active).map((item) => item.module)).toEqual([module]);
    }

    expect(buildWorkbenchRailItems("graph").map((item) => item.module)).toEqual(modules);
  });

  it("adds compact semantic and graph module badges without changing rail order", () => {
    const badges = buildWorkbenchModuleBadges({
      semanticStatus: { label: "AI ready", tone: "ai", busy: false },
      graphView: {
        kind: "oversized",
        blocksCoreWorkbench: false,
        canVisualize: false,
        shouldMountCanvas: false,
        message: "",
        tableRows: [],
      },
    });

    const items = buildWorkbenchRailItems("ai", badges);

    expect(items.map((item) => item.module)).toEqual(["chat", "library", "stats", "ai", "graph", "settings"]);
    expect(items.find((item) => item.module === "ai")?.badge).toBe("就绪");
    expect(items.find((item) => item.module === "graph")?.badge).toBe("过大");
  });

  it("uses graph as a real inspector module instead of a floating overlay label", () => {
    expect(getInspectorTitle("stats")).toBe("统计数据");
    expect(getInspectorTitle("ai")).toBe("AI 分析");
    expect(getInspectorTitle("graph")).toBe("知识图谱");
  });

  it("moves the workbench gate copy and status decision into the L2 view model", () => {
    expect(
      deriveWorkbenchShellView({
        profile: null,
        httpReady: false,
        dbReady: false,
        devSmokeReady: false,
      }),
    ).toMatchObject({
      renderWorkbench: false,
      statusText: "服务未启动",
      statusTone: "neutral",
      title: "尚未配置",
      message: "请先完成设置中心的基本配置后再进入工作台。",
    });

    expect(
      deriveWorkbenchShellView({
        profile: profileSummary(),
        httpReady: true,
        dbReady: false,
        devSmokeReady: false,
      }),
    ).toMatchObject({
      renderWorkbench: false,
      statusText: "服务运行中，数据库未就绪",
      statusTone: "warning",
      title: "服务尚未完全就绪",
      message: "服务已启动但数据库尚未就绪，请稍候。",
    });
  });

  it("provides a development-only smoke override so browser UI checks can enter the workbench without mutating stores in L1", () => {
    expect(
      deriveWorkbenchShellView({
        profile: null,
        httpReady: false,
        dbReady: false,
        devSmokeReady: true,
      }),
    ).toMatchObject({
      renderWorkbench: true,
      effectiveDbReady: true,
    });
  });

  it("formats the toolbar conversation title with privacy masking", () => {
    expect(formatWorkbenchConversationTitle({ displayName: "Alice" }, false)).toBe("Alice");
    expect(formatWorkbenchConversationTitle({ displayName: "Alice" }, true)).toBe("已隐藏会话");
    expect(formatWorkbenchConversationTitle(null, true)).toBe("选择会话");
    expect(formatWorkbenchConversationTitle({ displayName: "" }, false)).toBe("未命名会话");
  });
});

function profileSummary(): SetupProfileSummary {
  return {
    mode: "managed",
    source: "manual-advanced",
    configDir: null,
    dataDir: "D:/chat",
    workDir: null,
    httpAddr: "127.0.0.1:5030",
    port: 5030,
    platform: "windows",
    version: 1,
    fullVersion: "1.0.0",
    hasDataKey: false,
    hasImgKey: false,
    lastValidatedAt: null,
  };
}

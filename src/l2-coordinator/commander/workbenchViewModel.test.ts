import { describe, expect, it } from "vitest";
import {
  buildWorkbenchRailItems,
  buildWorkbenchModuleBadges,
  deriveWorkbenchShellView,
  formatWorkbenchConversationTitle,
  getInspectorTitle,
  isInspectorModule,
  resolveSinglePaneView,
  resolveWorkbenchLayoutForModule,
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
    expect(resolveSinglePaneView("single", "wxid_synthetic_a", "detail")).toBe("detail");
    expect(resolveSinglePaneView("single", "wxid_synthetic_a", "list")).toBe("list");
  });

  it("does not replace the main content with the list outside single-pane mode", () => {
    expect(shouldRenderConversationListAsMain(layout("wide"), null, "list")).toBe(false);
    expect(shouldRenderConversationListAsMain(layout("single"), null, "list")).toBe(true);
  });

  it("focuses graph in the primary workspace without list or inline inspector columns", () => {
    expect(resolveWorkbenchLayoutForModule(layout("wide"), "stats")).toEqual(layout("wide"));

    expect(resolveWorkbenchLayoutForModule(layout("wide"), "graph")).toMatchObject({
      showConversationList: false,
      inspectorMode: "hidden",
      gridTemplateColumns: "var(--sidebar-expanded) minmax(0, 1fr)",
    });

    expect(resolveWorkbenchLayoutForModule(layout("single"), "graph")).toMatchObject({
      showConversationList: false,
      inspectorMode: "hidden",
      gridTemplateColumns: "minmax(0, 1fr)",
    });
  });

  it("marks exactly one rail item active and hides Developer by default", () => {
    const modules: WorkbenchModule[] = ["chat", "stats", "media", "sns", "ai", "graph"];

    for (const module of modules) {
      const items = buildWorkbenchRailItems(module);
      expect(items.filter((item) => item.active).map((item) => item.module)).toEqual([module]);
    }

    expect(buildWorkbenchRailItems("developer").map((item) => item.module)).toEqual(modules);
    expect(buildWorkbenchRailItems("developer").some((item) => item.module === "developer")).toBe(false);
  });

  it("includes Developer rail entry only when explicitly allowed", () => {
    const items = buildWorkbenchRailItems("developer", {}, { includeDeveloperTools: true });

    expect(items.map((item) => item.module)).toEqual([
      "chat",
      "stats",
      "media",
      "sns",
      "developer",
      "ai",
      "graph",
    ]);
    expect(items.find((item) => item.module === "developer")?.active).toBe(true);
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
        tabs: [],
        tableRows: [],
        groupedSections: [],
        timelineWorkbench: { rows: [] },
        detailInspector: null,
      },
      sns: {
        status: "ready",
        feedCount: 2,
        notificationCount: 1,
      },
      developer: {
        status: "ready",
        dbFileCount: 3,
        runnerHistoryCount: 1,
      },
    });

    const items = buildWorkbenchRailItems("ai", badges, { includeDeveloperTools: false });

    expect(items.map((item) => item.module)).toEqual(["chat", "stats", "media", "sns", "ai", "graph"]);
    expect(items.find((item) => item.module === "sns")?.badge).toBe("1通知");
    expect(items.find((item) => item.module === "developer")).toBeUndefined();
    expect(items.find((item) => item.module === "ai")?.badge).toBe("就绪");
    expect(items.find((item) => item.module === "graph")?.badge).toBe("过大");
  });

  it("keeps Developer badges only when the Developer module is visible", () => {
    const badges = buildWorkbenchModuleBadges({
      semanticStatus: null,
      graphView: {
        kind: "idle",
        blocksCoreWorkbench: false,
        canVisualize: false,
        shouldMountCanvas: false,
        message: "",
        tabs: [],
        tableRows: [],
        groupedSections: [],
        timelineWorkbench: { rows: [] },
        detailInspector: null,
      },
      developer: {
        status: "ready",
        dbFileCount: 3,
        runnerHistoryCount: 1,
      },
    });

    expect(buildWorkbenchRailItems("chat", badges, { includeDeveloperTools: false })).not.toContainEqual(
      expect.objectContaining({ module: "developer" }),
    );
    expect(buildWorkbenchRailItems("chat", badges, { includeDeveloperTools: true })).toContainEqual(
      expect.objectContaining({ module: "developer", badge: "3库" }),
    );
  });

  it("keeps graph as a primary workspace module instead of an inspector module", () => {
    expect(getInspectorTitle("stats")).toBe("统计数据");
    expect(getInspectorTitle("media")).toBe("媒体与扩展");
    expect(getInspectorTitle("sns")).toBe("朋友圈");
    expect(getInspectorTitle("developer")).toBe("开发者工具");
    expect(getInspectorTitle("ai")).toBe("AI 分析");

    expect(isInspectorModule("stats")).toBe(true);
    expect(isInspectorModule("media")).toBe(true);
    expect(isInspectorModule("sns")).toBe(true);
    expect(isInspectorModule("developer")).toBe(true);
    expect(isInspectorModule("ai")).toBe(true);
    expect(isInspectorModule("graph")).toBe(false);
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
        profile: profileSummary({ mode: "managed", source: "manual-advanced" }),
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

    expect(
      deriveWorkbenchShellView({
        profile: profileSummary({ mode: "external", source: "external-service" }),
        httpReady: false,
        dbReady: false,
        devSmokeReady: false,
      }),
    ).toMatchObject({
      renderWorkbench: false,
      message: "无法连接已配置的本机 chatlog 服务，请在设置中心检查服务地址或服务进程。",
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

function profileSummary(overrides: Partial<SetupProfileSummary> = {}): SetupProfileSummary {
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
    ...overrides,
  };
}

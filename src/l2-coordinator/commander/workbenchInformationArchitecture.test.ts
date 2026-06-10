import { describe, expect, it } from "vitest";
import {
  buildWorkbenchContextDeepLinks,
  getWorkbenchInspectorTitle,
  isWorkbenchReadySmokeSearch,
  isWorkbenchInspectorDestination,
  resolveWorkbenchDestination,
  type LegacyWorkbenchModule,
} from "./workbenchInformationArchitecture";

describe("workbenchInformationArchitecture", () => {
  it("routes legacy workbench modules to primary destinations instead of inspector modules", () => {
    const expected: Record<LegacyWorkbenchModule, string> = {
      chat: "workbench",
      stats: "analytics",
      media: "media",
      sns: "sns",
      developer: "workbench",
      ai: "ai",
      graph: "graph",
      settings: "workbench",
    };

    for (const [module, destination] of Object.entries(expected)) {
      expect(resolveWorkbenchDestination(module as LegacyWorkbenchModule)).toBe(destination);
    }
  });

  it("does not allow full workspace modules to render inside the chat inspector", () => {
    expect(getWorkbenchInspectorTitle()).toBe("会话详情");

    for (const module of ["stats", "media", "sns", "developer", "ai", "graph", "settings"] as const) {
      expect(isWorkbenchInspectorDestination(module)).toBe(false);
    }
  });

  it("builds scoped deep links without embedding private chat identifiers", () => {
    const links = buildWorkbenchContextDeepLinks({ hasConversation: true });

    expect(links.map((item) => item.label)).toEqual([
      "搜索此会话",
      "查看完整统计",
      "打开媒体库",
      "查看朋友圈",
      "问这个会话",
      "在图谱中查看",
    ]);
    expect(links.map((item) => item.href)).toEqual([
      "/search?scope=currentChat&source=workbench",
      "/analytics?scope=currentChat&source=workbench",
      "/media?scope=currentChat&source=workbench",
      "/sns?scope=currentChat&source=workbench",
      "/ai?scope=currentChat&source=workbench",
      "/graph?scope=currentChat&source=workbench",
    ]);
    expect(links.some((item) => item.href.includes("wxid"))).toBe(false);
  });

  it("disables context deep links until a conversation is selected", () => {
    const links = buildWorkbenchContextDeepLinks({ hasConversation: false });

    expect(links.every((item) => item.disabled)).toBe(true);
    expect(links.every((item) => item.disabledReason === "先选择一个会话")).toBe(true);
  });

  it("recognizes only the ready workbench smoke query", () => {
    expect(isWorkbenchReadySmokeSearch("?codex-smoke=workbench-ready")).toBe(true);
    expect(isWorkbenchReadySmokeSearch("?codex-smoke=other")).toBe(false);
    expect(isWorkbenchReadySmokeSearch("?source=workbench")).toBe(false);
  });
});

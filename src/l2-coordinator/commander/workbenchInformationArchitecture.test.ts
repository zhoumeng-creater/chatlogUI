import { describe, expect, it } from "vitest";
import {
  buildScopedWorkspaceRoute,
  getConversationInspectorTitle,
  isFullWorkspaceInspectorDestination,
  isPrimaryWorkspaceRoute,
} from "./workbenchInformationArchitecture";

describe("workbenchInformationArchitecture", () => {
  it("keeps primary workspace routes canonical and excludes legacy pseudo routes", () => {
    for (const route of ["/workbench", "/search", "/media", "/sns", "/analytics", "/ai", "/graph"]) {
      expect(isPrimaryWorkspaceRoute(route)).toBe(true);
    }

    expect(isPrimaryWorkspaceRoute("/settings")).toBe(false);
    expect(isPrimaryWorkspaceRoute("/developer")).toBe(false);
    expect(isPrimaryWorkspaceRoute("/workbench/media")).toBe(false);
  });

  it("uses context inspector language instead of full module titles", () => {
    expect(getConversationInspectorTitle({ hasConversation: false })).toBe("会话详情");
    expect(getConversationInspectorTitle({ hasConversation: true })).toBe("会话详情");

    for (const title of ["媒体与扩展", "朋友圈", "AI 分析", "开发者工具", "知识图谱"]) {
      expect(getConversationInspectorTitle({ hasConversation: true })).not.toBe(title);
    }
  });

  it("does not allow full workspaces to be rendered in the chat inspector", () => {
    for (const destination of ["analytics", "media", "sns", "ai", "graph", "developer", "settings"]) {
      expect(isFullWorkspaceInspectorDestination(destination)).toBe(false);
    }
  });

  it("builds scoped deep links without creating a second main entry point", () => {
    expect(buildScopedWorkspaceRoute("search", { scope: "currentChat", chat: "synthetic_chat" })).toBe(
      "/search?scope=currentChat&chat=synthetic_chat",
    );
    expect(buildScopedWorkspaceRoute("graph", { focus: "synthetic_topic" })).toBe(
      "/graph?focus=synthetic_topic",
    );
  });
});

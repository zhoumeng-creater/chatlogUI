import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { WorkspaceRouteScopeView } from "@l2/commander/workspaceRouteScope";
import { WorkspaceScopeStatus } from "./WorkspaceScopeStatus";

describe("WorkspaceScopeStatus", () => {
  it("labels the legacy status strip as a readonly range summary", () => {
    const html = renderToStaticMarkup(
      <WorkspaceScopeStatus
        workspaceRouteScope={workspaceRouteScope()}
        items={[{ label: "统计", value: "已加载", tone: "success" }]}
      />,
    );

    expect(html).toContain("只读范围摘要：当前会话：Synthetic Session");
    expect(html).toContain('aria-label="页面范围状态摘要"');
  });
});

function workspaceRouteScope(): WorkspaceRouteScopeView {
  return {
    mode: "currentChat",
    scopeKind: "currentConversation",
    state: "current-chat",
    hasScopedChat: false,
    missingChat: false,
    currentConversation: null,
    currentChat: "session_synthetic_001",
    scopeLabel: "当前会话：Synthetic Session",
    scopeDescription: "正在查看当前选中的会话范围。",
    sourceLabel: null,
    focusLabel: null,
    contextChips: [],
  };
}

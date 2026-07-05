import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
  WorkspaceCommandAction,
  WorkspaceCommandBarModel,
} from "@l2/commander/workspaceCommandBarModel";
import { WorkspaceCommandBar } from "./WorkspaceCommandBar";

describe("WorkspaceCommandBar", () => {
  it("renders one primary action, a details action, and an overflow menu trigger", () => {
    const html = renderToStaticMarkup(
      <WorkspaceCommandBar
        model={buildModel(true)}
        onAction={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="搜索此会话"');
    expect(html).not.toContain(">搜索此会话</button>");
    expect(html).toContain("会话详情");
    expect(html).toContain("更多当前会话操作");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).not.toContain("导出当前会话</button><button");
    const overflowButton = html.match(/<button[^>]*aria-label="更多当前会话操作"[^>]*>/)?.[0] ?? "";
    expect(overflowButton).not.toContain("aria-describedby");
    expect(html).not.toContain('role="tooltip">更多当前会话操作');
  });

  it("links disabled reasons for unavailable current conversation commands", () => {
    const html = renderToStaticMarkup(
      <WorkspaceCommandBar
        model={buildModel(false)}
        onAction={vi.fn()}
      />,
    );

    expect(html).toContain("先选择一个会话。");
    expect(html).not.toContain("导出任务");
    expect(html).not.toContain("历史导航");
    expect(html).toContain("aria-describedby=");
  });

  it("renders high-frequency command actions with the target size requested by the model", () => {
    const html = renderToStaticMarkup(
      <WorkspaceCommandBar
        model={buildModel(true)}
        onAction={vi.fn()}
      />,
    );

    expect(html).toContain("ui-button--md");
    expect(html).not.toContain("ui-button--sm");
  });
});

function buildModel(hasConversation: boolean): WorkspaceCommandBarModel {
  return {
    primary: [
      buildAction(
        "search-current",
        "搜索此会话",
        "primary",
        hasConversation ? null : "先选择一个会话。",
      ),
    ],
    secondary: [
      buildAction(
        "details",
        "会话详情",
        "secondary",
        hasConversation ? null : "先选择一个会话。",
      ),
    ],
    overflow: [
      buildAction(
        "export-current",
        "导出当前会话",
        "overflow",
        hasConversation ? null : "先选择一个会话。",
      ),
      buildAction(
        "jump-date",
        "跳转日期",
        "overflow",
        hasConversation ? null : "先选择一个会话。",
      ),
    ],
  };
}

function buildAction(
  id: WorkspaceCommandAction["id"],
  label: string,
  group: WorkspaceCommandAction["group"],
  disabledReason: string | null,
): WorkspaceCommandAction {
  return {
    id,
    label,
    shortLabel: label,
    group,
    disabled: disabledReason !== null,
    disabledReason,
    minTargetPx: group === "overflow" ? 32 : 40,
  };
}

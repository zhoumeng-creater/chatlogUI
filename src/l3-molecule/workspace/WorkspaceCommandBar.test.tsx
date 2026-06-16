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

    expect(html).toContain("搜索此会话");
    expect(html).toContain("会话详情");
    expect(html).toContain("更多当前会话操作");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).not.toContain("导出当前会话</button><button");
  });

  it("links disabled reasons for unavailable current conversation commands", () => {
    const html = renderToStaticMarkup(
      <WorkspaceCommandBar
        model={buildModel(false)}
        onAction={vi.fn()}
      />,
    );

    expect(html).toContain("先选择一个会话。");
    expect(html).toContain("当前会话导出将在导出任务中启用。");
    expect(html).toContain("日期跳转将在历史导航任务中启用。");
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
        hasConversation
          ? "当前会话导出将在导出任务中启用。"
          : "先选择一个会话。当前会话导出将在导出任务中启用。",
      ),
      buildAction(
        "jump-date",
        "跳转日期",
        "overflow",
        hasConversation
          ? "日期跳转将在历史导航任务中启用。"
          : "先选择一个会话。日期跳转将在历史导航任务中启用。",
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

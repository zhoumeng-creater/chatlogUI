import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActionableEmptyState } from "./ActionableEmptyState";
import type { ActionableEmptyStateView } from "@l2/commander/actionableEmptyStateModel";

describe("ActionableEmptyState", () => {
  it("renders reason, next actions and disabled reasons without private content", () => {
    const html = renderToStaticMarkup(
      <ActionableEmptyState
        model={model()}
        onAction={vi.fn()}
      />,
    );

    expect(html).toContain('data-empty-state="search-no-results"');
    expect(html).toContain("没有搜索结果");
    expect(html).toContain("换一个关键词或放宽范围。");
    expect(html).toContain("清除筛选");
    expect(html).toContain("打开设置");
    expect(html).toContain("等待数据库就绪");
    expect(html).not.toContain("Synthetic Private Query");
  });

  it("disables actions when the owning surface does not provide an action handler", () => {
    const html = renderToStaticMarkup(
      <ActionableEmptyState model={model()} />,
    );

    expect(html).toContain("disabled");
    expect(html).toContain("当前区域没有接入这个操作。");
  });
});

function model(): ActionableEmptyStateView {
  return {
    id: "search-no-results",
    title: "没有搜索结果",
    reason: "换一个关键词或放宽范围。",
    description: "隐私模式下仍保留结果数量、范围和消息类型。",
    statusCopy: "已加载 0 条结果",
    actions: [
      {
        id: "clear-filters",
        label: "清除筛选",
        variant: "secondary",
        disabled: false,
        disabledReason: null,
      },
      {
        id: "open-settings",
        label: "打开设置",
        variant: "ghost",
        disabled: false,
        disabledReason: null,
      },
      {
        id: "retry",
        label: "重试",
        variant: "ghost",
        disabled: true,
        disabledReason: "等待数据库就绪",
      },
    ],
  };
}

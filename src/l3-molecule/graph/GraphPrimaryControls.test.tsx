import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GraphPrimaryControls } from "./GraphPrimaryControls";
import type { GraphControlModel } from "@l2/commander/graphControlModel";

describe("GraphPrimaryControls", () => {
  it("renders labeled primary controls without exposing advanced filters inline", () => {
    const html = renderToStaticMarkup(
      <GraphPrimaryControls
        model={controlModel}
        keywordDraft="Synthetic"
        onKeywordDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        onTimeWindowChange={vi.fn()}
        onRefresh={vi.fn()}
        onOpenAdvancedFilters={vi.fn()}
        exportAction={{
          label: "导出",
          disabled: false,
          disabledReason: null,
          onClick: vi.fn(),
        }}
      />,
    );

    expect(html).toContain("搜索实体或关系");
    expect(html).toContain('name="graph-keyword"');
    expect(html).toContain("近30天");
    expect(html).toContain("应用筛选");
    expect(html.match(/刷新摘要/g)?.length).toBe(1);
    expect(html).toContain("更多筛选");
    expect(html).toContain("导出");
    expect(html).not.toContain("实体类型");
    expect(html).not.toContain("关系类型");
    expect(html).not.toContain("数量上限");
  });

  it("keeps disabled export reason available and uses normal target-size buttons", () => {
    const html = renderToStaticMarkup(
      <GraphPrimaryControls
        model={{
          ...controlModel,
          primaryControls: controlModel.primaryControls.map((control) =>
            control.id === "export"
              ? { ...control, disabled: true, disabledReason: "图谱摘要加载完成后可导出。" }
              : control,
          ),
        }}
        keywordDraft=""
        onKeywordDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        onTimeWindowChange={vi.fn()}
        onRefresh={vi.fn()}
        onOpenAdvancedFilters={vi.fn()}
        exportAction={{
          label: "导出",
          disabled: true,
          disabledReason: "图谱摘要加载完成后可导出。",
          onClick: vi.fn(),
        }}
      />,
    );

    expect(html).toContain("图谱摘要加载完成后可导出");
    expect(html).toContain("ui-button--md");
    expect(html).not.toContain("ui-button--sm");
  });
});

const controlModel: GraphControlModel = {
  primarySummary: "关键词：Synthetic / 时间：近 30 天",
  advancedSummary: "实体类型：person / 关系类型：owns / 数量：120",
  primaryControls: [
    { id: "keyword", label: "关键词", value: "Synthetic" },
    { id: "time-window", label: "时间范围", value: "近 30 天" },
    { id: "refresh", label: "刷新摘要", value: "可用" },
    { id: "export", label: "导出", value: "可用" },
    { id: "advanced-filters", label: "更多筛选", value: "可用" },
  ],
  advancedFilters: [
    { id: "entity", label: "实体类型", value: "person" },
    { id: "relation", label: "关系类型", value: "owns" },
    { id: "limit", label: "数量上限", value: "120" },
    { id: "start", label: "开始日期", value: "2026-01-01" },
    { id: "end", label: "结束日期", value: "2026-01-31" },
    { id: "reset", label: "重置筛选", value: "可用" },
  ],
  canvasControls: [],
};

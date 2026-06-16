import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GraphAdvancedFilterDrawer } from "./GraphAdvancedFilterDrawer";
import type { GraphControlModel } from "@l2/commander/graphControlModel";

describe("GraphAdvancedFilterDrawer", () => {
  it("renders advanced graph filters as a dialog with visible labels and applied-state copy", () => {
    const html = renderToStaticMarkup(
      <GraphAdvancedFilterDrawer
        open
        model={controlModel}
        entityDraft="person"
        relationDraft="owns"
        limitDraft="120"
        startDraft="2026-01-01"
        endDraft="2026-01-31"
        hasUnappliedChanges
        onEntityDraftChange={vi.fn()}
        onRelationDraftChange={vi.fn()}
        onLimitDraftChange={vi.fn()}
        onStartDraftChange={vi.fn()}
        onEndDraftChange={vi.fn()}
        onApply={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-labelledby="graph-advanced-filter-title"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("图谱高级筛选");
    expect(html).toContain("实体类型");
    expect(html).toContain("关系类型");
    expect(html).toContain("数量上限");
    expect(html).toContain("开始日期");
    expect(html).toContain("结束日期");
    expect(html).toContain("有未应用更改");
    expect(html).toContain("应用筛选");
    expect(html).toContain("重置筛选");
  });

  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      <GraphAdvancedFilterDrawer
        open={false}
        model={controlModel}
        entityDraft=""
        relationDraft=""
        limitDraft="80"
        startDraft=""
        endDraft=""
        hasUnappliedChanges={false}
        onEntityDraftChange={vi.fn()}
        onRelationDraftChange={vi.fn()}
        onLimitDraftChange={vi.fn()}
        onStartDraftChange={vi.fn()}
        onEndDraftChange={vi.fn()}
        onApply={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(html).toBe("");
  });
});

const controlModel: GraphControlModel = {
  primarySummary: "关键词：Synthetic / 时间：近 30 天",
  advancedSummary: "实体类型：person / 关系类型：owns / 数量：120",
  primaryControls: [],
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

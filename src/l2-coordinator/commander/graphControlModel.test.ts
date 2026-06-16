import { describe, expect, it } from "vitest";
import { buildGraphControlModel } from "./graphControlModel";

describe("buildGraphControlModel", () => {
  it("separates primary filters, advanced filters, and canvas-only controls", () => {
    const model = buildGraphControlModel({
      keyword: "Synthetic Entity",
      timeWindow: "30d",
      entityFilter: "person",
      relationFilter: "owns",
      limit: 120,
      start: "2026-01-01",
      end: "2026-01-31",
      loading: false,
      canExport: true,
      canVisualize: true,
      canvasMounted: true,
      autoRotate: true,
      timelineVisible: false,
      layoutMode: "force",
    });

    expect(model.primaryControls.map((control) => control.id)).toEqual([
      "keyword",
      "time-window",
      "refresh",
      "export",
      "advanced-filters",
    ]);
    expect(model.advancedFilters.map((control) => control.id)).toEqual([
      "entity",
      "relation",
      "limit",
      "start",
      "end",
      "reset",
    ]);
    expect(model.canvasControls.map((control) => control.id)).toEqual([
      "layout",
      "auto-rotate",
      "timeline",
      "fit-view",
      "reset-view",
      "refresh-canvas",
    ]);
    expect(model.primarySummary).toContain("关键词");
    expect(model.advancedSummary).toContain("实体类型");
  });

  it("uses user-facing disabled reasons without exposing raw graph endpoints", () => {
    const model = buildGraphControlModel({
      keyword: "",
      timeWindow: "",
      entityFilter: "",
      relationFilter: "",
      limit: 80,
      start: "",
      end: "",
      loading: true,
      canExport: false,
      canVisualize: false,
      canvasMounted: false,
      autoRotate: false,
      timelineVisible: false,
      layoutMode: "radial",
    });

    const reasons = [
      ...model.primaryControls,
      ...model.advancedFilters,
      ...model.canvasControls,
    ].map((control) => control.disabledReason ?? "").join("\n");

    expect(reasons).toContain("图谱摘要加载完成后可导出");
    expect(reasons).toContain("先打开可视化后可使用画布控制");
    expect(reasons).not.toMatch(/\/api\/v1\/graph|HTTP|raw|endpoint/i);
  });
});

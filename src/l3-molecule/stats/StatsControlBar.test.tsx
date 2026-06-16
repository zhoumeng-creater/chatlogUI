import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StatsControlViewModel } from "@l2/commander/statsControlModel";
import { StatsControlBar } from "./StatsControlBar";

describe("StatsControlBar", () => {
  it("renders presets, refresh, reset, export slot, and disabled object reasons", () => {
    const html = renderToStaticMarkup(
      <StatsControlBar
        model={viewModel()}
        exportAction={<button type="button">导出统计</button>}
        onSelectTimePreset={vi.fn()}
        onSelectGranularity={vi.fn()}
        onSelectObjectFilter={vi.fn()}
        onCustomRangeChange={vi.fn()}
        onRefresh={vi.fn()}
        onReset={vi.fn()}
        onToggleComparison={vi.fn()}
      />,
    );

    expect(html).toContain("统计控制");
    expect(html).toContain("近 7 天");
    expect(html).toContain("近 30 天");
    expect(html).toContain("近 90 天");
    expect(html).toContain("全部");
    expect(html).toContain("自定义");
    expect(html).toContain("按日");
    expect(html).toContain("按周");
    expect(html).toContain("按月");
    expect(html).toContain("刷新统计");
    expect(html).toContain("重置统计控制");
    expect(html).toContain("导出统计");
    expect(html).toContain("本机统计接口暂不支持按发送方筛选。");
    expect(html).toContain("ui-button--md");
  });

  it("renders custom range fields and inline validation", () => {
    const html = renderToStaticMarkup(
      <StatsControlBar
        model={{
          ...viewModel(),
          timeOptions: viewModel().timeOptions.map((option) => ({
            ...option,
            selected: option.value === "custom",
          })),
          customRange: { start: "2026-01-10", end: "2026-01-03" },
          customRangeError: "结束日期不能早于开始日期。",
        }}
        exportAction={null}
        onSelectTimePreset={vi.fn()}
        onSelectGranularity={vi.fn()}
        onSelectObjectFilter={vi.fn()}
        onCustomRangeChange={vi.fn()}
        onRefresh={vi.fn()}
        onReset={vi.fn()}
        onToggleComparison={vi.fn()}
      />,
    );

    expect(html).toContain("开始日期");
    expect(html).toContain("结束日期");
    expect(html).toContain("2026-01-10");
    expect(html).toContain("2026-01-03");
    expect(html).toContain("结束日期不能早于开始日期。");
  });
});

function viewModel(): StatsControlViewModel {
  return {
    timeOptions: [
      { value: "7d", label: "近 7 天", selected: true, disabled: false, disabledReason: null },
      { value: "30d", label: "近 30 天", selected: false, disabled: false, disabledReason: null },
      { value: "90d", label: "近 90 天", selected: false, disabled: false, disabledReason: null },
      { value: "all", label: "全部", selected: false, disabled: false, disabledReason: null },
      { value: "custom", label: "自定义", selected: false, disabled: false, disabledReason: null },
    ],
    granularityOptions: [
      { value: "day", label: "按日", selected: true, disabled: false, disabledReason: null },
      { value: "week", label: "按周", selected: false, disabled: false, disabledReason: null },
      { value: "month", label: "按月", selected: false, disabled: false, disabledReason: null },
    ],
    objectOptions: [
      { value: "all", label: "全部成员", selected: true, disabled: false, disabledReason: null },
      {
        value: "me",
        label: "我",
        selected: false,
        disabled: true,
        disabledReason: "本机统计接口暂不支持按发送方筛选。",
      },
      {
        value: "other",
        label: "对方/成员",
        selected: false,
        disabled: true,
        disabledReason: "本机统计接口暂不支持按发送方筛选。",
      },
      {
        value: "selectedMember",
        label: "指定成员",
        selected: false,
        disabled: true,
        disabledReason: "本机统计接口暂不支持指定成员统计。",
      },
    ],
    comparison: {
      enabled: false,
      label: "与上一周期比较",
      disabled: false,
      disabledReason: null,
    },
    activeLabels: ["近 7 天", "按日", "全部成员"],
    customRange: { start: "", end: "" },
    customRangeError: null,
    canReset: false,
    exportScopeSummary: "近 7 天 · 按日 · 全部成员",
    warnings: [],
    pending: false,
  };
}

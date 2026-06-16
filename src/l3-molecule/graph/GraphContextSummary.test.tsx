import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GraphContextSummary } from "./GraphContextSummary";
import type { GraphContextSummaryView } from "@l2/commander/graphContextSummaryModel";

describe("GraphContextSummary", () => {
  it("renders metrics, filters, source, freshness, warnings, and collapsible technical detail", () => {
    const html = renderToStaticMarkup(<GraphContextSummary summary={summary} />);

    expect(html).toContain("当前图谱说明");
    expect(html).toContain("实体");
    expect(html).toContain("关系");
    expect(html).toContain("关键词：Synthetic");
    expect(html).toContain("来源：图谱当前视图");
    expect(html).toContain("生成：2026-01-02");
    expect(html).toContain("刷新：2026-01-02");
    expect(html).toContain("部分数据");
    expect(html).toContain("筛选条件有未应用更改");
    expect(html).toContain("<details");
    expect(html).toContain("技术细节");
    expect(html).toContain("1 图谱线程");
  });

  it("does not render private labels when the summary is already privacy-safe", () => {
    const html = renderToStaticMarkup(
      <GraphContextSummary
        summary={{
          ...summary,
          filterChips: ["关键词：已隐藏关键词"],
          sourceLabel: "来源：来自图谱",
        }}
      />,
    );

    expect(html).not.toContain("Synthetic Session");
    expect(html).not.toContain("wxid_");
  });
});

const summary: GraphContextSummaryView = {
  title: "当前图谱说明",
  statusLabel: "部分数据",
  freshnessState: "partial",
  metrics: [
    { label: "实体", value: 3 },
    { label: "关系", value: 2 },
    { label: "事件", value: 1 },
    { label: "事实", value: 4 },
    { label: "来源", value: 5 },
  ],
  filterChips: ["关键词：Synthetic", "时间：近 30 天"],
  sourceLabel: "来源：图谱当前视图",
  generatedLabel: "生成：2026-01-02 03:04",
  refreshedLabel: "刷新：2026-01-02 03:05",
  warnings: ["筛选条件有未应用更改，当前摘要仍显示上一次刷新结果。"],
  recoveryActions: ["应用筛选", "刷新图谱摘要"],
  technicalDetails: ["1 图谱线程 / 1 入队线程", "45/min"],
};

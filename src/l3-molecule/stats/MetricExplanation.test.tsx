import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MetricExplanation } from "./MetricExplanation";

describe("MetricExplanation", () => {
  it("renders metric definitions, comparison deltas, and partial warnings", () => {
    const html = renderToStaticMarkup(
      <MetricExplanation
        definitions={[
          { key: "total", label: "消息总数", description: "当前统计范围内的消息数量。" },
          { key: "activeSenders", label: "活跃人数", description: "有发言记录的发送者数量。" },
        ]}
        comparison={{
          mode: "previousPeriod",
          unavailableReason: null,
          rows: [
            { key: "total", label: "消息总数", current: 120, previous: 100, deltaPercent: 20 },
            { key: "activeSenders", label: "活跃人数", current: 2, previous: 4, deltaPercent: -50 },
          ],
        }}
        warnings={["自定义趋势暂不可用，当前只导出概览统计。"]}
      />,
    );

    expect(html).toContain("指标说明");
    expect(html).toContain("消息总数");
    expect(html).toContain("当前统计范围内的消息数量。");
    expect(html).toContain("较上一周期 +20%");
    expect(html).toContain("较上一周期 -50%");
    expect(html).toContain("自定义趋势暂不可用");
  });

  it("renders comparison unavailable reason without exposing private labels", () => {
    const html = renderToStaticMarkup(
      <MetricExplanation
        definitions={[{ key: "total", label: "消息总数", description: "当前统计范围内的消息数量。" }]}
        comparison={{
          mode: "previousPeriod",
          unavailableReason: "全部时间没有可比较的上一周期。",
          rows: [],
        }}
        warnings={[]}
      />,
    );

    expect(html).toContain("全部时间没有可比较的上一周期。");
    expect(html).not.toContain("wxid_");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GraphTimeline } from "./GraphTimeline";
import type { GraphDataView } from "./graphTypes";

describe("GraphTimeline", () => {
  it("uses a shared tooltip for close and real buttons for timeline entries", () => {
    const html = renderToStaticMarkup(
      <GraphTimeline
        data={data()}
        timelineVisible
        highlightedTimelineId="0"
        privacyOn={false}
        onTimelineVisibleChange={vi.fn()}
        onHighlightTimelineEntry={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="关闭时间轴"');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain("关闭时间轴");
    expect(html).toContain('<button type="button" class="graph-timeline__entry graph-timeline__entry--highlighted"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('<div class="graph-timeline__entry');
    expect(html).not.toContain("title=");
  });

  it("keeps timeline content privacy-masked after button migration", () => {
    const html = renderToStaticMarkup(
      <GraphTimeline
        data={data()}
        timelineVisible
        highlightedTimelineId={null}
        privacyOn
        onTimelineVisibleChange={vi.fn()}
        onHighlightTimelineEntry={vi.fn()}
      />,
    );

    expect(html).not.toContain("Synthetic private event");
    expect(html).not.toContain("Synthetic private source");
    expect(html).toContain("******");
  });
});

function data(): GraphDataView {
  return {
    nodes: [],
    edges: [],
    generated_at: 0,
    timeline: [
      {
        time: 1717200000,
        type: "event",
        title: "Synthetic private event",
        description: "Synthetic private detail",
        source: "Synthetic private source",
      },
    ],
  };
}

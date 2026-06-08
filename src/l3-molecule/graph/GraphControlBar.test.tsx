import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GraphControlBar } from "./GraphControlBar";

describe("GraphControlBar", () => {
  it("describes icon graph commands through shared tooltips without native title", () => {
    const html = renderToStaticMarkup(
      <GraphControlBar
        visibleEntityKinds={["person"]}
        timeWindow=""
        layoutMode="force"
        autoRotate
        timelineVisible={false}
        onVisibleKindsChange={vi.fn()}
        onTimeWindowChange={vi.fn()}
        onRefresh={vi.fn()}
        onLayoutModeChange={vi.fn()}
        onToggleAutoRotate={vi.fn()}
        onTimelineVisibleChange={vi.fn()}
      />,
    );

    const descriptionIds = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1]);
    expect(descriptionIds.length).toBeGreaterThanOrEqual(2);
    expect(descriptionIds.some((id) => html.includes(`id="${id}"`))).toBe(true);
    expect(html).toContain('aria-label="刷新图谱"');
    expect(html).toContain('aria-label="自动旋转"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('role="tooltip"');
    expect(html).not.toContain("title=");
  });
});

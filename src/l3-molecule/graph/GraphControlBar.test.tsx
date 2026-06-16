import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GraphControlBar } from "./GraphControlBar";

describe("GraphControlBar", () => {
  it("describes icon graph commands through shared tooltips without native title", () => {
    const html = renderToStaticMarkup(
      <GraphControlBar
        layoutMode="force"
        autoRotate
        timelineVisible={false}
        onRefresh={vi.fn()}
        onLayoutModeChange={vi.fn()}
        onToggleAutoRotate={vi.fn()}
        onTimelineVisibleChange={vi.fn()}
        onFitView={vi.fn()}
        onResetView={vi.fn()}
      />,
    );

    const descriptionIds = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1]);
    expect(descriptionIds.length).toBeGreaterThanOrEqual(2);
    expect(descriptionIds.some((id) => html.includes(`id="${id}"`))).toBe(true);
    expect(html).toContain('aria-label="刷新图谱"');
    expect(html).toContain('aria-label="自动旋转"');
    expect(html).toContain('aria-label="适配视图"');
    expect(html).toContain('aria-label="重置视图"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('role="tooltip"');
    expect(html).not.toContain("title=");
    expect(html).not.toContain("人物");
    expect(html).not.toContain("近7天");
  });
});

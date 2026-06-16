import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MediaFilterBar } from "./MediaFilterBar";

describe("MediaFilterBar", () => {
  it("renders actionable local filters and structural chips without private content", () => {
    const html = renderToStaticMarkup(
      <MediaFilterBar
        filters={{
          type: "image",
          source: "history",
          availability: "available",
          dateRange: { start: "2026-06-01", end: "2026-06-30" },
        }}
        activeChips={[
          { id: "type", label: "类型", value: "图片" },
          { id: "availability", label: "状态", value: "可预览" },
        ]}
        visibleCount={1}
        totalCount={3}
        selectedCount={1}
        onChange={vi.fn()}
        onClearFilter={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(html).toContain("媒体筛选");
    expect(html).toContain("类型");
    expect(html).toContain("来源");
    expect(html).toContain("状态");
    expect(html).toContain("当前可见 1 / 3");
    expect(html).toContain("已选 1");
    expect(html).toContain("清除筛选");
    expect(html).not.toContain("wxid_");
    expect(html).not.toContain("C:\\Users");
  });

  it("uses standard-sized controls for common media filtering actions", () => {
    const html = renderToStaticMarkup(
      <MediaFilterBar
        filters={{
          type: "all",
          source: "all",
          availability: "all",
          dateRange: { start: "", end: "" },
        }}
        activeChips={[{ id: "source", label: "来源", value: "当前会话" }]}
        visibleCount={2}
        totalCount={4}
        selectedCount={0}
        onChange={vi.fn()}
        onClearFilter={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(html).toContain("ui-button--md");
    expect(html).toContain("ui-control--md");
    expect(html).not.toContain("ui-button--sm");
    expect(html).not.toContain("ui-control--sm");
  });
});

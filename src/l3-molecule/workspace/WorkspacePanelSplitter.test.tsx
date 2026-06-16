import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  getNextSplitterValue,
  WorkspacePanelSplitter,
} from "./WorkspacePanelSplitter";

describe("WorkspacePanelSplitter", () => {
  it("renders an accessible vertical separator with current bounds", () => {
    const html = renderToStaticMarkup(
      <WorkspacePanelSplitter
        label="调整会话列表宽度"
        value={320}
        min={240}
        max={420}
        defaultValue={320}
        direction="normal"
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-orientation="vertical"');
    expect(html).toContain('aria-valuemin="240"');
    expect(html).toContain('aria-valuenow="320"');
    expect(html).toContain('aria-valuemax="420"');
    expect(html).toContain("调整会话列表宽度");
  });

  it("adjusts keyboard values with direction-aware clamp rules", () => {
    expect(getNextSplitterValue({
      key: "ArrowRight",
      value: 320,
      min: 240,
      max: 420,
      step: 16,
      direction: "normal",
    })).toBe(336);
    expect(getNextSplitterValue({
      key: "ArrowRight",
      value: 320,
      min: 240,
      max: 420,
      step: 16,
      direction: "reverse",
    })).toBe(304);
    expect(getNextSplitterValue({
      key: "Home",
      value: 320,
      min: 240,
      max: 420,
      step: 16,
      direction: "normal",
    })).toBe(240);
  });
});

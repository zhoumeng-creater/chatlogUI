import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsLayout } from "./SettingsLayout";

describe("SettingsLayout", () => {
  it("uses typed category copy and exposes active category state", () => {
    const html = renderToStaticMarkup(
      <SettingsLayout
        activeCategory="advanced"
        categoryLabels={categoryLabels}
        onCategoryChange={vi.fn()}
      >
        <div>content</div>
      </SettingsLayout>,
    );

    expect(html).toContain("aria-label=\"设置分类\"");
    expect(html).toContain("数据与服务");
    expect(html).toContain("外观");
    expect(html).toContain("AI 与语义");
    expect(html).toContain("隐私与诊断");
    expect(html).toContain("关于与更新");
    expect(html).toContain("aria-current=\"page\"");
  });
});

const categoryLabels = {
  data: "数据与服务",
  appearance: "外观",
  ai: "AI 与语义",
  advanced: "隐私与诊断",
  about: "关于与更新",
};

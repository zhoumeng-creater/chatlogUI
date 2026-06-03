import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DbSearchPanel } from "./DbSearchPanel";

describe("DbSearchPanel", () => {
  it("does not render the DB search query while privacy mode is enabled", () => {
    const html = renderToStaticMarkup(
      <DbSearchPanel
        status="idle"
        query="synthetic private search"
        mode="quick"
        limit={50}
        privacyOn
        results={{
          keyword: "已隐藏",
          mode: "quick",
          total: 0,
          items: [],
        }}
        error={null}
        onQueryChange={vi.fn()}
        onModeChange={vi.fn()}
        onLimitChange={vi.fn()}
        onSearch={vi.fn()}
      />,
    );

    expect(html).not.toContain("synthetic private search");
    expect(html).toContain("隐私模式已隐藏关键词");
    expect(html).toContain("disabled");
  });
});

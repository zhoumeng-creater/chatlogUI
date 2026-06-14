import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SearchActiveFilterChips } from "./SearchActiveFilterChips";

describe("SearchActiveFilterChips", () => {
  it("renders clearable advanced filter chips", () => {
    const html = renderToStaticMarkup(
      <SearchActiveFilterChips
        chips={[
          { id: "dateRange", label: "时间", value: "2026-01-02 到 2026-01-03", clearAction: "dateRange" },
        ]}
        onClear={vi.fn()}
      />,
    );

    expect(html).toContain("时间：2026-01-02 到 2026-01-03");
    expect(html).toContain("清除时间");
  });
});

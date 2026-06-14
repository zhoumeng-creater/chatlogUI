import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SearchHitNavigator } from "./SearchHitNavigator";

describe("SearchHitNavigator", () => {
  it("renders previous and next hit controls with target-size button classes", () => {
    const html = renderToStaticMarkup(
      <SearchHitNavigator
        label="第 2 / 3 条"
        hasPrevious
        hasNext
        onPrevious={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(html).toContain("上一条命中");
    expect(html).toContain("下一条命中");
    expect(html).toContain("第 2 / 3 条");
    expect(html).toContain("ui-button--md");
  });
});

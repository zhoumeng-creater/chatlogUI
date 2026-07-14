import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GlobalSearch, shouldSubmitSearchKey } from "./GlobalSearch";

const props = {
  query: "invoice",
  results: null,
  loading: false,
  scope: "all" as const,
  currentConversation: undefined,
  privacyOn: false,
  recentQueries: ["invoice", "meeting"],
  onSearch: vi.fn(),
  onExecuteSearch: vi.fn(),
  onClearSearch: vi.fn(),
  onChangeScope: vi.fn(),
  onUseRecentQuery: vi.fn(),
  onDeleteRecentQuery: vi.fn(),
  onClearRecentQueries: vi.fn(),
};

describe("GlobalSearch", () => {
  it("renders a visible label, example placeholder, clear button, and privacy-safe history controls", () => {
    const html = renderToStaticMarkup(<GlobalSearch {...props} />);

    expect(html).toContain("搜索内容");
    expect(html).toContain("例如：发票、聚餐、项目名称");
    expect(html).toContain("清除搜索内容");
    expect(html).toContain("最近搜索");
    expect(html).toContain("删除搜索记录：invoice");
    expect(html).toContain("清空搜索历史");
  });

  it("does not render raw recent queries in privacy mode", () => {
    const html = renderToStaticMarkup(
      <GlobalSearch {...props} privacyOn recentQueries={["private query"]} />,
    );

    expect(html).not.toContain("private query");
    expect(html).not.toContain("最近搜索");
  });

  it("ignores Enter while an IME composition is active", () => {
    expect(shouldSubmitSearchKey({ key: "Enter", nativeEvent: { isComposing: true } })).toBe(false);
    expect(shouldSubmitSearchKey({ key: "Enter", keyCode: 229 })).toBe(false);
    expect(shouldSubmitSearchKey({ key: "Enter", nativeEvent: { isComposing: false } })).toBe(true);
    expect(shouldSubmitSearchKey({ key: "Escape", nativeEvent: { isComposing: false } })).toBe(
      false,
    );
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  GlobalSearch,
  moveSearchHistoryActiveIndex,
  resolveGlobalSearchEscape,
  resolveSearchHistoryEnterAction,
  shouldExecuteSearchKey,
  shouldFocusGlobalSearchShortcut,
  shouldIgnoreSearchKeyDuringComposition,
  shouldShowSearchHistory,
  shouldSubmitSearchKey,
} from "./GlobalSearch";

const props = {
  query: "",
  loading: false,
  privacyOn: false,
  recentQueries: ["invoice", "meeting"],
  onSearch: vi.fn(),
  onExecuteSearch: vi.fn(),
  onClearSearch: vi.fn(),
  onUseRecentQuery: vi.fn(),
  onDeleteRecentQuery: vi.fn(),
  onClearRecentQueries: vi.fn(),
};

describe("GlobalSearch", () => {
  it("renders a visible label, example placeholder, one submit action, and focused history controls", () => {
    const html = renderToStaticMarkup(<GlobalSearch {...props} historyOpen />);

    expect(html).toContain("搜索内容");
    expect(html).toContain("例如：发票、聚餐、项目名称");
    expect(html).toContain("搜索聊天记录");
    expect(html).toContain("最近搜索");
    expect(html).toContain("删除搜索记录：invoice");
    expect(html).toContain("清空搜索历史");
    expect(html).toContain('aria-label="搜索"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('role="menu"');
    expect(html).toContain('role="menuitem"');
  });

  it("gives the commit button the same accessible action name as its visible label", () => {
    const html = renderToStaticMarkup(
      <GlobalSearch {...props} query="invoice" submitLabel="应用筛选" />,
    );

    expect(html).toContain('aria-label="应用筛选"');
    expect(html).not.toContain('aria-label="搜索聊天记录"><svg');
  });

  it("does not render raw recent queries in privacy mode", () => {
    const html = renderToStaticMarkup(
      <GlobalSearch {...props} privacyOn historyOpen recentQueries={["private query"]} />,
    );

    expect(html).not.toContain("private query");
    expect(html).not.toContain("最近搜索");
  });

  it("renders a fixed protected keyword mask while privacy editing is inactive", () => {
    const html = renderToStaticMarkup(
      <GlobalSearch {...props} query="private keyword canary" privacyOn />,
    );

    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain('value="••••••••"');
    expect(html).not.toContain("private keyword canary");
  });

  it("shows history only for an empty focused input and layers Escape without ending search", () => {
    expect(
      shouldShowSearchHistory({ focused: true, query: "", privacyOn: false, historyCount: 2 }),
    ).toBe(true);
    expect(
      shouldShowSearchHistory({
        focused: true,
        query: "invoice",
        privacyOn: false,
        historyCount: 2,
      }),
    ).toBe(false);
    expect(
      shouldShowSearchHistory({ focused: true, query: "", privacyOn: true, historyCount: 2 }),
    ).toBe(false);
    expect(resolveGlobalSearchEscape(true)).toBe("close-history");
    expect(resolveGlobalSearchEscape(false, true)).toBe("cancel-draft");
    expect(resolveGlobalSearchEscape(false)).toBe("blur-input");
  });

  it("wraps Arrow navigation and makes suggestion Enter fill-only before a later explicit submit", () => {
    expect(moveSearchHistoryActiveIndex(-1, "ArrowDown", 2)).toBe(0);
    expect(moveSearchHistoryActiveIndex(0, "ArrowDown", 2)).toBe(1);
    expect(moveSearchHistoryActiveIndex(1, "ArrowDown", 2)).toBe(0);
    expect(moveSearchHistoryActiveIndex(-1, "ArrowUp", 2)).toBe(1);
    expect(moveSearchHistoryActiveIndex(0, "ArrowUp", 2)).toBe(1);
    expect(moveSearchHistoryActiveIndex(0, "ArrowDown", 0)).toBe(-1);

    expect(resolveSearchHistoryEnterAction(true, 0, false)).toBe("fill-suggestion");
    expect(resolveSearchHistoryEnterAction(false, -1, false)).toBe("submit-search");
    expect(resolveSearchHistoryEnterAction(false, -1, true)).toBe("none");
  });

  it("ignores Enter while an IME composition is active", () => {
    expect(
      shouldIgnoreSearchKeyDuringComposition({
        key: "Escape",
        nativeEvent: { isComposing: true },
      }),
    ).toBe(true);
    expect(shouldIgnoreSearchKeyDuringComposition({ key: "Escape", keyCode: 229 })).toBe(true);
    expect(
      shouldIgnoreSearchKeyDuringComposition({
        key: "Escape",
        nativeEvent: { isComposing: false },
      }),
    ).toBe(false);
    expect(shouldSubmitSearchKey({ key: "Enter", nativeEvent: { isComposing: true } })).toBe(false);
    expect(shouldSubmitSearchKey({ key: "Enter", keyCode: 229 })).toBe(false);
    expect(shouldSubmitSearchKey({ key: "Enter", nativeEvent: { isComposing: false } })).toBe(true);
    expect(shouldSubmitSearchKey({ key: "Escape", nativeEvent: { isComposing: false } })).toBe(
      false,
    );
    expect(
      shouldExecuteSearchKey({ key: "Enter", nativeEvent: { isComposing: false } }, true),
    ).toBe(false);
    expect(
      shouldExecuteSearchKey({ key: "Enter", nativeEvent: { isComposing: false } }, false),
    ).toBe(true);
  });

  it("does not move focus behind a modal dialog", () => {
    expect(shouldFocusGlobalSearchShortcut(false, false)).toBe(true);
    expect(shouldFocusGlobalSearchShortcut(true, false)).toBe(false);
    expect(shouldFocusGlobalSearchShortcut(false, true)).toBe(false);
  });

  it("associates inline keyword limits with the input without leaking private text", () => {
    const visibleHtml = renderToStaticMarkup(
      <GlobalSearch
        {...props}
        query="long query"
        keywordGraphemeCount={181}
        keywordError="关键词最多 200 个字符"
      />,
    );
    const privateHtml = renderToStaticMarkup(
      <GlobalSearch
        {...props}
        query="PRIVATE keyword canary"
        privacyOn
        keywordGraphemeCount={181}
        keywordError="关键词最多 20 个词项"
      />,
    );

    expect(visibleHtml).toContain('aria-invalid="true"');
    expect(visibleHtml).toMatch(/aria-describedby="[^"]+-keyword-error[^"]*"/u);
    expect(visibleHtml).toContain("关键词最多 200 个字符");
    expect(visibleHtml).toContain("181 / 200");
    expect(privateHtml).toContain("关键词最多 20 个词项");
    expect(privateHtml).toContain("关键词长度已隐藏");
    expect(privateHtml).not.toContain("PRIVATE keyword canary");
    expect(privateHtml).not.toContain("181 / 200");
  });

  it("starts showing the keyword counter at the 160-character boundary", () => {
    const beforeBoundary = renderToStaticMarkup(
      <GlobalSearch {...props} query="boundary" keywordGraphemeCount={159} />,
    );
    const atBoundary = renderToStaticMarkup(
      <GlobalSearch {...props} query="boundary" keywordGraphemeCount={160} />,
    );

    expect(beforeBoundary).not.toContain("159 / 200");
    expect(atBoundary).toContain("160 / 200");
    expect(atBoundary).toMatch(/aria-describedby="[^"]+-keyword-count"/u);
  });
});

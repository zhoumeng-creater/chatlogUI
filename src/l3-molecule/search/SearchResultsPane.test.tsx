import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SearchResults } from "@l2/data-clerk/stores/useSearchStore";
import { SearchResultsPane } from "./SearchResultsPane";

const baseProps = {
  query: "",
  results: null,
  status: "idle" as const,
  loading: false,
  error: null,
  activeResultId: null,
  privacyOn: false,
  onOpenResult: vi.fn(),
  onLoadMore: vi.fn(),
  onRetry: vi.fn(),
  onClear: vi.fn(),
};

const results: SearchResults = {
  totalCount: 1,
  count: 1,
  limit: 20,
  offset: 0,
  messages: [
    {
      id: "session_synthetic_001-1001",
      localId: 1001,
      timestamp: 1_767_254_400,
      time: "2026-01-01 08:00",
      content: "Synthetic search result",
      sender: "Synthetic Sender",
      username: "session_synthetic_001",
      chat: "Synthetic Session",
    },
  ],
};

describe("SearchResultsPane", () => {
  it("renders a designed idle state instead of a blank results surface", () => {
    const html = renderToStaticMarkup(<SearchResultsPane {...baseProps} />);

    expect(html).toContain("输入关键词开始搜索");
    expect(html).toContain("不会向后端提交空白查询");
  });

  it("keeps result rows exposed as buttons inside list items", () => {
    const html = renderToStaticMarkup(
      <SearchResultsPane
        {...baseProps}
        query="Synthetic"
        results={results}
        status="ready"
      />,
    );

    expect(html).toContain('role="listitem"');
    expect(html).toContain("<button");
    expect(html).not.toContain('<button type="button" role="listitem"');
  });
});

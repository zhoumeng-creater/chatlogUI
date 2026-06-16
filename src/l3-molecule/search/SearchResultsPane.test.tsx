import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SearchResults } from "@l2/data-clerk/stores/useSearchStore";
import type { ActionableEmptyStateView } from "@l2/commander/actionableEmptyStateModel";
import type { SearchResultsPaneViewModel } from "./SearchResultsPane";
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
  onCancelSearch: vi.fn(),
  onSetActiveResultId: vi.fn(),
  onMoveHit: vi.fn(),
  viewModel: null,
  activeFilterChips: [],
  emptyStates: {
    notStarted: emptyState("search-not-started", "输入关键词开始搜索", "搜索不会向后端提交空白查询。", ["clear-filters"]),
    noResults: emptyState("search-no-results", "没有搜索结果", "换一个关键词或放宽范围。", ["clear-filters", "refresh"]),
    filteredNoResults: emptyState("filters-no-results", "筛选后没有结果", "当前筛选组合没有可显示内容。", ["clear-filters", "refresh"]),
  },
};

const results: SearchResults = {
  totalCount: 2,
  count: 2,
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
      type: "text",
    },
    {
      id: "session_synthetic_001-1002",
      localId: 1002,
      timestamp: 1_767_254_500,
      time: "2026-01-01 08:01",
      content: "Another Synthetic search result",
      sender: "Synthetic Sender",
      username: "session_synthetic_001",
      chat: "Synthetic Session",
      type: "text",
    },
  ],
};

const groupedViewModel: SearchResultsPaneViewModel = {
  sortLabel: "时间从新到旧",
  groupLabel: "按会话分组",
  navigator: {
    label: "第 2 / 2 条",
    hasPrevious: true,
    hasNext: false,
  },
  groups: [{
    key: "Synthetic Session",
    label: "Synthetic Session",
    items: [
      {
        message: results.messages[1],
        senderLabel: "Synthetic Sender",
        snippetSegments: [
          { text: "Another ", highlight: false },
          { text: "Synthetic", highlight: true },
          { text: " search result", highlight: false },
        ],
        active: false,
      },
      {
        message: results.messages[0],
        senderLabel: "Synthetic Sender",
        snippetSegments: [
          { text: "Synthetic", highlight: true },
          { text: " search result", highlight: false },
        ],
        active: true,
      },
    ],
  }],
};

const privacyViewModel: SearchResultsPaneViewModel = {
  sortLabel: "时间从新到旧",
  groupLabel: "不分组",
  navigator: {
    label: "第 1 / 2 条",
    hasPrevious: false,
    hasNext: true,
  },
  groups: [{
    key: "flat",
    label: null,
    items: results.messages.map((message, index) => ({
      message,
      senderLabel: "********* ******",
      snippetSegments: [{ text: "********* ****** ******", highlight: false }],
      active: index === 0,
    })),
  }],
};

describe("SearchResultsPane", () => {
  it("renders a designed idle state instead of a blank results surface", () => {
    const html = renderToStaticMarkup(<SearchResultsPane {...baseProps} />);

    expect(html).toContain("输入关键词开始搜索");
    expect(html).toContain("不会向后端提交空白查询");
  });

  it("omits current-conversation search from idle state when no conversation exists", () => {
    const html = renderToStaticMarkup(
      <SearchResultsPane
        {...baseProps}
        emptyStates={{
          ...baseProps.emptyStates,
          notStarted: emptyState("search-not-started", "输入关键词开始搜索", "搜索不会向后端提交空白查询。", ["clear-filters"]),
        }}
      />,
    );

    expect(html).toContain("输入关键词开始搜索");
    expect(html).not.toContain("搜索当前会话");
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

  it("renders snippets, highlight segments, sorting, grouping, and hit navigation", () => {
    const html = renderToStaticMarkup(
      <SearchResultsPane
        {...baseProps}
        query="Synthetic"
        results={results}
        status="ready"
        activeResultId="session_synthetic_001-1001"
        viewModel={groupedViewModel}
        activeFilterChips={[
          { id: "dateRange", label: "时间", value: "2026-01-01 之后", clearAction: "dateRange" },
        ]}
      />,
    );

    expect(html).toContain("排序：时间从新到旧");
    expect(html).toContain("分组：按会话分组");
    expect(html).toContain("时间：2026-01-01 之后");
    expect(html).toContain("Synthetic Session");
    expect(html).toContain("<mark");
    expect(html).toContain("Synthetic");
    expect(html).toContain("搜索命中导航");
    expect(html).toContain("下一条命中");
    expect(html).toContain('tabindex="0"');
  });

  it("keeps privacy mode snippets masked while preserving counts and result structure", () => {
    const html = renderToStaticMarkup(
      <SearchResultsPane
        {...baseProps}
        query="Synthetic"
        results={results}
        status="ready"
        privacyOn
        viewModel={privacyViewModel}
      />,
    );

    expect(html).toContain("已加载 2 / 共 2");
    expect(html).toContain("********* ****** ******");
    expect(html).not.toContain("Synthetic search result");
    expect(html).not.toContain("Synthetic Sender");
  });

  it("shows a visible cancellable loading state without clearing stable results", () => {
    const html = renderToStaticMarkup(
      <SearchResultsPane
        {...baseProps}
        query="Synthetic"
        results={results}
        status="loading"
        loading
        viewModel={groupedViewModel}
      />,
    );

    expect(html).toContain("正在搜索");
    expect(html).toContain("取消搜索");
    expect(html).toContain("<mark>Synthetic</mark>");
    expect(html).toContain("search result");
  });

  it("keeps loaded results visible after cancelling an in-progress search", () => {
    const html = renderToStaticMarkup(
      <SearchResultsPane
        {...baseProps}
        query="Synthetic"
        results={results}
        status="cancelled"
        viewModel={groupedViewModel}
      />,
    );

    expect(html).toContain("搜索已取消");
    expect(html).toContain("已保留 2 / 共 2");
    expect(html).toContain("search result");
  });
});

function emptyState(
  id: ActionableEmptyStateView["id"],
  title: string,
  reason: string,
  actions: Array<"clear-filters" | "refresh">,
): ActionableEmptyStateView {
  return {
    id,
    title,
    reason,
    description: "可以先调整范围、消息类型或日期筛选，再执行搜索。",
    actions: actions.map((actionId) => ({
      id: actionId,
      label: actionId === "refresh" ? "重新搜索" : "清除筛选",
      variant: actionId === "refresh" ? "ghost" : "secondary",
      disabled: false,
      disabledReason: null,
    })),
  };
}

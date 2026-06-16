import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ActionableEmptyStateView } from "@l2/commander/actionableEmptyStateModel";
import { SnsModule, type SnsModuleViewModel } from "./SnsModule";
import type { AdaptedSnsNotification, AdaptedSnsPost } from "./snsTypes";

describe("SnsModule", () => {
  it("keeps available SNS content visible when notifications fail", () => {
    const html = renderToStaticMarkup(
      <SnsModule
        {...baseProps()}
        status="partial"
        error="部分朋友圈数据加载失败"
        view={{
          ...viewModel(),
          timelinePosts: [post("post-1")],
          summary: {
            ...viewModel().summary,
            feedCount: 1,
            visibleFeedCount: 1,
          },
          errorCopy: "部分朋友圈数据加载失败",
        }}
      />,
    );

    expect(html).toContain("部分朋友圈数据加载失败");
    expect(html).toContain("其他朋友圈内容仍可查看");
    expect(html).toContain("post-1 content");
    expect(html).not.toContain("朋友圈加载失败");
  });

  it("degrades notification-to-post navigation when the original post is not loaded", () => {
    const html = renderToStaticMarkup(
      <SnsModule
        {...baseProps()}
        activeTab="notifications"
        view={{
          ...viewModel(),
          notifications: [notification("note-1", "missing-post")],
          notificationTargetIds: [],
          summary: {
            ...viewModel().summary,
            notificationCount: 1,
          },
        }}
      />,
    );

    expect(html).toContain("原动态未在当前结果中");
    expect(html).toContain("刷新或调整筛选后再定位");
    expect(html).toContain("查看动态列表");
    expect(html).toContain('role="group"');
    expect(html).not.toContain("disabled=\"\"");
  });

  it("keeps filters progressively disclosed and renders a two-pane reading surface", () => {
    const html = renderToStaticMarkup(
      <SnsModule
        {...baseProps()}
        filtersDirty
        filterChips={[
          {
            id: "contentType",
            label: "类型",
            value: "图片",
            field: "contentType",
            capability: "local-only",
            clearable: true,
            ariaLabel: "类型：图片，本地筛选",
          },
        ]}
        view={{
          ...viewModel(),
          timelinePosts: [post("post-1")],
          selectedPost: post("post-1"),
          summary: { ...viewModel().summary, feedCount: 1, visibleFeedCount: 1 },
        }}
        selectedPostId="post-1"
      />,
    );

    expect(html).toContain("打开筛选");
    expect(html).toContain("筛选未应用");
    expect(html).toContain("sns-module__detail-panel");
    expect(html).toContain('role="complementary"');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('aria-modal="true"');
    expect(html).toContain("朋友圈详情");
    expect(html).not.toContain("sns-filter-drawer");
  });

  it("renders a visible search field label instead of relying on placeholder-only copy", () => {
    const html = renderToStaticMarkup(
      <SnsModule
        {...baseProps()}
        activeTab="search"
        searchQuery="synthetic"
        view={{
          ...viewModel(),
          searchResults: [post("post-1")],
          summary: { ...viewModel().summary, searchCount: 1 },
          emptyCopy: "没有匹配的朋友圈结果",
        }}
      />,
    );

    expect(html).toContain("搜索朋友圈");
    expect(html).toContain('class="sns-search-panel__label"');
    expect(html).toContain('placeholder="输入关键词"');
  });

  it("uses shared actionable empty states for empty SNS views", () => {
    const html = renderToStaticMarkup(
      <SnsModule
        {...baseProps()}
        filterChips={[
          {
            id: "contentType",
            label: "类型",
            value: "图片",
            field: "contentType",
            capability: "local-only",
            clearable: true,
            ariaLabel: "类型：图片，本地筛选",
          },
        ]}
        view={{
          ...viewModel(),
          emptyCopy: "暂无朋友圈动态",
        }}
      />,
    );

    expect(html).toContain('data-empty-state="sns-empty"');
    expect(html).toContain("暂无朋友圈动态");
    expect(html).toContain("清除筛选");
    expect(html).toContain("刷新朋友圈");
  });
});

function baseProps() {
  return {
    view: viewModel(),
    status: "ready" as const,
    searchStatus: "idle" as const,
    activeTab: "timeline" as const,
    filters: {
      user: "",
      since: "",
      until: "",
      contentType: "all" as const,
      mediaOnly: false,
      includeRead: false,
      limit: 50,
    },
    draftFilters: {
      user: "",
      since: "",
      until: "",
      contentType: "all" as const,
      mediaOnly: false,
      includeRead: false,
    },
    filterChips: [],
    filtersDirty: false,
    filterDrawerOpen: false,
    filterError: null,
    density: "comfortable" as const,
    searchQuery: "",
    error: null,
    searchError: null,
    selectedPostId: null,
    privacyOn: false,
    externalOpenPrompt: null,
    externalOpenError: null,
    emptyStates: {
      timeline: emptyState("sns-empty", "暂无朋友圈动态"),
      search: emptyState("search-no-results", "没有匹配的朋友圈结果"),
      notifications: emptyState("sns-empty", "暂无朋友圈通知", [
        {
          id: "refresh",
          label: "刷新朋友圈",
          variant: "secondary",
          disabled: false,
          disabledReason: null,
        },
        {
          id: "clear-filters",
          label: "查看动态列表",
          variant: "ghost",
          disabled: false,
          disabledReason: null,
        },
      ]),
    },
    onRefresh: vi.fn(),
    onRetry: vi.fn(),
    onLoadMore: vi.fn(),
    onTabChange: vi.fn(),
    onDraftFiltersChange: vi.fn(),
    onApplyFilters: vi.fn(),
    onResetFilters: vi.fn(),
    onClearFilter: vi.fn(),
    onFilterDrawerOpenChange: vi.fn(),
    onDensityChange: vi.fn(),
    onSearchQueryChange: vi.fn(),
    onSearch: vi.fn(),
    onClearSearch: vi.fn(),
    onSelectPost: vi.fn(),
    onRequestArticleOpen: vi.fn(),
    onConfirmExternalOpen: vi.fn(),
    onCancelExternalOpen: vi.fn(),
  };
}

function emptyState(
  id: "sns-empty" | "search-no-results",
  title: string,
  actions: ActionableEmptyStateView["actions"] = [
    {
      id: "clear-filters" as const,
      label: "清除筛选",
      variant: "secondary" as const,
      disabled: false,
      disabledReason: null,
    },
    {
      id: "refresh" as const,
      label: "刷新朋友圈",
      variant: "ghost" as const,
      disabled: false,
      disabledReason: null,
    },
  ],
) {
  return {
    id,
    title,
    reason: "当前筛选没有返回动态、通知或搜索结果。",
    description: "可以清除筛选、刷新朋友圈，或查看诊断确认服务状态。",
    actions,
  };
}

function viewModel(): SnsModuleViewModel {
  return {
    title: "朋友圈",
    subtitle: "0 条动态 · 0 条通知",
    timelinePosts: [],
    searchResults: [],
    notifications: [],
    notificationTargetIds: [],
    selectedPost: null,
    filterView: {
      chips: [],
      dirty: false,
      summary: "当前显示全部朋友圈动态",
      exportScopeSummary: "朋友圈 · 动态 · 已加载 0 条 · 当前可见 0 条",
      applyLabel: "筛选已应用",
      resetLabel: "无筛选可重置",
    },
    summary: {
      feedCount: 0,
      visibleFeedCount: 0,
      notificationCount: 0,
      searchCount: 0,
      mediaCount: 0,
    },
    loadMore: {
      nextLimit: 100,
      label: "加载更多（增加到 100 条）",
    },
    emptyCopy: "暂无朋友圈动态",
    errorCopy: null,
  };
}

function post(id: string): AdaptedSnsPost {
  return {
    id,
    timestamp: 1,
    time: "2026-01-02 09:00",
    author: { username: `${id}-user`, displayName: `${id} author` },
    content: `${id} content`,
    contentType: "text",
    media: [],
    mediaCount: 0,
    locationSummary: "",
    article: null,
    finder: null,
    hasRawContent: false,
  };
}

function notification(id: string, feedId: string): AdaptedSnsNotification {
  return {
    id,
    type: "comment",
    timestamp: 1,
    time: "01-02 09:00",
    actor: { username: `${id}-actor`, displayName: `${id} actor` },
    content: "Synthetic notification",
    feedId,
    feedPreview: "Synthetic feed preview",
  };
}

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
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
    searchQuery: "",
    error: null,
    searchError: null,
    selectedPostId: null,
    privacyOn: false,
    externalOpenPrompt: null,
    externalOpenError: null,
    onRefresh: vi.fn(),
    onRetry: vi.fn(),
    onLoadMore: vi.fn(),
    onTabChange: vi.fn(),
    onFiltersChange: vi.fn(),
    onSearchQueryChange: vi.fn(),
    onSearch: vi.fn(),
    onClearSearch: vi.fn(),
    onSelectPost: vi.fn(),
    onRequestArticleOpen: vi.fn(),
    onConfirmExternalOpen: vi.fn(),
    onCancelExternalOpen: vi.fn(),
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

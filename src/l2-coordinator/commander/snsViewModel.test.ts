import { describe, expect, it } from "vitest";
import {
  buildSnsModuleView,
  deriveSnsBadge,
  type SnsStoreSnapshot,
} from "./snsViewModel";
import type { AdaptedSnsNotification, AdaptedSnsPost } from "@l4/network";

describe("snsViewModel", () => {
  it("derives filtered timeline, selected post, counts, and load-more copy", () => {
    const view = buildSnsModuleView(snapshot({
      feed: [post("p1", "image", 1), post("p2", "text", 0)],
      notifications: [notification("n1"), notification("n2")],
      selectedPostId: "p1",
      filters: {
        ...baseFilters(),
        contentType: "image",
        mediaOnly: true,
        limit: 50,
      },
    }), false);

    expect(view.timelinePosts.map((item) => item.id)).toEqual(["p1"]);
    expect(view.selectedPost?.id).toBe("p1");
    expect(view.summary).toMatchObject({
      feedCount: 2,
      visibleFeedCount: 1,
      notificationCount: 2,
      searchCount: 0,
      mediaCount: 1,
    });
    expect(view.loadMore).toMatchObject({
      nextLimit: 100,
      label: "加载更多（增加到 100 条）",
    });
  });

  it("masks privacy-sensitive title and selected metadata while preserving structure", () => {
    const view = buildSnsModuleView(snapshot({
      feed: [post("p1", "article", 0)],
      selectedPostId: "p1",
    }), true);

    expect(view.title).toBe("朋友圈");
    expect(view.subtitle).toBe("已隐藏朋友圈内容 · 1 条");
    expect(view.selectedPost?.author.displayName).toBe("已隐藏作者");
    expect(view.selectedPost?.content).toBe("已隐藏朋友圈内容");
    expect(view.selectedPost?.article?.title).toBe("已隐藏文章");
  });

  it("prioritizes status badges without implying unsupported offset pagination", () => {
    expect(deriveSnsBadge(snapshot({ status: "loading" }))).toBe("加载中");
    expect(deriveSnsBadge(snapshot({ status: "error" }))).toBe("异常");
    expect(deriveSnsBadge(snapshot({ notifications: [notification("n1")] }))).toBe("1通知");
    expect(deriveSnsBadge(snapshot({ feed: [post("p1", "image", 1), post("p2", "text", 0)] }))).toBe("2条");
    expect(deriveSnsBadge(snapshot({ status: "empty" }))).toBe("无数据");
  });
});

function snapshot(overrides: Partial<SnsStoreSnapshot>): SnsStoreSnapshot {
  return {
    status: "ready",
    searchStatus: "idle",
    activeTab: "timeline",
    feed: [],
    notifications: [],
    searchResults: [],
    selectedPostId: null,
    searchQuery: "",
    searchError: null,
    error: null,
    filters: baseFilters(),
    ...overrides,
  };
}

function baseFilters(): SnsStoreSnapshot["filters"] {
  return {
    user: "",
    since: "",
    until: "",
    contentType: "all",
    mediaOnly: false,
    includeRead: false,
    limit: 50,
  };
}

function post(
  id: string,
  contentType: AdaptedSnsPost["contentType"],
  mediaCount: number,
): AdaptedSnsPost {
  return {
    id,
    timestamp: 1,
    time: "2026-01-02 09:00",
    author: { username: `${id}-user`, displayName: `${id} author` },
    content: `${id} content`,
    contentType,
    media: [],
    mediaCount,
    locationSummary: "",
    article: contentType === "article" ? { title: `${id} article`, description: "", hasExternalUrl: true } : null,
    finder: null,
    hasRawContent: false,
  };
}

function notification(id: string): AdaptedSnsNotification {
  return {
    id,
    type: "like",
    timestamp: 1,
    time: "01-02 09:00",
    actor: { username: `${id}-actor`, displayName: `${id} actor` },
    content: "",
    feedId: `${id}-feed`,
    feedPreview: "",
  };
}

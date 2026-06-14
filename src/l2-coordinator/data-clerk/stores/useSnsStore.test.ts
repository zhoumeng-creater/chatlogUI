import { beforeEach, describe, expect, it } from "vitest";
import { useSnsStore } from "./useSnsStore";
import type { AdaptedSnsNotification, AdaptedSnsPost } from "@l4/network";

describe("useSnsStore", () => {
  beforeEach(() => {
    useSnsStore.getState().reset();
  });

  it("tracks timeline loading, empty, ready, and error transitions", () => {
    useSnsStore.getState().setLoading();
    expect(useSnsStore.getState()).toMatchObject({ status: "loading", error: null });

    useSnsStore.getState().setData({ feed: [], notifications: [] });
    expect(useSnsStore.getState()).toMatchObject({ status: "empty", feed: [] });

    useSnsStore.getState().setData({
      feed: [post("p1", "image")],
      notifications: [notification("n1")],
    });
    expect(useSnsStore.getState()).toMatchObject({
      status: "ready",
      feed: [{ id: "p1" }],
      notifications: [{ id: "n1" }],
    });

    useSnsStore.getState().setError("加载朋友圈失败");
    expect(useSnsStore.getState()).toMatchObject({ status: "error", error: "加载朋友圈失败" });
  });

  it("updates filters, active tab, selected post, and resets state", () => {
    useSnsStore.getState().updateFilters({
      user: "synthetic-author",
      contentType: "image",
      mediaOnly: true,
      limit: 100,
    });
    useSnsStore.getState().setActiveTab("search");
    useSnsStore.getState().setSearchQuery("synthetic query");
    useSnsStore.getState().selectPost("p1");

    expect(useSnsStore.getState()).toMatchObject({
      activeTab: "search",
      selectedPostId: "p1",
      searchQuery: "synthetic query",
      filters: {
        user: "synthetic-author",
        contentType: "image",
        mediaOnly: true,
        limit: 100,
      },
      draftFilters: {
        user: "synthetic-author",
        contentType: "image",
        mediaOnly: true,
      },
    });

    useSnsStore.getState().reset();
    expect(useSnsStore.getState()).toMatchObject({
      status: "idle",
      activeTab: "timeline",
      selectedPostId: null,
      searchQuery: "",
      filters: { contentType: "all", mediaOnly: false, limit: 50 },
      draftFilters: { user: "", since: "", until: "", contentType: "all", mediaOnly: false, includeRead: false },
      filterDrawerOpen: false,
    });
  });

  it("separates draft SNS filters from applied filters until apply is requested", () => {
    useSnsStore.getState().setDraftFilters({
      user: "synthetic-author",
      contentType: "article",
      mediaOnly: true,
    });

    expect(useSnsStore.getState()).toMatchObject({
      filters: { user: "", contentType: "all", mediaOnly: false },
      draftFilters: {
        user: "synthetic-author",
        contentType: "article",
        mediaOnly: true,
      },
      filtersDirty: true,
    });

    const changed = useSnsStore.getState().applyDraftFilters();

    expect(changed).toBe(true);
    expect(useSnsStore.getState()).toMatchObject({
      filters: {
        user: "synthetic-author",
        contentType: "article",
        mediaOnly: true,
        limit: 50,
      },
      filtersDirty: false,
    });
  });

  it("clears applied SNS chips and keeps draft filters synchronized", () => {
    useSnsStore.getState().updateFilters({
      user: "synthetic-author",
      contentType: "image",
      mediaOnly: true,
      includeRead: true,
      limit: 150,
    });

    useSnsStore.getState().clearAppliedFilter("contentType");
    useSnsStore.getState().clearAppliedFilter("includeRead");

    expect(useSnsStore.getState()).toMatchObject({
      filters: {
        user: "synthetic-author",
        contentType: "all",
        mediaOnly: true,
        includeRead: false,
        limit: 150,
      },
      draftFilters: {
        user: "synthetic-author",
        contentType: "all",
        mediaOnly: true,
        includeRead: false,
      },
      filtersDirty: false,
    });
  });

  it("tracks search loading, empty, ready, and error separately from timeline status", () => {
    useSnsStore.getState().setData({ feed: [post("p1", "text")], notifications: [] });
    useSnsStore.getState().setSearchLoading();
    expect(useSnsStore.getState()).toMatchObject({
      status: "ready",
      searchStatus: "loading",
    });

    useSnsStore.getState().setSearchResults([]);
    expect(useSnsStore.getState()).toMatchObject({ searchStatus: "empty", searchResults: [] });

    useSnsStore.getState().setSearchResults([post("p2", "video")]);
    useSnsStore.getState().selectPost("p2");
    expect(useSnsStore.getState()).toMatchObject({
      searchStatus: "ready",
      searchResults: [{ id: "p2" }],
      selectedPostId: "p2",
    });

    useSnsStore.getState().setSearchError("搜索朋友圈失败");
    expect(useSnsStore.getState()).toMatchObject({
      status: "ready",
      searchStatus: "error",
      searchError: "搜索朋友圈失败",
      searchResults: [],
      selectedPostId: null,
    });
  });

  it("ignores stale timeline and search completions after a newer request starts", () => {
    useSnsStore.getState().setLoading("feed-a");
    useSnsStore.getState().setLoading("feed-b");
    useSnsStore.getState().setData({ feed: [post("stale-feed", "text")], notifications: [] }, "feed-a");

    expect(useSnsStore.getState()).toMatchObject({
      status: "loading",
      feed: [],
      activeFeedRequestId: "feed-b",
    });

    useSnsStore.getState().setData({ feed: [post("fresh-feed", "image")], notifications: [] }, "feed-b");
    expect(useSnsStore.getState()).toMatchObject({
      status: "ready",
      feed: [{ id: "fresh-feed" }],
      activeFeedRequestId: null,
    });

    useSnsStore.getState().setSearchLoading("search-a");
    useSnsStore.getState().setSearchLoading("search-b");
    useSnsStore.getState().setSearchResults([post("stale-search", "text")], "search-a");

    expect(useSnsStore.getState()).toMatchObject({
      searchStatus: "loading",
      searchResults: [],
      activeSearchRequestId: "search-b",
    });

    useSnsStore.getState().setSearchError("搜索朋友圈失败", "search-b");
    expect(useSnsStore.getState()).toMatchObject({
      searchStatus: "error",
      searchError: "搜索朋友圈失败",
      activeSearchRequestId: null,
    });
  });

  it("keeps feed and notification partial failures independent", () => {
    useSnsStore.getState().setLoading("feed-a");
    useSnsStore.getState().setData(
      {
        feed: [post("fresh-feed", "image")],
        notifications: [],
      },
      "feed-a",
      {
        feed: { status: "ready", error: null },
        notifications: { status: "error", error: "通知加载失败" },
      },
    );

    expect(useSnsStore.getState()).toMatchObject({
      status: "partial",
      error: "部分朋友圈数据加载失败",
      feed: [{ id: "fresh-feed" }],
      notifications: [],
      endpointStatus: {
        feed: { status: "ready", error: null },
        notifications: { status: "error", error: "通知加载失败" },
      },
    });
  });

  it("invalidates active feed and search requests when filters change", () => {
    useSnsStore.getState().setLoading("feed-a");
    useSnsStore.getState().setSearchLoading("search-a");

    useSnsStore.getState().updateFilters({ user: "new-author" });

    useSnsStore.getState().setData({ feed: [post("stale-feed", "text")], notifications: [] }, "feed-a");
    useSnsStore.getState().setSearchResults([post("stale-search", "text")], "search-a");

    expect(useSnsStore.getState()).toMatchObject({
      activeFeedRequestId: null,
      activeSearchRequestId: null,
      feed: [],
      searchResults: [],
      filters: { user: "new-author" },
    });
  });
});

function post(id: string, contentType: AdaptedSnsPost["contentType"]): AdaptedSnsPost {
  return {
    id,
    timestamp: 1,
    time: "2026-01-02 09:00",
    author: { username: `${id}-user`, displayName: `${id} author` },
    content: `${id} content`,
    contentType,
    media: [],
    mediaCount: contentType === "text" ? 0 : 1,
    locationSummary: "",
    article: null,
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

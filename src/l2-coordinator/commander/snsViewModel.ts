import type {
  AdaptedSnsNotification,
  AdaptedSnsPost,
} from "@l4/network";
import type {
  SnsActiveTab,
  SnsContentTypeFilter,
  SnsFilters,
  SnsLoadStatus,
} from "@l2/data-clerk/stores/useSnsStore";

export interface SnsStoreSnapshot {
  status: SnsLoadStatus;
  searchStatus: SnsLoadStatus;
  activeTab: SnsActiveTab;
  feed: AdaptedSnsPost[];
  notifications: AdaptedSnsNotification[];
  searchResults: AdaptedSnsPost[];
  selectedPostId: string | null;
  searchQuery: string;
  error: string | null;
  searchError: string | null;
  filters: SnsFilters;
}

export interface SnsSummary {
  feedCount: number;
  visibleFeedCount: number;
  notificationCount: number;
  searchCount: number;
  mediaCount: number;
}

export interface SnsLoadMoreView {
  nextLimit: number;
  label: string;
}

export interface SnsModuleView {
  title: string;
  subtitle: string;
  timelinePosts: AdaptedSnsPost[];
  searchResults: AdaptedSnsPost[];
  notifications: AdaptedSnsNotification[];
  notificationTargetIds: string[];
  selectedPost: AdaptedSnsPost | null;
  summary: SnsSummary;
  loadMore: SnsLoadMoreView;
  emptyCopy: string;
  errorCopy: string | null;
}

export function buildSnsModuleView(
  state: SnsStoreSnapshot,
  privacyOn: boolean,
): SnsModuleView {
  const timelinePosts = filterTimelinePosts(state.feed, state.filters);
  const selectedPost = findSelectedPost(state);
  const summary = {
    feedCount: state.feed.length,
    visibleFeedCount: timelinePosts.length,
    notificationCount: state.notifications.length,
    searchCount: state.searchResults.length,
    mediaCount: timelinePosts.reduce((sum, post) => sum + post.mediaCount, 0),
  };

  return {
    title: "朋友圈",
    subtitle: privacyOn
      ? `已隐藏朋友圈内容 · ${state.feed.length.toLocaleString()} 条`
      : `${state.feed.length.toLocaleString()} 条动态 · ${state.notifications.length.toLocaleString()} 条通知`,
    timelinePosts: privacyOn ? timelinePosts.map(maskPost) : timelinePosts,
    searchResults: privacyOn ? state.searchResults.map(maskPost) : state.searchResults,
    notifications: privacyOn ? state.notifications.map(maskNotification) : state.notifications,
    notificationTargetIds: notificationTargetIds(state),
    selectedPost: privacyOn && selectedPost ? maskPost(selectedPost) : selectedPost,
    summary,
    loadMore: {
      nextLimit: state.filters.limit + 50,
      label: `加载更多（增加到 ${(state.filters.limit + 50).toLocaleString()} 条）`,
    },
    emptyCopy: emptyCopyFor(state),
    errorCopy: state.error ?? state.searchError,
  };
}

export function deriveSnsBadge(state: Pick<SnsStoreSnapshot, "status" | "feed" | "notifications">): string | undefined {
  if (state.status === "loading") return "加载中";
  if (state.status === "partial") return "部分可用";
  if (state.status === "error") return "异常";
  if (state.notifications.length > 0) return `${Math.min(state.notifications.length, 99)}通知`;
  if (state.feed.length > 0) return `${Math.min(state.feed.length, 99)}条`;
  if (state.status === "empty") return "无数据";
  return undefined;
}

function notificationTargetIds(state: SnsStoreSnapshot): string[] {
  return Array.from(new Set([...state.feed, ...state.searchResults].map((post) => post.id)));
}

function filterTimelinePosts(posts: AdaptedSnsPost[], filters: SnsFilters): AdaptedSnsPost[] {
  return posts.filter((post) => {
    if (filters.contentType !== "all" && post.contentType !== filters.contentType) return false;
    if (filters.mediaOnly && post.mediaCount === 0) return false;
    return true;
  });
}

function findSelectedPost(state: SnsStoreSnapshot): AdaptedSnsPost | null {
  if (!state.selectedPostId) return null;
  return (
    state.feed.find((post) => post.id === state.selectedPostId) ??
    state.searchResults.find((post) => post.id === state.selectedPostId) ??
    null
  );
}

function maskPost(post: AdaptedSnsPost): AdaptedSnsPost {
  return {
    ...post,
    author: {
      username: "",
      displayName: "已隐藏作者",
    },
    content: "已隐藏朋友圈内容",
    locationSummary: post.locationSummary ? "已隐藏位置" : "",
    article: post.article
      ? {
          ...post.article,
          title: "已隐藏文章",
          description: post.article.description ? "已隐藏文章摘要" : "",
          externalDomain: undefined,
          externalScheme: undefined,
        }
      : null,
    finder: post.finder
      ? {
          ...post.finder,
          nickname: "已隐藏视频号",
          description: post.finder.description ? "已隐藏视频号内容" : "",
        }
      : null,
  };
}

function maskNotification(notification: AdaptedSnsNotification): AdaptedSnsNotification {
  return {
    ...notification,
    actor: {
      username: "",
      displayName: "已隐藏互动者",
    },
    content: notification.content ? "已隐藏通知内容" : "",
    feedPreview: notification.feedPreview ? "已隐藏动态预览" : "",
  };
}

function emptyCopyFor(state: SnsStoreSnapshot): string {
  if (state.activeTab === "search") {
    return state.searchQuery.trim() ? "没有匹配的朋友圈结果" : "输入关键词后搜索朋友圈";
  }
  if (state.activeTab === "notifications") return "暂无朋友圈通知";
  return "暂无朋友圈动态";
}

export function contentTypeOptions(): Array<{ value: SnsContentTypeFilter; label: string }> {
  return [
    { value: "all", label: "全部" },
    { value: "text", label: "文本" },
    { value: "image", label: "图片" },
    { value: "video", label: "视频" },
    { value: "article", label: "文章" },
    { value: "finder", label: "视频号" },
    { value: "unknown", label: "其他" },
  ];
}

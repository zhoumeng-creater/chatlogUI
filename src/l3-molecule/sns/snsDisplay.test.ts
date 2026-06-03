import { describe, expect, it } from "vitest";
import {
  formatSnsArticleSummary,
  formatSnsAuthor,
  formatSnsContentPreview,
  formatSnsContentTypeLabel,
  formatSnsFinderSummary,
  formatSnsMediaTileLabel,
  formatSnsNotificationLabel,
  formatSnsProxyErrorCopy,
  formatSnsTime,
  buildSnsHighlightedSegments,
} from "./snsDisplay";
import type { AdaptedSnsMedia, AdaptedSnsNotification, AdaptedSnsPost } from "./snsTypes";

describe("snsDisplay", () => {
  it("masks authors, content, notification text, article, finder, and media labels in privacy mode", () => {
    const post = snsPost();
    const notification = snsNotification();
    const media = snsMedia();

    expect(formatSnsAuthor(post, true)).toBe("已隐藏作者");
    expect(formatSnsContentPreview(post, true)).toBe("已隐藏朋友圈内容");
    expect(formatSnsNotificationLabel(notification, true)).toBe("已隐藏朋友圈互动");
    expect(formatSnsArticleSummary(post, true)).toBe("已隐藏文章");
    expect(formatSnsFinderSummary(post, true)).toBe("已隐藏视频号");
    expect(formatSnsMediaTileLabel(media, true)).toBe("已隐藏媒体");
  });

  it("returns useful non-private operational labels when privacy is off", () => {
    const post = snsPost();
    const notification = snsNotification();

    expect(formatSnsAuthor(post, false)).toBe("Synthetic Author");
    expect(formatSnsContentPreview(post, false)).toBe("Synthetic private SNS content");
    expect(formatSnsNotificationLabel(notification, false)).toBe("Synthetic Actor 评论了动态");
    expect(formatSnsContentTypeLabel("finder")).toBe("视频号");
    expect(formatSnsProxyErrorCopy()).toBe("朋友圈媒体代理加载失败，可刷新后重试。");
  });

  it("preserves dates in privacy mode while keeping fallback copy safe", () => {
    expect(formatSnsTime("2026-01-02 09:00", true)).toBe("2026-01-02 09:00");
    expect(formatSnsTime("01-02 09:00", false)).toBe("01-02 09:00");
    expect(formatSnsTime("", true)).toBe("未知时间");
  });

  it("never returns proxy URLs, keys, tokens, or raw XML from media helpers", () => {
    const media = snsMedia();
    const labels = [
      formatSnsMediaTileLabel(media, false),
      formatSnsMediaTileLabel(media, true),
      formatSnsProxyErrorCopy(),
    ].join(" ");

    expect(labels).not.toContain("sns/media/proxy");
    expect(labels).not.toContain("sns-secret-key");
    expect(labels).not.toContain("token");
    expect(labels).not.toContain("<sns>");
  });

  it("builds plain text highlight segments without raw HTML", () => {
    const segments = buildSnsHighlightedSegments("Synthetic matched SNS matched content", "matched");

    expect(segments.filter((segment) => segment.highlighted).map((segment) => segment.text)).toEqual([
      "matched",
      "matched",
    ]);
    expect(JSON.stringify(segments)).not.toContain("<mark>");
    expect(JSON.stringify(segments)).not.toContain("dangerouslySetInnerHTML");
  });
});

function snsPost(): AdaptedSnsPost {
  return {
    id: "post-1",
    timestamp: 1,
    time: "2026-01-02 09:00",
    author: { username: "sns_author_private", displayName: "Synthetic Author" },
    content: "Synthetic private SNS content",
    contentType: "article",
    media: [snsMedia()],
    mediaCount: 1,
    locationSummary: "Synthetic POI",
    article: { title: "Synthetic Article", description: "Synthetic desc", hasExternalUrl: true },
    finder: { nickname: "Synthetic Finder", description: "Synthetic finder desc", mediaCount: 1, duration: "8秒" },
    hasRawContent: true,
  };
}

function snsNotification(): AdaptedSnsNotification {
  return {
    id: "notification-1",
    type: "comment",
    timestamp: 1,
    time: "01-02 09:00",
    actor: { username: "sns_actor_private", displayName: "Synthetic Actor" },
    content: "Synthetic notification content",
    feedId: "feed-1",
    feedPreview: "Synthetic feed preview",
  };
}

function snsMedia(): AdaptedSnsMedia {
  const media: AdaptedSnsMedia = {
    id: "media-1",
    kind: "image",
    redactedEndpointLabel: "sns:media-proxy",
  };
  Object.defineProperty(media, "sensitiveSrc", {
    value: "http://127.0.0.1:5030/api/v1/sns/media/proxy?url=x&key=sns-secret-key",
    enumerable: false,
  });
  return media;
}

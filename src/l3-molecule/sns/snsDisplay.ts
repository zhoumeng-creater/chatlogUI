import type {
  AdaptedSnsMedia,
  AdaptedSnsNotification,
  AdaptedSnsPost,
  SnsPostContentType,
} from "./snsTypes";

const CONTENT_TYPE_LABELS: Record<SnsPostContentType, string> = {
  text: "文本",
  image: "图片",
  video: "视频",
  article: "文章",
  finder: "视频号",
  unknown: "其他",
};

const MEDIA_KIND_LABELS: Record<AdaptedSnsMedia["kind"], string> = {
  image: "图片",
  video: "视频",
  live_photo: "Live Photo",
  unknown: "媒体",
};

export function formatSnsAuthor(post: Pick<AdaptedSnsPost, "author">, privacyOn: boolean): string {
  if (privacyOn) return "已隐藏作者";
  return post.author.displayName.trim() || post.author.username || "未知作者";
}

export function formatSnsContentPreview(
  post: Pick<AdaptedSnsPost, "content" | "contentType" | "mediaCount">,
  privacyOn: boolean,
): string {
  if (privacyOn) return "已隐藏朋友圈内容";
  const content = post.content.trim();
  if (content) return content;
  if (post.mediaCount > 0) return `${formatSnsContentTypeLabel(post.contentType)} ${post.mediaCount} 项`;
  return "无文字内容";
}

export function formatSnsNotificationLabel(
  notification: AdaptedSnsNotification,
  privacyOn: boolean,
): string {
  if (privacyOn) return "已隐藏朋友圈互动";
  const actor = notification.actor.displayName.trim() || notification.actor.username || "有人";
  if (notification.type === "like") return `${actor} 点赞了动态`;
  if (notification.type === "comment") return `${actor} 评论了动态`;
  return `${actor} 更新了互动`;
}

export function formatSnsContentTypeLabel(contentType: SnsPostContentType): string {
  return CONTENT_TYPE_LABELS[contentType] ?? CONTENT_TYPE_LABELS.unknown;
}

export function formatSnsMediaTileLabel(
  media: Pick<AdaptedSnsMedia, "kind">,
  privacyOn: boolean,
): string {
  if (privacyOn) return "已隐藏媒体";
  return MEDIA_KIND_LABELS[media.kind] ?? "媒体";
}

export function formatSnsArticleSummary(
  post: Pick<AdaptedSnsPost, "article">,
  privacyOn: boolean,
): string {
  if (!post.article) return "";
  if (privacyOn) return "已隐藏文章";
  return post.article.title || post.article.description || "文章";
}

export function formatSnsFinderSummary(
  post: Pick<AdaptedSnsPost, "finder">,
  privacyOn: boolean,
): string {
  if (!post.finder) return "";
  if (privacyOn) return "已隐藏视频号";
  return post.finder.nickname || post.finder.description || "视频号";
}

export function formatSnsLocationSummary(
  post: Pick<AdaptedSnsPost, "locationSummary">,
  privacyOn: boolean,
): string {
  if (!post.locationSummary) return "";
  return privacyOn ? "已隐藏位置" : post.locationSummary;
}

export function formatSnsProxyErrorCopy(): string {
  return "朋友圈媒体代理加载失败，可刷新后重试。";
}

export function formatSnsTime(value: string, _privacyOn: boolean): string {
  return value.trim() || "未知时间";
}

export interface SnsHighlightSegment {
  text: string;
  highlighted: boolean;
}

export function buildSnsHighlightedSegments(
  text: string,
  query: string,
): SnsHighlightSegment[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!text || !normalizedQuery) return [{ text, highlighted: false }];

  const segments: SnsHighlightSegment[] = [];
  const lowerText = text.toLowerCase();
  let cursor = 0;

  while (cursor < text.length) {
    const index = lowerText.indexOf(normalizedQuery, cursor);
    if (index === -1) {
      segments.push({ text: text.slice(cursor), highlighted: false });
      break;
    }

    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index), highlighted: false });
    }
    segments.push({
      text: text.slice(index, index + normalizedQuery.length),
      highlighted: true,
    });
    cursor = index + normalizedQuery.length;
  }

  return segments.filter((segment) => segment.text.length > 0);
}

import { validateChatlogServiceBaseUrl } from "./chatlogEndpoint";
import type {
  RawSnsArticle,
  RawSnsFeedResponse,
  RawSnsFinderFeed,
  RawSnsLocation,
  RawSnsMediaItem,
  RawSnsNotificationResponse,
  RawSnsNotificationRow,
  RawSnsPostRow,
  RawSnsSearchResponse,
} from "./chatlogRawTypes";

export type {
  RawSnsArticle,
  RawSnsFeedResponse,
  RawSnsFinderFeed,
  RawSnsLocation,
  RawSnsMediaItem,
  RawSnsNotificationResponse,
  RawSnsNotificationRow,
  RawSnsPostRow,
  RawSnsSearchResponse,
} from "./chatlogRawTypes";

export type SnsPostContentType = "text" | "image" | "video" | "article" | "finder" | "unknown";
export type SnsMediaKind = "image" | "video" | "live_photo" | "unknown";
export type SnsNotificationType = "like" | "comment" | "unknown";

export interface AdaptedSnsAuthor {
  username: string;
  displayName: string;
}

export interface AdaptedSnsMedia {
  id: string;
  kind: SnsMediaKind;
  redactedEndpointLabel: "sns:media-proxy";
  width?: number;
  height?: number;
  duration?: string;
  sensitiveSrc?: string;
  sensitiveThumbSrc?: string;
}

export interface AdaptedSnsArticle {
  title: string;
  description: string;
  hasExternalUrl: boolean;
}

export interface AdaptedSnsFinder {
  nickname: string;
  description: string;
  mediaCount: number;
  duration: string;
}

export interface AdaptedSnsPost {
  id: string;
  timestamp: number | null;
  time: string;
  author: AdaptedSnsAuthor;
  content: string;
  contentType: SnsPostContentType;
  media: AdaptedSnsMedia[];
  mediaCount: number;
  locationSummary: string;
  article: AdaptedSnsArticle | null;
  finder: AdaptedSnsFinder | null;
  hasRawContent: boolean;
}

export interface AdaptedSnsFeedResponse {
  count: number;
  posts: AdaptedSnsPost[];
}

export interface AdaptedSnsNotification {
  id: string;
  type: SnsNotificationType;
  timestamp: number | null;
  time: string;
  actor: AdaptedSnsAuthor;
  content: string;
  feedId: string;
  feedPreview: string;
}

export interface AdaptedSnsNotificationResponse {
  total: number;
  items: AdaptedSnsNotification[];
}

const LOCAL_PROXY_PATH = "/api/v1/sns/media/proxy";

export function adaptSnsFeedResponse(raw: RawSnsFeedResponse): AdaptedSnsFeedResponse {
  const rows = Array.isArray(raw.items) ? raw.items : [];
  const posts = rows.map(adaptSnsPost).filter((post) => post !== null);
  return {
    count: numberValue(raw.count, posts.length),
    posts,
  };
}

export function adaptSnsSearchResponse(raw: RawSnsSearchResponse): AdaptedSnsFeedResponse {
  return adaptSnsFeedResponse(raw);
}

export function adaptSnsNotificationsResponse(
  raw: RawSnsNotificationResponse,
): AdaptedSnsNotificationResponse {
  const rows = Array.isArray(raw.notifications) ? raw.notifications : [];
  const items = rows.map(adaptSnsNotification);
  return {
    total: numberValue(raw.total, items.length),
    items,
  };
}

export function isLocalSnsProxyUrl(value?: string | null): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);
    return validateChatlogServiceBaseUrl(url.origin).ok && url.pathname === LOCAL_PROXY_PATH;
  } catch {
    return false;
  }
}

function adaptSnsPost(raw: RawSnsPostRow, index: number): AdaptedSnsPost {
  const id = idValue(raw.id ?? raw.tid, `sns-post-${index}`);
  const media = adaptSnsMediaList(raw.media_list, id);
  const contentType = normalizeContentType(raw.content_type);
  const hasRawContent = Boolean(stringValue(raw.raw_content ?? raw.xml_content, ""));

  return {
    id,
    timestamp: nullableNumber(raw.timestamp ?? raw.create_time),
    time: stringValue(raw.time ?? raw.create_time_str, ""),
    author: {
      username: stringValue(raw.username ?? raw.user_name, ""),
      displayName: displayName(raw.display ?? raw.nickname ?? raw.username ?? raw.user_name),
    },
    content: stringValue(raw.content ?? raw.content_desc, ""),
    contentType,
    media,
    mediaCount: media.length,
    locationSummary: locationSummary(raw.location),
    article: adaptArticle(raw.article),
    finder: adaptFinder(raw.finder_feed),
    hasRawContent,
  };
}

function adaptSnsNotification(
  raw: RawSnsNotificationRow,
  index: number,
): AdaptedSnsNotification {
  const timestamp = nullableNumber(raw.timestamp);
  const feedId = idValue(raw.feed_id, "");
  return {
    id: `${feedId || "sns-notification"}-${timestamp ?? index}`,
    type: normalizeNotificationType(raw.type, raw.content),
    timestamp,
    time: stringValue(raw.time, ""),
    actor: {
      username: stringValue(raw.from_username, ""),
      displayName: displayName(raw.from_nickname ?? raw.from_username),
    },
    content: stringValue(raw.content, ""),
    feedId,
    feedPreview: stringValue(raw.feed_preview, ""),
  };
}

function adaptSnsMediaList(rawMedia: RawSnsMediaItem[] | null | undefined, postId: string) {
  if (!Array.isArray(rawMedia)) return [];

  return rawMedia.flatMap((media, index) => {
    const adapted = adaptSnsMedia(media, `${postId}-media-${index}`, normalizeMediaKind(media.type));
    const live = media.live_photo
      ? adaptSnsMedia(
          { ...media.live_photo, type: "live_photo" },
          `${postId}-media-${index}-live`,
          "live_photo",
        )
      : null;

    return [adapted, live].filter((item): item is AdaptedSnsMedia => item !== null);
  });
}

function adaptSnsMedia(
  raw: RawSnsMediaItem,
  id: string,
  kind: SnsMediaKind,
): AdaptedSnsMedia | null {
  const sensitiveSrc = firstLocalProxy(raw.proxy_url, raw.resolved_url, raw.url);
  const sensitiveThumbSrc = firstLocalProxy(raw.proxy_thumb_url, raw.resolved_thumb_url, raw.thumb, raw.thumb_url);

  if (!sensitiveSrc && !sensitiveThumbSrc) return null;

  const media: AdaptedSnsMedia = {
    id,
    kind,
    redactedEndpointLabel: "sns:media-proxy",
  };
  if (raw.width !== undefined) media.width = raw.width;
  if (raw.height !== undefined) media.height = raw.height;
  if (raw.duration) media.duration = raw.duration;
  defineSensitive(media, "sensitiveSrc", sensitiveSrc);
  defineSensitive(media, "sensitiveThumbSrc", sensitiveThumbSrc);
  return media;
}

function adaptArticle(raw: RawSnsArticle | null | undefined): AdaptedSnsArticle | null {
  if (!raw) return null;
  const title = stringValue(raw.title, "");
  const description = stringValue(raw.description, "");
  const hasExternalUrl = Boolean(stringValue(raw.url, "") || stringValue(raw.cover_url, ""));
  if (!title && !description && !hasExternalUrl) return null;
  return { title, description, hasExternalUrl };
}

function adaptFinder(raw: RawSnsFinderFeed | null | undefined): AdaptedSnsFinder | null {
  if (!raw) return null;
  const nickname = stringValue(raw.nickname, "");
  const description = stringValue(raw.desc, "");
  const mediaCount = numberValue(raw.media_count, 0);
  const duration = stringValue(raw.duration, "");
  if (!nickname && !description && mediaCount === 0 && !duration) return null;
  return {
    nickname,
    description,
    mediaCount,
    duration,
  };
}

function firstLocalProxy(...values: Array<string | null | undefined>): string | undefined {
  const value = values.find(isLocalSnsProxyUrl);
  return value ? normalizeLocalSnsProxyUrl(value) : undefined;
}

function normalizeLocalSnsProxyUrl(value: string): string {
  const url = new URL(value);
  url.hostname = "127.0.0.1";
  return url.toString();
}

function defineSensitive(
  target: AdaptedSnsMedia,
  key: "sensitiveSrc" | "sensitiveThumbSrc",
  value: string | undefined,
): void {
  if (!value) return;
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    configurable: false,
    writable: false,
  });
}

function normalizeContentType(value?: string | null): SnsPostContentType {
  const normalized = stringValue(value, "").toLowerCase();
  if (normalized === "text") return "text";
  if (normalized === "image") return "image";
  if (normalized === "video") return "video";
  if (normalized === "article") return "article";
  if (normalized === "finder") return "finder";
  return "unknown";
}

function normalizeMediaKind(value?: string | null): SnsMediaKind {
  const normalized = stringValue(value, "").toLowerCase();
  if (normalized === "image") return "image";
  if (normalized === "video") return "video";
  if (normalized === "live_photo") return "live_photo";
  return "unknown";
}

function normalizeNotificationType(value?: string | null, content?: string | null): SnsNotificationType {
  const normalized = stringValue(value, "").toLowerCase();
  if (normalized === "like") return "like";
  if (normalized === "comment") return "comment";
  return stringValue(content, "").trim() ? "comment" : "unknown";
}

function locationSummary(raw: RawSnsLocation | null | undefined): string {
  if (!raw) return "";
  const poi = stringValue(raw.poi_name, "");
  const city = stringValue(raw.city, "");
  const address = stringValue(raw.poi_address, "");
  if (poi && city) return `${poi} · ${city}`;
  return poi || city || address;
}

function displayName(value?: string | null): string {
  const display = stringValue(value, "").trim();
  return display || "未知作者";
}

function idValue(value: unknown, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

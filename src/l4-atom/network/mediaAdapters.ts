import { buildChatlogApiUrl, validateChatlogServiceBaseUrl } from "./chatlogEndpoint";
import type {
  RawFavoriteMessage,
  RawFavoritesResponse,
  RawHistoryMessage,
  RawMember,
  RawMembersResponse,
  RawNewMessage,
  RawNewMessagesResponse,
  RawUnreadResponse,
} from "./chatlogRawTypes";

export type MediaAttachmentKind = "image" | "video" | "voice" | "file" | "sticker" | "unknown";
export type MediaResourceKind = "image" | "video" | "voice" | "file" | "data";
export type MediaAttachmentSource = "history" | "favorite" | "new_message";

export interface AdaptedMediaAttachment {
  id: string;
  kind: MediaAttachmentKind;
  resourceKind: MediaResourceKind;
  resourceKey: string;
  label: string;
  fileName?: string;
  directUrl?: string;
  redactedEndpointLabel: string;
  source: MediaAttachmentSource;
  sourceLabel?: string;
  messageId?: string;
  localId?: number;
  timestamp?: number;
  time?: string;
  knownSizeBytes?: number;
}

export interface AdaptedFavoriteItem {
  id: string;
  chat: string;
  sender: string;
  time: string;
  type: string;
  content: string;
  attachments: AdaptedMediaAttachment[];
}

export interface AdaptedFavoritesResponse {
  count: number;
  items: AdaptedFavoriteItem[];
}

export interface AdaptedMediaMember {
  username: string;
  displayName: string;
}

export interface AdaptedMembersResponse {
  count: number;
  members: AdaptedMediaMember[];
}

export interface AdaptedUnreadChat {
  chat: string;
  count: number;
}

export interface AdaptedUnreadResponse {
  total: number;
  chats: AdaptedUnreadChat[];
}

export interface AdaptedNewMessage {
  id: string;
  chat: string;
  sender: string;
  time: string;
  content: string;
  attachments: AdaptedMediaAttachment[];
}

export interface AdaptedNewMessagesResponse {
  count: number;
  messages: AdaptedNewMessage[];
}

const KIND_LABELS: Record<MediaAttachmentKind, string> = {
  image: "图片",
  video: "视频",
  voice: "语音",
  file: "文件",
  sticker: "表情",
  unknown: "媒体",
};

export function adaptMediaAttachments(
  raw: RawHistoryMessage,
  source: MediaAttachmentSource = "history",
): AdaptedMediaAttachment[] {
  const explicitKind = normalizeAttachmentKind(raw.media_type ?? raw.type);
  const candidates = [
    ...keysFrom(raw.media_key),
    ...keysFrom(raw.image_key),
    ...keysFrom(raw.media_keys),
    ...keysFrom(raw.image_keys),
  ];

  const directUrl = safeDirectUrl(raw.media_url ?? raw.image_url);
  if (candidates.length === 0 && directUrl) {
    candidates.push({
      key: `${source}-${raw.local_id ?? raw.timestamp ?? "direct"}`,
      directUrl,
      resourceKind: resourceKindFor(explicitKind),
    });
  }

  if (candidates.length === 0 && (raw.media_path || raw.image_path)) {
    candidates.push({ key: "", resourceKind: "data" as MediaResourceKind });
  }

  return candidates.map((candidate, index) => {
    const kind = explicitKind;
    const resourceKind = candidate.resourceKind ?? resourceKindFor(kind);
    return {
      id: `${source}-${raw.local_id ?? raw.timestamp ?? "media"}-${index}`,
      kind,
      resourceKind,
      resourceKey: candidate.key,
      directUrl: candidate.directUrl,
      label: KIND_LABELS[kind],
      fileName: safeFileName(raw.file_name),
      redactedEndpointLabel: `media:${resourceKind}`,
      source,
      sourceLabel: sourceLabel(source),
      messageId: safeMessageId(raw),
      localId: raw.local_id,
      timestamp: raw.timestamp,
      time: raw.time ?? formatTimestamp(raw.timestamp),
    };
  });
}

export function buildMediaResourceUrl(
  attachment: Pick<AdaptedMediaAttachment, "directUrl" | "resourceKind" | "resourceKey">,
  serviceBaseUrl?: string,
): string {
  if (attachment.directUrl) return attachment.directUrl;
  if (!attachment.resourceKey) return "";
  return buildChatlogApiUrl(
    `/${attachment.resourceKind}/${encodeURIComponent(attachment.resourceKey)}`,
    serviceBaseUrl,
  );
}

export function adaptFavoriteResponse(raw: RawFavoritesResponse): AdaptedFavoritesResponse {
  const favorites = raw.favorites ?? raw.messages ?? [];
  return {
    count: raw.count ?? raw.total ?? favorites.length,
    items: favorites.map((favorite, index) => adaptFavorite(favorite, index)),
  };
}

export function adaptMembersResponse(raw: RawMembersResponse): AdaptedMembersResponse {
  const members = raw.members ?? [];
  return {
    count: raw.count ?? members.length,
    members: members.map(adaptMember),
  };
}

export function adaptUnreadResponse(raw: RawUnreadResponse): AdaptedUnreadResponse {
  const chats = (raw.chats ?? []).map((item) => ({
    chat: item.chat,
    count: item.count ?? item.unread ?? 0,
  }));

  return {
    total: raw.total ?? raw.count ?? raw.unread ?? chats.reduce((sum, item) => sum + item.count, 0),
    chats,
  };
}

export function adaptNewMessagesResponse(raw: RawNewMessagesResponse): AdaptedNewMessagesResponse {
  const messages = raw.messages ?? [];
  return {
    count: raw.count ?? raw.total ?? messages.length,
    messages: messages.map((message, index) => adaptNewMessage(message, index)),
  };
}

function adaptFavorite(raw: RawFavoriteMessage, index: number): AdaptedFavoriteItem {
  return {
    id: raw.id ?? `favorite-${raw.local_id ?? raw.timestamp ?? index}`,
    chat: raw.chat ? "[chat]" : "",
    sender: raw.sender ?? "unknown",
    time: raw.time ?? "",
    type: raw.type ?? "text",
    content: raw.content ?? "",
    attachments: adaptMediaAttachments(raw, "favorite"),
  };
}

function adaptMember(raw: RawMember): AdaptedMediaMember {
  return {
    username: raw.username,
    displayName: raw.display || raw.remark || raw.nickname || raw.alias || raw.username,
  };
}

function adaptNewMessage(raw: RawNewMessage, index: number): AdaptedNewMessage {
  return {
    id: raw.id ?? `new-${raw.local_id ?? raw.timestamp ?? index}`,
    chat: raw.chat ?? raw.username ?? "",
    sender: raw.sender ?? "unknown",
    time: raw.time ?? "",
    content: raw.content ?? "",
    attachments: adaptMediaAttachments(raw, "new_message"),
  };
}

function normalizeAttachmentKind(value?: string): MediaAttachmentKind {
  const normalized = value?.toLowerCase();
  if (normalized === "3" || normalized === "image" || normalized === "img") return "image";
  if (normalized === "4" || normalized === "video") return "video";
  if (normalized === "34" || normalized === "voice" || normalized === "audio") return "voice";
  if (normalized === "6" || normalized === "file") return "file";
  if (normalized === "47" || normalized === "sticker" || normalized === "emoji") return "sticker";
  return "unknown";
}

function resourceKindFor(kind: MediaAttachmentKind): MediaResourceKind {
  if (kind === "video") return "video";
  if (kind === "voice") return "voice";
  if (kind === "file") return "file";
  if (kind === "image" || kind === "sticker") return "image";
  return "data";
}

function sourceLabel(source: MediaAttachmentSource): string {
  if (source === "favorite") return "收藏";
  if (source === "new_message") return "增量消息";
  return "当前会话";
}

function safeMessageId(raw: RawHistoryMessage): string | undefined {
  const value = (raw as { id?: string | number }).id ?? raw.seq;
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text && !containsUnsafeMediaDisplayText(text) ? text : undefined;
}

function safeFileName(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || containsUnsafeMediaDisplayText(trimmed)) return undefined;
  const fileName = trimmed.split(/[\\/]/).filter(Boolean).pop() ?? trimmed;
  return containsUnsafeMediaDisplayText(fileName) ? undefined : fileName;
}

function formatTimestamp(value?: number): string | undefined {
  if (!value || !Number.isFinite(value)) return undefined;
  const date = new Date(value > 1_000_000_000_000 ? value : value * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function containsUnsafeMediaDisplayText(value: string): boolean {
  return [
    /[A-Z]:[\\/]+Users[\\/]+/i,
    /(?:WeChat Files|微信文件|微信 Files)/i,
    /wxid_[A-Za-z0-9_-]+/i,
    /\bdata[_-]?key\b/i,
    /\bapi[_-]?key\b/i,
    /\btoken\b/i,
    /\bsecret\b/i,
  ].some((pattern) => pattern.test(value));
}

function keysFrom(value?: string | string[]): Array<{ key: string; resourceKind?: MediaResourceKind; directUrl?: string }> {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item) => item.trim().length > 0).map((item) => ({ key: item }));
}

function safeDirectUrl(value?: string): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      validateChatlogServiceBaseUrl(url.origin).ok
    ) {
      return url.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

import type { RawHistoryMessage } from "./chatlogRawTypes";

export type MediaAttachmentKind = "image" | "video" | "voice" | "file" | "sticker" | "unknown";
export type MediaAttachmentSource = "history" | "search" | "favorite" | "incremental";
export type MediaEndpointFamily = "image" | "video" | "voice" | "file";

export interface MediaFetchReference {
  endpointFamily: MediaEndpointFamily;
  key: string;
}

export interface MediaAttachment {
  id: string;
  kind: MediaAttachmentKind;
  source: MediaAttachmentSource;
  endpointFamily: MediaEndpointFamily;
  label: string;
  fetchRef: MediaFetchReference;
}

const KIND_LABELS: Record<MediaAttachmentKind, string> = {
  image: "图片",
  video: "视频",
  voice: "语音",
  file: "文件",
  sticker: "表情",
  unknown: "媒体",
};

export function getMediaAttachmentKindLabel(kind: MediaAttachmentKind): string {
  return KIND_LABELS[kind];
}

export function adaptMediaAttachments(
  raw: RawHistoryMessage,
  source: MediaAttachmentSource,
): MediaAttachment[] {
  const kind = inferMediaKind(raw);
  if (!kind) return [];

  const endpointFamily = endpointFamilyForKind(kind);
  const keys = collectMediaKeys(raw, kind);

  if (keys.length === 0) {
    return [
      createAttachment({
        raw,
        source,
        kind,
        endpointFamily,
        key: "",
        index: 0,
        total: 1,
      }),
    ];
  }

  return keys.map((key, index) =>
    createAttachment({
      raw,
      source,
      kind,
      endpointFamily,
      key,
      index,
      total: keys.length,
    }),
  );
}

function createAttachment(input: {
  raw: RawHistoryMessage;
  source: MediaAttachmentSource;
  kind: MediaAttachmentKind;
  endpointFamily: MediaEndpointFamily;
  key: string;
  index: number;
  total: number;
}): MediaAttachment {
  const localId = input.raw.local_id ?? "no-local-id";
  const base = input.raw.username ?? input.raw.chat ?? "unknown-chat";
  const suffix = input.key ? safeAttachmentKey(input.key) : "missing-key";
  const labelBase = getMediaAttachmentKindLabel(input.kind);

  return {
    id: `${base}-${localId}-${input.kind}-${input.index}-${suffix}`,
    kind: input.kind,
    source: input.source,
    endpointFamily: input.endpointFamily,
    label: input.total > 1 ? `${labelBase} ${input.index + 1}` : labelBase,
    fetchRef: {
      endpointFamily: input.endpointFamily,
      key: input.key,
    },
  };
}

function inferMediaKind(raw: RawHistoryMessage): MediaAttachmentKind | null {
  const value = String(raw.media_type || raw.type || "").toLowerCase();

  if (value === "3" || value.includes("image")) return "image";
  if (value === "4" || value.includes("video")) return "video";
  if (value === "34" || value.includes("voice") || value.includes("audio")) return "voice";
  if (value === "6" || value.includes("file")) return "file";
  if (value === "47" || value.includes("sticker") || value.includes("emoji")) return "sticker";

  return raw.media_url || raw.image_url || raw.media_key || raw.image_key ? "unknown" : null;
}

function endpointFamilyForKind(kind: MediaAttachmentKind): MediaEndpointFamily {
  if (kind === "video") return "video";
  if (kind === "voice") return "voice";
  if (kind === "file") return "file";
  return "image";
}

function collectMediaKeys(raw: RawHistoryMessage, kind: MediaAttachmentKind): string[] {
  const keys = [
    ...(kind === "image" || kind === "sticker" ? raw.image_keys ?? [] : []),
    ...(raw.media_keys ?? []),
    kind === "image" || kind === "sticker" ? raw.image_key : undefined,
    raw.media_key,
  ].filter((key): key is string => Boolean(key?.trim()));

  return Array.from(new Set(keys));
}

function safeAttachmentKey(key: string): string {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

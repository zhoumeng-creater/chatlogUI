import type {
  MediaAttachment,
  MediaFavoriteItem,
  MediaMember,
} from "@l2/data-clerk/stores/useMediaStore";

export interface MediaCountSummary {
  label: string;
  count: number;
}

const FALLBACK_ATTACHMENT_LABELS: Record<MediaAttachment["kind"], string> = {
  image: "图片",
  video: "视频",
  voice: "语音",
  file: "文件",
  sticker: "表情",
  unknown: "媒体",
};

export function formatAttachmentLabel(
  attachment: Pick<MediaAttachment, "kind" | "label">,
  privacyOn: boolean,
): string {
  if (privacyOn) return "已隐藏媒体";
  return attachment.label || FALLBACK_ATTACHMENT_LABELS[attachment.kind] || "媒体";
}

export function summarizeMediaCounts(attachments: MediaAttachment[]): MediaCountSummary[] {
  const counts = new Map<MediaAttachment["kind"], MediaCountSummary>();

  for (const attachment of attachments) {
    const label = FALLBACK_ATTACHMENT_LABELS[attachment.kind] || "媒体";
    const current = counts.get(attachment.kind);
    if (current) {
      current.count += 1;
    } else {
      counts.set(attachment.kind, { label, count: 1 });
    }
  }

  return Array.from(counts.values());
}

export function formatFavoritePreview(favorite: MediaFavoriteItem, privacyOn: boolean): string {
  if (privacyOn) return "已隐藏收藏内容";

  const content = favorite.content.trim();
  if (content) return content;

  const attachmentLabels = summarizeMediaCounts(favorite.attachments)
    .map((item) => `${item.label} ${item.count}`)
    .join("、");
  return attachmentLabels || favorite.type || "收藏";
}

export function formatMemberDisplayName(member: MediaMember, privacyOn: boolean): string {
  if (privacyOn) return "已隐藏成员";

  const displayName = member.displayName.trim();
  return displayName || member.username || "未命名成员";
}

export function formatMediaEmptyCopy(tabLabel: string): string {
  return `暂无${tabLabel}数据`;
}

export function formatMediaAvailability(attachment: Pick<MediaAttachment, "resourceKey" | "directUrl">): string {
  return attachment.resourceKey || attachment.directUrl ? "可预览" : "资源缺失";
}

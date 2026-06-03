import type { MediaAttachment } from "@l4/network/mediaAdapters";
import type { MediaPreviewStatus } from "@l2/data-clerk/stores/useMediaStore";

export function formatAttachmentPrimaryText(
  attachment: Pick<MediaAttachment, "label">,
  privacyOn: boolean,
): string {
  return privacyOn ? `媒体：${attachment.label}` : attachment.label;
}

export function formatAttachmentAriaLabel(
  attachment: Pick<MediaAttachment, "label">,
  privacyOn: boolean,
): string {
  return privacyOn
    ? `打开已隐藏媒体，类型${attachment.label}`
    : `打开${attachment.label}媒体`;
}

export function formatMediaPreviewStateLabel(
  status: MediaPreviewStatus,
  title: string,
): string {
  if (status === "loading") return `正在加载${title}`;
  if (status === "error") return `${title}加载失败`;
  if (status === "ready") return `${title}预览`;
  return "媒体预览";
}

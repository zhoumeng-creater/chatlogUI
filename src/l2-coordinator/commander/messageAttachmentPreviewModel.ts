import type { MediaAttachment } from "@l2/data-clerk/stores/useMediaStore";
import { mediaKindLabel } from "./mediaActionModel";

export interface MessageAttachmentPreviewModel {
  id: string;
  label: string;
  kind: MediaAttachment["kind"];
  kindLabel: string;
  resourceUrl: string;
  canPreview: boolean;
  disabledReason: string | null;
}

export function buildMessageAttachmentPreviewModel({
  attachment,
  resourceUrl,
  privacyOn,
}: {
  attachment: MediaAttachment;
  resourceUrl: string;
  privacyOn: boolean;
}): MessageAttachmentPreviewModel {
  const kindLabel = mediaKindLabel(attachment.kind);
  const disabledReason = getPreviewDisabledReason(attachment, resourceUrl);
  return {
    id: attachment.id,
    label: privacyOn ? kindLabel : attachment.fileName || attachment.label || kindLabel,
    kind: attachment.kind,
    kindLabel,
    resourceUrl,
    canPreview: !disabledReason,
    disabledReason,
  };
}

function getPreviewDisabledReason(
  attachment: MediaAttachment,
  resourceUrl: string,
): string | null {
  if (!resourceUrl) return "当前附件没有可预览资源。";
  if (attachment.kind === "file" || attachment.kind === "unknown") {
    return "此类附件暂不支持内嵌预览。";
  }
  return null;
}

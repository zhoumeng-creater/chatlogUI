import { X } from "lucide-react";
import { IconButton, Typography } from "@l4/ui";
import type { MediaAttachment } from "@l2/data-clerk/stores/useMediaStore";
import { formatAttachmentLabel } from "./mediaDisplay";

interface MediaPreviewSheetProps {
  attachment: MediaAttachment | null;
  resourceUrl: string;
  privacyOn: boolean;
  onClose: () => void;
}

export function MediaPreviewSheet({
  attachment,
  resourceUrl,
  privacyOn,
  onClose,
}: MediaPreviewSheetProps) {
  if (!attachment) return null;

  const label = formatAttachmentLabel(attachment, privacyOn);

  return (
    <div className="media-preview-sheet" role="dialog" aria-modal="false" aria-label="媒体预览">
      <div className="media-preview-sheet__header">
        <Typography variant="label" weight={700}>
          {label}
        </Typography>
        <IconButton
          icon={<X size={14} />}
          label="关闭媒体预览"
          tooltip="关闭媒体预览"
          tooltipPlacement="left"
          size="sm"
          onClick={onClose}
        />
      </div>
      <div className="media-preview-sheet__body">
        {renderPreview(attachment, resourceUrl, label)}
      </div>
    </div>
  );
}

function renderPreview(attachment: MediaAttachment, resourceUrl: string, label: string) {
  if (!resourceUrl) {
    return (
      <Typography variant="body" color="var(--text-secondary)">
        当前附件没有可用预览。
      </Typography>
    );
  }

  if (attachment.kind === "image" || attachment.kind === "sticker") {
    return <img className="media-preview-sheet__image" src={resourceUrl} alt={label} />;
  }

  if (attachment.kind === "video") {
    return (
      <video className="media-preview-sheet__media" src={resourceUrl} controls preload="metadata" />
    );
  }

  if (attachment.kind === "voice") {
    return <audio className="media-preview-sheet__audio" src={resourceUrl} controls preload="metadata" />;
  }

  return (
    <a className="media-preview-sheet__link" href={resourceUrl} target="_blank" rel="noreferrer">
      打开附件
    </a>
  );
}

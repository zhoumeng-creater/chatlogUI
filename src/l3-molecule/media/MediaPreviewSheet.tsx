import { useEffect, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import {
  focusInitialOverlayTarget,
  getOverlayDialogProps,
  IconButton,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
  Typography,
  type FocusTarget,
} from "@l4/ui";
import type { MediaAttachment } from "@l2/data-clerk/stores/useMediaStore";
import { formatAttachmentLabel } from "./mediaDisplay";

const MEDIA_PREVIEW_TITLE_ID = "media-preview-title";

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
  const sheetRef = useRef<HTMLDivElement>(null);
  const restoreTargetRef = useRef<FocusTarget | null>(null);
  const isOpen = Boolean(attachment);

  useEffect(() => {
    if (!isOpen) return undefined;

    restoreTargetRef.current = document.activeElement as FocusTarget | null;
    focusInitialOverlayTarget(sheetRef.current);

    return () => {
      restoreFocusTarget(restoreTargetRef.current);
      restoreTargetRef.current = null;
    };
  }, [isOpen]);

  if (!attachment) return null;

  const label = formatAttachmentLabel(attachment, privacyOn);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (trapOverlayFocus(sheetRef.current, document.activeElement, event)) return;
    if (shouldCloseOverlayOnKey(event.key, { dismissible: true })) {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      {...getOverlayDialogProps({ titleId: MEDIA_PREVIEW_TITLE_ID })}
      ref={sheetRef}
      className="media-preview-sheet"
      onKeyDown={handleKeyDown}
    >
      <div className="media-preview-sheet__header">
        <Typography id={MEDIA_PREVIEW_TITLE_ID} variant="label" weight={700}>
          {label}
        </Typography>
        <IconButton
          icon={<X size={16} />}
          label="关闭媒体预览"
          tooltip="关闭媒体预览"
          tooltipPlacement="left"
          size="lg"
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
    <Typography variant="body" color="var(--text-secondary)">
      文件附件暂不支持直接预览。
    </Typography>
  );
}

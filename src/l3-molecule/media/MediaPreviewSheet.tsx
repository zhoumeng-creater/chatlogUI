import { useEffect, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import type { MediaActionModel } from "@l2/commander/mediaActionModel";
import {
  Button,
  focusInitialOverlayTarget,
  getOverlayDialogProps,
  IconButton,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
  Typography,
  type FocusTarget,
} from "@l4/ui";
import type { MediaAttachment, MediaResourceLoadStatus } from "@l2/data-clerk/stores/useMediaStore";
import { formatAttachmentLabel } from "./mediaDisplay";
import { MediaActionMenu } from "./MediaActionMenu";

const MEDIA_PREVIEW_TITLE_ID = "media-preview-title";

interface MediaPreviewSheetProps {
  attachment: MediaAttachment | null;
  resourceUrl: string;
  resourceStatus?: MediaResourceLoadStatus;
  privacyOn: boolean;
  actionModel?: MediaActionModel | null;
  onClose: () => void;
  onCopySummary?: (attachment: MediaAttachment) => void;
  onLocateSource?: (attachment: MediaAttachment) => void;
  onRequestOpenOriginal?: (attachment: MediaAttachment) => void;
  onRetryResource?: (attachment: MediaAttachment) => void;
  onResourceError?: (attachment: MediaAttachment) => void;
}

export function MediaPreviewSheet({
  attachment,
  resourceUrl,
  resourceStatus = "idle",
  privacyOn,
  actionModel = null,
  onClose,
  onCopySummary = () => undefined,
  onLocateSource = () => undefined,
  onRequestOpenOriginal = () => undefined,
  onRetryResource = () => undefined,
  onResourceError = () => undefined,
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
      {actionModel && (
        <div className="media-preview-sheet__actions">
          <MediaActionMenu
            attachment={attachment}
            model={createPreviewSheetActionModel(actionModel)}
            selected={false}
            onPreview={() => undefined}
            onCopySummary={onCopySummary}
            onLocateSource={onLocateSource}
            onRequestOpenOriginal={onRequestOpenOriginal}
            onRetryResource={onRetryResource}
            onToggleSelected={() => undefined}
          />
        </div>
      )}
      <div className="media-preview-sheet__body">
        {renderPreview(attachment, resourceUrl, resourceStatus, label, onResourceError, onRetryResource)}
      </div>
    </div>
  );
}

function createPreviewSheetActionModel(model: MediaActionModel): MediaActionModel {
  return {
    ...model,
    actions: model.actions.map((action) =>
      action.id === "preview"
        ? {
            ...action,
            enabled: false,
            disabledReason: "当前已在预览中。",
          }
        : action,
    ),
  };
}

function renderPreview(
  attachment: MediaAttachment,
  resourceUrl: string,
  resourceStatus: MediaResourceLoadStatus,
  label: string,
  onResourceError: (attachment: MediaAttachment) => void,
  onRetryResource: (attachment: MediaAttachment) => void,
) {
  if (resourceStatus === "error") {
    return (
      <div className="media-preview-sheet__fallback" role="alert">
        <Typography variant="body" color="var(--text-secondary)">
          预览资源加载失败。
        </Typography>
        <Button variant="secondary" size="sm" onClick={() => onRetryResource(attachment)}>
          重试资源
        </Button>
      </div>
    );
  }

  if (!resourceUrl) {
    return (
      <Typography variant="body" color="var(--text-secondary)">
        当前附件没有可用预览。
      </Typography>
    );
  }

  if (attachment.kind === "image" || attachment.kind === "sticker") {
    return <img className="media-preview-sheet__image" src={resourceUrl} alt={label} onError={() => onResourceError(attachment)} />;
  }

  if (attachment.kind === "video") {
    return (
      <video className="media-preview-sheet__media" src={resourceUrl} controls preload="metadata" onError={() => onResourceError(attachment)} />
    );
  }

  if (attachment.kind === "voice") {
    return <audio className="media-preview-sheet__audio" src={resourceUrl} controls preload="metadata" onError={() => onResourceError(attachment)} />;
  }

  return (
    <Typography variant="body" color="var(--text-secondary)">
      文件附件暂不支持直接预览。
    </Typography>
  );
}

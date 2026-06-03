import { X } from "lucide-react";
import { Button, IconButton, Spinner, Typography } from "@l4/ui";
import type { MediaPreviewState } from "@l2/data-clerk/stores/useMediaStore";
import { formatMediaPreviewStateLabel } from "./mediaDisplay";

interface MediaPreviewSheetProps {
  preview: MediaPreviewState;
  privacyOn: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export function MediaPreviewSheet({
  preview,
  privacyOn,
  onClose,
  onRetry,
}: MediaPreviewSheetProps) {
  if (preview.status === "idle") return null;

  const title = privacyOn ? `媒体：${preview.title}` : preview.title;

  return (
    <div className="media-preview" role="dialog" aria-modal="true" aria-label={formatMediaPreviewStateLabel(preview.status, preview.title)}>
      <div className="media-preview__sheet">
        <header className="media-preview__header">
          <Typography variant="label" weight={700}>
            {title}
          </Typography>
          <IconButton
            label="关闭媒体预览"
            tooltip="关闭"
            icon={<X size={16} />}
            onClick={onClose}
          />
        </header>
        <div className="media-preview__body">
          {preview.status === "loading" && (
            <Spinner size={24} label={formatMediaPreviewStateLabel("loading", preview.title)} />
          )}
          {preview.status === "error" && (
            <div className="workbench-error-state" role="alert">
              <Typography variant="label" weight={700}>
                {formatMediaPreviewStateLabel("error", preview.title)}
              </Typography>
              <Typography variant="body" color="var(--text-secondary)">
                {preview.error ?? "无法读取该媒体资源。"}
              </Typography>
              {onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  重试
                </Button>
              )}
            </div>
          )}
          {preview.status === "ready" && preview.objectUrl && (
            <MediaContent preview={preview} privacyOn={privacyOn} />
          )}
        </div>
      </div>
    </div>
  );
}

function MediaContent({
  preview,
  privacyOn,
}: {
  preview: MediaPreviewState;
  privacyOn: boolean;
}) {
  if (privacyOn) {
    return (
      <div className="media-preview__masked">
        <Typography variant="label" weight={700}>
          媒体内容已隐藏
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          关闭隐私模式后可查看预览。
        </Typography>
      </div>
    );
  }

  if (preview.kind === "image") {
    return <img className="media-preview__image" src={preview.objectUrl ?? ""} alt={preview.title} />;
  }

  return (
    <div className="media-preview__download-panel">
      <Typography variant="label" weight={700}>
        媒体已读取
      </Typography>
      <Typography variant="body" color="var(--text-secondary)">
        视频、语音和文件暂不在应用内播放，可先下载查看。
      </Typography>
      <a className="media-preview__download" href={preview.objectUrl ?? ""} download>
        下载文件
      </a>
    </div>
  );
}

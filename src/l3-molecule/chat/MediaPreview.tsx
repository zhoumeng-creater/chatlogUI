import { AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { IconButton, SpringModal, Typography } from "@l4/ui";
import type { HistoryMessage } from "@l2/api-docs/history";

const CHAT_MEDIA_PREVIEW_TITLE_ID = "chat-media-preview-title";

interface MediaPreviewProps {
  message: HistoryMessage | null;
  onClose: () => void;
}

export function MediaPreview({ message, onClose }: MediaPreviewProps) {
  const visible = message !== null;
  const mediaUrl = message?.mediaUrl || message?.imageUrl || "";
  const showImage = !!mediaUrl;
  const timeStr = message?.time
    ? new Date(message.time).toLocaleString("zh-CN")
    : "";

  return (
    <AnimatePresence>
      {visible && (
        <SpringModal titleId={CHAT_MEDIA_PREVIEW_TITLE_ID} onClose={onClose}>
          <div className="chat-media-preview">
            <div className="chat-media-preview__header">
              <Typography id={CHAT_MEDIA_PREVIEW_TITLE_ID} variant="label" weight={700}>
                媒体预览
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
            {showImage ? (
              <img
                src={mediaUrl}
                alt="媒体预览"
                className="chat-media-preview__image"
              />
            ) : (
              <Typography variant="body" color="var(--color-text-secondary)" align="center">
                无法预览此媒体
              </Typography>
            )}
            {timeStr && (
              <Typography variant="caption" color="var(--color-text-tertiary)">
                {timeStr}
              </Typography>
            )}
          </div>
        </SpringModal>
      )}
    </AnimatePresence>
  );
}

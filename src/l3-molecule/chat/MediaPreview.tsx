import { AnimatePresence } from "framer-motion";
import { SpringModal, Typography } from "@l4/ui";
import type { HistoryMessage } from "@l2/api-docs/history";

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
        <SpringModal onClose={onClose}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              minWidth: 280,
              maxWidth: "80vw",
            }}
          >
            {showImage ? (
              <img
                src={mediaUrl}
                alt="媒体预览"
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: 12,
                }}
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

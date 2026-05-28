import { motion } from "framer-motion";
import { Avatar, Typography } from "@l4/ui";
import type { HistoryMessage } from "@l2/api-docs/history";

interface MessageBubbleProps {
  message: HistoryMessage;
  isSelf: boolean;
  showAvatar: boolean;
}

function hasMedia(msg: HistoryMessage): boolean {
  return !!(msg.mediaType || msg.mediaMsg || msg.imageUrl || msg.mediaUrl);
}

function getTypeLabel(msg: HistoryMessage): string {
  if (msg.mediaType) {
    return `[${msg.mediaType}]`;
  }
  const t = msg.type;
  if (t === 3) return "[图片]";
  if (t === 4) return "[视频]";
  if (t === 34) return "[语音]";
  if (t === 6) return "[文件]";
  if (t === 49) return "[链接]";
  if (t === 47) return "[表情]";
  return "";
}

function formatTime(timeStr: string): string {
  try {
    return new Date(timeStr).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function MessageBubble({ message, isSelf, showAvatar }: MessageBubbleProps) {
  const typeLabel = getTypeLabel(message);
  const hasMediaContent = hasMedia(message);
  const displayContent = hasMediaContent && typeLabel ? typeLabel : message.content;
  const senderName = message.isGroup && !isSelf ? message.sender : "";

  if (!displayContent && !typeLabel) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      style={{
        display: "flex",
        flexDirection: isSelf ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 8,
        padding: "4px 16px",
        maxWidth: "80%",
        alignSelf: isSelf ? "flex-end" : "flex-start",
        width: "100%",
      }}
    >
      {showAvatar ? (
        <Avatar alt={message.sender} size={32} fallback={message.sender.slice(0, 2)} />
      ) : (
        <div style={{ width: 32, flexShrink: 0 }} />
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isSelf ? "flex-end" : "flex-start",
          gap: 2,
        }}
      >
        {senderName && (
          <Typography variant="caption" color="var(--color-text-tertiary)">
            {senderName}
          </Typography>
        )}

        <div
          style={{
            padding: "10px 14px",
            borderRadius: isSelf ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
            backgroundColor: isSelf
              ? "var(--color-bubble-self, #007AFF)"
              : "var(--color-bubble-other, rgba(255,255,255,0.9))",
            color: isSelf ? "#ffffff" : "var(--color-text-primary)",
            fontSize: 14,
            lineHeight: 1.5,
            wordBreak: "break-word",
            maxWidth: 360,
          }}
        >
          {displayContent}
        </div>

        <Typography variant="caption" color="var(--color-text-quaternary)">
          {formatTime(message.time)}
        </Typography>
      </div>
    </motion.div>
  );
}

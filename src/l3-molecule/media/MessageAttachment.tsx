import { File, Image, Mic, Smile, Video } from "lucide-react";
import type { ReactNode } from "react";
import type { MediaAttachment } from "@l4/network/mediaAdapters";
import {
  formatAttachmentAriaLabel,
  formatAttachmentPrimaryText,
} from "./mediaDisplay";

interface MessageAttachmentProps {
  attachment: MediaAttachment;
  privacyOn: boolean;
  onOpen?: (attachment: MediaAttachment) => void;
}

export function MessageAttachment({
  attachment,
  privacyOn,
  onOpen,
}: MessageAttachmentProps) {
  return (
    <button
      type="button"
      className="message-attachment"
      aria-label={formatAttachmentAriaLabel(attachment, privacyOn)}
      onClick={() => onOpen?.(attachment)}
      disabled={!attachment.fetchRef.key}
    >
      {getAttachmentIcon(attachment.kind)}
      <span>{formatAttachmentPrimaryText(attachment, privacyOn)}</span>
    </button>
  );
}

function getAttachmentIcon(kind: MediaAttachment["kind"]): ReactNode {
  switch (kind) {
    case "video":
      return <Video size={14} />;
    case "voice":
      return <Mic size={14} />;
    case "file":
      return <File size={14} />;
    case "sticker":
      return <Smile size={14} />;
    case "image":
      return <Image size={14} />;
    case "unknown":
      return <File size={14} />;
  }
}

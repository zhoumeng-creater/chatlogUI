import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { classNames } from "@/utils/classNames";
import { maskDisplayText } from "./conversationDisplay";
import { MessageMeta } from "./MessageMeta";
import {
  getMessageAttachmentSummary,
  getMessageKindLabel,
  getTranscriptTone,
} from "./transcriptDisplay";

interface MessageBubbleProps {
  message: ChatMessage;
  privacyOn: boolean;
  highlighted?: boolean;
}

function getContent(message: ChatMessage): string {
  const kindLabel = getMessageKindLabel(message);
  if (message.content) return message.content;
  if (kindLabel) return `[${kindLabel}]`;
  return "";
}

export function MessageBubble({ message, privacyOn, highlighted = false }: MessageBubbleProps) {
  const tone = getTranscriptTone(message);
  const rawContent = getContent(message);
  const content = privacyOn ? maskDisplayText(rawContent) : rawContent;
  const attachmentSummary = getMessageAttachmentSummary(message, privacyOn);
  const hasLegacyMedia = Boolean(message.mediaUrl || message.imageUrl);

  if (!content && !attachmentSummary && !hasLegacyMedia) return null;

  return (
    <div className={classNames(
      "message-row",
      `message-row--${tone}`,
      highlighted && "message-row--search-hit",
    )}>
      <article className="message-bubble" aria-label={highlighted ? "搜索命中消息" : undefined}>
        <MessageMeta message={message} privacyOn={privacyOn} />
        {content && <span>{content}</span>}
        {attachmentSummary && (
          <div className="message-attachments" aria-label="消息附件">
            <span className="message-attachment-card">
              {attachmentSummary}
            </span>
          </div>
        )}
        {!attachmentSummary && hasLegacyMedia && (
          <span className="message-attachment-card message-attachment-card--inline" aria-label="媒体占位">
            {privacyOn ? "[媒体]" : "[媒体可用]"}
          </span>
        )}
      </article>
    </div>
  );
}

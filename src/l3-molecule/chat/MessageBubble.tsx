import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { maskDisplayText } from "./conversationDisplay";
import { MessageMeta } from "./MessageMeta";
import { getMessageKindLabel, getTranscriptTone } from "./transcriptDisplay";
import { MessageAttachment } from "@l3/media/MessageAttachment";
import type { MediaAttachment } from "@l4/network/mediaAdapters";

interface MessageBubbleProps {
  message: ChatMessage;
  onOpenAttachment?: (attachment: MediaAttachment) => void;
}

function getContent(message: ChatMessage): string {
  const kindLabel = getMessageKindLabel(message);
  if (message.content) return message.content;
  if (kindLabel) return `[${kindLabel}]`;
  return "";
}

export function MessageBubble({ message, onOpenAttachment }: MessageBubbleProps) {
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const tone = getTranscriptTone(message);
  const rawContent = getContent(message);
  const content = privacyOn ? maskDisplayText(rawContent) : rawContent;
  const attachments = message.mediaAttachments ?? [];

  if (!content && attachments.length === 0) return null;

  return (
    <div className={`message-row message-row--${tone}`}>
      <article className="message-bubble">
        <MessageMeta message={message} />
        {content && <span>{content}</span>}
        {attachments.length > 0 && (
          <div className="message-attachments" aria-label="消息媒体">
            {attachments.map((attachment) => (
              <MessageAttachment
                key={attachment.id}
                attachment={attachment}
                privacyOn={privacyOn}
                onOpen={onOpenAttachment}
              />
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

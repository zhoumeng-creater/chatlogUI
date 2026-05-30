import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { maskDisplayText } from "./conversationDisplay";
import { MessageMeta } from "./MessageMeta";
import { getMessageKindLabel, getTranscriptTone } from "./transcriptDisplay";

interface MessageBubbleProps {
  message: ChatMessage;
  privacyOn: boolean;
}

function getContent(message: ChatMessage): string {
  const kindLabel = getMessageKindLabel(message);
  if (message.content) return message.content;
  if (kindLabel) return `[${kindLabel}]`;
  return "";
}

export function MessageBubble({ message, privacyOn }: MessageBubbleProps) {
  const tone = getTranscriptTone(message);
  const rawContent = getContent(message);
  const content = privacyOn ? maskDisplayText(rawContent) : rawContent;

  if (!content) return null;

  return (
    <div className={`message-row message-row--${tone}`}>
      <article className="message-bubble">
        <MessageMeta message={message} privacyOn={privacyOn} />
        <span>{content}</span>
        {(message.mediaUrl || message.imageUrl) && (
          <span className="message-attachment" aria-label="媒体占位">
            {privacyOn ? "[媒体]" : "[媒体可用]"}
          </span>
        )}
      </article>
    </div>
  );
}

import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { maskDisplayText } from "./conversationDisplay";
import {
  formatMessageClock,
  getMessageKindLabel,
  shouldShowSender,
} from "./transcriptDisplay";

interface MessageMetaProps {
  message: ChatMessage;
  privacyOn: boolean;
}

export function MessageMeta({ message, privacyOn }: MessageMetaProps) {
  const sender = privacyOn ? maskDisplayText(message.sender) : message.sender;
  const kindLabel = getMessageKindLabel(message);
  const time = formatMessageClock(message.time);
  const showSender = shouldShowSender(message);

  if (!showSender && !kindLabel && !time) return null;

  return (
    <div className="message-meta">
      {showSender && <span>{sender}</span>}
      {kindLabel && <span>{kindLabel}</span>}
      {time && <span>{time}</span>}
    </div>
  );
}

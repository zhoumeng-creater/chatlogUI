import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { maskDisplayText } from "./conversationDisplay";
import {
  formatMessageClock,
  getMessageKindLabel,
  getMessageSenderDisplay,
  shouldShowSender,
} from "./transcriptDisplay";

interface MessageMetaProps {
  message: ChatMessage;
  privacyOn: boolean;
}

export function MessageMeta({ message, privacyOn }: MessageMetaProps) {
  const senderDisplay = getMessageSenderDisplay(message);
  const sender = privacyOn ? maskDisplayText(senderDisplay) : senderDisplay;
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

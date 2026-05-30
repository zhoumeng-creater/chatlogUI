import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { maskDisplayText } from "./conversationDisplay";
import {
  formatMessageClock,
  getMessageKindLabel,
  shouldShowSender,
} from "./transcriptDisplay";

interface MessageMetaProps {
  message: ChatMessage;
}

export function MessageMeta({ message }: MessageMetaProps) {
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
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

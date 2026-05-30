import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { MessageBubble } from "./MessageBubble";

interface MessageGroupProps {
  dateLabel: string;
  messages: ChatMessage[];
}

export function MessageGroup({ dateLabel, messages }: MessageGroupProps) {
  return (
    <section aria-label={`${dateLabel} 的消息`}>
      <div className="message-date-divider">{dateLabel}</div>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </section>
  );
}

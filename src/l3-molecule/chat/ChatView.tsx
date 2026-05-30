import type { ChatMessage, Conversation, LoadStatus } from "@l2/data-clerk/stores/useChatStore";
import { MessageList } from "./MessageList";
import { TranscriptHeader } from "./TranscriptHeader";

interface ChatViewProps {
  conversation: Conversation | null;
  totalCount: number;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesHasMore: boolean;
  messagesStatus: LoadStatus;
  messagesError: string | null;
  privacyOn: boolean;
  onRetryMessages: () => void;
  onLoadMoreMessages: () => void;
}

export function ChatView({
  conversation,
  totalCount,
  messages,
  messagesLoading,
  messagesHasMore,
  messagesStatus,
  messagesError,
  privacyOn,
  onRetryMessages,
  onLoadMoreMessages,
}: ChatViewProps) {
  return (
    <div className="transcript">
      {conversation && (
        <TranscriptHeader
          conversation={conversation}
          totalCount={totalCount}
          privacyOn={privacyOn}
        />
      )}
      <MessageList
        conversation={conversation}
        messages={messages}
        messagesLoading={messagesLoading}
        messagesHasMore={messagesHasMore}
        messagesStatus={messagesStatus}
        messagesError={messagesError}
        privacyOn={privacyOn}
        onRetry={onRetryMessages}
        onLoadMore={onLoadMoreMessages}
      />
    </div>
  );
}

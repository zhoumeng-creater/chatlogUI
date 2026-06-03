import type { ChatMessage, Conversation, LoadStatus } from "@l2/data-clerk/stores/useChatStore";
import { MessageList } from "./MessageList";
import { TranscriptHeader } from "./TranscriptHeader";

interface ChatViewProps {
  conversation: Conversation | undefined;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesHasMore: boolean;
  messagesStatus: LoadStatus;
  messagesError: string | null;
  messagesTotalCount: number;
  privacyOn: boolean;
  onLoadHistory: (chat: string) => void;
  onLoadMoreHistory: (chat: string) => void;
}

export function ChatView({
  conversation,
  messages,
  messagesLoading,
  messagesHasMore,
  messagesStatus,
  messagesError,
  messagesTotalCount,
  privacyOn,
  onLoadHistory,
  onLoadMoreHistory,
}: ChatViewProps) {
  return (
    <div className="transcript">
      {conversation && (
        <TranscriptHeader
          conversation={conversation}
          totalCount={messagesTotalCount}
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
        onLoadHistory={onLoadHistory}
        onLoadMoreHistory={onLoadMoreHistory}
      />
    </div>
  );
}

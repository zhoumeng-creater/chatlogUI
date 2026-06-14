import type {
  ChatMessage,
  ChatMessageAnchor,
  Conversation,
  LoadStatus,
  TranscriptScrollIntent,
} from "@l2/data-clerk/stores/useChatStore";
import type { ApiErrorModel } from "@/l2-coordinator/diplomat/errorTranslator";
import type { ChatReadingState } from "@/l2-coordinator/commander/chatReadingState";
import { MessageList } from "./MessageList";
import { TranscriptHeader } from "./TranscriptHeader";

interface ChatViewProps {
  conversation: Conversation | undefined;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesHasMore: boolean;
  messagesStatus: LoadStatus;
  messagesError: string | ApiErrorModel | null;
  readingState: ChatReadingState;
  messagesTotalCount: number;
  scrollIntent: TranscriptScrollIntent;
  scrollAnchorMessageId: string | null;
  scrollAnchorLocalId: number | null;
  activeAnchor: ChatMessageAnchor | null;
  highlightedMessageId: string | null;
  privacyOn: boolean;
  onLoadHistory: (chat: string) => void;
  onLoadMoreHistory: (chat: string) => void;
  onScrollIntentHandled: () => void;
}

export function ChatView({
  conversation,
  messages,
  messagesLoading,
  messagesHasMore,
  messagesStatus,
  messagesError,
  readingState,
  messagesTotalCount,
  scrollIntent,
  scrollAnchorMessageId,
  scrollAnchorLocalId,
  activeAnchor,
  highlightedMessageId,
  privacyOn,
  onLoadHistory,
  onLoadMoreHistory,
  onScrollIntentHandled,
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
        readingState={readingState}
        scrollIntent={scrollIntent}
        scrollAnchorMessageId={scrollAnchorMessageId}
        scrollAnchorLocalId={scrollAnchorLocalId}
        activeAnchor={activeAnchor}
        highlightedMessageId={highlightedMessageId}
        privacyOn={privacyOn}
        onLoadHistory={onLoadHistory}
        onLoadMoreHistory={onLoadMoreHistory}
        onScrollIntentHandled={onScrollIntentHandled}
      />
    </div>
  );
}

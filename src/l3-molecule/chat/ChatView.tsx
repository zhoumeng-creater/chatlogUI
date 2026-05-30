import { useChatCommander } from "@l2/commander/";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { MessageList } from "./MessageList";
import { TranscriptHeader } from "./TranscriptHeader";

export function ChatView() {
  const { selectedConversationId, messagesTotalCount } = useChatCommander();
  const conversations = useChatStore((state) => state.conversations);
  const currentConv = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  return (
    <div className="transcript">
      {currentConv && (
        <TranscriptHeader conversation={currentConv} totalCount={messagesTotalCount} />
      )}
      <MessageList />
    </div>
  );
}

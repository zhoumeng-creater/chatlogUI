import type { Conversation, LoadStatus, UnreadStatus } from "@l2/data-clerk/stores/useChatStore";
import { ConversationList } from "./ConversationList";

interface ContactListProps {
  conversations: Conversation[];
  conversationsStatus: LoadStatus;
  conversationsError: string | null;
  unreadStatus: UnreadStatus;
  selectedConversationId: string | null;
  privacyOn: boolean;
  onLoadConversations: () => void;
  onOpenConversation: (conversation: Conversation) => void;
  onConversationOpened?: () => void;
}

export function ContactList({
  conversations,
  conversationsStatus,
  conversationsError,
  unreadStatus,
  selectedConversationId,
  privacyOn,
  onLoadConversations,
  onOpenConversation,
  onConversationOpened,
}: ContactListProps) {
  return (
    <ConversationList
      conversations={conversations}
      conversationsStatus={conversationsStatus}
      conversationsError={conversationsError}
      unreadStatus={unreadStatus}
      selectedConversationId={selectedConversationId}
      privacyOn={privacyOn}
      onLoadConversations={onLoadConversations}
      onOpenConversation={onOpenConversation}
      onConversationOpened={onConversationOpened}
    />
  );
}

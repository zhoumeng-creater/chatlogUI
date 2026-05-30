import { useChatCommander } from "@l2/commander/";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { ConversationList } from "./ConversationList";

interface ContactListProps {
  onConversationOpened?: () => void;
}

export function ContactList({ onConversationOpened }: ContactListProps) {
  const {
    conversations,
    conversationsStatus,
    conversationsError,
    selectedConversationId,
    loadConversations,
    selectAndLoad,
  } = useChatCommander();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);

  const openConversation = (conversation: Conversation) => {
    void selectAndLoad(conversation.id, conversation.username);
    onConversationOpened?.();
  };

  return (
    <ConversationList
      conversations={conversations}
      conversationsStatus={conversationsStatus}
      conversationsError={conversationsError}
      selectedConversationId={selectedConversationId}
      privacyOn={privacyOn}
      onOpenConversation={openConversation}
      onRetry={() => void loadConversations()}
    />
  );
}

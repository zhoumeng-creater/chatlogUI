import type { Conversation, LoadStatus, UnreadStatus } from "@l2/data-clerk/stores/useChatStore";
import type { ActionableEmptyStateView } from "@l2/commander/actionableEmptyStateModel";
import type { ConversationListFilter } from "@l2/commander/conversationListInteractionModel";
import { ConversationList } from "./ConversationList";

interface ContactListProps {
  conversations: Conversation[];
  conversationsStatus: LoadStatus;
  conversationsError: string | null;
  unreadStatus: UnreadStatus;
  selectedConversationId: string | null;
  query: string;
  filter: ConversationListFilter;
  activeConversationId: string | null;
  emptyState: ActionableEmptyStateView;
  privacyOn: boolean;
  onLoadConversations: () => void;
  onOpenConversation: (conversation: Conversation) => void;
  onConversationOpened?: () => void;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: ConversationListFilter) => void;
  onActiveConversationChange: (id: string | null) => void;
  onClearFilters: () => void;
}

export function ContactList({
  conversations,
  conversationsStatus,
  conversationsError,
  unreadStatus,
  selectedConversationId,
  query,
  filter,
  activeConversationId,
  emptyState,
  privacyOn,
  onLoadConversations,
  onOpenConversation,
  onConversationOpened,
  onQueryChange,
  onFilterChange,
  onActiveConversationChange,
  onClearFilters,
}: ContactListProps) {
  return (
    <ConversationList
      conversations={conversations}
      conversationsStatus={conversationsStatus}
      conversationsError={conversationsError}
      unreadStatus={unreadStatus}
      selectedConversationId={selectedConversationId}
      query={query}
      filter={filter}
      activeConversationId={activeConversationId}
      emptyState={emptyState}
      privacyOn={privacyOn}
      onLoadConversations={onLoadConversations}
      onOpenConversation={onOpenConversation}
      onConversationOpened={onConversationOpened}
      onQueryChange={onQueryChange}
      onFilterChange={onFilterChange}
      onActiveConversationChange={onActiveConversationChange}
      onClearFilters={onClearFilters}
    />
  );
}

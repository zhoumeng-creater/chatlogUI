import { ConversationList } from "./ConversationList";

interface ContactListProps {
  onConversationOpened?: () => void;
}

export function ContactList({ onConversationOpened }: ContactListProps) {
  return <ConversationList onConversationOpened={onConversationOpened} />;
}

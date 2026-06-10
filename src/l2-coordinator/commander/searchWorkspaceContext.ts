import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import type { SearchScope } from "@l2/data-clerk/stores/useSearchStore";

interface ResolveSearchScopeChatInput {
  scope: SearchScope;
  scopedChat?: string | null;
  conversations: Conversation[];
  selectedConversationId: string | null;
}

function normalizeChat(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function resolveSearchScopeChat({
  scope,
  scopedChat,
  conversations,
  selectedConversationId,
}: ResolveSearchScopeChatInput): string | null {
  if (scope !== "current") return null;

  const routeChat = normalizeChat(scopedChat);
  if (routeChat) return routeChat;

  const conversation = conversations.find((item) => item.id === selectedConversationId);
  return normalizeChat(conversation?.username);
}

import { useEffect, useMemo } from "react";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import { useChatCommander } from "./useChatCommander";

export function findConversationForScopedChat(
  conversations: Conversation[],
  scopedChat: string | null | undefined,
): Conversation | null {
  const target = scopedChat?.trim();
  if (!target) return null;
  return conversations.find((conversation) =>
    conversation.username === target || conversation.id === target,
  ) ?? null;
}

export function useScopedWorkspaceConversation(scopedChat: string | null | undefined) {
  const chat = useChatCommander();
  const { conversations, loadConversations, selectedConversationId, selectAndLoad } = chat;

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const scopedConversation = useMemo(
    () => findConversationForScopedChat(conversations, scopedChat),
    [conversations, scopedChat],
  );

  useEffect(() => {
    if (!scopedConversation) return;
    if (selectedConversationId === scopedConversation.id) return;
    void selectAndLoad(scopedConversation.id, scopedConversation.username);
  }, [scopedConversation, selectedConversationId, selectAndLoad]);

  const currentConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? scopedConversation,
    [conversations, scopedConversation, selectedConversationId],
  );

  return {
    chat,
    currentConversation,
    currentChat: currentConversation?.username ?? "",
  };
}

import { useEffect, useMemo } from "react";
import { useChatCommander } from "./useChatCommander";
import {
  buildWorkspaceRouteScopeView,
  findConversationForScopedChat,
  type WorkspaceScopeMode,
} from "./workspaceRouteScope";

export { findConversationForScopedChat };

export interface UseScopedWorkspaceConversationInput {
  scope?: string | null;
  scopedChat?: string | null;
  chat?: string | null;
  focus?: string | null;
  source?: string | null;
  privacyOn?: boolean;
  defaultScope?: WorkspaceScopeMode;
}

export function useScopedWorkspaceConversation(
  input: string | null | undefined | UseScopedWorkspaceConversationInput,
) {
  const chat = useChatCommander();
  const { conversations, loadConversations, selectedConversationId, selectAndLoad } = chat;
  const scopeInput = typeof input === "object" && input !== null
    ? input
    : { scopedChat: input };
  const scopedChat = scopeInput.scopedChat ?? scopeInput.chat ?? null;
  const explicitAllScope = scopeInput.scope === "all";
  const shouldResolveConversation =
    !explicitAllScope &&
    (scopeInput.defaultScope !== "all" ||
      scopeInput.scope === "currentChat" ||
      !!scopedChat?.trim());

  useEffect(() => {
    if (!shouldResolveConversation) return;
    void loadConversations();
  }, [loadConversations, shouldResolveConversation]);

  useEffect(() => {
    if (explicitAllScope) return;
    const scopedConversation = findConversationForScopedChat(conversations, scopedChat);
    if (!scopedConversation) return;
    if (selectedConversationId === scopedConversation.id) return;
    void selectAndLoad(scopedConversation.id, scopedConversation.username);
  }, [conversations, explicitAllScope, scopedChat, selectedConversationId, selectAndLoad]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const workspaceRouteScope = useMemo(
    () => buildWorkspaceRouteScopeView({
      scope: scopeInput.scope,
      scopedChat,
      focus: scopeInput.focus,
      source: scopeInput.source,
      conversations,
      selectedConversation,
      privacyOn: scopeInput.privacyOn ?? false,
      defaultScope: scopeInput.defaultScope,
    }),
    [
      conversations,
      scopedChat,
      scopeInput.defaultScope,
      scopeInput.focus,
      scopeInput.privacyOn,
      scopeInput.scope,
      scopeInput.source,
      selectedConversation,
    ],
  );

  return {
    chat,
    workspaceRouteScope,
    currentConversation: workspaceRouteScope.currentConversation,
    currentChat: workspaceRouteScope.currentChat,
  };
}

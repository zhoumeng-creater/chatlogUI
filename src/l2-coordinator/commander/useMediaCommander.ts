import { useCallback, useMemo } from "react";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { useMediaStore, type MediaAttachment } from "@l2/data-clerk/stores/useMediaStore";
import {
  buildMediaResourceUrl,
  fetchFavorites,
  fetchMembers,
  fetchNewMessages,
  fetchUnread,
} from "@l4/network";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";

export function useMediaCommander() {
  const store = useMediaStore();
  const messages = useChatStore((state) => state.messages);
  const conversations = useChatStore((state) => state.conversations);
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const currentConversation = conversations.find((item) => item.id === selectedConversationId);

  const attachments = useMemo(
    () => messages.flatMap((message) => message.attachments ?? []),
    [messages],
  );

  const loadMediaModule = useCallback(async (chat?: string, isGroup = false) => {
    useMediaStore.getState().setLoading();

    try {
      const diagnostics = {
        correlationId: "p4b-media",
        recoveryHint: "retry" as const,
      };
      const [favorites, unread, members, newMessages] = await Promise.all([
        fetchFavorites(
          { chat, limit: 50 },
          createDiagnosticHttpOptions({
            ...diagnostics,
            endpointFamily: "favorites",
            method: "GET",
          }),
        ),
        fetchUnread(
          createDiagnosticHttpOptions({
            ...diagnostics,
            endpointFamily: "unread",
            method: "GET",
          }),
        ),
        isGroup && chat
          ? fetchMembers(
              { chat },
              createDiagnosticHttpOptions({
                ...diagnostics,
                endpointFamily: "members",
                method: "GET",
              }),
            )
          : Promise.resolve({ count: 0, members: [] }),
        fetchNewMessages(
          { chat, limit: 50 },
          createDiagnosticHttpOptions({
            ...diagnostics,
            endpointFamily: "new_messages",
            method: "GET",
          }),
        ),
      ]);

      useMediaStore.getState().setData({
        favorites: favorites.items,
        members: members.members,
        unread,
        newMessages: newMessages.messages,
      });
    } catch {
      useMediaStore.getState().setError("加载媒体与扩展信息失败");
    }
  }, []);

  const previewResourceUrl = store.selectedAttachment
    ? buildMediaResourceUrl(store.selectedAttachment)
    : "";

  return {
    ...store,
    attachments,
    currentConversation,
    previewResourceUrl,
    loadMediaModule,
    retry: () => loadMediaModule(currentConversation?.username, currentConversation?.isGroup ?? false),
    previewAttachment: (attachment: MediaAttachment) => useMediaStore.getState().selectAttachment(attachment),
    closePreview: () => useMediaStore.getState().selectAttachment(null),
  };
}

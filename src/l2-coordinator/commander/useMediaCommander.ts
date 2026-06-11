import { useCallback, useMemo, useRef } from "react";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import {
  useMediaStore,
  type MediaAttachment,
  type MediaEndpointState,
  type MediaEndpointStatus,
} from "@l2/data-clerk/stores/useMediaStore";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import {
  buildMediaResourceUrl,
  fetchFavorites,
  fetchMembers,
  fetchNewMessages,
  fetchUnread,
} from "@l4/network";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import { getActiveChatlogServiceSummary } from "./chatlogRequestContext";

let mediaLoadSequence = 0;

function nextMediaLoadRequestId(): string {
  mediaLoadSequence += 1;
  return `media-load-${mediaLoadSequence}`;
}

export function useMediaCommander() {
  const store = useMediaStore();
  const messages = useChatStore((state) => state.messages);
  const conversations = useChatStore((state) => state.conversations);
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const setupProfile = useSetupStore((state) => state.profile);
  const activeService = useMemo(
    () => getActiveChatlogServiceSummary(setupProfile),
    [setupProfile],
  );
  const activeLoadControllerRef = useRef<AbortController | null>(null);
  const currentConversation = conversations.find((item) => item.id === selectedConversationId);

  const attachments = useMemo(
    () => messages.flatMap((message) => message.attachments ?? []),
    [messages],
  );

  const loadMediaModule = useCallback(async (chat?: string, isGroup = false) => {
    activeLoadControllerRef.current?.abort();
    const requestId = nextMediaLoadRequestId();
    const controller = new AbortController();
    activeLoadControllerRef.current = controller;
    useMediaStore.getState().startMediaLoadRequest(requestId, { chat: chat ?? "", isGroup });

    try {
      const diagnostics = {
        correlationId: "p4b-media",
        recoveryHint: "retry" as const,
      };
      const [favoritesResult, unreadResult, membersResult, newMessagesResult] = await Promise.allSettled([
        fetchFavorites(
          { chat, limit: 50 },
          withMediaAbortSignal(
            createDiagnosticHttpOptions({
              ...diagnostics,
              endpointFamily: "favorites",
              method: "GET",
            }),
            controller.signal,
          ),
        ),
        fetchUnread(
          withMediaAbortSignal(
            createDiagnosticHttpOptions({
              ...diagnostics,
              endpointFamily: "unread",
              method: "GET",
            }),
            controller.signal,
          ),
        ),
        isGroup && chat
          ? fetchMembers(
              { chat },
              withMediaAbortSignal(
                createDiagnosticHttpOptions({
                  ...diagnostics,
                  endpointFamily: "members",
                  method: "GET",
                }),
                controller.signal,
              ),
            )
          : Promise.resolve({ count: 0, members: [] }),
        fetchNewMessages(
          { chat, limit: 50 },
          withMediaAbortSignal(
            createDiagnosticHttpOptions({
              ...diagnostics,
              endpointFamily: "new_messages",
              method: "GET",
            }),
            controller.signal,
          ),
        ),
      ]);

      const favorites = favoritesResult.status === "fulfilled" ? favoritesResult.value.items : [];
      const unread = unreadResult.status === "fulfilled" ? unreadResult.value : { total: 0, chats: [] };
      const members = membersResult.status === "fulfilled" ? membersResult.value.members : [];
      const newMessages = newMessagesResult.status === "fulfilled" ? newMessagesResult.value.messages : [];
      const endpointStatus: MediaEndpointStatus = {
        favorites: endpointState(favoritesResult, favorites.length, "收藏加载失败"),
        members: endpointState(membersResult, members.length, "成员加载失败"),
        unread: endpointState(unreadResult, unread.total, "未读加载失败"),
        newMessages: endpointState(newMessagesResult, newMessages.length, "增量消息加载失败"),
      };

      useMediaStore.getState().completeMediaLoadRequest(requestId, {
        favorites,
        members,
        unread,
        newMessages,
      }, endpointStatus);
    } catch {
      useMediaStore.getState().failMediaLoadRequest(requestId, "加载媒体与扩展信息失败");
    } finally {
      if (activeLoadControllerRef.current === controller) {
        activeLoadControllerRef.current = null;
      }
    }
  }, []);

  const previewResourceUrl = store.selectedAttachment
    ? buildMediaResourceUrl(store.selectedAttachment, activeService.serviceBaseUrl)
    : "";

  return {
    ...store,
    attachments,
    currentConversation,
    serviceLabel: activeService.serviceLabel,
    previewResourceUrl,
    loadMediaModule,
    retry: () => loadMediaModule(currentConversation?.username, currentConversation?.isGroup ?? false),
    previewAttachment: (attachment: MediaAttachment) => useMediaStore.getState().selectAttachment(attachment),
    closePreview: () => useMediaStore.getState().selectAttachment(null),
  };
}

function endpointState<T>(
  result: PromiseSettledResult<T>,
  itemCount: number,
  error: string,
): MediaEndpointState {
  if (result.status === "rejected") return { status: "error", error };
  return { status: itemCount > 0 ? "ready" : "empty", error: null };
}

function withMediaAbortSignal<T extends object>(
  options: T,
  signal: AbortSignal,
): T & { signal: AbortSignal } {
  return { ...options, signal };
}

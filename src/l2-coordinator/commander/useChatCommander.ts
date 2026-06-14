import { useCallback, useRef } from "react";
import {
  useChatStore,
  type ChatMessageAnchor,
  type ChatReturnToSearch,
} from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { ChatlogHttpError, fetchConversations, fetchHistory, fetchUnread } from "@l4/network";
import { toApiErrorModel } from "@/l2-coordinator/diplomat/errorTranslator";
import {
  buildAnchorHistoryRequest,
  findAnchoredMessage,
} from "./chatHistoryAnchor";
import {
  CHAT_HISTORY_ORDERING_CONTRACT,
  getLatestPageFollowupRequest,
  getOlderHistoryRequest,
  hasOlderHistory,
} from "./chatHistoryPaging";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";

const HISTORY_PAGE_SIZE = 50;
const ANCHOR_WINDOW_SECONDS = 300;

export interface AnchoredChatNavigationTarget {
  conversationId: string;
  chat: string;
  anchor: ChatMessageAnchor;
  returnToSearch: ChatReturnToSearch;
}

export function useChatCommander() {
  const store = useChatStore();
  const loadingRef = useRef(false);
  const activeHistoryRequestRef = useRef<{ requestId: string; controller: AbortController } | null>(null);
  const historyRequestCounterRef = useRef(0);

  const cancelActiveHistoryRequest = useCallback(() => {
    const request = activeHistoryRequestRef.current;
    activeHistoryRequestRef.current = null;
    request?.controller.abort();
  }, []);

  const startHistoryRequest = useCallback(() => {
    cancelActiveHistoryRequest();
    historyRequestCounterRef.current += 1;
    const request = {
      requestId: `history-${historyRequestCounterRef.current}`,
      controller: new AbortController(),
    };
    activeHistoryRequestRef.current = request;
    return request;
  }, [cancelActiveHistoryRequest]);

  const isCurrentHistoryRequest = useCallback((requestId: string) =>
    activeHistoryRequestRef.current?.requestId === requestId, []);

  const clearCurrentHistoryRequest = useCallback((requestId: string) => {
    if (isCurrentHistoryRequest(requestId)) {
      activeHistoryRequestRef.current = null;
    }
  }, [isCurrentHistoryRequest]);

  const isCancelledHistoryError = useCallback((error: unknown) =>
    error instanceof ChatlogHttpError && error.status === null && error.message === "请求已取消", []);

  const loadConversations = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    useChatStore.getState().setConversationsLoading();
    try {
      const { conversations, contacts, chatrooms } = await fetchConversations(
        { limit: 500 },
        createDiagnosticHttpOptions({
          endpointFamily: "sessions",
          method: "GET",
          recoveryHint: "retry",
        }),
      );

      const contactsByUsername: Record<string, unknown> = {};
      for (const c of (contacts.contacts ?? [])) {
        contactsByUsername[c.username] = c;
      }

      const chatRoomsByName: Record<string, unknown> = {};
      for (const r of (chatrooms.chatrooms ?? [])) {
        chatRoomsByName[r.name] = r;
      }

      useChatStore.getState().setConversations(conversations, contactsByUsername, chatRoomsByName);
      useChatStore.getState().setUnreadLoading();
      try {
        const unread = await fetchUnread(createDiagnosticHttpOptions({
          endpointFamily: "unread",
          method: "GET",
          recoveryHint: "retry",
        }));
        const unreadByChat = Object.fromEntries(
          unread.chats.map((item) => [item.chat, item.count]),
        );
        useChatStore.getState().mergeConversationUnread(unreadByChat);
      } catch (error) {
        const errorModel = toApiErrorModel(error);
        if (errorModel.category === "unsupported-endpoint") {
          useChatStore.getState().setUnreadUnavailable();
        } else {
          useChatStore.getState().setUnreadError(errorModel.message);
        }
      }
    } catch {
      useChatStore.getState().setConversationsError("加载会话列表失败");
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const loadHistory = useCallback(async (chat: string) => {
    const request = startHistoryRequest();
    useChatStore.getState().clearAnchor();
    useChatStore.getState().setMessagesLoading(true);
    try {
      let result = await fetchHistory(
        { chat, limit: HISTORY_PAGE_SIZE, offset: 0 },
        {
          ...createDiagnosticHttpOptions({
            endpointFamily: "history",
            method: "GET",
            recoveryHint: "retry",
          }),
          signal: request.controller.signal,
        },
      );
      if (!isCurrentHistoryRequest(request.requestId)) return;
      const latestFollowup = getLatestPageFollowupRequest(result, CHAT_HISTORY_ORDERING_CONTRACT);
      if (latestFollowup) {
        result = await fetchHistory(latestFollowup, {
          ...createDiagnosticHttpOptions({
            endpointFamily: "history",
            method: "GET",
            recoveryHint: "retry",
          }),
          signal: request.controller.signal,
        });
        if (!isCurrentHistoryRequest(request.requestId)) return;
      }
      useChatStore.getState().setMessages(
        result.messages,
        result.totalCount,
        result.offset,
        hasOlderHistory(result, CHAT_HISTORY_ORDERING_CONTRACT),
        "latest",
      );
    } catch (error) {
      if (!isCurrentHistoryRequest(request.requestId)) return;
      if (isCancelledHistoryError(error)) {
        useChatStore.getState().setAnchorCancelled();
        return;
      }
      useChatStore.getState().setMessagesError(toApiErrorModel(error));
    } finally {
      clearCurrentHistoryRequest(request.requestId);
    }
  }, [clearCurrentHistoryRequest, isCancelledHistoryError, isCurrentHistoryRequest, startHistoryRequest]);

  const loadMoreHistory = useCallback(async (chat: string) => {
    const { messages, messagesLoading, messagesHasMore, messagesOffset } = useChatStore.getState();
    if (messagesLoading || !messagesHasMore) return;

    const request = startHistoryRequest();
    useChatStore.getState().setMessagesLoading(true);
    const olderRequest = getOlderHistoryRequest({
      chat,
      contract: CHAT_HISTORY_ORDERING_CONTRACT,
      currentOffset: messagesOffset,
      loadedCount: messages.length,
      limit: HISTORY_PAGE_SIZE,
    });
    if (!olderRequest) {
      useChatStore.getState().appendMessages([], messagesOffset, false);
      clearCurrentHistoryRequest(request.requestId);
      return;
    }

    try {
      const result = await fetchHistory(
        olderRequest,
        {
          ...createDiagnosticHttpOptions({
            endpointFamily: "history",
            method: "GET",
            recoveryHint: "retry",
          }),
          signal: request.controller.signal,
        },
      );
      if (!isCurrentHistoryRequest(request.requestId)) return;
      useChatStore.getState().appendMessages(
        result.messages,
        result.offset,
        hasOlderHistory(result, CHAT_HISTORY_ORDERING_CONTRACT),
      );
    } catch (error) {
      if (!isCurrentHistoryRequest(request.requestId)) return;
      if (isCancelledHistoryError(error)) return;
      useChatStore.getState().setMessagesError(toApiErrorModel(error));
    } finally {
      clearCurrentHistoryRequest(request.requestId);
    }
  }, [clearCurrentHistoryRequest, isCancelledHistoryError, isCurrentHistoryRequest, startHistoryRequest]);

  const selectAndLoad = useCallback(
    async (convId: string, chat: string) => {
      useChatStore.getState().selectConversation(convId);
      await loadHistory(chat);
    },
    [loadHistory],
  );

  const selectAndLoadAtAnchor = useCallback(
    async (target: AnchoredChatNavigationTarget) => {
      const request = startHistoryRequest();
      useChatStore.getState().selectConversation(target.conversationId);
      useChatStore.getState().setAnchorLoading(target.anchor, target.returnToSearch);
      useChatStore.getState().setMessagesLoading(true);

      try {
        const result = await fetchHistory(
          buildAnchorHistoryRequest(target.anchor, {
            limit: HISTORY_PAGE_SIZE,
            windowSeconds: ANCHOR_WINDOW_SECONDS,
          }),
          {
            ...createDiagnosticHttpOptions({
              endpointFamily: "history",
              method: "GET",
              recoveryHint: "retry",
            }),
            signal: request.controller.signal,
          },
        );
        if (!isCurrentHistoryRequest(request.requestId)) return;

        useChatStore.getState().setMessages(
          result.messages,
          result.totalCount,
          result.offset,
          hasOlderHistory(result, CHAT_HISTORY_ORDERING_CONTRACT),
          "anchor",
        );
        const hit = findAnchoredMessage(result.messages, target.anchor);
        if (hit) {
          useChatStore.getState().setAnchorHit(hit.id);
        } else {
          useChatStore.getState().setAnchorMissing();
        }
      } catch (error) {
        if (!isCurrentHistoryRequest(request.requestId)) return;
        if (isCancelledHistoryError(error)) {
          useChatStore.getState().setAnchorCancelled();
          return;
        }
        useChatStore.getState().setMessagesError(toApiErrorModel(error));
        useChatStore.getState().setAnchorError("已打开会话，但无法加载搜索命中附近的聊天记录。");
      } finally {
        clearCurrentHistoryRequest(request.requestId);
      }
    },
    [clearCurrentHistoryRequest, isCancelledHistoryError, isCurrentHistoryRequest, startHistoryRequest],
  );

  return {
    ...store,
    loadConversations,
    loadHistory,
    loadMoreHistory,
    selectAndLoad,
    selectAndLoadAtAnchor,
  };
}

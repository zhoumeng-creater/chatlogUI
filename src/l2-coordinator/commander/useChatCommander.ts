import { useCallback, useRef } from "react";
import {
  useChatStore,
  type ChatMessageAnchor,
  type ChatReturnToSearch,
} from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { ChatlogHttpError, fetchConversations, fetchHistory } from "@l4/network";
import {
  buildAnchorHistoryRequest,
  findAnchoredMessage,
} from "./chatHistoryAnchor";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";

const HISTORY_PAGE_SIZE = 50;
const ANCHOR_WINDOW_SECONDS = 300;

export interface AnchoredChatNavigationTarget {
  conversationId: string;
  chat: string;
  anchor: ChatMessageAnchor;
  returnToSearch: ChatReturnToSearch;
}

function hasMoreHistory(result: { count: number; limit: number; messages: unknown[] }) {
  const loadedCount = result.count || result.messages.length;
  return result.limit > 0 && loadedCount >= result.limit;
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
      const result = await fetchHistory(
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
      useChatStore.getState().setMessages(
        result.messages,
        result.totalCount,
        result.offset,
        hasMoreHistory(result),
      );
    } catch (error) {
      if (!isCurrentHistoryRequest(request.requestId)) return;
      if (isCancelledHistoryError(error)) {
        useChatStore.getState().setAnchorCancelled();
        return;
      }
      useChatStore.getState().setMessagesError("加载聊天记录失败");
    } finally {
      clearCurrentHistoryRequest(request.requestId);
    }
  }, [clearCurrentHistoryRequest, isCancelledHistoryError, isCurrentHistoryRequest, startHistoryRequest]);

  const loadMoreHistory = useCallback(async (chat: string) => {
    const { messages, messagesLoading, messagesHasMore } = useChatStore.getState();
    if (messagesLoading || !messagesHasMore) return;

    const request = startHistoryRequest();
    useChatStore.getState().setMessagesLoading(true);
    const nextOffset = messages.length;

    try {
      const result = await fetchHistory(
        { chat, limit: HISTORY_PAGE_SIZE, offset: nextOffset },
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
      useChatStore.getState().appendMessages(result.messages, result.offset, hasMoreHistory(result));
    } catch (error) {
      if (!isCurrentHistoryRequest(request.requestId)) return;
      if (isCancelledHistoryError(error)) return;
      useChatStore.getState().setMessagesError("加载更多记录失败");
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
          hasMoreHistory(result),
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
        useChatStore.getState().setMessagesError("加载聊天记录失败");
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

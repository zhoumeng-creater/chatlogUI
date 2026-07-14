import { useCallback, useRef } from "react";
import {
  useChatStore,
  type ChatMessageAnchor,
  type ChatReturnToSearch,
} from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { ChatlogHttpError, fetchConversations, fetchHistory, fetchUnread } from "@l4/network";
import { toApiErrorModel } from "@/l2-coordinator/diplomat/errorTranslator";
import {
  buildNearbyAnchorHistoryRequest,
  findExactAnchorPage,
  findNearbyAnchoredMessage,
} from "./chatHistoryAnchor";
import { buildDateJumpHistoryRequest } from "./conversationDateJumpModel";
import {
  buildLatestHistoryRequest,
  buildLatestTimestampWindowRequest,
  CHAT_HISTORY_ORDERING_CONTRACT,
  getLatestPageFollowupRequest,
  getOlderHistoryRequest,
  hasOlderHistory,
  mergeLatestTimestampWindowPage,
  pageNeedsLatestTimestampFallback,
} from "./chatHistoryPaging";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";

const HISTORY_PAGE_SIZE = 50;
const ANCHOR_WINDOW_SECONDS = 300;

interface LoadHistoryOptions {
  latestTimestamp?: number | null;
}

export interface AnchoredChatNavigationTarget {
  conversationId: string;
  chat: string;
  conversationLabel?: string;
  isGroup?: boolean;
  anchor: ChatMessageAnchor;
  returnToSearch: ChatReturnToSearch;
}

export type AnchoredChatNavigationResult =
  | { ok: true; matchKind: "exact" | "nearby"; messageId: string }
  | {
      ok: false;
      reason: "missing" | "load-failed" | "cancelled";
      message: string;
      nearbyFallbackAvailable: boolean;
    };

export interface AnchoredChatNavigationOptions {
  allowNearbyFallback?: boolean;
}

export function useChatCommander() {
  const store = useChatStore();
  const loadingRef = useRef(false);
  const activeHistoryRequestRef = useRef<{ requestId: string; controller: AbortController } | null>(
    null,
  );
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

  const isCurrentHistoryRequest = useCallback(
    (requestId: string) => activeHistoryRequestRef.current?.requestId === requestId,
    [],
  );

  const clearCurrentHistoryRequest = useCallback(
    (requestId: string) => {
      if (isCurrentHistoryRequest(requestId)) {
        activeHistoryRequestRef.current = null;
      }
    },
    [isCurrentHistoryRequest],
  );

  const isCancelledHistoryError = useCallback(
    (error: unknown) =>
      error instanceof ChatlogHttpError && error.status === null && error.message === "请求已取消",
    [],
  );

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
      for (const c of contacts.contacts ?? []) {
        contactsByUsername[c.username] = c;
      }

      const chatRoomsByName: Record<string, unknown> = {};
      for (const r of chatrooms.chatrooms ?? []) {
        chatRoomsByName[r.name] = r;
      }

      useChatStore.getState().setConversations(conversations, contactsByUsername, chatRoomsByName);
      useChatStore.getState().setUnreadLoading();
      try {
        const unread = await fetchUnread(
          createDiagnosticHttpOptions({
            endpointFamily: "unread",
            method: "GET",
            recoveryHint: "retry",
          }),
        );
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

  const loadHistory = useCallback(
    async (chat: string, options: LoadHistoryOptions = {}) => {
      const request = startHistoryRequest();
      useChatStore.getState().clearAnchor();
      useChatStore.getState().setMessagesLoading(true);
      try {
        const historyRequest = buildLatestHistoryRequest({
          chat,
          limit: HISTORY_PAGE_SIZE,
          latestTimestamp: options.latestTimestamp,
        });
        let result = await fetchHistory(historyRequest, {
          ...createDiagnosticHttpOptions({
            endpointFamily: "history",
            method: "GET",
            recoveryHint: "retry",
          }),
          signal: request.controller.signal,
        });
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
        const hasMore = hasOlderHistory(result, CHAT_HISTORY_ORDERING_CONTRACT);
        if (pageNeedsLatestTimestampFallback(result, options.latestTimestamp)) {
          const fallback = await fetchHistory(
            buildLatestTimestampWindowRequest({
              chat,
              limit: HISTORY_PAGE_SIZE,
              latestTimestamp: options.latestTimestamp,
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
          result = mergeLatestTimestampWindowPage({ primary: result, supplemental: fallback });
        }
        useChatStore
          .getState()
          .setMessages(result.messages, result.totalCount, result.offset, hasMore, "latest");
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
    },
    [
      clearCurrentHistoryRequest,
      isCancelledHistoryError,
      isCurrentHistoryRequest,
      startHistoryRequest,
    ],
  );

  const loadMoreHistory = useCallback(
    async (chat: string) => {
      const { messages, messagesLoading, messagesHasMore, messagesOffset } =
        useChatStore.getState();
      if (messagesLoading || !messagesHasMore) return;

      const request = startHistoryRequest();
      useChatStore.getState().setMessagesLoading(true);
      const olderRequest = getOlderHistoryRequest({
        chat,
        contract: CHAT_HISTORY_ORDERING_CONTRACT,
        currentOffset: messagesOffset,
        loadedCount: messages.length,
        limit: HISTORY_PAGE_SIZE,
        oldestLoadedTimestamp: messages[0]?.timestamp ?? null,
      });
      if (!olderRequest) {
        useChatStore.getState().appendMessages([], messagesOffset, false);
        clearCurrentHistoryRequest(request.requestId);
        return;
      }

      try {
        const result = await fetchHistory(olderRequest, {
          ...createDiagnosticHttpOptions({
            endpointFamily: "history",
            method: "GET",
            recoveryHint: "retry",
          }),
          signal: request.controller.signal,
        });
        if (!isCurrentHistoryRequest(request.requestId)) return;
        useChatStore
          .getState()
          .appendMessages(
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
    },
    [
      clearCurrentHistoryRequest,
      isCancelledHistoryError,
      isCurrentHistoryRequest,
      startHistoryRequest,
    ],
  );

  const loadHistoryAtDate = useCallback(
    async (chat: string, date: string): Promise<number | null> => {
      const request = startHistoryRequest();
      useChatStore.getState().clearAnchor();
      useChatStore.getState().setMessagesLoading(true);

      try {
        const result = await fetchHistory(
          buildDateJumpHistoryRequest({
            chat,
            date,
            limit: HISTORY_PAGE_SIZE,
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
        if (!isCurrentHistoryRequest(request.requestId)) return null;
        useChatStore
          .getState()
          .setMessages(
            result.messages,
            result.totalCount,
            result.offset,
            result.messages.length > 0,
            "latest",
          );
        return result.messages.length;
      } catch (error) {
        if (!isCurrentHistoryRequest(request.requestId)) return null;
        if (isCancelledHistoryError(error)) {
          useChatStore.getState().setAnchorCancelled();
          return null;
        }
        useChatStore.getState().setMessagesError(toApiErrorModel(error));
        return null;
      } finally {
        clearCurrentHistoryRequest(request.requestId);
      }
    },
    [
      clearCurrentHistoryRequest,
      isCancelledHistoryError,
      isCurrentHistoryRequest,
      startHistoryRequest,
    ],
  );

  const selectAndLoad = useCallback(
    async (convId: string, chat: string, latestTimestamp?: number | null) => {
      useChatStore.getState().selectConversation(convId);
      await loadHistory(chat, { latestTimestamp });
    },
    [loadHistory],
  );

  const selectAndLoadAtAnchor = useCallback(
    async (
      target: AnchoredChatNavigationTarget,
      options: AnchoredChatNavigationOptions = {},
    ): Promise<AnchoredChatNavigationResult> => {
      const request = startHistoryRequest();
      useChatStore.getState().ensureNavigationConversation({
        id: target.conversationId,
        username: target.chat,
        displayName: target.conversationLabel || target.chat,
        isGroup: target.isGroup ?? target.chat.endsWith("@chatroom"),
      });
      useChatStore.getState().selectConversation(target.conversationId);
      useChatStore.getState().setAnchorLoading(target.anchor, target.returnToSearch);
      useChatStore.getState().setMessagesLoading(true);

      try {
        const fetchAnchorPage = (historyRequest: Parameters<typeof fetchHistory>[0]) =>
          fetchHistory(historyRequest, {
            ...createDiagnosticHttpOptions({
              endpointFamily: "history",
              method: "GET",
              recoveryHint: "retry",
            }),
            signal: request.controller.signal,
          });
        const exact = await findExactAnchorPage({
          anchor: target.anchor,
          limit: HISTORY_PAGE_SIZE,
          windowSeconds: ANCHOR_WINDOW_SECONDS,
          maxMessages: 1_000,
          fetchPage: fetchAnchorPage,
        });
        if (!isCurrentHistoryRequest(request.requestId)) {
          return {
            ok: false,
            reason: "cancelled",
            message: "定位请求已被新的聊天记录请求替换。",
            nearbyFallbackAvailable: false,
          };
        }

        let result = exact.page;
        const hit = exact.hit;
        let nearby = null;
        if (!hit && options.allowNearbyFallback) {
          result = await fetchAnchorPage(
            buildNearbyAnchorHistoryRequest(target.anchor, {
              limit: HISTORY_PAGE_SIZE,
              windowSeconds: ANCHOR_WINDOW_SECONDS,
            }),
          );
          if (!isCurrentHistoryRequest(request.requestId)) {
            return {
              ok: false,
              reason: "cancelled",
              message: "定位请求已被新的聊天记录请求替换。",
              nearbyFallbackAvailable: false,
            };
          }
          nearby = findNearbyAnchoredMessage(result.messages, target.anchor);
        }

        useChatStore
          .getState()
          .setMessages(
            result.messages,
            result.totalCount,
            result.offset,
            hasOlderHistory(result, CHAT_HISTORY_ORDERING_CONTRACT),
            "anchor",
          );
        if (hit) {
          useChatStore.getState().setAnchorHit(hit.id);
          return { ok: true, matchKind: "exact", messageId: hit.id };
        }

        if (nearby) {
          useChatStore.getState().setAnchorNearby(nearby.id);
          return { ok: true, matchKind: "nearby", messageId: nearby.id };
        }

        useChatStore.getState().setAnchorMissing();
        return {
          ok: false,
          reason: "missing",
          message: "已加载来源会话，但无法精确定位这条消息。",
          nearbyFallbackAvailable:
            !options.allowNearbyFallback &&
            typeof target.anchor.timestamp === "number" &&
            target.anchor.timestamp > 0,
        };
      } catch (error) {
        if (!isCurrentHistoryRequest(request.requestId)) {
          return {
            ok: false,
            reason: "cancelled",
            message: "定位请求已被新的聊天记录请求替换。",
            nearbyFallbackAvailable: false,
          };
        }
        if (isCancelledHistoryError(error)) {
          useChatStore.getState().setAnchorCancelled();
          return {
            ok: false,
            reason: "cancelled",
            message: "定位请求已取消。",
            nearbyFallbackAvailable: false,
          };
        }
        useChatStore.getState().setMessagesError(toApiErrorModel(error));
        useChatStore.getState().setAnchorError("已打开会话，但无法加载搜索命中附近的聊天记录。");
        return {
          ok: false,
          reason: "load-failed",
          message: "无法加载这条消息所在的聊天记录，请重试。",
          nearbyFallbackAvailable: false,
        };
      } finally {
        clearCurrentHistoryRequest(request.requestId);
      }
    },
    [
      clearCurrentHistoryRequest,
      isCancelledHistoryError,
      isCurrentHistoryRequest,
      startHistoryRequest,
    ],
  );

  return {
    ...store,
    loadConversations,
    loadHistory,
    loadMoreHistory,
    loadHistoryAtDate,
    selectAndLoad,
    selectAndLoadAtAnchor,
  };
}

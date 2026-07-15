import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button, Spinner, Typography } from "@l4/ui";
import { StatusAnnouncer } from "@l3/common/StatusAnnouncer";
import { ActionableEmptyState } from "@l3/common/ActionableEmptyState";
import type { ActionableEmptyStateView, EmptyStateActionId } from "@l2/commander/actionableEmptyStateModel";
import type {
  ChatMessage,
  ChatMessageAnchor,
  ChatAnchorStatus,
  Conversation,
  LoadStatus,
  TranscriptScrollIntent,
} from "@l2/data-clerk/stores/useChatStore";
import type { ApiErrorModel } from "@/l2-coordinator/diplomat/errorTranslator";
import type { ChatReadingState } from "@/l2-coordinator/commander/chatReadingState";
import {
  resolveTranscriptControlAction,
  type TranscriptControlId,
  type TranscriptPositionModel,
  type TranscriptPositionRow,
} from "@/l2-coordinator/commander/transcriptPositionModel";
import type {
  MessageActionId,
  MessageActionModel,
  SafeRawFieldRow,
} from "@/l2-coordinator/commander/messageActionModel";
import type { MessageAttachmentPreviewModel } from "@/l2-coordinator/commander/messageAttachmentPreviewModel";
import type { MediaAttachment } from "@/l2-coordinator/data-clerk/stores/useMediaStore";
import { classNames } from "@/utils/classNames";
import { MessageBubble } from "./MessageBubble";
import { TranscriptScrollControls } from "./TranscriptScrollControls";
import {
  buildTranscriptRows,
  estimateTranscriptRowHeight,
  findLastTranscriptMessageRowIndex,
  findTranscriptMessageRowIndex,
} from "./transcriptRows";

interface MessageListProps {
  conversation: Conversation | undefined;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesHasMore: boolean;
  messagesHasNewer: boolean;
  messagesStatus: LoadStatus;
  messagesError: string | ApiErrorModel | null;
  readingState: ChatReadingState;
  emptyStates: {
    noConversation: ActionableEmptyStateView;
    conversationEmpty: ActionableEmptyStateView;
  };
  scrollIntent: TranscriptScrollIntent;
  scrollAnchorMessageId: string | null;
  scrollAnchorLocalId: number | null;
  activeAnchor: ChatMessageAnchor | null;
  anchorStatus: ChatAnchorStatus;
  highlightedMessageId: string | null;
  selectionMode: boolean;
  selectedMessageIds: string[];
  selectionStatus: string | null;
  privacyOn: boolean;
  onLoadHistory: (chat: string) => void;
  onLoadMoreHistory: (chat: string) => void;
  onEmptyAction?: (actionId: EmptyStateActionId) => void;
  onScrollIntentHandled: () => void;
  onEnterSelectionMode: () => void;
  onExitSelectionMode: () => void;
  onToggleMessageSelection: (messageId: string, range?: boolean) => void;
  onSelectVisibleMessages: (messageIds: string[]) => void;
  onMessageAction: (message: ChatMessage, actionId: MessageActionId) => void;
  onDeriveTranscriptPosition: (input: {
    rows: TranscriptPositionRow[];
    visibleIndexes: number[];
    messagesHasMore: boolean;
    messagesHasNewer: boolean;
    nearLatest: boolean;
    activeAnchor: ChatMessageAnchor | null;
    anchorStatus: ChatAnchorStatus;
  }) => TranscriptPositionModel;
  getMessageActionModel: (message: ChatMessage) => MessageActionModel;
  getMessageSafeRawFieldRows: (message: ChatMessage) => SafeRawFieldRow[];
  getMessageAttachmentPreviewModel: (attachment: MediaAttachment) => MessageAttachmentPreviewModel;
}

const AUTO_LOAD_TOP_THRESHOLD = 48;
const AUTO_LOAD_RESET_THRESHOLD = 160;

export function MessageList({
  conversation,
  messages,
  messagesLoading,
  messagesHasMore,
  messagesHasNewer,
  messagesStatus,
  messagesError,
  readingState,
  emptyStates,
  scrollIntent,
  scrollAnchorMessageId,
  scrollAnchorLocalId,
  activeAnchor,
  anchorStatus,
  highlightedMessageId,
  selectionMode,
  selectedMessageIds,
  selectionStatus,
  privacyOn,
  onLoadHistory,
  onLoadMoreHistory,
  onEmptyAction,
  onScrollIntentHandled,
  onEnterSelectionMode,
  onExitSelectionMode,
  onToggleMessageSelection,
  onSelectVisibleMessages,
  onMessageAction,
  onDeriveTranscriptPosition,
  getMessageActionModel,
  getMessageSafeRawFieldRows,
  getMessageAttachmentPreviewModel,
}: MessageListProps) {
  const activeChat = conversation?.username || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const historyAutoLoadPendingRef = useRef(false);
  const [nearLatest, setNearLatest] = useState(true);
  const rows = useMemo(() => buildTranscriptRows(messages), [messages]);
  const highlightedRowIndex = useMemo(() => {
    if (!highlightedMessageId && !activeAnchor) return null;
    return findTranscriptMessageRowIndex(rows, {
      messageId: highlightedMessageId ?? activeAnchor?.messageId ?? null,
      localId: activeAnchor?.localId ?? null,
    });
  }, [activeAnchor, highlightedMessageId, rows]);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => estimateTranscriptRowHeight(rows[index]),
    getItemKey: (index) => rows[index]?.id ?? index,
    overscan: 8,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const selectedIds = useMemo(() => new Set(selectedMessageIds), [selectedMessageIds]);
  const transcriptPositionRows = useMemo<TranscriptPositionRow[]>(() =>
    rows.map((row) => row.kind === "date"
      ? row
      : {
          kind: "message" as const,
          id: row.id,
          message: {
            id: row.message.id,
            localId: row.message.localId,
            time: row.message.time,
            timestamp: row.message.timestamp,
          },
        }), [rows]);
  const transcriptPosition = useMemo(() => onDeriveTranscriptPosition({
    rows: transcriptPositionRows,
    visibleIndexes: virtualItems.map((item) => item.index),
    messagesHasMore,
    messagesHasNewer,
    nearLatest,
    activeAnchor,
    anchorStatus,
  }), [
    activeAnchor,
    anchorStatus,
    messagesHasMore,
    messagesHasNewer,
    nearLatest,
    onDeriveTranscriptPosition,
    transcriptPositionRows,
    virtualItems,
  ]);

  useEffect(() => {
    if (highlightedRowIndex === null) return;
    rowVirtualizer.scrollToIndex(highlightedRowIndex, { align: "center" });
    if (scrollIntent === "anchor") {
      onScrollIntentHandled();
    }
  }, [highlightedRowIndex, onScrollIntentHandled, rowVirtualizer, scrollIntent]);

  const scrollAnchorRowIndex = useMemo(() => {
    if (scrollIntent === "latest") return findLastTranscriptMessageRowIndex(rows);
    if (scrollIntent === "preserve") {
      return findTranscriptMessageRowIndex(rows, {
        messageId: scrollAnchorMessageId,
        localId: scrollAnchorLocalId,
      });
    }
    return null;
  }, [rows, scrollAnchorLocalId, scrollAnchorMessageId, scrollIntent]);

  useEffect(() => {
    if (scrollIntent !== "latest" && scrollIntent !== "preserve") return;
    if (scrollAnchorRowIndex === null) return;
    rowVirtualizer.scrollToIndex(scrollAnchorRowIndex, {
      align: scrollIntent === "latest" ? "end" : "start",
    });
    onScrollIntentHandled();
  }, [onScrollIntentHandled, rowVirtualizer, scrollAnchorRowIndex, scrollIntent]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const updateViewportState = () => {
      const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
      setNearLatest(distanceFromBottom < 120);
      if (element.scrollTop > AUTO_LOAD_RESET_THRESHOLD || !messagesHasMore) {
        historyAutoLoadPendingRef.current = false;
      }
      if (
        activeChat &&
        messagesHasMore &&
        !messagesLoading &&
        !historyAutoLoadPendingRef.current &&
        element.scrollTop <= AUTO_LOAD_TOP_THRESHOLD
      ) {
        historyAutoLoadPendingRef.current = true;
        onLoadMoreHistory(activeChat);
      }
    };
    updateViewportState();
    element.addEventListener("scroll", updateViewportState, { passive: true });
    return () => element.removeEventListener("scroll", updateViewportState);
  }, [activeChat, messagesHasMore, messagesLoading, onLoadMoreHistory, rows.length]);

  useEffect(() => {
    historyAutoLoadPendingRef.current = false;
  }, [activeChat]);

  const scrollToLatest = () => {
    const index = findLastTranscriptMessageRowIndex(rows);
    if (index === null) return;
    rowVirtualizer.scrollToIndex(index, { align: "end" });
    setNearLatest(true);
  };

  const scrollToAnchor = () => {
    if (highlightedRowIndex === null) return;
    rowVirtualizer.scrollToIndex(highlightedRowIndex, { align: "center" });
  };

  const handleTranscriptControlAction = (id: TranscriptControlId) => {
    const action = resolveTranscriptControlAction(id, messagesHasNewer);
    if (action === "load-latest") {
      if (activeChat) onLoadHistory(activeChat);
      return;
    }
    if (action === "scroll-latest") {
      scrollToLatest();
      return;
    }
    if (action === "scroll-anchor") {
      scrollToAnchor();
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && selectionMode) {
      event.preventDefault();
      onExitSelectionMode();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a" && selectionMode) {
      event.preventDefault();
      onSelectVisibleMessages(messages.map((message) => message.id));
    }
  };
  const handleEmptyAction = (actionId: EmptyStateActionId) => {
    if (actionId === "refresh" && activeChat) {
      onLoadHistory(activeChat);
      return;
    }
    onEmptyAction?.(actionId);
  };

  if (!conversation) {
    return (
      <ActionableEmptyState
        className="workbench-empty-state"
        model={emptyStates.noConversation}
        onAction={handleEmptyAction}
      />
    );
  }

  if (messagesStatus === "error" && messages.length === 0) {
    return (
      <div className="workbench-error-state" role="alert">
        <Typography variant="label" weight={700}>
          {readingState.title}
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {readingState.description}
        </Typography>
        <Button variant="secondary" size="sm" onClick={() => onLoadHistory(activeChat)}>
          {readingState.primaryAction ?? "重试"}
        </Button>
      </div>
    );
  }

  if (messagesStatus === "empty") {
    return (
      <ActionableEmptyState
        className="workbench-empty-state"
        model={emptyStates.conversationEmpty}
        onAction={handleEmptyAction}
      />
    );
  }

  return (
    <div ref={containerRef} className="message-list" onKeyDown={handleListKeyDown}>
      <StatusAnnouncer
        message={selectionStatus}
        privacyOn={privacyOn}
        privacySafeMessage={privacyOn && selectionStatus ? "消息选择状态已更新" : null}
      />
      {selectionStatus && (
        <div className="message-list__status-toast" role="status">
          {privacyOn ? "消息选择状态已更新。" : selectionStatus}
        </div>
      )}
      <TranscriptScrollControls
        positionText={transcriptPosition.positionText}
        stickyDateLabel={transcriptPosition.stickyDateLabel}
        topTerminalText={transcriptPosition.topTerminalText}
        bottomTerminalText={transcriptPosition.bottomTerminalText}
        controls={transcriptPosition.controls}
        onAction={handleTranscriptControlAction}
      />
      {messagesError && messages.length > 0 && (
        <div className="message-list__inline-error" role="status">
          <Typography variant="caption" color="var(--text-secondary)">
            {readingState.title}：{readingState.description}
          </Typography>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!activeChat) return;
              if (messagesHasNewer) onLoadHistory(activeChat);
              else onLoadMoreHistory(activeChat);
            }}
          >
            {readingState.primaryAction ?? "重试"}
          </Button>
        </div>
      )}
      {messagesHasMore && (
        <div className="message-list__history-status" role="status">
          {messagesLoading && messages.length > 0
            ? "正在载入更早消息..."
            : "继续向上滚动可加载更早消息"}
        </div>
      )}

      {messagesLoading && messages.length === 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <Spinner size={24} label="加载聊天记录..." />
        </div>
      )}

      {rows.length > 0 && (
        <div
          className="message-list__virtual-space"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            const isHighlighted = row.kind === "message" && row.message.id === highlightedMessageId;

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                data-message-id={row.kind === "message" ? row.message.id : undefined}
                data-local-id={row.kind === "message" ? row.message.localId : undefined}
                ref={rowVirtualizer.measureElement}
                className={classNames(
                  "message-list__virtual-row",
                  isHighlighted && "message-list__virtual-row--search-hit",
                )}
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                {row.kind === "date" ? (
                  <div className="message-date-divider">{row.dateLabel}</div>
                ) : (
                  <MessageBubble
                    message={row.message}
                    privacyOn={privacyOn}
                    highlighted={isHighlighted}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(row.message.id)}
                    actionModel={getMessageActionModel(row.message)}
                    safeRawFieldRows={getMessageSafeRawFieldRows(row.message)}
                    getAttachmentPreviewModel={getMessageAttachmentPreviewModel}
                    onEnterSelectionMode={onEnterSelectionMode}
                    onToggleSelected={(range) => onToggleMessageSelection(row.message.id, range)}
                    onAction={(actionId) => onMessageAction(row.message, actionId)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {!messagesHasMore && messages.length > 0 && (
        <div className="message-date-divider">
          {readingState.title} · 已加载 {messages.length.toLocaleString()} 条消息
        </div>
      )}
    </div>
  );
}

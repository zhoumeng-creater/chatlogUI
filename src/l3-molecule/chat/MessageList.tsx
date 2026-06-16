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
import type {
  TranscriptControlId,
  TranscriptPositionModel,
  TranscriptPositionRow,
} from "@/l2-coordinator/commander/transcriptPositionModel";
import type {
  MessageActionId,
  MessageActionModel,
  SafeRawFieldRow,
} from "@/l2-coordinator/commander/messageActionModel";
import { classNames } from "@/utils/classNames";
import { MessageBubble } from "./MessageBubble";
import { MessageSelectionToolbar } from "./MessageSelectionToolbar";
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
  selectionSummary: string;
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
  onCopySelectedMarkdown: () => void;
  onExportSelected: () => void;
  onMessageAction: (message: ChatMessage, actionId: MessageActionId) => void;
  onDeriveTranscriptPosition: (input: {
    rows: TranscriptPositionRow[];
    visibleIndexes: number[];
    messagesHasMore: boolean;
    nearLatest: boolean;
    activeAnchor: ChatMessageAnchor | null;
    anchorStatus: ChatAnchorStatus;
  }) => TranscriptPositionModel;
  getMessageActionModel: (message: ChatMessage) => MessageActionModel;
  getMessageSafeRawFieldRows: (message: ChatMessage) => SafeRawFieldRow[];
}

export function MessageList({
  conversation,
  messages,
  messagesLoading,
  messagesHasMore,
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
  selectionSummary,
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
  onCopySelectedMarkdown,
  onExportSelected,
  onMessageAction,
  onDeriveTranscriptPosition,
  getMessageActionModel,
  getMessageSafeRawFieldRows,
}: MessageListProps) {
  const activeChat = conversation?.username || "";
  const containerRef = useRef<HTMLDivElement>(null);
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
    nearLatest,
    activeAnchor,
    anchorStatus,
  }), [
    activeAnchor,
    anchorStatus,
    messagesHasMore,
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
    const updateNearLatest = () => {
      const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
      setNearLatest(distanceFromBottom < 120);
    };
    updateNearLatest();
    element.addEventListener("scroll", updateNearLatest, { passive: true });
    return () => element.removeEventListener("scroll", updateNearLatest);
  }, [rows.length]);

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
    if (id === "latest" || id === "bottom") {
      scrollToLatest();
      return;
    }
    if (id === "return-anchor") {
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
      <TranscriptScrollControls
        positionText={transcriptPosition.positionText}
        stickyDateLabel={transcriptPosition.stickyDateLabel}
        topTerminalText={transcriptPosition.topTerminalText}
        bottomTerminalText={transcriptPosition.bottomTerminalText}
        controls={transcriptPosition.controls}
        onAction={handleTranscriptControlAction}
      />
      {selectionMode && (
        <MessageSelectionToolbar
          selectedCount={selectedMessageIds.length}
          privacyOn={privacyOn}
          summary={selectionSummary}
          exportDisabledReason={selectedMessageIds.length === 0 ? "先选择要导出的消息。" : null}
          aiDisabledReason="AI 暂未提供选中消息入口。"
          graphDisabledReason="图谱暂未提供选中消息入口。"
          onCopyMarkdown={onCopySelectedMarkdown}
          onExportSelected={onExportSelected}
          onSendToAi={() => undefined}
          onCreateGraphContext={() => undefined}
          onCancel={onExitSelectionMode}
        />
      )}
      {messagesError && messages.length > 0 && (
        <div className="message-list__inline-error" role="status">
          <Typography variant="caption" color="var(--text-secondary)">
            {readingState.title}：{readingState.description}
          </Typography>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => activeChat && onLoadMoreHistory(activeChat)}
          >
            {readingState.primaryAction ?? "重试"}
          </Button>
        </div>
      )}
      {messagesHasMore && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <Button
            variant="secondary"
            size="sm"
            loading={messagesLoading}
            onClick={() => activeChat && onLoadMoreHistory(activeChat)}
          >
            加载更早消息
          </Button>
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

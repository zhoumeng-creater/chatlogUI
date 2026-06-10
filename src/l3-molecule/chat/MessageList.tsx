import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button, Spinner, Typography } from "@l4/ui";
import type {
  ChatMessage,
  ChatMessageAnchor,
  Conversation,
  LoadStatus,
} from "@l2/data-clerk/stores/useChatStore";
import { classNames } from "@/utils/classNames";
import { MessageBubble } from "./MessageBubble";
import {
  buildTranscriptRows,
  estimateTranscriptRowHeight,
  findTranscriptMessageRowIndex,
} from "./transcriptRows";

interface MessageListProps {
  conversation: Conversation | undefined;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesHasMore: boolean;
  messagesStatus: LoadStatus;
  messagesError: string | null;
  activeAnchor: ChatMessageAnchor | null;
  highlightedMessageId: string | null;
  privacyOn: boolean;
  onLoadHistory: (chat: string) => void;
  onLoadMoreHistory: (chat: string) => void;
}

export function MessageList({
  conversation,
  messages,
  messagesLoading,
  messagesHasMore,
  messagesStatus,
  messagesError,
  activeAnchor,
  highlightedMessageId,
  privacyOn,
  onLoadHistory,
  onLoadMoreHistory,
}: MessageListProps) {
  const activeChat = conversation?.username || "";
  const containerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (highlightedRowIndex === null) return;
    rowVirtualizer.scrollToIndex(highlightedRowIndex, { align: "center" });
  }, [highlightedRowIndex, rowVirtualizer]);

  if (!conversation) {
    return (
      <div className="workbench-empty-state">
        <Typography variant="label" weight={700}>
          选择会话
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          从左侧会话列表打开聊天记录。
        </Typography>
      </div>
    );
  }

  if (messagesStatus === "error") {
    return (
      <div className="workbench-error-state" role="alert">
        <Typography variant="label" weight={700}>
          聊天记录加载失败
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {messagesError ?? "无法读取该会话的历史消息。"}
        </Typography>
        <Button variant="secondary" size="sm" onClick={() => onLoadHistory(activeChat)}>
          重试
        </Button>
      </div>
    );
  }

  if (messagesStatus === "empty") {
    return (
      <div className="workbench-empty-state">
        <Typography variant="label" weight={700}>
          没有消息
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          后端没有返回该会话的聊天记录。
        </Typography>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="message-list">
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
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
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
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {!messagesHasMore && messages.length > 0 && (
        <div className="message-date-divider">
          已加载全部 {messages.length.toLocaleString()} 条消息
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button, Spinner, Typography } from "@l4/ui";
import type {
  ChatMessage,
  ChatMessageAnchor,
  Conversation,
  LoadStatus,
  TranscriptScrollIntent,
} from "@l2/data-clerk/stores/useChatStore";
import type { ApiErrorModel } from "@/l2-coordinator/diplomat/errorTranslator";
import type { ChatReadingState } from "@/l2-coordinator/commander/chatReadingState";
import { classNames } from "@/utils/classNames";
import { MessageBubble } from "./MessageBubble";
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
  scrollIntent: TranscriptScrollIntent;
  scrollAnchorMessageId: string | null;
  scrollAnchorLocalId: number | null;
  activeAnchor: ChatMessageAnchor | null;
  highlightedMessageId: string | null;
  privacyOn: boolean;
  onLoadHistory: (chat: string) => void;
  onLoadMoreHistory: (chat: string) => void;
  onScrollIntentHandled: () => void;
}

export function MessageList({
  conversation,
  messages,
  messagesLoading,
  messagesHasMore,
  messagesStatus,
  messagesError,
  readingState,
  scrollIntent,
  scrollAnchorMessageId,
  scrollAnchorLocalId,
  activeAnchor,
  highlightedMessageId,
  privacyOn,
  onLoadHistory,
  onLoadMoreHistory,
  onScrollIntentHandled,
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

  if (!conversation) {
    return (
      <div className="workbench-empty-state">
        <Typography variant="label" weight={700}>
          选择会话
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {readingState.description}
        </Typography>
      </div>
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
      <div className="workbench-empty-state">
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

  return (
    <div ref={containerRef} className="message-list">
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

      {!nearLatest && rows.length > 0 && (
        <Button
          className="message-list__jump-latest"
          variant="secondary"
          size="sm"
          onClick={scrollToLatest}
        >
          跳到最新
        </Button>
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
          {readingState.title} · 已加载 {messages.length.toLocaleString()} 条消息
        </div>
      )}
    </div>
  );
}

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button, Spinner, Typography } from "@l4/ui";
import type { ChatMessage, Conversation, LoadStatus } from "@l2/data-clerk/stores/useChatStore";
import { MessageBubble } from "./MessageBubble";
import { buildTranscriptRows, estimateTranscriptRowHeight } from "./transcriptRows";

interface MessageListProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesHasMore: boolean;
  messagesStatus: LoadStatus;
  messagesError: string | null;
  privacyOn: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
}

export function MessageList({
  conversation,
  messages,
  messagesLoading,
  messagesHasMore,
  messagesStatus,
  messagesError,
  privacyOn,
  onRetry,
  onLoadMore,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => buildTranscriptRows(messages), [messages]);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => estimateTranscriptRowHeight(rows[index]),
    getItemKey: (index) => rows[index]?.id ?? index,
    overscan: 8,
  });

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
        <Button variant="secondary" size="sm" onClick={onRetry}>
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
            onClick={onLoadMore}
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
          className="message-list__virtual-spacer"
          style={{
            height: virtualizer.getTotalSize(),
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];

            return (
              <div
                key={row.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="message-list__virtual-row"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.kind === "date" ? (
                  <div className="message-date-divider">{row.dateLabel}</div>
                ) : (
                  <MessageBubble message={row.message} privacyOn={privacyOn} />
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

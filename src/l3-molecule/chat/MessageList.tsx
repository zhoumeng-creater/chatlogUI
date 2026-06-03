import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button, Spinner, Typography } from "@l4/ui";
import { useChatCommander, useMediaCommander } from "@l2/commander/";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { MediaPreviewSheet } from "@l3/media/MediaPreviewSheet";
import { MessageBubble } from "./MessageBubble";
import { buildTranscriptRows, estimateTranscriptRowHeight } from "./transcriptRows";

export function MessageList() {
  const {
    selectedConversationId,
    messages,
    messagesLoading,
    messagesHasMore,
    messagesStatus,
    messagesError,
    loadHistory,
    loadMoreHistory,
  } = useChatCommander();
  const media = useMediaCommander();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);

  const conversations = useChatStore((state) => state.conversations);
  const currentConv = conversations.find((conversation) => conversation.id === selectedConversationId);
  const activeChat = currentConv?.username || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => buildTranscriptRows(messages), [messages]);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => estimateTranscriptRowHeight(rows[index]),
    getItemKey: (index) => rows[index]?.id ?? index,
    overscan: 8,
  });

  if (!currentConv) {
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
        <Button variant="secondary" size="sm" onClick={() => void loadHistory(activeChat)}>
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
            onClick={() => activeChat && void loadMoreHistory(activeChat)}
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

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="message-list__virtual-row"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                {row.kind === "date" ? (
                  <div className="message-date-divider">{row.dateLabel}</div>
                ) : (
                  <MessageBubble message={row.message} onOpenAttachment={media.openPreview} />
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
      <MediaPreviewSheet
        preview={media.preview}
        privacyOn={privacyOn}
        onClose={media.closePreview}
      />
    </div>
  );
}

import { useRef, useEffect, useCallback } from "react";
import { Typography, Spinner } from "@l4/ui";
import { useChatCommander } from "@l2/commander/";
import type { HistoryMessage } from "@l2/api-docs/history";
import { MessageBubble } from "./MessageBubble";

function shouldShowAvatar(messages: HistoryMessage[], index: number): boolean {
  if (index === messages.length - 1) return true;
  const curr = messages[index];
  const next = messages[index + 1];
  if (curr.sender !== next.sender) return true;
  try {
    const currTime = new Date(curr.time).getTime();
    const nextTime = new Date(next.time).getTime();
    if (Math.abs(currTime - nextTime) > 5 * 60 * 1000) return true;
  } catch {
    // ignore
  }
  return false;
}

export function MessageList() {
  const {
    selectedContact,
    selectedChatRoom,
    messages,
    messagesLoading,
    messagesTotalCount,
    messagesOffset,
    loadMoreHistory,
  } = useChatCommander();

  const activeChat = selectedContact?.userName || selectedChatRoom?.name || "";

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const isFirstLoad = useRef(true);

  const allLoaded = messagesOffset >= messagesTotalCount && messagesTotalCount > 0;

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop <= 50 && !allLoaded) {
      if (activeChat) loadMoreHistory(activeChat);
    }
  }, [activeChat, allLoaded, loadMoreHistory]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      if (isFirstLoad.current) {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
        isFirstLoad.current = false;
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    isFirstLoad.current = true;
    prevMessageCountRef.current = 0;
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [selectedContact?.userName, selectedChatRoom?.name]);

  if (!selectedContact && !selectedChatRoom) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 8,
        }}
      >
        <Typography variant="h2" color="var(--color-text-primary)" weight={600}>
          chatlog_alpha
        </Typography>
        <Typography variant="body" color="var(--color-text-tertiary)">
          选择联系人开始查看聊天记录
        </Typography>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column-reverse",
      }}
    >
      <div ref={bottomRef} />

      {messagesLoading && messages.length === 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <Spinner size={28} label="加载中..." />
        </div>
      )}

      {allLoaded && (
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
          <Typography variant="caption" color="var(--color-text-tertiary)">
            已加载全部 {messagesTotalCount} 条消息
          </Typography>
        </div>
      )}

      {[...messages].reverse().map((msg, idx) => {
        const originalIdx = messages.length - 1 - idx;
        return (
          <MessageBubble
            key={msg.seq || msg.id}
            message={msg}
            isSelf={msg.isSelf}
            showAvatar={shouldShowAvatar(messages, originalIdx)}
          />
        );
      })}
    </div>
  );
}

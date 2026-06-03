import { useMemo, useState } from "react";
import { Button, SkeletonLoader, Typography } from "@l4/ui";
import type { Conversation, LoadStatus } from "@l2/data-clerk/stores/useChatStore";
import { ConversationListToolbar } from "./ConversationListToolbar";
import { ConversationRow } from "./ConversationRow";
import {
  filterConversations,
  getConversationEmptyMessage,
  type ConversationFilter,
} from "./conversationDisplay";

interface ConversationListProps {
  conversations: Conversation[];
  conversationsStatus: LoadStatus;
  conversationsError: string | null;
  selectedConversationId: string | null;
  privacyOn: boolean;
  onLoadConversations: () => void;
  onOpenConversation: (conversation: Conversation) => void;
  onConversationOpened?: () => void;
}

export function ConversationList({
    conversations,
    conversationsStatus,
    conversationsError,
    selectedConversationId,
  privacyOn,
  onLoadConversations,
  onOpenConversation,
  onConversationOpened,
}: ConversationListProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("recent");

  const visibleConversations = useMemo(
    () => filterConversations(conversations, query, filter),
    [conversations, filter, query],
  );

  const openConversation = (conversation: Conversation) => {
    onOpenConversation(conversation);
    onConversationOpened?.();
  };

  return (
    <div className="conversation-list" aria-busy={conversationsStatus === "loading"}>
      <ConversationListToolbar
        query={query}
        filter={filter}
        onQueryChange={setQuery}
        onFilterChange={setFilter}
      />
      <div className="conversation-list__body" role="list" aria-label="会话列表">
        {conversationsStatus === "loading" ? (
          <SkeletonLoader variant="rect" height={64} count={8} />
        ) : conversationsStatus === "error" ? (
          <div className="workbench-error-state" role="alert">
            <Typography variant="label" weight={700}>
              会话列表加载失败
            </Typography>
            <Typography variant="body" color="var(--text-secondary)">
              {conversationsError ?? "无法读取最近会话。"}
            </Typography>
            <Button variant="secondary" size="sm" onClick={onLoadConversations}>
              重试
            </Button>
          </div>
        ) : visibleConversations.length === 0 ? (
          <div className="workbench-empty-state">
            <Typography variant="label" weight={700}>
              {getConversationEmptyMessage(conversationsStatus, query, filter)}
            </Typography>
            {query.trim() && (
              <Button variant="ghost" size="sm" onClick={() => setQuery("")}>
                清除搜索
              </Button>
            )}
          </div>
        ) : (
          visibleConversations.map((conversation) => (
            <div key={conversation.id} role="listitem">
              <ConversationRow
                conversation={conversation}
                selected={conversation.id === selectedConversationId}
                privacyOn={privacyOn}
                onOpen={openConversation}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

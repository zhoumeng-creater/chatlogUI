import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { Button, SkeletonLoader, Typography } from "@l4/ui";
import type { Conversation, LoadStatus, UnreadStatus } from "@l2/data-clerk/stores/useChatStore";
import {
  filterConversationItems,
  getConversationFilterOptions,
  getConversationListSortState,
  getConversationListStatusMessage,
  moveConversationListFocus,
  resolveConversationListActiveId,
  type ConversationListFilter,
} from "@l2/commander/conversationListInteractionModel";
import { StatusAnnouncer } from "@l3/common/StatusAnnouncer";
import { ConversationListToolbar } from "./ConversationListToolbar";
import { ConversationRow } from "./ConversationRow";
import {
  getConversationEmptyMessage,
} from "./conversationDisplay";

interface ConversationListProps {
  conversations: Conversation[];
  conversationsStatus: LoadStatus;
  conversationsError: string | null;
  unreadStatus: UnreadStatus;
  selectedConversationId: string | null;
  query: string;
  filter: ConversationListFilter;
  activeConversationId: string | null;
  privacyOn: boolean;
  onLoadConversations: () => void;
  onOpenConversation: (conversation: Conversation) => void;
  onConversationOpened?: () => void;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: ConversationListFilter) => void;
  onActiveConversationChange: (id: string | null) => void;
  onClearFilters: () => void;
}

export function ConversationList({
    conversations,
    conversationsStatus,
    conversationsError,
    unreadStatus,
    selectedConversationId,
    query,
    filter,
    activeConversationId,
  privacyOn,
  onLoadConversations,
  onOpenConversation,
  onConversationOpened,
  onQueryChange,
  onFilterChange,
  onActiveConversationChange,
  onClearFilters,
}: ConversationListProps) {
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  const visibleConversations = useMemo(
    () => filterConversationItems(conversations, query, filter),
    [conversations, filter, query],
  );
  const visibleIds = useMemo(
    () => visibleConversations.map((conversation) => conversation.id),
    [visibleConversations],
  );
  const filterOptions = useMemo(() => getConversationFilterOptions(conversations), [conversations]);
  const sortState = useMemo(() => getConversationListSortState(conversations), [conversations]);
  const resolvedActiveId = useMemo(() => resolveConversationListActiveId({
    visibleConversations,
    activeId: activeConversationId,
    selectedConversationId,
  }), [activeConversationId, selectedConversationId, visibleConversations]);
  const statusMessage = useMemo(() => getConversationListStatusMessage({
    visibleCount: visibleConversations.length,
    query,
    filter,
  }), [filter, query, visibleConversations.length]);

  useEffect(() => {
    if (resolvedActiveId !== activeConversationId) {
      onActiveConversationChange(resolvedActiveId);
    }
  }, [activeConversationId, onActiveConversationChange, resolvedActiveId]);

  const openConversation = (conversation: Conversation) => {
    onOpenConversation(conversation);
    onConversationOpened?.();
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    conversation: Conversation,
  ) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Enter"].includes(event.key)) return;
    event.preventDefault();
    const result = moveConversationListFocus({
      ids: visibleIds,
      activeId: resolvedActiveId,
      key: event.key,
    });
    onActiveConversationChange(result.activeId);
    if (result.activeId) {
      rowRefs.current.get(result.activeId)?.focus();
    }
    if (result.openId === conversation.id) {
      openConversation(conversation);
    }
  };

  return (
    <div className="conversation-list" aria-busy={conversationsStatus === "loading"}>
      <StatusAnnouncer
        message={statusMessage}
        privacyOn={privacyOn}
        privacySafeMessage={privacyOn ? `已显示 ${visibleConversations.length.toLocaleString()} 个会话` : null}
      />
      <ConversationListToolbar
        query={query}
        filter={filter}
        filterOptions={filterOptions}
        sortState={sortState}
        onQueryChange={onQueryChange}
        onFilterChange={onFilterChange}
        onClearQuery={() => onQueryChange("")}
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
            <div className="conversation-list__empty-actions">
              {query.trim() && (
              <Button variant="ghost" size="sm" onClick={() => onQueryChange("")}>
                清除搜索
              </Button>
              )}
              {filter !== "all" && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                  显示全部
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={onLoadConversations}>
                刷新会话
              </Button>
            </div>
          </div>
        ) : (
          visibleConversations.map((conversation) => (
            <div key={conversation.id} role="listitem">
              <ConversationRow
                ref={(node) => {
                  if (node) {
                    rowRefs.current.set(conversation.id, node);
                  } else {
                    rowRefs.current.delete(conversation.id);
                  }
                }}
                conversation={conversation}
                selected={conversation.id === selectedConversationId}
                active={conversation.id === resolvedActiveId}
                tabIndex={conversation.id === resolvedActiveId ? 0 : -1}
                privacyOn={privacyOn}
                unreadStatus={unreadStatus}
                onOpen={openConversation}
                onFocus={() => onActiveConversationChange(conversation.id)}
                onKeyDown={(event) => handleRowKeyDown(event, conversation)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

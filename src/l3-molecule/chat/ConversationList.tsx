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
import type { ActionableEmptyStateView, EmptyStateActionId } from "@l2/commander/actionableEmptyStateModel";
import { StatusAnnouncer } from "@l3/common/StatusAnnouncer";
import { ActionableEmptyState } from "@l3/common/ActionableEmptyState";
import { ConversationListToolbar } from "./ConversationListToolbar";
import { ConversationRow } from "./ConversationRow";

interface ConversationListProps {
  conversations: Conversation[];
  conversationsStatus: LoadStatus;
  conversationsError: string | null;
  unreadStatus: UnreadStatus;
  selectedConversationId: string | null;
  query: string;
  filter: ConversationListFilter;
  activeConversationId: string | null;
  emptyState: ActionableEmptyStateView;
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
  emptyState,
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
  const handleEmptyAction = (actionId: EmptyStateActionId) => {
    if (actionId === "clear-filters" || actionId === "clear-search") {
      if (query.trim()) onQueryChange("");
      if (filter !== "all") onClearFilters();
      return;
    }
    if (actionId === "refresh") {
      onLoadConversations();
    }
  };

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
          <ActionableEmptyState
            className="workbench-empty-state"
            model={emptyState}
            onAction={handleEmptyAction}
          />
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

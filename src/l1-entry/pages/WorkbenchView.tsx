import { useEffect } from "react";
import { useWorkbenchCommander } from "@l2/commander/useWorkbenchCommander";
import { ContactList } from "@l3/chat/ContactList";
import { ChatView } from "@l3/chat/ChatView";
import { BusinessExportDialog } from "@l3/export";
import { ConversationInspector } from "@l3/workbench/ConversationInspector";
import { WorkbenchFrame } from "@l3/workbench/WorkbenchFrame";
import { WorkspaceCommandBar } from "@l3/workspace/WorkspaceCommandBar";
import { ConversationInlineSearch } from "@l3/workspace/ConversationInlineSearch";
import { ConversationDateJumpDialog } from "@l3/workspace/ConversationDateJumpDialog";
import { Button, Typography } from "@l4/ui";

function getSearchAnchorStatusText(status: string): string {
  if (status === "loading") return "正在定位搜索命中";
  if (status === "hit") return "已定位搜索命中";
  if (status === "missing") return "已打开会话，但未能精确定位命中消息";
  if (status === "error") return "已打开会话，但命中附近记录加载失败";
  if (status === "cancelled") return "搜索定位已取消";
  return "可返回搜索结果";
}

function getAiEvidenceAnchorStatusText(status: string): string {
  if (status === "loading") return "正在定位 AI 证据";
  if (status === "hit") return "已定位 AI 证据";
  if (status === "missing") return "已打开会话，证据未提供消息锚点，需手动核对";
  if (status === "error") return "已打开会话，但证据附近记录加载失败";
  if (status === "cancelled") return "AI 证据定位已取消";
  return "可返回 AI 证据";
}

export function getReturnContextStatusText(label: string, anchorStatus: string): string {
  if (label === "来自搜索结果") return getSearchAnchorStatusText(anchorStatus);
  if (label === "来自 AI 证据") return getAiEvidenceAnchorStatusText(anchorStatus);
  return "可返回来源上下文";
}

export function WorkbenchView() {
  const workbench = useWorkbenchCommander();
  const highlightedMessageId = workbench.chat.highlightedMessageId ?? workbench.conversationSearch.activeMessageId;
  const clearHighlightedMessage = workbench.chat.clearHighlightedMessage;

  useEffect(() => {
    if (!highlightedMessageId) return;
    const timeout = window.setTimeout(() => {
      clearHighlightedMessage();
    }, 3500);
    return () => window.clearTimeout(timeout);
  }, [clearHighlightedMessage, highlightedMessageId]);

  const conversationList = (
    <ContactList
      conversations={workbench.chat.conversations}
      conversationsStatus={workbench.chat.conversationsStatus}
      conversationsError={workbench.chat.conversationsError}
      unreadStatus={workbench.chat.unreadStatus}
      selectedConversationId={workbench.chat.selectedConversationId}
      query={workbench.chat.conversationListQuery}
      filter={workbench.chat.conversationListFilter}
      activeConversationId={workbench.chat.conversationListActiveId}
      emptyState={workbench.conversationListEmptyState}
      privacyOn={workbench.privacyOn}
      onLoadConversations={() => void workbench.chat.loadConversations()}
      onOpenConversation={(conversation) => {
        void workbench.chat.selectAndLoad(
          conversation.id,
          conversation.username,
          conversation.timestamp,
        );
      }}
      onConversationOpened={workbench.handleConversationOpened}
      onQueryChange={workbench.chat.setConversationListQuery}
      onFilterChange={workbench.chat.setConversationListFilter}
      onActiveConversationChange={workbench.chat.setConversationListActiveId}
      onClearFilters={workbench.chat.clearConversationListFilters}
    />
  );

  const mainContent = workbench.conversationListAsMain
    ? conversationList
    : (
      <ChatView
        conversation={workbench.currentConversation}
        messages={workbench.chat.messages}
        messagesLoading={workbench.chat.messagesLoading}
        messagesHasMore={workbench.chat.messagesHasMore}
        messagesStatus={workbench.chat.messagesStatus}
        messagesError={workbench.chat.messagesError}
        readingState={workbench.chatReadingState}
        emptyStates={workbench.messageListEmptyStates}
        messagesTotalCount={workbench.chat.messagesTotalCount}
        scrollIntent={workbench.chat.scrollIntent}
        scrollAnchorMessageId={workbench.chat.scrollAnchorMessageId}
        scrollAnchorLocalId={workbench.chat.scrollAnchorLocalId}
        activeAnchor={workbench.chat.activeAnchor}
        anchorStatus={workbench.chat.anchorStatus}
        highlightedMessageId={highlightedMessageId}
        selectionMode={workbench.chat.selectionMode}
        selectedMessageIds={workbench.chat.selectedMessageIds}
        selectionSummary={workbench.selectionSummary}
        selectionStatus={workbench.chat.selectionStatus}
        selectionFilters={workbench.selectionFilters}
        selectionFilterModel={workbench.selectionFilterModel}
        selectionFilterError={workbench.selectionFilterError}
        privacyOn={workbench.privacyOn}
        onLoadHistory={(chat) => void workbench.chat.loadHistory(chat, {
          latestTimestamp: workbench.currentConversation?.username === chat
            ? workbench.currentConversation.timestamp
            : undefined,
        })}
        onLoadMoreHistory={(chat) => void workbench.chat.loadMoreHistory(chat)}
        onEmptyAction={(actionId) => {
          if (actionId === "choose-conversation") workbench.openConversationList();
        }}
        onScrollIntentHandled={workbench.chat.clearScrollIntent}
        onEnterSelectionMode={workbench.chat.enterSelectionMode}
        onExitSelectionMode={workbench.chat.exitSelectionMode}
        onToggleMessageSelection={workbench.chat.toggleMessageSelection}
        onSelectVisibleMessages={workbench.chat.selectVisibleMessages}
        onSelectionFilterChange={workbench.updateSelectionFilters}
        onApplySelectionFilters={workbench.applySelectionFilters}
        onCopySelectedMarkdown={() => void workbench.copySelectedMessagesAsMarkdown()}
        onExportSelected={workbench.selectedFragmentExport.action.onClick}
        onMessageAction={(message, actionId) => void workbench.handleMessageAction(message, actionId)}
        onDeriveTranscriptPosition={workbench.deriveTranscriptPositionModel}
        getMessageActionModel={workbench.getMessageActionModel}
        getMessageSafeRawFieldRows={workbench.getMessageSafeRawFieldRows}
      />
    );

  return (
    <WorkbenchFrame
      layout={workbench.layout}
      conversationList={conversationList}
      toolbar={(
        <div className={`workbench-chat-toolbar${workbench.returnContext ? " workbench-chat-toolbar--with-search-return" : ""}`}>
          <div className="workbench-chat-toolbar__title">
            <Typography className="workbench-chat-toolbar__conversation-name" variant="label" weight={700}>
              {workbench.toolbarConversationTitle}
            </Typography>
            <Typography className="workbench-chat-toolbar__scope" variant="caption" color="var(--text-secondary)">
              会话阅读工作区
            </Typography>
          </div>
          <div className="workbench-chat-toolbar__actions">
            {workbench.layout.mode === "single" && workbench.singlePaneView === "detail" && (
              <Button variant="secondary" size="sm" onClick={workbench.openConversationList}>
                返回会话列表
              </Button>
            )}
            <WorkspaceCommandBar
              model={workbench.commandBar}
              onAction={workbench.handleCommandBarAction}
            />
          </div>
          {workbench.returnContext && (
            <div className="workbench-search-return workspace-return-context" role="status">
              <Typography variant="caption" color="var(--text-secondary)">
                {workbench.returnContext.label} · {getReturnContextStatusText(
                  workbench.returnContext.label,
                  workbench.chat.anchorStatus,
                )}
              </Typography>
              {workbench.returnContext.actionLabel && (
                <Button variant="secondary" size="sm" onClick={workbench.returnToSearchResults}>
                  {workbench.returnContext.actionLabel}
                </Button>
              )}
            </div>
          )}
          <ConversationInlineSearch {...workbench.conversationSearch} />
        </div>
      )}
      inspectorTitle={workbench.inspectorTitle}
      inspectorOpen={workbench.inspectorOpen}
      onResizePanel={workbench.resizePanel}
      onResetPanel={workbench.resetPanel}
      onCloseInspector={workbench.closeInspector}
      inspector={(
        <ConversationInspector
          conversationTitle={workbench.toolbarConversationTitle}
          hasConversation={Boolean(workbench.currentConversation)}
          stats={{
            loading: workbench.stats.loading,
            error: workbench.stats.error,
            messageCount: workbench.stats.stats?.total ?? null,
            rangeLabel: workbench.stats.stats?.queryRangeLabel ?? null,
          }}
          privacyOn={workbench.privacyOn}
          onRetryStats={workbench.retryStats}
          onOpenAnalytics={workbench.openAnalytics}
        />
      )}
    >
      {mainContent}
      {workbench.conversationExport.isOpen && (
        <BusinessExportDialog {...workbench.conversationExport.dialog} />
      )}
      {workbench.selectedFragmentExport.isOpen && (
        <BusinessExportDialog {...workbench.selectedFragmentExport.dialog} />
      )}
      <ConversationDateJumpDialog {...workbench.dateJump} />
    </WorkbenchFrame>
  );
}

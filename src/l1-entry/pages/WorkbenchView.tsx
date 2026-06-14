import { useEffect } from "react";
import { useWorkbenchCommander } from "@l2/commander/useWorkbenchCommander";
import { ContactList } from "@l3/chat/ContactList";
import { ChatView } from "@l3/chat/ChatView";
import { BusinessExportDialog } from "@l3/export";
import { ConversationInspector } from "@l3/workbench/ConversationInspector";
import { WorkbenchFrame } from "@l3/workbench/WorkbenchFrame";
import { WorkspaceCommandBar } from "@l3/workspace/WorkspaceCommandBar";
import { Button, Typography } from "@l4/ui";

function getSearchAnchorStatusText(status: string): string {
  if (status === "loading") return "正在定位搜索命中";
  if (status === "hit") return "已定位搜索命中";
  if (status === "missing") return "已打开会话，但未能精确定位命中消息";
  if (status === "error") return "已打开会话，但命中附近记录加载失败";
  if (status === "cancelled") return "搜索定位已取消";
  return "可返回搜索结果";
}

export function WorkbenchView() {
  const workbench = useWorkbenchCommander();
  const highlightedMessageId = workbench.chat.highlightedMessageId;
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
      privacyOn={workbench.privacyOn}
      onLoadConversations={() => void workbench.chat.loadConversations()}
      onOpenConversation={(conversation) => {
        void workbench.chat.selectAndLoad(conversation.id, conversation.username);
      }}
      onConversationOpened={workbench.handleConversationOpened}
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
        messagesTotalCount={workbench.chat.messagesTotalCount}
        scrollIntent={workbench.chat.scrollIntent}
        scrollAnchorMessageId={workbench.chat.scrollAnchorMessageId}
        scrollAnchorLocalId={workbench.chat.scrollAnchorLocalId}
        activeAnchor={workbench.chat.activeAnchor}
        highlightedMessageId={workbench.chat.highlightedMessageId}
        privacyOn={workbench.privacyOn}
        onLoadHistory={(chat) => void workbench.chat.loadHistory(chat)}
        onLoadMoreHistory={(chat) => void workbench.chat.loadMoreHistory(chat)}
        onScrollIntentHandled={workbench.chat.clearScrollIntent}
      />
    );

  return (
    <WorkbenchFrame
      layout={workbench.layout}
      conversationList={conversationList}
      toolbar={(
        <div className={`workbench-chat-toolbar${workbench.returnContext ? " workbench-chat-toolbar--with-search-return" : ""}`}>
          <div className="workbench-chat-toolbar__title">
            <Typography variant="label" weight={700}>
              {workbench.toolbarConversationTitle}
            </Typography>
            <Typography variant="caption" color="var(--text-secondary)">
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
                {workbench.returnContext.label}
                {workbench.returnContext.label === "来自搜索结果"
                  ? ` · ${getSearchAnchorStatusText(workbench.chat.anchorStatus)}`
                  : " · 可返回来源上下文"}
              </Typography>
              {workbench.returnContext.actionLabel && (
                <Button variant="secondary" size="sm" onClick={workbench.returnToSearchResults}>
                  {workbench.returnContext.actionLabel}
                </Button>
              )}
            </div>
          )}
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
    </WorkbenchFrame>
  );
}

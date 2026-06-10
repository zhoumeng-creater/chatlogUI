import { useWorkbenchCommander } from "@l2/commander/useWorkbenchCommander";
import { ContactList } from "@l3/chat/ContactList";
import { ChatView } from "@l3/chat/ChatView";
import { ConversationInspector } from "@l3/workbench/ConversationInspector";
import { WorkbenchFrame } from "@l3/workbench/WorkbenchFrame";
import { Button, Typography } from "@l4/ui";

export function WorkbenchView() {
  const workbench = useWorkbenchCommander();

  const conversationList = (
    <ContactList
      conversations={workbench.chat.conversations}
      conversationsStatus={workbench.chat.conversationsStatus}
      conversationsError={workbench.chat.conversationsError}
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
        messagesTotalCount={workbench.chat.messagesTotalCount}
        privacyOn={workbench.privacyOn}
        onLoadHistory={(chat) => void workbench.chat.loadHistory(chat)}
        onLoadMoreHistory={(chat) => void workbench.chat.loadMoreHistory(chat)}
      />
    );

  return (
    <WorkbenchFrame
      layout={workbench.layout}
      conversationList={conversationList}
      toolbar={(
        <div className="workbench-chat-toolbar">
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
            <Button
              variant="secondary"
              size="sm"
              disabled={!workbench.currentConversation}
              onClick={workbench.openSearch}
            >
              搜索此会话
            </Button>
            {workbench.layout.inspectorMode !== "inline" && (
              <Button
                variant="ghost"
                size="sm"
                disabled={!workbench.currentConversation}
                onClick={workbench.openInspector}
              >
                会话详情
              </Button>
            )}
          </div>
        </div>
      )}
      inspectorTitle={workbench.inspectorTitle}
      inspectorOpen={workbench.inspectorOpen}
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
          onOpenSearch={workbench.openSearch}
          onOpenAnalytics={workbench.openAnalytics}
          onOpenMedia={workbench.openMedia}
          onOpenAi={workbench.openAi}
          onOpenGraph={workbench.openGraph}
        />
      )}
    >
      {mainContent}
    </WorkbenchFrame>
  );
}

import { useNavigate } from "react-router-dom";
import { useUpdateNotificationCommander } from "@l2/commander";
import { useDevConsoleCommander } from "@l2/commander/useDevConsoleCommander";
import { useWorkbenchCommander } from "@l2/commander/useWorkbenchCommander";
import { buildWorkbenchContextDeepLinks } from "@l2/commander/workbenchInformationArchitecture";
import { ContactList } from "@l3/chat/ContactList";
import { ChatView } from "@l3/chat/ChatView";
import { DevConsole } from "@l3/common/DevConsole";
import { UpdateNotificationView } from "@l3/common/UpdateNotificationView";
import { ConversationInspector } from "@l3/workbench/ConversationInspector";
import { deriveConversationInspectorView } from "@l3/workbench/conversationInspectorDisplay";
import { WorkbenchFrame } from "@l3/workbench/WorkbenchFrame";
import { Typography } from "@l4/ui/Typography";
import { Button } from "@l4/ui/Button";

export function WorkbenchView() {
  const navigate = useNavigate();
  const workbench = useWorkbenchCommander();
  const updateNotification = useUpdateNotificationCommander();
  const devConsole = useDevConsoleCommander();

  if (workbench.appPhase === "error") {
    return (
      <>
        <div className="workbench-error-state page-fill">
          <Typography variant="h2" color="var(--danger)">
            应用错误
          </Typography>
          <Typography variant="body" color="var(--text-secondary)">
            {workbench.errorMessage}
          </Typography>
          <Button variant="primary" onClick={workbench.goSetup}>
            返回启动页
          </Button>
        </div>
        <DevConsole view={devConsole.view} actions={devConsole.actions} />
      </>
    );
  }

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
  const inspectorView = deriveConversationInspectorView({
    conversation: workbench.currentConversation
      ? {
          displayName: workbench.currentConversation.displayName,
          typeLabel: workbench.currentConversation.isGroup ? "群聊" : "单聊",
        }
      : null,
    currentChat: workbench.currentChat,
    stats: workbench.stats.stats,
    statsLoading: workbench.stats.loading,
    statsError: workbench.stats.error,
    mediaCount: workbench.media.attachments.length,
    semanticLabel: workbench.ai.compactStatus?.label ?? null,
    graphLabel: workbench.graph.moduleView.message || workbench.moduleBadges.graph || null,
    privacyOn: workbench.privacyOn,
  });
  const contextLinks = buildWorkbenchContextDeepLinks({
    hasConversation: Boolean(workbench.currentConversation),
  });

  return (
    <>
      <WorkbenchFrame
        layout={workbench.layout}
        conversationList={conversationList}
        toolbar={(
          <div className="workbench-toolbar-row">
            <Typography variant="label" weight={600} color="var(--text-secondary)">
              {workbench.toolbarConversationTitle}
            </Typography>
            <div className="workbench-toolbar-row__actions">
              {workbench.layout.mode === "single" && workbench.singlePaneView === "detail" && (
                <Button variant="secondary" size="sm" onClick={workbench.openConversationList}>
                  返回会话列表
                </Button>
              )}
              {workbench.layout.inspectorMode === "drawer" && (
                <Button variant="secondary" size="sm" onClick={workbench.openInspector}>
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
            view={inspectorView}
            links={contextLinks}
            onNavigate={(href) => navigate(href)}
            onRetryStats={workbench.retryStats}
          />
        )}
      >
        {mainContent}
      </WorkbenchFrame>
      <UpdateNotificationView
        view={updateNotification.view}
        status={updateNotification.status}
        notes={updateNotification.notes}
        actions={updateNotification.actions}
      />
      <DevConsole view={devConsole.view} actions={devConsole.actions} />
    </>
  );
}

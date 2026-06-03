import { lazy, Suspense } from "react";
import { useAppShellCommander, useUpdateNotificationCommander } from "@l2/commander";
import { useDevConsoleCommander } from "@l2/commander/useDevConsoleCommander";
import { useWorkbenchCommander } from "@l2/commander/useWorkbenchCommander";
import { AppLayout } from "@l3/common/AppLayout";
import { StatusBar } from "@l3/common/StatusBar";
import { ContactList } from "@l3/chat/ContactList";
import { ChatView } from "@l3/chat/ChatView";
import { GlobalSearch } from "@l3/search/GlobalSearch";
import { SearchResults } from "@l3/search/SearchResults";
import { FilterBar } from "@l3/search/FilterBar";
import { MediaLibrary } from "@l3/media/MediaLibrary";
import { SnsModule } from "@l3/sns/SnsModule";
import { DeveloperToolsModule } from "@l3/developer/DeveloperToolsModule";
import { StatsInspector } from "@l3/stats/StatsInspector";
import { WorkbenchFrame } from "@l3/workbench/WorkbenchFrame";
import { WorkbenchRail } from "@l3/workbench/WorkbenchRail";
import { Typography } from "@l4/ui/Typography";
import { Button } from "@l4/ui/Button";
import { Spinner } from "@l4/ui/Spinner";
import { DevConsole } from "@l3/common/DevConsole";
import { UpdateNotificationView } from "@l3/common/UpdateNotificationView";

const LazyAiPanel = lazy(() =>
  import("@l3/semantic/AiPanel").then((module) => ({ default: module.AiPanel })),
);

const LazyGraphModule = lazy(() =>
  import("@l3/graph/GraphModule").then((module) => ({ default: module.GraphModule })),
);

export function WorkbenchView() {
  const workbench = useWorkbenchCommander();
  const appShell = useAppShellCommander(workbench.appPhase === "error" ? "应用错误" : "工作台");
  const updateNotification = useUpdateNotificationCommander();
  const devConsole = useDevConsoleCommander();

  if (workbench.appPhase === "error") {
    return (
      <AppLayout shell={appShell.view} actions={appShell.actions}>
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
        <StatusBar
          status={workbench.sidecarStatus}
          indexStatus={workbench.ai.indexStatus}
        />
      </AppLayout>
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
  const graphContent = (
    <Suspense fallback={<PanelLoading label="加载图谱模块..." />}>
      <LazyGraphModule graph={workbench.graph} privacyOn={workbench.privacyOn} />
    </Suspense>
  );
  const mainContent = workbench.activeModule === "graph"
    ? graphContent
    : workbench.conversationListAsMain
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
    <AppLayout shell={appShell.view} actions={appShell.actions}>
      <div className="page-column">
        <div className="page-fill">
          <WorkbenchFrame
            layout={workbench.layout}
            rail={(
              <WorkbenchRail
                showLabels={workbench.layout.sidebarLabels}
                items={workbench.railItems}
                onSelectModule={workbench.selectModule}
              />
            )}
            conversationList={conversationList}
            toolbar={(
              <>
                <div className="flex items-center justify-between gap-2">
                  <Typography variant="label" weight={600} color="var(--text-secondary)">
                    {workbench.toolbarConversationTitle}
                  </Typography>
                  <div className="workbench-frame__module-tabs flex items-center gap-2">
                    {workbench.layout.mode === "single" && workbench.singlePaneView === "detail" && (
                      <Button variant="secondary" size="sm" onClick={workbench.openConversationList}>
                        返回会话列表
                      </Button>
                    )}
                    {workbench.layout.inspectorMode !== "inline" && (
                      <>
                        <Button
                          variant={workbench.activeModule === "stats" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => workbench.selectModule("stats")}
                        >
                          统计
                        </Button>
                        <Button
                          variant={workbench.activeModule === "media" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => workbench.selectModule("media")}
                        >
                          媒体
                        </Button>
                        <Button
                          variant={workbench.activeModule === "sns" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => workbench.selectModule("sns")}
                        >
                          朋友圈
                        </Button>
                        <Button
                          variant={workbench.activeModule === "developer" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => workbench.selectModule("developer")}
                        >
                          开发
                        </Button>
                        <Button
                          variant={workbench.activeModule === "ai" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => workbench.selectModule("ai")}
                        >
                          AI
                        </Button>
                        <Button
                          variant={workbench.activeModule === "graph" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => workbench.selectModule("graph")}
                        >
                          图谱
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="search-panel">
                  <GlobalSearch
                    query={workbench.search.query}
                    results={workbench.search.results}
                    loading={workbench.search.loading}
                    scope={workbench.search.scope}
                    currentConversation={workbench.currentConversation}
                    privacyOn={workbench.privacyOn}
                    onSearch={workbench.search.search}
                    onExecuteSearch={workbench.search.executeSearch}
                    onClearSearch={workbench.search.clearSearch}
                    onChangeScope={workbench.search.changeScope}
                  />
                  <FilterBar
                    activeFilter={workbench.search.activeFilter}
                    onFilterChange={workbench.search.changeFilter}
                  />
                  <SearchResults
                    query={workbench.search.query}
                    results={workbench.search.results}
                    status={workbench.search.status}
                    loading={workbench.search.loading}
                    error={workbench.search.error}
                    activeResultId={workbench.search.activeResultId}
                    privacyOn={workbench.privacyOn}
                    onSetActiveResultId={workbench.search.setActiveResultId}
                    onSelectAndLoad={(conversationId, chat) => {
                      void workbench.chat.selectAndLoad(conversationId, chat);
                    }}
                    onLoadMoreResults={() => void workbench.search.loadMoreResults()}
                    onExecuteSearch={workbench.search.executeSearch}
                    onClearSearch={workbench.search.clearSearch}
                  />
                </div>
              </>
            )}
            inspectorTitle={workbench.inspectorTitle}
            inspectorOpen={workbench.inspectorOpen}
            onCloseInspector={workbench.closeInspector}
            inspector={(
              <InspectorContent workbench={workbench} />
            )}
          >
            {mainContent}
          </WorkbenchFrame>
        </div>
        <UpdateNotificationView
          view={updateNotification.view}
          status={updateNotification.status}
          notes={updateNotification.notes}
          actions={updateNotification.actions}
        />
        <DevConsole view={devConsole.view} actions={devConsole.actions} />
        <StatusBar
          status={workbench.sidecarStatus}
          indexStatus={workbench.ai.indexStatus}
          semanticStatus={workbench.ai.compactStatus}
        />
      </div>
    </AppLayout>
  );
}

interface InspectorContentProps {
  workbench: ReturnType<typeof useWorkbenchCommander>;
}

function InspectorContent({ workbench }: InspectorContentProps) {
  if (workbench.inspectorModule === "ai") {
    return (
      <Suspense fallback={<PanelLoading label="加载 AI 面板..." />}>
        <LazyAiPanel
          mode="ai"
          ai={workbench.ai}
          currentChat={workbench.currentChat}
          currentContact={workbench.currentConversation?.displayName ?? ""}
          privacyOn={workbench.privacyOn}
          onSelectAndLoad={(conversationId, chat) => {
            void workbench.chat.selectAndLoad(conversationId, chat);
          }}
          onModeChange={(mode) => workbench.selectModule(mode === "ai" ? "ai" : "stats")}
        />
      </Suspense>
    );
  }

  if (workbench.inspectorModule === "media") {
    return (
      <MediaLibrary
        currentChat={workbench.currentChat}
        privacyOn={workbench.privacyOn}
        attachments={workbench.media.attachments}
        favorites={workbench.media.favorites}
        members={workbench.media.members}
        unread={workbench.media.unread}
        newMessages={workbench.media.newMessages}
        status={workbench.media.status}
        error={workbench.media.error}
        selectedAttachment={workbench.media.selectedAttachment}
        previewResourceUrl={workbench.media.previewResourceUrl}
        onRetry={workbench.media.retry}
        onPreviewAttachment={workbench.media.previewAttachment}
        onClosePreview={workbench.media.closePreview}
      />
    );
  }

  if (workbench.inspectorModule === "sns") {
    return (
      <SnsModule
        view={workbench.sns.view}
        status={workbench.sns.status}
        searchStatus={workbench.sns.searchStatus}
        activeTab={workbench.sns.activeTab}
        filters={workbench.sns.filters}
        searchQuery={workbench.sns.searchQuery}
        error={workbench.sns.error}
        searchError={workbench.sns.searchError}
        selectedPostId={workbench.sns.selectedPostId}
        privacyOn={workbench.privacyOn}
        onRefresh={workbench.sns.refresh}
        onRetry={workbench.sns.retry}
        onLoadMore={workbench.sns.loadMore}
        onTabChange={workbench.sns.selectTab}
        onFiltersChange={workbench.sns.updateFilters}
        onSearchQueryChange={workbench.sns.setSearchQuery}
        onSearch={workbench.sns.runSearch}
        onClearSearch={workbench.sns.clearSearch}
        onSelectPost={workbench.sns.selectPost}
      />
    );
  }

  if (workbench.inspectorModule === "developer") {
    return (
      <DeveloperToolsModule
        dbView={workbench.developer.dbView}
        endpointView={workbench.developer.endpointView}
        hookView={workbench.developer.hook.hookView}
        hookConfig={workbench.developer.hook.config}
        mcpView={workbench.developer.mcp.mcpView}
        activeTab={workbench.developer.activeTab}
        privacyOn={workbench.privacyOn}
        dbFilesStatus={workbench.developer.dbFilesStatus}
        tablesStatus={workbench.developer.tablesStatus}
        tableDataStatus={workbench.developer.tableDataStatus}
        searchStatus={workbench.developer.searchStatus}
        queryStatus={workbench.developer.queryStatus}
        cacheStatus={workbench.developer.cacheStatus}
        runnerStatus={workbench.developer.runnerStatus}
        tableKeyword={workbench.developer.tableKeyword}
        tableLimit={workbench.developer.tableLimit}
        tableOffset={workbench.developer.tableOffset}
        searchQuery={workbench.developer.searchQuery}
        searchMode={workbench.developer.searchMode}
        searchLimit={workbench.developer.searchLimit}
        sqlDraft={workbench.developer.sqlDraft}
        cacheConfirmationPending={workbench.developer.cacheConfirmationPending}
        selectedEndpointId={workbench.developer.selectedEndpointId}
        endpointParams={workbench.developer.endpointParams}
        runnerConfirmationPending={workbench.developer.runnerConfirmationPending}
        hookClearConfirmationPending={workbench.developer.hook.clearConfirmationPending}
        onRefresh={workbench.developer.refresh}
        onTabChange={workbench.developer.setActiveTab}
        onSelectDbFile={workbench.developer.selectDbFile}
        onSelectTable={workbench.developer.selectTable}
        onTableKeywordChange={workbench.developer.setTableKeyword}
        onTableLimitChange={workbench.developer.setTableLimit}
        onLoadPreviousTablePage={workbench.developer.loadPreviousTablePage}
        onLoadNextTablePage={workbench.developer.loadNextTablePage}
        onLoadTableData={workbench.developer.loadTableData}
        onSearchQueryChange={workbench.developer.setSearchQuery}
        onSearchModeChange={workbench.developer.setSearchMode}
        onSearchLimitChange={workbench.developer.setSearchLimit}
        onSearch={workbench.developer.runSearch}
        onSqlDraftChange={workbench.developer.setSqlDraft}
        onRunSqlQuery={workbench.developer.runSqlQuery}
        onRequestCacheClearConfirmation={workbench.developer.requestCacheClearConfirmation}
        onCancelCacheClearConfirmation={workbench.developer.cancelCacheClearConfirmation}
        onConfirmCacheClear={workbench.developer.confirmCacheClear}
        onSelectEndpoint={workbench.developer.selectEndpoint}
        onEndpointParamChange={workbench.developer.updateEndpointParam}
        onRequestRunnerConfirmation={workbench.developer.requestRunnerConfirmation}
        onCancelRunnerConfirmation={workbench.developer.cancelRunnerConfirmation}
        onRunEndpoint={workbench.developer.runEndpoint}
        onHookSubtabChange={workbench.developer.hook.setActiveSubtab}
        onHookSaveConfig={workbench.developer.hook.saveConfig}
        onHookRefreshHermes={workbench.developer.hook.refreshHermesBridges}
        onHookSaveHermesWeixin={workbench.developer.hook.saveHermesWeixin}
        onHookSaveHermesQQ={workbench.developer.hook.saveHermesQQ}
        onHookStartStream={workbench.developer.hook.startStream}
        onHookStopStream={workbench.developer.hook.stopStream}
        onHookConfirmClear={workbench.developer.hook.confirmClearEvents}
        onHookCancelClear={workbench.developer.hook.cancelClearConfirmation}
        onMcpRefresh={workbench.developer.mcp.refreshMcpInventory}
        onMcpSmoke={workbench.developer.mcp.runSafeRouteSmoke}
      />
    );
  }

  return (
    <StatsInspector
      currentChat={workbench.currentChat}
      stats={workbench.stats.stats}
      trend={workbench.stats.trend}
      loading={workbench.stats.loading}
      error={workbench.stats.error}
      privacyOn={workbench.privacyOn}
      onRetry={workbench.retryStats}
      onShowAi={() => workbench.selectModule("ai")}
      onOpenGraph={() => workbench.selectModule("graph")}
    />
  );
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="panel-loading">
      <Spinner size={20} label={label} color="var(--text-muted)" />
    </div>
  );
}

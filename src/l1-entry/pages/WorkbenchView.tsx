import { lazy, Suspense } from "react";
import { useWorkbenchCommander } from "@l2/commander/useWorkbenchCommander";
import { AppLayout } from "@l3/common/AppLayout";
import { StatusBar } from "@l3/common/StatusBar";
import { ConversationList } from "@l3/chat/ConversationList";
import { ChatView } from "@l3/chat/ChatView";
import { GlobalSearch } from "@l3/search/GlobalSearch";
import { SearchResults } from "@l3/search/SearchResults";
import { FilterBar } from "@l3/search/FilterBar";
import { StatsInspector } from "@l3/stats/StatsInspector";
import { WorkbenchFrame } from "@l3/workbench/WorkbenchFrame";
import { WorkbenchRail } from "@l3/workbench/WorkbenchRail";
import { Typography } from "@l4/ui/Typography";
import { Button } from "@l4/ui/Button";
import { Spinner } from "@l4/ui/Spinner";
import { DevConsole } from "@l3/common/DevConsole";
import { UpdateNotification } from "@l3/common/UpdateNotification";

const LazyAiPanel = lazy(() =>
  import("@l3/semantic/AiPanel").then((module) => ({ default: module.AiPanel })),
);

const LazyGraphModule = lazy(() =>
  import("@l3/graph/GraphModule").then((module) => ({ default: module.GraphModule })),
);

export function WorkbenchView() {
  const workbench = useWorkbenchCommander();

  if (workbench.appPhase === "error") {
    return (
      <AppLayout title="应用错误">
        <div className="workbench-error-state" style={{ height: "100%" }}>
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
        <DevConsole />
        <StatusBar
          status={workbench.sidecarStatus}
          indexStatus={workbench.ai.indexStatus}
        />
      </AppLayout>
    );
  }

  const conversationList = (
    <ConversationList
      conversations={workbench.chat.conversations}
      conversationsStatus={workbench.chat.conversationsStatus}
      conversationsError={workbench.chat.conversationsError}
      selectedConversationId={workbench.chat.selectedConversationId}
      privacyOn={workbench.privacyOn}
      onOpenConversation={workbench.openConversation}
      onRetry={() => void workbench.chat.loadConversations()}
    />
  );
  const chatView = (
    <ChatView
      conversation={workbench.currentConversation ?? null}
      totalCount={workbench.chat.messagesTotalCount}
      messages={workbench.chat.messages}
      messagesLoading={workbench.chat.messagesLoading}
      messagesHasMore={workbench.chat.messagesHasMore}
      messagesStatus={workbench.chat.messagesStatus}
      messagesError={workbench.chat.messagesError}
      privacyOn={workbench.privacyOn}
      onRetryMessages={workbench.retryMessages}
      onLoadMoreMessages={workbench.loadMoreMessages}
    />
  );
  const mainContent = workbench.conversationListAsMain ? conversationList : chatView;
  const toolbarConversationLabel = workbench.privacyOn && workbench.currentConversation
    ? "已隐藏会话"
    : workbench.currentConversation?.displayName ?? "选择会话";

  return (
    <AppLayout title="工作台">
      <div style={{ display: "flex", height: "100%", minHeight: 0, flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <WorkbenchFrame
            layout={workbench.layout}
            rail={(
              <WorkbenchRail
                showLabels={workbench.layout.sidebarLabels}
                activeModule={workbench.activeModule}
                onSelectModule={workbench.selectModule}
              />
            )}
            conversationList={conversationList}
            toolbar={(
              <>
                <div className="flex items-center justify-between gap-2">
                  <Typography variant="label" weight={600} color="var(--text-secondary)">
                    {toolbarConversationLabel}
                  </Typography>
                  <div className="flex items-center gap-2">
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
                          variant={workbench.activeModule === "ai" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => workbench.selectModule("ai")}
                        >
                          AI
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
                    privacyOn={workbench.privacyOn}
                    currentConversationName={workbench.currentConversation?.displayName ?? "当前会话"}
                    currentConversationAvailable={Boolean(workbench.currentConversation)}
                    onSearch={workbench.search.search}
                    onExecuteSearch={workbench.search.executeSearch}
                    onClearSearch={workbench.search.clearSearch}
                    onScopeChange={workbench.search.changeScope}
                  />
                  <FilterBar
                    activeFilter={workbench.search.activeFilter}
                    onFilterChange={workbench.search.changeFilter}
                  />
                  <SearchResults
                    query={workbench.search.query}
                    status={workbench.search.status}
                    results={workbench.search.results}
                    loading={workbench.search.loading}
                    error={workbench.search.error}
                    activeResultId={workbench.search.activeResultId}
                    navigationNotice={workbench.search.navigationNotice}
                    privacyOn={workbench.privacyOn}
                    onOpenResult={workbench.openSearchResult}
                    onLoadMore={() => void workbench.search.loadMoreResults()}
                    onRetry={() => workbench.search.executeSearch(workbench.search.query)}
                    onClear={workbench.search.clearSearch}
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
        <UpdateNotification />
        <DevConsole />
        <StatusBar
          status={workbench.sidecarStatus}
          indexStatus={workbench.ai.indexStatus}
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
          onModeChange={(mode) => workbench.selectModule(mode === "ai" ? "ai" : "stats")}
        />
      </Suspense>
    );
  }

  if (workbench.inspectorModule === "graph") {
    return (
      <Suspense fallback={<PanelLoading label="加载图谱模块..." />}>
        <LazyGraphModule />
      </Suspense>
    );
  }

  return (
    <StatsInspector
      currentChat={workbench.currentChat}
      stats={workbench.stats.stats}
      trend={workbench.stats.trend}
      loading={workbench.stats.loading}
      error={workbench.stats.error}
      onRetry={workbench.retryStats}
      privacyOn={workbench.privacyOn}
      onShowAi={() => workbench.selectModule("ai")}
      onOpenGraph={() => workbench.selectModule("graph")}
    />
  );
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Spinner size={20} label={label} color="var(--text-muted)" />
    </div>
  );
}

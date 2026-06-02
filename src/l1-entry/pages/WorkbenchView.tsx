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
    <ContactList onConversationOpened={workbench.handleConversationOpened} />
  );
  const mainContent = workbench.conversationListAsMain ? conversationList : <ChatView />;

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
                  <GlobalSearch />
                  <FilterBar
                    activeFilter={workbench.search.activeFilter}
                    onFilterChange={workbench.search.changeFilter}
                  />
                  <SearchResults />
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

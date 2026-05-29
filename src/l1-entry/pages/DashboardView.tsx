import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { useSearchStore } from "@l2/data-clerk/stores/useSearchStore";
import { AppLayout } from "@l3/common/AppLayout";
import { StatusBar } from "@l3/common/StatusBar";
import { ContactList } from "@l3/chat/ContactList";
import { ChatView } from "@l3/chat/ChatView";
import { GlobalSearch } from "@l3/search/GlobalSearch";
import { SearchResults } from "@l3/search/SearchResults";
import { FilterBar } from "@l3/search/FilterBar";
import { DashboardOverview } from "@l3/stats/DashboardOverview";
import { TrendChart } from "@l3/stats/TrendChart";
import { TopContactCard } from "@l3/stats/TopContactCard";
import { WorkbenchFrame } from "@l3/workbench/WorkbenchFrame";
import { WorkbenchRail } from "@l3/workbench/WorkbenchRail";
import { getWorkbenchLayout } from "@l3/workbench/workbenchLayout";
import { useAiCommander } from "@l2/commander/useAiCommander";
import { useChatCommander } from "@l2/commander/useChatCommander";
import { useSearchCommander } from "@l2/commander/useSearchCommander";
import { useStatsCommander } from "@l2/commander/useStatsCommander";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { Typography } from "@l4/ui/Typography";
import { Button } from "@l4/ui/Button";
import { Spinner } from "@l4/ui/Spinner";
import { DevConsole } from "@l3/common/DevConsole";
import { UpdateNotification } from "@l3/common/UpdateNotification";

const LazyAiPanel = lazy(() =>
  import("@l3/semantic/AiPanel").then((module) => ({ default: module.AiPanel })),
);

const LazyGraphCanvas = lazy(() =>
  import("@l3/graph/GraphCanvas").then((module) => ({ default: module.GraphCanvas })),
);

export function DashboardView() {
  const navigate = useNavigate();
  const appPhase = useAppStore((s) => s.appPhase);
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const errorMessage = useAppStore((s) => s.errorMessage);

  const { loadConversations, selectedConversationId, conversations, selectAndLoad } = useChatCommander();
  const { activeFilter, changeFilter } = useSearchCommander();
  const { stats, trend, loadAll, loading: statsLoading } = useStatsCommander();
  const { indexStatus } = useAiCommander();
  const graph = useGraphCommander();
  const { selectedNodeId, data: graphData, selectNode: graphSelectNode, focusOnChat, focusOnGraphFromSearch } = graph;
  const [rightPanelMode, setRightPanelMode] = useState<"stats" | "ai">("stats");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const viewportWidth = useViewportWidth();
  const layout = getWorkbenchLayout(viewportWidth);

  const currentConv = conversations.find(c => c.id === selectedConversationId);
  const currentChat = currentConv?.username || "";

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (currentChat) {
      loadAll(currentChat);
    }
  }, [currentChat, loadAll]);

  useEffect(() => {
    if (!selectedNodeId || !graphData) return;
    const node = graphData.nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;
    const contactName = node.name;
    const matchedConv = useChatStore.getState().conversations.find(
      (c) => c.displayName === contactName || c.username === contactName
    );
    if (matchedConv) {
      selectAndLoad(matchedConv.id, matchedConv.username);
    }
    graphSelectNode(null);
  }, [selectedNodeId, graphData, graphSelectNode, selectAndLoad]);

  useEffect(() => {
    if (currentConv?.displayName) {
      focusOnChat(currentConv.displayName);
    }
  }, [currentConv?.displayName, focusOnChat]);

  const searchQuery = useSearchStore((s) => s.query);
  useEffect(() => {
    if (searchQuery) {
      focusOnGraphFromSearch(searchQuery);
    }
  }, [searchQuery, focusOnGraphFromSearch]);

  if (appPhase === "error") {
    return (
      <AppLayout title="应用错误">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 16,
          }}
        >
          <Typography variant="h2" color="#FF3B30">应用错误</Typography>
          <Typography variant="body" color="var(--color-text-secondary)">
            {errorMessage}
          </Typography>
          <Button variant="primary" onClick={() => navigate("/")}>
            返回启动页
          </Button>
        </div>
        <DevConsole />
        <StatusBar status={sidecarStatus} indexStatus={indexStatus} />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="工作台">
      <div style={{ display: "flex", height: "100%", minHeight: 0, flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <WorkbenchFrame
            layout={layout}
            rail={(
              <WorkbenchRail
                showLabels={layout.sidebarLabels}
                activePanel={rightPanelMode}
                onSelectPanel={(mode) => {
                  setRightPanelMode(mode);
                  setInspectorOpen(true);
                }}
                onOpenGraph={graph.openGraph}
              />
            )}
            conversationList={<ContactList />}
            toolbar={(
              <>
                <div className="flex items-center justify-between gap-2">
                  <Typography variant="label" weight={600} color="var(--text-secondary)">
                    {currentConv?.displayName ?? "选择会话"}
                  </Typography>
                  {layout.inspectorMode !== "inline" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant={rightPanelMode === "stats" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => {
                          setRightPanelMode("stats");
                          setInspectorOpen(true);
                        }}
                      >
                        统计
                      </Button>
                      <Button
                        variant={rightPanelMode === "ai" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => {
                          setRightPanelMode("ai");
                          setInspectorOpen(true);
                        }}
                      >
                        AI
                      </Button>
                    </div>
                  )}
                </div>
                {layout.mode === "single" && !selectedConversationId && (
                  <div style={{ maxHeight: 180, overflow: "auto", border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
                    <ContactList />
                  </div>
                )}
                <GlobalSearch />
                <FilterBar activeFilter={activeFilter} onFilterChange={changeFilter} />
                <SearchResults />
              </>
            )}
            inspectorTitle={rightPanelMode === "stats" ? "统计数据" : "AI 分析"}
            inspectorOpen={inspectorOpen}
            onCloseInspector={() => setInspectorOpen(false)}
            inspector={rightPanelMode === "stats" ? (
              <StatsInspector
                currentChat={currentChat}
                stats={stats}
                trend={trend}
                statsLoading={statsLoading}
                onShowAi={() => {
                  setRightPanelMode("ai");
                  setInspectorOpen(true);
                }}
                onOpenGraph={graph.openGraph}
              />
            ) : (
              <Suspense fallback={<PanelLoading label="加载 AI 面板..." />}>
                <LazyAiPanel mode="ai" onModeChange={(mode) => {
                  setRightPanelMode(mode);
                  setInspectorOpen(true);
                }} />
              </Suspense>
            )}
          >
            <ChatView />
          </WorkbenchFrame>
        </div>
        <UpdateNotification />
        <DevConsole />
        <StatusBar status={sidecarStatus} indexStatus={indexStatus} />
        {graph.visible && (
          <Suspense fallback={null}>
            <LazyGraphCanvas />
          </Suspense>
        )}
      </div>
    </AppLayout>
  );
}

interface StatsInspectorProps {
  currentChat: string;
  stats: Parameters<typeof DashboardOverview>[0]["stats"];
  trend: Parameters<typeof TrendChart>[0]["data"];
  statsLoading: boolean;
  onShowAi: () => void;
  onOpenGraph: () => void;
}

function StatsInspector({
  currentChat,
  stats,
  trend,
  statsLoading,
  onShowAi,
  onOpenGraph,
}: StatsInspectorProps) {
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Typography variant="label" weight={600}>统计数据</Typography>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="ghost" size="sm" onClick={onShowAi}>
            AI
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenGraph}>
            图谱
          </Button>
        </div>
      </div>
      {currentChat ? (
        <>
          <DashboardOverview stats={stats} loading={statsLoading} />
          <div style={{ marginTop: 12 }}>
            <TrendChart data={trend} />
          </div>
          {stats && (
            <div style={{ marginTop: 12 }}>
              <TopContactCard topSenders={stats.topSenders} />
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: 24, textAlign: "center" }}>
          <Typography variant="body" color="var(--text-secondary)">
            选择左侧会话后即可查看统计数据
          </Typography>
        </div>
      )}
    </div>
  );
}

function useViewportWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1080 : window.innerWidth,
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
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
      <Spinner size={20} label={label} color="var(--color-text-tertiary)" />
    </div>
  );
}

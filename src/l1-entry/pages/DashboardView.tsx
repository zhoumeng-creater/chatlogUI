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
import { useAiCommander } from "@l2/commander/useAiCommander";
import { useChatCommander } from "@l2/commander/useChatCommander";
import { useSearchCommander } from "@l2/commander/useSearchCommander";
import { useStatsCommander } from "@l2/commander/useStatsCommander";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import { Spinner } from "@l4/ui/Spinner";
import { DevConsole } from "@l3/common/DevConsole";
import { UpdateNotification } from "@l3/common/UpdateNotification";
import { getDashboardLayout } from "./dashboardLayout";

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

  const { loadContacts, selectedContact, selectedChatRoom, selectAndLoad } = useChatCommander();
  const { activeFilter, changeFilter, results: searchResults } = useSearchCommander();
  const { stats, trend, loadAll, loading: statsLoading } = useStatsCommander();
  const { indexStatus } = useAiCommander();
  const graph = useGraphCommander();
  const { selectedNodeId, data: graphData, selectNode: graphSelectNode, focusOnChat, focusOnGraphFromSearch } = graph;
  const [rightPanelMode, setRightPanelMode] = useState<"stats" | "ai">("stats");
  const viewportWidth = useViewportWidth();
  const layout = getDashboardLayout(viewportWidth);

  useEffect(() => {
    if (appPhase !== "ready") {
      navigate("/", { replace: true });
    }
  }, [appPhase, navigate]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const currentChat = selectedContact?.userName || selectedChatRoom?.name;
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
    const { contacts, chatRooms } = useChatStore.getState();
    const matchedContact = contacts.find((c) => c.nickName === contactName || c.userName === contactName);
    const matchedRoom = chatRooms.find((r) => r.nickName === contactName || r.name === contactName);
    if (matchedRoom) {
      selectAndLoad(matchedRoom.name, matchedRoom.nickName, true);
    } else if (matchedContact) {
      selectAndLoad(matchedContact.userName, matchedContact.nickName, false);
    }
    graphSelectNode(null);
  }, [selectedNodeId, graphData, graphSelectNode, selectAndLoad]);

  useEffect(() => {
    const name = selectedContact?.nickName || selectedChatRoom?.nickName;
    if (name) {
      focusOnChat(name);
    }
  }, [selectedContact?.nickName, selectedChatRoom?.nickName, focusOnChat]);

  const searchQuery = useSearchStore((s) => s.query);
  useEffect(() => {
    if (searchQuery) {
      focusOnGraphFromSearch(searchQuery);
    }
  }, [searchQuery, focusOnGraphFromSearch]);

  if (appPhase === "error") {
    return (
      <AppLayout>
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
          <AppleButton variant="primary" onClick={() => navigate("/")}>
            返回启动页
          </AppleButton>
        </div>
        <DevConsole />
        <StatusBar status={sidecarStatus} indexStatus={indexStatus} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: layout.gridTemplateColumns,
          height: "100%",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <div
          style={{
            minWidth: 0,
            borderRight: "1px solid var(--color-border)",
            backgroundColor: "rgba(0,0,0,0.03)",
            overflow: "hidden",
          }}
        >
          <ContactList />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              padding: `${layout.panelPadding}px ${layout.panelPadding + 4}px`,
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              flexDirection: "column",
              maxHeight: searchResults ? layout.searchMaxHeight : undefined,
              minHeight: 0,
            }}
          >
            <GlobalSearch />
            <FilterBar activeFilter={activeFilter} onFilterChange={changeFilter} />
            <SearchResults />
          </div>

          <div style={{ flex: 1, overflow: "hidden" }}>
            <ChatView />
          </div>
        </div>

        <div
          style={{
            minWidth: 0,
            borderLeft: "1px solid var(--color-border)",
            overflowY: "auto",
          }}
        >
          {rightPanelMode === "stats" ? (
            <div style={{ padding: layout.panelPadding + 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Typography variant="label" weight={600}>统计数据</Typography>
                <div style={{ display: "flex", gap: 4 }}>
                  <AppleButton variant="ghost" size="sm" onClick={() => setRightPanelMode("ai")}>
                    AI
                  </AppleButton>
                  <AppleButton variant="ghost" size="sm" onClick={graph.openGraph}>
                    🕸️
                  </AppleButton>
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
                  <Typography variant="body" color="var(--color-text-secondary)">
                    选择左侧联系人后即可查看统计数据
                  </Typography>
                </div>
              )}
            </div>
          ) : (
            <Suspense fallback={<PanelLoading label="加载 AI 面板..." />}>
              <LazyAiPanel mode="ai" onModeChange={setRightPanelMode} />
            </Suspense>
          )}
        </div>
      </div>

      <UpdateNotification />
      <DevConsole />
      <StatusBar status={sidecarStatus} indexStatus={indexStatus} />
      {graph.visible && (
        <Suspense fallback={null}>
          <LazyGraphCanvas />
        </Suspense>
      )}
    </AppLayout>
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

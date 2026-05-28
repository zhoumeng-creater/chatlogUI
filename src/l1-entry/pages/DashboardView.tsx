import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
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
import { AiPanel } from "@l3/semantic/AiPanel";
import { useAiCommander } from "@l2/commander/useAiCommander";
import { useChatCommander } from "@l2/commander/useChatCommander";
import { useStatsCommander } from "@l2/commander/useStatsCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";

export function DashboardView() {
  const navigate = useNavigate();
  const appPhase = useAppStore((s) => s.appPhase);
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const errorMessage = useAppStore((s) => s.errorMessage);

  const { loadContacts, selectedContact, selectedChatRoom } = useChatCommander();
  const { stats, trend, loadAll, loading: statsLoading } = useStatsCommander();
  const { indexStatus } = useAiCommander();
  const [rightPanelMode, setRightPanelMode] = useState<"stats" | "ai">("stats");

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
        <StatusBar status={sidecarStatus} indexStatus={indexStatus} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        <div
          style={{
            width: 280,
            minWidth: 280,
            borderRight: "1px solid var(--color-border)",
            backgroundColor: "rgba(0,0,0,0.03)",
            flexShrink: 0,
          }}
        >
          <ContactList />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border)" }}>
            <GlobalSearch />
            <FilterBar activeFilter="all" onFilterChange={() => {}} />
            <SearchResults />
          </div>

          <div style={{ flex: 1, overflow: "hidden" }}>
            <ChatView />
          </div>
        </div>

        <div
          style={{
            width: 260,
            minWidth: 260,
            borderLeft: "1px solid var(--color-border)",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          {rightPanelMode === "stats" ? (
            <div style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Typography variant="label" weight={600}>统计数据</Typography>
                <AppleButton variant="ghost" size="sm" onClick={() => setRightPanelMode("ai")}>
                  AI
                </AppleButton>
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
            <AiPanel mode="ai" onModeChange={setRightPanelMode} />
          )}
        </div>
      </div>

      <StatusBar status={sidecarStatus} indexStatus={indexStatus} />
    </AppLayout>
  );
}

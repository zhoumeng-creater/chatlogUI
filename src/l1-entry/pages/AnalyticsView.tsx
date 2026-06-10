import { useEffect } from "react";
import { useChatCommander, usePrivacyCommander, useStatsCommander } from "@l2/commander";
import { DashboardOverview } from "@l3/stats/DashboardOverview";
import { TopContactCard } from "@l3/stats/TopContactCard";
import { TrendChart } from "@l3/stats/TrendChart";
import { Button, Surface, Typography } from "@l4/ui";

export function AnalyticsView() {
  const chat = useChatCommander();
  const stats = useStatsCommander();
  const privacy = usePrivacyCommander();
  const { conversations, selectedConversationId } = chat;
  const { loadAll } = stats;
  const currentConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const currentChat = currentConversation?.username ?? "";

  useEffect(() => {
    if (currentChat) {
      loadAll(currentChat);
    }
  }, [currentChat, loadAll]);

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h2">统计</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            当前最小交付聚焦当前会话统计；全局范围和筛选闭环会在后续模块页面步骤补齐。
          </Typography>
        </div>
        <Button
          variant="secondary"
          disabled={!currentChat || stats.loading}
          onClick={() => currentChat && loadAll(currentChat)}
        >
          刷新统计
        </Button>
      </header>

      <div className="workspace-page__grid">
        <Surface variant="raised" className="workspace-page__panel">
          <DashboardOverview stats={stats.stats} loading={stats.loading} />
        </Surface>
        <Surface variant="raised" className="workspace-page__panel">
          <TrendChart data={stats.trend} inspectorWidth={640} />
        </Surface>
        <Surface variant="raised" className="workspace-page__panel">
          {stats.stats ? (
            <TopContactCard topSenders={stats.stats.topSenders} privacyOn={privacy.privacyOn} />
          ) : (
            <div className="workbench-empty-state">
              <Typography variant="label" weight={700}>
                选择会话
              </Typography>
              <Typography variant="body" color="var(--text-secondary)">
                从会话工作台选择聊天后，这里显示当前会话的统计摘要。
              </Typography>
            </div>
          )}
        </Surface>
      </div>
    </div>
  );
}

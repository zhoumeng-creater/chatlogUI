import { BarChart3, Bot, Images, Network, Search } from "lucide-react";
import { Button, Spinner, Typography } from "@l4/ui";

export interface ConversationInspectorStats {
  loading: boolean;
  error: string | null;
  messageCount: number | null;
  rangeLabel: string | null;
}

interface ConversationInspectorProps {
  conversationTitle: string;
  hasConversation: boolean;
  stats: ConversationInspectorStats;
  privacyOn: boolean;
  onRetryStats: () => void;
  onOpenSearch: () => void;
  onOpenAnalytics: () => void;
  onOpenMedia: () => void;
  onOpenAi: () => void;
  onOpenGraph: () => void;
}

export function ConversationInspector({
  conversationTitle,
  hasConversation,
  stats,
  privacyOn,
  onRetryStats,
  onOpenSearch,
  onOpenAnalytics,
  onOpenMedia,
  onOpenAi,
  onOpenGraph,
}: ConversationInspectorProps) {
  const safeConversationTitle = privacyOn && hasConversation ? "已隐藏会话" : conversationTitle;

  return (
    <aside className="conversation-inspector" aria-label="会话详情">
      <div className="conversation-inspector__header">
        <Typography variant="label" weight={700}>
          会话详情
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          {safeConversationTitle}
        </Typography>
      </div>

      {!hasConversation ? (
        <div className="conversation-inspector__empty">
          <Typography variant="label" weight={700}>
            选择会话后显示上下文
          </Typography>
          <Typography variant="body" color="var(--text-secondary)">
            打开左侧会话后，这里会显示统计摘要、最近上下文和跳转到完整工作区的入口。
          </Typography>
        </div>
      ) : (
        <>
          <section className="conversation-inspector__section" aria-label="当前会话统计">
            <div className="conversation-inspector__section-title">
              <BarChart3 size={16} />
              <Typography variant="label" weight={700}>
                当前会话统计
              </Typography>
            </div>
            {stats.loading ? (
              <div className="conversation-inspector__state">
                <Spinner size={18} label="加载当前会话统计..." />
              </div>
            ) : stats.error ? (
              <div className="conversation-inspector__state" role="alert">
                <Typography variant="body" color="var(--danger)">
                  统计加载失败，请稍后重试。
                </Typography>
                <Button variant="secondary" size="sm" onClick={onRetryStats}>
                  重试统计
                </Button>
              </div>
            ) : (
              <div className="conversation-inspector__metrics">
                <Metric label="消息数" value={stats.messageCount === null ? "暂无" : stats.messageCount.toLocaleString()} />
                <Metric label="范围" value={stats.rangeLabel || "全部"} />
              </div>
            )}
          </section>

          <section className="conversation-inspector__section" aria-label="上下文入口">
            <Typography variant="label" weight={700}>
              上下文入口
            </Typography>
            <div className="conversation-inspector__actions">
              <Button variant="secondary" size="sm" onClick={onOpenSearch}>
                <Search size={15} />
                搜索此会话
              </Button>
              <Button variant="ghost" size="sm" onClick={onOpenAnalytics}>
                <BarChart3 size={15} />
                查看完整统计
              </Button>
              <Button variant="ghost" size="sm" onClick={onOpenMedia}>
                <Images size={15} />
                打开媒体库
              </Button>
              <Button variant="ghost" size="sm" onClick={onOpenAi}>
                <Bot size={15} />
                问这个会话
              </Button>
              <Button variant="ghost" size="sm" onClick={onOpenGraph}>
                <Network size={15} />
                在图谱中查看
              </Button>
            </div>
          </section>
        </>
      )}
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="conversation-inspector__metric">
      <Typography variant="caption" color="var(--text-secondary)">
        {label}
      </Typography>
      <Typography variant="label" weight={700}>
        {value}
      </Typography>
    </div>
  );
}

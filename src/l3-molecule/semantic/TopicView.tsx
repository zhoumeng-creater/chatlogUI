import { Button, Surface, Typography, SkeletonLoader } from "@l4/ui";
import type { SemanticDiscoveryView } from "@/l2-coordinator/commander/semanticDiscoveryViewModel";
import { SemanticTopicTrend } from "./SemanticTopicTrend";

interface TopicViewProps {
  view: SemanticDiscoveryView["topics"];
  onRetry?: () => void;
}

export function TopicView({ view, onRetry }: TopicViewProps) {
  if (view.status === "loading") {
    return (
      <Surface variant="subtle" className="semantic-section">
        <SectionHeader view={view} />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="semantic-skeleton-row">
            <SkeletonLoader variant="rect" width="60%" height={14} />
            <SkeletonLoader variant="rect" width="40%" height={14} />
          </div>
        ))}
      </Surface>
    );
  }

  if (view.status === "error") {
    return (
      <Surface variant="subtle" className="semantic-section">
        <SectionHeader view={view} />
        <Typography variant="body" color="var(--danger)">
          {view.summaryError || "加载话题失败"}
        </Typography>
        {onRetry && (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            重试
          </Button>
        )}
      </Surface>
    );
  }

  if (view.status === "idle" || view.status === "empty") {
    return (
      <Surface variant="subtle" className="semantic-section">
        <SectionHeader view={view} />
        <Typography variant="body" color="var(--text-secondary)">
          暂无话题数据，请确保索引已构建并选择有足够消息的会话。
        </Typography>
      </Surface>
    );
  }

  const maxCount = Math.max(...view.rows.map((topic) => topic.count), 1);

  return (
    <Surface variant="subtle" className="semantic-section">
      <SectionHeader view={view} />
      {view.truncatedLabel && (
        <Typography variant="caption" color="var(--warning)">
          {view.truncatedLabel}
        </Typography>
      )}
      <SemanticTopicTrend rows={view.dailyRows} />
      {view.rows.map((topic, index) => (
        <div key={`${topic.label}-${index}`} className="semantic-topic-row">
          <div className="semantic-topic-row__label">
            <Typography variant="caption">{topic.label}</Typography>
            <Typography variant="caption" color="var(--text-secondary)">
              {topic.countLabel}
            </Typography>
          </div>
          <progress
            className="semantic-topic-row__meter"
            value={(topic.count / maxCount) * 100}
            max={100}
            aria-label={`${topic.label} 占比`}
          />
          {topic.keywords.length > 0 && (
            <div className="semantic-chip-list">
              {topic.keywords.map((keyword, keywordIndex) => (
                <span key={`${keyword}-${keywordIndex}`} className="semantic-chip">
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
      {view.summary && (
        <div className="semantic-summary-block">
          <Typography variant="caption" color="var(--text-secondary)">
            总结
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {view.summary}
          </Typography>
        </div>
      )}
      {view.summaryError && (
        <Typography variant="caption" color="var(--warning)">
          摘要生成失败：{view.summaryError}
        </Typography>
      )}
    </Surface>
  );
}

function SectionHeader({ view }: { view: SemanticDiscoveryView["topics"] }) {
  return (
    <div className="semantic-section__header">
      <Typography variant="label" weight={700}>
        热门话题
      </Typography>
      {(view.windowLabel || view.countLabel) && (
        <Typography variant="caption" color="var(--text-secondary)">
          {semanticMetaLine(view.windowLabel, view.countLabel)}
        </Typography>
      )}
    </div>
  );
}

function semanticMetaLine(...values: Array<string | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(" · ");
}

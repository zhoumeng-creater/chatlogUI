import { Button, Surface, Typography, SkeletonLoader } from "@l4/ui";
import type { SemanticDiscoveryTopicsView } from "@l2/commander/semanticDiscoveryViewModel";

interface TopicViewProps {
  view: SemanticDiscoveryTopicsView | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function TopicView({ view, loading, error, onRetry }: TopicViewProps) {

  if (loading) {
    return (
      <Surface variant="subtle" className="semantic-section">
        <Typography variant="label" weight={700}>
          热门话题
        </Typography>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="semantic-skeleton-row">
            <SkeletonLoader variant="rect" width="60%" height={14} />
            <SkeletonLoader variant="rect" width="40%" height={14} />
          </div>
        ))}
      </Surface>
    );
  }

  if (error) {
    return (
      <Surface variant="subtle" className="semantic-section">
        <Typography variant="label" weight={700}>
          热门话题
        </Typography>
        <Typography variant="body" color="var(--danger)">
          {error}
        </Typography>
        {onRetry && (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            重试
          </Button>
        )}
      </Surface>
    );
  }

  if (!view || view.rows.length === 0) {
    return (
      <Surface variant="subtle" className="semantic-section">
        <Typography variant="label" weight={700}>
          热门话题
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          暂无话题数据，请确保索引已构建。
        </Typography>
      </Surface>
    );
  }

  const maxCount = Math.max(...view.rows.map((topic) => topic.count), 1);

  return (
    <Surface variant="subtle" className="semantic-section">
      <div className="semantic-section__head">
        <div>
          <Typography variant="label" weight={700}>
            {view.title}
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {view.windowLabel} · {view.countLabel}
          </Typography>
        </div>
        {view.truncatedLabel && <span className="semantic-warning-pill">{view.truncatedLabel}</span>}
      </div>
      {view.summary && (
        <Typography variant="caption" color="var(--text-secondary)" className="semantic-summary-copy">
          {view.summary}
        </Typography>
      )}
      {view.summaryError && (
        <Typography variant="caption" color="var(--warning)" className="semantic-warning-copy">
          摘要生成失败：{view.summaryError}
        </Typography>
      )}
      {view.daily.length > 0 && (
        <div className="semantic-topic-trend" aria-label="话题每日趋势">
          {view.daily.map((entry) => (
            <div key={entry.date} className="semantic-topic-trend__item">
              <progress
                className="semantic-topic-trend__bar"
                value={entry.percent}
                max={100}
                aria-label={`${entry.date} ${entry.count} 条`}
              />
              <span>{entry.date.slice(-5)}</span>
            </div>
          ))}
        </div>
      )}
      {view.rows.map((topic, index) => (
        <div key={`${topic.label}-${index}`} className="semantic-topic-row">
          <div className="semantic-topic-row__label">
            <Typography variant="caption">{topic.label}</Typography>
            <Typography variant="caption" color="var(--text-secondary)">
              {topic.countLabel} 条
            </Typography>
          </div>
          <progress
            className="semantic-topic-row__meter"
            value={(topic.count / maxCount) * 100}
            max={100}
            aria-label={`${topic.label} 占比`}
          />
          {topic.keywords.length > 0 && (
            <div className="semantic-chip-list semantic-chip-list--inline">
              {topic.keywords.map((keyword) => (
                <span key={keyword} className="semantic-chip">
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </Surface>
  );
}

import { Button, Surface, Typography, SkeletonLoader } from "@l4/ui";
import { getSemanticDisplayText } from "./semanticDisplay";

interface TopicViewData {
  topics: Array<{ topic: string; count: number }>;
}

interface TopicViewProps {
  topics: TopicViewData | null;
  loading: boolean;
  error?: string | null;
  privacyOn: boolean;
  onRetry?: () => void;
}

export function TopicView({ topics, loading, error, privacyOn, onRetry }: TopicViewProps) {

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

  if (!topics || topics.topics.length === 0) {
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

  const maxCount = Math.max(...topics.topics.map((topic) => topic.count), 1);

  return (
    <Surface variant="subtle" className="semantic-section">
      <Typography variant="label" weight={700}>
        热门话题
      </Typography>
      {topics.topics.map((topic, index) => (
        <div key={`${topic.topic}-${index}`} className="semantic-topic-row">
          <div className="semantic-topic-row__label">
            <Typography variant="caption">{getSemanticDisplayText(topic.topic, privacyOn)}</Typography>
            <Typography variant="caption" color="var(--text-secondary)">
              {topic.count} 条
            </Typography>
          </div>
          <progress
            className="semantic-topic-row__meter"
            value={(topic.count / maxCount) * 100}
            max={100}
            aria-label={`${getSemanticDisplayText(topic.topic, privacyOn)} 占比`}
          />
        </div>
      ))}
    </Surface>
  );
}

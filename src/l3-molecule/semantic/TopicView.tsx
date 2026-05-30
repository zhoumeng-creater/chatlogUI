import { useEffect } from "react";
import { Surface, Typography, SkeletonLoader } from "@l4/ui";
import { useAiCommander } from "@l2/commander/useAiCommander";

export function TopicView() {
  const { topics, topicsLoading, loadAnalysis } = useAiCommander();

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  if (topicsLoading) {
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
            <Typography variant="caption">{topic.topic}</Typography>
            <Typography variant="caption" color="var(--text-secondary)">
              {topic.count} 条
            </Typography>
          </div>
          <div className="semantic-topic-row__track">
            <div
              className="semantic-topic-row__bar"
              style={{ width: `${(topic.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </Surface>
  );
}

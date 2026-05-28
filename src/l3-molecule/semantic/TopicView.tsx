import { useEffect } from 'react';
import { GlassPanel } from '@l4/ui/GlassPanel';
import { Typography } from '@l4/ui/Typography';
import { SkeletonLoader } from '@l4/ui/SkeletonLoader';
import { useAiCommander } from '@l2/commander/useAiCommander';

export function TopicView() {
  const { topics, topicsLoading, loadAnalysis } = useAiCommander();

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  if (topicsLoading) {
    return (
      <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
        <div style={{ padding: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            热门话题
          </Typography>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              <SkeletonLoader variant="rect" width="60%" height={14} />
              <SkeletonLoader variant="rect" width="40%" height={14} />
            </div>
          ))}
        </div>
      </GlassPanel>
    );
  }

  if (!topics || topics.topics.length === 0) {
    return (
      <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
        <div style={{ padding: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 8 }}>
            热门话题
          </Typography>
          <Typography variant="caption" color="var(--color-text-tertiary)">
            暂无话题数据，请确保索引已构建
          </Typography>
        </div>
      </GlassPanel>
    );
  }

  const maxCount = Math.max(...topics.topics.map((t) => t.count), 1);

  return (
    <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
      <div style={{ padding: 16 }}>
        <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
          热门话题
        </Typography>
        {topics.topics.map((topic, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <Typography variant="caption">
                {topic.topic}
              </Typography>
              <Typography variant="caption" color="var(--color-text-tertiary)">
                {topic.count} 条
              </Typography>
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: 'var(--color-border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(topic.count / maxCount) * 100}%`,
                  background: `hsl(${220 + i * 30}, 70%, 55%)`,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

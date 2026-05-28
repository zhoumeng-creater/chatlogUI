import { useEffect } from 'react';
import { GlassPanel } from '@l4/ui/GlassPanel';
import { Typography } from '@l4/ui/Typography';
import { SkeletonLoader } from '@l4/ui/SkeletonLoader';
import { useAiCommander } from '@l2/commander/useAiCommander';

export function ContactProfile() {
  const { profile, profileLoading, loadAnalysis } = useAiCommander();

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  if (profileLoading && !profile) {
    return (
      <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
        <div style={{ padding: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            联系人画像
          </Typography>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <SkeletonLoader variant="rect" width="30%" height={12} />
              <div style={{ marginTop: 4 }}>
                <SkeletonLoader variant="rect" width="70%" height={14} />
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    );
  }

  if (!profile) return null;

  const fields = [
    { label: '角色', value: profile.role },
    { label: '活跃时段', value: profile.activeHours },
    { label: '沟通频率', value: profile.dailyFrequency ? `日均 ${profile.dailyFrequency} 条` : undefined },
    { label: '情绪倾向', value: profile.sentiment },
  ].filter((f) => f.value);

  return (
    <GlassPanel blur={12} opacity={0.6} borderRadius={16}>
      <div style={{ padding: 16 }}>
        <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
          联系人画像
        </Typography>
        {fields.map((f, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginBottom: 1 }}>
              {f.label}
            </Typography>
            <Typography variant="body">
              {f.value}
            </Typography>
          </div>
        ))}
        {profile.mainTopics && profile.mainTopics.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginBottom: 4 }}>
              主要话题
            </Typography>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {profile.mainTopics.map((t, i) => (
                <span
                  key={i}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: 'rgba(0,122,255,0.1)',
                    fontSize: 12,
                    color: '#007AFF',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {profile.summary && (
          <div style={{ marginTop: 8 }}>
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginBottom: 2 }}>
              总结
            </Typography>
            <Typography variant="caption" color="var(--color-text-secondary)">
              {profile.summary}
            </Typography>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

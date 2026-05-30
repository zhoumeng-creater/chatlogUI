import { useEffect } from "react";
import { Surface, Typography, SkeletonLoader } from "@l4/ui";
import { useAiCommander } from "@l2/commander/useAiCommander";

export function ContactProfile() {
  const { profile, profileLoading, loadAnalysis } = useAiCommander();

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  if (profileLoading && !profile) {
    return (
      <Surface variant="subtle" className="semantic-section">
        <Typography variant="label" weight={700}>
          联系人画像
        </Typography>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="semantic-skeleton-column">
            <SkeletonLoader variant="rect" width="30%" height={12} />
            <SkeletonLoader variant="rect" width="70%" height={14} />
          </div>
        ))}
      </Surface>
    );
  }

  if (!profile) return null;

  const fields = [
    { label: "角色", value: profile.role },
    { label: "活跃时段", value: profile.activeHours },
    { label: "沟通频率", value: profile.dailyFrequency ? `日均 ${profile.dailyFrequency} 条` : undefined },
    { label: "情绪倾向", value: profile.sentiment },
  ].filter((field) => field.value);

  return (
    <Surface variant="subtle" className="semantic-section">
      <Typography variant="label" weight={700}>
        联系人画像
      </Typography>
      {fields.map((field) => (
        <div key={field.label} className="semantic-profile-row">
          <Typography variant="caption" color="var(--text-secondary)">
            {field.label}
          </Typography>
          <Typography variant="body">
            {field.value}
          </Typography>
        </div>
      ))}
      {profile.mainTopics && profile.mainTopics.length > 0 && (
        <div className="semantic-profile-row">
          <Typography variant="caption" color="var(--text-secondary)">
            主要话题
          </Typography>
          <div className="semantic-chip-list">
            {profile.mainTopics.map((topic) => (
              <span key={topic} className="semantic-chip">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
      {profile.summary && (
        <div className="semantic-profile-row">
          <Typography variant="caption" color="var(--text-secondary)">
            总结
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {profile.summary}
          </Typography>
        </div>
      )}
    </Surface>
  );
}

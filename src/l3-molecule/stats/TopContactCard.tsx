import { Avatar, Surface, Typography } from "@l4/ui";
import type { AdaptedStats } from "@l2/data-clerk/stores/useStatsStore";

interface TopContactCardProps {
  topSenders: AdaptedStats["topSenders"];
}

export function TopContactCard({ topSenders }: TopContactCardProps) {
  if (!topSenders || topSenders.length === 0) return null;

  const top10 = [...topSenders]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <Surface variant="base" className="stats-card">
      <Typography variant="label" weight={700}>
        活跃联系人
      </Typography>

      <div className="stats-sender-list">
        {top10.map((item, index) => (
          <div key={item.sender} className="stats-sender-row">
            <Typography variant="body" color="var(--text-muted)" weight={700} className="stats-sender-rank">
              {index + 1}
            </Typography>
            <Avatar alt={item.display || item.sender} size={32} fallback={(item.display || item.sender).slice(0, 2)} />
            <Typography variant="body" color="var(--text-primary)" className="stats-sender-name">
              {item.display || item.sender}
            </Typography>
            <Typography variant="label" color="var(--text-secondary)" weight={700}>
              {item.count.toLocaleString()}
            </Typography>
          </div>
        ))}
      </div>
    </Surface>
  );
}

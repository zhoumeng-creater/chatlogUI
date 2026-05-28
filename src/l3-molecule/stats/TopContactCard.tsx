import { GlassPanel, Typography, Avatar } from "@l4/ui";
import type { StatsCountBySender } from "@l2/api-docs/stats";

interface TopContactCardProps {
  topSenders: StatsCountBySender[];
}

export function TopContactCard({ topSenders }: TopContactCardProps) {
  if (!topSenders || topSenders.length === 0) return null;

  const top10 = [...topSenders]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <GlassPanel opacity={0.4} borderRadius={14} style={{ padding: "20px" }}>
      <Typography variant="label" color="var(--color-text-secondary)" style={{ marginBottom: 12 }}>
        活跃联系人
      </Typography>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {top10.map((item, idx) => (
          <div
            key={item.sender}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 0",
            }}
          >
            <Typography
              variant="body"
              color="var(--color-text-quaternary)"
              weight={600}
              style={{ width: 24, textAlign: "center" }}
            >
              {idx + 1}
            </Typography>
            <Avatar alt={item.sender} size={32} fallback={item.sender.slice(0, 2)} />
            <Typography
              variant="body"
              color="var(--color-text-primary)"
              style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {item.sender}
            </Typography>
            <Typography variant="label" color="var(--color-text-secondary)" weight={600}>
              {item.count.toLocaleString()}
            </Typography>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

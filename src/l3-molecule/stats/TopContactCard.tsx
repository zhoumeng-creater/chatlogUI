import { Avatar, Surface, Typography } from "@l4/ui";
import type { AdaptedStats } from "@l2/data-clerk/stores/useStatsStore";
import {
  formatTopSenderAvatarAlt,
  formatTopSenderFallback,
  formatTopSenderName,
} from "./statsDisplay";

interface TopContactCardProps {
  topSenders: AdaptedStats["topSenders"];
  privacyOn: boolean;
}

export function TopContactCard({ topSenders, privacyOn }: TopContactCardProps) {
  const top10 = [...topSenders]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <Surface variant="base" className="stats-card">
      <Typography variant="label" weight={700}>
        活跃联系人
      </Typography>
      {top10.length === 0 ? (
        <Typography variant="body" color="var(--text-secondary)">
          当前范围没有可展示的活跃对象。可以切换时间范围或返回会话确认是否有消息。
        </Typography>
      ) : (

        <div className="stats-sender-list">
          {top10.map((item, index) => (
            <div key={item.sender} className="stats-sender-row">
              <Typography variant="body" color="var(--text-muted)" weight={700} className="stats-sender-rank">
                {index + 1}
              </Typography>
              <Avatar
                alt={formatTopSenderAvatarAlt(item, privacyOn)}
                size={32}
                fallback={formatTopSenderFallback(item, privacyOn)}
              />
              <Typography variant="body" color="var(--text-primary)" className="stats-sender-name">
                {formatTopSenderName(item, privacyOn)}
              </Typography>
              <Typography variant="label" color="var(--text-secondary)" weight={700}>
                {item.count.toLocaleString()}
              </Typography>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}

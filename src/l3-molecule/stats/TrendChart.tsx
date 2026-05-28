import { GlassPanel, Typography } from "@l4/ui";
import type { TrendDataPoint } from "@l2/api-docs/stats";

interface TrendChartProps {
  data: TrendDataPoint[];
}

export function TrendChart({ data }: TrendChartProps) {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const firstDate = data[0].date;
  const lastDate = data[data.length - 1].date;

  return (
    <GlassPanel opacity={0.4} borderRadius={14} style={{ padding: "20px" }}>
      <Typography variant="label" color="var(--color-text-secondary)" style={{ marginBottom: 16 }}>
        消息趋势
      </Typography>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          height: 140,
          padding: "0 4px",
        }}
      >
        {data.map((point, idx) => {
          const heightPct = Math.max((point.count / maxCount) * 100, 2);
          return (
            <div
              key={point.date || idx}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                height: "100%",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 36,
                  height: `${heightPct}%`,
                  background: "linear-gradient(180deg, #007AFF 0%, rgba(0,122,255,0.3) 100%)",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.4s ease",
                  minHeight: 2,
                }}
              />
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <Typography variant="caption" color="var(--color-text-quaternary)">
          {firstDate}
        </Typography>
        <Typography variant="caption" color="var(--color-text-quaternary)">
          {lastDate}
        </Typography>
      </div>
    </GlassPanel>
  );
}

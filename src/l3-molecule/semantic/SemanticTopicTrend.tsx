import { Typography } from "@l4/ui";

interface SemanticTopicTrendProps {
  rows: Array<{ date: string; count: number }>;
}

export function SemanticTopicTrend({ rows }: SemanticTopicTrendProps) {
  if (rows.length === 0) return null;
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="semantic-topic-trend" aria-label="话题趋势">
      {rows.map((row) => (
        <div key={row.date} className="semantic-topic-trend__row">
          <Typography variant="caption" color="var(--text-secondary)">
            {row.date}
          </Typography>
          <progress
            className="semantic-topic-trend__meter"
            value={(row.count / maxCount) * 100}
            max={100}
            aria-label={`${row.date} ${row.count} 条`}
          />
          <Typography variant="caption" color="var(--text-secondary)">
            {row.count}
          </Typography>
        </div>
      ))}
    </div>
  );
}

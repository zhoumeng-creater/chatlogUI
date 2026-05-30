import type { TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";

interface ChartFallbackTableProps {
  data: TrendDataPoint[];
}

export function ChartFallbackTable({ data }: ChartFallbackTableProps) {
  return (
    <table className="chart-fallback-table">
      <thead>
        <tr>
          <th scope="col">日期</th>
          <th scope="col">消息数</th>
        </tr>
      </thead>
      <tbody>
        {data.map((point) => (
          <tr key={point.date}>
            <td>{point.date}</td>
            <td>{point.count.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

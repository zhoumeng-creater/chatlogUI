import { Typography } from "@l4/ui/Typography";
import { getGraphTooltipDisplay } from "./graphDisplay";
import type { GraphDataView } from "./graphTypes";

const KIND_LABELS: Record<string, string> = {
  person: "人物",
  organization: "组织",
  project: "项目",
  product: "产品",
  customer: "客户",
  group: "群组",
  topic: "话题",
  keyword: "关键词",
  event: "事件",
  unknown: "未知",
};

interface GraphTooltipProps {
  hoveredNodeId: string | null;
  tooltipCoord: { x: number; y: number } | null;
  data: GraphDataView | null;
  privacyOn: boolean;
}

export function GraphTooltip({
  hoveredNodeId,
  tooltipCoord,
  data,
  privacyOn,
}: GraphTooltipProps) {
  if (!hoveredNodeId || !data) return null;

  const node = data.nodes.find((n) => n.id === hoveredNodeId);
  if (!node) return null;

  const connectedEdges = data.edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );
  const kindLabel = KIND_LABELS[node.kind] ?? node.kind;
  const display = getGraphTooltipDisplay({ title: node.name, body: "" }, privacyOn);
  const lastSeenDate = node.last_seen
    ? new Date(node.last_seen * 1000).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
    : "未知";

  return (
      <div
        className="graph-tooltip"
        style={{
          left: tooltipCoord ? tooltipCoord.x + 16 : 0,
          top: tooltipCoord ? tooltipCoord.y - 60 : 0,
        }}
      >
        <Typography variant="body" weight={700} style={{ marginBottom: 4 }}>
          {display.title}
        </Typography>
        <Typography variant="caption" color="var(--color-text-secondary)">
          {kindLabel} · 提到 {node.value} 次
        </Typography>
        <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginTop: 4 }}>
          最近活跃：{lastSeenDate}
        </Typography>
        <Typography variant="caption" color="var(--color-text-tertiary)">
          关联关系：{connectedEdges.length} 条
        </Typography>
        <Typography variant="caption" color="var(--color-accent)" style={{ marginTop: 4 }}>
          双击查看聊天记录
        </Typography>
      </div>
  );
}

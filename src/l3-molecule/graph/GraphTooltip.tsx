import { motion, AnimatePresence } from "framer-motion";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import { Typography } from "@l4/ui/Typography";

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

export function GraphTooltip() {
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const tooltipCoord = useGraphStore((s) => s.tooltipCoord);
  const data = useGraphStore((s) => s.data);

  if (!hoveredNodeId || !data) return null;

  const node = data.nodes.find((n) => n.id === hoveredNodeId);
  if (!node) return null;

  const connectedEdges = data.edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );
  const kindLabel = KIND_LABELS[node.kind] ?? node.kind;
  const lastSeenDate = node.last_seen
    ? new Date(node.last_seen * 1000).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
    : "未知";

  return (
    <AnimatePresence>
      <motion.div
        key={node.id}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        style={{
          position: "fixed",
          left: tooltipCoord ? tooltipCoord.x + 16 : 0,
          top: tooltipCoord ? tooltipCoord.y - 60 : 0,
          zIndex: 2000,
          pointerEvents: "none",
          background: "rgba(10, 10, 26, 0.92)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(74, 158, 255, 0.25)",
          borderRadius: 12,
          padding: "10px 14px",
          minWidth: 180,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <Typography variant="body" weight={700} style={{ marginBottom: 4 }}>
          {node.name}
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
      </motion.div>
    </AnimatePresence>
  );
}

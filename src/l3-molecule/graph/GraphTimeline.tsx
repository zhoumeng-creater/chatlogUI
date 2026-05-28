import { motion, AnimatePresence } from "framer-motion";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import type { GraphTimeline as GraphTimelineEntry } from "@/l2-coordinator/api-docs/graph";

const TYPE_ICONS: Record<string, string> = {
  event: "\u{1F4C5}",
  fact: "\u{1F4CB}",
  relation: "\u{1F517}",
};

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GraphTimeline() {
  const timelineVisible = useGraphStore((s) => s.timelineVisible);
  const data = useGraphStore((s) => s.data);
  const highlightedTimelineId = useGraphStore((s) => s.highlightedTimelineId);
  const graph = useGraphCommander();

  if (!data || !data.timeline || data.timeline.length === 0) return null;

  return (
    <AnimatePresence>
      {timelineVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 150, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            borderTop: "1px solid rgba(74,158,255,0.15)",
            flexShrink: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "2px 8px",
              borderBottom: "1px solid rgba(74,158,255,0.1)",
              flexShrink: 0,
            }}
          >
            <Typography variant="caption" weight={600} color="var(--color-text-secondary)">
              时间轴 · {data.timeline.length} 条
            </Typography>
            <AppleButton
              variant="ghost"
              size="sm"
              onClick={() => graph.setTimelineVisible(false)}
              style={{ padding: "0 6px", minWidth: 24, fontSize: 12 }}
            >
              ×
            </AppleButton>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
            {data.timeline.map((entry: GraphTimelineEntry, i: number) => {
              const id = `${i}`;
              const isHighlighted = highlightedTimelineId === id;
              return (
                <div
                  key={id}
                  onClick={() => graph.highlightTimelineEntry(id)}
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: "4px 6px",
                    cursor: "pointer",
                    borderRadius: 6,
                    background: isHighlighted ? "rgba(74,158,255,0.1)" : "transparent",
                    marginBottom: 2,
                  }}
                >
                  <span style={{ fontSize: 12, flexShrink: 0 }}>
                    {TYPE_ICONS[entry.type] ?? "\u{2022}"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <Typography
                        variant="caption"
                        weight={600}
                        color="var(--color-text-primary)"
                        style={{ fontSize: 11 }}
                      >
                        {entry.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="var(--color-text-tertiary)"
                        style={{ fontSize: 10, flexShrink: 0 }}
                      >
                        {formatTime(entry.time)}
                      </Typography>
                    </div>
                    {entry.description && (
                      <Typography
                        variant="caption"
                        color="var(--color-text-tertiary)"
                        style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {entry.description}
                      </Typography>
                    )}
                    {entry.source && (
                      <Typography variant="caption" color="var(--color-accent)" style={{ fontSize: 10 }}>
                        来源: {entry.source}
                      </Typography>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

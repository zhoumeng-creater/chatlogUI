import { X } from "lucide-react";
import { classNames } from "@/utils/classNames";
import { IconButton } from "@l4/ui/IconButton";
import { Typography } from "@l4/ui/Typography";
import { getGraphTimelineDisplay } from "./graphDisplay";
import type { GraphDataView, GraphTimelineEntryView } from "./graphTypes";

const TYPE_LABELS: Record<string, string> = {
  event: "事件",
  fact: "事实",
  relation: "关系",
};

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface GraphTimelineProps {
  data: GraphDataView | null;
  timelineVisible: boolean;
  highlightedTimelineId: string | null;
  privacyOn: boolean;
  onTimelineVisibleChange: (visible: boolean) => void;
  onHighlightTimelineEntry: (id: string) => void;
}

export function GraphTimeline({
  data,
  timelineVisible,
  highlightedTimelineId,
  privacyOn,
  onTimelineVisibleChange,
  onHighlightTimelineEntry,
}: GraphTimelineProps) {
  if (!data || !data.timeline || data.timeline.length === 0) return null;

  if (!timelineVisible) return null;

  return (
    <div className="graph-timeline">
          <div className="graph-timeline__header">
            <Typography variant="caption" weight={600} color="var(--color-text-secondary)">
              时间轴 · {data.timeline.length} 条
            </Typography>
            <IconButton
              icon={<X size={14} />}
              label="关闭时间轴"
              tooltip="关闭时间轴"
              tooltipPlacement="left"
              size="sm"
              onClick={() => onTimelineVisibleChange(false)}
              className="graph-timeline__close"
            />
          </div>
          <div className="graph-timeline__body">
            {data.timeline.map((entry: GraphTimelineEntryView, i: number) => {
              const id = `${i}`;
              const isHighlighted = highlightedTimelineId === id;
              const display = getGraphTimelineDisplay(
                {
                  title: entry.title,
                  source: entry.source ?? "",
                  description: entry.description,
                },
                privacyOn,
              );
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => onHighlightTimelineEntry(id)}
                  className={classNames(
                    "graph-timeline__entry",
                    isHighlighted && "graph-timeline__entry--highlighted",
                  )}
                  aria-pressed={isHighlighted}
                >
                  <span className="graph-timeline__type">
                    {TYPE_LABELS[entry.type] ?? "条目"}
                  </span>
                  <div className="graph-timeline__content">
                    <div className="graph-timeline__meta">
                      <Typography
                        variant="caption"
                        weight={600}
                        color="var(--color-text-primary)"
                      >
                        {display.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="var(--color-text-tertiary)"
                        className="graph-timeline__time"
                      >
                        {formatTime(entry.time)}
                      </Typography>
                    </div>
                    {display.description && (
                      <Typography
                        variant="caption"
                        color="var(--color-text-tertiary)"
                        className="graph-timeline__text"
                      >
                        {display.description}
                      </Typography>
                    )}
                    {display.source && (
                      <Typography variant="caption" color="var(--color-accent)">
                        来源: {display.source}
                      </Typography>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
    </div>
  );
}

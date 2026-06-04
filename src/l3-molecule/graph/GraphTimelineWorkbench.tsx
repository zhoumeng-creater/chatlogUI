import { Typography } from "@l4/ui";
import { getGraphTimelineDisplay } from "./graphDisplay";
import type { GraphTimelineWorkbench as GraphTimelineWorkbenchView } from "@l2/commander/graphViewModel";

interface GraphTimelineWorkbenchProps {
  timeline: GraphTimelineWorkbenchView;
  selectedItemId: string | null;
  privacyOn: boolean;
  onSelect: (id: string) => void;
}

export function GraphTimelineWorkbench({
  timeline,
  selectedItemId,
  privacyOn,
  onSelect,
}: GraphTimelineWorkbenchProps) {
  if (timeline.rows.length === 0) {
    return (
      <section className="graph-timeline-workbench graph-timeline-workbench--empty" aria-label="图谱时间线">
        <Typography variant="body" color="var(--text-secondary)">
          当前筛选条件下没有时间线条目。
        </Typography>
      </section>
    );
  }

  return (
    <section className="graph-timeline-workbench" aria-label="图谱时间线">
      {timeline.rows.map((row) => {
        const selected = selectedItemId === row.id;
        const display = getGraphTimelineDisplay(
          { title: row.label, source: row.meta[1] ?? "", description: row.detail },
          privacyOn,
        );
        return (
          <button
            key={row.id}
            type="button"
            className={
              selected
                ? "graph-timeline-workbench__entry graph-timeline-workbench__entry--selected"
                : "graph-timeline-workbench__entry"
            }
            aria-pressed={selected}
            onClick={() => onSelect(row.id)}
          >
            <span className="graph-timeline-workbench__rail" aria-hidden="true" />
            <span className="graph-timeline-workbench__content">
              <Typography variant="label" weight={700}>
                {display.title}
              </Typography>
              <Typography variant="caption" color="var(--text-secondary)">
                {display.description}
              </Typography>
              {display.source && (
                <Typography variant="caption" color="var(--accent)">
                  来源: {display.source}
                </Typography>
              )}
            </span>
          </button>
        );
      })}
    </section>
  );
}

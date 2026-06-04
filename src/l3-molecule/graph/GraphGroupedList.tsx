import { Typography } from "@l4/ui";
import {
  getGraphNodeLabel,
  getGraphRelationLabel,
  getGraphTimelineDisplay,
} from "./graphDisplay";
import type { GraphWorkbenchSection, GraphWorkbenchRow } from "@l2/commander/graphViewModel";

interface GraphGroupedListProps {
  sections: GraphWorkbenchSection[];
  selectedItemId: string | null;
  privacyOn: boolean;
  onSelect: (id: string) => void;
}

export function GraphGroupedList({
  sections,
  selectedItemId,
  privacyOn,
  onSelect,
}: GraphGroupedListProps) {
  const hasRows = sections.some((section) => section.rows.length > 0);

  if (!hasRows) {
    return (
      <section className="graph-grouped-list graph-grouped-list--empty" aria-label="图谱列表">
        <Typography variant="body" color="var(--text-secondary)">
          当前筛选条件下没有实体、关系、事件或事实。
        </Typography>
      </section>
    );
  }

  return (
    <section className="graph-grouped-list" aria-label="图谱列表">
      {sections.map((section) => (
        <div className="graph-grouped-list__section" key={section.id}>
          <div className="graph-grouped-list__section-head">
            <Typography variant="label" weight={700}>
              {section.label}
            </Typography>
            <Typography variant="caption" color="var(--text-secondary)">
              {section.count.toLocaleString("zh-CN")}
            </Typography>
          </div>
          <div className="graph-grouped-list__rows" role="list">
            {section.rows.slice(0, 80).map((row) => {
              const display = displayRow(row, privacyOn);
              const selected = selectedItemId === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  className={
                    selected
                      ? "graph-grouped-list__row graph-grouped-list__row--selected"
                      : "graph-grouped-list__row"
                  }
                  aria-pressed={selected}
                  onClick={() => onSelect(row.id)}
                >
                  <span className="graph-grouped-list__row-main">
                    <Typography variant="label" weight={700}>
                      {display.label}
                    </Typography>
                    <Typography variant="caption" color="var(--text-secondary)">
                      {display.detail}
                    </Typography>
                  </span>
                  <span className="graph-grouped-list__meta">
                    {row.meta.slice(0, 3).map((item) => (
                      <span className="graph-chip" key={item}>
                        {item}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function displayRow(row: GraphWorkbenchRow, privacyOn: boolean): { label: string; detail: string } {
  if (row.kind === "entity") {
    return {
      label: getGraphNodeLabel(row.label, privacyOn),
      detail: getGraphNodeLabel(row.detail, privacyOn),
    };
  }
  if (row.kind === "relation" || row.kind === "fact") {
    return {
      label: getGraphRelationLabel(row.label, privacyOn),
      detail: getGraphRelationLabel(row.detail, privacyOn),
    };
  }
  const timeline = getGraphTimelineDisplay(
    { title: row.label, source: "", description: row.detail },
    privacyOn,
  );
  return { label: timeline.title, detail: timeline.description };
}

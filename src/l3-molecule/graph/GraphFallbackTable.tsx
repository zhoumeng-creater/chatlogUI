import { Typography } from "@l4/ui";
import { getGraphNodeLabel, getGraphRelationLabel, getGraphTimelineDisplay } from "./graphDisplay";
import type { GraphModuleTableRowView } from "./graphTypes";

interface GraphFallbackTableProps {
  rows: GraphModuleTableRowView[];
  privacyOn: boolean;
}

export function GraphFallbackTable({ rows, privacyOn }: GraphFallbackTableProps) {
  if (rows.length === 0) {
    return (
      <div className="graph-fallback-table graph-fallback-table--empty">
        <Typography variant="body" color="var(--text-secondary)">
          当前筛选条件下没有可展示的图谱条目。
        </Typography>
      </div>
    );
  }

  return (
    <div className="graph-fallback-table" role="table" aria-label="图谱条目">
      <div className="graph-fallback-table__head" role="row">
        <Typography variant="caption" weight={700} role="columnheader">
          类型
        </Typography>
        <Typography variant="caption" weight={700} role="columnheader">
          名称
        </Typography>
        <Typography variant="caption" weight={700} role="columnheader">
          详情
        </Typography>
      </div>
      <div className="graph-fallback-table__body">
        {rows.slice(0, 120).map((row) => {
          const display = displayRow(row, privacyOn);
          return (
            <div className="graph-fallback-table__row" role="row" key={row.id}>
              <Typography variant="caption" color="var(--text-secondary)" role="cell">
                {rowTypeLabel(row.type)}
              </Typography>
              <Typography variant="label" role="cell" title={display.label}>
                {display.label}
              </Typography>
              <Typography variant="caption" color="var(--text-secondary)" role="cell" title={display.detail}>
                {display.detail}
              </Typography>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function displayRow(row: GraphModuleTableRowView, privacyOn: boolean) {
  if (row.type === "node") {
    return {
      label: getGraphNodeLabel(row.label, privacyOn),
      detail: getGraphNodeLabel(row.detail, privacyOn),
    };
  }

  if (row.type === "edge") {
    return {
      label: getGraphRelationLabel(row.label, privacyOn),
      detail: getGraphRelationLabel(row.detail, privacyOn),
    };
  }

  const timeline = getGraphTimelineDisplay(
    { title: row.label, source: "", description: row.detail },
    privacyOn,
  );
  return {
    label: timeline.title,
    detail: timeline.description,
  };
}

function rowTypeLabel(type: GraphModuleTableRowView["type"]): string {
  if (type === "node") return "实体";
  if (type === "edge") return "关系";
  return "时间";
}

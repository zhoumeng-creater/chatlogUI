import { Filter, MessageSquare, ScanSearch } from "lucide-react";
import { Button, Typography } from "@l4/ui";
import {
  getGraphNodeLabel,
  getGraphRelationLabel,
  getGraphTimelineDisplay,
} from "./graphDisplay";
import type { GraphDetailInspector as GraphDetailInspectorView } from "@l2/commander/graphViewModel";

interface GraphDetailInspectorProps {
  inspector: GraphDetailInspectorView | null;
  privacyOn: boolean;
  onAction: (actionId: string) => void;
}

export function GraphDetailInspector({ inspector, privacyOn, onAction }: GraphDetailInspectorProps) {
  if (!inspector) {
    return (
      <aside className="graph-detail-inspector graph-detail-inspector--empty" aria-label="图谱详情">
        <Typography variant="body" weight={700}>
          选择一个图谱条目
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          可查看实体、关系、事实、事件或时间线的安全摘要。
        </Typography>
      </aside>
    );
  }

  const title = displayValue(inspector.title, inspector.kind, privacyOn);

  return (
    <aside className="graph-detail-inspector" aria-label="图谱详情">
      <div className="graph-detail-inspector__header">
        <div>
          <Typography variant="label" weight={700}>
            {title}
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {inspector.subtitle}
          </Typography>
        </div>
      </div>
      <dl className="graph-detail-inspector__rows">
        {inspector.rows.map((row) => (
          <div className="graph-detail-inspector__row" key={`${row.label}-${row.value}`}>
            <dt>{row.label}</dt>
            <dd>{displayValue(row.value, inspector.kind, privacyOn)}</dd>
          </div>
        ))}
      </dl>
      <div className="graph-detail-inspector__actions">
        {inspector.actions.map((action) => {
          const Icon = actionIcon(action.id);
          const disabled = privacyOn || !action.enabled || action.id === "open-source";
          return (
            <Button
              key={action.id}
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => onAction(action.id)}
            >
              <Icon size={14} />
              {action.label}
            </Button>
          );
        })}
      </div>
    </aside>
  );
}

function actionIcon(actionId: string) {
  if (actionId === "focus-visualization") return ScanSearch;
  if (actionId === "graph-qa") return MessageSquare;
  return Filter;
}

function displayValue(value: string, kind: GraphDetailInspectorView["kind"], privacyOn: boolean): string {
  if (!privacyOn) return value;
  if (kind === "entity") return getGraphNodeLabel(value, true);
  if (kind === "timeline" || kind === "event") {
    return getGraphTimelineDisplay({ title: value, source: "", description: "" }, true).title;
  }
  return getGraphRelationLabel(value, true);
}

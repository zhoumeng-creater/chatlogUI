import type { ReactNode } from "react";
import type { WorkspaceRouteScopeView } from "@l2/commander/workspaceRouteScope";
import { StatusIndicator, Typography, type StatusTone } from "@l4/ui";

export interface WorkspaceScopeStatusItem {
  label: string;
  value: string;
  tone?: StatusTone;
  busy?: boolean;
}

interface WorkspaceScopeStatusProps {
  workspaceRouteScope: WorkspaceRouteScopeView;
  items: WorkspaceScopeStatusItem[];
  actions?: ReactNode;
}

export function WorkspaceScopeStatus({
  workspaceRouteScope,
  items,
  actions,
}: WorkspaceScopeStatusProps) {
  const contextChips = [
    workspaceRouteScope.sourceLabel,
    workspaceRouteScope.focusLabel,
  ].filter((item): item is string => Boolean(item));

  return (
    <section className="workspace-page__status-strip" aria-label="页面范围状态摘要">
      <div className="workspace-page__status-copy">
        <Typography variant="label" weight={700}>
          只读范围摘要：{workspaceRouteScope.scopeLabel}
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          {workspaceRouteScope.scopeDescription}
        </Typography>
      </div>
      <div className="workspace-page__status-items" aria-label="当前页面状态">
        {contextChips.map((chip) => (
          <span key={chip} className="workspace-page__status-chip">
            {chip}
          </span>
        ))}
        {items.map((item) => (
          <StatusIndicator
            key={`${item.label}:${item.value}`}
            label={`${item.label}：${item.value}`}
            tone={item.tone}
            busy={item.busy}
          />
        ))}
        {actions}
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import {
  BarChart3,
  Bot,
  Images,
  MessageCircle,
  MessageSquare,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { Tooltip } from "@l4/ui";
import type { PrimaryWorkspaceId, PrimaryWorkspaceRailItem } from "@/l2-coordinator/commander/primaryWorkspaceNavigation";
import type { WorkspaceRailMode } from "@/l2-coordinator/commander/workspacePreferenceModel";
import { classNames } from "@/utils/classNames";

interface PrimaryWorkspaceRailProps {
  railMode: WorkspaceRailMode;
  showLabels: boolean;
  canToggleLabels: boolean;
  items: PrimaryWorkspaceRailItem[];
  onToggleLabels: () => void;
  onNavigate: (route: string, id: PrimaryWorkspaceId) => void;
}

export function PrimaryWorkspaceRail({
  railMode,
  showLabels,
  canToggleLabels,
  items,
  onToggleLabels,
  onNavigate,
}: PrimaryWorkspaceRailProps) {
  const toggleLabel = railMode === "expanded" ? "收起导航栏" : "展开导航栏";

  return (
    <div
      className="primary-workspace-rail"
      data-rail-mode={railMode}
      data-coach-anchor="primary-workspace-rail"
    >
      {canToggleLabels && (
        <Tooltip label={toggleLabel} placement="right">
          <button
            type="button"
            className="primary-workspace-rail-toggle"
            aria-label={toggleLabel}
            aria-expanded={railMode === "expanded"}
            onClick={onToggleLabels}
          >
            {railMode === "expanded" ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
            {showLabels && <span>{toggleLabel}</span>}
          </button>
        </Tooltip>
      )}
      {items.map((item) => (
        <RailItem
          key={item.id}
          icon={getWorkspaceIcon(item.id)}
          label={item.label}
          route={item.route}
          badge={item.badge}
          showLabel={showLabels}
          active={item.active}
          onClick={() => onNavigate(item.route, item.id)}
        />
      ))}
    </div>
  );
}

function getWorkspaceIcon(id: PrimaryWorkspaceId): ReactNode {
  switch (id) {
    case "workbench":
      return <MessageSquare size={17} />;
    case "search":
      return <Search size={17} />;
    case "media":
      return <Images size={17} />;
    case "sns":
      return <MessageCircle size={17} />;
    case "analytics":
      return <BarChart3 size={17} />;
    case "ai":
      return <Bot size={17} />;
    case "graph":
      return <Network size={17} />;
  }
}

interface RailItemProps {
  icon: ReactNode;
  label: string;
  route: string;
  badge?: string;
  showLabel: boolean;
  active?: boolean;
  onClick: () => void;
}

function RailItem({ icon, label, route, badge, showLabel, active = false, onClick }: RailItemProps) {
  const accessibleLabel = `打开${label}`;
  return (
    <Tooltip label={accessibleLabel} placement="right">
      <button
        type="button"
        className={classNames("primary-workspace-rail-item", active && "primary-workspace-rail-item--active")}
        aria-label={accessibleLabel}
        aria-current={active ? "page" : undefined}
        data-route={route}
        onClick={onClick}
      >
        {icon}
        {showLabel && <span>{label}</span>}
        {badge && <span className="primary-workspace-rail-item__badge">{badge}</span>}
      </button>
    </Tooltip>
  );
}

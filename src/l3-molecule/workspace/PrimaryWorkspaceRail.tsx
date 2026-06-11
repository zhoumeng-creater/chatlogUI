import type { ReactNode } from "react";
import { BarChart3, Bot, Images, MessageCircle, MessageSquare, Network, Search } from "lucide-react";
import { Tooltip } from "@l4/ui";
import type { PrimaryWorkspaceId, PrimaryWorkspaceRailItem } from "@/l2-coordinator/commander/primaryWorkspaceNavigation";
import { classNames } from "@/utils/classNames";

interface PrimaryWorkspaceRailProps {
  showLabels: boolean;
  items: PrimaryWorkspaceRailItem[];
  onNavigate: (route: string, id: PrimaryWorkspaceId) => void;
}

export function PrimaryWorkspaceRail({
  showLabels,
  items,
  onNavigate,
}: PrimaryWorkspaceRailProps) {
  return (
    <>
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
    </>
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

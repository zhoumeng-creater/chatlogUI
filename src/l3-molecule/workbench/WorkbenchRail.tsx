import type { ReactNode } from "react";
import { BarChart3, Bot, Images, MessageCircle, MessageSquare, Network } from "lucide-react";
import { Tooltip } from "@l4/ui";
import { classNames } from "@/utils/classNames";
import { getWorkbenchRailButtonLabel } from "./workbenchAccessibility";

export type WorkbenchRailModule = "chat" | "stats" | "media" | "sns" | "ai" | "graph";

export interface WorkbenchRailItemState {
  module: WorkbenchRailModule;
  label: string;
  active: boolean;
  badge?: string;
}

interface WorkbenchRailProps {
  showLabels: boolean;
  items: WorkbenchRailItemState[];
  onSelectModule: (module: WorkbenchRailModule) => void;
}

export function WorkbenchRail({
  showLabels,
  items,
  onSelectModule,
}: WorkbenchRailProps) {
  return (
    <>
      {items.map((item) => (
        <RailItem
          key={item.module}
          icon={getModuleIcon(item.module)}
          label={item.label}
          badge={item.badge}
          showLabel={showLabels}
          active={item.active}
          onClick={() => onSelectModule(item.module)}
        />
      ))}
    </>
  );
}

function getModuleIcon(module: WorkbenchRailModule): ReactNode {
  switch (module) {
    case "stats":
      return <BarChart3 size={17} />;
    case "ai":
      return <Bot size={17} />;
    case "media":
      return <Images size={17} />;
    case "sns":
      return <MessageCircle size={17} />;
    case "graph":
      return <Network size={17} />;
    case "chat":
      return <MessageSquare size={17} />;
  }
}

interface RailItemProps {
  icon: ReactNode;
  label: string;
  badge?: string;
  showLabel: boolean;
  active?: boolean;
  onClick?: () => void;
}

function RailItem({ icon, label, badge, showLabel, active = false, onClick }: RailItemProps) {
  const accessibleLabel = getWorkbenchRailButtonLabel(label);
  return (
    <Tooltip label={accessibleLabel} placement="right">
      <button
        type="button"
        className={classNames("workbench-rail-item", active && "workbench-rail-item--active")}
        aria-label={accessibleLabel}
        aria-current={active ? "page" : undefined}
        onClick={onClick}
      >
        {icon}
        {showLabel && <span>{label}</span>}
        {badge && <span className="workbench-rail-item__badge">{badge}</span>}
      </button>
    </Tooltip>
  );
}

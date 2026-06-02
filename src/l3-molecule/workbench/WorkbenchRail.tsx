import type { ReactNode } from "react";
import { BarChart3, Bot, MessageSquare, Network, Settings } from "lucide-react";

export type WorkbenchRailModule = "chat" | "stats" | "ai" | "graph" | "settings";

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
    case "graph":
      return <Network size={17} />;
    case "settings":
      return <Settings size={17} />;
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
  return (
    <button
      type="button"
      className={[
        "workbench-rail-item",
        active ? "workbench-rail-item--active" : "",
      ].filter(Boolean).join(" ")}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      {icon}
      {showLabel && <span>{label}</span>}
      {badge && <span className="workbench-rail-item__badge">{badge}</span>}
    </button>
  );
}

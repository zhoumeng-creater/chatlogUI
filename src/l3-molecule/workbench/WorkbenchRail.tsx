import type { ReactNode } from "react";
import { BarChart3, Bot, MessageSquare, Network, Settings } from "lucide-react";
import type { WorkbenchModule } from "@l2/commander";
import { buildWorkbenchRailItems } from "@l2/commander/workbenchViewModel";

interface WorkbenchRailProps {
  showLabels: boolean;
  activeModule: WorkbenchModule;
  onSelectModule: (module: WorkbenchModule) => void;
}

export function WorkbenchRail({
  showLabels,
  activeModule,
  onSelectModule,
}: WorkbenchRailProps) {
  const items = buildWorkbenchRailItems(activeModule);

  return (
    <>
      {items.map((item) => (
        <RailItem
          key={item.module}
          icon={getModuleIcon(item.module)}
          label={item.label}
          showLabel={showLabels}
          active={item.active}
          onClick={() => onSelectModule(item.module)}
        />
      ))}
    </>
  );
}

function getModuleIcon(module: WorkbenchModule): ReactNode {
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
  showLabel: boolean;
  active?: boolean;
  onClick?: () => void;
}

function RailItem({ icon, label, showLabel, active = false, onClick }: RailItemProps) {
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
    </button>
  );
}

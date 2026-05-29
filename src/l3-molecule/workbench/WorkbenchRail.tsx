import type { ReactNode } from "react";
import { BarChart3, Bot, MessageSquare, Network } from "lucide-react";

interface WorkbenchRailProps {
  showLabels: boolean;
  activePanel: "stats" | "ai";
  onSelectPanel: (panel: "stats" | "ai") => void;
  onOpenGraph: () => void;
}

export function WorkbenchRail({
  showLabels,
  activePanel,
  onSelectPanel,
  onOpenGraph,
}: WorkbenchRailProps) {
  return (
    <>
      <RailItem icon={<MessageSquare size={17} />} label="会话" showLabel={showLabels} active />
      <RailItem
        icon={<BarChart3 size={17} />}
        label="统计"
        showLabel={showLabels}
        active={activePanel === "stats"}
        onClick={() => onSelectPanel("stats")}
      />
      <RailItem
        icon={<Bot size={17} />}
        label="AI"
        showLabel={showLabels}
        active={activePanel === "ai"}
        onClick={() => onSelectPanel("ai")}
      />
      <RailItem
        icon={<Network size={17} />}
        label="图谱"
        showLabel={showLabels}
        onClick={onOpenGraph}
      />
    </>
  );
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
      onClick={onClick}
    >
      {icon}
      {showLabel && <span>{label}</span>}
    </button>
  );
}

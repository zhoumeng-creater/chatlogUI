import type { ReactNode } from "react";
import { BarChart3, Bot, Images, MessageCircle, MessageSquare, Network, Search } from "lucide-react";
import type { PrimaryWorkspaceNavItem } from "@l2/commander/primaryWorkspaceNavigation";
import { Tooltip } from "@l4/ui";
import { classNames } from "@/utils/classNames";

interface PrimaryWorkspaceRailProps {
  showLabels: boolean;
  items: PrimaryWorkspaceNavItem[];
  onNavigate: (href: string) => void;
}

export function PrimaryWorkspaceRail({
  showLabels,
  items,
  onNavigate,
}: PrimaryWorkspaceRailProps) {
  return (
    <nav className="primary-workspace-rail" aria-label="就绪工作区导航">
      {items.map((item) => (
        <Tooltip key={item.destination} label={item.ariaLabel} placement="right">
          <button
            type="button"
            className={classNames("primary-workspace-rail__item", item.active && "primary-workspace-rail__item--active")}
            aria-label={item.ariaLabel}
            aria-current={item.active ? "page" : undefined}
            onClick={() => onNavigate(item.href)}
          >
            {getDestinationIcon(item.destination)}
            {showLabels && <span>{item.label}</span>}
          </button>
        </Tooltip>
      ))}
    </nav>
  );
}

function getDestinationIcon(destination: PrimaryWorkspaceNavItem["destination"]): ReactNode {
  switch (destination) {
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

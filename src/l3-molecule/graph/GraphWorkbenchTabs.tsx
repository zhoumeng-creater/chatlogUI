import { Button } from "@l4/ui";
import type { GraphWorkbenchTab, GraphWorkbenchTabId } from "@l2/commander/graphViewModel";

interface GraphWorkbenchTabsProps {
  tabs: GraphWorkbenchTab[];
  onChange: (tab: GraphWorkbenchTabId) => void;
}

export function GraphWorkbenchTabs({ tabs, onChange }: GraphWorkbenchTabsProps) {
  return (
    <div className="graph-workbench-tabs" role="tablist" aria-label="图谱工作台视图">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={tab.active ? "primary" : "ghost"}
          size="sm"
          role="tab"
          aria-selected={tab.active}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}

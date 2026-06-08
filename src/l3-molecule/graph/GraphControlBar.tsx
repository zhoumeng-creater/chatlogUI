import { RefreshCw, RotateCw } from "lucide-react";
import { Button } from "@l4/ui/Button";
import { IconButton } from "@l4/ui/IconButton";
import type { EntityKind, GraphLayoutMode } from "./graphTypes";

const KIND_GROUPS: { label: string; kinds: EntityKind[] }[] = [
  { label: "人物", kinds: ["person"] },
  { label: "组织", kinds: ["organization", "group"] },
  { label: "主题", kinds: ["topic", "keyword", "event"] },
  { label: "项目", kinds: ["project", "product"] },
  { label: "其他", kinds: ["customer", "unknown"] },
];

const TIME_OPTIONS: { label: string; value: string }[] = [
  { label: "全部", value: "" },
  { label: "近7天", value: "7d" },
  { label: "近30天", value: "30d" },
  { label: "近90天", value: "90d" },
];

const ALL_KINDS: EntityKind[] = [
  "person",
  "organization",
  "project",
  "product",
  "customer",
  "group",
  "topic",
  "keyword",
  "event",
  "unknown",
];

interface GraphControlBarProps {
  visibleEntityKinds: EntityKind[];
  timeWindow: string;
  layoutMode: GraphLayoutMode;
  autoRotate: boolean;
  timelineVisible: boolean;
  onVisibleKindsChange: (kinds: EntityKind[]) => void;
  onTimeWindowChange: (window: string) => void;
  onRefresh: () => void;
  onLayoutModeChange: (mode: GraphLayoutMode) => void;
  onToggleAutoRotate: () => void;
  onTimelineVisibleChange: (visible: boolean) => void;
}

export function GraphControlBar({
  visibleEntityKinds,
  timeWindow,
  layoutMode,
  autoRotate,
  timelineVisible,
  onVisibleKindsChange,
  onTimeWindowChange,
  onRefresh,
  onLayoutModeChange,
  onToggleAutoRotate,
  onTimelineVisibleChange,
}: GraphControlBarProps) {
  const selectedKinds = new Set(visibleEntityKinds);

  const toggleGroup = (kinds: EntityKind[]) => {
    const allActive = kinds.every((kind) => selectedKinds.has(kind));
    const next = allActive
      ? visibleEntityKinds.filter((kind) => !kinds.includes(kind))
      : Array.from(new Set([...visibleEntityKinds, ...kinds]));
    onVisibleKindsChange(next);
  };

  const toggleAllKinds = () => {
    if (ALL_KINDS.every((kind) => selectedKinds.has(kind))) {
      onVisibleKindsChange([]);
    } else {
      onVisibleKindsChange(ALL_KINDS);
    }
  };

  return (
    <div className="graph-control-bar">
      <div className="graph-control-bar__group">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAllKinds}
          className="graph-control-bar__button"
          aria-pressed={ALL_KINDS.every((kind) => selectedKinds.has(kind))}
        >
          {ALL_KINDS.every((kind) => selectedKinds.has(kind)) ? "全部" : "无"}
        </Button>
        {KIND_GROUPS.map((group) => {
          const allActive = group.kinds.every((k) => selectedKinds.has(k));
          const partialActive = group.kinds.some((k) => selectedKinds.has(k)) && !allActive;
          return (
            <Button
              key={group.label}
              variant={allActive ? "primary" : partialActive ? "secondary" : "ghost"}
              size="sm"
              onClick={() => toggleGroup(group.kinds)}
              className="graph-control-bar__button"
              aria-pressed={allActive || partialActive}
            >
              {group.label}
            </Button>
          );
        })}
      </div>

      <div className="graph-control-bar__divider" />

      <div className="graph-control-bar__group">
        {TIME_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={timeWindow === opt.value ? "primary" : "ghost"}
            size="sm"
            onClick={() => onTimeWindowChange(opt.value)}
            className="graph-control-bar__button"
            aria-pressed={timeWindow === opt.value}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <div className="graph-control-bar__divider" />

      <div className="graph-control-bar__group">
        <Button
          variant={layoutMode === "force" ? "primary" : "ghost"}
          size="sm"
          onClick={() => onLayoutModeChange("force")}
          className="graph-control-bar__button"
          aria-pressed={layoutMode === "force"}
        >
          力导向
        </Button>
        <Button
          variant={layoutMode === "radial" ? "primary" : "ghost"}
          size="sm"
          onClick={() => onLayoutModeChange("radial")}
          className="graph-control-bar__button"
          aria-pressed={layoutMode === "radial"}
        >
          径向
        </Button>
      </div>

      <div className="graph-control-bar__divider" />

      <IconButton
        icon={<RefreshCw size={14} />}
        label="刷新图谱"
        tooltip="刷新图谱"
        tooltipPlacement="bottom"
        size="sm"
        onClick={onRefresh}
        className="graph-control-bar__icon-button"
      />

      <IconButton
        icon={<RotateCw size={14} />}
        label="自动旋转"
        tooltip="自动旋转"
        tooltipPlacement="bottom"
        size="sm"
        active={autoRotate}
        onClick={onToggleAutoRotate}
        className="graph-control-bar__icon-button"
        aria-pressed={autoRotate}
      />

      <div className="graph-control-bar__divider" />

      <Button
        variant={timelineVisible ? "primary" : "ghost"}
        size="sm"
        onClick={() => onTimelineVisibleChange(!timelineVisible)}
        className="graph-control-bar__button"
        aria-pressed={timelineVisible}
      >
        时间轴
      </Button>
    </div>
  );
}

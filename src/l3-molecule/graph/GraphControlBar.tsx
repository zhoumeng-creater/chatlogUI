import { Maximize2, RefreshCw, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@l4/ui/Button";
import { IconButton } from "@l4/ui/IconButton";
import type { GraphLayoutMode } from "./graphTypes";

interface GraphControlBarProps {
  layoutMode: GraphLayoutMode;
  autoRotate: boolean;
  timelineVisible: boolean;
  onRefresh: () => void;
  onLayoutModeChange: (mode: GraphLayoutMode) => void;
  onToggleAutoRotate: () => void;
  onTimelineVisibleChange: (visible: boolean) => void;
  onFitView: () => void;
  onResetView: () => void;
}

export function GraphControlBar({
  layoutMode,
  autoRotate,
  timelineVisible,
  onRefresh,
  onLayoutModeChange,
  onToggleAutoRotate,
  onTimelineVisibleChange,
  onFitView,
  onResetView,
}: GraphControlBarProps) {
  return (
    <div className="graph-control-bar" aria-label="图谱画布控制">
      <div className="graph-control-bar__group" role="group" aria-label="画布布局">
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

      <IconButton
        icon={<Maximize2 size={14} />}
        label="适配视图"
        tooltip="适配视图"
        tooltipPlacement="bottom"
        size="sm"
        onClick={onFitView}
        className="graph-control-bar__icon-button"
      />

      <IconButton
        icon={<RotateCcw size={14} />}
        label="重置视图"
        tooltip="重置视图"
        tooltipPlacement="bottom"
        size="sm"
        onClick={onResetView}
        className="graph-control-bar__icon-button"
      />

      <div className="graph-control-bar__divider" />

      <Button
        variant={timelineVisible ? "primary" : "ghost"}
        size="sm"
        onClick={() => onTimelineVisibleChange(!timelineVisible)}
        className="graph-control-bar__button"
        aria-pressed={timelineVisible}
      >
        时间线
      </Button>
    </div>
  );
}

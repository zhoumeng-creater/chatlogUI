import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { GraphEngine } from "./GraphEngine";
import { GraphTooltip } from "./GraphTooltip";
import { GraphControlBar } from "./GraphControlBar";
import { GraphTimeline } from "./GraphTimeline";
import { Typography } from "@l4/ui/Typography";
import { Button } from "@l4/ui/Button";
import { Spinner } from "@l4/ui/Spinner";
import type {
  EntityKind,
  GraphDataView,
  GraphLayoutMode,
} from "./graphTypes";

export interface GraphCanvasProps {
  visible: boolean;
  loading: boolean;
  error: string | null;
  data: GraphDataView | null;
  autoRotate: boolean;
  visibleEntityKinds: EntityKind[];
  timeWindow: string;
  layoutMode: GraphLayoutMode;
  timelineVisible: boolean;
  highlightedTimelineId: string | null;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  pulsedNodeId: string | null;
  tooltipCoord: { x: number; y: number } | null;
  privacyOn: boolean;
  onRefresh: () => void;
  onNodeHover: (nodeId: string | null, coord?: { x: number; y: number }) => void;
  onNodeDblClick: (nodeId: string) => void;
  onEdgeClick: (edgeId: string) => void;
  onVisibleKindsChange: (kinds: EntityKind[]) => void;
  onTimeWindowChange: (window: string) => void;
  onLayoutModeChange: (mode: GraphLayoutMode) => void;
  onToggleAutoRotate: () => void;
  onTimelineVisibleChange: (visible: boolean) => void;
  onHighlightTimelineEntry: (id: string) => void;
}

export function GraphCanvas({
  visible,
  loading,
  error,
  data,
  autoRotate,
  visibleEntityKinds,
  layoutMode,
  timelineVisible,
  highlightedTimelineId,
  hoveredNodeId,
  selectedNodeId,
  pulsedNodeId,
  tooltipCoord,
  privacyOn,
  onRefresh,
  onNodeHover,
  onNodeDblClick,
  onEdgeClick,
  onLayoutModeChange,
  onToggleAutoRotate,
  onTimelineVisibleChange,
  onHighlightTimelineEntry,
}: GraphCanvasProps) {
  const [viewResetToken, setViewResetToken] = useState(0);
  const shouldRenderCanvas = !loading && !error && data && data.nodes.length > 0;
  const enableCanvasReadback =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("codex-smoke");

  if (!visible) {
    return (
      <div className="graph-module__empty">
        <Typography variant="body" color="var(--text-secondary)">
          图谱模块会在打开时按需加载，不遮挡聊天主流程。
        </Typography>
      </div>
    );
  }

  return (
    <div className="graph-canvas" aria-label="知识图谱可视化">
      <GraphControlBar
        layoutMode={layoutMode}
        autoRotate={autoRotate}
        timelineVisible={timelineVisible}
        onRefresh={onRefresh}
        onLayoutModeChange={onLayoutModeChange}
        onToggleAutoRotate={onToggleAutoRotate}
        onTimelineVisibleChange={onTimelineVisibleChange}
        onFitView={() => setViewResetToken((token) => token + 1)}
        onResetView={() => setViewResetToken((token) => token + 1)}
      />

      <div className="graph-canvas__stage">
        {loading && (
          <div className="graph-canvas__overlay">
            <Spinner size={24} label="加载图谱数据..." />
          </div>
        )}

        {error && (
          <div className="graph-canvas__overlay" role="alert">
            <Typography variant="body" color="var(--danger)">
              {error}
            </Typography>
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              重试
            </Button>
          </div>
        )}

        {!loading && !error && data && data.nodes.length === 0 && (
          <div className="graph-canvas__overlay">
            <Typography variant="body" color="var(--text-secondary)">
              当前条件下没有图谱节点。
            </Typography>
          </div>
        )}

        {shouldRenderCanvas && (
          <Canvas
            camera={{ position: [0, 0, 8], fov: 50 }}
            gl={enableCanvasReadback ? { preserveDrawingBuffer: true } : undefined}
          >
            <GraphEngine
              data={data}
              autoRotate={autoRotate}
              visibleEntityKinds={visibleEntityKinds}
              layoutMode={layoutMode}
              hoveredNodeId={hoveredNodeId}
              selectedNodeId={selectedNodeId}
              pulsedNodeId={pulsedNodeId}
              viewResetToken={viewResetToken}
              privacyOn={privacyOn}
              onNodeHover={onNodeHover}
              onNodeDblClick={onNodeDblClick}
              onEdgeClick={onEdgeClick}
            />
          </Canvas>
        )}
      </div>

      <GraphTimeline
        data={data}
        timelineVisible={timelineVisible}
        highlightedTimelineId={highlightedTimelineId}
        privacyOn={privacyOn}
        onTimelineVisibleChange={onTimelineVisibleChange}
        onHighlightTimelineEntry={onHighlightTimelineEntry}
      />
      <GraphTooltip
        data={data}
        hoveredNodeId={hoveredNodeId}
        tooltipCoord={tooltipCoord}
        privacyOn={privacyOn}
      />
    </div>
  );
}

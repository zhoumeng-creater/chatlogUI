import { Canvas } from "@react-three/fiber";
import { GraphEngine } from "./GraphEngine";
import { GraphTooltip } from "./GraphTooltip";
import { GraphControlBar } from "./GraphControlBar";
import { GraphTimeline } from "./GraphTimeline";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { useGraphStore } from "@l2/data-clerk/stores/useGraphStore";
import { Typography } from "@l4/ui/Typography";
import { Button } from "@l4/ui/Button";
import { Spinner } from "@l4/ui/Spinner";

export function GraphCanvas() {
  const graph = useGraphCommander();
  const visible = useGraphStore((state) => state.visible);
  const loading = useGraphStore((state) => state.loading);
  const error = useGraphStore((state) => state.error);
  const data = useGraphStore((state) => state.data);

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
      <GraphControlBar />

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
            <Button variant="secondary" size="sm" onClick={graph.refreshGraph}>
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

        <Canvas camera={{ position: [0, 0, 8], fov: 50 }} style={{ background: "#0a0a1a" }}>
          <GraphEngine
            onNodeHover={graph.hoverNode}
            onNodeDblClick={graph.selectNode}
          />
        </Canvas>
      </div>

      <GraphTimeline />
      <GraphTooltip />
    </div>
  );
}

import { useEffect } from "react";
import { Button, Typography } from "@l4/ui";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { GraphCanvas } from "./GraphCanvas";

export function GraphModule() {
  const graph = useGraphCommander();
  const { openGraph } = graph;

  useEffect(() => {
    void openGraph();
  }, [openGraph]);

  return (
    <section className="graph-module" aria-label="知识图谱模块">
      <div className="graph-module__header">
        <div>
          <Typography variant="label" weight={700}>
            知识图谱
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {graph.data
              ? `${graph.data.nodes.length} 节点 · ${graph.data.edges.length} 连线`
              : "按需加载图谱可视化数据"}
          </Typography>
        </div>
        <Button variant="secondary" size="sm" onClick={graph.refreshGraph}>
          刷新
        </Button>
      </div>
      <GraphCanvas />
    </section>
  );
}

import { useMemo } from "react";
import * as THREE from "three";
import type { GraphEdgeView } from "./graphTypes";

const EDGE_COLORS: Record<string, string> = {
  active: "#4A9EFF",
  ended: "#888888",
  conflict: "#FF6B6B",
};

interface GraphEdge3DProps {
  edge: GraphEdgeView;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  onClick: (edgeId: string) => void;
}

export function GraphEdge3D({ edge, fromPos, toPos, onClick }: GraphEdge3DProps) {
  const color = EDGE_COLORS[edge.status] ?? EDGE_COLORS.active;
  const isDashed = edge.status === "ended" || edge.status === "conflict";

  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([fromPos, toPos]);
    const material = isDashed
      ? new THREE.LineDashedMaterial({
          color,
          dashSize: 0.5,
          gapSize: 0.3,
          transparent: true,
          opacity: 0.6,
        })
      : new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.7 + edge.confidence * 0.3,
        });
    const lineObj = new THREE.Line(geometry, material);
    if (isDashed) {
      lineObj.computeLineDistances();
    }
    return lineObj;
  }, [fromPos, toPos, color, isDashed, edge.confidence]);

  return (
    <primitive
      object={line}
      onClick={(event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        onClick(edge.id);
      }}
    />
  );
}

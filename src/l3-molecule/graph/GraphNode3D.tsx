import { useRef } from "react";
import type { Mesh } from "three";
import type { GraphNode } from "@/l2-coordinator/api-docs/graph";
import { GRAPH_NODE_MIN_RADIUS } from "@/utils/constants";

const ENTITY_COLORS: Record<string, string> = {
  person: "#FF6B6B",
  organization: "#74B9FF",
  project: "#FFEAA7",
  product: "#00CEC9",
  customer: "#FD79A8",
  group: "#6C5CE7",
  topic: "#A29BFE",
  keyword: "#A29BFE",
  event: "#55EFC4",
  unknown: "#999999",
};

function getNodeRadius(value: number): number {
  return GRAPH_NODE_MIN_RADIUS + Math.log2(Math.max(value, 1)) * 0.25;
}

function getNodeColor(kind: string): string {
  return ENTITY_COLORS[kind] ?? ENTITY_COLORS.unknown;
}

interface GraphNode3DProps {
  node: GraphNode;
  position?: [number, number, number];
}

export function GraphNode3D({ node, position = [0, 0, 0] }: GraphNode3DProps) {
  const meshRef = useRef<Mesh>(null);
  const radius = getNodeRadius(node.value);
  const color = getNodeColor(node.kind);

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={node.kind === "unknown" ? 0.2 : 0.4}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

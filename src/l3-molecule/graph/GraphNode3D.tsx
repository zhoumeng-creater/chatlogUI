import type { GraphNode } from "@/l2-coordinator/api-docs/graph";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
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
  onHover: (nodeId: string | null, coord?: { x: number; y: number }) => void;
  onDblClick: (nodeId: string) => void;
}

export function GraphNode3D({ node, position = [0, 0, 0], onHover, onDblClick }: GraphNode3DProps) {
  const radius = getNodeRadius(node.value);
  const color = getNodeColor(node.kind);
  const isHovered = useGraphStore((s) => s.hoveredNodeId === node.id);
  const isSelected = useGraphStore((s) => s.selectedNodeId === node.id);
  const isPulsed = useGraphStore((s) => s.pulsedNodeId === node.id);

  const handlePointerEnter = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const ev = e as unknown as { nativeEvent?: MouseEvent };
    if (ev.nativeEvent) {
      onHover(node.id, { x: ev.nativeEvent.clientX, y: ev.nativeEvent.clientY });
    } else {
      onHover(node.id);
    }
    document.body.style.cursor = "pointer";
  };

  const handlePointerLeave = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onHover(null);
    document.body.style.cursor = "default";
  };

  const handleDoubleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onDblClick(node.id);
  };

  return (
    <mesh
      position={position}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onDoubleClick={handleDoubleClick}
    >
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={isPulsed ? "#FFFFFF" : color}
        emissive={isPulsed ? "#FFFFFF" : color}
        emissiveIntensity={
          isPulsed ? 1.0 :
          isSelected ? 0.7 :
          isHovered ? 0.6 :
          node.kind === "unknown" ? 0.2 : 0.4
        }
        metalness={0.3}
        roughness={isHovered ? 0.2 : 0.4}
      />
    </mesh>
  );
}

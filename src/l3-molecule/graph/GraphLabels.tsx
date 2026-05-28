import * as THREE from "three";
import { Text } from "@react-three/drei";
import type { GraphNode } from "@/l2-coordinator/api-docs/graph";

interface GraphLabelsProps {
  nodes: GraphNode[];
  positions: Map<string, THREE.Vector3>;
}

export function GraphLabels({ nodes, positions }: GraphLabelsProps) {
  return (
    <group>
      {nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        return (
          <Text
            key={`label-${node.id}`}
            position={[pos.x, pos.y + 0.8, pos.z]}
            fontSize={0.3}
            color="#cccccc"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {node.name.length > 8 ? node.name.slice(0, 7) + "\u2026" : node.name}
          </Text>
        );
      })}
    </group>
  );
}

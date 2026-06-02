import * as THREE from "three";
import { Text } from "@react-three/drei";
import type { GraphNodeView } from "./graphTypes";
import { getGraphNodeLabel } from "./graphDisplay";

interface GraphLabelsProps {
  nodes: GraphNodeView[];
  positions: Map<string, THREE.Vector3>;
  privacyOn: boolean;
}

export function GraphLabels({ nodes, positions, privacyOn }: GraphLabelsProps) {
  return (
    <group>
      {nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        const label = getGraphNodeLabel(node.name, privacyOn);
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
            {label.length > 8 ? label.slice(0, 7) + "\u2026" : label}
          </Text>
        );
      })}
    </group>
  );
}

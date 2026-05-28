import { useRef, useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force-3d";
import { GraphNode3D } from "./GraphNode3D";
import { GraphEdge3D } from "./GraphEdge3D";
import { GraphLabels } from "./GraphLabels";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import type { GraphNode, GraphEdge } from "@/l2-coordinator/api-docs/graph";
import {
  GRAPH_CAMERA_MIN_DISTANCE,
  GRAPH_CAMERA_MAX_DISTANCE,
  GRAPH_AUTO_ROTATE_SPEED,
  GRAPH_FORCE_LINK_DISTANCE,
  GRAPH_FORCE_LINK_STRENGTH,
  GRAPH_FORCE_CHARGE_MULTIPLIER,
  GRAPH_FORCE_COLLIDE_PADDING,
  GRAPH_LAYOUT_TICKS,
} from "@/utils/constants";

interface SimNode extends THREE.Vector3 {
  id: string;
  value: number;
}

interface SimLink {
  source: string;
  target: string;
}

function runForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Map<string, THREE.Vector3> {
  const nodePositions = new Map<string, THREE.Vector3>();

  const simNodes: SimNode[] = nodes.map((n) => {
    const v = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
    ) as SimNode;
    v.id = n.id;
    v.value = n.value;
    return v;
  });

  const simLinks: SimLink[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
  }));

  const simNodeRadius = (n: SimNode) =>
    0.5 + Math.log2(Math.max(n.value, 1)) * 0.25;

  const simulation = forceSimulation(simNodes, 3)
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id((d: SimNode) => d.id)
        .distance(GRAPH_FORCE_LINK_DISTANCE)
        .strength(GRAPH_FORCE_LINK_STRENGTH),
    )
    .force(
      "charge",
      forceManyBody<SimNode>().strength(
        -nodes.length * GRAPH_FORCE_CHARGE_MULTIPLIER,
      ),
    )
    .force("center", forceCenter(0, 0, 0))
    .force(
      "collide",
      forceCollide<SimNode>((d: SimNode) => simNodeRadius(d) + GRAPH_FORCE_COLLIDE_PADDING),
    )
    .stop();

  for (let i = 0; i < GRAPH_LAYOUT_TICKS; i++) {
    simulation.tick();
  }

  for (const node of simNodes) {
    nodePositions.set(node.id, node.clone());
  }

  return nodePositions;
}

interface GraphEngineProps {
  onNodeHover: (nodeId: string | null, coord?: { x: number; y: number }) => void;
  onNodeDblClick: (nodeId: string) => void;
}

export function GraphEngine({ onNodeHover, onNodeDblClick }: GraphEngineProps) {
  const data = useGraphStore((s) => s.data);
  const autoRotate = useGraphStore((s) => s.autoRotate);
  const pulsedNodeId = useGraphStore((s) => s.pulsedNodeId);
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  const nodePositions = useMemo(() => {
    if (!data) return new Map<string, THREE.Vector3>();
    return runForceLayout(data.nodes, data.edges);
  }, [data]);

  useEffect(() => {
    if (!pulsedNodeId || !nodePositions) return;
    const target = nodePositions.get(pulsedNodeId);
    if (!target) return;

    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(
      target.x,
      target.y,
      target.z + 5,
    );
    const startTime = Date.now();
    const duration = 1000;

    let raf: number;
    function animate() {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.lerpVectors(startPos, endPos, eased);
      if (t < 1) {
        raf = requestAnimationFrame(animate);
      }
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [pulsedNodeId, nodePositions, camera]);

  if (!data) return null;

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -3, -3]} intensity={0.4} />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={GRAPH_CAMERA_MIN_DISTANCE}
        maxDistance={GRAPH_CAMERA_MAX_DISTANCE}
        autoRotate={autoRotate}
        autoRotateSpeed={GRAPH_AUTO_ROTATE_SPEED}
      />

      <group>
        {data.edges.map((edge) => {
          const fromPos = nodePositions.get(edge.source);
          const toPos = nodePositions.get(edge.target);
          if (!fromPos || !toPos) return null;
          return (
            <GraphEdge3D
              key={edge.id}
              edge={edge}
              fromPos={fromPos}
              toPos={toPos}
            />
          );
        })}
      </group>

      <group>
        {data.nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;
          return (
            <GraphNode3D
              key={node.id}
              node={node}
              position={pos.toArray() as [number, number, number]}
              onHover={onNodeHover}
              onDblClick={onNodeDblClick}
            />
          );
        })}
      </group>

      <GraphLabels nodes={data.nodes} positions={nodePositions} />
    </>
  );
}

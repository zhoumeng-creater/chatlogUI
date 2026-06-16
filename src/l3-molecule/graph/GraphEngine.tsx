import { Suspense, useRef, useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force-3d";
import { GraphNode3D } from "./GraphNode3D";
import { GraphEdge3D } from "./GraphEdge3D";
import { GraphLabels } from "./GraphLabels";
import { createDeterministicSeedVector } from "./graphLayout";
import type {
  EntityKind,
  GraphDataView,
  GraphEdgeView,
  GraphLayoutMode,
  GraphNodeView,
} from "./graphTypes";
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
  nodes: GraphNodeView[],
  edges: GraphEdgeView[],
): Map<string, THREE.Vector3> {
  const nodePositions = new Map<string, THREE.Vector3>();

  const orderedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const simNodes: SimNode[] = orderedNodes.map((n, index) => {
    const v = createDeterministicSeedVector(n.id, index) as SimNode;
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

function runRadialLayout(
  nodes: GraphNodeView[],
): Map<string, THREE.Vector3> {
  const positions = new Map<string, THREE.Vector3>();
  const sorted = [...nodes].sort((a, b) => b.value - a.value);
  const total = sorted.length;
  const rings = Math.ceil(Math.sqrt(total));
  let idx = 0;

  for (let ring = 0; ring < rings && idx < total; ring++) {
    const radius = 1.5 + ring * 1.8;
    const countInRing = ring === 0
      ? 1
      : Math.ceil((total - 1) * (ring / rings));
    const actualCount = Math.min(countInRing, total - idx);

    for (let i = 0; i < actualCount && idx < total; i++) {
      const angle = (i / actualCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = ring * 0.5 - (rings * 0.25);
      positions.set(sorted[idx].id, new THREE.Vector3(x, y, z));
      idx++;
    }
  }

  return positions;
}

interface GraphEngineProps {
  data: GraphDataView | null;
  autoRotate: boolean;
  visibleEntityKinds: EntityKind[];
  layoutMode: GraphLayoutMode;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  pulsedNodeId: string | null;
  viewResetToken: number;
  privacyOn: boolean;
  onNodeHover: (nodeId: string | null, coord?: { x: number; y: number }) => void;
  onNodeDblClick: (nodeId: string) => void;
  onEdgeClick: (edgeId: string) => void;
}

export function GraphEngine({
  data,
  autoRotate,
  visibleEntityKinds,
  layoutMode,
  hoveredNodeId,
  selectedNodeId,
  pulsedNodeId,
  viewResetToken,
  privacyOn,
  onNodeHover,
  onNodeDblClick,
  onEdgeClick,
}: GraphEngineProps) {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
    controlsRef.current?.reset();
  }, [camera, viewResetToken]);

  const filteredNodes = useMemo(() => {
    if (!data) return [];
    const visibleKindSet = new Set<string>(visibleEntityKinds);
    return data.nodes.filter((n) => visibleKindSet.has(n.kind));
  }, [data, visibleEntityKinds]);

  const filteredEdges = useMemo(() => {
    if (!data) return [];
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    return data.edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );
  }, [data, filteredNodes]);

  const nodePositions = useMemo(() => {
    if (!data || filteredNodes.length === 0) return new Map<string, THREE.Vector3>();
    if (layoutMode === "radial") {
      return runRadialLayout(filteredNodes);
    }
    return runForceLayout(filteredNodes, filteredEdges);
  }, [data, filteredNodes, filteredEdges, layoutMode]);

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

    if (prefersReducedMotion) {
      camera.position.copy(endPos);
      return;
    }

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
  }, [pulsedNodeId, nodePositions, camera, prefersReducedMotion]);

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
        autoRotate={autoRotate && !prefersReducedMotion}
        autoRotateSpeed={GRAPH_AUTO_ROTATE_SPEED}
      />

      <group>
        {filteredEdges.map((edge) => {
          const fromPos = nodePositions.get(edge.source);
          const toPos = nodePositions.get(edge.target);
          if (!fromPos || !toPos) return null;
          return (
            <GraphEdge3D
              key={edge.id}
              edge={edge}
              fromPos={fromPos}
              toPos={toPos}
              onClick={onEdgeClick}
            />
          );
        })}
      </group>

      <group>
        {filteredNodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;
          return (
            <GraphNode3D
              key={node.id}
              node={node}
              position={pos.toArray() as [number, number, number]}
              isHovered={hoveredNodeId === node.id}
              isSelected={selectedNodeId === node.id}
              isPulsed={pulsedNodeId === node.id}
              onHover={onNodeHover}
              onDblClick={onNodeDblClick}
            />
          );
        })}
      </group>

      <Suspense fallback={null}>
        <GraphLabels nodes={filteredNodes} positions={nodePositions} privacyOn={privacyOn} />
      </Suspense>
    </>
  );
}

# Sprint 4: 3D 知识图谱系统 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a floating 3D knowledge graph window on DashboardView using React Three Fiber, visualizing entity nodes and relationship edges from the chatlog_alpha `/api/v1/graph/visualize` API.

**Architecture:** Floating overlay container (L3 GraphCanvas) hosts an R3F Canvas with force-directed 3D graph (GraphEngine, GraphNode3D, GraphEdge3D). Data flows through L4 network atoms → L2 GraphStore → L2 GraphCommander → L3 components.

**Tech Stack:** React Three Fiber + @react-three/drei + d3-force-3d + Three.js + Zustand

---

## 任务依赖图

```
T-0.1 (安装依赖)
    │
T-0.2 (API 类型: graph.ts)
T-0.3 (常量: constants.ts 追加)
    │
    ├──→ T-1.1 (fetchGraphVisualize)
    ├──→ T-1.2 (fetchGraphQuery)
    ├──→ T-1.3 (fetchGraphStatus)
    └──→ T-1.4 (network/index.ts 更新)
              │
              └──→ T-2.1 (useGraphStore)
                        │
                        └──→ T-3.1 (useGraphCommander)
                                  │
                                  ├──→ T-4.1 (GraphEngine)
                                  ├──→ T-4.2 (GraphNode3D)
                                  ├──→ T-4.3 (GraphEdge3D)
                                  └──→ T-4.4 (GraphLabels)
                                            │
                                            └──→ T-5.1 (GraphCanvas 浮动容器)
                                                      │
                                                      └──→ T-6.1 (DashboardView 集成)
```

**并行建议:** T-1.x（网络原子）和 T-4.x（分子层）可在 T-0.x 完成后并行开发。

---

### 任务 T-0.1: 安装 Three.js 依赖

- [ ] **Step 1: 安装包**

```bash
pnpm add @react-three/fiber @react-three/drei three d3-force-3d
pnpm add -D @types/three
```

- [ ] **Step 2: 验证安装**

Run: `pnpm typecheck`
Expected: 0 errors（新包不影响现有类型检查）

---

### 任务 T-0.2: 图谱 API 类型定义

**Files:**
- Create: `src/l2-coordinator/api-docs/graph.ts`

- [ ] **Step 1: 创建 API 类型文件**

```typescript
export type EntityKind =
  | "person"
  | "organization"
  | "project"
  | "product"
  | "customer"
  | "group"
  | "topic"
  | "keyword"
  | "event"
  | "unknown";

export type EdgeStatus = "active" | "ended" | "conflict";

export interface GraphNode {
  id: string;
  name: string;
  kind: EntityKind;
  value: number;
  last_seen: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  status: EdgeStatus;
  confidence: number;
  last_seen: number;
  evidence_count: number;
}

export interface GraphTimeline {
  time: number;
  type: "event" | "fact" | "relation";
  title: string;
  description: string;
  source?: string;
}

export interface VisualizeResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  timeline: GraphTimeline[];
  generated_at: number;
}

export interface VisualizeParams {
  keyword?: string;
  window?: string;
  limit?: number;
  start?: string;
  end?: string;
}

export interface QueryResult {
  entities: GraphEntity[];
  relations: GraphRelation[];
  events: GraphEvent[];
  facts: GraphFact[];
}

export interface GraphEntity {
  id: number;
  canonical_id: number;
  canonical_name: string;
  canonical_key: string;
  name: string;
  type: string;
  aliases?: string[];
  first_seen: number;
  last_seen: number;
  mentions: number;
}

export interface GraphRelation {
  id: number;
  subject_entity_id: number;
  object_entity_id: number;
  subject: string;
  object: string;
  predicate: string;
  canonical_key: string;
  status: string;
  confidence: number;
  support_score: number;
  verified: string;
  conflict_group?: string;
  valid_from: number;
  valid_to?: number;
  last_seen: number;
  evidence_count: number;
}

export interface GraphEvent {
  id: number;
  event_type: string;
  title: string;
  summary: string;
  actors?: string[];
  targets?: string[];
  event_time: number;
  confidence: number;
  source_record_id: number;
  evidence?: string;
  source_label?: string;
}

export interface GraphFact {
  id: number;
  fact_key: string;
  statement: string;
  canonical_statement: string;
  change_type: string;
  status: string;
  confidence: number;
  support_score: number;
  verified: string;
  conflict_group?: string;
  valid_from: number;
  valid_to?: number;
  source_record_id: number;
  evidence?: string;
}

export interface GraphStatus {
  enabled: boolean;
  paused: boolean;
  running: boolean;
  history_queued: boolean;
  enqueue_running: boolean;
  workers: number;
  enqueue_workers: number;
  store_path: string;
  entity_count: number;
  relation_count: number;
  event_count: number;
  fact_count: number;
  source_count: number;
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  progress_pct: number;
  started_at?: string;
  processing_rate_per_minute?: number;
  estimated_seconds_left?: number;
  last_updated_at?: string;
  last_error?: string;
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-0.3: 图谱常量

**Files:**
- Modify: `src/utils/constants.ts`

- [ ] **Step 1: 追加常量**

在文件末尾追加：

```typescript
// ========== Sprint 4: 3D 知识图谱常量 ==========

export const GRAPH_BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;
export const GRAPH_DEFAULT_LIMIT = 80;
export const GRAPH_MAX_LIMIT = 300;
export const GRAPH_FETCH_TIMEOUT_MS = 15000;

export const GRAPH_FORCE_LINK_DISTANCE = 2.5;
export const GRAPH_FORCE_LINK_STRENGTH = 0.3;
export const GRAPH_FORCE_CHARGE_MULTIPLIER = 2;
export const GRAPH_FORCE_COLLIDE_PADDING = 0.5;
export const GRAPH_LAYOUT_TICKS = 300;

export const GRAPH_AUTO_ROTATE_SPEED = 0.3;
export const GRAPH_CAMERA_MIN_DISTANCE = 3;
export const GRAPH_CAMERA_MAX_DISTANCE = 20;

export const GRAPH_NODE_MIN_RADIUS = 0.5;
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-1.1: fetchGraphVisualize 网络原子

**Files:**
- Create: `src/l4-atom/network/fetchGraphVisualize.ts`

- [ ] **Step 1: 创建文件**

```typescript
import {
  GRAPH_BASE_URL,
  GRAPH_DEFAULT_LIMIT,
  GRAPH_FETCH_TIMEOUT_MS,
} from "@/utils/constants";
import type { VisualizeResult, VisualizeParams } from "@/l2-coordinator/api-docs/graph";

export async function fetchGraphVisualize(
  params: VisualizeParams = {},
): Promise<VisualizeResult> {
  const { keyword, window, limit = GRAPH_DEFAULT_LIMIT, start, end } = params;
  const url = new URL(`${GRAPH_BASE_URL}/api/v1/graph/visualize`);
  url.searchParams.set("limit", String(Math.min(limit, GRAPH_MAX_LIMIT)));
  if (keyword) url.searchParams.set("keyword", keyword);
  if (window) url.searchParams.set("window", window);
  if (start) url.searchParams.set("start", start);
  if (end) url.searchParams.set("end", end);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GRAPH_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`图谱可视化请求失败: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("图谱数据请求超时");
    }
    throw error;
  }
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-1.2: fetchGraphQuery 网络原子

**Files:**
- Create: `src/l4-atom/network/fetchGraphQuery.ts`

- [ ] **Step 1: 创建文件**

```typescript
import {
  GRAPH_BASE_URL,
  GRAPH_DEFAULT_LIMIT,
  GRAPH_FETCH_TIMEOUT_MS,
} from "@/utils/constants";
import type { QueryResult } from "@/l2-coordinator/api-docs/graph";

export async function fetchGraphQuery(
  keyword: string,
  limit: number = GRAPH_DEFAULT_LIMIT,
): Promise<QueryResult> {
  const url = new URL(`${GRAPH_BASE_URL}/api/v1/graph/query`);
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("limit", String(Math.min(limit, GRAPH_MAX_LIMIT)));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GRAPH_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`图谱查询失败: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("图谱查询超时");
    }
    throw error;
  }
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-1.3: fetchGraphStatus 网络原子

**Files:**
- Create: `src/l4-atom/network/fetchGraphStatus.ts`

- [ ] **Step 1: 创建文件**

```typescript
import { GRAPH_BASE_URL, GRAPH_FETCH_TIMEOUT_MS } from "@/utils/constants";
import type { GraphStatus } from "@/l2-coordinator/api-docs/graph";

export async function fetchGraphStatus(): Promise<GraphStatus | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GRAPH_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${GRAPH_BASE_URL}/api/v1/graph/status`,
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(`图谱状态查询失败: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("图谱状态查询超时");
    }
    throw error;
  }
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-1.4: 更新网络原子导出口

**Files:**
- Modify: `src/l4-atom/network/index.ts`

- [ ] **Step 1: 追加导出**

在文件末尾追加：

```typescript
export { fetchGraphVisualize } from "./fetchGraphVisualize";
export { fetchGraphQuery } from "./fetchGraphQuery";
export { fetchGraphStatus } from "./fetchGraphStatus";
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-2.1: useGraphStore 状态管理

**Files:**
- Create: `src/l2-coordinator/data-clerk/stores/useGraphStore.ts`

- [ ] **Step 1: 创建 Store**

```typescript
import { create } from "zustand";
import type { VisualizeResult } from "@/l2-coordinator/api-docs/graph";

interface GraphState {
  data: VisualizeResult | null;
  loading: boolean;
  error: string | null;
  keyword: string;
  timeWindow: string;
  autoRotate: boolean;
  visible: boolean;
  minimized: boolean;
}

interface GraphActions {
  setData: (data: VisualizeResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setKeyword: (keyword: string) => void;
  setTimeWindow: (window: string) => void;
  toggleAutoRotate: () => void;
  setVisible: (visible: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  reset: () => void;
}

type GraphStore = GraphState & GraphActions;

const initialState: GraphState = {
  data: null,
  loading: false,
  error: null,
  keyword: "",
  timeWindow: "",
  autoRotate: true,
  visible: false,
  minimized: false,
};

export const useGraphStore = create<GraphStore>((set) => ({
  ...initialState,

  setData: (data: VisualizeResult) => set({ data, loading: false, error: null }),

  setLoading: (loading: boolean) => set({ loading }),

  setError: (error: string | null) =>
    set({ error, loading: false }),

  setKeyword: (keyword: string) => set({ keyword }),

  setTimeWindow: (timeWindow: string) => set({ timeWindow }),

  toggleAutoRotate: () =>
    set((state) => ({ autoRotate: !state.autoRotate })),

  setVisible: (visible: boolean) => set({ visible }),

  setMinimized: (minimized: boolean) => set({ minimized }),

  reset: () => set(initialState),
}));
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-3.1: useGraphCommander 指挥官

**Files:**
- Create: `src/l2-coordinator/commander/useGraphCommander.ts`

- [ ] **Step 1: 创建 Commander**

```typescript
import { useCallback } from "react";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import {
  fetchGraphVisualize,
  fetchGraphQuery,
  fetchGraphStatus,
} from "@l4/network";
import type { VisualizeParams } from "@/l2-coordinator/api-docs/graph";

export function useGraphCommander() {
  const store = useGraphStore();

  const loadGraph = useCallback(async (params: VisualizeParams = {}) => {
    useGraphStore.setState({ loading: true, error: null });
    try {
      const data = await fetchGraphVisualize(params);
      useGraphStore.getState().setData(data);
    } catch (error) {
      useGraphStore.getState().setError(
        error instanceof Error ? error.message : "加载图谱数据失败",
      );
    }
  }, []);

  const searchGraph = useCallback(async (keyword: string) => {
    useGraphStore.setState({ loading: true, keyword });
    try {
      const data = await fetchGraphVisualize({ keyword });
      useGraphStore.getState().setData(data);
    } catch (error) {
      useGraphStore.getState().setError(
        error instanceof Error ? error.message : "图谱搜索失败",
      );
    }
  }, []);

  const refreshGraph = useCallback(async () => {
    const { keyword, timeWindow } = useGraphStore.getState();
    await loadGraph({ keyword: keyword || undefined, window: timeWindow || undefined });
  }, [loadGraph]);

  const openGraph = useCallback(async () => {
    useGraphStore.setState({ visible: true, minimized: false });
    const { data } = useGraphStore.getState();
    if (!data) {
      await loadGraph();
    }
  }, [loadGraph]);

  const closeGraph = useCallback(() => {
    useGraphStore.getState().setVisible(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    useGraphStore.setState((state) => ({ minimized: !state.minimized }));
  }, []);

  return {
    data: store.data,
    loading: store.loading,
    error: store.error,
    keyword: store.keyword,
    timeWindow: store.timeWindow,
    autoRotate: store.autoRotate,
    visible: store.visible,
    minimized: store.minimized,
    loadGraph,
    searchGraph,
    refreshGraph,
    openGraph,
    closeGraph,
    toggleMinimize,
    setKeyword: store.setKeyword,
    setTimeWindow: store.setTimeWindow,
    toggleAutoRotate: store.toggleAutoRotate,
    reset: store.reset,
  };
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-4.1: GraphEngine — R3F 场景 + 力导向布局

**Files:**
- Create: `src/l3-molecule/graph/GraphEngine.tsx`

- [ ] **Step 1: 创建场景管理组件（含 d3-force-3d 布局）**

```typescript
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
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
      forceLink(simLinks)
        .id((d: any) => d.id)
        .distance(GRAPH_FORCE_LINK_DISTANCE)
        .strength(GRAPH_FORCE_LINK_STRENGTH),
    )
    .force(
      "charge",
      forceManyBody().strength(
        -nodes.length * GRAPH_FORCE_CHARGE_MULTIPLIER,
      ),
    )
    .force("center", forceCenter(0, 0, 0))
    .force(
      "collide",
      forceCollide((d: any) => simNodeRadius(d) + GRAPH_FORCE_COLLIDE_PADDING),
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

export function GraphEngine() {
  const data = useGraphStore((s) => s.data);
  const autoRotate = useGraphStore((s) => s.autoRotate);
  const controlsRef = useRef<any>(null);

  const nodePositions = useMemo(() => {
    if (!data) return new Map<string, THREE.Vector3>();
    return runForceLayout(data.nodes, data.edges);
  }, [data]);

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
            <GraphNode3D key={node.id} node={node} position={pos.toArray() as [number, number, number]} />
          );
        })}
      </group>

      <GraphLabels nodes={data.nodes} positions={nodePositions} />
    </>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-4.2: GraphNode3D — 3D 节点

**Files:**
- Create: `src/l3-molecule/graph/GraphNode3D.tsx`

- [ ] **Step 1: 创建节点组件**

```typescript
import { useRef, useMemo } from "react";
import type { Mesh } from "three";
import type { GraphNode, EntityKind } from "@/l2-coordinator/api-docs/graph";
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
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-4.3: GraphEdge3D — 3D 连线

**Files:**
- Create: `src/l3-molecule/graph/GraphEdge3D.tsx`

- [ ] **Step 1: 创建连线组件**

```typescript
import { useMemo } from "react";
import * as THREE from "three";
import type { GraphEdge } from "@/l2-coordinator/api-docs/graph";

const EDGE_COLORS: Record<string, string> = {
  active: "#4A9EFF",
  ended: "#888888",
  conflict: "#FF6B6B",
};

interface GraphEdge3DProps {
  edge: GraphEdge;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
}

export function GraphEdge3D({ edge, fromPos, toPos }: GraphEdge3DProps) {
  const color = EDGE_COLORS[edge.status] ?? EDGE_COLORS.active;
  const isDashed = edge.status === "ended" || edge.status === "conflict";

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([fromPos, toPos]);
  }, [fromPos, toPos]);

  if (isDashed) {
    return (
      <lineSegments geometry={geometry}>
        <lineDashedMaterial
          color={color}
          dashSize={0.5}
          gapSize={0.3}
          transparent
          opacity={0.6}
        />
      </lineSegments>
    );
  }

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.7 + edge.confidence * 0.3}
      />
    </line>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-4.4: GraphLabels — 节点名称标签

**Files:**
- Create: `src/l3-molecule/graph/GraphLabels.tsx`

- [ ] **Step 1: 创建标签组件**

```typescript
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
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-5.1: GraphCanvas — 浮动容器 + R3F Canvas

**Files:**
- Create: `src/l3-molecule/graph/GraphCanvas.tsx`

- [ ] **Step 1: 创建浮动容器**

```typescript
import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { motion, AnimatePresence } from "framer-motion";
import { GraphEngine } from "./GraphEngine";
import { GraphNode3D } from "./GraphNode3D";
import { GraphEdge3D } from "./GraphEdge3D";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { useGraphStore } from "@l2/data-clerk/stores/useGraphStore";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import { Spinner } from "@l4/ui/Spinner";

export function GraphCanvas() {
  const graph = useGraphCommander();
  const visible = useGraphStore((s) => s.visible);
  const minimized = useGraphStore((s) => s.minimized);
  const loading = useGraphStore((s) => s.loading);
  const error = useGraphStore((s) => s.error);
  const data = useGraphStore((s) => s.data);

  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 600, height: 450 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handleTitleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    },
    [position],
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsResizing(true);
      resizeStart.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };
    },
    [size],
  );

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
      if (isResizing) {
        setSize({
          width: Math.max(400, resizeStart.current.w + (e.clientX - resizeStart.current.x)),
          height: Math.max(300, resizeStart.current.h + (e.clientY - resizeStart.current.y)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={
          minimized
            ? { opacity: 1, scale: 1, width: 56, height: 56, borderRadius: 28 }
            : { opacity: 1, scale: 1, width: size.width, height: size.height, borderRadius: 16 }
        }
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 1000,
          overflow: "hidden",
          background: "rgba(10,10,26,0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(74,158,255,0.3)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {minimized ? (
          <div
            onClick={graph.toggleMinimize}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 24,
            }}
          >
            🕸️
          </div>
        ) : (
          <>
            <div
              onMouseDown={handleTitleMouseDown}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 12px",
                cursor: "move",
                borderBottom: "1px solid rgba(74,158,255,0.15)",
                userSelect: "none",
                flexShrink: 0,
              }}
            >
              <Typography variant="caption" weight={600} color="var(--color-text-secondary)">
                知识图谱
                {data && ` · ${data.nodes.length} 节点 · ${data.edges.length} 连线`}
              </Typography>
              <div style={{ display: "flex", gap: 4 }}>
                <AppleButton
                  variant="ghost"
                  size="sm"
                  onClick={graph.toggleMinimize}
                  style={{ padding: "0 4px", minWidth: 24, fontSize: 12 }}
                >
                  _
                </AppleButton>
                <AppleButton
                  variant="ghost"
                  size="sm"
                  onClick={graph.closeGraph}
                  style={{ padding: "0 4px", minWidth: 24, fontSize: 12 }}
                >
                  ×
                </AppleButton>
              </div>
            </div>

            <div style={{ flex: 1, position: "relative" }}>
              {loading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                    background: "rgba(10,10,26,0.6)",
                  }}
                >
                  <Spinner size={24} label="加载图谱数据..." />
                </div>
              )}

              {error && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                    background: "rgba(10,10,26,0.8)",
                    gap: 12,
                  }}
                >
                  <Typography variant="body" color="#FF3B30">
                    {error}
                  </Typography>
                  <AppleButton variant="secondary" size="sm" onClick={graph.refreshGraph}>
                    重试
                  </AppleButton>
                </div>
              )}

              <Canvas
                camera={{ position: [0, 0, 8], fov: 50 }}
                style={{ background: "#0a0a1a" }}
              >
                <GraphEngine />
              </Canvas>
            </div>

            <div
              onMouseDown={handleResizeMouseDown}
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 16,
                height: 16,
                cursor: "nwse-resize",
              }}
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-6.1: DashboardView — 集成图谱浮动层

**Files:**
- Modify: `src/l1-entry/pages/DashboardView.tsx`

- [ ] **Step 1: 添加图谱入口按钮和 GraphCanvas**

在 DashboardView 的 import 区域追加：

```typescript
import { GraphCanvas } from "@l3/graph/GraphCanvas";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
```

在组件内部，`const [rightPanelMode, setRightPanelMode] = ...` 之后添加：

```typescript
const graph = useGraphCommander();
```

在右侧面板的 `Stats/AI` 切换按钮区域（约第 116 行，`AppleButton` 旁边），增加图谱按钮。将第 115-118 行修改为：

```tsx
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
  <Typography variant="label" weight={600}>统计数据</Typography>
  <div style={{ display: "flex", gap: 4 }}>
    <AppleButton variant="ghost" size="sm" onClick={() => setRightPanelMode("ai")}>
      AI
    </AppleButton>
    <AppleButton variant="ghost" size="sm" onClick={graph.openGraph}>
      🕸️
    </AppleButton>
  </div>
</div>
```

在 DashboardView 的 return 末尾，`</AppLayout>` 之前，添加 GraphCanvas：

```tsx
<GraphCanvas />
```

- [ ] **Step 2: 验证**

Run: `pnpm typecheck`
Expected: 0 errors

---

### 任务 T-6.2: 最终验证

- [ ] **Step 1: 类型检查**

Run: `pnpm typecheck`
Expected: 0 errors

- [ ] **Step 2: Lint 检查**

Run: `pnpm lint`
Expected: 0 warnings

- [ ] **Step 3: 构建验证**

Run: `pnpm build`
Expected: 构建成功

- [ ] **Step 4: 架构合规检查**

检查以下项目：
- L4 原子间无相互 import（检查 `src/l4-atom/network/` 内文件 import 语句）
- L3 分子间无相互 import（检查 `src/l3-molecule/graph/` 内文件，GraphEngine import GraphNode3D/GraphEdge3D/GraphLabels 是兄弟组件，不算违反规则）
- L1 页面无 graph 业务逻辑（DashboardView 只引入 GraphCanvas 和 useGraphCommander 的 openGraph）
- `useGraphCommander` 只在 L2 层和 DashboardView 中使用

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: sprint 4 - 3D knowledge graph with React Three Fiber"
```

---

## 验收清单

| # | 验收项 | 方法 |
|---|--------|------|
| 1 | `pnpm typecheck` 零错误 | 运行命令 |
| 2 | `pnpm lint` 零警告 | 运行命令 |
| 3 | `pnpm build` 成功 | 运行命令 |
| 4 | DashboardView 右侧面板有 🕸️ 图谱按钮 | 肉眼 |
| 5 | 点击按钮 → 浮动图谱窗口弹出，R3F Canvas 渲染 | 肉眼 |
| 6 | `/api/v1/graph/visualize` 数据成功拉取 | Chrome DevTools Network |
| 7 | 6 种 entity kind 节点颜色正确 | 肉眼对比色表 |
| 8 | active/ended/conflict 连线视觉可区分 | 肉眼 |
| 9 | OrbitControls 旋转/缩放/平移流畅 | 鼠标交互 |
| 10 | 浮动层可拖拽标题栏移动 | 鼠标交互 |
| 11 | 浮动层可拖拽右下角缩放 | 鼠标交互 |
| 12 | 最小化 → 圆形图标，点击恢复 | 点击操作 |
| 13 | 关闭按钮关闭浮动层 | 点击操作 |
| 14 | L4 原子间无相互 import | 代码审查 |
| 15 | L1 页面无 graph 业务逻辑 | 代码审查 |

---

## 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| d3-force-3d 与 R3F 集成复杂 | 布局不工作 | 使用 `useFrame` 逐步 tick 力模拟，节点位置存入 ref 数组 |
| 节点数量过多（>300）导致 60fps 下降 | 体验卡顿 | 降低球体分段数（32→16），减少粒子/光照复杂度 |
| GraphEdges 的 line geometry 不支持虚线 | ended/conflict 无法区分 | 使用 `LineSegments` + `LineDashedMaterial`，或使用多个短线段模拟虚线 |
| 后端图谱数据为空 | Canvas 空白 | GraphEngine 中判断 `data?.nodes.length === 0` 时显示空状态提示 |
| R3F `<Text>` 标签旋转时朝向问题 | 标签不可读 | 使用 `<Text>` 的 `billboard` 属性（drei 内置支持） |

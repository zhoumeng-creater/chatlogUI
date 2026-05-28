/* eslint-disable @typescript-eslint/no-unused-vars */
declare module "d3-force-3d" {
  export function forceSimulation<N extends { x?: number; y?: number; z?: number; id?: string; value?: number }>(
    nodes: N[],
    numDimensions?: number,
  ): Simulation<N>;

  export function forceLink<N extends { x?: number; y?: number; z?: number; id?: string }, S extends { source: string; target: string }>(
    links: S[],
  ): ForceLink<N, S>;

  export function forceManyBody<N extends { x?: number; y?: number; z?: number }>(): ForceManyBody<N>;
  export function forceCenter<N extends { x?: number; y?: number; z?: number }>(
    x?: number,
    y?: number,
    z?: number,
  ): ForceCenter<N>;
  export function forceCollide<N extends { x?: number; y?: number; z?: number }>(
    radius?: number | ((node: N) => number),
  ): ForceCollide<N>;

  interface Simulation<N> {
    force(name: string, force: ForceLink<N, { source: string; target: string }> | ForceManyBody<N> | ForceCenter<N> | ForceCollide<N>): this;
    stop(): this;
    tick(): this;
  }

  interface ForceLink<N extends { id?: string }, S extends { source: string; target: string }> {
    id(fn: (d: N) => string): this;
    distance(d: number): this;
    strength(s: number): this;
  }

  interface ForceManyBody<N> {
    strength(s: number): this;
  }

  interface ForceCenter<N> {
    (): this;
  }

  interface ForceCollide<N> {
    (): this;
  }
}

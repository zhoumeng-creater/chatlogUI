import { describe, expect, it } from "vitest";
import { deriveGraphModuleView } from "./graphViewModel";
import type { GraphStatusView, GraphVisualizeView } from "@/l4-atom/network/graphAdapters";

describe("deriveGraphModuleView", () => {
  it("keeps unavailable or failed graph state optional", () => {
    expect(
      deriveGraphModuleView({
        statusSummary: status("unavailable"),
        visualize: null,
        visualizationRequested: false,
      }),
    ).toMatchObject({
      kind: "unavailable",
      blocksCoreWorkbench: false,
      canVisualize: false,
    });

    expect(
      deriveGraphModuleView({
        statusSummary: status("error", "graph worker failed"),
        visualize: null,
        visualizationRequested: false,
      }),
    ).toMatchObject({
      kind: "failed",
      blocksCoreWorkbench: false,
      message: "graph worker failed",
    });
  });

  it("keeps empty, malformed, and oversized states out of the canvas path", () => {
    for (const state of ["empty", "malformed", "oversized"] as const) {
      const view = deriveGraphModuleView({
        statusSummary: status("ready"),
        visualize: visualize(state),
        visualizationRequested: true,
      });

      expect(view.kind).toBe(state);
      expect(view.shouldMountCanvas).toBe(false);
      expect(view.canVisualize).toBe(false);
    }
  });

  it("allows canvas only after explicit visualization request with loaded data", () => {
    expect(
      deriveGraphModuleView({
        statusSummary: status("ready"),
        visualize: visualize("loaded"),
        visualizationRequested: false,
      }).shouldMountCanvas,
    ).toBe(false);

    expect(
      deriveGraphModuleView({
        statusSummary: status("ready"),
        visualize: visualize("loaded"),
        visualizationRequested: true,
      }),
    ).toMatchObject({
      kind: "loaded",
      canVisualize: true,
      shouldMountCanvas: true,
      tableRows: [{ id: "node-a", label: "Alice", type: "node" }],
    });
  });

  it("summarizes running graph queue, workers, ETA, and fallback rows without mounting canvas", () => {
    const view = deriveGraphModuleView({
      statusSummary: status("running", "", {
        queueLabel: "history queued · enqueue running",
        workerLabel: "3 graph workers · 2 enqueue workers",
        etaLabel: "1m 30s left",
        rateLabel: "18/min",
      }),
      visualize: visualize("loaded"),
      visualizationRequested: false,
    });

    expect(view.shouldMountCanvas).toBe(false);
    expect(view.statusDetails).toEqual([
      "history queued · enqueue running",
      "3 graph workers · 2 enqueue workers",
      "18/min",
      "1m 30s left",
    ]);
    expect(view.tableRows).toContainEqual({ id: "node-a", label: "Alice", type: "node", detail: "person" });
  });
});

function status(
  state: GraphStatusView["state"],
  lastError = "",
  overrides: Partial<GraphStatusView> = {},
): GraphStatusView {
  const base: GraphStatusView = {
    state,
    enabled: state !== "unavailable",
    paused: state === "paused",
    running: state === "running",
    historyQueued: false,
    enqueueRunning: false,
    workers: 0,
    enqueueWorkers: 0,
    counts: { entities: 1, relations: 0, events: 0, facts: 0, sources: 0 },
    pending: 0,
    processing: 0,
    processed: 1,
    failed: 0,
    progressPct: state === "running" ? 40 : 100,
    lastError,
    startedAt: "",
    processingRatePerMinute: 0,
    estimatedSecondsLeft: 0,
    lastUpdatedAt: "",
    queueLabel: "",
    workerLabel: "",
    rateLabel: "",
    etaLabel: "",
    lastActivityLabel: "",
  };
  return { ...base, ...overrides };
}

function visualize(state: GraphVisualizeView["state"]): GraphVisualizeView {
  return {
    state,
    nodes: state === "loaded"
      ? [{ id: "a", name: "Alice", label: "Alice", kind: "person", value: 2, last_seen: 1 }]
      : [],
    edges: [],
    timelineRows: [],
    generatedAt: 1,
    error: state === "malformed" ? "Malformed graph payload." : "",
    summary: {
      nodeCount: state === "loaded" ? 1 : 0,
      edgeCount: 0,
      timelineCount: 0,
    },
  };
}

import { describe, expect, it } from "vitest";
import {
  adaptGraphConfig,
  adaptGraphIngestResponse,
  adaptGraphQAResponse,
  buildGraphConfigPayload,
  buildGraphIngestPayload,
  buildGraphQAPayload,
} from "./graphResidualAdapters";

describe("graphResidualAdapters", () => {
  it("adapts and clamps graph worker config", () => {
    expect(adaptGraphConfig({ workers: 4, enqueue_workers: 2 })).toEqual({
      workers: 4,
      enqueueWorkers: 2,
    });
    expect(buildGraphConfigPayload({ workers: -1, enqueueWorkers: 0 })).toEqual({
      workers: 1,
      enqueue_workers: 1,
    });
  });

  it("builds structured ingest payloads but summaries never retain submitted content", () => {
    const payload = buildGraphIngestPayload("business", {
      source: "manual",
      type: "milestone",
      time: "2026-01-03T08:00:00Z",
      title: "Synthetic title",
      content: "Synthetic private graph content",
      entities: "Synthetic A, Synthetic B",
    });

    expect(payload).toEqual({
      source: "manual",
      type: "milestone",
      time: "2026-01-03T08:00:00Z",
      title: "Synthetic title",
      content: "Synthetic private graph content",
      entities: ["Synthetic A", "Synthetic B"],
      metadata: {},
    });

    const result = adaptGraphIngestResponse("business", {
      ok: true,
      count: 1,
      ids: [1001],
      status: { ready: true },
    });
    expect(result).toMatchObject({
      kind: "business",
      ok: true,
      count: 1,
      idCount: 1,
      statusLabel: "accepted",
    });
    expect(JSON.stringify(result)).not.toContain("Synthetic private graph content");
  });

  it("keeps graph QA answer preview and redacts raw evidence summaries", () => {
    const payload = buildGraphQAPayload({
      query: "Synthetic private graph query",
      window: "7d",
    });
    expect(payload).toEqual({ query: "Synthetic private graph query", window: "7d" });

    const response = adaptGraphQAResponse({
      answer: "Synthetic private graph answer",
      evidence: {
        entities: [{ name: "Synthetic private person", type: "person" }],
        events: [{ title: "Synthetic private event", summary: "Synthetic private evidence" }],
      },
    });

    expect(response).toMatchObject({
      hasAnswer: true,
      evidenceCount: 2,
      answerPreview: "Synthetic private graph answer",
      evidenceSummary: "2 条证据已隐藏",
    });
    expect(JSON.stringify(response)).not.toContain("Synthetic private person");
    expect(JSON.stringify(response)).not.toContain("Synthetic private evidence");
  });
});

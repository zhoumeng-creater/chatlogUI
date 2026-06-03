import { describe, expect, it } from "vitest";
import { buildSemanticPreviewView } from "./semanticPreviewViewModel";
import type { SemanticIndexPreviewView } from "@l4/network";

describe("semanticPreviewViewModel", () => {
  it("builds metadata-rich preview rows without identity or content leakage", () => {
    const view = buildSemanticPreviewView({
      status: "ready",
      preview: preview(),
      error: null,
    }, true);

    expect(view.summary).toContain("2 vectors");
    expect(view.rows[0]).toMatchObject({
      identityLabel: "已隐藏对象",
      contentPreview: "已隐藏内容",
    });
    expect(JSON.stringify(view)).not.toContain("store_path");
    expect(JSON.stringify(view)).not.toContain("Synthetic private");
  });
});

function preview(): SemanticIndexPreviewView {
  return {
    model: "synthetic-model",
    dim: 768,
    kind: "message",
    limit: 20,
    offset: 0,
    total: 2,
    sampleDims: 3,
    groups: [{ name: "message", count: 2 }],
    rows: [{
      id: "row-1",
      kind: "message",
      identityLabel: "已隐藏对象",
      contentPreview: "已隐藏内容",
      vectorNorm: 0.9,
      sampleDimensions: 3,
      coordinates: { x: 0, y: 0, z: 0 },
      outlierScore: 0.1,
      isOutlier: false,
      updatedAt: 0,
    }],
    outliers: [],
  };
}

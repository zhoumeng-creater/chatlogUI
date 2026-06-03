import { describe, expect, it } from "vitest";
import { adaptSemanticIndexPreview } from "./semanticPreviewAdapters";

describe("semanticPreviewAdapters", () => {
  it("adapts semantic index preview while omitting store path, identities, and content", () => {
    const preview = adaptSemanticIndexPreview({
      model: "synthetic-embedding-model",
      dim: 768,
      kind: "message",
      limit: 20,
      offset: 0,
      total: 2,
      groups: [{ name: "message", count: 1 }],
      items: [
        {
          kind: "message",
          id: "semantic_preview_synthetic_001",
          talker: "synthetic_talker_alpha",
          sender: "synthetic_sender_alpha",
          content: "Synthetic private semantic content",
          model: "synthetic-embedding-model",
          dim: 768,
          vector_norm: 0.98,
          vector_sample: [0.1, 0.2, 0.3],
          x: 0.1,
          y: -0.2,
          z: 0.3,
          outlier_score: 0.12,
          is_outlier: false,
        },
      ],
      store_path: "synthetic-vector-store-redaction-target",
      sample_dims: 3,
      outliers: [
        {
          kind: "entity",
          id: "semantic_preview_outlier_001",
          username: "synthetic_user_alpha",
          display: "Synthetic User Alpha",
          content: "Synthetic private outlier content",
          vector_norm: 1.4,
          x: 0.8,
          y: -0.7,
          z: 0.6,
          outlier_score: 0.91,
          is_outlier: true,
        },
      ],
    });

    expect(preview).toMatchObject({
      model: "synthetic-embedding-model",
      dim: 768,
      kind: "message",
      total: 2,
      sampleDims: 3,
      groups: [{ name: "message", count: 1 }],
      rows: [
        {
          id: "semantic_preview_synthetic_001",
          kind: "message",
          identityLabel: "已隐藏对象",
          contentPreview: "已隐藏内容",
          vectorNorm: 0.98,
          coordinates: { x: 0.1, y: -0.2, z: 0.3 },
          isOutlier: false,
        },
      ],
      outliers: [
        {
          id: "semantic_preview_outlier_001",
          isOutlier: true,
          outlierScore: 0.91,
        },
      ],
    });
    expect(JSON.stringify(preview)).not.toContain("store");
    expect(JSON.stringify(preview)).not.toContain("synthetic_talker");
    expect(JSON.stringify(preview)).not.toContain("Synthetic private");
    expect(JSON.stringify(preview)).not.toContain("Synthetic User");
  });
});

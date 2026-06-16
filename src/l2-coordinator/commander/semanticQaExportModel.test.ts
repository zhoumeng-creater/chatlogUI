import { describe, expect, it } from "vitest";
import { createSemanticQaExportArtifact } from "./semanticQaExportModel";

const generatedAt = new Date("2026-01-02T03:04:05.000Z");

describe("createSemanticQaExportArtifact", () => {
  it("exports the selected assistant answer with rich evidence metadata and privacy structure", () => {
    const artifact = createSemanticQaExportArtifact({
      format: "markdown",
      privacyOn: true,
      generatedAt,
      scopeSummary: "当前会话",
      question: "Synthetic private question",
      answer: "Synthetic private answer",
      requestSnapshot: {
        query: "Synthetic private question",
        scope: "contact",
        chat: "wxid_synthetic_private",
        window: "30d",
        retrievalDepth: "deep",
        sourceLimit: 12,
        topN: 6,
        createdAt: generatedAt.getTime(),
      },
      reason: "rerank selected grounded chunks",
      metadata: {
        window: "30d",
        depth: "deep",
        sourceCount: 2,
        rerankApplied: true,
      },
      evidence: [
        {
          talker: "wxid_synthetic_private",
          talker_name: "Synthetic Chat",
          sender_name: "Synthetic Sender",
          source: "message",
          local_id: 42,
          seq: 42,
          time: "2026-01-02 08:00",
          content: "Synthetic private evidence",
          score: 0.91,
          rerank_score: 0.83,
          reason: "matched query",
          metadata: { chunk_type: "message" },
        },
      ],
    });

    expect(artifact.source).toBe("ai");
    expect(artifact.rowCount).toBe(1);
    expect(artifact.content).toContain("AI 问答与证据");
    expect(artifact.content).toContain("范围: 当前会话");
    expect(artifact.content).toContain("检索窗口: 30d");
    expect(artifact.content).toContain("检索深度: deep");
    expect(artifact.content).toContain("来源上限: 12");
    expect(artifact.content).toContain("证据数量: 1");
    expect(artifact.content).toContain("localId 42");
    expect(artifact.content).toContain("score 0.91");
    expect(artifact.content).toContain("rerank 0.83");
    expect(artifact.content).toContain("message");
    expect(artifact.content).not.toContain("Synthetic private question");
    expect(artifact.content).not.toContain("Synthetic private answer");
    expect(artifact.content).not.toContain("Synthetic Chat");
    expect(artifact.content).not.toContain("Synthetic Sender");
    expect(artifact.content).not.toContain("Synthetic private evidence");
    expect(artifact.content).not.toContain("wxid_synthetic_private");
  });
});

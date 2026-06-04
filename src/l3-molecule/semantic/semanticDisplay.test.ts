import { describe, expect, it } from "vitest";
import {
  getSemanticEntityCandidateRows,
  getSemanticEvidenceRows,
  getSemanticMetadataChips,
} from "./semanticDisplay";

describe("semantic QA display helpers", () => {
  it("formats evidence rows with scores, context, and privacy masking", () => {
    const evidence = [
      {
        time: "2026-06-04 09:30",
        talker_name: "Project Room",
        sender_name: "Alice",
        source: "message",
        chunk_type: "summary",
        score: 0.92345,
        rerank_score: 0.721,
        content: "Private evidence body",
        context: [
          {
            time: "2026-06-04 09:29",
            sender_name: "Bob",
            content: "Private context body",
          },
        ],
      },
    ];

    expect(getSemanticEvidenceRows(evidence, false)[0]).toMatchObject({
      index: 1,
      time: "2026-06-04 09:30",
      chatLabel: "Project Room",
      senderLabel: "Alice",
      sourceLabel: "message / summary",
      scoreLabel: "score 0.9235",
      rerankScoreLabel: "rerank 0.7210",
      content: "Private evidence body",
      contextRows: [
        {
          time: "2026-06-04 09:29",
          senderLabel: "Bob",
          content: "Private context body",
        },
      ],
    });

    const privateRow = getSemanticEvidenceRows(evidence, true)[0];
    expect(privateRow.chatLabel).not.toContain("Project");
    expect(privateRow.senderLabel).not.toContain("Alice");
    expect(privateRow.content).not.toContain("Private");
    expect(privateRow.contextRows[0].content).not.toContain("Private");
    expect(privateRow.scoreLabel).toBe("score 0.9235");
  });

  it("formats metadata chips and entity candidates without exposing raw debug fields", () => {
    const metadata = {
      sourceCount: 3,
      window: "30d",
      depth: "deep",
      evidenceCount: 2,
      rerankTried: true,
      rerankApplied: false,
      rerankError: "synthetic rerank unavailable",
      entityAmbiguous: true,
      entityCandidates: [
        {
          display: "Alice",
          username: "wxid_alice",
          kind: "person",
          source: "contacts",
          raw_note: "should not show",
        },
      ],
    };

    expect(getSemanticMetadataChips(metadata)).toEqual([
      "数据源 3",
      "时间窗 30d",
      "深度 deep",
      "证据 2",
      "Rerank 未应用",
      "Rerank: synthetic rerank unavailable",
      "候选 1 · 有歧义",
    ]);

    const candidates = getSemanticEntityCandidateRows(metadata, true);
    expect(candidates[0]).toMatchObject({
      entityOverride: "wxid_alice",
      kindLabel: "******",
      sourceLabel: "********",
    });
    expect(candidates[0].displayLabel).not.toContain("Alice");
    expect(JSON.stringify(candidates)).not.toContain("raw_note");
  });
});

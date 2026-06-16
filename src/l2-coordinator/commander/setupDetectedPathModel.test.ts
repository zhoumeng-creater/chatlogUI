import { describe, expect, it } from "vitest";
import { buildDetectedPathCandidateViews } from "./setupDetectedPathModel";
import type { SetupDetectedPathCandidate } from "@l2/data-clerk/types/setup";

describe("setupDetectedPathModel", () => {
  it("builds candidate summaries without raw local paths or wxid labels", () => {
    const candidates: SetupDetectedPathCandidate[] = [
      {
        id: "candidate-1",
        path: "C:\\Users\\Synthetic\\Documents\\WeChat Files\\wxid_synthetic_private",
        label: "wxid_synthetic_private",
        exists: true,
        source: "documents",
        confidence: "high",
      },
    ];

    const views = buildDetectedPathCandidateViews(candidates);

    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({
      id: "candidate-1",
      title: "微信数据目录候选 1",
      confidenceLabel: "可信度高",
      disabled: false,
    });
    expect(JSON.stringify(views)).not.toContain("C:\\Users");
    expect(JSON.stringify(views)).not.toContain("WeChat Files");
    expect(JSON.stringify(views)).not.toContain("wxid_synthetic_private");
  });

  it("marks missing candidates as unavailable without leaking the path", () => {
    const views = buildDetectedPathCandidateViews([
      {
        id: "candidate-1",
        path: "E:\\Synthetic\\WeChat Files\\wxid_synthetic_missing",
        label: "wxid_synthetic_missing",
        exists: false,
        source: "documents",
        confidence: "low",
      },
    ]);

    expect(views[0]).toMatchObject({
      disabled: true,
      confidenceLabel: "可信度低",
    });
    expect(JSON.stringify(views)).not.toContain("E:\\Synthetic");
    expect(JSON.stringify(views)).not.toContain("wxid_synthetic_missing");
  });
});

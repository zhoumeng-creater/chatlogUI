import { describe, expect, it } from "vitest";
import {
  buildGraphResidualView,
  hasMeaningfulGraphBusinessDraft,
  hasMeaningfulGraphEventDraft,
} from "./graphResidualViewModel";

describe("graphResidualViewModel", () => {
  it("builds graph advanced summaries and keeps QA evidence redacted", () => {
    const view = buildGraphResidualView({
      configStatus: "ready",
      ingestStatus: "ready",
      qaStatus: "ready",
      config: { workers: 2, enqueueWorkers: 1 },
      ingestResult: { kind: "business", ok: true, count: 1, idCount: 1, statusLabel: "accepted" },
      qaResult: { hasAnswer: true, answerPreview: "已隐藏回答", evidenceCount: 2, evidenceSummary: "2 条证据已隐藏" },
      confirmationPending: "business",
      configError: null,
      ingestError: null,
      qaError: null,
    }, true);

    expect(view.configSummary).toBe("2 workers · 1 enqueue");
    expect(view.ingestSummary).toContain("1 item");
    expect(view.qaSummary).toBe("已隐藏回答 · 2 条证据已隐藏");
    expect(view.businessIngestCopy).toBe("确认写入业务记录");
    expect(view.confirmationCopy).toContain("再次点击");
    expect(JSON.stringify(view)).not.toContain("Synthetic private");
  });

  it("ignores default ingest type fields when checking for meaningful graph input", () => {
    expect(hasMeaningfulGraphBusinessDraft({
      source: "",
      type: "business",
      time: "",
      title: "",
      content: "",
      entities: "",
    })).toBe(false);
    expect(hasMeaningfulGraphBusinessDraft({
      source: "",
      type: "business",
      time: "",
      title: "Quarterly plan",
      content: "",
      entities: "",
    })).toBe(true);

    expect(hasMeaningfulGraphEventDraft({
      eventType: "event",
      time: "",
      actors: "",
      targets: "",
      content: "",
    })).toBe(false);
    expect(hasMeaningfulGraphEventDraft({
      eventType: "event",
      time: "",
      actors: "",
      targets: "Launch",
      content: "",
    })).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildGraphResidualView,
  hasMeaningfulGraphBusinessDraft,
  hasMeaningfulGraphEventDraft,
} from "./graphResidualViewModel";

describe("graphResidualViewModel", () => {
  it("builds graph advanced summaries and shows graph QA answers outside privacy mode", () => {
    const view = buildGraphResidualView({
      configStatus: "ready",
      ingestStatus: "ready",
      qaStatus: "ready",
      config: { workers: 2, enqueueWorkers: 1 },
      ingestResult: { kind: "business", ok: true, count: 1, idCount: 1, statusLabel: "accepted" },
      qaResult: { hasAnswer: true, answerPreview: "Synthetic graph answer", evidenceCount: 2, evidenceSummary: "2 条证据已隐藏" },
      confirmationPending: "business",
      configError: null,
      ingestError: null,
      qaError: null,
    }, false);

    expect(view.configSummary).toBe("2 图谱线程 · 1 入队线程");
    expect(view.ingestSummary).toContain("1 item");
    expect(view.qaSummary).toBe("Synthetic graph answer · 2 条证据已隐藏");
    expect(view.businessIngestCopy).toBe("确认写入业务记录");
    expect(view.confirmationCopy).toContain("再次点击");
    expect(JSON.stringify(view)).not.toContain("Synthetic private");
  });

  it("hides graph QA answer text in privacy mode while keeping evidence counts", () => {
    const view = buildGraphResidualView({
      configStatus: "ready",
      ingestStatus: "ready",
      qaStatus: "ready",
      config: { workers: 2, enqueueWorkers: 1 },
      ingestResult: { kind: "business", ok: true, count: 2, idCount: 2, statusLabel: "accepted" },
      qaResult: { hasAnswer: true, answerPreview: "Synthetic private graph answer", evidenceCount: 2, evidenceSummary: "2 条证据已隐藏" },
      confirmationPending: null,
      configError: null,
      ingestError: null,
      qaError: null,
    }, true);

    expect(view.qaSummary).toBe("已隐藏回答 · 2 条证据已隐藏");
    expect(JSON.stringify(view)).not.toContain("Synthetic private graph answer");
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

  it("labels reset rebuild confirmation separately from ordinary advanced actions", () => {
    const view = buildGraphResidualView({
      configStatus: "ready",
      ingestStatus: "idle",
      qaStatus: "idle",
      config: { workers: 1, enqueueWorkers: 1 },
      ingestResult: null,
      qaResult: null,
      confirmationPending: "reset",
      configError: null,
      ingestError: null,
      qaError: null,
    }, false);

    expect(view.resetRebuildCopy).toBe("确认重置重建");
    expect(view.confirmationCopy).toContain("清空并重建");
  });
});

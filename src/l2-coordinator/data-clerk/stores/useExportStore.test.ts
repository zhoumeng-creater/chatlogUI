import { beforeEach, describe, expect, it } from "vitest";
import type { BusinessExportArtifact, BusinessExportJob } from "@l2/commander/businessExportModel";
import { useExportStore } from "./useExportStore";

const job: BusinessExportJob = {
  id: "export-1",
  source: "search",
  sourceLabel: "搜索结果",
  format: "markdown",
  privacyMode: "redacted",
  redactionPolicy: "redacted",
  scopeSummary: "当前会话",
  filenamePreview: "chatlog-search-20260102-030405.md",
  rowCount: 1,
  estimatedBytes: 120,
  status: "confirming",
  error: null,
  generatedAt: "2026-01-02T03:04:05.000Z",
};

const artifact: BusinessExportArtifact = {
  job,
  source: "search",
  format: "markdown",
  fileName: "chatlog-search-20260102-030405.md",
  extension: "md",
  mimeType: "text/markdown;charset=utf-8",
  content: "# 搜索结果",
  rowCount: 1,
  estimatedBytes: 120,
  privacyMode: "redacted",
  redactionPolicy: "redacted",
  status: "confirming",
  warnings: [],
};

describe("useExportStore", () => {
  beforeEach(() => {
    useExportStore.getState().resetExport();
  });

  it("keeps export content transient and clears it after completion", () => {
    useExportStore.getState().beginExport(job, artifact);

    expect(useExportStore.getState().currentJob?.status).toBe("confirming");
    expect(useExportStore.getState().transientArtifact?.content).toContain("搜索结果");

    useExportStore.getState().startWriting(job.id);
    expect(useExportStore.getState().currentJob?.status).toBe("writing");

    useExportStore.getState().completeExport(job.id, {
      fileName: "chatlog-search-20260102-030405.md",
      extension: "md",
      bytesWritten: 120,
      locationSummary: "chatlog-search-20260102-030405.md · 120 B",
    });

    const state = useExportStore.getState();
    expect(state.currentJob?.status).toBe("completed");
    expect(state.transientArtifact).toBeNull();
    expect(state.safeResultSummary?.locationSummary).toBe("chatlog-search-20260102-030405.md · 120 B");
  });

  it("ignores stale completion and failure updates from older jobs", () => {
    useExportStore.getState().beginExport(job, artifact);
    useExportStore.getState().beginExport({ ...job, id: "export-2" }, {
      ...artifact,
      job: { ...job, id: "export-2" },
    });

    useExportStore.getState().completeExport(job.id, {
      fileName: "stale.md",
      extension: "md",
      bytesWritten: 4,
      locationSummary: "stale.md",
    });
    useExportStore.getState().failExport(job.id, {
      category: "write-failed",
      message: "stale failure",
      retryable: true,
    });

    expect(useExportStore.getState().currentJob?.id).toBe("export-2");
    expect(useExportStore.getState().currentJob?.status).toBe("confirming");
    expect(useExportStore.getState().safeResultSummary).toBeNull();
  });

  it("distinguishes true cancellation before writing from stop-waiting during writing", () => {
    useExportStore.getState().beginExport(job, artifact);
    useExportStore.getState().cancelExport(job.id);

    expect(useExportStore.getState().currentJob?.status).toBe("cancelled");
    expect(useExportStore.getState().transientArtifact).toBeNull();

    useExportStore.getState().beginExport(job, artifact);
    useExportStore.getState().startWriting(job.id);
    useExportStore.getState().cancelExport(job.id);

    expect(useExportStore.getState().currentJob?.status).toBe("cancelling");
    expect(useExportStore.getState().stopWaitingMessage).toContain("停止等待");
    expect(useExportStore.getState().transientArtifact?.fileName).toBe(artifact.fileName);

    useExportStore.getState().completeExport(job.id, {
      fileName: "chatlog-search-20260102-030405.md",
      extension: "md",
      bytesWritten: 120,
      locationSummary: "chatlog-search-20260102-030405.md · 120 B",
    });

    expect(useExportStore.getState().currentJob?.status).toBe("completed");
    expect(useExportStore.getState().transientArtifact).toBeNull();
  });
});

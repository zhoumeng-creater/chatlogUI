import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { BusinessExportArtifact, BusinessExportJob } from "@l2/commander/businessExportModel";
import { BusinessExportDialog } from "./BusinessExportDialog";
import { ExportActionButton } from "./ExportActionButton";

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
  warnings: ["当前只导出已加载数据。"],
};

describe("BusinessExportDialog", () => {
  it("renders export scope, format, privacy, filename preview, and safe actions", () => {
    const html = renderToStaticMarkup(
      <BusinessExportDialog
        artifact={artifact}
        job={job}
        formats={["markdown", "csv", "json"]}
        selectedFormat="markdown"
        privacyOn
        unredactedConfirmed={false}
        onFormatChange={vi.fn()}
        onToggleUnredacted={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain("导出搜索结果");
    expect(html).toContain("当前会话");
    expect(html).toContain("Markdown");
    expect(html).toContain("CSV");
    expect(html).toContain("JSON");
    expect(html).toContain("脱敏导出");
    expect(html).toContain("chatlog-search-20260102-030405.md");
    expect(html).toContain("当前只导出已加载数据");
    expect(html).not.toContain("C:\\Users");
    expect(html).not.toContain("wxid_");
  });

  it("shows completed and failed states with persistent recovery actions", () => {
    const completed = renderToStaticMarkup(
      <BusinessExportDialog
        artifact={{ ...artifact, status: "completed" }}
        job={{ ...job, status: "completed" }}
        formats={["markdown"]}
        selectedFormat="markdown"
        privacyOn={false}
        unredactedConfirmed={false}
        resultSummary={{
          fileName: "chatlog-search-20260102-030405.md",
          extension: "md",
          bytesWritten: 120,
          locationSummary: "chatlog-search-20260102-030405.md · 120 B",
        }}
        onFormatChange={vi.fn()}
        onToggleUnredacted={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(completed).toContain("导出完成");
    expect(completed).toContain("chatlog-search-20260102-030405.md · 120 B");

    const failed = renderToStaticMarkup(
      <BusinessExportDialog
        artifact={{ ...artifact, status: "failed" }}
        job={{
          ...job,
          status: "failed",
          error: {
            category: "write-failed",
            message: "保存失败，请换一个位置后重试。",
            retryable: true,
          },
        }}
        formats={["markdown"]}
        selectedFormat="markdown"
        privacyOn={false}
        unredactedConfirmed={false}
        onFormatChange={vi.fn()}
        onToggleUnredacted={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(failed).toContain("保存失败，请换一个位置后重试。");
    expect(failed).toContain("重试");
  });

  it("shows stop-waiting state without offering another save action", () => {
    const cancelling = renderToStaticMarkup(
      <BusinessExportDialog
        artifact={{ ...artifact, status: "cancelling" }}
        job={{ ...job, status: "cancelling" }}
        formats={["markdown"]}
        selectedFormat="markdown"
        privacyOn={false}
        unredactedConfirmed={false}
        onFormatChange={vi.fn()}
        onToggleUnredacted={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(cancelling).toContain("停止等待");
    expect(cancelling).toContain("导出可能仍在后台完成");
    expect(cancelling).not.toContain("保存</button>");
  });
});

describe("ExportActionButton", () => {
  it("keeps disabled reasons available to assistive tech without changing button dimensions", () => {
    const html = renderToStaticMarkup(
      <ExportActionButton
        label="导出"
        disabled
        disabledReason="当前没有可导出的结果。"
        onClick={vi.fn()}
      />,
    );

    expect(html).toContain("当前没有可导出的结果");
    expect(html).toContain("aria-describedby");
    expect(html).toContain("business-export-action");
    expect(html).toContain("ui-button--md");
    expect(html).not.toContain("ui-button--sm");
  });
});

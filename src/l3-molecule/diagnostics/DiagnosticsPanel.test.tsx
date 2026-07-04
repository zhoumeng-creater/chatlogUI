import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DiagnosticsReport } from "@l2/commander/diagnostics";
import { DiagnosticsPanel, formatDiagnosticsExportSuccess } from "./DiagnosticsPanel";

describe("DiagnosticsPanel", () => {
  it("describes disabled copy/export controls when redaction blocks diagnostics", () => {
    const html = renderToStaticMarkup(
      <DiagnosticsPanel
        report={blockedReport}
        copyText="blocked diagnostics"
        onExport={vi.fn(async () => ({
          status: "completed",
          locationSummary: "diagnostics.txt",
        } as const))}
      />,
    );

    const descriptionIds = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1]);
    expect(descriptionIds.length).toBeGreaterThanOrEqual(2);
    expect(descriptionIds.every((id) => html.includes(`id="${id}"`))).toBe(true);
    expect(html).toContain("诊断报告仍包含敏感信息");
    expect(html).toContain("已阻止复制和导出");
  });

  it("formats export success without revealing the full filesystem path", () => {
    const message = formatDiagnosticsExportSuccess("diagnostics.txt");

    expect(message).toContain("diagnostics.txt");
    expect(message).not.toContain("Users");
    expect(message).not.toContain("Private");
    expect(message).not.toContain("Documents");
  });

  it("uses a single generic export success message when the filename is unsafe", () => {
    expect(formatDiagnosticsExportSuccess("")).toBe(
      "诊断已导出",
    );
  });

  it("places copy and export actions in the diagnostic header before the report lines", () => {
    const html = renderToStaticMarkup(
      <DiagnosticsPanel
        report={readyReport}
        copyText="safe diagnostics"
        onExport={vi.fn(async () => ({
          status: "completed",
          locationSummary: "diagnostics.txt",
        } as const))}
      />,
    );

    expect(html).toContain("diagnostics-panel__header-actions");
    expect(html.indexOf("diagnostics-panel__header-actions")).toBeLessThan(html.indexOf("diagnostics-grid"));
    expect(html.indexOf("复制诊断")).toBeLessThan(html.indexOf("Mode"));
    expect(html.indexOf("导出诊断")).toBeLessThan(html.indexOf("Mode"));
  });
});

const blockedReport: DiagnosticsReport = {
  redactionOk: false,
  blockedReason: "诊断报告仍包含敏感信息",
  lines: [
    {
      label: "Redaction result",
      value: "blocked",
    },
  ],
};

const readyReport: DiagnosticsReport = {
  redactionOk: true,
  lines: [
    {
      label: "Mode",
      value: "managed",
    },
  ],
};

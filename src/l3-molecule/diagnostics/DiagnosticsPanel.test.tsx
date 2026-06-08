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
        onExport={vi.fn(async () => "C:/Users/Private/Documents/diagnostics.txt")}
      />,
    );

    const descriptionIds = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1]);
    expect(descriptionIds.length).toBeGreaterThanOrEqual(2);
    expect(descriptionIds.every((id) => html.includes(`id="${id}"`))).toBe(true);
    expect(html).toContain("诊断报告仍包含敏感信息");
    expect(html).toContain("已阻止复制和导出");
  });

  it("formats export success without revealing the full filesystem path", () => {
    const message = formatDiagnosticsExportSuccess("C:\\Users\\Private\\Documents\\diagnostics.txt");

    expect(message).toContain("diagnostics.txt");
    expect(message).not.toContain("Users");
    expect(message).not.toContain("Private");
    expect(message).not.toContain("Documents");
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

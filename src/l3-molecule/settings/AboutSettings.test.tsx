import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DiagnosticsReport } from "@l2/commander/diagnostics";
import { AboutSettings } from "./AboutSettings";

describe("AboutSettings", () => {
  it("folds full diagnostics details by default behind an accessible disclosure", () => {
    const html = renderToStaticMarkup(
      <AboutSettings
        updateStatusText=""
        onCheckUpdate={vi.fn(async () => undefined)}
        diagnosticReport={diagnosticReport}
        diagnosticCopyText="Export manifest version: 2.0"
        onExportDiagnostics={vi.fn(async () => "diagnostics.txt")}
      />,
    );

    expect(html).toContain("脱敏诊断");
    expect(html).toContain("aria-expanded=\"false\"");
    expect(html).not.toContain("Export manifest version");
    expect(html).not.toContain("Backend base URL");
    expect(html).not.toContain("复制诊断");
    expect(html).not.toContain("导出诊断");
  });
});

const diagnosticReport: DiagnosticsReport = {
  redactionOk: true,
  lines: [
    { label: "Export manifest version", value: "2.0" },
    { label: "Backend base URL", value: "http://127.0.0.1:5030" },
  ],
};

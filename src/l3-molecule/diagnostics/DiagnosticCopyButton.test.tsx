import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiagnosticCopyButton } from "./DiagnosticCopyButton";

describe("DiagnosticCopyButton", () => {
  it("describes why diagnostic copy is disabled after redaction fails", () => {
    const html = renderToStaticMarkup(
      <DiagnosticCopyButton
        text="diagnostic text"
        disabled
        disabledReason="诊断报告仍包含敏感信息，已阻止复制。"
      />,
    );

    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${descriptionId}"`);
    expect(html).toContain("ui-disabled-reason--compact");
    expect(html).toContain("诊断报告仍包含敏感信息");
  });
});

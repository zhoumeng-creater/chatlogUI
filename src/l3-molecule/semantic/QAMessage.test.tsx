import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { QAMessage } from "./QAMessage";

describe("QAMessage", () => {
  it("offers per-answer export for completed assistant answers with evidence", () => {
    const html = renderToStaticMarkup(
      <QAMessage
        message={{
          id: "assistant-1",
          role: "assistant",
          content: "Synthetic answer",
          timestamp: 1,
          completionStatus: "completed",
          evidence: [{ source: "synthetic-source", content: "Synthetic evidence" }],
        }}
        privacyOn={false}
        onOpenEvidence={vi.fn()}
        onRetry={vi.fn()}
        onCopy={vi.fn(async () => true)}
        {...({ onExport: vi.fn(), exportDisabledReason: null } as Record<string, unknown>)}
      />,
    );

    expect(html).toContain("证据");
    expect(html).toContain("导出");
  });

  it("shows why failed answers cannot be exported", () => {
    const html = renderToStaticMarkup(
      <QAMessage
        message={{
          id: "assistant-1",
          role: "assistant",
          content: "",
          timestamp: 1,
          completionStatus: "failed",
          reason: "Synthetic failure",
        }}
        privacyOn={false}
        {...({ onExport: vi.fn(), exportDisabledReason: "当前回答失败，请重试后再导出。" } as Record<string, unknown>)}
      />,
    );

    expect(html).toContain("当前回答失败，请重试后再导出。");
  });
});

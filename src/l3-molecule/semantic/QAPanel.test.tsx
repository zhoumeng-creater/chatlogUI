import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { QAPanel } from "./QAPanel";

const baseProps = {
  qaStatus: "completed" as const,
  qaError: null,
  currentContact: "Synthetic Contact",
  privacyOn: false,
  onAskQuestion: vi.fn(),
  onStopQAStream: vi.fn(),
  onRetryQAMessage: vi.fn(),
  onCopyQAMessageAnswer: vi.fn(async () => true),
  onClearQAMessages: vi.fn(),
};

describe("QAPanel", () => {
  it("offers a secondary clear action when QA history exists", () => {
    const html = renderToStaticMarkup(
      <QAPanel
        {...baseProps}
        qaStreaming={false}
        qaMessages={[
          {
            id: "assistant-1",
            role: "assistant",
            content: "Synthetic answer",
            timestamp: 1,
            completionStatus: "completed",
          },
        ]}
      />,
    );

    expect(html).toContain("清空问答");
    expect(html).toContain('aria-label="清空问答记录"');
    expect(html).not.toContain("正在生成回答，停止后可清空");
  });

  it("keeps clear disabled with a recovery reason while QA is streaming", () => {
    const html = renderToStaticMarkup(
      <QAPanel
        {...baseProps}
        qaStreaming
        qaStatus="streaming"
        qaMessages={[
          {
            id: "assistant-1",
            role: "assistant",
            content: "Partial synthetic answer",
            timestamp: 1,
            isStreaming: true,
            completionStatus: "streaming",
          },
        ]}
      />,
    );

    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${descriptionId}"`);
    expect(html).toContain("正在生成回答，停止后可清空");
    expect(html).toContain("disabled=\"\"");
  });

  it("announces stopped and failed QA states with aria-live without exposing answer content", () => {
    const stoppedHtml = renderToStaticMarkup(
      <QAPanel
        {...baseProps}
        qaStreaming={false}
        qaStatus="stopped"
        qaMessages={[
          {
            id: "assistant-1",
            role: "assistant",
            content: "Synthetic partial answer",
            timestamp: 1,
            completionStatus: "stopped",
          },
        ]}
      />,
    );

    expect(stoppedHtml).toContain('role="status"');
    expect(stoppedHtml).toContain('aria-live="polite"');
    expect(stoppedHtml).toContain("已停止，保留当前回答");

    const failedHtml = renderToStaticMarkup(
      <QAPanel
        {...baseProps}
        qaStreaming={false}
        qaStatus="failed"
        qaError="Synthetic provider unavailable"
        qaMessages={[
          {
            id: "assistant-1",
            role: "assistant",
            content: "",
            timestamp: 1,
            completionStatus: "failed",
          },
        ]}
      />,
    );

    expect(failedHtml).toContain('role="alert"');
    expect(failedHtml).toContain("Synthetic provider unavailable");
  });

  it("does not render a clear action for an empty QA history", () => {
    const html = renderToStaticMarkup(
      <QAPanel
        {...baseProps}
        qaStreaming={false}
        qaMessages={[]}
      />,
    );

    expect(html).not.toContain("清空问答");
    expect(html).not.toContain("清空问答记录");
  });
});

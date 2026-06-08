import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GraphResidualView } from "@l2/commander/graphResidualViewModel";
import { GraphAdvancedPanel } from "./GraphAdvancedPanel";

const graphView: GraphResidualView = {
  configStatus: "idle",
  ingestStatus: "idle",
  qaStatus: "idle",
  configSummary: "图谱配置未加载",
  ingestSummary: "尚未执行图谱 ingest",
  qaSummary: "尚未执行图谱 QA",
  businessIngestCopy: "写入业务记录",
  eventIngestCopy: "写入事件",
  qaCopy: "提问",
  resetRebuildCopy: "重置重建",
  confirmationCopy: null,
  errorCopy: null,
};

describe("GraphAdvancedPanel", () => {
  it("explains why graph write and QA controls are disabled in privacy mode", () => {
    const html = renderToStaticMarkup(
      <GraphAdvancedPanel
        view={graphView}
        configDraft={{ workers: 1, enqueueWorkers: 1 }}
        businessDraft={{ title: "Synthetic title", content: "Synthetic content" }}
        eventDraft={{ eventType: "Synthetic event", content: "Synthetic event content" }}
        qaDraft={{ query: "Synthetic graph question" }}
        privacyOn
        graphPaused={false}
        onLoadConfig={vi.fn()}
        onSaveConfig={vi.fn()}
        onRebuild={vi.fn()}
        onResetRebuild={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onConfigDraftChange={vi.fn()}
        onBusinessDraftChange={vi.fn()}
        onEventDraftChange={vi.fn()}
        onQADraftChange={vi.fn()}
        onBusinessIngest={vi.fn()}
        onEventIngest={vi.fn()}
        onGraphQA={vi.fn()}
        onCancelConfirmation={vi.fn()}
      />,
    );

    const descriptionIds = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1]);
    expect(descriptionIds.length).toBeGreaterThan(0);
    expect(descriptionIds.some((id) => html.includes(`id="${id}"`))).toBe(true);
    expect(html).toContain("ui-disabled-reason--inline");
    expect(html).toContain("隐私模式下不可写入图谱");
    expect(html).toContain("关闭隐私模式后可继续图谱高级操作");
  });

  it("explains loading-disabled graph config, ingest, and QA actions", () => {
    const html = renderToStaticMarkup(
      <GraphAdvancedPanel
        view={{
          ...graphView,
          configStatus: "loading",
          ingestStatus: "loading",
          qaStatus: "loading",
        }}
        configDraft={{ workers: 1, enqueueWorkers: 1 }}
        businessDraft={{ title: "Synthetic title", content: "Synthetic content" }}
        eventDraft={{ eventType: "Synthetic event", content: "Synthetic event content" }}
        qaDraft={{ query: "Synthetic graph question" }}
        privacyOn={false}
        graphPaused={false}
        onLoadConfig={vi.fn()}
        onSaveConfig={vi.fn()}
        onRebuild={vi.fn()}
        onResetRebuild={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onConfigDraftChange={vi.fn()}
        onBusinessDraftChange={vi.fn()}
        onEventDraftChange={vi.fn()}
        onQADraftChange={vi.fn()}
        onBusinessIngest={vi.fn()}
        onEventIngest={vi.fn()}
        onGraphQA={vi.fn()}
        onCancelConfirmation={vi.fn()}
      />,
    );

    expect(html).toContain("正在保存图谱配置");
    expect(html).toContain("保存完成后可再次提交");
    expect(html).toContain("正在写入图谱");
    expect(html).toContain("写入完成后可再次提交");
    expect(html).toContain("正在执行图谱问答");
    expect(html).toContain("完成后可再次提问");
  });
});

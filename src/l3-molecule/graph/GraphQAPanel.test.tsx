import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GraphResidualView } from "@l2/commander/graphResidualViewModel";
import { GraphQAPanel } from "./GraphQAPanel";

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
  rebuildCopy: "重建图谱",
  resetRebuildCopy: "重置重建",
  confirmationCopy: null,
  errorCopy: null,
};

describe("GraphQAPanel", () => {
  it("explains why graph QA controls are disabled in privacy mode", () => {
    const html = renderToStaticMarkup(
      <GraphQAPanel
        view={graphView}
        draft={{
          query: "Synthetic graph question",
          window: "7d",
          start: "2026-06-01",
          end: "2026-06-08",
        }}
        privacyOn
        onDraftChange={vi.fn()}
        onAsk={vi.fn()}
      />,
    );

    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${descriptionId}"`);
    expect(html).toContain("ui-disabled-reason--inline");
    expect(html).toContain("隐私模式下不可提问图谱");
    expect(html).toContain("关闭隐私模式后可继续图谱问答");
  });

  it("explains why graph QA submit is disabled while an answer is loading", () => {
    const html = renderToStaticMarkup(
      <GraphQAPanel
        view={{ ...graphView, qaStatus: "loading" }}
        draft={{
          query: "Synthetic graph question",
          window: "7d",
          start: "2026-06-01",
          end: "2026-06-08",
        }}
        privacyOn={false}
        onDraftChange={vi.fn()}
        onAsk={vi.fn()}
      />,
    );

    const descriptionIds = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1]);
    expect(descriptionIds.some((id) => html.includes(`id="${id}"`))).toBe(true);
    expect(html).toContain("正在执行图谱问答");
    expect(html).toContain("完成后可再次提问");
  });
});

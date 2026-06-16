import { describe, expect, it } from "vitest";
import type { SemanticModuleView } from "./semanticViewModel";
import { buildSemanticPrimaryTaskView } from "./semanticPrimaryTaskModel";

describe("buildSemanticPrimaryTaskView", () => {
  it.each([
    ["checking_config", "检查 AI 配置", false],
    ["setup_required", "配置 AI", false],
    ["index_unavailable", "建立语义索引", false],
    ["index_running", "正在建立语义索引", false],
    ["index_paused", "继续建立语义索引", false],
    ["failed", "修复语义索引", false],
    ["ready", "问当前范围", true],
  ] as const)("selects one primary task for %s", (kind, title, canShowSecondaryTabs) => {
    const view = buildSemanticPrimaryTaskView({
      moduleView: semanticModuleView(kind),
      scopeLabel: "当前会话",
      qaStatus: "idle",
      qaHasMessages: false,
      indexStatusItems: ["100 条已索引"],
    });

    expect(view.kind).toBe(kind);
    expect(view.title).toBe(title);
    expect(view.primaryAction.label).not.toMatch(/checking|setup|required|ready|index/i);
    expect(view.canShowSecondaryTabs).toBe(canShowSecondaryTabs);
    expect(view.secondaryActions.length).toBeLessThanOrEqual(3);
    expect(view.ariaLiveMessage).toContain(title);
  });

  it("announces stream stop as a preserved partial answer, not an error", () => {
    const view = buildSemanticPrimaryTaskView({
      moduleView: semanticModuleView("ready"),
      scopeLabel: "全部会话",
      qaStatus: "stopped",
      qaHasMessages: true,
      indexStatusItems: ["索引已就绪"],
    });

    expect(view.kind).toBe("ready");
    expect(view.canShowSecondaryTabs).toBe(true);
    expect(view.ariaLiveMessage).toContain("已停止");
    expect(view.ariaLiveMessage).toContain("保留当前回答");
    expect(view.statusItems).toContain("索引已就绪");
  });
});

function semanticModuleView(kind: SemanticModuleView["kind"]): SemanticModuleView {
  return {
    kind,
    blocksCoreWorkbench: false,
    searchEnabled: kind === "ready",
    qaEnabled: kind === "ready",
    statusLabel: kind,
    message: `${kind} message`,
  };
}

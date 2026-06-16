import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import coachMarkSource from "./CoachMark.tsx?raw";
import { CoachMark } from "./CoachMark";
import type { CoachMarkView } from "@l2/commander/coachMarkModel";

describe("CoachMark", () => {
  it("renders a dismissible privacy-safe coach mark", () => {
    const html = renderToStaticMarkup(
      <CoachMark
        mark={mark()}
        onDismiss={vi.fn()}
        onSkipAll={vi.fn()}
      />,
    );

    expect(html).toContain('role="note"');
    expect(html).toContain("这里控制当前范围");
    expect(html).toContain("知道了");
    expect(html).toContain("暂时不提示");
    expect(html).not.toContain("data-coach-anchor");
    expect(html).not.toContain("Synthetic Private Room");
  });

  it("supports Escape dismissal while the hint is active", () => {
    expect(coachMarkSource).toContain("keydown");
    expect(coachMarkSource).toContain("Escape");
  });
});

function mark(): CoachMarkView {
  return {
    id: "search-scope",
    anchorId: "workspace-scope",
    title: "这里控制当前范围",
    body: "切换范围会影响搜索、统计和导出，但不会保存私密关键词。",
    placement: "bottom",
  };
}

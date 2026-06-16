import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MessageSelectionToolbar } from "./MessageSelectionToolbar";

describe("MessageSelectionToolbar", () => {
  it("shows count, privacy summary, export action, and disabled downstream reasons", () => {
    const html = renderToStaticMarkup(
      <MessageSelectionToolbar
        selectedCount={3}
        privacyOn
        summary="已选 3 条 · 2024-04-28 09:20 - 2024-04-28 09:22 · text 2 条"
        exportDisabledReason={null}
        aiDisabledReason="AI 暂未提供选中消息入口。"
        graphDisabledReason="图谱暂未提供选中消息入口。"
        onCopyMarkdown={vi.fn()}
        onExportSelected={vi.fn()}
        onSendToAi={vi.fn()}
        onCreateGraphContext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toContain("已选 3 条");
    expect(html).toContain("隐私模式：脱敏");
    expect(html).toContain("复制为 Markdown");
    expect(html).toContain("导出选中片段");
    expect(html).toContain("AI 暂未提供选中消息入口。");
    expect(html).toContain("图谱暂未提供选中消息入口。");
  });
});

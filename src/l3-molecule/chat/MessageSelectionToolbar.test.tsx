import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MessageSelectionToolbar } from "./MessageSelectionToolbar";

describe("MessageSelectionToolbar", () => {
  it("presents a compact, understandable selection command bar with an obvious exit", () => {
    const html = renderToStaticMarkup(
      <MessageSelectionToolbar
        selectedCount={3}
        privacyOn
        summary="已选 3 条 · 2024-04-28 09:20 - 2024-04-28 09:22 · text 2 条"
        exportDisabledReason={null}
        onSelectVisibleMessages={vi.fn()}
        onCopyMarkdown={vi.fn()}
        onExportSelected={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toContain("消息选择");
    expect(html).toContain("已选 3 条");
    expect(html).toContain("隐私模式：脱敏");
    expect(html).toContain("2024-04-28 09:20 - 2024-04-28 09:22");
    expect(html).toContain("选择当前页");
    expect(html).toContain("复制为 Markdown");
    expect(html).toContain("导出选中片段");
    expect(html).toContain('aria-label="退出消息选择"');
    expect(html).not.toContain("发送到 AI");
    expect(html).not.toContain("创建图谱上下文");
    expect(html).not.toContain("AI 暂未提供选中消息入口。");
    expect(html).not.toContain("图谱暂未提供选中消息入口。");
  });
});

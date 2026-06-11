import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SemanticConfirmDialog } from "./SemanticConfirmDialog";

describe("SemanticConfirmDialog", () => {
  it("uses the shared overlay dialog contract and >=40px action targets", () => {
    const html = renderToStaticMarkup(
      <SemanticConfirmDialog
        heading="确认清空语义索引？"
        body="清空后需要重新构建索引。"
        cancelLabel="取消"
        confirmLabel="确认清空"
        confirmVariant="danger"
        confirming={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(html).toContain('class="semantic-confirm"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="semantic-confirm-title"');
    expect(html).toContain('id="semantic-confirm-title"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("ui-button--md");
    expect(html).not.toContain("ui-button--sm");
  });

  it("can keep destructive confirm disabled while the action is pending", () => {
    const html = renderToStaticMarkup(
      <SemanticConfirmDialog
        heading="确认保存高并发配置？"
        body="确认后才会保存该配置。"
        cancelLabel="取消"
        confirmLabel="确认保存"
        confirmVariant="primary"
        confirming
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain("确认保存");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpringModal } from "./SpringModal";

describe("SpringModal", () => {
  it("renders an accessible modal dialog without inline styling debt", () => {
    const html = renderToStaticMarkup(
      <SpringModal ariaLabel="媒体预览" onClose={vi.fn()}>
        <button type="button">关闭</button>
      </SpringModal>,
    );

    expect(html).toContain('class="spring-modal__backdrop"');
    expect(html).toContain('class="spring-modal__panel"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="媒体预览"');
    expect(html).toContain('tabindex="-1"');
    expect(html).not.toContain("style=");
  });

  it("supports title-driven labelling and explicit close policy", () => {
    const html = renderToStaticMarkup(
      <SpringModal
        titleId="semantic-setup-title"
        closeOnBackdrop={false}
        closeOnEscape={false}
        onClose={vi.fn()}
      >
        <h2 id="semantic-setup-title">语义设置</h2>
      </SpringModal>,
    );

    expect(html).toContain('aria-labelledby="semantic-setup-title"');
    expect(html).toContain('data-close-on-backdrop="false"');
    expect(html).toContain('data-close-on-escape="false"');
  });
});

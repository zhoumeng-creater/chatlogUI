import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DisabledReason } from "./DisabledReason";

describe("DisabledReason", () => {
  it("uses an explicit id and links a valid control child", () => {
    const html = renderToStaticMarkup(
      <DisabledReason
        id="privacy-disabled-reason"
        reason="隐私模式下不可执行此操作。关闭隐私模式后可继续。"
      >
        <button type="button" disabled>
          搜索
        </button>
      </DisabledReason>,
    );

    expect(html).toContain('id="privacy-disabled-reason"');
    expect(html).toContain('aria-describedby="privacy-disabled-reason"');
  });

  it("generates a stable reason id when no id is provided", () => {
    const html = renderToStaticMarkup(
      <DisabledReason reason="先选择一个会话。选择会话后可继续。">
        <button type="button" disabled>
          刷新
        </button>
      </DisabledReason>,
    );

    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toMatch(/^disabled-reason-/);
    expect(html).toContain(`id="${descriptionId}"`);
  });

  it("preserves existing aria descriptions when adding the reason id", () => {
    const html = renderToStaticMarkup(
      <DisabledReason id="service-disabled-reason" reason="服务未就绪。请先完成连接。">
        <button type="button" aria-describedby="existing-description" disabled>
          启动
        </button>
      </DisabledReason>,
    );

    expect(html).toContain('aria-describedby="existing-description service-disabled-reason"');
  });

  it("renders screen-reader-only and visible variants with shared classes", () => {
    const hiddenHtml = renderToStaticMarkup(
      <DisabledReason
        id="hidden-disabled-reason"
        reason="正在加载。完成后可继续。"
        variant="sr-only"
      />,
    );
    const visibleHtml = renderToStaticMarkup(
      <DisabledReason
        id="visible-disabled-reason"
        reason="未配置 AI 服务。保存配置后可继续。"
        variant="inline"
      />,
    );

    expect(hiddenHtml).toContain('class="ui-disabled-reason ui-disabled-reason--sr-only sr-only"');
    expect(visibleHtml).toContain('class="ui-disabled-reason ui-disabled-reason--inline"');
  });

  it("renders invalid children safely and renders reason copy once", () => {
    const html = renderToStaticMarkup(
      <DisabledReason id="text-child-reason" reason="当前模式不支持此操作。">
        plain text child
      </DisabledReason>,
    );

    expect(html).toContain("plain text child");
    expect(html.match(/当前模式不支持此操作/g)).toHaveLength(1);
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Field } from "./Field";

describe("Field", () => {
  it("links hints to the child control with aria-describedby", () => {
    const html = renderToStaticMarkup(
      <Field id="data-dir" label="数据目录" hint="选择微信数据目录">
        <input />
      </Field>,
    );

    expect(html).toContain('id="data-dir"');
    expect(html).toContain('id="data-dir-hint"');
    expect(html).toContain('aria-describedby="data-dir-hint"');
  });

  it("links errors, preserves existing descriptions, and marks invalid controls", () => {
    const html = renderToStaticMarkup(
      <Field id="data-key" label="Data Key" error="需要重新输入">
        <input aria-describedby="existing-description" />
      </Field>,
    );

    expect(html).toContain('id="data-key-error"');
    expect(html).toContain('aria-describedby="existing-description data-key-error"');
    expect(html).toContain('aria-invalid="true"');
  });

  it("keeps hint and error descriptions together and exposes aria-errormessage", () => {
    const html = renderToStaticMarkup(
      <Field
        id="service-url"
        label="服务地址"
        hint="仅支持本机 chatlog 服务"
        error="请输入 127.0.0.1:5030 这样的本机地址"
      >
        <input aria-describedby="existing-description" />
      </Field>,
    );

    expect(html).toContain('id="service-url-hint"');
    expect(html).toContain('id="service-url-error"');
    expect(html).toContain('aria-describedby="existing-description service-url-hint service-url-error"');
    expect(html).toContain('aria-errormessage="service-url-error"');
    expect(html).toContain('aria-invalid="true"');
  });

  it("renders non-element children without throwing or inventing aria relationships", () => {
    const html = renderToStaticMarkup(
      <Field id="plain-field" label="纯文本" hint="不会注入到纯文本">
        plain text child
      </Field>,
    );

    expect(html).toContain("plain text child");
    expect(html).not.toContain('aria-describedby="plain-field-hint"');
  });

  it("does not inject field ids into non-control wrapper children", () => {
    const html = renderToStaticMarkup(
      <Field id="wrapped-field" label="带按钮的字段" hint="描述应该只属于实际控件">
        <div className="settings-inline">
          <input id="wrapped-field" aria-describedby="wrapped-field-hint" />
          <button type="button">选择</button>
        </div>
      </Field>,
    );

    expect(html.match(/id="wrapped-field"/g)).toHaveLength(1);
    expect(html).not.toContain('<div class="settings-inline" id="wrapped-field"');
  });
});

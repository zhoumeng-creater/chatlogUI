import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select";

describe("Select", () => {
  it("renders the shared dropdown menu shell instead of exposing only a native select", () => {
    const html = renderToStaticMarkup(
      <Select
        controlSize="sm"
        aria-label="消息类型"
        value="image"
        onChange={vi.fn()}
      >
        <option value="all">全部类型 · 63 条</option>
        <option value="image">图片 · 3 条</option>
      </Select>,
    );

    expect(html).toContain("ui-select");
    expect(html).toContain("ui-select__trigger");
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('role="listbox"');
    expect(html).toContain('role="option"');
    expect(html).toContain("图片 · 3 条");
    expect(html).toContain("ui-select__native");
  });
});

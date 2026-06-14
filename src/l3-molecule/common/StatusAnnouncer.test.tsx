import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusAnnouncer } from "./StatusAnnouncer";

describe("StatusAnnouncer", () => {
  it("renders a hidden polite live region by default", () => {
    const html = renderToStaticMarkup(
      <StatusAnnouncer message="已加载 3 / 共 8 条搜索结果" />,
    );

    expect(html).toContain('class="sr-only"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("已加载 3 / 共 8 条搜索结果");
  });

  it("uses privacy-safe announcement copy when privacy mode is enabled", () => {
    const privateMessage = '正在搜索 query="synthetic-private-message" dataKey=secret123 path=C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_private';
    const html = renderToStaticMarkup(
      <StatusAnnouncer
        privacyOn
        message={privateMessage}
        privacySafeMessage="正在搜索当前范围"
      />,
    );

    expect(html).toContain("正在搜索当前范围");
    expect(html).not.toContain("synthetic-private-message");
    expect(html).not.toContain("secret123");
    expect(html).not.toContain("C:\\Users\\Synthetic");
    expect(html).not.toContain("wxid_synthetic_private");
  });

  it("can announce assertive status without leaking diagnostics", () => {
    const html = renderToStaticMarkup(
      <StatusAnnouncer
        politeness="assertive"
        message="生成失败 token=secret query=private"
        privacySafeMessage="生成失败"
      />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain("生成失败");
    expect(html).not.toContain("secret");
    expect(html).not.toContain("private");
  });
});

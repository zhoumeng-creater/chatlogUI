import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusBar } from "./StatusBar";

describe("status bar display", () => {
  it("shows the active service label instead of always showing port 5030", () => {
    const props = {
      status: "running" as const,
      serviceLabel: "本机服务 127.0.0.1:6041",
      httpReady: true,
      dbReady: true,
    };
    const html = renderToStaticMarkup(createElement(StatusBar, props));

    expect(html).toContain("本机服务 127.0.0.1:6041");
    expect(html).not.toContain("端口 5030");
  });

  it("uses an unconfigured fallback instead of assuming a fixed port", () => {
    const html = renderToStaticMarkup(createElement(StatusBar, { status: "stopped" }));

    expect(html).toContain("本机服务未配置");
    expect(html).not.toContain("端口 5030");
  });
});

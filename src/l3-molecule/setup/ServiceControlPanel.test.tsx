import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ServiceControlPanel } from "./ServiceControlPanel";

describe("ServiceControlPanel", () => {
  it("renders external service URL input with field-level validation feedback", () => {
    const html = renderToStaticMarkup(
      createElement(ServiceControlPanel, {
        mode: "external",
        portState: "unknown",
        httpReady: false,
        dbReady: false,
        loading: false,
        error: null,
        externalBaseUrl: "http://127.0.0.1:6041",
        externalBaseUrlError: "当前版本只支持本机 chatlog 服务地址",
        onExternalBaseUrlChange: () => undefined,
      }),
    );

    expect(html).toContain("external-chatlog-base-url");
    expect(html).toContain("http://127.0.0.1:6041");
    expect(html).toContain("当前版本只支持本机 chatlog 服务地址");
    expect(html).toContain("role=\"alert\"");
    expect(html).not.toContain("测试连接并保存");
  });

  it("keeps external service actions outside the status panel", () => {
    const html = renderToStaticMarkup(
      createElement(ServiceControlPanel, {
        mode: "external",
        portState: "unknown",
        httpReady: false,
        dbReady: false,
        loading: false,
        error: null,
        externalBaseUrl: "http://127.0.0.1:6041",
        externalBaseUrlError: null,
        onExternalBaseUrlChange: () => undefined,
      }),
    );

    const primaryButtonMatches = html.match(/ui-button--primary/g) ?? [];
    expect(primaryButtonMatches).toHaveLength(0);
    expect(html).not.toContain("测试连接并保存");
    expect(html).not.toContain("启动服务");
    expect(html).not.toContain("停止服务");
  });

  it("shows DB-not-ready recovery after service is connected without a Workbench CTA", () => {
    const html = renderToStaticMarkup(
      createElement(ServiceControlPanel, {
        mode: "external",
        portState: "external-chatlog",
        httpReady: true,
        dbReady: false,
        loading: false,
        error: "服务已连接，但数据库尚未就绪",
        externalBaseUrl: "http://127.0.0.1:6041",
        externalBaseUrlError: null,
        onExternalBaseUrlChange: () => undefined,
      }),
    );

    expect(html).toContain("数据库尚未就绪");
    expect(html).not.toContain("刷新数据库状态");
    expect(html).not.toContain("打开工作台");
  });
});

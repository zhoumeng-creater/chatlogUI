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
        latestDiagnosticFamily: "none",
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
        latestDiagnosticFamily: "none",
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
        latestDiagnosticFamily: "db",
        onExternalBaseUrlChange: () => undefined,
      }),
    );

    expect(html).toContain("数据库尚未就绪");
    expect(html).not.toContain("刷新数据库状态");
    expect(html).not.toContain("打开工作台");
    expect(html).toContain("最近诊断事件");
    expect(html).toContain("db");
    expect(html).toContain("仅连接本机服务，不会停止外部进程");
  });

  it("explains unknown port owners without exposing process details", () => {
    const html = renderToStaticMarkup(
      createElement(ServiceControlPanel, {
        mode: "managed",
        portState: "occupied",
        httpReady: false,
        dbReady: false,
        loading: false,
        error: "5030 端口被其他进程占用。C:\\Users\\Synthetic\\node server.js",
        externalBaseUrl: "http://127.0.0.1:5030",
        externalBaseUrlError: null,
        latestDiagnosticFamily: "health",
        onExternalBaseUrlChange: () => undefined,
      }),
    );

    expect(html).toContain("未知进程占用");
    expect(html).toContain("应用不会停止未知进程");
    expect(html).toContain("health");
    expect(html).not.toContain("C:\\Users");
    expect(html).not.toContain("node server.js");
  });
});

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusBar } from "./StatusBar";

describe("status bar display", () => {
  it("shows the active service summary instead of always showing port 5030", () => {
    const props = {
      status: "running" as const,
      serviceLabel: "已连接外部本机服务",
      httpReady: true,
      dbReady: true,
    };
    const html = renderToStaticMarkup(createElement(StatusBar, props));

    expect(html).toContain("已连接外部本机服务");
    expect(html).not.toContain("127.0.0.1");
    expect(html).not.toContain("6041");
    expect(html).not.toContain("端口 5030");
  });

  it("redacts raw loopback endpoint labels before rendering ordinary status text", () => {
    const html = renderToStaticMarkup(createElement(StatusBar, {
      status: "running",
      serviceLabel: "本机服务 127.0.0.1:6041",
      httpReady: true,
      dbReady: true,
    }));

    expect(html).toContain("本机服务已连接");
    expect(html).not.toContain("127.0.0.1");
    expect(html).not.toContain("6041");
  });

  it("uses an unconfigured fallback instead of assuming a fixed port", () => {
    const html = renderToStaticMarkup(createElement(StatusBar, { status: "stopped" }));

    expect(html).toContain("本机服务未配置");
    expect(html).not.toContain("端口 5030");
  });

  it("uses user-facing service and database labels instead of HTTP or DB diagnostics", () => {
    const html = renderToStaticMarkup(createElement(StatusBar, {
      status: "running",
      dbStatus: "ready",
      httpReady: true,
      dbReady: true,
    }));

    expect(html).toContain("本机服务就绪");
    expect(html).toContain("数据库就绪");
    expect(html).not.toContain("HTTP");
    expect(html).not.toContain("DB");
  });

  it("does not show a stopped service when readiness proves the local service is ready", () => {
    const html = renderToStaticMarkup(createElement(StatusBar, {
      status: "stopped",
      serviceLabel: "应用管理的本机服务",
      httpReady: true,
      dbReady: true,
    }));

    expect(html).toContain("本机服务就绪");
    expect(html).toContain("数据库就绪");
    expect(html).toContain("应用管理的本机服务");
    expect(html).not.toContain("本机服务已停止");
  });
});

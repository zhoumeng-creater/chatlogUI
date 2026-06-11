import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DataSettings } from "./DataSettings";

describe("DataSettings", () => {
  it("renders a safe data path summary instead of the raw local path", () => {
    const html = renderToStaticMarkup(
      <DataSettings
        view={{
          title: "数据与服务",
          pathSummary: "已选择微信数据目录",
          serviceLabel: "本机服务",
          serviceStatusLabel: "服务已连接，数据库尚未就绪",
          serviceStatusTone: "warning",
          decryptionKeyLabel: "请在设置中心配置",
          primaryAction: { label: "前往设置中心修改", target: "/" },
          showIndependentBaseUrlForm: false,
        }}
        onOpenSetup={vi.fn()}
      />,
    );

    expect(html).toContain("已选择微信数据目录");
    expect(html).not.toContain("C:\\");
    expect(html).not.toContain("WeChat Files");
    expect(html).not.toContain("wxid_synthetic_private");
  });

  it("keeps the data path field id unique when an action button is inline", () => {
    const html = renderToStaticMarkup(
      <DataSettings
        view={{
          title: "数据与服务",
          pathSummary: "已选择微信数据目录",
          serviceLabel: "本机服务",
          serviceStatusLabel: "服务已连接，数据库尚未就绪",
          serviceStatusTone: "warning",
          decryptionKeyLabel: "请在设置中心配置",
          primaryAction: { label: "前往设置中心修改", target: "/" },
          showIndependentBaseUrlForm: false,
        }}
        onOpenSetup={vi.fn()}
      />,
    );

    expect(html.match(/id="settings-wx-path"/g)).toHaveLength(1);
  });

  it("points service/data changes back to Setup instead of rendering a base URL form", () => {
    const html = renderToStaticMarkup(
      <DataSettings
        view={{
          title: "数据与服务",
          pathSummary: "未配置微信数据目录",
          serviceLabel: "本机服务",
          serviceStatusLabel: "服务尚未连接",
          serviceStatusTone: "neutral",
          decryptionKeyLabel: "请在设置中心配置",
          primaryAction: { label: "前往设置中心修改", target: "/" },
          showIndependentBaseUrlForm: false,
        }}
        onOpenSetup={vi.fn()}
      />,
    );

    expect(html).toContain("前往设置中心修改");
    expect(html).not.toContain("sidecar");
    expect(html).not.toContain("base URL");
    expect(html).not.toContain("http://127.0.0.1:5030");
  });
});

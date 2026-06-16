import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DataSettings } from "./DataSettings";

describe("DataSettings", () => {
  it("renders a safe data path summary instead of the raw local path", () => {
    const html = renderToStaticMarkup(
      <DataSettings
        copy={dataCopy}
        view={{
          title: "数据与服务",
          pathSummary: "已选择微信数据目录",
          serviceLabel: "本机服务",
          serviceStatusLabel: "服务已连接，数据库尚未就绪",
          serviceStatusTone: "warning",
          decryptionKeyLabel: "密钥已配置",
          primaryAction: { label: "前往初始设置修复", target: "/" },
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
        copy={dataCopy}
        view={{
          title: "数据与服务",
          pathSummary: "已选择微信数据目录",
          serviceLabel: "本机服务",
          serviceStatusLabel: "服务已连接，数据库尚未就绪",
          serviceStatusTone: "warning",
          decryptionKeyLabel: "密钥已配置",
          primaryAction: { label: "前往初始设置修复", target: "/" },
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
        copy={dataCopy}
        view={{
          title: "数据与服务",
          pathSummary: "未配置微信数据目录",
          serviceLabel: "本机聊天服务未配置",
          serviceStatusLabel: "服务尚未连接",
          serviceStatusTone: "neutral",
          decryptionKeyLabel: "密钥未配置，请前往初始设置",
          primaryAction: { label: "前往初始设置修复", target: "/" },
          showIndependentBaseUrlForm: false,
        }}
        onOpenSetup={vi.fn()}
      />,
    );

    expect(html).toContain("前往初始设置修复");
    expect(html).toContain("数据目录");
    expect(html).toContain("密钥状态");
    expect(html).toContain("密钥未配置，请前往初始设置");
    expect(html).not.toContain("sidecar");
    expect(html).not.toContain("base URL");
    expect(html).not.toContain("http://127.0.0.1:5030");
  });
});

const dataCopy = {
  title: "数据与服务",
  dataDirectoryLabel: "数据目录",
  dataDirectoryUnset: "未配置微信数据目录",
  keyConfiguredLabel: "密钥状态",
  keyConfiguredHint: "密钥状态由初始设置管理，不保存在 UI 设置里。",
  keyConfiguredPlaceholder: "密钥已配置",
  keyMissingPlaceholder: "密钥未配置，请前往初始设置",
  primaryAction: "前往初始设置修复",
  cacheTitle: "缓存管理",
  description: "数据目录、数据库 readiness、服务连接和密钥配置由初始设置负责；这里保留安全摘要和入口。",
  cacheDescription: "聊天记录和语义索引缓存保存在本地存储。",
};

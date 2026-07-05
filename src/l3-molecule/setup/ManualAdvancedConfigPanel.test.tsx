import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ManualAdvancedConfigPanel } from "./ManualAdvancedConfigPanel";

describe("ManualAdvancedConfigPanel", () => {
  const draft = {
    dataDir: "",
    workDir: "",
    platform: "windows",
    version: 4,
    fullVersion: "",
    dataKey: "",
    imgKey: "",
    httpAddr: "127.0.0.1:5030",
    saveDecryptedMedia: true,
  };

  it("uses privacy-safe placeholders and error copy", () => {
    const html = renderToStaticMarkup(
      <ManualAdvancedConfigPanel
        loading={false}
        error="HTTP 500: C:\\Users\\Synthetic\\Documents\\WeChat Files\\wxid_synthetic_private"
        draft={draft}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        onChooseDataDir={vi.fn(async () => undefined)}
        onChooseWorkDir={vi.fn(async () => undefined)}
      />,
    );

    expect(html).not.toContain("E:\\Synthetic\\WeChat Files\\wxid_synthetic_xxx");
    expect(html).not.toContain("HTTP 500");
    expect(html).not.toContain("C:\\Users\\Synthetic");
    expect(html).not.toContain("wxid_synthetic_private");
  });

  it("keeps the data key field id unique in the secondary override section", () => {
    const html = renderToStaticMarkup(
      <ManualAdvancedConfigPanel
        loading={false}
        error={null}
        draft={draft}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        onChooseDataDir={vi.fn(async () => undefined)}
        onChooseWorkDir={vi.fn(async () => undefined)}
      />,
    );

    expect(html.match(/id="manual-data-key"/g)).toHaveLength(1);
  });

  it("aligns data and work directory picker rows with the same layout class", () => {
    const html = renderToStaticMarkup(
      <ManualAdvancedConfigPanel
        loading={false}
        error={null}
        draft={draft}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        onChooseDataDir={vi.fn(async () => undefined)}
        onChooseWorkDir={vi.fn(async () => undefined)}
      />,
    );

    expect(html.match(/class="setup-directory-row"/g)).toHaveLength(2);
    expect(html).toMatch(/class="setup-directory-row"[\s\S]*id="manual-data-dir"[\s\S]*>选择数据目录</);
    expect(html).toMatch(/class="setup-directory-row"[\s\S]*id="manual-work-dir"[\s\S]*>选择工作目录</);
  });

  it("renders field-level errors without leaking raw paths or keys", () => {
    const html = renderToStaticMarkup(
      <ManualAdvancedConfigPanel
        loading={false}
        error="请检查 2 个字段"
        draft={draft}
        fieldErrors={{
          dataDir: "请选择微信数据目录。",
          dataKey: "数据密钥必填。",
          httpAddr: "服务地址只支持本机 HTTP origin。",
        }}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        onChooseDataDir={vi.fn(async () => undefined)}
        onChooseWorkDir={vi.fn(async () => undefined)}
      />,
    );

    expect(html).toContain("请选择微信数据目录");
    expect(html).toContain("数据密钥必填");
    expect(html).toContain("manual-data-dir-error");
    expect(html).toContain("manual-data-key-error");
    expect(html).toContain("aria-errormessage");
    expect(html).not.toContain("C:\\Users\\Synthetic");
    expect(html).not.toContain("sk-synthetic");
  });

  it("keeps manual config advanced while exposing directory picker actions", () => {
    const html = renderToStaticMarkup(
      <ManualAdvancedConfigPanel
        loading={false}
        error={null}
        draft={draft}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        onChooseDataDir={vi.fn(async () => undefined)}
        onChooseWorkDir={vi.fn(async () => undefined)}
      />,
    );

    expect(html).toContain("高级手动配置");
    expect(html).toContain("适合迁移或排障");
    expect(html).toContain("选择数据目录");
    expect(html).toContain("选择工作目录");
    expect(html).toContain("数据密钥");
    expect(html).toContain("媒体密钥");
    expect(html).not.toContain("chatlog_alpha 服务所需");
    expect(html).not.toContain("Data Key");
    expect(html).not.toContain("Image Key");
  });

  it("shows imported secret status before the manual override fields", () => {
    const html = renderToStaticMarkup(
      <ManualAdvancedConfigPanel
        loading={false}
        error={null}
        draft={{
          ...draft,
          platform: "windows",
          version: 4,
          fullVersion: "4.1.8.107",
          dataKey: "a".repeat(64),
          imgKey: "image-key",
        }}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        onChooseDataDir={vi.fn(async () => undefined)}
        onChooseWorkDir={vi.fn(async () => undefined)}
      />,
    );

    expect(html).toContain("setup-manual-status-grid");
    expect(html).toContain("数据密钥");
    expect(html).toContain("媒体密钥");
    expect(html).toContain("目录配置");
    expect(html).toContain("已读取");
    expect(html.indexOf("setup-manual-status-grid")).toBeLessThan(html.indexOf("密钥手动覆盖"));
    expect(html.indexOf("密钥手动覆盖")).toBeLessThan(html.indexOf("manual-data-key"));
    expect(html).not.toContain("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(html).not.toContain("image-key");
    expect(html).not.toContain("版本号");
    expect(html).not.toContain("完整版本号");
    expect(html).not.toContain("manual-platform");
    expect(html).not.toContain("manual-version");
    expect(html).not.toContain("manual-full-version");
  });

  it("uses a compact checkbox for decrypted media cache instead of large segmented save buttons", () => {
    const html = renderToStaticMarkup(
      <ManualAdvancedConfigPanel
        loading={false}
        error={null}
        draft={draft}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        onChooseDataDir={vi.fn(async () => undefined)}
        onChooseWorkDir={vi.fn(async () => undefined)}
      />,
    );

    expect(html).toContain("setup-media-cache-toggle");
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('aria-label="解密媒体缓存"');
  });

  it("explains media key and work directory with accessible help tooltips", () => {
    const html = renderToStaticMarkup(
      <ManualAdvancedConfigPanel
        loading={false}
        error={null}
        draft={draft}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        onChooseDataDir={vi.fn(async () => undefined)}
        onChooseWorkDir={vi.fn(async () => undefined)}
      />,
    );

    expect(html).toContain('role="tooltip"');
    expect(html).toContain('aria-label="工作目录说明"');
    expect(html).toContain('aria-label="数据密钥说明"');
    expect(html).toContain('aria-label="媒体密钥说明"');
    expect(html).toContain("工作目录用于保存 chatlog 运行缓存");
    expect(html).toContain("数据密钥用于解密聊天数据库");
    expect(html).toContain("媒体密钥通常随数据目录配置自动读取");
  });

  it("keeps secret override rows aligned without misleading reveal buttons", () => {
    const html = renderToStaticMarkup(
      <ManualAdvancedConfigPanel
        loading={false}
        error={null}
        draft={draft}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        onChooseDataDir={vi.fn(async () => undefined)}
        onChooseWorkDir={vi.fn(async () => undefined)}
      />,
    );

    expect(html.match(/class="setup-secret-override-row"/g)).toHaveLength(2);
    expect(html).not.toContain(">显示<");
    expect(html).not.toContain(">隐藏<");
    expect(html).toContain("粘贴后不会自动读取");
    expect(html).toContain("点击页面顶部的“保存并验证配置”");
  });

  it("shows validation errors under secret override inputs before save", () => {
    const html = renderToStaticMarkup(
      <ManualAdvancedConfigPanel
        loading={false}
        error={null}
        draft={{
          ...draft,
          dataDir: "C:\\Synthetic\\WeChat Files",
          dataKey: "abc",
          imgKey: "not-a-media-key",
        }}
        fieldErrors={{
          dataKey: "数据密钥应为64位十六进制字符。",
          imgKey: "媒体密钥应为64位十六进制字符。",
        }}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        onChooseDataDir={vi.fn(async () => undefined)}
        onChooseWorkDir={vi.fn(async () => undefined)}
      />,
    );

    expect(html).toContain("manual-data-key-error");
    expect(html).toContain("manual-img-key-error");
    expect(html).toContain("数据密钥应为64位十六进制字符");
    expect(html).toContain("媒体密钥应为64位十六进制字符");
    expect(html).toContain("aria-invalid");
  });
});

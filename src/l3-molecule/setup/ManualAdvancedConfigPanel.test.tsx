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

  it("keeps the data key field id unique when the reveal action is inline", () => {
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
});

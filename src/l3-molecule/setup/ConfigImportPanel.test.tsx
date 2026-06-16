import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfigImportPanel } from "./ConfigImportPanel";

describe("ConfigImportPanel", () => {
  it("does not render imported profile data directory paths", () => {
    const html = renderToStaticMarkup(
      <ConfigImportPanel
        loading={false}
        error={null}
        profile={{
          mode: "managed",
          source: "data-dir-chatlog-json",
          configDir: "C:\\Users\\Synthetic\\AppData\\Roaming\\chatlogUI",
          dataDir: "C:\\Users\\Synthetic\\Documents\\WeChat Files\\wxid_synthetic_private",
          workDir: null,
          httpAddr: "127.0.0.1:5030",
          port: 5030,
          platform: "windows",
          version: 4,
          fullVersion: "4.1.8.107",
          hasDataKey: true,
          hasImgKey: false,
          lastValidatedAt: null,
        }}
        detectionStatus="idle"
        candidates={[]}
        detectionError={null}
        onUseCandidate={() => undefined}
        onChooseDirectory={() => undefined}
        onConnectExternalService={() => undefined}
        onOpenManualAdvanced={() => undefined}
      />,
    );

    expect(html).toContain("配置已导入");
    expect(html).not.toContain("C:\\Users\\Synthetic");
    expect(html).not.toContain("WeChat Files");
    expect(html).not.toContain("wxid_synthetic_private");
  });

  it("renders detected candidates as safe summaries with next-step actions", () => {
    const html = renderToStaticMarkup(
      <ConfigImportPanel
        loading={false}
        error={null}
        profile={null}
        detectionStatus="success"
        candidates={[
          {
            id: "candidate-1",
            title: "微信数据目录候选 1",
            description: "来自 Windows 文档目录，完整路径已隐藏。",
            confidenceLabel: "可信度高",
            disabled: false,
          },
        ]}
        detectionError={null}
        onUseCandidate={() => undefined}
        onChooseDirectory={() => undefined}
        onConnectExternalService={() => undefined}
        onOpenManualAdvanced={() => undefined}
      />,
    );

    expect(html).toContain("微信数据目录候选 1");
    expect(html).toContain("使用此目录");
    expect(html).toContain("选择其他目录");
    expect(html).toContain("连接已有服务");
    expect(html).toContain("高级配置");
    expect(html).not.toContain("C:\\Users");
    expect(html).not.toContain("WeChat Files");
    expect(html).not.toContain("wxid_");
  });

  it("shows an actionable empty state when auto detection finds no candidates", () => {
    const html = renderToStaticMarkup(
      <ConfigImportPanel
        loading={false}
        error={null}
        profile={null}
        detectionStatus="empty"
        candidates={[]}
        detectionError={null}
        onUseCandidate={() => undefined}
        onChooseDirectory={() => undefined}
        onConnectExternalService={() => undefined}
        onOpenManualAdvanced={() => undefined}
      />,
    );

    expect(html).toContain('data-empty-state="service-not-configured"');
    expect(html).toContain("未找到可用的默认目录");
    expect(html).toContain("选择其他目录");
    expect(html).toContain("连接已有服务");
    expect(html).toContain("高级配置");
  });
});

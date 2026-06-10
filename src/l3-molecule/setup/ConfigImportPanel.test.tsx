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
      />,
    );

    expect(html).toContain("配置已导入");
    expect(html).not.toContain("C:\\Users\\Synthetic");
    expect(html).not.toContain("WeChat Files");
    expect(html).not.toContain("wxid_synthetic_private");
  });
});

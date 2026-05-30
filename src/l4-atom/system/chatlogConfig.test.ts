import { describe, expect, it } from "vitest";
import { normalizeConfigSummary, toServerConfigPayload } from "./chatlogConfig";

describe("chatlog config payload mapping", () => {
  it("maps UI camelCase config fields to chatlog server snake_case fields", () => {
    expect(
      toServerConfigPayload({
        type: "wechat",
        dataDir: "E:/WeChat/wxid_xxx",
        workDir: "E:/chatlog/work",
        dataKey: "a".repeat(64),
        imgKey: "image-key",
        fullVersion: "4.1.8.107",
        httpAddr: "127.0.0.1:5030",
        saveDecryptedMedia: true,
        platform: "windows",
        version: 4,
      }),
    ).toEqual({
      type: "wechat",
      data_dir: "E:/WeChat/wxid_xxx",
      work_dir: "E:/chatlog/work",
      data_key: "a".repeat(64),
      img_key: "image-key",
      full_version: "4.1.8.107",
      http_addr: "127.0.0.1:5030",
      save_decrypted_media: true,
      platform: "windows",
      version: 4,
    });
  });

  it("fills missing non-secret setup summary fields returned by Rust", () => {
    expect(
      normalizeConfigSummary({
        source: "app-managed-server-config",
        configDir: "C:/config",
        dataDir: "E:/WeChat",
        workDir: null,
        httpAddr: "127.0.0.1:5030",
        port: 5030,
        platform: "windows",
        version: 4,
        fullVersion: "4.1.8.107",
        hasDataKey: true,
        hasImgKey: false,
      }),
    ).toMatchObject({
      mode: "managed",
      source: "app-managed-server-config",
      lastValidatedAt: null,
    });
  });
});

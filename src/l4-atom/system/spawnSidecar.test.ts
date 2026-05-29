import { describe, expect, it } from "vitest";
import { createSpawnSidecarPayload } from "./spawnSidecar";

describe("createSpawnSidecarPayload", () => {
  it("normalizes blank data path and data key to null", () => {
    expect(createSpawnSidecarPayload({ dataDir: " ", dataKey: "" })).toEqual({
      dataDir: null,
      dataKey: null,
      workDir: null,
    });
  });

  it("trims provided sidecar launch settings", () => {
    expect(
      createSpawnSidecarPayload({
        dataDir: " C:/WeChat Files/wxid_xxx ",
        dataKey: " abc123 ",
        workDir: " C:/chatlog/work ",
      }),
    ).toEqual({
      dataDir: "C:/WeChat Files/wxid_xxx",
      dataKey: "abc123",
      workDir: "C:/chatlog/work",
    });
  });
});

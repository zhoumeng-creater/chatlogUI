import { describe, expect, it, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { createSpawnSidecarPayload, spawnSidecar } from "./spawnSidecar";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);

beforeEach(() => {
  invokeMock.mockReset();
});

describe("createSpawnSidecarPayload", () => {
  it("uses config directory launch without exposing data key", () => {
    expect(
      createSpawnSidecarPayload({
        mode: "managed",
        configDir: " C:/Users/Synthetic/AppData/Roaming/chatlogUI ",
        httpAddr: " 127.0.0.1:5030 ",
      }),
    ).toEqual({
      mode: "managed",
      configDir: "C:/Users/Synthetic/AppData/Roaming/chatlogUI",
      dataDir: null,
      workDir: null,
      httpAddr: "127.0.0.1:5030",
    });
  });

  it("trims provided sidecar launch settings", () => {
    expect(
      createSpawnSidecarPayload({
        mode: "managed",
        dataDir: " C:/Synthetic/WeChat Files/wxid_synthetic_xxx ",
        workDir: " C:/chatlog/work ",
        httpAddr: " 127.0.0.1:5035 ",
      }),
    ).toEqual({
      mode: "managed",
      configDir: null,
      dataDir: "C:/Synthetic/WeChat Files/wxid_synthetic_xxx",
      workDir: "C:/chatlog/work",
      httpAddr: "127.0.0.1:5035",
    });
  });

  it("defaults httpAddr to 127.0.0.1:5030 when blank", () => {
    expect(
      createSpawnSidecarPayload({
        mode: "managed",
        httpAddr: "",
      }),
    ).toEqual({
      mode: "managed",
      configDir: null,
      dataDir: null,
      workDir: null,
      httpAddr: "127.0.0.1:5030",
    });
  });

  it("passes launch plan under the Rust command argument name", async () => {
    invokeMock.mockResolvedValue("Sidecar started");

    await spawnSidecar({
      mode: "managed",
      configDir: "C:/config",
      httpAddr: "127.0.0.1:5030",
    });

    expect(invokeMock).toHaveBeenCalledWith("spawn_sidecar", {
      plan: {
        mode: "managed",
        configDir: "C:/config",
        dataDir: null,
        workDir: null,
        httpAddr: "127.0.0.1:5030",
      },
    });
  });
});

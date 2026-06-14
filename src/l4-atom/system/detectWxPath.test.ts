import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { detectWxPath } from "./detectWxPath";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);

beforeEach(() => {
  invokeMock.mockReset();
});

describe("detectWxPath", () => {
  it("returns detected WeChat path candidates from Tauri", async () => {
    invokeMock.mockResolvedValue([
      {
        path: "C:/Users/Synthetic/Documents/WeChat Files/wxid_synthetic",
        label: "wxid_synthetic",
        exists: true,
        source: "documents",
        confidence: "high",
      },
    ]);

    await expect(detectWxPath()).resolves.toEqual([
      {
        path: "C:/Users/Synthetic/Documents/WeChat Files/wxid_synthetic",
        label: "wxid_synthetic",
        exists: true,
        source: "documents",
        confidence: "high",
      },
    ]);
    expect(invokeMock).toHaveBeenCalledWith("detect_wechat_data_dirs");
  });

  it("propagates detection failures so L2 can show the error state", async () => {
    invokeMock.mockRejectedValue(new Error("detect command unavailable"));

    await expect(detectWxPath()).rejects.toThrow("detect command unavailable");
  });
});

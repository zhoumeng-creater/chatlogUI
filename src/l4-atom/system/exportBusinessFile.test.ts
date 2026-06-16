import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportBusinessFile } from "./exportBusinessFile";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

const request = {
  fileName: "chatlog-search-20260102-030405.md",
  extension: "md",
  content: "# 搜索结果",
  redactionPolicy: "redacted",
} as const;

describe("exportBusinessFile", () => {
  beforeEach(() => {
    vi.mocked(save).mockReset();
    vi.mocked(invoke).mockReset();
  });

  it("returns cancelled when the save dialog is dismissed and never invokes Rust", async () => {
    vi.mocked(save).mockResolvedValue(null);

    const result = await exportBusinessFile(request);

    expect(result.status).toBe("cancelled");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("passes only explicit save path and content to the Rust command and returns a safe summary", async () => {
    vi.mocked(save).mockResolvedValue("C:\\Users\\Synthetic\\Desktop\\chatlog-search-20260102-030405.md");
    vi.mocked(invoke).mockResolvedValue({
      fileName: "chatlog-search-20260102-030405.md",
      extension: "md",
      bytesWritten: 120,
    });

    const result = await exportBusinessFile(request);

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      defaultPath: request.fileName,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    }));
    expect(invoke).toHaveBeenCalledWith("export_business_file", {
      payload: {
        path: "C:\\Users\\Synthetic\\Desktop\\chatlog-search-20260102-030405.md",
        content: request.content,
        expectedExtension: "md",
        redactionPolicy: "redacted",
      },
    });
    expect(result).toEqual({
      status: "completed",
      summary: {
        fileName: "chatlog-search-20260102-030405.md",
        extension: "md",
        bytesWritten: 120,
        locationSummary: "chatlog-search-20260102-030405.md · 120 B",
      },
    });
  });
});

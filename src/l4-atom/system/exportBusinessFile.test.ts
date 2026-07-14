import { beforeEach, describe, expect, it, vi } from "vitest";
import { beginBusinessExportStream, exportBusinessFile } from "./exportBusinessFile";
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
    vi.mocked(save).mockResolvedValue(
      "C:\\Users\\Synthetic\\Desktop\\chatlog-search-20260102-030405.md",
    );
    vi.mocked(invoke).mockResolvedValue({
      fileName: "chatlog-search-20260102-030405.md",
      extension: "md",
      bytesWritten: 120,
    });

    const result = await exportBusinessFile(request);

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: request.fileName,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      }),
    );
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

  it("opens a native chunk stream and exposes append, complete, and idempotent cancel", async () => {
    vi.mocked(save).mockResolvedValue("C:\\Users\\Synthetic\\Desktop\\chatlog-search.md");
    vi.mocked(invoke)
      .mockResolvedValueOnce({
        sessionId: "export-session-1",
        fileName: "chatlog-search.md",
        extension: "md",
      })
      .mockResolvedValueOnce({ bytesWritten: 12 })
      .mockResolvedValueOnce({
        fileName: "chatlog-search.md",
        extension: "md",
        bytesWritten: 12,
      });

    const opened = await beginBusinessExportStream({
      fileName: "chatlog-search.md",
      extension: "md",
      redactionPolicy: "redacted",
    });
    expect(opened.status).toBe("opened");
    if (opened.status !== "opened") throw new Error("expected stream");

    await opened.stream.append("# Search\n");
    const result = await opened.stream.complete();
    await opened.stream.cancel();

    expect(invoke).toHaveBeenNthCalledWith(1, "begin_business_export_stream", {
      payload: {
        path: "C:\\Users\\Synthetic\\Desktop\\chatlog-search.md",
        expectedExtension: "md",
        redactionPolicy: "redacted",
      },
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "append_business_export_stream", {
      sessionId: "export-session-1",
      chunk: "# Search\n",
    });
    expect(invoke).toHaveBeenNthCalledWith(3, "complete_business_export_stream", {
      sessionId: "export-session-1",
    });
    expect(invoke).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      fileName: "chatlog-search.md",
      extension: "md",
      bytesWritten: 12,
      locationSummary: "chatlog-search.md · 12 B",
    });
  });

  it("cancels an opened native stream exactly once", async () => {
    vi.mocked(save).mockResolvedValue("C:\\Users\\Synthetic\\Desktop\\chatlog-search.csv");
    vi.mocked(invoke)
      .mockResolvedValueOnce({
        sessionId: "export-session-2",
        fileName: "chatlog-search.csv",
        extension: "csv",
      })
      .mockResolvedValueOnce(undefined);

    const opened = await beginBusinessExportStream({
      fileName: "chatlog-search.csv",
      extension: "csv",
      redactionPolicy: "redacted",
    });
    if (opened.status !== "opened") throw new Error("expected stream");
    await opened.stream.cancel();
    await opened.stream.cancel();

    expect(invoke).toHaveBeenLastCalledWith("cancel_business_export_stream", {
      sessionId: "export-session-2",
    });
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});

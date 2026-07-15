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

  it("keeps a completed native stream revocable until it is committed", async () => {
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
      })
      .mockResolvedValueOnce(undefined);

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
    expect(invoke).toHaveBeenNthCalledWith(4, "cancel_business_export_stream", {
      sessionId: "export-session-1",
    });
    expect(invoke).toHaveBeenCalledTimes(4);
    expect(result).toEqual({
      fileName: "chatlog-search.md",
      extension: "md",
      bytesWritten: 12,
      locationSummary: "chatlog-search.md · 12 B",
    });
  });

  it("commits a completed stream exactly once and rejects later cancellation", async () => {
    vi.mocked(save).mockResolvedValue("C:\\Users\\Synthetic\\Desktop\\chatlog-search.md");
    vi.mocked(invoke)
      .mockResolvedValueOnce({
        sessionId: "export-session-committed",
        fileName: "chatlog-search.md",
        extension: "md",
      })
      .mockResolvedValueOnce({
        fileName: "chatlog-search.md",
        extension: "md",
        bytesWritten: 12,
      })
      .mockResolvedValueOnce(undefined);

    const opened = await beginBusinessExportStream({
      fileName: "chatlog-search.md",
      extension: "md",
      redactionPolicy: "redacted",
    });
    if (opened.status !== "opened") throw new Error("expected stream");
    await opened.stream.complete();
    await opened.stream.commit();
    await opened.stream.commit();
    await expect(opened.stream.cancel()).rejects.toThrow("导出已提交，无法取消");

    expect(invoke).toHaveBeenNthCalledWith(3, "commit_business_export_stream", {
      sessionId: "export-session-committed",
    });
    expect(invoke).toHaveBeenCalledTimes(3);
  });

  it("linearizes commit and cancel so a pending commit cannot be reported as cancelled", async () => {
    let resolveCommit!: () => void;
    const pendingCommit = new Promise<void>((resolve) => {
      resolveCommit = resolve;
    });
    vi.mocked(save).mockResolvedValue("C:\\Users\\Synthetic\\Desktop\\chatlog-search.md");
    vi.mocked(invoke)
      .mockResolvedValueOnce({
        sessionId: "export-session-race",
        fileName: "chatlog-search.md",
        extension: "md",
      })
      .mockResolvedValueOnce({
        fileName: "chatlog-search.md",
        extension: "md",
        bytesWritten: 12,
      })
      .mockImplementationOnce(() => pendingCommit);

    const opened = await beginBusinessExportStream({
      fileName: "chatlog-search.md",
      extension: "md",
      redactionPolicy: "redacted",
    });
    if (opened.status !== "opened") throw new Error("expected stream");
    await opened.stream.complete();

    const commit = opened.stream.commit();
    await expect(opened.stream.cancel()).rejects.toThrow("导出正在提交，无法取消");
    expect(invoke).toHaveBeenCalledTimes(3);

    resolveCommit();
    await commit;
    await expect(opened.stream.cancel()).rejects.toThrow("导出已提交，无法取消");
    expect(invoke).toHaveBeenCalledTimes(3);
  });

  it("keeps a late native complete acknowledgement cancelled after cancel wins", async () => {
    let resolveComplete!: (value: {
      fileName: string;
      extension: "md";
      bytesWritten: number;
    }) => void;
    const pendingComplete = new Promise<{
      fileName: string;
      extension: "md";
      bytesWritten: number;
    }>((resolve) => {
      resolveComplete = resolve;
    });
    vi.mocked(save).mockResolvedValue("C:\\Users\\Synthetic\\Desktop\\chatlog-search.md");
    vi.mocked(invoke)
      .mockResolvedValueOnce({
        sessionId: "export-session-late-complete",
        fileName: "chatlog-search.md",
        extension: "md",
      })
      .mockImplementationOnce(() => pendingComplete)
      .mockResolvedValueOnce(undefined);

    const opened = await beginBusinessExportStream({
      fileName: "chatlog-search.md",
      extension: "md",
      redactionPolicy: "redacted",
    });
    if (opened.status !== "opened") throw new Error("expected stream");

    const completing = opened.stream.complete();
    await opened.stream.cancel();
    resolveComplete({
      fileName: "chatlog-search.md",
      extension: "md",
      bytesWritten: 12,
    });

    await expect(completing).rejects.toThrow("导出已取消");
    await expect(opened.stream.commit()).rejects.toThrow("导出已取消");
    expect(vi.mocked(invoke).mock.calls.map(([command]) => command)).toEqual([
      "begin_business_export_stream",
      "complete_business_export_stream",
      "cancel_business_export_stream",
    ]);
  });

  it("reconciles an uncertain commit acknowledgement through one idempotent retry", async () => {
    vi.mocked(save).mockResolvedValue("C:\\Users\\Synthetic\\Desktop\\chatlog-search.md");
    vi.mocked(invoke)
      .mockResolvedValueOnce({
        sessionId: "export-session-commit-ack",
        fileName: "chatlog-search.md",
        extension: "md",
      })
      .mockResolvedValueOnce({
        fileName: "chatlog-search.md",
        extension: "md",
        bytesWritten: 12,
      })
      .mockRejectedValueOnce(new Error("synthetic acknowledgement loss"))
      .mockResolvedValueOnce(undefined);

    const opened = await beginBusinessExportStream({
      fileName: "chatlog-search.md",
      extension: "md",
      redactionPolicy: "redacted",
    });
    if (opened.status !== "opened") throw new Error("expected stream");
    await opened.stream.complete();

    await expect(opened.stream.commit()).resolves.toBeUndefined();
    await expect(opened.stream.cancel()).rejects.toThrow("导出已提交");
    expect(
      vi.mocked(invoke).mock.calls.filter(([command]) => command === "commit_business_export_stream"),
    ).toHaveLength(2);
    expect(
      vi.mocked(invoke).mock.calls.some(([command]) => command === "cancel_business_export_stream"),
    ).toBe(false);
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

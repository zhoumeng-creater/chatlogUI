import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { exportDiagnosticsReport } from "./exportDiagnostics";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

const report = {
  redactionOk: true,
  lines: [
    { label: "Mode", value: "managed" },
    { label: "Data key", value: "present" },
  ],
};

describe("exportDiagnosticsReport", () => {
  beforeEach(() => {
    vi.mocked(save).mockReset();
    vi.mocked(invoke).mockReset();
  });

  it("returns cancelled when the save dialog is dismissed", async () => {
    vi.mocked(save).mockResolvedValue(null);

    const result = await exportDiagnosticsReport(report);

    expect(result).toEqual({ status: "cancelled" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("writes diagnostics to the user-selected path without exposing the parent directory", async () => {
    vi.mocked(save).mockResolvedValue("C:\\Users\\Synthetic\\Desktop\\chatlog-diagnostics.log");
    vi.mocked(invoke).mockResolvedValue("C:\\Users\\Synthetic\\Desktop\\chatlog-diagnostics.log");

    const result = await exportDiagnosticsReport(report);

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      defaultPath: "chatlog-diagnostics.log",
      filters: [{ name: "Log", extensions: ["log"] }],
    }));
    expect(invoke).toHaveBeenCalledWith("export_diagnostics_report_to_path", {
      path: "C:\\Users\\Synthetic\\Desktop\\chatlog-diagnostics.log",
      report,
    });
    expect(result).toEqual({
      status: "completed",
      locationSummary: "chatlog-diagnostics.log",
    });
  });
});
